import type { CardId } from '../../domain/card.js';
import type { BidScore, PlayerId, PlayDeclaration } from '../../domain/commands.js';
import type { GameEvent } from '../../domain/events.js';
import type { GameSnapshot } from '../game-client.js';
import BidControls from './BidControls.js';
import EventLog from './EventLog.js';
import HandResult from './HandResult.js';
import HexDraft from './HexDraft.js';
import PlayControls from './PlayControls.js';
import PlayerHand from './PlayerHand.js';
import RunResult from './RunResult.js';
import PlayerSeat from './PlayerSeat.js';
import TrickArea from './TrickArea.js';

export type GameTableProps = {
  snapshot: GameSnapshot;
  busy: boolean;
  selectedCardIds: CardId[];
  onToggleCard(cardId: CardId): void;
  onSetCardSelection?(cardId: CardId, selected: boolean): void;
  onBid(score: BidScore): void;
  onPlay(reverse: boolean, declaration?: PlayDeclaration): void;
  onPass(discardCardId?: CardId): void;
  onDesignateKing?(cardId: CardId): void;
  onSelectHex?(candidateId: string): void;
  onContinue(): void;
  onRestart(): void;
};

function isCurrentPlayer(snapshot: GameSnapshot, playerId: PlayerId): boolean {
  if (snapshot.view.phase === 'BID') return snapshot.view.bid.currentBidder === playerId;
  if (snapshot.view.phase === 'KING_DESIGNATE') return snapshot.view.crownActor === playerId;
  return snapshot.view.phase === 'PLAY' && snapshot.view.currentActor === playerId;
}

