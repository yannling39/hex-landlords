import type { Command } from './commands.js';
import { listLegalPlays } from './legal-plays.js';
import { classifyCards } from './pattern.js';
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
  if (view.phase === 'BID') {
    if (view.bid.currentBidder !== view.playerId) throw new Error('AI can only act for the current bidder');
    return bidFor(view);
  }
  if (view.phase !== 'PLAY' || view.currentActor !== view.playerId) {
    throw new Error('AI can only act for the current player during an active phase');
  }

  const legalPlays = listLegalPlays(view.hand, view.lastPlay?.pattern ?? null);
  if (legalPlays.length === 0) {
    if (view.lastPlay) return { type: 'PASS', playerId: view.playerId };
    throw new Error('No legal lead available for a non-empty hand');
  }

  const cardIds = legalPlays[0];
  const selectedCards = cardIds.map((id) => view.hand.find((card) => card.id === id)!);
  if (!classifyCards(selectedCards)) throw new Error('Legal play enumeration returned an invalid play');
  return { type: 'PLAY', playerId: view.playerId, cardIds };
}
