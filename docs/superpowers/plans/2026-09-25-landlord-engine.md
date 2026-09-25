# 斗地主底层逻辑实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以 TypeScript 实现确定性、可序列化的斗地主规则引擎，并通过命令行让三个本地 AI 跑完 GDD v1.2 定义的三手 Run。

**Architecture:** 领域规则保持纯函数；初始化器负责种子随机与预生成牌局，`dispatch(state, command)` 负责确定性状态转移。CLI 和 AI 只发出命令；对外状态必须经过 `viewForPlayer` 投影，避免未来房主服务器泄漏手牌。

**Tech Stack:** Node.js 24、TypeScript、npm、`tsx`、TypeScript 编译器、Node.js 内置 `node:test`。

**Spec:** `docs/superpowers/specs/2026-09-25-landlord-engine-design.md`

## Global Constraints

- 规则模块不依赖 DOM、浏览器 API、React 或网络传输。
- `dispatch` 不读取系统时间、不生成随机数、不执行 IO。
- 创建 Run 时用注入的固定种子随机源预生成三手及每手最多两次重发所需的分配。
- 所有玩家动作通过序列化 `Command` 输入；失败命令返回稳定错误码且不改变状态。
- 当前玩家视图不得包含其他玩家手牌、未公开的重发牌或未来牌局数据。
- MVP 支持 54 张牌及规格中列出的牌型，包括飞机带两对对子、四带二带两对对子。
- 海克斯关闭；不实现 UI、网络、春天/反春天或加倍。
- 每个任务遵循 RED、GREEN、REFACTOR：先写失败测试并运行确认，再写最少实现并运行通过。

## Review Focus

- 多个连续三张主体或重复 rank 可能产生歧义牌型：由牌型用例锁定合法候选和主体选择。
- 四带二和飞机的对子翼不能占用主体 rank，且对子翼之间必须不同：由牌型边界测试锁定。
- 全员不叫重发时不能复用已经消费的牌分配或超过重发次数：由叫地主状态测试锁定。
- 两名农民连续 Pass 后应回到最后有效出牌者，而非轮到 Pass 玩家：由牌权测试锁定。
- 客户端视图、非法命令和 JSON 往返可能暴露隐藏信息或改变状态：由视图投影、拒绝命令原子性和序列化测试锁定。

---

