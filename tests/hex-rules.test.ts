import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeck } from '../src/domain/deck.js';
import { dispatch } from '../src/domain/game.js';
import { HEXES } from '../src/domain/hex.js';
import { createRun } from '../src/domain/setup.js';
import type { Card, Rank, Suit } from '../src/domain/card.js';
import type { PlayerId } from '../src/domain/commands.js';
import type { GameState } from '../src/domain/state.js';

const deck = createDeck();
function card(rank: Rank, suit?: Suit): Card {
  const found = deck.find((item) => item.rank === rank && (!suit || item.suit === suit));
  assert.ok(found);
  return found;
}
function playState(owner: PlayerId, hexId: string, hands: Partial<GameState['hands']>): GameState {
  const state = createRun({ seed: 7, hexEnabled: true });
  const hex = HEXES.find((item) => item.id === hexId);
  assert.ok(hex);
  return {
    ...state, phase: 'PLAY', landlordId: 'A', currentActor: owner,
    hands: { A: hands.A ?? [card('A')], B: hands.B ?? [card('K')], C: hands.C ?? [card('Q')] },
    hexPicks: { A: owner === 'A' ? [hex] : [], B: owner === 'B' ? [hex] : [], C: owner === 'C' ? [hex] : [] },
  };
}

test('resonance changes one declared physical card while a nonholder cannot use it', () => {
  const cards = [card('3'), card('Q')];
  const state = playState('A', 'resonance', { A: [...cards, card('A')] });
  const command = { type: 'PLAY' as const, playerId: 'A' as const, cardIds: cards.map((item) => item.id), declaration: { type: 'RESONANCE' as const, cardId: cards[0].id, asRank: 'Q' as const } };
  const accepted = dispatch(state, command);
  assert.equal(accepted.error, undefined);
  assert.equal(accepted.state.lastPlay?.pattern.type, 'PAIR');
  assert.equal(accepted.state.lastPlay?.pattern.mainRank, 12);
  const notHeld = dispatch({ ...state, hexPicks: { A: [], B: [], C: [] } }, command);
  assert.equal(notHeld.error, 'INVALID_PLAY');
  assert.deepEqual(notHeld.state.hands.A, state.hands.A);
});

test('broken straight creates a five-card straight that an ordinary higher straight beats', () => {
  const broken = [card('3'), card('4'), card('5'), card('7'), card('8')];
  const state = playState('A', 'broken_straight', { A: [...broken, card('A')], B: [card('5', 'spades'), card('6', 'spades'), card('7', 'spades'), card('8', 'spades'), card('9', 'spades')] });
  const played = dispatch(state, { type: 'PLAY', playerId: 'A', cardIds: broken.map((item) => item.id), declaration: { type: 'BROKEN_STRAIGHT' } });
  assert.equal(played.error, undefined);
  assert.equal(played.state.lastPlay?.pattern.mainRank, 8);
  const response = dispatch({ ...played.state, currentActor: 'B' }, { type: 'PLAY', playerId: 'B', cardIds: played.state.hands.B.map((item) => item.id) });
  assert.equal(response.error, undefined);
});

test('same color spends a charge only for an accepted five-card play', () => {
  const cards = [card('3', 'hearts'), card('3', 'diamonds'), card('5', 'hearts'), card('7', 'diamonds'), card('9', 'hearts')];
  const state = playState('A', 'same_color', { A: [...cards, card('A')] });
  const command = { type: 'PLAY' as const, playerId: 'A' as const, cardIds: cards.map((item) => item.id), declaration: { type: 'SAME_COLOR' as const } };
  const accepted = dispatch(state, command);
  assert.equal(accepted.error, undefined);
  assert.equal(accepted.state.lastPlay?.pattern.type, 'STRAIGHT');
  assert.equal(accepted.state.hexUses.A.sameColor, 1);
  const rejected = dispatch({ ...state, lastPlay: { playerId: 'B', cards: [card('A')], pattern: { type: 'SINGLE', mainRank: 14, sequenceLength: 1, attachmentMode: 'none', cardCount: 1 } } }, command);
  assert.equal(rejected.error, 'CANNOT_BEAT_CURRENT_PLAY');
  assert.equal(rejected.state.hexUses.A.sameColor, 0);
});

