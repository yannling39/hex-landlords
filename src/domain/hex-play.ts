import { RANK_STRENGTH, type Card } from './card.js';
import type { PlayDeclaration, PlayerId } from './commands.js';
import { classifyCards, type Pattern } from './pattern.js';
import type { GameState } from './state.js';

export type HexPlayContext = Pick<GameState, 'hexPicks' | 'hexUses' | 'crownCards'>;

const interchangeable = new Set(['3', '6', '9', 'Q']);

function owns(state: HexPlayContext, playerId: PlayerId, id: string): boolean {
  return state.hexPicks[playerId].some((hex) => hex.id === id);
}

function straight(high: number, count: number): Pattern {
  return { type: 'STRAIGHT', mainRank: high, sequenceLength: count, attachmentMode: 'none', cardCount: count };
}

export function resolvePlay(state: HexPlayContext, playerId: PlayerId, cards: readonly Card[], declaration?: PlayDeclaration): Pattern | null {
  if (!declaration) {
    const pattern = classifyCards(cards);
    if (pattern?.type === 'SINGLE' && state.crownCards[playerId] === cards[0].id) {
      return { ...pattern, mainRank: 18 };
    }
    return pattern;
  }

  if (declaration.type === 'RESONANCE') {
    if (!owns(state, playerId, 'resonance') || !interchangeable.has(declaration.asRank)) return null;
    const source = cards.find((card) => card.id === declaration.cardId);
    if (!source || !interchangeable.has(source.rank) || source.rank === declaration.asRank) return null;
    const effective = cards.map((card) => card.id === source.id ? { ...card, rank: declaration.asRank } : card);
    if (effective.filter((card) => card.rank === declaration.asRank).length === 4) return null;
    const pattern = classifyCards(effective);
    return pattern && pattern.type !== 'SINGLE' && pattern.type !== 'BOMB' && pattern.type !== 'ROCKET' ? pattern : null;
  }

  if (declaration.type === 'BROKEN_STRAIGHT') {
    if (!owns(state, playerId, 'broken_straight') || cards.length < 5 || cards.length > 11) return null;
    const values = cards.map((card) => RANK_STRENGTH[card.rank]).sort((a, b) => a - b);
    if (values.at(-1)! > 14 || new Set(values).size !== values.length) return null;
    if (values.at(-1)! - values[0] + 1 !== cards.length + 1) return null;
    return straight(values.at(-1)!, cards.length);
  }

  if (declaration.type === 'SAME_COLOR') {
    if (!owns(state, playerId, 'same_color') || state.hexUses[playerId].sameColor >= 1 || cards.length !== 5) return null;
    const colors = cards.map((card) => card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black');
    if (cards.some((card) => RANK_STRENGTH[card.rank] > 14) || !colors.every((color) => color === colors[0])) return null;
    return straight(Math.max(...cards.map((card) => RANK_STRENGTH[card.rank])), 5);
  }

  return null;
}
