import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeck } from '../src/domain/deck.js';
import { comparePatterns } from '../src/domain/compare.js';
import { listLegalPlays } from '../src/domain/legal-plays.js';
import { classifyCards } from '../src/domain/pattern.js';
import { listLegalActions } from '../src/domain/legal-plays.js';
import { dispatch } from '../src/domain/game.js';
import { createRun } from '../src/domain/setup.js';
import { viewForPlayer } from '../src/domain/player-view.js';
import { HEXES } from '../src/domain/hex.js';
import type { GameState } from '../src/domain/state.js';
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

test('declared legal actions are accepted by dispatch for resonance, broken straight and same color', () => {
  const scenarios = [
    { hexId: 'resonance', hand: cards('3', 'Q', 'A'), declaration: 'RESONANCE' },
    { hexId: 'broken_straight', hand: cards('3', '4', '5', '7', '8', 'A'), declaration: 'BROKEN_STRAIGHT' },
    { hexId: 'same_color', hand: deck.filter((card) => card.suit === 'hearts').slice(0, 6), declaration: 'SAME_COLOR' },
  ] as const;
  for (const scenario of scenarios) {
    const hex = HEXES.find((item) => item.id === scenario.hexId)!;
    const initial = createRun({ seed: 91 });
    const state: GameState = {
      ...initial, phase: 'PLAY', landlordId: 'A', currentActor: 'A',
      hands: { ...initial.hands, A: [...scenario.hand] },
      hexPicks: { A: [hex], B: [], C: [] },
    };
    const actions = listLegalActions(viewForPlayer(state, 'A'));
    const declared = actions.find((action) => action.declaration?.type === scenario.declaration);
    assert.ok(declared, `${scenario.hexId} should yield a declared action`);
    const transition = dispatch(state, declared);
    assert.equal(transition.error, undefined, scenario.hexId);
  }
});

test('legal action enumeration honors reverse trick and crown tie', () => {
  const crown = HEXES.find((item) => item.id === 'crown_me')!;
  const initial = createRun({ seed: 92 });
  const three = cards('3')[0];
  const four = cards('4')[0];
  const state: GameState = {
    ...initial, phase: 'PLAY', landlordId: 'A', currentActor: 'A',
    hands: { ...initial.hands, A: [three, four] },
    hexPicks: { A: [crown], B: [], C: [] },
    crownCards: { A: three.id, B: null, C: null },
    trickMode: 'reverse',
    lastPlay: { playerId: 'B', cards: [cards('5')[0]], pattern: classifyCards(cards('5'))! },
  };
  const actions = listLegalActions(viewForPlayer(state, 'A'));
  assert.ok(actions.some((action) => action.cardIds[0] === three.id));
  assert.ok(actions.some((action) => action.cardIds[0] === four.id));
  assert.ok(actions.every((action) => dispatch(state, action).error === undefined));
});

test('resonance enumeration includes a triple with attachment and consecutive pairs', () => {
  const initial = createRun({ seed: 11 });
  const hex = HEXES.find((item) => item.id === 'resonance')!;
  for (const hand of [cards('3', 'Q', 'Q', 'A'), cards('3', '6', '7', '7', '8', '8')]) {
    const state: GameState = { ...initial, phase: 'PLAY', landlordId: 'A', currentActor: 'A', hands: { ...initial.hands, A: hand }, hexPicks: { A: [hex], B: [], C: [] } };
    const actions = listLegalActions(viewForPlayer(state, 'A'));
    assert.ok(actions.some((action) => action.declaration?.type === 'RESONANCE' && dispatch(state, action).state.lastPlay?.pattern.type === (hand.length === 4 ? 'TRIPLE_SINGLE' : 'CONSECUTIVE_PAIRS')));
  }
});