export default function GameTable({ snapshot, busy, selectedCardIds, onToggleCard, onSetCardSelection, onBid, onPlay, onPass, onDesignateKing, onSelectHex, onContinue, onRestart }: GameTableProps) {
  const { view } = snapshot;
  let previousHandEnd = -1;
  snapshot.publicEvents.forEach((event, index) => {
    if (event.type === 'HAND_SETTLED' && event.handNumber < view.handNumber) previousHandEnd = index;
  });
  const handEvents = snapshot.publicEvents.slice(previousHandEnd + 1);
  function lastAction(playerId: PlayerId): Extract<GameEvent, { type: 'CARDS_PLAYED' | 'PLAYER_PASSED' }> | undefined {
    for (let index = handEvents.length - 1; index >= 0; index -= 1) {
      const event = handEvents[index];
      if ((event.type === 'CARDS_PLAYED' || event.type === 'PLAYER_PASSED') && event.playerId === playerId) return event;
    }
    return undefined;
  }
  const handSettlement = [...snapshot.publicEvents].reverse().find((event) => event.type === 'HAND_SETTLED');
  const runResult = [...snapshot.publicEvents].reverse().find((event) => event.type === 'RUN_FINISHED');
  const selected = selectedCardIds.map((id) => view.hand.find((card) => card.id === id));
  const selectedCards = selected.every((card) => card !== undefined) && new Set(selectedCardIds).size === selectedCardIds.length
    ? selected : [];

  return (
    <main className="game-shell">
      <header className="game-header">
        <div className="game-brand">
          <span className="brand-mark" aria-hidden="true">斗</span>
          <div>
            <h1>斗地主</h1>
            <p>单机练习</p>
          </div>
        </div>
        <div className="run-status" aria-label={`第 ${view.handNumber} 手，共六手`}>
          <span>第 {view.handNumber} 手</span>
          <span className="status-divider" aria-hidden="true" />
          <span>底分 {view.baseScore}</span>
          <span className="status-divider" aria-hidden="true" />
          <span className="status-multiplier">x{view.multiplier}</span>
        </div>
        <button className="header-restart" type="button" disabled={busy} onClick={onRestart}>重开本局</button>
      </header>

      <div className="table-layout">
        <section className="opponent-row" aria-label="其他玩家">
          {(['B', 'C'] as const).map((playerId) => (
            <PlayerSeat
              key={playerId}
              playerId={playerId}
              handCount={view.handCounts[playerId]}
              score={view.runScores[playerId]}
              isCurrent={isCurrentPlayer(snapshot, playerId)}
              isLandlord={view.landlordId === playerId}
              lastAction={lastAction(playerId)}
              hexPicks={view.hexPicks[playerId]}
            />
          ))}
        </section>

        <TrickArea
          lastPlay={view.lastPlay}
          trickMode={view.trickMode}
          currentActor={view.phase === 'BID' ? view.bid.currentBidder : view.currentActor}
          phase={view.phase}
          multiplier={view.multiplier}
          bottomCards={view.bottomCards}
          landlordId={view.landlordId}
        />

        <EventLog events={snapshot.publicEvents} />

        <section className="human-area">
          <PlayerSeat
            playerId="A"
            handCount={view.handCounts.A}
            score={view.runScores.A}
            isCurrent={isCurrentPlayer(snapshot, 'A')}
            isLandlord={view.landlordId === 'A'}
            lastAction={lastAction('A')}
            hexPicks={view.hexPicks.A}
          />
          {view.phase !== 'HEX_DRAFT' && <div className="hand-wrap">
            <h2>你的手牌 <span>{view.hand.length} 张</span></h2>
            <PlayerHand cards={view.hand} selectedCardIds={selectedCardIds} disabled={busy || !isCurrentPlayer(snapshot, 'A') || (view.phase !== 'PLAY' && view.phase !== 'KING_DESIGNATE')} onToggleCard={onToggleCard} onSetCardSelection={onSetCardSelection} />
          </div>}
          {view.phase === 'KING_DESIGNATE' && view.crownActor === 'A' && (
            <div className="action-controls play-controls">
              <button className="action-primary" type="button" disabled={busy || selectedCardIds.length !== 1 || !onDesignateKing}
                onClick={() => onDesignateKing?.(selectedCardIds[0])}>指定尊王牌</button>
            </div>
          )}
          {view.phase === 'BID' && (
            <BidControls highestBid={view.bid.highestBid} disabled={busy || !isCurrentPlayer(snapshot, 'A')} onBid={onBid} />
          )}
          {view.phase === 'PLAY' && isCurrentPlayer(snapshot, 'A') && (
            <PlayControls
              key={selectedCardIds.join('|')}
              disabled={busy}
              selectedCards={selectedCards}
              view={view}
              onPlay={onPlay}
              onPass={onPass}
            />
          )}
          <div className="human-feedback">
            {snapshot.notice && <p className="action-notice" role="alert">{snapshot.notice}</p>}
            <p className="human-turn" role="status">
            {busy ? 'AI 行动中' : view.phase === 'HEX_DRAFT'
              ? view.hexDraft?.currentPlayer === 'A' ? '等待你抽取海克斯' : `等待玩家 ${view.hexDraft?.currentPlayer} 抽取海克斯`
              : view.phase === 'KING_DESIGNATE'
              ? view.crownActor === 'A' ? '请选择一张尊王牌' : `等待玩家 ${view.crownActor} 指定尊王牌`
              : isCurrentPlayer(snapshot, 'A')
              ? view.phase === 'BID' ? '等待你叫分' : '轮到你出牌'
              : view.phase === 'RUN_END' ? '六手 Run 已结束' : '等待对手行动'}
            </p>
          </div>
        </section>
      </div>
      {(snapshot.awaitingContinue || view.phase === 'HEX_DRAFT') && handSettlement?.type === 'HAND_SETTLED' && (
        <HandResult settlement={handSettlement} onContinue={snapshot.awaitingContinue ? onContinue : undefined} busy={busy} />
      )}
      {view.phase === 'HEX_DRAFT' && view.hexDraft && (
        <HexDraft draft={view.hexDraft} busy={busy || !onSelectHex} onSelect={onSelectHex ?? (() => {})} />
      )}
      {view.phase === 'RUN_END' && runResult?.type === 'RUN_FINISHED' && (
        <RunResult result={runResult} onRestart={onRestart} />
      )}
    </main>
  );
}
