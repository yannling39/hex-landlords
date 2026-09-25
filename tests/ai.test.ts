import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseAiCommand } from '../src/domain/ai.js';
import { createDeck } from '../src/domain/deck.js';
import { createRun } from '../src/domain/setup.js';
import { viewForPlayer } from '../src/domain/player-view.js';
import type { PlayerView } from '../src/domain/player-view.js';
import type { Rank } from '../src/domain/card.js';

const deck = createDeck();
function card(rank: Rank, copy = 0) {
  return deck.filter((item) => item.rank === rank)[copy];
}
function view(handRanks: Rank[], overrides: Partial<PlayerView> = {}): PlayerView {
  const base = viewForPlayer(createRun({ seed: 71 }), 'A');
  return {
    ...base,
    phase: 'PLAY',
    hand: handRanks.map((rank) => card(rank)),
    handCounts: { A: handRanks.length, B: 1, C: 1 },
    currentActor: 'A',
    ...overrides,
  };
}

test('AI plays the lowest beating card, passes if none can beat, and leads instead of passing', () => {
  const hand = [card('3'), card('5'), card('8')];
  const response = chooseAiCommand(view(['3', '5', '8'], {
    hand,
    lastPlay: { playerId: 'B', cards: [card('4')], pattern: { type: 'SINGLE', mainRank: 4, sequenceLength: 1, attachmentMode: 'none', cardCount: 1 } },
  }));
  assert.deepEqual(response, { type: 'PLAY', playerId: 'A', cardIds: [card('5').id] });

  const pass = chooseAiCommand(view(['3'], {
    lastPlay: { playerId: 'B', cards: [card('4')], pattern: { type: 'SINGLE', mainRank: 4, sequenceLength: 1, attachmentMode: 'none', cardCount: 1 } },
  }));
  assert.deepEqual(pass, { type: 'PASS', playerId: 'A' });

  const lead = chooseAiCommand(view(['3']));
  assert.deepEqual(lead, { type: 'PLAY', playerId: 'A', cardIds: [card('3').id] });
});

test('AI preserves a bomb when an ordinary response is available', () => {
  const command = chooseAiCommand(view(['4', '7', '7', '7', '7'], {
    hand: [card('4'), card('7', 0), card('7', 1), card('7', 2), card('7', 3)],
    lastPlay: { playerId: 'B', cards: [card('3')], pattern: { type: 'SINGLE', mainRank: 3, sequenceLength: 1, attachmentMode: 'none', cardCount: 1 } },
  }));
  assert.deepEqual(command, { type: 'PLAY', playerId: 'A', cardIds: [card('4').id] });
});

test('AI bids only a legal ascending score based on its own hand', () => {
  const base = viewForPlayer(createRun({ seed: 90 }), 'A');
  const biddingView = { ...base, hand: [card('2'), card('2', 1), card('small-joker'), card('big-joker')], phase: 'BID' as const };
  const command = chooseAiCommand(biddingView);
  assert.equal(command.type, 'BID');
  if (command.type === 'BID') assert.ok(command.score >= biddingView.bid.highestBid);

  const mustPass = chooseAiCommand({
    ...biddingView,
    bid: { ...biddingView.bid, highestBid: 3 },
  });
  assert.deepEqual(mustPass, { type: 'BID', playerId: 'A', score: 0 });
});
