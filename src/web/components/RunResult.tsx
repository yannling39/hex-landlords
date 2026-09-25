import type { PlayerId } from '../../domain/commands.js';
import type { GameEvent } from '../../domain/events.js';

type RunFinishedEvent = Extract<GameEvent, { type: 'RUN_FINISHED' }>;

export default function RunResult({ result, onRestart }: { result: RunFinishedEvent; onRestart(): void }) {
  const players: PlayerId[] = ['A', 'B', 'C'];
  return (
    <section className="result-panel run-result" aria-labelledby="run-result-title" aria-live="polite">
      <div className="result-heading">
        <div>
          <p className="result-kicker">三手 Run 结束</p>
          <h2 id="run-result-title">{result.winnerId ? `玩家 ${result.winnerId} 获胜` : '三手 Run 平局'}</h2>
        </div>
        <div className="score-changes" aria-label="最终分数">
          {players.map((playerId) => {
            const score = result.scores[playerId];
            return <span key={playerId}>玩家 {playerId}：{score > 0 ? '+' : ''}{score} 分</span>;
          })}
        </div>
      </div>
      <div className="result-actions">
        <button className="action-primary" type="button" onClick={onRestart}>再开一局</button>
      </div>
    </section>
  );
}
