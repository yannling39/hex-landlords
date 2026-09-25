import type { BidScore } from '../../domain/commands.js';

const bidScores: BidScore[] = [0, 1, 2, 3];

type BidControlsProps = {
  highestBid: BidScore;
  disabled: boolean;
  onBid(score: BidScore): void;
};

export default function BidControls({ highestBid, disabled, onBid }: BidControlsProps) {
  return (
    <div className="action-controls bid-controls" role="group" aria-label="叫分操作">
      {bidScores.filter((score) => score === 0 || score > highestBid).map((score) => (
        <button className={score === 3 ? 'action-primary' : ''} type="button" disabled={disabled} key={score} onClick={() => onBid(score)}>
          {score === 0 ? '不叫' : `叫 ${score} 分`}
        </button>
      ))}
    </div>
  );
}
