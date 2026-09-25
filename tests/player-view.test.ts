import assert from 'node:assert/strict';
import test from 'node:test';
import { createRun } from '../src/domain/setup.js';
import { applyBid } from '../src/domain/bidding.js';
import { viewForPlayer } from '../src/domain/player-view.js';

test('player view exposes only that player hand and public hand counts', () => {
  const state = createRun({ seed: 52 });
  const view = viewForPlayer(state, 'B');

  assert.deepEqual(view.hand, state.hands.B);
  assert.deepEqual(view.handCounts, { A: 17, B: 17, C: 17 });
  assert.equal('preparedDeals' in view, false);
  assert.equal('hands' in view, false);
  for (const card of [...state.hands.A, ...state.hands.C]) {
    assert.equal(JSON.stringify(view).includes(card.id), false);
  }
  for (const card of state.bottomCards) assert.equal(JSON.stringify(view).includes(card.id), false);
});

test('bottom cards become public only after the landlord is selected', () => {
  const state = createRun({ seed: 6 });
  assert.equal(viewForPlayer(state, 'A').bottomCards, null);

  const selected = applyBid(state, { type: 'BID', playerId: 'A', score: 3 }).state;
  assert.deepEqual(viewForPlayer(selected, 'B').bottomCards, state.bottomCards);
  assert.equal('preparedDeals' in viewForPlayer(selected, 'B'), false);
});
