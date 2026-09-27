import type { CardId, Rank } from './card.js';

export type PlayerId = 'A' | 'B' | 'C';
export type BidScore = 0 | 1 | 2 | 3;

export type PlayDeclaration =
  | { type: 'RESONANCE'; cardId: CardId; asRank: Rank }
  | { type: 'BROKEN_STRAIGHT' }
  | { type: 'SAME_COLOR' };

export type Command =
  | { type: 'BID'; playerId: PlayerId; score: BidScore }
  | { type: 'PLAY'; playerId: PlayerId; cardIds: CardId[]; declaration?: PlayDeclaration; reverse?: boolean }
  | { type: 'PASS'; playerId: PlayerId; discardCardId?: CardId }
  | { type: 'SELECT_HEX'; playerId: PlayerId; candidateId: string }
  | { type: 'DESIGNATE_KING'; playerId: PlayerId; cardId: CardId };
