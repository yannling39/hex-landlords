import { RANK_STRENGTH, STANDARD_RANKS, type Card, type Rank } from './card.js';

export type PatternType =
  | 'SINGLE'
  | 'PAIR'
  | 'TRIPLE'
  | 'TRIPLE_SINGLE'
  | 'TRIPLE_PAIR'
  | 'STRAIGHT'
  | 'CONSECUTIVE_PAIRS'
  | 'AIRPLANE_SINGLE'
  | 'AIRPLANE_PAIRS'
  | 'FOUR_TWO_SINGLES'
  | 'FOUR_TWO_PAIRS'
  | 'BOMB'
  | 'ROCKET';

export type AttachmentMode = 'none' | 'single' | 'pair';

export type Pattern = {
  type: PatternType;
  mainRank: number;
  sequenceLength: number;
  attachmentMode: AttachmentMode;
  cardCount: number;
};

const sequenceCardRanks = STANDARD_RANKS.slice(0, -1);
const sequenceRanks = sequenceCardRanks.map((rank) => RANK_STRENGTH[rank]);

function rankCounts(cards: readonly Card[]): Map<Rank, number> {
  const counts = new Map<Rank, number>();
  for (const card of cards) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  return counts;
}

function makePattern(
  type: PatternType,
  rank: Rank,
  cardCount: number,
  sequenceLength = 1,
  attachmentMode: AttachmentMode = 'none',
): Pattern {
  return {
    type,
    mainRank: RANK_STRENGTH[rank],
    sequenceLength,
    attachmentMode,
    cardCount,
  };
}

function isConsecutiveRanks(ranks: Rank[]): boolean {
  if (ranks.some((rank) => !sequenceCardRanks.includes(rank))) return false;
  const values = ranks.map((rank) => RANK_STRENGTH[rank]).sort((a, b) => a - b);
  return values.every((value, index) => index === 0 || value === values[index - 1] + 1);
}

function findAirplane(cards: readonly Card[], counts: Map<Rank, number>, withPairs: boolean): Pattern | null {
  const cardsPerBody = withPairs ? 5 : 4;
  if (cards.length % cardsPerBody !== 0) return null;
  const sequenceLength = cards.length / cardsPerBody;
  if (sequenceLength < 2) return null;

  const candidates: Pattern[] = [];
  for (let start = 0; start <= sequenceRanks.length - sequenceLength; start += 1) {
    const bodyRanks = STANDARD_RANKS.slice(start, start + sequenceLength);
    if (!bodyRanks.every((rank) => counts.get(rank) === 3)) continue;

    const body = new Set<Rank>(bodyRanks);
    const wings = [...counts.entries()].filter(([rank]) => !body.has(rank));
    const wingsValid = withPairs
      ? wings.length === sequenceLength && wings.every(([, count]) => count === 2)
      : wings.reduce((sum, [, count]) => sum + count, 0) === sequenceLength
        && wings.every(([, count]) => count <= 2);
    if (!wingsValid) continue;

    candidates.push(makePattern(
      withPairs ? 'AIRPLANE_PAIRS' : 'AIRPLANE_SINGLE',
      bodyRanks[bodyRanks.length - 1],
      cards.length,
      sequenceLength,
      withPairs ? 'pair' : 'single',
    ));
  }

  candidates.sort((a, b) => b.mainRank - a.mainRank);
  return candidates[0] ?? null;
}

export function classifyCards(cards: readonly Card[]): Pattern | null {
  if (cards.length === 0) return null;
  if (new Set(cards.map((card) => card.id)).size !== cards.length) return null;

  const counts = rankCounts(cards);
  const entries = [...counts.entries()];

  if (cards.length === 2 && counts.get('small-joker') === 1 && counts.get('big-joker') === 1) {
    return makePattern('ROCKET', 'big-joker', 2);
  }

  if (cards.length === 1) return makePattern('SINGLE', cards[0].rank, 1);
  if (cards.length === 2 && counts.size === 1) return makePattern('PAIR', entries[0][0], 2);
  if (cards.length === 3 && counts.size === 1) return makePattern('TRIPLE', entries[0][0], 3);
  if (cards.length === 4 && counts.size === 1) return makePattern('BOMB', entries[0][0], 4);

  if (cards.length === 4 && entries.some(([, count]) => count === 3)) {
    const triple = entries.find(([, count]) => count === 3);
    if (triple) return makePattern('TRIPLE_SINGLE', triple[0], 4, 1, 'single');
  }

  if (cards.length === 5 && entries.length === 2) {
    const triple = entries.find(([, count]) => count === 3);
    const pair = entries.find(([, count]) => count === 2);
    if (triple && pair) return makePattern('TRIPLE_PAIR', triple[0], 5, 1, 'pair');
  }

  if (cards.length === 6) {
    const four = entries.find(([, count]) => count === 4);
    if (four) return makePattern('FOUR_TWO_SINGLES', four[0], 6, 1, 'single');
  }

  if (cards.length === 8) {
    const four = entries.find(([, count]) => count === 4);
    const pairs = entries.filter(([, count]) => count === 2);
    if (four && pairs.length === 2 && pairs.every(([rank]) => rank !== four[0])) {
      return makePattern('FOUR_TWO_PAIRS', four[0], 8, 1, 'pair');
    }
  }

  const airplanePairs = findAirplane(cards, counts, true);
  if (airplanePairs) return airplanePairs;
  const airplaneSingles = findAirplane(cards, counts, false);
  if (airplaneSingles) return airplaneSingles;

  if (cards.length >= 5 && entries.length === cards.length && isConsecutiveRanks(entries.map(([rank]) => rank))) {
    const high = entries.reduce((best, [rank]) => RANK_STRENGTH[rank] > RANK_STRENGTH[best] ? rank : best, entries[0][0]);
    return makePattern('STRAIGHT', high, cards.length, cards.length);
  }

  if (cards.length >= 6 && cards.length % 2 === 0 && entries.length === cards.length / 2 && entries.every(([, count]) => count === 2)) {
    const ranks = entries.map(([rank]) => rank);
    if (isConsecutiveRanks(ranks)) {
      const high = ranks.reduce((best, rank) => RANK_STRENGTH[rank] > RANK_STRENGTH[best] ? rank : best, ranks[0]);
      return makePattern('CONSECUTIVE_PAIRS', high, cards.length, ranks.length);
    }
  }

  return null;
}
