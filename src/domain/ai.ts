import type { Command } from './commands.js';
import { listLegalActions } from './legal-plays.js';
import { resolvePlay } from './hex-play.js';
import { RANK_STRENGTH } from './card.js';
import type { PlayerView } from './player-view.js';

function bidFor(view: PlayerView): Command {
  if (view.bid.highestBid === 3) return { type: 'BID', playerId: view.playerId, score: 0 };
  const strength = view.hand.reduce((score, card) => {
    if (card.rank === '2') return score + 2;
    if (card.rank === 'small-joker' || card.rank === 'big-joker') return score + 2.5;
    if (card.rank === 'A') return score + 1.5;
    if (card.rank === 'K') return score + 0.5;
    return score;
  }, 0);
  const score = Math.min(3, view.bid.highestBid + 1) as 1 | 2 | 3;
  const threshold = score === 1 ? 3 : score === 2 ? 6 : 9;
  return { type: 'BID', playerId: view.playerId, score: strength >= threshold ? score : 0 };
}

export function chooseAiCommand(view: PlayerView): Command {
  if (view.phase === 'HEX_DRAFT') {
    if (view.hexDraft?.currentPlayer !== view.playerId || !view.hexDraft.candidates.length) throw new Error('AI can only draft for the current player');
    return { type: 'SELECT_HEX', playerId: view.playerId, candidateId: view.hexDraft.candidates[0].id };
  }
  if (view.phase === 'KING_DESIGNATE') {
    if (view.crownActor !== view.playerId) throw new Error('AI can only designate for the current player');
    const lowest = [...view.hand].sort((a, b) => RANK_STRENGTH[a.rank] - RANK_STRENGTH[b.rank])[0];
    if (!lowest) throw new Error('Cannot designate from an empty hand');
    return { type: 'DESIGNATE_KING', playerId: view.playerId, cardId: lowest.id };
  }
  if (view.phase === 'BID') {
    if (view.bid.currentBidder !== view.playerId) throw new Error('AI can only act for the current bidder');
    return bidFor(view);
  }
  if (view.phase !== 'PLAY' || view.currentActor !== view.playerId) {
    throw new Error('AI can only act for the current player during an active phase');
  }

  const legalPlays = listLegalActions(view);
  const canAbandon = view.hexPicks[view.playerId].some((hex) => hex.id === 'abandon')
    && view.hexUses[view.playerId].abandon === 0 && view.hand.length > 1;
  function pass(): Command {
    const lowest = [...view.hand].filter((card) => card.id !== view.crownCards[view.playerId])
      .sort((a, b) => RANK_STRENGTH[a.rank] - RANK_STRENGTH[b.rank])[0];
    return { type: 'PASS', playerId: view.playerId, ...(canAbandon && lowest ? { discardCardId: lowest.id } : {}) };
  }
  const finishing = legalPlays.find((action) => action.cardIds.length === view.hand.length);
  if (finishing) return finishing;
  if (view.lastPlay && view.landlordId && view.landlordId !== view.playerId && view.lastPlay.playerId !== view.landlordId) return pass();
  if (legalPlays.length === 0) {
    if (view.lastPlay) return pass();
    throw new Error('No legal lead available for a non-empty hand');
  }

  if (!view.lastPlay) {
    const declared = legalPlays.filter((action) => action.declaration)
      .sort((a, b) => b.cardIds.length - a.cardIds.length);
    if (declared.length) return declared[0];
    const reversed = legalPlays.find((action) => action.reverse && action.cardIds.some((id) => {
      const rank = RANK_STRENGTH[view.hand.find((card) => card.id === id)!.rank];
      return rank <= 7;
    }));
    if (reversed) return reversed;
  }
  const ordered = [...legalPlays].sort((a, b) => {
    const patternA = resolvePlay(view, view.playerId, a.cardIds.map((id) => view.hand.find((card) => card.id === id)!), a.declaration)!;
    const patternB = resolvePlay(view, view.playerId, b.cardIds.map((id) => view.hand.find((card) => card.id === id)!), b.declaration)!;
    const reserveA = patternA.type === 'BOMB' || patternA.type === 'ROCKET' || patternA.mainRank === 18;
    const reserveB = patternB.type === 'BOMB' || patternB.type === 'ROCKET' || patternB.mainRank === 18;
    if (reserveA !== reserveB) return reserveA ? 1 : -1;
    if (view.trickMode === 'reverse' && patternA.mainRank <= 14 && patternB.mainRank <= 14) return patternB.mainRank - patternA.mainRank;
    return patternA.mainRank - patternB.mainRank;
  });
  return ordered[0];
}
