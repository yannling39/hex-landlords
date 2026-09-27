import { comparePatterns } from './compare.js';
import type { CardId } from './card.js';
import type { Command, PlayerId } from './commands.js';
import type { GameEvent } from './events.js';
import { resolvePlay } from './hex-play.js';
import type { GameState, Transition } from './state.js';

type PlayCommand = Extract<Command, { type: 'PLAY' }>;
type PassCommand = Extract<Command, { type: 'PASS' }>;
const PLAYERS: readonly PlayerId[] = ['A', 'B', 'C'];

function nextPlayer(playerId: PlayerId): PlayerId {
  return PLAYERS[(PLAYERS.indexOf(playerId) + 1) % PLAYERS.length];
}

export function applyPlay(state: GameState, command: PlayCommand): Transition {
  if (state.phase !== 'PLAY') return { state, events: [], error: 'GAME_NOT_ACTIVE' };
  if (command.playerId !== state.currentActor) return { state, events: [], error: 'WRONG_PLAYER' };
  const hand = state.hands[command.playerId];
  if (hand.length === 0) return { state, events: [], error: 'PLAYER_ALREADY_FINISHED' };

  const selectedIds = new Set<CardId>(command.cardIds);
  if (selectedIds.size !== command.cardIds.length) return { state, events: [], error: 'INVALID_PLAY' };
  const selected = command.cardIds.map((id) => hand.find((card) => card.id === id));
  if (selected.some((card) => card === undefined)) return { state, events: [], error: 'CARD_NOT_OWNED' };
  const cards = selected as NonNullable<(typeof selected)[number]>[];
  const pattern = resolvePlay(state, command.playerId, cards, command.declaration);
  if (!pattern) return { state, events: [], error: 'INVALID_PLAY' };
  if (command.reverse && (state.lastPlay || !state.hexPicks[command.playerId].some((hex) => hex.id === 'reverse_flow') || (pattern.type !== 'SINGLE' && pattern.type !== 'PAIR'))) {
    return { state, events: [], error: 'INVALID_PLAY' };
  }
  if (state.lastPlay && comparePatterns(pattern, state.lastPlay.pattern, state.trickMode) !== 1) {
    return { state, events: [], error: 'CANNOT_BEAT_CURRENT_PLAY' };
  }

  const remaining = hand.filter((card) => !selectedIds.has(card.id));
  const hands = { ...state.hands, [command.playerId]: remaining };
  const played: GameEvent = { type: 'CARDS_PLAYED', playerId: command.playerId, cards, pattern, ...(command.declaration ? { declaration: command.declaration } : {}), ...(command.reverse ? { reverse: true } : {}) };
  const multiplierChanged = pattern.type === 'BOMB' || pattern.type === 'ROCKET';
  const multiplier = multiplierChanged ? state.multiplier * 2 : state.multiplier;
  const nextState: GameState = {
    ...state,
    hands,
    currentActor: nextPlayer(command.playerId),
    lastPlay: { playerId: command.playerId, cards, pattern, ...(command.declaration ? { declaration: command.declaration } : {}) },
    trickLeaderId: command.playerId,
    consecutivePasses: 0,
    multiplier,
    bombsPlayed: state.bombsPlayed + (multiplierChanged ? 1 : 0),
    trickMode: command.reverse ? 'reverse' : state.trickMode,
    hexUses: command.declaration?.type === 'SAME_COLOR' ? {
      ...state.hexUses,
      [command.playerId]: { ...state.hexUses[command.playerId], sameColor: state.hexUses[command.playerId].sameColor + 1 },
    } : state.hexUses,
    crownCards: state.crownCards[command.playerId] && selectedIds.has(state.crownCards[command.playerId]!)
      ? { ...state.crownCards, [command.playerId]: null } : state.crownCards,
  };

  if (remaining.length === 0) {
    const winnerSide = command.playerId === state.landlordId ? 'LANDLORD' : 'FARMERS';
    const finished: GameEvent = {
      type: 'HAND_FINISHED',
      winnerSide,
      winnerId: command.playerId,
      multiplier,
    };
    return { state: { ...nextState, phase: 'HAND_END' }, events: [played, finished] };
  }

  return { state: nextState, events: [played] };
}

export function applyPass(state: GameState, command: PassCommand): Transition {
  if (state.phase !== 'PLAY') return { state, events: [], error: 'GAME_NOT_ACTIVE' };
  if (command.playerId !== state.currentActor) return { state, events: [], error: 'WRONG_PLAYER' };
  if (state.hands[command.playerId].length === 0) return { state, events: [], error: 'PLAYER_ALREADY_FINISHED' };
  if (!state.lastPlay || !state.trickLeaderId) return { state, events: [], error: 'CANNOT_PASS_WHEN_LEADING' };

  const discardedCard = command.discardCardId ? state.hands[command.playerId].find((card) => card.id === command.discardCardId) : undefined;
  if (command.discardCardId && (!discardedCard || state.hands[command.playerId].length === 1
    || state.hexUses[command.playerId].abandon >= 1 || !state.hexPicks[command.playerId].some((hex) => hex.id === 'abandon'))) {
    return { state, events: [], error: 'INVALID_PLAY' };
  }
  const updated: GameState = discardedCard ? {
    ...state,
    hands: { ...state.hands, [command.playerId]: state.hands[command.playerId].filter((card) => card.id !== discardedCard.id) },
    hexUses: { ...state.hexUses, [command.playerId]: { ...state.hexUses[command.playerId], abandon: 1 } },
    discardedCards: [...state.discardedCards, discardedCard],
    crownCards: state.crownCards[command.playerId] === discardedCard.id ? { ...state.crownCards, [command.playerId]: null } : state.crownCards,
  } : state;
  const passEvent: GameEvent = { type: 'PLAYER_PASSED', playerId: command.playerId, ...(discardedCard ? { discardedCard } : {}) };
  const consecutivePasses = state.consecutivePasses + 1;
  if (consecutivePasses === 2) {
    const leaderId = state.trickLeaderId;
    const closed: GameEvent = { type: 'TRICK_CLOSED', leaderId };
    return {
      state: {
        ...updated,
        currentActor: leaderId,
        lastPlay: null,
        trickLeaderId: null,
        consecutivePasses: 0,
        trickMode: 'normal',
      },
      events: [passEvent, closed],
    };
  }

  return {
    state: {
      ...updated,
      currentActor: nextPlayer(command.playerId),
      consecutivePasses,
    },
    events: [passEvent],
  };
}
