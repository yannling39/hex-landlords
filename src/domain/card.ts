export type CardId = string;

export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades' | 'joker';

export type Rank =
  | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A' | '2' | 'small-joker' | 'big-joker';

export type Card = {
  id: CardId;
  suit: Suit;
  rank: Rank;
};

export const RANK_STRENGTH: Record<Rank, number> = {
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
  '2': 15,
  'small-joker': 16,
  'big-joker': 17,
};

export const STANDARD_RANKS: readonly Rank[] = [
  '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2',
];

export const STANDARD_SUITS: readonly Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
