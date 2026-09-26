import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { createRun } from '../src/domain/setup.js';
import { classifyCards } from '../src/domain/pattern.js';
import { LocalGameClient, type GameSnapshot } from '../src/web/game-client.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Element: { value: dom.window.Element, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  getComputedStyle: { value: dom.window.getComputedStyle.bind(dom.window), configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, writable: true, configurable: true },
});

const { cleanup, fireEvent, render, screen } = await import('@testing-library/react');
const { default: GameTable } = await import('../src/web/components/GameTable.js');
const { default: PlayerHand } = await import('../src/web/components/PlayerHand.js');

afterEach(() => cleanup());

function renderTable(snapshot: GameSnapshot) {
  return render(React.createElement(GameTable, {
    snapshot,
    busy: false,
    selectedCardIds: [],
    onToggleCard: () => {},
    onBid: () => {},
    onPlay: () => {},
    onPass: () => {},
    onContinue: () => {},
    onRestart: () => {},
  }));
}

test('table shows all seats, A hand count and turn status without exposing private deal data', async () => {
  const client = new LocalGameClient(84);
  const snapshot = await client.getSnapshot();
  const privateState = createRun({ seed: 84 });
  renderTable(snapshot);

  assert.ok(screen.getByRole('heading', { name: '斗地主' }));
  assert.ok(screen.getByRole('group', { name: '玩家 A' }));
  assert.ok(screen.getByRole('group', { name: '玩家 B' }));
  assert.ok(screen.getByRole('group', { name: '玩家 C' }));
  assert.equal(screen.getByRole('group', { name: '玩家 A 手牌' }).children.length, 17);
  assert.equal(screen.getAllByText('17 张').length, 4);
  assert.ok(screen.getByText('等待你叫分'));
  assert.ok(screen.getByText('底牌尚未公开'));
  assert.equal(document.body.textContent?.includes('preparedDeals'), false);
  for (const card of [...privateState.hands.B, ...privateState.hands.C]) {
    assert.equal(document.body.textContent?.includes(card.id), false);
  }
});

test('table reveals the three public bottom cards and renders the public bid event', async () => {
  const client = new LocalGameClient(84);
  const snapshot = await client.sendCommand({ type: 'BID', playerId: 'A', score: 3 });
  renderTable(snapshot);

  assert.equal(screen.getByRole('group', { name: '公开底牌' }).children.length, 3);
  assert.ok(screen.getByText('玩家 A 叫 3 分'));
  assert.ok(screen.getByText('地主：玩家 A'));
  assert.equal(document.body.textContent?.includes('preparedDeals'), false);
});

test('bidding controls emit only legal ascending bids on A turn and lock while busy', async () => {
  const client = new LocalGameClient(84);
  const snapshot = await client.getSnapshot();
  const onBid = (score: number) => { bids.push(score); };
  const bids: number[] = [];
  render(React.createElement(GameTable, {
    snapshot,
    busy: false,
    selectedCardIds: [],
    onToggleCard: () => {}, onBid, onPlay: () => {}, onPass: () => {}, onContinue: () => {}, onRestart: () => {},
  }));

  fireEvent.click(screen.getByRole('button', { name: '叫 3 分' }));
  assert.deepEqual(bids, [3]);

  cleanup();
  render(React.createElement(GameTable, {
    snapshot: { ...snapshot, view: { ...snapshot.view, bid: { ...snapshot.view.bid, highestBid: 2 } } },
    busy: true,
    selectedCardIds: [],
    onToggleCard: () => {}, onBid, onPlay: () => {}, onPass: () => {}, onContinue: () => {}, onRestart: () => {},
  }));
  assert.equal(screen.queryByRole('button', { name: '叫 1 分' }), null);
  assert.equal(screen.getByRole('button', { name: '不叫' }).hasAttribute('disabled'), true);

  cleanup();
  render(React.createElement(GameTable, {
    snapshot: { ...snapshot, view: { ...snapshot.view, bid: { ...snapshot.view.bid, currentBidder: 'B' } } },
    busy: false,
    selectedCardIds: [],
    onToggleCard: () => {}, onBid, onPlay: () => {}, onPass: () => {}, onContinue: () => {}, onRestart: () => {},
  }));
  fireEvent.click(screen.getByRole('button', { name: '叫 3 分' }));
  assert.deepEqual(bids, [3]);
});

test('hand cards toggle selection; empty plays are disabled and follow turns expose Pass', async () => {
  const client = new LocalGameClient(84);
  const snapshot = await client.getSnapshot();
  const toggled: string[] = [];
  const onToggleCard = (cardId: string) => { toggled.push(cardId); };
  render(React.createElement(GameTable, {
    snapshot: { ...snapshot, view: { ...snapshot.view, phase: 'PLAY', currentActor: 'A', landlordId: 'A' } },
    busy: false,
    selectedCardIds: [],
    onToggleCard,
    onBid: () => {}, onPlay: () => {}, onPass: () => {}, onContinue: () => {}, onRestart: () => {},
  }));

  const card = screen.getAllByRole('button', { name: /方块|梅花|红桃|黑桃/ })[0]!;
  fireEvent.click(card);
  assert.equal(toggled.length, 1);
  assert.equal(screen.getByRole('button', { name: '出牌' }).hasAttribute('disabled'), true);
  assert.equal(screen.queryByRole('button', { name: '不出' }), null);

  const leadCard = snapshot.view.hand[0]!;
  cleanup();
  render(React.createElement(GameTable, {
    snapshot: {
      ...snapshot,
      view: {
        ...snapshot.view,
        phase: 'PLAY',
        currentActor: 'A',
        landlordId: 'A',
        lastPlay: { playerId: 'B', cards: [leadCard], pattern: classifyCards([leadCard])! },
      },
    },
    busy: false,
    selectedCardIds: [],
    onToggleCard,
    onBid: () => {}, onPlay: () => {}, onPass: () => {}, onContinue: () => {}, onRestart: () => {},
  }));
  assert.ok(screen.getByRole('button', { name: '不出' }));
});

