import type { Card } from '../../domain/card.js';
import type { PlayerId } from '../../domain/commands.js';
import type { PlayedMove } from '../../domain/state.js';

export const rankLabel: Record<Card['rank'], string> = {
  '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
  J: 'J', Q: 'Q', K: 'K', A: 'A', '2': '2', 'small-joker': '小王', 'big-joker': '大王',
};

const suitLabel: Record<Card['suit'], string> = {
  clubs: '梅花', diamonds: '方块', hearts: '红桃', spades: '黑桃', joker: '王',
};

const suitMark: Record<Card['suit'], string> = {
  clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠', joker: '★',
};

export function formatCard(card: Card): string {
  if (card.suit === 'joker') return rankLabel[card.rank];
  return `${rankLabel[card.rank]}${suitLabel[card.suit]}`;
}

export function CardFace({ card, compact = false }: { card: Card; compact?: boolean }) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds' || card.rank === 'big-joker';
  return (
    <span
      className={`playing-card${isRed ? ' is-red' : ''}${compact ? ' is-compact' : ''}`}
      role="img"
      aria-label={formatCard(card)}
    >
      <span className="card-corner">
        <span>{rankLabel[card.rank]}</span>
        <span className="card-suit">{suitMark[card.suit]}</span>
      </span>
      <span className="card-center" aria-hidden="true">{suitMark[card.suit]}</span>
    </span>
  );
}

export function CardRow({ cards, label }: { cards: readonly Card[]; label: string }) {
  return (
    <div className="card-row" role="group" aria-label={label}>
      {cards.map((card) => <CardFace key={card.id} card={card} compact />)}
    </div>
  );
}

type TrickAreaProps = {
  lastPlay: PlayedMove | null;
  currentActor: PlayerId;
  phase: string;
  multiplier: number;
  bottomCards: Card[] | null;
  landlordId: PlayerId | null;
};

export default function TrickArea({ lastPlay, currentActor, phase, multiplier, bottomCards, landlordId }: TrickAreaProps) {
  return (
    <section className="felt" aria-label="牌桌中央">
      <div className="felt-topline">
        <span className="phase-label">{phase === 'BID' ? '叫地主' : phase === 'PLAY' ? '出牌' : phase}</span>
        <span className="multiplier">倍数 x{multiplier}</span>
      </div>
      <p className="turn-prompt" role="status">
        {phase === 'BID' ? `等待玩家 ${currentActor} 叫分` : phase === 'PLAY' ? `轮到玩家 ${currentActor}` : '本手已结束'}
      </p>
      {landlordId && <p className="landlord-summary" role="status">地主：玩家 {landlordId}</p>}
      {lastPlay ? (
        <div className="last-play">
          <span className="last-play-owner">玩家 {lastPlay.playerId} 出牌</span>
          <CardRow cards={lastPlay.cards} label={`玩家 ${lastPlay.playerId} 的桌面牌`} />
          <span className="pattern-label">{lastPlay.pattern.type.replaceAll('_', ' ')}</span>
        </div>
      ) : (
        <div className="empty-trick">等待领出</div>
      )}
      <div className="bottom-card-area">
        <span className="bottom-card-label">底牌</span>
        {bottomCards
          ? <CardRow cards={bottomCards} label="公开底牌" />
          : <span className="hidden-bottom">底牌尚未公开</span>}
      </div>
    </section>
  );
}
