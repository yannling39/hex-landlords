import { useEffect, useRef, useState } from 'react';
import type { CardId } from '../domain/card.js';
import type { BidScore, Command } from '../domain/commands.js';
import { LocalGameClient, type GameSnapshot } from './game-client.js';
import GameTable from './components/GameTable.js';

export default function App() {
  const [client] = useState(() => new LocalGameClient());
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<CardId[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    void client.getSnapshot().then((initial) => {
      if (mounted) setSnapshot(initial);
    });
    return () => { mounted = false; };
  }, [client]);

  if (!snapshot) return <main className="loading-state" role="status">正在准备牌桌</main>;

  async function updateFrom(action: () => Promise<GameSnapshot>, clearSelection = false) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const next = await action();
      setSnapshot(next);
      if (!next.notice && clearSelection) setSelectedCardIds([]);
    } catch {
      setSnapshot((current) => current
        ? { ...current, notice: '操作暂时无法完成，请重新开始' }
        : current);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function send(command: Command) {
    void updateFrom(() => client.sendCommand(command), command.type === 'PLAY');
  }

  return (
    <GameTable
      snapshot={snapshot}
      busy={busy}
      selectedCardIds={selectedCardIds}
      onToggleCard={(cardId) => setSelectedCardIds((selected) => selected.includes(cardId)
        ? selected.filter((id) => id !== cardId)
        : [...selected, cardId])}
      onBid={(score: BidScore) => send({ type: 'BID', playerId: 'A', score })}
      onPlay={() => send({ type: 'PLAY', playerId: 'A', cardIds: selectedCardIds })}
      onPass={() => send({ type: 'PASS', playerId: 'A' })}
      onContinue={() => void updateFrom(() => client.continueRun(), true)}
      onRestart={() => void updateFrom(() => client.restart(), true)}
    />
  );
}
