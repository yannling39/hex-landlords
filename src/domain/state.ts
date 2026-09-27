import type { Card } from './card.js';
import type { BidScore, PlayerId, PlayDeclaration } from './commands.js';
import type { RuleErrorCode } from './errors.js';
import type { GameEvent } from './events.js';
import type { Pattern } from './pattern.js';

export type GamePhase =
  | 'BID'
  | 'PLAY'
  | 'HAND_END'
  | 'HEX_DRAFT'
  | 'KING_DESIGNATE'
  | 'NEXT_HAND'
  | 'RUN_END';

export type HandNumber = 1 | 2 | 3 | 4 | 5 | 6;

export type PreparedDeal = {
  hands: Record<PlayerId, Card[]>;
  bottom: Card[];
};

export type PlayedMove = {
  playerId: PlayerId;
  cards: Card[];
  pattern: Pattern;
  declaration?: PlayDeclaration;
};

export type HexUses = { abandon: number; sameColor: number };

export type HexCandidate = { id: string; label: string; description: string };

export type HexDraft = {
  currentPlayer: PlayerId;
  candidates: HexCandidate[];
};

export type GameState = {
  version: 1;
  seed: number;
  phase: GamePhase;
  players: [PlayerId, PlayerId, PlayerId];
  hands: Record<PlayerId, Card[]>;
  runScores: Record<PlayerId, number>;
  handNumber: HandNumber;
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
  hexDraft: HexDraft | null;
  hexPicks: Record<PlayerId, HexCandidate[]>;
  hexUses: Record<PlayerId, HexUses>;
  crownCards: Record<PlayerId, string | null>;
  crownActor: PlayerId | null;
  trickMode: 'normal' | 'reverse';
  discardedCards: Card[];
};

export type Transition = {
  state: GameState;
  events: GameEvent[];
  error?: RuleErrorCode;
};
