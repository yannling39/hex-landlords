import type { GameEvent } from '../../domain/events.js';
import { formatCard } from './TrickArea.js';

function formatEvent(event: GameEvent): string {
  switch (event.type) {
    case 'BID_ACCEPTED': return `玩家 ${event.playerId} 叫 ${event.score} 分`;
    case 'HAND_REDEALT': return `第 ${event.handNumber} 手重新发牌`;
    case 'LANDLORD_SELECTED': return `玩家 ${event.playerId} 成为地主`;
    case 'CARDS_PLAYED': return `玩家 ${event.playerId} 出牌：${event.cards.map(formatCard).join(' ')}`;
    case 'PLAYER_PASSED': return `玩家 ${event.playerId} 不出`;
    case 'TRICK_CLOSED': return `本墩结束，玩家 ${event.leaderId} 领出`;
    case 'HAND_FINISHED': return `本手结束，${event.winnerSide === 'LANDLORD' ? '地主方' : '农民方'}胜`;
    case 'HAND_SETTLED': return `第 ${event.handNumber} 手结算`;
    case 'RUN_FINISHED': return '三手 Run 结束';
  }
}

export default function EventLog({ events }: { events: GameEvent[] }) {
  return (
    <section className="event-log" aria-label="对局记录">
      <h2>对局记录</h2>
      {events.length === 0 ? (
        <p className="event-empty">叫分和出牌会显示在这里</p>
      ) : (
        <ol aria-live="polite" aria-relevant="additions">
          {events.map((event, index) => <li key={`${index}-${event.type}`}>{formatEvent(event)}</li>)}
        </ol>
      )}
    </section>
  );
}
