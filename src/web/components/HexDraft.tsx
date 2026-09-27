import type { HexDraft as HexDraftState } from '../../domain/state.js';

export default function HexDraft({ draft, busy, onSelect }: {
  draft: HexDraftState;
  busy: boolean;
  onSelect(candidateId: string): void;
}) {
  return (
    <section className="hex-draft" aria-labelledby="hex-draft-title">
      <div className="hex-draft-heading">
        <h2 id="hex-draft-title">海克斯抽取</h2>
        <span>玩家 {draft.currentPlayer}</span>
      </div>
      {draft.currentPlayer === 'A' && (
        <div className="hex-options" role="group" aria-label="海克斯候选">
          {draft.candidates.map((candidate, index) => (
            <button type="button" key={candidate.id} disabled={busy}
              aria-label={`选择第 ${index + 1} 项：${candidate.label}`}
              onClick={() => onSelect(candidate.id)}>
              <span className="hex-option-number">{index + 1}</span>
              <span className="hex-option-name">{candidate.label}</span>
              <span className="hex-option-description">效果：{candidate.description}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
