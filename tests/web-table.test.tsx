import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { createRun } from '../src/domain/setup.js';
import { createDeck } from '../src/domain/deck.js';
import { classifyCards } from '../src/domain/pattern.js';
import { HEXES } from '../src/domain/hex.js';
import type { PlayDeclaration } from '../src/domain/commands.js';
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
    lastPlay: { playerId: 'B' as const, cards: [createDeck().find((item) => item.rank === '3')!], pattern: classifyCards([createDeck().find((item) => item.rank === '3')!])! },
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
  assert.ok(screen.getByText('六手 Run 平局'));
  assert.ok(screen.getByText('玩家 B：+3 分'));
  fireEvent.click(screen.getByRole('button', { name: '再开一局' }));
  assert.equal(restarted, 1);
});

test('reverse trick is visible and only a beating selection enables play', async () => {
  const snapshot = await new LocalGameClient(84).getSnapshot();
  const deck = createDeck();
  const three = deck.find((card) => card.rank === '3')!;
  const five = deck.find((card) => card.rank === '5')!;
  const two = deck.find((card) => card.rank === '2')!;
  const lastPlay = { playerId: 'B' as const, cards: [three], pattern: classifyCards([three])! };
  const event = { type: 'CARDS_PLAYED' as const, playerId: 'B' as const, cards: [three], pattern: lastPlay.pattern, reverse: true };
  let plays = 0;
  const props = {
    snapshot: { ...snapshot, view: { ...snapshot.view, phase: 'PLAY' as const, currentActor: 'A' as const, hand: [five, two], lastPlay, trickMode: 'reverse' as const }, publicEvents: [event] },
    busy: false, selectedCardIds: [five.id], onToggleCard: () => {}, onBid: () => {},
    onPlay: () => { plays += 1; }, onPass: () => {}, onContinue: () => {}, onRestart: () => {},
  };
  const table = render(React.createElement(GameTable, props));
  assert.ok(screen.getByText(/逆流生效/));
  assert.ok(screen.getByText(/玩家 B 发动逆流/));
  assert.equal(screen.getByRole('button', { name: '出牌' }).hasAttribute('disabled'), true);
  fireEvent.click(screen.getByRole('button', { name: '出牌' }));
  assert.equal(plays, 0);

  table.rerender(React.createElement(GameTable, { ...props, selectedCardIds: [two.id] }));
  assert.equal(screen.getByRole('button', { name: '出牌' }).hasAttribute('disabled'), false);
  table.rerender(React.createElement(GameTable, {
    ...props, snapshot: { ...props.snapshot, view: { ...props.snapshot.view, trickMode: 'normal' as const }, publicEvents: [] },
  }));
  assert.equal(screen.queryByText(/逆流生效/), null);
  assert.equal(screen.getByRole('button', { name: '出牌' }).hasAttribute('disabled'), false);
});

test('reverse holder can choose activation for a single lead, and changing selection resets it', async () => {
  const snapshot = await new LocalGameClient(84).getSnapshot();
  const [three, four] = createDeck().filter((card) => card.suit === 'clubs').slice(0, 2);
  const reverse = HEXES.find((hex) => hex.id === 'reverse_flow')!;
  const plays: boolean[] = [];
  const props = {
    snapshot: { ...snapshot, view: { ...snapshot.view, phase: 'PLAY' as const, currentActor: 'A' as const,
      hand: [three, four], hexPicks: { ...snapshot.view.hexPicks, A: [reverse] } } },
    busy: false, selectedCardIds: [three.id], onToggleCard: () => {}, onBid: () => {},
    onPlay: (activated: boolean) => { plays.push(activated); }, onPass: () => {}, onContinue: () => {}, onRestart: () => {},
  };
  const table = render(React.createElement(GameTable, props));
  const toggle = screen.getByRole('checkbox', { name: '发动逆流' }) as HTMLInputElement;
  assert.equal(toggle.disabled, false);
  fireEvent.click(toggle);
  assert.equal(toggle.checked, true);

  table.rerender(React.createElement(GameTable, { ...props, selectedCardIds: [four.id] }));
  assert.equal((screen.getByRole('checkbox', { name: '发动逆流' }) as HTMLInputElement).checked, false);
  fireEvent.click(screen.getByRole('checkbox', { name: '发动逆流' }));
  fireEvent.click(screen.getByRole('button', { name: '出牌' }));
  assert.deepEqual(plays, [true]);

  table.rerender(React.createElement(GameTable, { ...props, selectedCardIds: [three.id, four.id] }));
  assert.equal(screen.getByRole('checkbox', { name: '发动逆流' }).hasAttribute('disabled'), true);
});

