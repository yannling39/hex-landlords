import type { Command, PlayerId } from './commands.js';
import type { GameState, HexDraft, Transition } from './state.js';
import { createSeededRandom } from './random.js';

const PLAYERS: readonly PlayerId[] = ['A', 'B', 'C'];

export const HEXES = [
  { id: 'resonance', label: '共鸣', description: '每次出牌可将一张3、6、9、Q互换点数' },
  { id: 'broken_straight', label: '断章', description: '顺子可以缺少一个内部点数' },
  { id: 'abandon', label: '弃守', description: '每手一次，过牌时弃掉一张手牌' },
  { id: 'reverse_flow', label: '逆流', description: '领出单张或对子时可反转本墩点数顺序' },
  { id: 'same_color', label: '同色协定', description: '每手一次，将五张同色牌视为顺子' },
  { id: 'crown_me', label: '尊我为王', description: '每手公开指定一张牌，作为单张大于大王；双方尊王牌同级，不能互压，炸弹和王炸仍可压制' },
] as const;

export type HexId = (typeof HEXES)[number]['id'];

export function createHexDraft(handNumber: GameState['handNumber'], currentPlayer: PlayerId, seed = 0, owned: readonly string[] = []): HexDraft {
  const random = createSeededRandom(seed ^ (handNumber * 131 + PLAYERS.indexOf(currentPlayer) * 17));
  const pool = HEXES.filter((hex) => !owned.includes(hex.id)).map((hex) => ({ ...hex }));
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  return {
    currentPlayer,
    candidates: pool.slice(0, 3),
  };
}

export function applyHexChoice(state: GameState, command: Extract<Command, { type: 'SELECT_HEX' }>): Transition {
  if (state.phase !== 'HEX_DRAFT' || !state.hexDraft) {
    return { state, events: [], error: 'GAME_NOT_ACTIVE' };
  }
  if (state.hexDraft.currentPlayer !== command.playerId) {
    return { state, events: [], error: 'WRONG_PLAYER' };
  }
  const candidate = state.hexDraft.candidates.find((item) => item.id === command.candidateId);
  if (!candidate) {
    return { state, events: [], error: 'INVALID_HEX_CHOICE' };
  }

  const nextPlayer = PLAYERS[PLAYERS.indexOf(command.playerId) + 1];
  return {
    state: {
      ...state,
      phase: nextPlayer ? 'HEX_DRAFT' : 'BID',
      hexDraft: nextPlayer ? createHexDraft(state.handNumber, nextPlayer, state.seed, state.hexPicks[nextPlayer].map((pick) => pick.id)) : null,
      hexPicks: {
        ...state.hexPicks,
        [command.playerId]: [...state.hexPicks[command.playerId], { ...candidate }],
      },
    },
    events: [{ type: 'HEX_SELECTED', playerId: command.playerId, candidateId: candidate.id, label: candidate.label }],
  };
}

export function applyKingDesignation(state: GameState, command: Extract<Command, { type: 'DESIGNATE_KING' }>): Transition {
  if (state.phase !== 'KING_DESIGNATE' || !state.crownActor) return { state, events: [], error: 'GAME_NOT_ACTIVE' };
  if (command.playerId !== state.crownActor) return { state, events: [], error: 'WRONG_PLAYER' };
  const chosen = state.hands[command.playerId].find((card) => card.id === command.cardId);
  if (!chosen) return { state, events: [], error: 'CARD_NOT_OWNED' };
  const later = state.players.slice(state.players.indexOf(command.playerId) + 1);
  const next = later.find((id) => state.hexPicks[id].some((hex) => hex.id === 'crown_me')) ?? null;
  return {
    state: {
      ...state,
      crownCards: { ...state.crownCards, [command.playerId]: chosen.id },
      crownActor: next,
      phase: next ? 'KING_DESIGNATE' : 'PLAY',
    },
    events: [{ type: 'KING_DESIGNATED', playerId: command.playerId, card: chosen }],
  };
}
