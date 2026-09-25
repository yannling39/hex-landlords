import assert from 'node:assert/strict';
import test from 'node:test';
import { dispatch } from '../src/domain/game.js';
import { createRun } from '../src/domain/setup.js';

test('dispatch routes bidding commands to bidding rules', () => {
  const state = createRun({ seed: 21 });
  const transition = dispatch(state, { type: 'BID', playerId: 'A', score: 3 });
  assert.equal(transition.error, undefined);
  assert.equal(transition.state.phase, 'PLAY');
  assert.equal(transition.state.landlordId, 'A');
});

test('dispatch rejects commands outside the active game phase', () => {
  const state = { ...createRun({ seed: 21 }), phase: 'RUN_END' as const };
  const transition = dispatch(state, { type: 'PASS', playerId: 'A' });
  assert.equal(transition.error, 'GAME_NOT_ACTIVE');
  assert.equal(JSON.stringify(transition.state), JSON.stringify(state));
});
