import { chooseAiCommand } from '../domain/ai.js';
import type { Command, PlayerId } from '../domain/commands.js';
import type { RuleErrorCode } from '../domain/errors.js';
import type { GameEvent } from '../domain/events.js';
import { dispatch } from '../domain/game.js';
import { viewForPlayer, type PlayerView } from '../domain/player-view.js';
import { settleHand, startNextHand } from '../domain/scoring.js';
import { createRun } from '../domain/setup.js';
import type { GameState } from '../domain/state.js';

export type GameSnapshot = {
  view: PlayerView;
  publicEvents: GameEvent[];
  notice: string | null;
  awaitingContinue: boolean;
};

export type GameClient = {
  getSnapshot(): Promise<GameSnapshot>;
  sendCommand(command: Command, onProgress?: (snapshot: GameSnapshot) => void): Promise<GameSnapshot>;
  continueRun(onProgress?: (snapshot: GameSnapshot) => void): Promise<GameSnapshot>;
  restart(): Promise<GameSnapshot>;
};

const errorNotices: Record<RuleErrorCode, string> = {
  GAME_NOT_ACTIVE: '当前阶段不能执行该操作',
  WRONG_PLAYER: '现在不是你的回合',
  INVALID_BID: '请选择有效叫分',
  BID_NOT_HIGHER: '叫分必须高于当前最高分',
  INVALID_PLAY: '所选牌不能组成合法牌型',
  CARD_NOT_OWNED: '所选牌不在你的手牌中',
  CANNOT_BEAT_CURRENT_PLAY: '所选牌无法压过桌面牌',
  CANNOT_PASS_WHEN_LEADING: '领出时不能不出',
  PLAYER_ALREADY_FINISHED: '你已出完手牌',
};

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function randomSeed(): number {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class LocalGameClient implements GameClient {
  private state: GameState;
  private publicEvents: GameEvent[] = [];
  private notice: string | null = null;
  private inFlight = false;
  private readonly fixedSeed: number | undefined;

  constructor(seed?: number, private readonly playDelayMs = 1_000) {
    this.fixedSeed = seed;
    this.state = createRun({ seed: seed ?? randomSeed() });
  }

  async getSnapshot(): Promise<GameSnapshot> {
    return this.snapshot();
  }

  async sendCommand(command: Command, onProgress?: (snapshot: GameSnapshot) => void): Promise<GameSnapshot> {
    if (this.inFlight) return this.snapshot('请等待当前操作完成');
    if (command.playerId !== 'A') return this.snapshot('只能提交玩家 A 的操作');

    this.inFlight = true;
    this.notice = null;
    try {
      const transition = dispatch(this.state, command);
      if (transition.error) {
        this.notice = errorNotices[transition.error];
        return this.snapshot();
      }

      this.state = transition.state;
      this.publicEvents.push(...transition.events);
      onProgress?.(this.snapshot());
      if (transition.events.some((event) => event.type === 'CARDS_PLAYED')) await wait(this.playDelayMs);
      await this.advanceAiUntilHumanTurn(onProgress);
      return this.snapshot();
    } finally {
      this.inFlight = false;
    }
  }

  async continueRun(onProgress?: (snapshot: GameSnapshot) => void): Promise<GameSnapshot> {
    if (this.inFlight) return this.snapshot('请等待当前操作完成');
    if (this.state.phase !== 'NEXT_HAND') return this.snapshot('当前没有待继续的手牌');

    this.inFlight = true;
    this.notice = null;
    try {
      const transition = startNextHand(this.state);
      if (transition.error) {
        this.notice = errorNotices[transition.error];
        return this.snapshot();
      }
      this.state = transition.state;
      this.publicEvents.push(...transition.events);
      onProgress?.(this.snapshot());
      await this.advanceAiUntilHumanTurn(onProgress);
      return this.snapshot();
    } finally {
      this.inFlight = false;
    }
  }

  async restart(): Promise<GameSnapshot> {
    if (this.inFlight) return this.snapshot('请等待当前操作完成');
    this.inFlight = true;
    try {
      this.state = createRun({ seed: this.fixedSeed ?? randomSeed() });
      this.publicEvents = [];
      this.notice = null;
      return this.snapshot();
    } finally {
      this.inFlight = false;
    }
  }

  private async advanceAiUntilHumanTurn(onProgress?: (snapshot: GameSnapshot) => void): Promise<void> {
    while (true) {
      if (this.state.phase === 'HAND_END') {
        const transition = settleHand(this.state);
        if (transition.error) throw new Error(`Could not settle hand: ${transition.error}`);
        this.state = transition.state;
        this.publicEvents.push(...transition.events);
        onProgress?.(this.snapshot());
        continue;
      }

      if (this.state.phase === 'NEXT_HAND' || this.state.phase === 'RUN_END') return;

      let actor: PlayerId;
      if (this.state.phase === 'BID') actor = this.state.bid.currentBidder;
      else if (this.state.phase === 'PLAY') actor = this.state.currentActor;
      else throw new Error(`Unsupported local game phase: ${this.state.phase}`);

      if (actor === 'A') return;
      const command = chooseAiCommand(viewForPlayer(this.state, actor));
      const transition = dispatch(this.state, command);
      if (transition.error) {
        throw new Error(`AI command rejected (${transition.error}): ${JSON.stringify(command)}`);
      }
      this.state = transition.state;
      this.publicEvents.push(...transition.events);
      onProgress?.(this.snapshot());
      if (transition.events.some((event) => event.type === 'CARDS_PLAYED')) await wait(this.playDelayMs);
      else await yieldToBrowser();
    }
  }

  private snapshot(overrideNotice = this.notice): GameSnapshot {
    return {
      view: structuredClone(viewForPlayer(this.state, 'A')),
      publicEvents: structuredClone(this.publicEvents),
      notice: overrideNotice,
      awaitingContinue: this.state.phase === 'NEXT_HAND',
    };
  }
}
