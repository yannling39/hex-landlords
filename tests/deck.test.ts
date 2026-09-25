import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeck, dealHand, shuffle } from '../src/domain/deck.js';
import { createSeededRandom } from '../src/domain/random.js';

test('createDeck returns 54 cards with unique stable IDs', () => {
  const cards = createDeck();
  assert.equal(cards.length, 54);
  assert.equal(new Set(cards.map((card) => card.id)).size, 54);
});

test('dealHand deals 17 cards to each player and leaves three bottom cards', () => {
  const dealt = dealHand(createDeck());
  assert.deepEqual(dealt.hands.map((hand) => hand.length), [17, 17, 17]);
  assert.equal(dealt.bottom.length, 3);
});

test('dealHand preserves every card exactly once', () => {
  const deck = createDeck();
  const dealt = dealHand(deck);
  const allDealt = [...dealt.hands.flat(), ...dealt.bottom].map((card) => card.id).sort();
  assert.deepEqual(allDealt, deck.map((card) => card.id).sort());
});

test('shuffle is reproducible for the same seed', () => {
  const first = shuffle(createDeck(), createSeededRandom(123456));
  const second = shuffle(createDeck(), createSeededRandom(123456));
  assert.deepEqual(first.map((card) => card.id), second.map((card) => card.id));
});

test('shuffle changes the order for a nontrivial seed', () => {
  const original = createDeck().map((card) => card.id);
  const shuffled = shuffle(createDeck(), createSeededRandom(123456)).map((card) => card.id);
  assert.notDeepEqual(shuffled, original);
});
