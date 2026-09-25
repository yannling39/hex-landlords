import type { Card, CardId } from './card.js';
import { comparePatterns } from './compare.js';
import { classifyCards, type Pattern } from './pattern.js';

type Candidate = { ids: CardId[]; pattern: Pattern };

function leadSizes(handSize: number): number[] {
  const sizes = new Set<number>([1, 2, 3, 4, 5, 6, 8, 10, 15, 20]);
  for (let size = 7; size <= 12; size += 1) sizes.add(size);
  for (let size = 8; size <= 20; size += 4) sizes.add(size);
  for (let size = 10; size <= 20; size += 5) sizes.add(size);
  for (let size = 6; size <= 20; size += 2) sizes.add(size);
  return [...sizes].filter((size) => size <= handSize).sort((a, b) => a - b);
}

function candidateSizes(handSize: number, currentPattern: Pattern | null): number[] {
  if (!currentPattern) return leadSizes(handSize);
  if (currentPattern.type === 'ROCKET') return [];
  return [...new Set([currentPattern.cardCount, 4, 2])].filter((size) => size <= handSize);
}

function compareCandidates(left: Candidate, right: Candidate): number {
  const leftSpecial = left.pattern.type === 'BOMB' || left.pattern.type === 'ROCKET';
  const rightSpecial = right.pattern.type === 'BOMB' || right.pattern.type === 'ROCKET';
  if (leftSpecial !== rightSpecial) return leftSpecial ? 1 : -1;
  if (left.pattern.mainRank !== right.pattern.mainRank) return left.pattern.mainRank - right.pattern.mainRank;
  if (left.pattern.cardCount !== right.pattern.cardCount) return left.pattern.cardCount - right.pattern.cardCount;
  return left.ids.join('\0').localeCompare(right.ids.join('\0'));
}

export function listLegalPlays(hand: readonly Card[], currentPattern: Pattern | null): CardId[][] {
  const candidates: Candidate[] = [];
  const sizes = candidateSizes(hand.length, currentPattern);

  for (const size of sizes) {
    const selected: Card[] = [];
    function enumerate(start: number): void {
      if (selected.length === size) {
        const pattern = classifyCards(selected);
        if (!pattern) return;
        if (currentPattern && comparePatterns(pattern, currentPattern) !== 1) return;
        candidates.push({ ids: selected.map((card) => card.id), pattern });
        return;
      }

      const needed = size - selected.length;
      for (let index = start; index <= hand.length - needed; index += 1) {
        selected.push(hand[index]);
        enumerate(index + 1);
        selected.pop();
      }
    }
    enumerate(0);
  }

  candidates.sort(compareCandidates);
  return candidates.map(({ ids }) => ids);
}
