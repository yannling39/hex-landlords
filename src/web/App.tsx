import { useEffect, useRef, useState } from 'react';
import type { CardId } from '../domain/card.js';
import type { BidScore, Command, PlayDeclaration } from '../domain/commands.js';
import { LocalGameClient, type GameSnapshot } from './game-client.js';
import GameTable from './components/GameTable.js';

export default function App() {
  const [client] = useState(() => new LocalGameClient(undefined, 1_000, true));
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

  async function updateFrom(action: (onProgress: (next: GameSnapshot) => void) => Promise<GameSnapshot>, clearSelection = false) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      let eventCount = snapshot?.publicEvents.length ?? 0;
      const onProgress = (next: GameSnapshot) => {
        const newEvents = next.publicEvents.slice(eventCount);
        eventCount = next.publicEvents.length;
        if (newEvents.some((event) => event.type === 'TRICK_CLOSED'
          || (event.type === 'KING_DESIGNATED' && event.playerId === 'A')
          || (clearSelection && event.type === 'CARDS_PLAYED' && event.playerId === 'A'))) {
          setSelectedCardIds([]);
        }
        setSnapshot(next);
      };
      const next = await action(onProgress);
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
    void updateFrom((onProgress) => client.sendCommand(command, onProgress), command.type === 'PLAY');
  }

  return (
    <GameTable
      snapshot={snapshot}
      busy={busy}
      selectedCardIds={selectedCardIds}
      onToggleCard={(cardId) => setSelectedCardIds((selected) => selected.includes(cardId)
        ? selected.filter((id) => id !== cardId)
        : [...selected, cardId])}
      onSetCardSelection={(cardId, selected) => setSelectedCardIds((current) => selected
        ? current.includes(cardId) ? current : [...current, cardId]
        : current.filter((id) => id !== cardId))}
      onBid={(score: BidScore) => send({ type: 'BID', playerId: 'A', score })}
      onPlay={(reverse: boolean, declaration?: PlayDeclaration) => send({ type: 'PLAY', playerId: 'A', cardIds: selectedCardIds,
        ...(reverse ? { reverse: true } : {}), ...(declaration ? { declaration } : {}) })}
      onPass={(discardCardId) => send({ type: 'PASS', playerId: 'A', ...(discardCardId ? { discardCardId } : {}) })}
      onDesignateKing={(cardId) => send({ type: 'DESIGNATE_KING', playerId: 'A', cardId })}
      onSelectHex={(candidateId) => send({ type: 'SELECT_HEX', playerId: 'A', candidateId })}
      onContinue={() => void updateFrom((onProgress) => client.continueRun(onProgress), true)}
      onRestart={() => void updateFrom(() => client.restart(), true)}
    />
  );
}
