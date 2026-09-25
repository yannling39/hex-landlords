import { comparePatterns } from './compare.js';
import type { CardId } from './card.js';
import type { Command, PlayerId } from './commands.js';
import type { GameEvent } from './events.js';
import { classifyCards } from './pattern.js';
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
  const pattern = classifyCards(cards);
  if (!pattern) return { state, events: [], error: 'INVALID_PLAY' };
  if (state.lastPlay && comparePatterns(pattern, state.lastPlay.pattern) !== 1) {
    return { state, events: [], error: 'CANNOT_BEAT_CURRENT_PLAY' };
  }

  const remaining = hand.filter((card) => !selectedIds.has(card.id));
  const hands = { ...state.hands, [command.playerId]: remaining };
  const played: GameEvent = { type: 'CARDS_PLAYED', playerId: command.playerId, cards, pattern };
  const multiplierChanged = pattern.type === 'BOMB' || pattern.type === 'ROCKET';
  const multiplier = multiplierChanged ? state.multiplier * 2 : state.multiplier;
  const nextState: GameState = {
    ...state,
    hands,
    currentActor: nextPlayer(command.playerId),
    lastPlay: { playerId: command.playerId, cards, pattern },
    trickLeaderId: command.playerId,
    consecutivePasses: 0,
    multiplier,
    bombsPlayed: state.bombsPlayed + (multiplierChanged ? 1 : 0),
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

  const passEvent: GameEvent = { type: 'PLAYER_PASSED', playerId: command.playerId };
  const consecutivePasses = state.consecutivePasses + 1;
  if (consecutivePasses === 2) {
    const leaderId = state.trickLeaderId;
    const closed: GameEvent = { type: 'TRICK_CLOSED', leaderId };
    return {
      state: {
        ...state,
        currentActor: leaderId,
        lastPlay: null,
        trickLeaderId: null,
        consecutivePasses: 0,
      },
      events: [passEvent, closed],
    };
  }

  return {
    state: {
      ...state,
      currentActor: nextPlayer(command.playerId),
      consecutivePasses,
    },
    events: [passEvent],
  };
}
