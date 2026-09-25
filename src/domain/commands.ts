import type { CardId } from './card.js';

export type PlayerId = 'A' | 'B' | 'C';
export type BidScore = 0 | 1 | 2 | 3;

export type Command =
  | { type: 'BID'; playerId: PlayerId; score: BidScore }
  | { type: 'PLAY'; playerId: PlayerId; cardIds: CardId[] }
  | { type: 'PASS'; playerId: PlayerId };
