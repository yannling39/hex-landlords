import { createDeck, dealHand, shuffle } from './deck.js';
import { createSeededRandom } from './random.js';
import type { GameState, PreparedDeal } from './state.js';

export function createRun({ seed }: { seed: number }): GameState {
  const random = createSeededRandom(seed);
  const preparedDeals: PreparedDeal[][] = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => {
      const dealt = dealHand(shuffle(createDeck(), random));
      return {
        hands: { A: dealt.hands[0], B: dealt.hands[1], C: dealt.hands[2] },
        bottom: dealt.bottom,
      };
    }),
  );
  const initialDeal = preparedDeals[0][0];

  return {
    version: 1,
    phase: 'BID',
    players: ['A', 'B', 'C'],
    hands: {
      A: [...initialDeal.hands.A],
      B: [...initialDeal.hands.B],
      C: [...initialDeal.hands.C],
    },
    runScores: { A: 0, B: 0, C: 0 },
    handNumber: 1,
    firstBidder: 'A',
    preparedDeals,
    dealAttemptIndex: 0,
    bid: {
      currentBidder: 'A',
      highestBid: 0,
      highestBidder: null,
      consecutivePasses: 0,
    },
    bottomCards: [...initialDeal.bottom],
    bottomRevealed: false,
    landlordId: null,
    baseScore: 0,
    currentActor: 'A',
    lastPlay: null,
    trickLeaderId: null,
    consecutivePasses: 0,
    multiplier: 1,
    bombsPlayed: 0,
    hexEnabled: false,
  };
}
