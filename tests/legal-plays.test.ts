import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeck } from '../src/domain/deck.js';
import { comparePatterns } from '../src/domain/compare.js';
import { listLegalPlays } from '../src/domain/legal-plays.js';
import { classifyCards } from '../src/domain/pattern.js';
import type { Card, Rank } from '../src/domain/card.js';
import type { Pattern } from '../src/domain/pattern.js';

const deck = createDeck();
function cards(...ranks: Rank[]): Card[] {
  const used = new Map<Rank, number>();
  return ranks.map((rank) => {
    const copy = used.get(rank) ?? 0;
    used.set(rank, copy + 1);
    const card = deck.filter((candidate) => candidate.rank === rank)[copy];
    assert.ok(card);
    return card;
  });
}

test('enumeration returns only classified patterns that beat the current play', () => {
  const hand = cards('3', '4', '5', '6', '7', '7', '7', '7', 'small-joker', 'big-joker');
  const current = classifyCards(cards('4')) as Pattern;
  const legal = listLegalPlays(hand, current);
  assert.ok(legal.length > 0);
  for (const ids of legal) {
    const selected = ids.map((id) => hand.find((card) => card.id === id)).filter((card): card is Card => !!card);
    const pattern = classifyCards(selected);
    assert.ok(pattern);
    assert.equal(comparePatterns(pattern, current), 1);
  }
});

test('lead enumeration includes single, pair, and sequence candidates', () => {
  const hand = cards('3', '3', '4', '5', '6', '7', '8');
  const legal = listLegalPlays(hand, null);
  const patterns = legal.map((ids) => classifyCards(ids.map((id) => hand.find((card) => card.id === id)!)));
  assert.ok(patterns.some((pattern) => pattern?.type === 'SINGLE'));
  assert.ok(patterns.some((pattern) => pattern?.type === 'PAIR'));
  assert.ok(patterns.some((pattern) => pattern?.type === 'STRAIGHT'));
});
