import type { Command } from './commands.js';
import { applyBid } from './bidding.js';
import { applyHexChoice, applyKingDesignation } from './hex.js';
import { applyPass, applyPlay } from './play.js';
import type { GameState, Transition } from './state.js';

export function dispatch(state: GameState, command: Command): Transition {
  if (command.type === 'BID') return applyBid(state, command);
  if (command.type === 'PLAY') return applyPlay(state, command);
  if (command.type === 'PASS') return applyPass(state, command);
  if (command.type === 'DESIGNATE_KING') return applyKingDesignation(state, command);
  return applyHexChoice(state, command);
}
