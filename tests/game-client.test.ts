import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseAiCommand } from '../src/domain/ai.js';
import { createRun } from '../src/domain/setup.js';
import { LocalGameClient } from '../src/web/game-client.js';

test('initial snapshot contains A hand but no opponent cards or server-only deal queue', async () => {
  const client = new LocalGameClient(84);
  const snapshot = await client.getSnapshot();
  const privateState = createRun({ seed: 84 });
  const visible = JSON.stringify(snapshot);

  assert.equal(snapshot.view.playerId, 'A');
  assert.equal(snapshot.view.phase, 'BID');
  assert.equal(snapshot.view.hand.length, 17);
  assert.equal(snapshot.publicEvents.length, 0);
  assert.equal(snapshot.view.bottomCards, null);
  assert.equal(snapshot.awaitingContinue, false);
  assert.equal(visible.includes('preparedDeals'), false);
  for (const card of [...privateState.hands.B, ...privateState.hands.C]) {
    assert.equal(visible.includes(card.id), false);
  }
});

test('accepted A bid advances AI turns and returns at an A decision point', async () => {
  const client = new LocalGameClient(56);
  const snapshot = await client.sendCommand({ type: 'BID', playerId: 'A', score: 0 });

  assert.equal(snapshot.notice, null);
  assert.ok(snapshot.publicEvents.some((event) => event.type === 'BID_ACCEPTED' && event.playerId === 'A'));
  assert.ok(snapshot.view.phase === 'BID' && snapshot.view.bid.currentBidder === 'A'
    || snapshot.view.phase === 'PLAY' && snapshot.view.currentActor === 'A'
    || snapshot.awaitingContinue);
});

test('rejected command returns an unchanged view and public event history with a readable notice', async () => {
  const client = new LocalGameClient(2026);
  const before = await client.getSnapshot();
  const after = await client.sendCommand({ type: 'PLAY', playerId: 'A', cardIds: [] });

  assert.deepEqual(after.view, before.view);
  assert.deepEqual(after.publicEvents, before.publicEvents);
  assert.equal(after.notice, '当前阶段不能执行该操作');
});

test('three-hand Run pauses for each settlement and restart restores the fixed initial deal', async () => {
  const client = new LocalGameClient(2026);
  const initial = await client.getSnapshot();
  let snapshot = initial;
  let commands = 0;

  while (snapshot.view.phase !== 'RUN_END') {
    if (snapshot.awaitingContinue) {
      const handSettled = snapshot.publicEvents.filter((event) => event.type === 'HAND_SETTLED').length;
      assert.ok(handSettled <= 3);
      if (handSettled < 3) snapshot = await client.continueRun();
      else break;
      continue;
    }
    const command = chooseAiCommand(snapshot.view);
    snapshot = await client.sendCommand(command);
    commands += 1;
    assert.ok(commands < 2_000, 'local game must make progress');
  }

  assert.equal(snapshot.view.phase, 'RUN_END');
  assert.equal(snapshot.awaitingContinue, false);
  assert.equal(snapshot.publicEvents.filter((event) => event.type === 'HAND_SETTLED').length, 3);
  assert.equal(snapshot.publicEvents.at(-1)?.type, 'RUN_FINISHED');

  const restarted = await client.restart();
  assert.deepEqual(restarted.view, initial.view);
  assert.deepEqual(restarted.publicEvents, []);
  assert.equal(restarted.notice, null);
});

test('client refuses commands submitted for another player without advancing state', async () => {
  const client = new LocalGameClient(101);
  const before = await client.getSnapshot();
  const after = await client.sendCommand({ type: 'BID', playerId: 'B', score: 1 });

  assert.deepEqual(after.view, before.view);
  assert.deepEqual(after.publicEvents, before.publicEvents);
  assert.equal(after.notice, '只能提交玩家 A 的操作');
});

test('mutating a returned view cannot alter the internal game state', async () => {
  const client = new LocalGameClient(205);
  const snapshot = await client.getSnapshot();
  const originalRank = snapshot.view.hand[0].rank;
  snapshot.view.hand[0].rank = originalRank === '3' ? '4' : '3';

  const next = await client.getSnapshot();
  assert.equal(next.view.hand[0].rank, originalRank);
});
