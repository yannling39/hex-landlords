# 斗地主前端 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive browser table where one human plays A against two local AIs through a complete three-hand Run.

**Architecture:** Vite builds a React/TypeScript browser client while the existing domain engine remains framework-free. A `GameClient` boundary owns full state and AI orchestration, returning only `PlayerView` plus public events to the UI; React submits `Command` values and renders the returned snapshots.

**Tech Stack:** Node.js 24, npm, Vite, React, TypeScript, Node `node:test`, React Testing Library, jsdom, and the existing `tsx` runner.

**Spec:** `docs/superpowers/specs/2026-09-25-landlord-frontend-design.md`

## Global Constraints

- “规则模块保持无 DOM、React、网络和浏览器存储依赖。”
- “React 视图状态只包含 `PlayerView`、选中的 `CardId[]`、本地提示及公开事件记录。”
- “不允许 UI 从完整 `GameState` 读取对手手牌、未公开底牌、重发牌或未来牌局。”
- “AI 只能收到各自的 `viewForPlayer` 结果。”
- “页面提供重新开始操作，重新开始使用确定的默认种子，方便复现验收过程。”
- “中文正文使用系统无衬线字体栈，以免依赖运行时网络字体；点数和花色在牌面上清晰呈现。”
- “所有按钮可键盘聚焦；键盘 Enter/Space 可触发，焦点样式清晰。按钮文字直接描述动作。”
- “刷新页面后是否恢复牌局不作保证；第一版不增加存储。”

## Review Focus

- AI loop stops at the human turn, terminal states, and the hand-result pause; it cannot dispatch a command for A or run past `NEXT_HAND`.
- UI and AI receive only their `PlayerView`; public event history contains no concealed cards before reveal.
- Human invalid commands preserve the current snapshot and selected card IDs while showing a readable message.
- Selected card buttons have stable dimensions and remain reachable in narrow viewports with keyboard focus visible.
- Repeated clicks while asynchronous AI actions run cannot submit duplicate commands or corrupt event order.

---

### Task 1: Browser build scaffold

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `src/web/main.tsx`
- Create: `src/web/App.tsx`
- Create: `src/web/styles.css`
- Create: `tests/web-scaffold.test.ts`

**Interfaces:**
- Expose `npm run dev` and `npm run build`; `npm run build` must type-check the existing domain/tests and produce the browser bundle.
- `App` initially renders the game-table root and a temporary accessible loading/new-game state. Later tasks replace the placeholder content without changing the entry point.

- [ ] **Step 1: Add a failing scaffold test** that checks `index.html` has the app mount node and module entry, and that `src/web/main.tsx` mounts `App`.
- [ ] **Step 2: Run RED** with `npm test`; expected failure is missing browser scaffold files.
- [ ] **Step 3: Add Vite, React, React DOM, their TypeScript types, and React Testing Library/jsdom development dependencies.** Add Vite React configuration, `index.html`, `main.tsx`, minimal `App.tsx`, and stylesheet. Set JSX compilation to `react-jsx`; update the test command to include both `tests/**/*.test.ts` and `tests/**/*.test.tsx`; make `build` run `tsc --noEmit && vite build`.
- [ ] **Step 4: Run GREEN** with `npm test` and `npm run build`; expected result is all existing and scaffold tests pass and Vite writes `dist/`.
- [ ] **Step 5: Commit** `feat: scaffold browser frontend`.

### Task 2: Local GameClient adapter

**Files:**
- Create: `src/web/game-client.ts`
- Create: `tests/game-client.test.ts`

**Interfaces:**
- Define `GameSnapshot = { view: PlayerView; publicEvents: GameEvent[]; notice: string | null; awaitingContinue: boolean }`.
- Define `GameClient = { getSnapshot(): Promise<GameSnapshot>; sendCommand(command: Command): Promise<GameSnapshot>; continueRun(): Promise<GameSnapshot>; restart(): Promise<GameSnapshot> }`.
- Implement `LocalGameClient(seed = 2026)`. It owns `GameState`, retains public events, returns only `viewForPlayer(state, 'A')`, drives B/C through `chooseAiCommand(viewForPlayer(state, playerId))`, settles a hand after `HAND_END`, pauses in `NEXT_HAND` until `continueRun`, and starts the next hand on that call.
- `restart()` resets the local engine with the same seed and clears event history. AI turns yield to the browser task queue between commands so the UI can paint its busy state.

- [ ] **Step 1: Write failing adapter tests** for initial A view, bid commands advancing AI to A's next turn, legal play and Pass routing, hand settlement pausing before the next hand, continuing through three hands, restart determinism, rejected command atomicity, public event ordering, and absence of opponent/future card IDs in snapshots.
- [ ] **Step 2: Run RED** with `npm test`; expected failures are missing `game-client.ts` exports.
- [ ] **Step 3: Implement `GameSnapshot`, `GameClient`, and `LocalGameClient`** using `createRun`, `dispatch`, `viewForPlayer`, `chooseAiCommand`, `settleHand`, and `startNextHand`. On reducer errors, return the unchanged view and a user-readable notice. Do not expose a `GameState` getter.
- [ ] **Step 4: Run GREEN** with `npm test` and `npm run build`.
- [ ] **Step 5: Commit** `feat: add local game client adapter`.

### Task 3: Responsive game table and public status

**Files:**
- Create: `src/web/components/GameTable.tsx`
- Create: `src/web/components/PlayerSeat.tsx`
- Create: `src/web/components/TrickArea.tsx`
- Create: `src/web/components/EventLog.tsx`
- Modify: `src/web/App.tsx`
- Modify: `src/web/styles.css`
- Create: `tests/web-table.test.tsx`

