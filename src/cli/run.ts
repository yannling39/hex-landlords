import { chooseAiCommand } from '../domain/ai.js';
import type { Card } from '../domain/card.js';
import type { GameEvent } from '../domain/events.js';
import { dispatch } from '../domain/game.js';
import { viewForPlayer } from '../domain/player-view.js';
import { settleHand, startNextHand } from '../domain/scoring.js';
import { createRun } from '../domain/setup.js';
import type { GameState } from '../domain/state.js';

export type RunResult = {
  state: GameState;
  settledHands: number;
  commandCount: number;
  output: string;
};

const rankLabels: Record<Card['rank'], string> = {
  '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
  J: 'J', Q: 'Q', K: 'K', A: 'A', '2': '2', 'small-joker': '小王', 'big-joker': '大王',
};

function formatCards(cards: readonly Card[]): string {
  return cards.map((card) => rankLabels[card.rank]).join(' ');
}

function formatEvent(event: GameEvent): string {
  switch (event.type) {
    case 'BID_ACCEPTED': return `玩家 ${event.playerId} 叫 ${event.score}`;
    case 'HAND_REDEALT': return `第 ${event.handNumber} 手无人叫分，重新发牌`;
    case 'LANDLORD_SELECTED': return `玩家 ${event.playerId} 成为地主，底分 ${event.baseScore}，底牌：${formatCards(event.bottomCards)}`;
    case 'CARDS_PLAYED': return `玩家 ${event.playerId} 出牌：${formatCards(event.cards)} (${event.pattern.type})`;
    case 'PLAYER_PASSED': return `玩家 ${event.playerId} 不出`;
    case 'TRICK_CLOSED': return `本墩结束，玩家 ${event.leaderId} 领出`;
    case 'HAND_FINISHED': return `本手结束：${event.winnerSide === 'LANDLORD' ? '地主方' : '农民方'}胜，倍数 x${event.multiplier}`;
    case 'HAND_SETTLED': return `第 ${event.handNumber} 手结算：${JSON.stringify(event.scoreChanges)}`;
    case 'RUN_FINISHED': return `Run 结束：${JSON.stringify(event.scores)}，胜者 ${event.winnerId ?? '平局'}`;
  }
}

export function runDeterministicRun(seed: number, commandLimit = 10_000): RunResult {
  let state = createRun({ seed });
  let commandCount = 0;
  let settledHands = 0;
  const output = [`固定种子 ${seed}，开始三手 Run`];

  while (state.phase !== 'RUN_END') {
    if (commandCount >= commandLimit) throw new Error(`Run exceeded command limit ${commandLimit}`);

    if (state.phase === 'HAND_END') {
      const transition = settleHand(state);
      if (transition.error) throw new Error(`Settlement failed: ${transition.error}`);
      state = transition.state;
      settledHands += 1;
      output.push(...transition.events.map(formatEvent));
      continue;
    }

    if (state.phase === 'NEXT_HAND') {
      const transition = startNextHand(state);
      if (transition.error) throw new Error(`Could not start next hand: ${transition.error}`);
      state = transition.state;
      output.push(`第 ${state.handNumber} 手开始，首叫玩家 ${state.firstBidder}`);
      continue;
    }

    if (state.phase !== 'BID' && state.phase !== 'PLAY') {
      throw new Error(`Unsupported phase in baseline run: ${state.phase}`);
    }
    const playerId = state.phase === 'BID' ? state.bid.currentBidder : state.currentActor;
    const command = chooseAiCommand(viewForPlayer(state, playerId));
    const transition = dispatch(state, command);
    if (transition.error) throw new Error(`AI command rejected (${transition.error}): ${JSON.stringify(command)}`);
    state = transition.state;
    commandCount += 1;
    output.push(...transition.events.map(formatEvent));
  }

  return { state, settledHands, commandCount, output: output.join('\n') };
}
