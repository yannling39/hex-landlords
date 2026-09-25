import type { Card } from './card.js';
import type { BidScore, PlayerId } from './commands.js';
import type { RuleErrorCode } from './errors.js';
import type { GameEvent } from './events.js';
import type { Pattern } from './pattern.js';

export type GamePhase =
  | 'BID'
  | 'PLAY'
  | 'HAND_END'
  | 'HEX_DRAFT'
  | 'NEXT_HAND'
  | 'RUN_END';

export type PreparedDeal = {
  hands: Record<PlayerId, Card[]>;
  bottom: Card[];
};

export type PlayedMove = {
  playerId: PlayerId;
  cards: Card[];
  pattern: Pattern;
};

export type GameState = {
  version: 1;
  phase: GamePhase;
  players: [PlayerId, PlayerId, PlayerId];
  hands: Record<PlayerId, Card[]>;
  runScores: Record<PlayerId, number>;
  handNumber: 1 | 2 | 3;
  firstBidder: PlayerId;
  preparedDeals: PreparedDeal[][];
  dealAttemptIndex: number;
  bid: {
    currentBidder: PlayerId;
    highestBid: BidScore;
    highestBidder: PlayerId | null;
    consecutivePasses: number;
  };
  bottomCards: Card[];
  bottomRevealed: boolean;
  landlordId: PlayerId | null;
  baseScore: BidScore;
  currentActor: PlayerId;
  lastPlay: PlayedMove | null;
  trickLeaderId: PlayerId | null;
  consecutivePasses: number;
  multiplier: number;
  bombsPlayed: number;
  hexEnabled: boolean;
};

export type Transition = {
  state: GameState;
  events: GameEvent[];
  error?: RuleErrorCode;
};
