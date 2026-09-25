import type { Card } from './card.js';
import type { BidScore, PlayerId } from './commands.js';
import type { Pattern } from './pattern.js';

export type GameEvent =
  | { type: 'BID_ACCEPTED'; playerId: PlayerId; score: BidScore }
  | { type: 'LANDLORD_SELECTED'; playerId: PlayerId; bottomCards: Card[]; baseScore: BidScore }
  | { type: 'CARDS_PLAYED'; playerId: PlayerId; cards: Card[]; pattern: Pattern }
  | { type: 'PLAYER_PASSED'; playerId: PlayerId }
  | { type: 'TRICK_CLOSED'; leaderId: PlayerId }
  | { type: 'HAND_FINISHED'; winnerSide: 'LANDLORD' | 'FARMERS'; winnerId: PlayerId; multiplier: number }
  | { type: 'RUN_FINISHED'; scores: Record<PlayerId, number>; winnerId: PlayerId | null };
