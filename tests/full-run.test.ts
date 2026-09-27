import assert from 'node:assert/strict';
import test from 'node:test';
import { runDeterministicRun } from '../src/cli/run.js';

test('three baseline AIs complete a deterministic six-hand Run within a command bound', () => {
  const first = runDeterministicRun(2026, 10_000);
  const second = runDeterministicRun(2026, 10_000);

  assert.equal(first.state.phase, 'RUN_END');
  assert.equal(first.settledHands, 6);
  assert.ok(first.commandCount < 10_000);
  assert.deepEqual(first, second);
});

test('hex AIs complete a reproducible six-hand Run and draft exactly twice each', () => {
  const first = runDeterministicRun(41, 3000, true);
  const second = runDeterministicRun(41, 3000, true);
  assert.equal(first.state.phase, 'RUN_END');
  assert.equal(first.settledHands, 6);
  assert.ok(first.commandCount < 3000);
  assert.deepEqual(Object.values(first.state.hexPicks).map((picks) => picks.length), [2, 2, 2]);
  assert.match(first.output, /RESONANCE|BROKEN_STRAIGHT|SAME_COLOR|逆流|弃掉/);
  assert.deepEqual(first, second);
});
