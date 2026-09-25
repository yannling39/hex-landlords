import assert from 'node:assert/strict';
import test from 'node:test';
import type { Command } from '../src/domain/commands.js';
import type { GameEvent } from '../src/domain/events.js';
import type { GameState, Transition } from '../src/domain/state.js';
import type { Card } from '../src/domain/card.js';

const sampleCard: Card = { id: 'clubs:3', suit: 'clubs', rank: '3' };

const sampleState: GameState = {
  version: 1,
  phase: 'BID',
  players: ['A', 'B', 'C'],
  hands: {
    A: [sampleCard],
    B: [],
    C: [],
  },
  runScores: { A: 0, B: 0, C: 0 },
  handNumber: 1,
  firstBidder: 'A',
  preparedDeals: [],
  dealAttemptIndex: 0,
  bid: {
    currentBidder: 'A',
    highestBid: 0,
    highestBidder: null,
    consecutivePasses: 0,
  },
  bottomCards: [],
  bottomRevealed: false,
  landlordId: null,
  baseScore: 0,
  currentActor: 'A',
  lastPlay: null,
  trickLeaderId: null,
  consecutivePasses: 0,
  multiplier: 1,
  bombsPlayed: 0,
  hexEnabled: false,
};

test('game state survives JSON serialization without runtime-only collections', () => {
  const restored = JSON.parse(JSON.stringify(sampleState)) as GameState;
  assert.deepEqual(restored, sampleState);
  assert.equal(restored.hands.A[0].id, 'clubs:3');
});

test('commands and events retain their discriminants through JSON', () => {
  const command: Command = { type: 'BID', playerId: 'A', score: 1 };
  const event: GameEvent = { type: 'BID_ACCEPTED', playerId: 'A', score: 1 };
  const transition: Transition = { state: sampleState, events: [event] };
  assert.equal(JSON.parse(JSON.stringify(command)).type, 'BID');
  assert.equal(JSON.parse(JSON.stringify(transition)).events[0].type, 'BID_ACCEPTED');
});
