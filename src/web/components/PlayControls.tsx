type PlayControlsProps = {
  disabled: boolean;
  canPlay: boolean;
  canPass: boolean;
  onPlay(): void;
  onPass(): void;
};

export default function PlayControls({ disabled, canPlay, canPass, onPlay, onPass }: PlayControlsProps) {
  return (
    <div className="action-controls play-controls" role="group" aria-label="出牌操作">
      <button className="action-primary" type="button" disabled={disabled || !canPlay} onClick={onPlay}>出牌</button>
      {canPass && <button type="button" disabled={disabled} onClick={onPass}>不出</button>}
    </div>
  );
}
