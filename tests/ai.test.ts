import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseAiCommand } from '../src/domain/ai.js';
import { createDeck } from '../src/domain/deck.js';
import { createRun } from '../src/domain/setup.js';
import { viewForPlayer } from '../src/domain/player-view.js';
import type { PlayerView } from '../src/domain/player-view.js';
import type { Rank } from '../src/domain/card.js';
import { HEXES } from '../src/domain/hex.js';

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

test('AI designates a card when holding crown before play', () => {
  const current = view(['3', 'A'], { phase: 'KING_DESIGNATE', crownActor: 'A' });
  assert.deepEqual(chooseAiCommand(current), { type: 'DESIGNATE_KING', playerId: 'A', cardId: card('3').id });
});

test('AI uses a legal declared pair when resonance joins two ranks', () => {
  const hex = HEXES.find((item) => item.id === 'resonance')!;
  const hand = [card('3'), card('Q'), card('A')];
  const command = chooseAiCommand(view(['3', 'Q', 'A'], {
    hand,
    hexPicks: { A: [hex], B: [], C: [] },
  }));
  assert.equal(command.type, 'PLAY');
  if (command.type === 'PLAY') assert.equal(command.declaration?.type, 'RESONANCE');
});

test('AI drafts an offered hex and uses abandon when no response exists', () => {
  const hex = HEXES.find((item) => item.id === 'abandon')!;
  const draft = view(['3'], { phase: 'HEX_DRAFT', hexDraft: { currentPlayer: 'A', candidates: [hex] } });
  assert.deepEqual(chooseAiCommand(draft), { type: 'SELECT_HEX', playerId: 'A', candidateId: hex.id });
  const active = view(['3', '4'], {
    hand: [card('3'), card('4')],
    hexPicks: { A: [hex], B: [], C: [] },
    lastPlay: { playerId: 'B', cards: [card('big-joker')], pattern: { type: 'SINGLE', mainRank: 17, sequenceLength: 1, attachmentMode: 'none', cardCount: 1 } },
  });
  assert.deepEqual(chooseAiCommand(active), { type: 'PASS', playerId: 'A', discardCardId: card('3').id });
});

test('AI reverses a low lead and lets its farmer teammate keep the trick', () => {
  const reverse = HEXES.find((hex) => hex.id === 'reverse_flow')!;
  const lead = chooseAiCommand(view(['3', 'A'], { hexPicks: { A: [reverse], B: [], C: [] } }));
  assert.equal(lead.type, 'PLAY');
  if (lead.type === 'PLAY') assert.equal(lead.reverse, true);
  const teammate = chooseAiCommand(view(['5', '8'], {
    landlordId: 'C',
    lastPlay: { playerId: 'B', cards: [card('4')], pattern: { type: 'SINGLE', mainRank: 4, sequenceLength: 1, attachmentMode: 'none', cardCount: 1 } },
  }));
  assert.deepEqual(teammate, { type: 'PASS', playerId: 'A' });
});

test('AI saves its crown single when a natural single can beat', () => {
  const crown = HEXES.find((hex) => hex.id === 'crown_me')!;
  const command = chooseAiCommand(view(['3', '5'], {
    hexPicks: { A: [crown], B: [], C: [] }, crownCards: { A: card('3').id, B: null, C: null },
    lastPlay: { playerId: 'B', cards: [card('4')], pattern: { type: 'SINGLE', mainRank: 4, sequenceLength: 1, attachmentMode: 'none', cardCount: 1 } },
  }));
  assert.deepEqual(command, { type: 'PLAY', playerId: 'A', cardIds: [card('5').id] });
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
