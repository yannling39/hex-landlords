import type { Card } from './card.js';
import type { PlayerId } from './commands.js';
import type { PlayedMove, GamePhase, GameState } from './state.js';

export type PlayerView = {
  playerId: PlayerId;
  phase: GamePhase;
  hand: Card[];
  handCounts: Record<PlayerId, number>;
  runScores: Record<PlayerId, number>;
  handNumber: 1 | 2 | 3;
  firstBidder: PlayerId;
  bid: GameState['bid'];
  bottomCards: Card[] | null;
  landlordId: PlayerId | null;
  baseScore: GameState['baseScore'];
  currentActor: PlayerId;
  lastPlay: PlayedMove | null;
  trickLeaderId: PlayerId | null;
  consecutivePasses: number;
  multiplier: number;
  bombsPlayed: number;
  hexEnabled: boolean;
};

export function viewForPlayer(state: GameState, playerId: PlayerId): PlayerView {
  return {
    playerId,
    phase: state.phase,
    hand: [...state.hands[playerId]],
    handCounts: {
      A: state.hands.A.length,
      B: state.hands.B.length,
      C: state.hands.C.length,
    },
    runScores: { ...state.runScores },
    handNumber: state.handNumber,
    firstBidder: state.firstBidder,
    bid: { ...state.bid },
    bottomCards: state.bottomRevealed ? [...state.bottomCards] : null,
    landlordId: state.landlordId,
    baseScore: state.baseScore,
    currentActor: state.currentActor,
    lastPlay: state.lastPlay
      ? { ...state.lastPlay, cards: [...state.lastPlay.cards], pattern: { ...state.lastPlay.pattern } }
      : null,
    trickLeaderId: state.trickLeaderId,
    consecutivePasses: state.consecutivePasses,
    multiplier: state.multiplier,
    bombsPlayed: state.bombsPlayed,
    hexEnabled: state.hexEnabled,
  };
}
