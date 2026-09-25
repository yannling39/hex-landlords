import type { BidScore, Command, PlayerId } from './commands.js';
import type { GameEvent } from './events.js';
import type { GameState, Transition } from './state.js';

type BidCommand = Extract<Command, { type: 'BID' }>;
const PLAYERS: readonly PlayerId[] = ['A', 'B', 'C'];

function nextPlayer(playerId: PlayerId): PlayerId {
  return PLAYERS[(PLAYERS.indexOf(playerId) + 1) % PLAYERS.length];
}

function selectLandlord(state: GameState, playerId: PlayerId, score: BidScore, events: GameEvent[]): Transition {
  const hands = {
    A: [...state.hands.A],
    B: [...state.hands.B],
    C: [...state.hands.C],
  };
  hands[playerId].push(...state.bottomCards);

  const landlordEvent: GameEvent = {
    type: 'LANDLORD_SELECTED',
    playerId,
    bottomCards: [...state.bottomCards],
    baseScore: score,
  };

  return {
    state: {
      ...state,
      phase: 'PLAY',
      hands,
      landlordId: playerId,
      baseScore: score,
      currentActor: playerId,
      bottomRevealed: true,
      bid: { ...state.bid, highestBid: score, highestBidder: playerId },
    },
    events: [...events, landlordEvent],
  };
}

function redeal(state: GameState): Transition {
  const nextAttempt = state.dealAttemptIndex + 1;
  const deal = state.preparedDeals[state.handNumber - 1][nextAttempt];

  return {
    state: {
      ...state,
      hands: {
        A: [...deal.hands.A],
        B: [...deal.hands.B],
        C: [...deal.hands.C],
      },
      bottomCards: [...deal.bottom],
      bottomRevealed: false,
      dealAttemptIndex: nextAttempt,
      bid: {
        currentBidder: state.firstBidder,
        highestBid: 0,
        highestBidder: null,
        consecutivePasses: 0,
      },
    },
    events: [{ type: 'HAND_REDEALT', handNumber: state.handNumber }],
  };
}

export function applyBid(state: GameState, command: BidCommand): Transition {
  if (state.phase !== 'BID') return { state, events: [], error: 'GAME_NOT_ACTIVE' };
  if (command.playerId !== state.bid.currentBidder) return { state, events: [], error: 'WRONG_PLAYER' };
  if (![0, 1, 2, 3].includes(command.score)) return { state, events: [], error: 'INVALID_BID' };
  if (command.score > 0 && command.score <= state.bid.highestBid) {
    return { state, events: [], error: 'BID_NOT_HIGHER' };
  }

  const accepted: GameEvent = { type: 'BID_ACCEPTED', playerId: command.playerId, score: command.score };
  const events: GameEvent[] = [accepted];
  const passes = command.score === 0 ? state.bid.consecutivePasses + 1 : 0;
  const bid = {
    ...state.bid,
    currentBidder: nextPlayer(command.playerId),
    highestBid: command.score > 0 ? command.score : state.bid.highestBid,
    highestBidder: command.score > 0 ? command.playerId : state.bid.highestBidder,
    consecutivePasses: passes,
  };
  const updated = { ...state, bid };

  if (command.score === 3) return selectLandlord(updated, command.playerId, 3, events);
  if (passes >= 2 && bid.highestBidder !== null) {
    return selectLandlord(updated, bid.highestBidder, bid.highestBid, events);
  }
  if (passes === 3 && bid.highestBidder === null) {
    if (state.dealAttemptIndex < 2) {
      const transition = redeal(updated);
      return { ...transition, events: [...events, ...transition.events] };
    }
    return selectLandlord(updated, state.firstBidder, 1, events);
  }

  return { state: updated, events };
}
