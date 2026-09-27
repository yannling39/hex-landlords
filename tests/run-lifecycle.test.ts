import assert from 'node:assert/strict';
import test from 'node:test';
import { dispatch } from '../src/domain/game.js';
import { settleHand, startNextHand } from '../src/domain/scoring.js';
import { createRun } from '../src/domain/setup.js';
import { viewForPlayer } from '../src/domain/player-view.js';
import type { GameState } from '../src/domain/state.js';

function endedHand(state: GameState, winnerId: 'A' | 'B' | 'C'): GameState {
  const hands = { A: [...state.hands.A], B: [...state.hands.B], C: [...state.hands.C] };
  hands[winnerId] = [];
  return { ...state, phase: 'HAND_END', hands, landlordId: state.firstBidder, baseScore: 1, multiplier: 1 };
}

test('six hands consume prepared deals, rotate first bidder twice, and finish with winner or tie', () => {
  let state = createRun({ seed: 1 });
  for (const [handNumber, firstBidder] of [[1, 'A'], [2, 'B'], [3, 'C'], [4, 'A'], [5, 'B'], [6, 'C']] as const) {
    assert.equal(state.handNumber, handNumber);
    assert.equal(state.firstBidder, firstBidder);
    assert.equal(state.bid.currentBidder, firstBidder);
    const before = state.runScores;
    const winnerId = firstBidder;
    const settled = settleHand(endedHand(state, winnerId));
    assert.notDeepEqual(settled.state.runScores, before);
    if (handNumber < 6) {
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
    handNumber: 6 as const,
    runScores: { A: -1, B: 2, C: 0 },
  };
  const settled = settleHand(finalHand);
  const event = settled.events.find((item) => item.type === 'RUN_FINISHED');
  assert.ok(event);
  assert.equal(event.type === 'RUN_FINISHED' && event.winnerId, null);
});

test('enabled runs draft before hands one and three, then retain two picks per player', () => {
  let state = createRun({ seed: 13, hexEnabled: true });
  assert.equal(state.phase, 'HEX_DRAFT');
  assert.deepEqual(viewForPlayer(state, 'A').hand, []);
  assert.equal(viewForPlayer(state, 'A').bottomCards, null);
  assert.equal(new Set(state.hexDraft!.candidates.map((item) => item.id)).size, 3);
  assert.ok(state.hexDraft!.candidates.every((item) => item.label !== 'test'));
  for (const playerId of ['A', 'B', 'C'] as const) {
    assert.equal(state.hexDraft?.currentPlayer, playerId);
    const candidateId = state.hexDraft.candidates[0].id;
    state = dispatch(state, { type: 'SELECT_HEX', playerId, candidateId }).state;
  }
  assert.equal(state.phase, 'BID');
  assert.deepEqual(Object.values(state.hexPicks).map((picks) => picks.length), [1, 1, 1]);

  for (const handNumber of [1, 2] as const) {
    state = settleHand(endedHand(state, 'A')).state;
    assert.equal(state.phase, 'NEXT_HAND');
    state = startNextHand(state).state;
    assert.equal(state.handNumber, handNumber + 1);
    assert.equal(state.phase, handNumber === 1 ? 'BID' : 'HEX_DRAFT');
  }
  for (const playerId of ['A', 'B', 'C'] as const) {
    assert.ok(state.hexDraft!.candidates.every((item) => item.id !== state.hexPicks[playerId][0].id));
    const candidateId = state.hexDraft!.candidates[0].id;
    state = dispatch(state, { type: 'SELECT_HEX', playerId, candidateId }).state;
  }
  assert.equal(state.phase, 'BID');
  assert.deepEqual(Object.values(state.hexPicks).map((picks) => picks.length), [2, 2, 2]);
});
