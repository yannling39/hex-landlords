import type { Pattern } from './pattern.js';

export function comparePatterns(challenger: Pattern, current: Pattern): -1 | 0 | 1 {
  if (challenger.type === 'ROCKET') return current.type === 'ROCKET' ? 0 : 1;
  if (current.type === 'ROCKET') return -1;

  if (challenger.type === 'BOMB' && current.type !== 'BOMB') return 1;
  if (current.type === 'BOMB' && challenger.type !== 'BOMB') return -1;

  if (challenger.type !== current.type) return 0;
  if (challenger.sequenceLength !== current.sequenceLength) return 0;
  if (challenger.attachmentMode !== current.attachmentMode) return 0;
  if (challenger.cardCount !== current.cardCount) return 0;
  if (challenger.mainRank > current.mainRank) return 1;
  if (challenger.mainRank < current.mainRank) return -1;
  return 0;
}
