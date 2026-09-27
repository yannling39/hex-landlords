import { RANK_STRENGTH, type Card, type CardId, type Rank } from './card.js';
import { comparePatterns } from './compare.js';
import type { Command, PlayDeclaration } from './commands.js';
import { resolvePlay } from './hex-play.js';
import { classifyCards, type Pattern } from './pattern.js';
import type { PlayerView } from './player-view.js';

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

export type LegalPlayAction = Extract<Command, { type: 'PLAY' }>;

export function listLegalActions(view: PlayerView): LegalPlayAction[] {
  const current = view.lastPlay?.pattern ?? null;
  const owned = new Set(view.hexPicks[view.playerId].map((hex) => hex.id));
  const candidates = new Map<string, { action: LegalPlayAction; pattern: Pattern }>();
  const byId = new Map(view.hand.map((card) => [card.id, card]));

  function add(cards: readonly Card[], declaration?: PlayDeclaration, reverse = false): void {
    if (cards.length === 0) return;
    const ids = cards.map((card) => card.id);
    if (new Set(ids).size !== ids.length) return;
    const pattern = resolvePlay(view, view.playerId, cards, declaration);
    if (!pattern) return;
    if (reverse && (current || !owned.has('reverse_flow') || !['SINGLE', 'PAIR'].includes(pattern.type))) return;
    if (current && comparePatterns(pattern, current, view.trickMode) !== 1) return;
    const action: LegalPlayAction = {
      type: 'PLAY', playerId: view.playerId, cardIds: ids,
      ...(declaration ? { declaration } : {}), ...(reverse ? { reverse: true } : {}),
    };
    candidates.set(JSON.stringify(action), { action, pattern });
  }

  for (const ids of listLegalPlays(view.hand, current)) add(ids.map((id) => byId.get(id)!));

  if (owned.has('crown_me') || view.trickMode === 'reverse') {
    for (const card of view.hand) add([card]);
  }
  if (view.trickMode === 'reverse') {
    for (let left = 0; left < view.hand.length; left += 1) {
      for (let right = left + 1; right < view.hand.length; right += 1) add([view.hand[left], view.hand[right]]);
    }
  }

  if (owned.has('reverse_flow') && !current) {
    for (const card of view.hand) add([card], undefined, true);
    for (let left = 0; left < view.hand.length; left += 1) {
      for (let right = left + 1; right < view.hand.length; right += 1) add([view.hand[left], view.hand[right]], undefined, true);
    }
  }

  if (owned.has('same_color') && view.hexUses[view.playerId].sameColor === 0 && (!current || current.type === 'STRAIGHT' && current.cardCount === 5)) {
    for (const suits of [['hearts', 'diamonds'], ['clubs', 'spades']]) {
      const colored = view.hand.filter((card) => suits.includes(card.suit) && RANK_STRENGTH[card.rank] <= 14);
      for (let a = 0; a < colored.length - 4; a += 1)
        for (let b = a + 1; b < colored.length - 3; b += 1)
          for (let c = b + 1; c < colored.length - 2; c += 1)
            for (let d = c + 1; d < colored.length - 1; d += 1)
              for (let e = d + 1; e < colored.length; e += 1)
                add([colored[a], colored[b], colored[c], colored[d], colored[e]], { type: 'SAME_COLOR' });
    }
  }

  const rankGroups = new Map<Rank, Card[]>();
  for (const card of view.hand) rankGroups.set(card.rank, [...(rankGroups.get(card.rank) ?? []), card]);
  const sequenceRanks: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  if (owned.has('broken_straight')) {
    for (let length = 5; length <= Math.min(11, view.hand.length); length += 1) {
      if (current && (current.type !== 'STRAIGHT' || current.cardCount !== length)) continue;
      for (let start = 0; start + length < sequenceRanks.length; start += 1) {
        const span = sequenceRanks.slice(start, start + length + 1);
        for (let gap = 1; gap < span.length - 1; gap += 1) {
          const cards = span.filter((_, index) => index !== gap).map((rank) => rankGroups.get(rank)?.[0]);
          if (cards.every((card): card is Card => !!card)) add(cards, { type: 'BROKEN_STRAIGHT' });
        }
      }
    }
  }

  if (owned.has('resonance')) {
    const variants: Rank[] = ['3', '6', '9', 'Q'];
    const sources = variants.flatMap((rank) => rankGroups.get(rank)?.slice(0, 1) ?? []);
    for (const source of sources) {
      for (const asRank of variants.filter((rank) => rank !== source.rank)) {
        const declaration: PlayDeclaration = { type: 'RESONANCE', cardId: source.id, asRank };
        // Rank-count subsets cover attachments and sequences without enumerating suit permutations.
        const groups = new Map<Rank, Card[]>();
        for (const card of view.hand) {
          if (card.id === source.id) continue;
          groups.set(card.rank, [...(groups.get(card.rank) ?? []), card]);
        }
        const entries = [...groups.entries()];
        const allowedSizes = new Set(candidateSizes(view.hand.length, current).filter((size) => size >= 2));
        const maxSize = Math.max(0, ...allowedSizes);
        const selected: Card[] = [source];
        function rankSubsets(index: number): void {
          if (selected.length > maxSize) return;
          if (index === entries.length) {
            if (allowedSizes.has(selected.length)) add(selected, declaration);
            return;
          }
          const [rank, group] = entries[index];
          const limit = Math.min(group.length, maxSize - selected.length, rank === asRank ? 2 : 4);
          rankSubsets(index + 1);
          for (let count = 1; count <= limit; count += 1) {
            selected.push(group[count - 1]);
            rankSubsets(index + 1);
          }
          selected.splice(selected.length - limit, limit);
        }
        rankSubsets(0);
      }
    }
  }

  return [...candidates.values()]
    .sort((left, right) => {
      const leftBomb = left.pattern.type === 'BOMB' || left.pattern.type === 'ROCKET';
      const rightBomb = right.pattern.type === 'BOMB' || right.pattern.type === 'ROCKET';
      if (leftBomb !== rightBomb) return leftBomb ? 1 : -1;
      return left.pattern.mainRank - right.pattern.mainRank || left.action.cardIds.length - right.action.cardIds.length;
    })
    .map((candidate) => candidate.action);
}
