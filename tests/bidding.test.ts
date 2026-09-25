import assert from 'node:assert/strict';
import test from 'node:test';
import { applyBid } from '../src/domain/bidding.js';
import { createRun } from '../src/domain/setup.js';
import type { BidScore, PlayerId } from '../src/domain/commands.js';
import type { GameState } from '../src/domain/state.js';

function bid(state: GameState, playerId: PlayerId, score: BidScore): GameState {
  const transition = applyBid(state, { type: 'BID', playerId, score });
  assert.equal(transition.error, undefined);
  return transition.state;
}

test('createRun prepares three deterministic hands and starts the first bidding round at A', () => {
  const first = createRun({ seed: 417 });
  const second = createRun({ seed: 417 });

  assert.deepEqual(first, second);
  assert.equal(first.phase, 'BID');
  assert.equal(first.handNumber, 1);
  assert.equal(first.firstBidder, 'A');
  assert.equal(first.bid.currentBidder, 'A');
  assert.equal(first.preparedDeals.length, 3);
  assert.ok(first.preparedDeals.every((attempts) => attempts.length === 3));
  assert.equal(first.hands.A.length, 17);
  assert.equal(first.hands.B.length, 17);
  assert.equal(first.hands.C.length, 17);
  assert.equal(first.bottomCards.length, 3);

  for (const attempts of first.preparedDeals) {
    for (const deal of attempts) {
      const ids = [...deal.hands.A, ...deal.hands.B, ...deal.hands.C, ...deal.bottom].map((card) => card.id);
      assert.equal(ids.length, 54);
      assert.equal(new Set(ids).size, 54);
    }
  }
});

test('bids advance clockwise, require a strictly higher positive score, and award the bottom cards', () => {
  const initial = createRun({ seed: 9 });
  const first = bid(initial, 'A', 1);
  assert.equal(first.bid.currentBidder, 'B');
  const second = bid(first, 'B', 2);
  assert.equal(second.bid.currentBidder, 'C');

  const rejected = applyBid(second, { type: 'BID', playerId: 'C', score: 2 });
  assert.equal(rejected.error, 'BID_NOT_HIGHER');
  assert.equal(JSON.stringify(rejected.state), JSON.stringify(second));

  const third = bid(second, 'C', 0);
  const landlordTransition = applyBid(third, { type: 'BID', playerId: 'A', score: 0 });
  assert.equal(landlordTransition.error, undefined);
  assert.equal(landlordTransition.state.phase, 'PLAY');
  assert.equal(landlordTransition.state.landlordId, 'B');
  assert.equal(landlordTransition.state.baseScore, 2);
  assert.equal(landlordTransition.state.currentActor, 'B');
  assert.equal(landlordTransition.state.bottomRevealed, true);
  assert.equal(landlordTransition.state.hands.B.length, 20);
  assert.deepEqual(landlordTransition.events.map((event) => event.type), ['BID_ACCEPTED', 'LANDLORD_SELECTED']);
  for (const card of third.bottomCards) {
    assert.ok(landlordTransition.state.hands.B.some((owned) => owned.id === card.id));
  }
});

test('bid 3 immediately selects its bidder as landlord', () => {
  const initial = createRun({ seed: 12 });
  const passed = bid(initial, 'A', 0);
  const transition = applyBid(passed, { type: 'BID', playerId: 'B', score: 3 });

  assert.equal(transition.error, undefined);
  assert.equal(transition.state.landlordId, 'B');
  assert.equal(transition.state.baseScore, 3);
  assert.equal(transition.state.phase, 'PLAY');
});

test('all-pass redeals twice, then automatically makes the original first bidder landlord', () => {
  let state = createRun({ seed: 85 });
  const originalFirstDeal = JSON.stringify({ hands: state.hands, bottom: state.bottomCards });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    for (const playerId of ['A', 'B', 'C'] as const) state = bid(state, playerId, 0);
    if (attempt < 2) {
      assert.equal(state.phase, 'BID');
      assert.equal(state.dealAttemptIndex, attempt + 1);
      assert.equal(state.firstBidder, 'A');
      assert.equal(state.bid.currentBidder, 'A');
      assert.notEqual(JSON.stringify({ hands: state.hands, bottom: state.bottomCards }), originalFirstDeal);
    }
  }

  assert.equal(state.phase, 'PLAY');
  assert.equal(state.landlordId, 'A');
  assert.equal(state.baseScore, 1);
  assert.equal(state.hands.A.length, 20);
});

test('out-of-turn and invalid bids preserve the state', () => {
  const state = createRun({ seed: 3 });
  for (const command of [
    { type: 'BID', playerId: 'B', score: 1 },
    { type: 'BID', playerId: 'A', score: 4 },
  ] as unknown as Parameters<typeof applyBid>[1][]) {
    const transition = applyBid(state, command);
    assert.ok(transition.error);
    assert.equal(JSON.stringify(transition.state), JSON.stringify(state));
  }
});
