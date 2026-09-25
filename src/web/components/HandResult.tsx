import type { PlayerId } from '../../domain/commands.js';
import type { GameEvent } from '../../domain/events.js';

type SettlementEvent = Extract<GameEvent, { type: 'HAND_SETTLED' }>;

export default function HandResult({ settlement, onContinue }: { settlement: SettlementEvent; onContinue(): void }) {
  const side = settlement.winnerSide === 'LANDLORD' ? '地主方' : '农民方';
  const players: PlayerId[] = ['A', 'B', 'C'];

  return (
    <section className="result-panel" aria-labelledby="hand-result-title" aria-live="polite">
      <div className="result-heading">
        <div>
          <p className="result-kicker">第 {settlement.handNumber} 手结算 · 倍数 x{settlement.multiplier}</p>
          <h2 id="hand-result-title">本手{side}胜</h2>
          <p>玩家 {settlement.winnerId} 获胜</p>
        </div>
        <div className="score-changes" aria-label="本手分数变化">
          {players.map((playerId) => {
            const delta = settlement.scoreChanges[playerId];
            return <span key={playerId}>玩家 {playerId}：{delta > 0 ? '+' : ''}{delta} 分</span>;
          })}
        </div>
      </div>
      <div className="result-actions">
        <button className="action-primary" type="button" onClick={onContinue}>继续下一手</button>
      </div>
    </section>
  );
}
