import assert from 'node:assert/strict';
import test from 'node:test';
import { applyBid } from '../src/domain/bidding.js';
import { dispatch } from '../src/domain/game.js';
import { HEXES } from '../src/domain/hex.js';
import { viewForPlayer } from '../src/domain/player-view.js';
import { createRun } from '../src/domain/setup.js';
import { settleHand, startNextHand } from '../src/domain/scoring.js';
import type { GameState } from '../src/domain/state.js';
import { createDeck } from '../src/domain/deck.js';

const crown = HEXES.find((hex) => hex.id === 'crown_me')!;

test('all crown holders designate after landlord receives bottom cards and before play', () => {
  const initial = createRun({ seed: 8 });
  const state: GameState = { ...initial, hexPicks: { A: [crown], B: [crown], C: [] } };
  const bid = applyBid(state, { type: 'BID', playerId: 'A', score: 3 });
  assert.equal(bid.state.phase, 'KING_DESIGNATE');
  assert.equal(bid.state.crownActor, 'A');
  assert.equal(bid.state.hands.A.length, 20);
  const a = bid.state.hands.A.at(-1)!;
  const first = dispatch(bid.state, { type: 'DESIGNATE_KING', playerId: 'A', cardId: a.id });
  assert.equal(first.error, undefined);
  assert.equal(first.state.crownActor, 'B');
  assert.equal(viewForPlayer(first.state, 'C').crownCards.A, a.id);
  const b = first.state.hands.B[0];
  const second = dispatch(first.state, { type: 'DESIGNATE_KING', playerId: 'B', cardId: b.id });
  assert.equal(second.state.phase, 'PLAY');
  assert.equal(second.state.currentActor, 'A');
  const tied = dispatch(second.state, { type: 'PLAY', playerId: 'A', cardIds: [a.id] });
  assert.equal(tied.state.lastPlay?.pattern.mainRank, 18);
  const response = dispatch(tied.state, { type: 'PLAY', playerId: 'B', cardIds: [b.id] });
  assert.equal(response.error, 'CANNOT_BEAT_CURRENT_PLAY');
});

test('invalid or out-of-turn crown designation preserves state', () => {
  const state = applyBid({ ...createRun({ seed: 19 }), hexPicks: { A: [crown], B: [], C: [] } }, { type: 'BID', playerId: 'A', score: 3 }).state;
  const wrong = dispatch(state, { type: 'DESIGNATE_KING', playerId: 'B', cardId: state.hands.B[0].id });
  assert.equal(wrong.error, 'WRONG_PLAYER');
  const unowned = dispatch(state, { type: 'DESIGNATE_KING', playerId: 'A', cardId: state.hands.B[0].id });
  assert.equal(unowned.error, 'CARD_NOT_OWNED');
  assert.deepEqual(unowned.state, state);
});

test('next hand clears crown binding and charges while retaining the pick', () => {
  const state = createRun({ seed: 33 });
  const ended: GameState = {
    ...state, phase: 'HAND_END', landlordId: 'A', baseScore: 1,
    hands: { ...state.hands, A: [] }, hexPicks: { A: [crown], B: [], C: [] },
    crownCards: { A: state.hands.A[0].id, B: null, C: null },
    trickMode: 'reverse',
    hexUses: { ...state.hexUses, A: { abandon: 1, sameColor: 1 } },
  };
  const next = startNextHand(settleHand(ended).state).state;
  assert.equal(next.handNumber, 2);
  assert.deepEqual(next.hexPicks.A, [crown]);
  assert.equal(next.crownCards.A, null);
  assert.equal(next.trickMode, 'normal');
  assert.deepEqual(next.hexUses.A, { abandon: 0, sameColor: 0 });
});

test('a designated card in a pair uses its natural rank and loses its crown', () => {
  const threes = createDeck().filter((card) => card.rank === '3').slice(0, 2);
  const initial = createRun({ seed: 51 });
  const state: GameState = {
    ...initial, phase: 'PLAY', landlordId: 'A', currentActor: 'A',
    hands: { ...initial.hands, A: [...threes, createDeck().find((card) => card.rank === 'A')!] },
    hexPicks: { A: [crown], B: [], C: [] },
    crownCards: { A: threes[0].id, B: null, C: null },
  };
  const played = dispatch(state, { type: 'PLAY', playerId: 'A', cardIds: threes.map((card) => card.id) });
  assert.equal(played.error, undefined);
  assert.equal(played.state.lastPlay?.pattern.type, 'PAIR');
  assert.equal(played.state.lastPlay?.pattern.mainRank, 3);
  assert.equal(played.state.crownCards.A, null);
});