### Task 1: TypeScript 项目骨架和牌组

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/domain/card.ts`
- Create: `src/domain/random.ts`
- Create: `src/domain/deck.ts`
- Create: `tests/deck.test.ts`

**Interfaces:**
- Produces: `Card`, `CardId`, `Suit`, `Rank`, `RandomSource`, `createSeededRandom(seed)`, `createDeck()`, `shuffle(cards, random)`, `dealHand(cards)`。
- `dealHand` 返回 `hands: [Card[], Card[], Card[]]` 和 `bottom: Card[]`。

- [ ] **Step 1: Write failing tests** for 54 unique IDs, 17/17/17/3 deal sizes, card conservation, and identical shuffle output for the same seed.
- [ ] **Step 2: Run RED** with `npm test`; expected failures are missing exports.
- [ ] **Step 3: Implement minimal card, seeded PRNG, Fisher-Yates shuffle, and deal functions.** Use a deterministic PRNG with documented algorithm and normalize its output to `[0, 1)`.
- [ ] **Step 4: Run GREEN** with `npm test` and `npm run build`.
- [ ] **Step 5: Commit** `feat: add deterministic card deck and dealing`.

### Task 2: 斗地主牌型识别和比较

**Files:**
- Create: `src/domain/pattern.ts`
- Create: `src/domain/compare.ts`
- Create: `tests/pattern.test.ts`
- Create: `tests/compare.test.ts`

**Interfaces:**
- Consumes: `Card`, `Rank`, `CardId` from Task 1.
- Produces: `PatternType`, `Pattern`, `classifyCards(cards): Pattern | null`, `comparePatterns(challenger, current): -1 | 0 | 1`。
- `Pattern` contains `type`, `mainRank`, `sequenceLength`, `attachmentMode`, and `cardCount`.

- [ ] **Step 1: Write failing examples** for every supported pattern: single, pair, triple, triple-single, triple-pair, straight, consecutive pairs, airplane-single, airplane-pairs, four-two-singles, four-two-pairs, bomb, and rocket.
- [ ] **Step 2: Run RED** with `npm test`; expected failures are missing classifier/comparator exports.
- [ ] **Step 3: Implement classification** by enumerating valid core ranks and checking the exact submitted card multiset; reject duplicate CardIds, 2/wildcards in sequences, invalid wings, and malformed counts.
- [ ] **Step 4: Write and run failing comparison tests** for same-type higher main rank, sequence length mismatch, cross-type rejection, bomb dominance, bomb rank, and rocket dominance.
- [ ] **Step 5: Implement comparisons** so airplane-single and airplane-pairs are distinct, and four-two-singles and four-two-pairs are distinct. Pair wings must use distinct ranks outside the core; airplane-single wings may contain a pair but no triple.
- [ ] **Step 6: Run GREEN** with the full test suite and build.
- [ ] **Step 7: Commit** `feat: classify and compare landlord patterns`.

### Task 3: Commands, events, errors, and JSON-safe state

**Files:**
- Create: `src/domain/commands.ts`
- Create: `src/domain/events.ts`
- Create: `src/domain/errors.ts`
- Create: `src/domain/state.ts`
- Create: `tests/state-serialization.test.ts`

**Interfaces:**
- Produces: stable `PlayerId`, discriminated `Command`, discriminated `GameEvent`, `RuleErrorCode`, `GameState`, and `Transition` types.
- `Transition` is `{ state: GameState; events: GameEvent[]; error?: RuleErrorCode }`.

- [ ] **Step 1: Write failing tests** for JSON stringify/parse round trip of initialized state and for command/event discriminant shapes.
- [ ] **Step 2: Run RED** with `npm test`.
- [ ] **Step 3: Add only serializable data types.** Represent card identity as strings or numeric IDs; do not put functions, `Map`, `Set`, or PRNG objects in state.
- [ ] **Step 4: Run GREEN** with tests and build.
- [ ] **Step 5: Commit** `feat: define serializable game protocol types`.

### Task 4: Run initialization and bidding

**Files:**
- Create: `src/domain/setup.ts`
- Create: `src/domain/bidding.ts`
- Create: `tests/bidding.test.ts`

**Interfaces:**
- Consumes: Task 1 deck/random APIs and Task 3 state/protocol types.
- Produces: `createRun({ seed }): GameState`, `applyBid(state, command): Transition`。
- Setup pre-generates three initial deals plus up to two redeals for each hand. The queue remains server-private inside `GameState` and is removed by player projection.

- [ ] **Step 1: Write failing tests** for first bidder order A/B/C by hand, legal bids 0-3, strictly increasing positive bids, immediate 3-point landlord, all-pass redeal twice, third all-pass automatic landlord at 1, bottom-card transfer, and deterministic seed.
- [ ] **Step 2: Run RED** with `npm test`.
- [ ] **Step 3: Implement initialization and bidding** as deterministic state changes. Invalid bids must return an error and preserve state byte-for-byte after JSON serialization.
- [ ] **Step 4: Run GREEN** with tests and build.
- [ ] **Step 5: Commit** `feat: add deterministic run setup and bidding`.

### Task 5: Play reducer, turn order, and hand ending

**Files:**
- Create: `src/domain/play.ts`
- Create: `src/domain/game.ts`
- Create: `tests/play.test.ts`
- Create: `tests/game.test.ts`

**Interfaces:**
- Consumes: Task 2 pattern/comparison APIs and Task 3 protocol/state types.
- Produces: `dispatch(state, command): Transition` for `BID`, `PLAY`, and `PASS`.
- `PLAY` takes exact `CardId[]`; it validates ownership, classification, response comparison, and current player before removing cards.

- [ ] **Step 1: Write failing tests** for landlord leading, valid follow, invalid off-turn action, invalid pattern, cannot pass while leading, pass while following, and no mutation on every rejected command.
- [ ] **Step 2: Run RED** with `npm test`.
- [ ] **Step 3: Implement legal `PLAY` transitions** and emit public events for cards played and turn changes.
- [ ] **Step 4: Write failing pass tests** for one pass retaining the trick, two opponents passing closing the trick, leader regaining lead, and pass counter reset.
- [ ] **Step 5: Implement `PASS` transitions** and close the trick after two consecutive opponents pass.
- [ ] **Step 6: Write failing hand-end tests** for landlord win, either farmer win, and immediate end when a player empties their hand.
- [ ] **Step 7: Implement hand completion** and transition to `HAND_END` without waiting for remaining responses.
- [ ] **Step 8: Run GREEN** with the full test suite and build.
- [ ] **Step 9: Commit** `feat: implement play turns and trick resolution`.

### Task 6: Scoring and three-hand Run lifecycle

**Files:**
- Create: `src/domain/scoring.ts`
- Modify: `src/domain/game.ts`
- Create: `tests/scoring.test.ts`
- Create: `tests/run-lifecycle.test.ts`

**Interfaces:**
- Consumes: `GameState`, `GameEvent`, and hand winner from Task 5.
- Produces: `settleHand(state): Transition` and lifecycle transition to `HEX_DRAFT` only when enabled, otherwise `NEXT_HAND`/`RUN_END`.

- [ ] **Step 1: Write failing scoring tests** for landlord win/loss, both farmers' amounts, bid score as base score, and each bomb/rocket doubling multiplier.
- [ ] **Step 2: Run RED** with `npm test`.
- [ ] **Step 3: Implement zero-sum hand scoring** and immutable settlement events.
- [ ] **Step 4: Write failing lifecycle tests** for three hands, rotating first bidder, consuming the next pre-generated deal, hex disabled bypass, and run winner/tie.
- [ ] **Step 5: Implement next-hand/run-end transitions** without adding hex effects.
- [ ] **Step 6: Run GREEN** with tests and build.
- [ ] **Step 7: Commit** `feat: settle hands and complete run lifecycle`.

### Task 7: Player view projection and information hiding

**Files:**
- Create: `src/domain/player-view.ts`
- Create: `tests/player-view.test.ts`

**Interfaces:**
- Consumes: full internal `GameState` from Task 3 onward.
- Produces: `viewForPlayer(state, playerId): PlayerView` with only that player's hand, other hand counts, public bottom cards, public bids/plays/scores, and current turn.

- [ ] **Step 1: Write failing tests** asserting the requested player's hand is visible, opponents' cards and pending redeal/future deal data are absent, and public bottom cards appear only after reveal.
- [ ] **Step 2: Run RED** with `npm test`.
- [ ] **Step 3: Implement explicit projection** by constructing a new object from allowed fields; never spread the full state into the view.
- [ ] **Step 4: Run GREEN** with tests and build.
- [ ] **Step 5: Commit** `feat: project player-safe game views`.

### Task 8: Legal play enumeration and baseline AI

**Files:**
- Create: `src/domain/legal-plays.ts`
- Create: `src/domain/ai.ts`
- Create: `tests/ai.test.ts`
- Create: `tests/legal-plays.test.ts`

**Interfaces:**
- Consumes: `PlayerView`, `Pattern`, `comparePatterns`, and `Command`.
- Produces: `listLegalPlays(hand, currentPattern): CardId[][]`, `chooseAiCommand(view): Command`.

- [ ] **Step 1: Write failing tests** for candidate legality, smallest beating play selection, Pass when no beating play exists, no Pass when leading, and no access to opponents' card values.
- [ ] **Step 2: Run RED** with `npm test`.
- [ ] **Step 3: Implement candidate enumeration** bounded by the maximum 20-card landlord hand. Classify each exact combination, discard invalid patterns, and compare against the current pattern.
- [ ] **Step 4: Implement deterministic baseline AI**: legal minimum bid heuristic, smallest legal lead, smallest beating response, otherwise Pass; preserve bombs unless needed by the simple rule.
- [ ] **Step 5: Run GREEN** with tests and build.
- [ ] **Step 6: Commit** `feat: add legal play enumeration and baseline AI`.

### Task 9: CLI demo and end-to-end verification

**Files:**
- Create: `src/cli/demo.ts`
- Modify: `package.json`
- Create: `tests/full-run.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `createRun`, `chooseAiCommand`, `dispatch`, and `viewForPlayer`.
- Produces: `npm run demo` output for a deterministic three-hand Run.

