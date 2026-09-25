import assert from 'node:assert/strict';
import test from 'node:test';
import { runDeterministicRun } from '../src/cli/run.js';

test('three baseline AIs complete a deterministic three-hand Run within a command bound', () => {
  const first = runDeterministicRun(2026, 10_000);
  const second = runDeterministicRun(2026, 10_000);

  assert.equal(first.state.phase, 'RUN_END');
  assert.equal(first.settledHands, 3);
  assert.ok(first.commandCount < 10_000);
  assert.deepEqual(first, second);
});
