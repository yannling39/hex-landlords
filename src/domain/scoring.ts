import type { PlayerId } from './commands.js';
import type { GameEvent } from './events.js';
import type { GameState, Transition } from './state.js';

const PLAYERS: readonly PlayerId[] = ['A', 'B', 'C'];

function runWinner(scores: Record<PlayerId, number>): PlayerId | null {
  const maxScore = Math.max(...PLAYERS.map((playerId) => scores[playerId]));
  const leaders = PLAYERS.filter((playerId) => scores[playerId] === maxScore);
  return leaders.length === 1 ? leaders[0] : null;
}

export function settleHand(state: GameState): Transition {
  if (state.phase !== 'HAND_END' || !state.landlordId) {
    return { state, events: [], error: 'GAME_NOT_ACTIVE' };
  }
  const winners = PLAYERS.filter((playerId) => state.hands[playerId].length === 0);
  if (winners.length !== 1) return { state, events: [], error: 'GAME_NOT_ACTIVE' };

  const winnerId = winners[0];
  const winnerSide = winnerId === state.landlordId ? 'LANDLORD' : 'FARMERS';
  const unit = state.baseScore * state.multiplier;
  const landlordDelta = winnerSide === 'LANDLORD' ? unit * 2 : -unit * 2;
  const farmerDelta = winnerSide === 'LANDLORD' ? -unit : unit;
  const scoreChanges = {
    A: state.landlordId === 'A' ? landlordDelta : farmerDelta,
    B: state.landlordId === 'B' ? landlordDelta : farmerDelta,
    C: state.landlordId === 'C' ? landlordDelta : farmerDelta,
  };
  const runScores = {
    A: state.runScores.A + scoreChanges.A,
    B: state.runScores.B + scoreChanges.B,
    C: state.runScores.C + scoreChanges.C,
  };
  const settlement: GameEvent = {
    type: 'HAND_SETTLED',
    handNumber: state.handNumber,
    winnerSide,
    winnerId,
    scoreChanges,
    multiplier: state.multiplier,
  };

  if (state.handNumber === 3) {
    const runEvent: GameEvent = { type: 'RUN_FINISHED', scores: runScores, winnerId: runWinner(runScores) };
    return { state: { ...state, runScores, phase: 'RUN_END' }, events: [settlement, runEvent] };
  }

  return {
    state: { ...state, runScores, phase: state.hexEnabled ? 'HEX_DRAFT' : 'NEXT_HAND' },
    events: [settlement],
  };
}

export function startNextHand(state: GameState): Transition {
  if (state.phase !== 'NEXT_HAND' || state.handNumber >= 3) {
    return { state, events: [], error: 'GAME_NOT_ACTIVE' };
  }

  const handNumber = (state.handNumber + 1) as 2 | 3;
  const firstBidder = PLAYERS[(PLAYERS.indexOf(state.firstBidder) + 1) % PLAYERS.length];
  const deal = state.preparedDeals[handNumber - 1][0];
  return {
    state: {
      ...state,
      phase: 'BID',
      hands: { A: [...deal.hands.A], B: [...deal.hands.B], C: [...deal.hands.C] },
      handNumber,
      firstBidder,
      dealAttemptIndex: 0,
      bid: { currentBidder: firstBidder, highestBid: 0, highestBidder: null, consecutivePasses: 0 },
      bottomCards: [...deal.bottom],
      bottomRevealed: false,
      landlordId: null,
      baseScore: 0,
      currentActor: firstBidder,
      lastPlay: null,
      trickLeaderId: null,
      consecutivePasses: 0,
      multiplier: 1,
      bombsPlayed: 0,
    },
    events: [],
  };
}
