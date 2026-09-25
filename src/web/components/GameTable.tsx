import type { CardId } from '../../domain/card.js';
import type { BidScore, PlayerId } from '../../domain/commands.js';
import type { GameSnapshot } from '../game-client.js';
import BidControls from './BidControls.js';
import EventLog from './EventLog.js';
import HandResult from './HandResult.js';
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
  onBid(score: BidScore): void;
  onPlay(): void;
  onPass(): void;
  onContinue(): void;
  onRestart(): void;
};

function isCurrentPlayer(snapshot: GameSnapshot, playerId: PlayerId): boolean {
  if (snapshot.view.phase === 'BID') return snapshot.view.bid.currentBidder === playerId;
  return snapshot.view.phase === 'PLAY' && snapshot.view.currentActor === playerId;
}

export default function GameTable({ snapshot, busy, selectedCardIds, onToggleCard, onBid, onPlay, onPass, onContinue, onRestart }: GameTableProps) {
  const { view } = snapshot;
  const handSettlement = [...snapshot.publicEvents].reverse().find((event) => event.type === 'HAND_SETTLED');
  const runResult = [...snapshot.publicEvents].reverse().find((event) => event.type === 'RUN_FINISHED');

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
        <div className="run-status" aria-label={`第 ${view.handNumber} 手，共三手`}>
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
            />
          ))}
        </section>

        <TrickArea
          lastPlay={view.lastPlay}
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
          />
          <div className="hand-wrap">
            <h2>你的手牌 <span>{view.hand.length} 张</span></h2>
            <PlayerHand cards={view.hand} selectedCardIds={selectedCardIds} disabled={busy || view.phase !== 'PLAY' || !isCurrentPlayer(snapshot, 'A')} onToggleCard={onToggleCard} />
          </div>
          {view.phase === 'BID' && (
            <BidControls highestBid={view.bid.highestBid} disabled={busy || !isCurrentPlayer(snapshot, 'A')} onBid={onBid} />
          )}
          {view.phase === 'PLAY' && isCurrentPlayer(snapshot, 'A') && (
            <PlayControls
              disabled={busy}
              canPlay={selectedCardIds.length > 0}
              canPass={view.lastPlay !== null}
              onPlay={onPlay}
              onPass={onPass}
            />
          )}
          <div className="human-feedback">
            {snapshot.notice && <p className="action-notice" role="alert">{snapshot.notice}</p>}
            <p className="human-turn" role="status">
            {busy ? 'AI 行动中' : isCurrentPlayer(snapshot, 'A')
              ? view.phase === 'BID' ? '等待你叫分' : '轮到你出牌'
              : view.phase === 'RUN_END' ? '三手 Run 已结束' : '等待对手行动'}
            </p>
          </div>
        </section>
      </div>
      {snapshot.awaitingContinue && handSettlement?.type === 'HAND_SETTLED' && (
        <HandResult settlement={handSettlement} onContinue={onContinue} />
      )}
      {view.phase === 'RUN_END' && runResult?.type === 'RUN_FINISHED' && (
        <RunResult result={runResult} onRestart={onRestart} />
      )}
    </main>
  );
}
