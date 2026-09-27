import type { Card } from './card.js';
import type { BidScore, PlayerId, PlayDeclaration } from './commands.js';
import type { Pattern } from './pattern.js';

export type GameEvent =
  | { type: 'BID_ACCEPTED'; playerId: PlayerId; score: BidScore }
  | { type: 'HAND_REDEALT'; handNumber: number }
  | { type: 'LANDLORD_SELECTED'; playerId: PlayerId; bottomCards: Card[]; baseScore: BidScore }
  | { type: 'HAND_SETTLED'; handNumber: 1 | 2 | 3 | 4 | 5 | 6; winnerSide: 'LANDLORD' | 'FARMERS'; winnerId: PlayerId; scoreChanges: Record<PlayerId, number>; multiplier: number }
  | { type: 'CARDS_PLAYED'; playerId: PlayerId; cards: Card[]; pattern: Pattern; declaration?: PlayDeclaration; reverse?: boolean }
  | { type: 'PLAYER_PASSED'; playerId: PlayerId; discardedCard?: Card }
  | { type: 'TRICK_CLOSED'; leaderId: PlayerId }
  | { type: 'HAND_FINISHED'; winnerSide: 'LANDLORD' | 'FARMERS'; winnerId: PlayerId; multiplier: number }
  | { type: 'RUN_FINISHED'; scores: Record<PlayerId, number>; winnerId: PlayerId | null }
  | { type: 'HEX_SELECTED'; playerId: PlayerId; candidateId: string; label: string }
  | { type: 'KING_DESIGNATED'; playerId: PlayerId; card: Card };
