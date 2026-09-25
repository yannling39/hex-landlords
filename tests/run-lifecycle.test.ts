import assert from 'node:assert/strict';
import test from 'node:test';
import { settleHand, startNextHand } from '../src/domain/scoring.js';
import { createRun } from '../src/domain/setup.js';
import type { GameState } from '../src/domain/state.js';

function endedHand(state: GameState, winnerId: 'A' | 'B' | 'C'): GameState {
  const hands = { A: [...state.hands.A], B: [...state.hands.B], C: [...state.hands.C] };
  hands[winnerId] = [];
  return { ...state, phase: 'HAND_END', hands, landlordId: state.firstBidder, baseScore: 1, multiplier: 1 };
}

test('three hands consume prepared deals, rotate first bidder, and finish with winner or tie', () => {
  let state = createRun({ seed: 1 });
  for (const [handNumber, firstBidder] of [[1, 'A'], [2, 'B'], [3, 'C']] as const) {
    assert.equal(state.handNumber, handNumber);
    assert.equal(state.firstBidder, firstBidder);
    assert.equal(state.bid.currentBidder, firstBidder);
    const before = state.runScores;
    const winnerId = firstBidder;
    const settled = settleHand(endedHand(state, winnerId));
    assert.notDeepEqual(settled.state.runScores, before);
    if (handNumber < 3) {
      assert.equal(settled.state.phase, 'NEXT_HAND');
      state = startNextHand(settled.state).state;
      assert.equal(state.phase, 'BID');
      assert.equal(state.dealAttemptIndex, 0);
      assert.equal(state.hands.A.length + state.hands.B.length + state.hands.C.length, 51);
    } else {
      assert.equal(settled.state.phase, 'RUN_END');
      assert.ok(settled.events.some((event) => event.type === 'RUN_FINISHED'));
    }
  }
});

test('a tied score has no run winner', () => {
  const initial = createRun({ seed: 91 });
  const finalHand = {
    ...endedHand(initial, 'A'),
    phase: 'HAND_END' as const,
    handNumber: 3 as const,
    runScores: { A: -1, B: 2, C: 0 },
  };
  const settled = settleHand(finalHand);
  const event = settled.events.find((item) => item.type === 'RUN_FINISHED');
  assert.ok(event);
  assert.equal(event.type === 'RUN_FINISHED' && event.winnerId, null);
});
