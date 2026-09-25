import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeck } from '../src/domain/deck.js';
import { applyPlay, applyPass } from '../src/domain/play.js';
import { createRun } from '../src/domain/setup.js';
import type { Card } from '../src/domain/card.js';
import type { GameState } from '../src/domain/state.js';

const deck = createDeck();
function card(rank: Card['rank'], copy = 0): Card {
  const matching = deck.filter((item) => item.rank === rank);
  assert.ok(matching[copy]);
  return matching[copy];
}

function playingState(): GameState {
  const base = createRun({ seed: 44 });
  return {
    ...base,
    phase: 'PLAY',
    hands: {
      A: [card('3')],
      B: [card('4')],
      C: [card('5')],
    },
    landlordId: 'A',
    baseScore: 1,
    bottomCards: [],
    bottomRevealed: true,
    currentActor: 'A',
    lastPlay: null,
    trickLeaderId: null,
    consecutivePasses: 0,
    multiplier: 1,
    bombsPlayed: 0,
  };
}

function play(state: GameState, playerId: 'A' | 'B' | 'C', card: Card) {
  return applyPlay(state, { type: 'PLAY', playerId, cardIds: [card.id] });
}

test('lead play removes exact cards and advances to the next player', () => {
  const initial = playingState();
  const transition = play(initial, 'A', card('3'));

  assert.equal(transition.error, undefined);
  assert.equal(transition.state.hands.A.length, 0);
  assert.equal(transition.state.currentActor, 'B');
  assert.equal(transition.state.lastPlay?.playerId, 'A');
  assert.equal(transition.state.trickLeaderId, 'A');
  assert.deepEqual(transition.events.map((event) => event.type), ['CARDS_PLAYED', 'HAND_FINISHED']);
  assert.equal(transition.state.phase, 'HAND_END');
  assert.equal(transition.events[1].type === 'HAND_FINISHED' && transition.events[1].winnerSide, 'LANDLORD');
});

test('following play must beat the current pattern and successful play resets passes', () => {
  const state = {
    ...playingState(),
    hands: { A: [card('3'), card('6')], B: [card('3', 1)], C: [card('5')] },
  };
  const lead = play(state, 'A', card('3')).state;
  const cannotBeat = play(lead, 'B', card('3', 1));
  assert.equal(cannotBeat.error, 'CANNOT_BEAT_CURRENT_PLAY');
  assert.equal(JSON.stringify(cannotBeat.state), JSON.stringify(lead));
  const passed = applyPass(lead, { type: 'PASS', playerId: 'B' });
  const response = play(passed.state, 'C', card('5'));

  assert.equal(response.error, undefined);
  assert.equal(response.state.currentActor, 'A');
  assert.equal(response.state.consecutivePasses, 0);
  assert.equal(response.state.trickLeaderId, 'C');

});

test('out-of-turn, invalid, unowned, and non-beating plays do not mutate state', () => {
  const state = { ...playingState(), hands: { A: [card('3'), card('6')], B: [card('4')], C: [card('5')] } };
  const attempts = [
    applyPlay(state, { type: 'PLAY', playerId: 'B', cardIds: [card('4').id] }),
    applyPlay(state, { type: 'PLAY', playerId: 'A', cardIds: ['missing-card'] }),
    applyPlay(state, { type: 'PLAY', playerId: 'A', cardIds: [card('3').id, card('5').id] }),
  ];
  assert.deepEqual(attempts.map((attempt) => attempt.error), ['WRONG_PLAYER', 'CARD_NOT_OWNED', 'CARD_NOT_OWNED']);
  for (const attempt of attempts) assert.equal(JSON.stringify(attempt.state), JSON.stringify(state));

  const lead = play(state, 'A', card('3')).state;
  const wrongTurn = applyPlay(lead, { type: 'PLAY', playerId: 'C', cardIds: [card('5').id] });
  assert.equal(wrongTurn.error, 'WRONG_PLAYER');
  assert.equal(JSON.stringify(wrongTurn.state), JSON.stringify(lead));
});

test('cannot pass while leading; two opponent passes close the trick and return lead to its winner', () => {
  const state = { ...playingState(), hands: { A: [card('3'), card('6')], B: [card('4')], C: [card('5')] } };
  const cannotPass = applyPass(state, { type: 'PASS', playerId: 'A' });
  assert.equal(cannotPass.error, 'CANNOT_PASS_WHEN_LEADING');
  assert.equal(JSON.stringify(cannotPass.state), JSON.stringify(state));

  const lead = play(state, 'A', card('3')).state;
  const firstPass = applyPass(lead, { type: 'PASS', playerId: 'B' });
  assert.equal(firstPass.state.currentActor, 'C');
  assert.equal(firstPass.state.consecutivePasses, 1);
  const secondPass = applyPass(firstPass.state, { type: 'PASS', playerId: 'C' });
  assert.equal(secondPass.error, undefined);
  assert.equal(secondPass.state.currentActor, 'A');
  assert.equal(secondPass.state.lastPlay, null);
  assert.equal(secondPass.state.trickLeaderId, null);
  assert.equal(secondPass.state.consecutivePasses, 0);
  assert.deepEqual(secondPass.events.map((event) => event.type), ['PLAYER_PASSED', 'TRICK_CLOSED']);
});

test('either farmer ending their hand immediately finishes the hand for farmers', () => {
  const state = {
    ...playingState(),
    hands: { A: [card('3')], B: [card('4')], C: [card('5')] },
    landlordId: 'A' as const,
    currentActor: 'B' as const,
  };
  const transition = play(state, 'B', card('4'));
  assert.equal(transition.state.phase, 'HAND_END');
  assert.deepEqual(transition.events.map((event) => event.type), ['CARDS_PLAYED', 'HAND_FINISHED']);
  assert.equal(transition.events[1].type === 'HAND_FINISHED' && transition.events[1].winnerSide, 'FARMERS');
  assert.equal(transition.events[1].type === 'HAND_FINISHED' && transition.events[1].winnerId, 'B');
});