test('reverse activation is unavailable when following or without the hex', async () => {
  const snapshot = await new LocalGameClient(84).getSnapshot();
  const card = snapshot.view.hand[0]!;
  const reverse = HEXES.find((hex) => hex.id === 'reverse_flow')!;
  const view = { ...snapshot.view, phase: 'PLAY' as const, currentActor: 'A' as const,
    lastPlay: { playerId: 'B' as const, cards: [card], pattern: classifyCards([card])! },
    hexPicks: { ...snapshot.view.hexPicks, A: [reverse] } };
  const props = { snapshot: { ...snapshot, view }, busy: false, selectedCardIds: [card.id],
    onToggleCard: () => {}, onBid: () => {}, onPlay: () => {}, onPass: () => {}, onContinue: () => {}, onRestart: () => {} };
  const table = render(React.createElement(GameTable, props));
  assert.equal(screen.queryByRole('checkbox', { name: '发动逆流' }), null);

  table.rerender(React.createElement(GameTable, { ...props,
    snapshot: { ...snapshot, view: { ...view, lastPlay: null, hexPicks: { ...view.hexPicks, A: [] } } } }));
  assert.equal(screen.queryByRole('checkbox', { name: '发动逆流' }), null);
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

test('crown designation uses one selected physical card', async () => {
  const snapshot = await new LocalGameClient(84).getSnapshot();
  const card = snapshot.view.hand[0];
  const chosen: string[] = [];
  render(React.createElement(GameTable, {
    snapshot: { ...snapshot, view: { ...snapshot.view, phase: 'KING_DESIGNATE', crownActor: 'A' } },
    busy: false, selectedCardIds: [card.id], onToggleCard: () => {},
    onBid: () => {}, onPlay: () => {}, onPass: () => {}, onDesignateKing: (id: string) => { chosen.push(id); },
    onContinue: () => {}, onRestart: () => {},
  }));
  fireEvent.click(screen.getByRole('button', { name: '指定尊王牌' }));
  assert.deepEqual(chosen, [card.id]);
});

test('resonance selection submits its physical card and target rank', async () => {
  const initial = await new LocalGameClient(84).getSnapshot();
  const deck = createDeck();
  const three = deck.find((card) => card.rank === '3')!;
  const queen = deck.find((card) => card.rank === 'Q')!;
  const calls: Array<{ declaration?: PlayDeclaration }> = [];
  render(React.createElement(GameTable, {
    snapshot: { ...initial, view: { ...initial.view, phase: 'PLAY', currentActor: 'A',
      hand: [three, queen], hexPicks: { ...initial.view.hexPicks, A: [HEXES[0]] } } },
    busy: false, selectedCardIds: [three.id, queen.id], onToggleCard: () => {},
    onBid: () => {}, onPlay: (_reverse: boolean, declaration?: PlayDeclaration) => { calls.push({ declaration }); },
    onPass: () => {}, onContinue: () => {}, onRestart: () => {},
  }));
  assert.equal(screen.getByRole('button', { name: '出牌' }).hasAttribute('disabled'), true);
  fireEvent.change(screen.getByRole('combobox', { name: '出牌方式' }), { target: { value: 'RESONANCE' } });
  fireEvent.change(screen.getByRole('combobox', { name: '共鸣目标点数' }), { target: { value: 'Q' } });
  assert.equal(screen.getByRole('button', { name: '出牌' }).hasAttribute('disabled'), false);
  fireEvent.click(screen.getByRole('button', { name: '出牌' }));
  assert.deepEqual(calls, [{ declaration: { type: 'RESONANCE', cardId: three.id, asRank: 'Q' } }]);
});

test('broken straight and same color choices submit explicit declarations', async () => {
  const initial = await new LocalGameClient(84).getSnapshot();
  const deck = createDeck();
  const broken = ['3', '4', '5', '7', '8'].map((rank) => deck.find((card) => card.rank === rank)!);
  const sameColor = [
    deck.find((card) => card.rank === '3' && card.suit === 'hearts')!,
    deck.find((card) => card.rank === '3' && card.suit === 'diamonds')!,
    ...['5', '7', '9'].map((rank) => deck.find((card) => card.rank === rank && card.suit === 'hearts')!),
  ];
  const declarations: Array<PlayDeclaration | undefined> = [];
  const props = {
    busy: false, onToggleCard: () => {}, onBid: () => {}, onPass: () => {},
    onPlay: (_reverse: boolean, declaration?: PlayDeclaration) => { declarations.push(declaration); },
    onContinue: () => {}, onRestart: () => {},
  };
  const table = render(React.createElement(GameTable, {
    ...props, selectedCardIds: broken.map((card) => card.id),
    snapshot: { ...initial, view: { ...initial.view, phase: 'PLAY', currentActor: 'A', hand: broken,
      hexPicks: { ...initial.view.hexPicks, A: [HEXES[1]] } } },
  }));
  fireEvent.change(screen.getByRole('combobox', { name: '出牌方式' }), { target: { value: 'BROKEN_STRAIGHT' } });
  assert.equal(screen.getByRole('button', { name: '出牌' }).hasAttribute('disabled'), false);
  fireEvent.click(screen.getByRole('button', { name: '出牌' }));
  assert.deepEqual(declarations, [{ type: 'BROKEN_STRAIGHT' }]);

  table.rerender(React.createElement(GameTable, {
    ...props, selectedCardIds: sameColor.map((card) => card.id),
    snapshot: { ...initial, view: { ...initial.view, phase: 'PLAY', currentActor: 'A', hand: sameColor,
      hexPicks: { ...initial.view.hexPicks, A: [HEXES[4]] } } },
  }));
  fireEvent.change(screen.getByRole('combobox', { name: '出牌方式' }), { target: { value: 'SAME_COLOR' } });
  assert.equal(screen.getByRole('button', { name: '出牌' }).hasAttribute('disabled'), false);
  fireEvent.click(screen.getByRole('button', { name: '出牌' }));
  assert.deepEqual(declarations, [{ type: 'BROKEN_STRAIGHT' }, { type: 'SAME_COLOR' }]);
});

test('abandon passes with the selected physical card only when charge remains', async () => {
  const initial = await new LocalGameClient(84).getSnapshot();
  const [three, four] = createDeck().slice(0, 2);
  const discards: Array<string | undefined> = [];
  const view = { ...initial.view, phase: 'PLAY' as const, currentActor: 'A' as const,
    hand: [three, four], lastPlay: { playerId: 'B' as const, cards: [three], pattern: classifyCards([three])! },
    hexPicks: { ...initial.view.hexPicks, A: [HEXES[2]] } };
  const props = { snapshot: { ...initial, view }, busy: false, selectedCardIds: [four.id],
    onToggleCard: () => {}, onBid: () => {}, onPlay: () => {},
    onPass: (id?: string) => { discards.push(id); }, onContinue: () => {}, onRestart: () => {} };
  const table = render(React.createElement(GameTable, props));
  fireEvent.click(screen.getByRole('button', { name: '弃守' }));
  assert.deepEqual(discards, [four.id]);
  table.rerender(React.createElement(GameTable, { ...props,
    snapshot: { ...props.snapshot, view: { ...view, hexUses: { ...view.hexUses, A: { ...view.hexUses.A, abandon: 1 } } } } }));
  assert.equal(screen.queryByRole('button', { name: '弃守' }), null);
});