- [ ] **Step 1: Write a failing integration test** that runs a fixed-seed three-AI Run with a bounded command count and asserts `RUN_END`, three hand settlements, and stable result for the same seed.
- [ ] **Step 2: Run RED** with `npm test`.
- [ ] **Step 3: Implement the CLI driver** using only commands and player-safe views. Print bids, revealed bottom cards, played cards, passes, multiplier changes, and settlements; never print hidden hands or undealt future cards.
- [ ] **Step 4: Add `npm run demo`** and concise setup/run instructions in `README.md`.
- [ ] **Step 5: Run final verification**: `npm test`, `npm run build`, and two `npm run demo` executions; compare deterministic output and confirm both finish.
- [ ] **Step 6: Commit** `feat: run deterministic landlord demo`.

## Spec Coverage Self-Review

- Deck, seeded shuffle, and 17/17/17/3 deal: Task 1 and Task 4.
- Every listed pattern, exact submitted card IDs, wings, and comparison: Task 2.
- Commands/events/errors and JSON-safe state: Task 3.
- Bidding, redeals, landlord bottom cards, and turn rotation: Task 4 and Task 6.
- Play legality, pass reset, landlord/farmer victory: Task 5.
- Scoring, bombs/rocket multipliers, three-hand Run, and hex-off flow: Task 6.
- No hidden information in client views: Task 7 and Task 9.
- AI and automatic full Run: Tasks 8 and 9.
- The plan does not implement UI, network transport, web sockets, or hex effects, matching the spec exclusions.
