import { useRef, type PointerEvent } from 'react';
import { RANK_STRENGTH, type Card, type CardId } from '../../domain/card.js';
import { formatCard, rankLabel } from './TrickArea.js';

const suitMark: Record<Card['suit'], string> = {
  clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠', joker: '★',
};

const suitOrder: Record<Card['suit'], number> = {
  clubs: 0, diamonds: 1, hearts: 2, spades: 3, joker: 4,
};

type PlayerHandProps = {
  cards: Card[];
  selectedCardIds: CardId[];
  disabled: boolean;
  onToggleCard(cardId: CardId): void;
  onSetCardSelection?(cardId: CardId, selected: boolean): void;
};

export default function PlayerHand({ cards, selectedCardIds, disabled, onToggleCard, onSetCardSelection }: PlayerHandProps) {
  const drag = useRef<{ selected: boolean; lastIndex: number } | null>(null);
  const sortedCards = [...cards].sort((left, right) =>
    RANK_STRENGTH[left.rank] - RANK_STRENGTH[right.rank]
      || suitOrder[left.suit] - suitOrder[right.suit]);

  function setSelection(cardId: CardId, selected: boolean) {
    if (onSetCardSelection) onSetCardSelection(cardId, selected);
    else if (selectedCardIds.includes(cardId) !== selected) onToggleCard(cardId);
  }

  function extendSelection(index: number) {
    if (!drag.current || disabled) return;
    const { lastIndex, selected } = drag.current;
    const first = Math.min(lastIndex, index);
    const last = Math.max(lastIndex, index);
    for (let cursor = first; cursor <= last; cursor += 1) {
      const card = sortedCards[cursor];
      if (card) setSelection(card.id, selected);
    }
    drag.current.lastIndex = index;
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-card-index]');
    if (target && event.currentTarget.contains(target)) extendSelection(Number(target.dataset.cardIndex));
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX > bounds.right - 24) event.currentTarget.scrollLeft += 12;
    if (event.clientX < bounds.left + 24) event.currentTarget.scrollLeft -= 12;
  }

  return (
    <div className="hand-cards" role="group" aria-label="玩家 A 手牌"
      onPointerMove={handlePointerMove}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
    >
      {sortedCards.map((card, index) => {
        const selected = selectedCardIds.includes(card.id);
        const isRed = card.suit === 'hearts' || card.suit === 'diamonds' || card.rank === 'big-joker';
        return (
          <button
            className={`playing-card hand-card${isRed ? ' is-red' : ''}${selected ? ' is-selected' : ''}`}
            type="button"
            key={card.id}
            data-card-index={index}
            aria-label={`${formatCard(card)}，第 ${index + 1} 张${selected ? '，已选择' : ''}`}
            aria-pressed={selected}
            disabled={disabled}
            onPointerDown={(event) => {
              if (disabled) return;
              event.preventDefault();
              drag.current = { selected: !selected, lastIndex: index };
              setSelection(card.id, !selected);
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerEnter={() => extendSelection(index)}
            onClick={(event) => { if (event.detail === 0) onToggleCard(card.id); }}
          >
            <span className="card-corner"><span>{rankLabel[card.rank]}</span><span className="card-suit">{suitMark[card.suit]}</span></span>
            <span className="card-center" aria-hidden="true">{suitMark[card.suit]}</span>
          </button>
        );
      })}
    </div>
  );
}
