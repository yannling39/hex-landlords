import assert from 'node:assert/strict';
import test from 'node:test';
import { settleHand } from '../src/domain/scoring.js';
import { createRun } from '../src/domain/setup.js';
import type { GameState } from '../src/domain/state.js';

function endedHand(winnerId: 'A' | 'B' | 'C', baseScore: 1 | 2 | 3, multiplier: number): GameState {
  const initial = createRun({ seed: 313 });
  const hands = { A: [...initial.hands.A], B: [...initial.hands.B], C: [...initial.hands.C] };
  hands[winnerId] = [];
  return {
    ...initial,
    phase: 'HAND_END',
    hands,
    landlordId: 'A',
    baseScore,
    multiplier,
    bombsPlayed: Math.log2(multiplier),
  };
}

test('landlord win and loss settle to zero-sum farmer scores', () => {
  const landlordWin = settleHand(endedHand('A', 2, 4));
  assert.deepEqual(landlordWin.state.runScores, { A: 16, B: -8, C: -8 });
  assert.equal(landlordWin.state.phase, 'NEXT_HAND');

  const farmerWin = settleHand(endedHand('C', 3, 2));
  assert.deepEqual(farmerWin.state.runScores, { A: -12, B: 6, C: 6 });
  assert.equal(farmerWin.events[0].type === 'HAND_SETTLED' && farmerWin.events[0].winnerSide, 'FARMERS');
});

test('settlement rejects non-ended hands without changing state', () => {
  const state = createRun({ seed: 3 });
  const transition = settleHand(state);
  assert.equal(transition.error, 'GAME_NOT_ACTIVE');
  assert.equal(JSON.stringify(transition.state), JSON.stringify(state));
});