test('reverse compares ordinary single ranks backward and clears on trick close', () => {
  const state = playState('A', 'reverse_flow', { A: [card('8'), card('A')], B: [card('7'), card('K')], C: [card('6'), card('Q')] });
  const first = dispatch(state, { type: 'PLAY', playerId: 'A', cardIds: [card('8').id], reverse: true });
  assert.equal(first.error, undefined);
  const second = dispatch(first.state, { type: 'PLAY', playerId: 'B', cardIds: [card('7').id] });
  assert.equal(second.error, undefined);
  const passC = dispatch(second.state, { type: 'PASS', playerId: 'C' });
  const passA = dispatch(passC.state, { type: 'PASS', playerId: 'A' });
  assert.equal(passA.state.trickMode, 'normal');
  assert.equal(passA.state.currentActor, 'B');
});

test('abandon discards one public card with pass but cannot discard the final card', () => {
  const state = playState('B', 'abandon', { B: [card('4'), card('5')] });
  const active = { ...state, lastPlay: { playerId: 'A' as const, cards: [card('3')], pattern: { type: 'SINGLE' as const, mainRank: 3, sequenceLength: 1, attachmentMode: 'none' as const, cardCount: 1 } }, trickLeaderId: 'A' as const };
  const used = dispatch(active, { type: 'PASS', playerId: 'B', discardCardId: card('4').id });
  assert.equal(used.error, undefined);
  assert.deepEqual(used.state.hands.B.map((item) => item.rank), ['5']);
  assert.equal(used.state.hexUses.B.abandon, 1);
  assert.equal(used.state.discardedCards.length, 1);
  const denied = dispatch({ ...active, hands: { ...active.hands, B: [card('4')] } }, { type: 'PASS', playerId: 'B', discardCardId: card('4').id });
  assert.equal(denied.error, 'INVALID_PLAY');
});

test('two designated crown singles tie; rocket can still beat a crown single', () => {
  const crown = HEXES.find((item) => item.id === 'crown_me')!;
  const state = playState('A', 'crown_me', { A: [card('3'), card('A')], B: [card('4'), card('K')], C: [card('small-joker'), card('big-joker')] });
  state.hexPicks.B = [crown];
  state.crownCards = { A: card('3').id, B: card('4').id, C: null };
  const first = dispatch(state, { type: 'PLAY', playerId: 'A', cardIds: [card('3').id] });
  assert.equal(first.state.lastPlay?.pattern.mainRank, 18);
  const tied = dispatch(first.state, { type: 'PLAY', playerId: 'B', cardIds: [card('4').id] });
  assert.equal(tied.error, 'CANNOT_BEAT_CURRENT_PLAY');
  const rocket = dispatch({ ...first.state, currentActor: 'C' }, { type: 'PLAY', playerId: 'C', cardIds: [card('small-joker').id, card('big-joker').id] });
  assert.equal(rocket.error, undefined);
});

test('reverse leaves 2 and jokers above ordinary cards', () => {
  const state = playState('A', 'reverse_flow', { A: [card('8'), card('A')], B: [card('2'), card('K')] });
  const first = dispatch(state, { type: 'PLAY', playerId: 'A', cardIds: [card('8').id], reverse: true });
  const second = dispatch(first.state, { type: 'PLAY', playerId: 'B', cardIds: [card('2').id] });
  assert.equal(second.error, undefined);
});

test('same color cannot be used twice in one hand', () => {
  const cards = [card('3', 'hearts'), card('4', 'hearts'), card('5', 'hearts'), card('6', 'hearts'), card('7', 'hearts')];
  const state = playState('A', 'same_color', { A: [...cards, card('A')] });
  state.hexUses.A.sameColor = 1;
  const denied = dispatch(state, { type: 'PLAY', playerId: 'A', cardIds: cards.map((item) => item.id), declaration: { type: 'SAME_COLOR' } });
  assert.equal(denied.error, 'INVALID_PLAY');
  assert.equal(denied.state.hexUses.A.sameColor, 1);
});
