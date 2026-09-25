import type { PlayerId } from '../../domain/commands.js';

type PlayerSeatProps = {
  playerId: PlayerId;
  handCount: number;
  score: number;
  isCurrent: boolean;
  isLandlord: boolean;
};

export default function PlayerSeat({ playerId, handCount, score, isCurrent, isLandlord }: PlayerSeatProps) {
  return (
    <section
      className={`player-seat${isCurrent ? ' is-current' : ''}${playerId === 'A' ? ' is-human' : ''}`}
      role="group"
      aria-label={`玩家 ${playerId}`}
      aria-current={isCurrent ? 'step' : undefined}
    >
      <div className="seat-heading">
        <h2>{playerId === 'A' ? '你 · A' : `玩家 ${playerId}`}</h2>
        {isLandlord && <span className="landlord-marker">地主</span>}
        {playerId === 'A' && <span className="seat-role">你</span>}
      </div>
      <div className="seat-details">
        <span>{handCount} 张</span>
        <span className="seat-score">{score > 0 ? `+${score}` : score} 分</span>
      </div>
      {isCurrent && <span className="seat-turn">行动中</span>}
    </section>
  );
}
