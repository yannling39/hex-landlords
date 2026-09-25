import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeck } from '../src/domain/deck.js';
import { classifyCards } from '../src/domain/pattern.js';
import type { Rank } from '../src/domain/card.js';

function cards(ranks: Rank[]) {
  const deck = createDeck();
  return ranks.map((rank, occurrence) => {
    const matching = deck.filter((card) => card.rank === rank);
    const card = matching[occurrenceByRank(ranks, occurrence)];
    assert.ok(card, `fixture needs ${occurrence} occurrence of ${rank}`);
    return card;
  });
}

function occurrenceByRank(ranks: Rank[], index: number): number {
  return ranks.slice(0, index).filter((rank) => rank === ranks[index]).length;
}

const examples: Array<{ name: string; ranks: Rank[]; type: string; mainRank: number; length?: number; mode?: string }> = [
  { name: 'single', ranks: ['3'], type: 'SINGLE', mainRank: 3 },
  { name: 'pair', ranks: ['4', '4'], type: 'PAIR', mainRank: 4 },
  { name: 'triple', ranks: ['5', '5', '5'], type: 'TRIPLE', mainRank: 5 },
  { name: 'triple with one', ranks: ['6', '6', '6', '7'], type: 'TRIPLE_SINGLE', mainRank: 6, mode: 'single' },
  { name: 'triple with pair', ranks: ['7', '7', '7', '8', '8'], type: 'TRIPLE_PAIR', mainRank: 7, mode: 'pair' },
  { name: 'straight', ranks: ['3', '4', '5', '6', '7'], type: 'STRAIGHT', mainRank: 7, length: 5 },
  { name: 'consecutive pairs', ranks: ['3', '3', '4', '4', '5', '5'], type: 'CONSECUTIVE_PAIRS', mainRank: 5, length: 3 },
  { name: 'airplane with single wings containing a pair', ranks: ['3', '3', '3', '4', '4', '4', '5', '5'], type: 'AIRPLANE_SINGLE', mainRank: 4, length: 2, mode: 'single' },
  { name: 'airplane with two pair wings', ranks: ['3', '3', '3', '4', '4', '4', '5', '5', '6', '6'], type: 'AIRPLANE_PAIRS', mainRank: 4, length: 2, mode: 'pair' },
  { name: 'four with two singles', ranks: ['7', '7', '7', '7', '9', 'J'], type: 'FOUR_TWO_SINGLES', mainRank: 7, mode: 'single' },
  { name: 'four with two singles that form a pair', ranks: ['7', '7', '7', '7', '9', '9'], type: 'FOUR_TWO_SINGLES', mainRank: 7, mode: 'single' },
  { name: 'four with two pair wings', ranks: ['7', '7', '7', '7', '9', '9', 'J', 'J'], type: 'FOUR_TWO_PAIRS', mainRank: 7, mode: 'pair' },
  { name: 'bomb', ranks: ['Q', 'Q', 'Q', 'Q'], type: 'BOMB', mainRank: 12 },
  { name: 'rocket', ranks: ['small-joker', 'big-joker'], type: 'ROCKET', mainRank: 17 },
];

for (const example of examples) {
  test(`classifies ${example.name}`, () => {
    const result = classifyCards(cards(example.ranks));
    assert.ok(result);
    assert.equal(result.type, example.type);
    assert.equal(result.mainRank, example.mainRank);
    assert.equal(result.sequenceLength, example.length ?? 1);
    assert.equal(result.attachmentMode, example.mode ?? 'none');
    assert.equal(result.cardCount, example.ranks.length);
  });
}

test('rejects invalid rank sequences and invalid attachment ranks', () => {
  assert.equal(classifyCards(cards(['10', 'J', 'Q', 'K', 'A', '2'])), null);
  assert.equal(classifyCards(cards(['3', '3', '3', '4', '4', '4', '5', '5', '5', '6'])), null);
});

test('rejects duplicate physical card IDs', () => {
  const card = cards(['A'])[0];
  assert.equal(classifyCards([card, card]), null);
});