**Interfaces:**
- `GameTable` receives `{ snapshot: GameSnapshot; busy: boolean; selectedCardIds: CardId[]; onToggleCard(cardId: CardId): void; onBid(score: BidScore): void; onPlay(): void; onPass(): void; onContinue(): void; onRestart(): void }`.
- `PlayerSeat`, `TrickArea`, and `EventLog` receive display data only; none import `GameState`, `dispatch`, or AI functions.

- [ ] **Step 1: Write failing render tests** asserting three seat labels and counts, A's visible hand, hidden bottom cards before landlord selection, revealed bottom cards afterward, current turn status, public event text, and absence of `preparedDeals`/opponent hand values in rendered DOM.
- [ ] **Step 2: Run RED** with `npm test`; expected failures are missing component exports.
- [ ] **Step 3: Implement table components** with desktop opponent positions, central trick/turn area, A hand and controls along the bottom, and narrow-screen vertical layout. Apply approved color tokens, stable card geometry, red/black suit treatment, visible focus, and reduced-motion behavior.
- [ ] **Step 4: Run GREEN** with `npm test` and `npm run build`.
- [ ] **Step 5: Commit** `feat: render responsive landlord game table`.

### Task 4: Human bidding, card selection, and actions

**Files:**
- Create: `src/web/components/BidControls.tsx`
- Create: `src/web/components/PlayerHand.tsx`
- Create: `src/web/components/PlayControls.tsx`
- Modify: `src/web/App.tsx`
- Modify: `src/web/components/GameTable.tsx`
- Modify: `tests/web-table.test.tsx`

**Interfaces:**
- `PlayerHand` toggles exact `CardId` values and displays selected state without changing card dimensions.
- `BidControls` emits `BidScore`; available choices are 0 and positive scores strictly greater than `snapshot.view.bid.highestBid`.
- `PlayControls` emits `PLAY` or `PASS` intents; Pass is unavailable when `view.lastPlay` is null. The app constructs commands for A and sends them only through `GameClient.sendCommand`.

- [ ] **Step 1: Add failing interaction tests** for selecting/deselecting multiple cards, legal ascending bid options, bidding only on A's turn, playing the selected IDs, refusing an empty selection, Pass while following, no Pass while leading, and disabled duplicate actions while busy.
- [ ] **Step 2: Run RED** with `npm test`; expected failures are missing interactive controls/handlers.
- [ ] **Step 3: Implement selection and action controls** in React state. Keep selections when a command is rejected, clear them after accepted plays, preserve the returned snapshot on rejection, display the adapter notice, and set/clear busy state around each Promise.
- [ ] **Step 4: Run GREEN** with `npm test` and `npm run build`.
- [ ] **Step 5: Commit** `feat: add human bidding and play controls`.

### Task 5: Hand settlement, Run result, continue, and restart

**Files:**
- Create: `src/web/components/HandResult.tsx`
- Create: `src/web/components/RunResult.tsx`
- Modify: `src/web/App.tsx`
- Modify: `src/web/components/GameTable.tsx`
- Modify: `tests/web-table.test.tsx`

**Interfaces:**
- When `snapshot.awaitingContinue` is true, show the settled hand's winner, multiplier, and score changes with a Continue action.
- When `snapshot.view.phase === 'RUN_END'`, show final scores and winner/tie with a Restart action.
- Continue calls `GameClient.continueRun()`; Restart calls `GameClient.restart()`; neither component changes engine state directly.

- [ ] **Step 1: Add failing UI tests** for hand result content and pause, next hand bidding after Continue, final Run result/tie, and deterministic restart restoring A's initial hand and event log.
- [ ] **Step 2: Run RED** with `npm test`; expected failures are missing result views and handlers.
- [ ] **Step 3: Implement result views and transitions** and ensure the first view after Continue is either A's turn or a busy state while B/C act.
- [ ] **Step 4: Run GREEN** with `npm test` and `npm run build`.
- [ ] **Step 5: Commit** `feat: add hand and run result flows`.

### Task 6: Browser QA and run instructions

**Files:**
- Modify: `README.md`

**Interfaces:**
- `npm run dev` starts Vite on an available local port and prints its URL.
- README documents install, test, build, browser-run commands, and the human-A-versus-two-AI scope.

- [ ] **Step 1: Start the dev server** with `npm run dev -- --host 127.0.0.1`; confirm Vite prints a local URL.
- [ ] **Step 2: Verify browser workflows** at desktop and narrow mobile sizes: initial hand, call/pass bidding, reveal bottom cards, select/play, follow/pass, hand result, continue, final Run result, restart, and visible rule rejection feedback. Confirm the console has no uncaught error and inspect screenshots for overlap or clipped cards.
- [ ] **Step 3: Fix any browser-observed defect** by adding a failing component test first, then apply the smallest fix and rerun that test.
- [ ] **Step 4: Run final verification** with `npm test`, `npm run build`, and a fresh `npm run dev` browser smoke. Confirm `git diff --check` is clean.
- [ ] **Step 5: Commit** `feat: complete landlord browser MVP`.

## Spec Coverage Self-Review

- Human A versus B/C AI, fixed seed, restart, bid/redeal, bottom reveal, card selection, play, Pass, hand settlement and three-hand Run: Tasks 2, 4, and 5.
- `GameClient` boundary, hidden information, AI authority and future remote replacement: Tasks 2 and 3; adapter tests assert hidden IDs are absent.
- Responsive table, palette, stable card size, keyboard focus, reduced motion and actionable messages: Tasks 3 and 4; desktop/mobile browser verification is Task 6.
- Error atomicity, async duplicate action protection and public event history: Tasks 2 and 4.
- Vite development server, browser build and existing engine regressions: Tasks 1 and 6.