test('selected card can be played and follow/pass controls remain locked while busy', async () => {
  const client = new LocalGameClient(84);
  const snapshot = await client.getSnapshot();
  const card = snapshot.view.hand[0]!;
  const toggled: string[] = [];
  let plays = 0;
  let passes = 0;
  const playView = {
    ...snapshot.view,
    phase: 'PLAY' as const,
    currentActor: 'A' as const,
    landlordId: 'A' as const,
    lastPlay: { playerId: 'B' as const, cards: [card], pattern: classifyCards([card])! },
  };
  const props = {
    snapshot: { ...snapshot, view: playView },
    busy: false,
    selectedCardIds: [card.id],
    onToggleCard: (cardId: string) => { toggled.push(cardId); },
    onBid: () => {}, onPlay: () => { plays += 1; }, onPass: () => { passes += 1; }, onContinue: () => {}, onRestart: () => {},
  };
  const view = render(React.createElement(GameTable, props));

  assert.equal(screen.getByRole('button', { name: /已选择/ }).getAttribute('aria-pressed'), 'true');
  fireEvent.click(screen.getByRole('button', { name: '出牌' }));
  fireEvent.click(screen.getByRole('button', { name: '不出' }));
  assert.equal(plays, 1);
  assert.equal(passes, 1);

  view.rerender(React.createElement(GameTable, { ...props, busy: true }));
  fireEvent.click(screen.getByRole('button', { name: /已选择/ }));
  fireEvent.click(screen.getByRole('button', { name: '出牌' }));
  fireEvent.click(screen.getByRole('button', { name: '不出' }));
  assert.equal(toggled.length, 0);
  assert.equal(plays, 1);
  assert.equal(passes, 1);
});

test('hand settlement shows score changes and Continue action; Run end shows final tie and Restart', async () => {
  const client = new LocalGameClient(84);
  const initial = await client.getSnapshot();
  let continued = 0;
  let restarted = 0;
  const baseProps = {
    busy: false,
    selectedCardIds: [],
    onToggleCard: () => {}, onBid: () => {}, onPlay: () => {}, onPass: () => {},
    onContinue: () => { continued += 1; }, onRestart: () => { restarted += 1; },
  };
  render(React.createElement(GameTable, {
    ...baseProps,
    snapshot: {
      ...initial,
      awaitingContinue: true,
      view: { ...initial.view, phase: 'NEXT_HAND' },
      publicEvents: [{
        type: 'HAND_SETTLED', handNumber: 1, winnerSide: 'LANDLORD', winnerId: 'A',
        scoreChanges: { A: 6, B: -3, C: -3 }, multiplier: 2,
      }],
    },
  }));
  assert.ok(screen.getByText('本手地主方胜'));
  assert.ok(screen.getByText('玩家 A：+6 分'));
  assert.ok(screen.getByRole('button', { name: '重开本局' }));
  fireEvent.click(screen.getByRole('button', { name: '继续下一手' }));
  assert.equal(continued, 1);

  cleanup();
  render(React.createElement(GameTable, {
    ...baseProps,
    snapshot: {
      ...initial,
      view: { ...initial.view, phase: 'RUN_END', runScores: { A: 3, B: 3, C: -6 } },
      publicEvents: [{ type: 'RUN_FINISHED', scores: { A: 3, B: 3, C: -6 }, winnerId: null }],
    },
  }));
  assert.ok(screen.getByText('三手 Run 平局'));
  assert.ok(screen.getByText('玩家 B：+3 分'));
  fireEvent.click(screen.getByRole('button', { name: '再开一局' }));
  assert.equal(restarted, 1);
});

test('each seat shows its latest play or pass', async () => {
  const client = new LocalGameClient(84, 0);
  const snapshot = await client.getSnapshot();
  const card = snapshot.view.hand[0];
  renderTable({
    ...snapshot,
    publicEvents: [
      { type: 'CARDS_PLAYED', playerId: 'A', cards: [card], pattern: classifyCards([card])! },
      { type: 'CARDS_PLAYED', playerId: 'B', cards: [card], pattern: classifyCards([card])! },
      { type: 'PLAYER_PASSED', playerId: 'C' },
    ],
  });
  assert.equal(screen.getByRole('group', { name: '玩家 A 最近动作' }).querySelectorAll('.playing-card').length, 1);
  assert.equal(screen.getByRole('group', { name: '玩家 B 最近动作' }).querySelectorAll('.playing-card').length, 1);
  assert.equal(screen.getByRole('group', { name: '玩家 C 最近动作' }).textContent, '不出');
});

test('pointer sweep sets the same selection state across a card range', async () => {
  const cards = (await new LocalGameClient(84, 0).getSnapshot()).view.hand.slice(0, 3);
  const selected: string[] = [];
  const view = render(React.createElement(PlayerHand, {
    cards, selectedCardIds: selected, disabled: false,
    onToggleCard: () => {},
    onSetCardSelection: (id: string, value: boolean) => {
      if (value && !selected.includes(id)) selected.push(id);
    },
  }));
  const buttons = [...view.container.querySelectorAll<HTMLButtonElement>('.hand-card')];
  fireEvent.pointerDown(buttons[0], { pointerId: 1, pointerType: 'touch' });
  fireEvent.pointerEnter(buttons[2], { pointerId: 1, pointerType: 'touch' });
  assert.deepEqual(new Set(selected), new Set(cards.map((card) => card.id)));
});
