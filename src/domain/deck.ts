import { STANDARD_RANKS, STANDARD_SUITS, type Card, type CardId } from './card.js';
import type { RandomSource } from './random.js';

export type DealtHand = {
  hands: [Card[], Card[], Card[]];
  bottom: Card[];
};

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of STANDARD_SUITS) {
    for (const rank of STANDARD_RANKS) {
      cards.push({ id: `${suit}:${rank}`, suit, rank });
    }
  }
  cards.push({ id: 'joker:small', suit: 'joker', rank: 'small-joker' });
  cards.push({ id: 'joker:big', suit: 'joker', rank: 'big-joker' });
  return cards;
}

export function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError('RandomSource must return a number in [0, 1)');
    }
    const swapIndex = Math.floor(value * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function dealHand(cards: readonly Card[]): DealtHand {
  const ids = new Set<CardId>();
  for (const card of cards) {
    if (ids.has(card.id)) throw new Error(`Duplicate card id: ${card.id}`);
    ids.add(card.id);
  }
  if (cards.length !== 54) throw new Error(`Expected 54 cards, received ${cards.length}`);

  const hands: [Card[], Card[], Card[]] = [[], [], []];
  for (let index = 0; index < 51; index += 1) {
    hands[index % 3].push(cards[index]);
  }
  return { hands, bottom: cards.slice(51) };
}
