import type { Card, CardId } from '../../domain/card.js';
import { formatCard } from './TrickArea.js';

const suitMark: Record<Card['suit'], string> = {
  clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠', joker: '★',
};

type PlayerHandProps = {
  cards: Card[];
  selectedCardIds: CardId[];
  disabled: boolean;
  onToggleCard(cardId: CardId): void;
};

export default function PlayerHand({ cards, selectedCardIds, disabled, onToggleCard }: PlayerHandProps) {
  return (
    <div className="hand-cards" role="group" aria-label="玩家 A 手牌">
      {cards.map((card, index) => {
        const selected = selectedCardIds.includes(card.id);
        const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
        return (
          <button
            className={`playing-card hand-card${isRed ? ' is-red' : ''}${selected ? ' is-selected' : ''}`}
            type="button"
            key={card.id}
            aria-label={`${formatCard(card)}，第 ${index + 1} 张${selected ? '，已选择' : ''}`}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onToggleCard(card.id)}
          >
            <span className="card-corner"><span>{card.rank}</span><span className="card-suit">{suitMark[card.suit]}</span></span>
            <span className="card-center" aria-hidden="true">{suitMark[card.suit]}</span>
          </button>
        );
      })}
    </div>
  );
}
