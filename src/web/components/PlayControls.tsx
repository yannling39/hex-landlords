import { useState } from 'react';
import { RANK_STRENGTH, type Card, type Rank } from '../../domain/card.js';
import type { PlayDeclaration } from '../../domain/commands.js';
import { comparePatterns } from '../../domain/compare.js';
import { resolvePlay } from '../../domain/hex-play.js';
import type { PlayerView } from '../../domain/player-view.js';
import { formatCard } from './TrickArea.js';

type PlayMode = 'NORMAL' | PlayDeclaration['type'];
const resonanceRanks: Rank[] = ['3', '6', '9', 'Q'];
const patternNames: Record<string, string> = {
  SINGLE: '单张', PAIR: '对子', TRIPLE: '三张', TRIPLE_SINGLE: '三带一',
  TRIPLE_PAIR: '三带二', STRAIGHT: '顺子', CONSECUTIVE_PAIRS: '连对',
  AIRPLANE_SINGLE: '飞机带单', AIRPLANE_PAIRS: '飞机带对',
  FOUR_TWO_SINGLES: '四带二', FOUR_TWO_PAIRS: '四带两对', BOMB: '炸弹', ROCKET: '王炸',
};

type PlayControlsProps = {
  disabled: boolean;
  selectedCards: Card[];
  view: PlayerView;
  onPlay(reverse: boolean, declaration?: PlayDeclaration): void;
  onPass(discardCardId?: string): void;
};

export default function PlayControls({ disabled, selectedCards, view, onPlay, onPass }: PlayControlsProps) {
  const [mode, setMode] = useState<PlayMode>('NORMAL');
  const [sourceId, setSourceId] = useState('');
  const [asRank, setAsRank] = useState<Rank>('3');
  const [reverse, setReverse] = useState(false);
  const owned = new Set(view.hexPicks.A.map((hex) => hex.id));
  const sources = selectedCards.filter((card) => resonanceRanks.includes(card.rank));
  const source = sources.find((card) => card.id === sourceId) ?? sources[0];
  const targets = resonanceRanks.filter((rank) => rank !== source?.rank);
  const target = targets.includes(asRank) ? asRank : targets[0];
  const declaration: PlayDeclaration | undefined = mode === 'RESONANCE' && source && target
    ? { type: 'RESONANCE', cardId: source.id, asRank: target }
    : mode === 'BROKEN_STRAIGHT' ? { type: 'BROKEN_STRAIGHT' }
      : mode === 'SAME_COLOR' ? { type: 'SAME_COLOR' } : undefined;
  const pattern = mode === 'RESONANCE' && !declaration ? null : resolvePlay(view, 'A', selectedCards, declaration);
  const canPlay = pattern !== null && (!view.lastPlay || comparePatterns(pattern, view.lastPlay.pattern, view.trickMode) === 1);
  const showReverse = owned.has('reverse_flow') && view.lastPlay === null;
  const canReverse = showReverse && (pattern?.type === 'SINGLE' || pattern?.type === 'PAIR');
  const canPass = view.lastPlay !== null;
  const canAbandon = canPass && owned.has('abandon') && view.hexUses.A.abandon === 0
    && view.hand.length > 1 && selectedCards.length === 1;

  return (
    <div className="action-controls play-controls" role="group" aria-label="出牌操作">
      {[...owned].some((id) => ['resonance', 'broken_straight', 'same_color'].includes(id)) && (
        <label className="play-option">出牌方式
          <select aria-label="出牌方式" value={mode} disabled={disabled}
            onChange={(event) => setMode(event.target.value as PlayMode)}>
            <option value="NORMAL">普通</option>
            {owned.has('resonance') && <option value="RESONANCE">共鸣</option>}
            {owned.has('broken_straight') && <option value="BROKEN_STRAIGHT">断章</option>}
            {owned.has('same_color') && view.hexUses.A.sameColor === 0 && <option value="SAME_COLOR">同色协定</option>}
          </select>
        </label>
      )}
      {mode === 'RESONANCE' && <>
        <label className="play-option">替换牌
          <select aria-label="共鸣实体牌" value={source?.id ?? ''} disabled={disabled || sources.length === 0}
            onChange={(event) => setSourceId(event.target.value)}>
            {sources.length === 0 && <option value="">无可选牌</option>}
            {sources.map((card) => <option key={card.id} value={card.id}>{formatCard(card)}</option>)}
          </select>
        </label>
        <label className="play-option">视为
          <select aria-label="共鸣目标点数" value={target ?? ''} disabled={disabled || !source}
            onChange={(event) => setAsRank(event.target.value as Rank)}>
            {targets.map((rank) => <option key={rank} value={rank}>{rank}</option>)}
          </select>
        </label>
      </>}
      {showReverse && <label className="reverse-control" title="仅领出单张或对子时可发动">
        <input type="checkbox" checked={reverse && canReverse} disabled={disabled || !canReverse}
          onChange={(event) => setReverse(event.target.checked)} />
        发动逆流
      </label>}
      {selectedCards.length > 0 && <span className="play-preview" role="status">
        {canPlay ? `${patternNames[pattern.type] ?? pattern.type} · ${pattern.mainRank === 18 ? '尊王' : Object.entries(RANK_STRENGTH).find(([, value]) => value === pattern.mainRank)?.[0] ?? pattern.mainRank}` : '当前选择不能出牌'}
      </span>}
      <button className="action-primary" type="button" disabled={disabled || !canPlay}
        onClick={() => onPlay(reverse && canReverse, declaration)}>出牌</button>
      {canPass && <button type="button" disabled={disabled} onClick={() => onPass()}>不出</button>}
      {canAbandon && <button type="button" disabled={disabled}
        title={`弃掉 ${formatCard(selectedCards[0])}`}
        onClick={() => onPass(selectedCards[0].id)}>弃守</button>}
    </div>
  );
}
