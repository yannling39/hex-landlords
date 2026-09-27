# Six-Hand Hex Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run six hands with drafts before hands 1 and 3, then make all six personal hexes playable by human and AI.

**Architecture:** Keep `dispatch` authoritative and JSON-serializable. Extend the existing state reducer with per-hand hex runtime state and explicit play declarations; share one resolved-play path between command validation and legal-action generation.

**Tech Stack:** TypeScript, Node test runner via tsx, React/Vite.

**Spec:** `docs/superpowers/specs/2026-09-27-six-hand-hex-rules-design.md`

## Global Constraints

- One Run has six hands; first bidders are A/B/C/A/B/C.
- Each player drafts one personal hex before hand 1 and one before hand 3, accumulating two distinct picks.
- No hidden cards or future deals appear in player views during drafts.
- Hex effects preserve normal bomb/rocket precedence and reject invalid commands atomically.
- No new dependency is required.

## Review Focus

- Initial and third-hand drafts must not expose current or future cards.
- A rejected declaration must not consume a hex charge.
- Two players with crown singles must compare equal.
- Pass with abandon must keep card accounting and trick progression correct.
- Legal actions generated for AI must always be accepted by `dispatch`.

---

### Task 1: Six-Hand Lifecycle and Draft Timing

**Files:** `src/domain/{setup,state,scoring,hex,player-view}.ts`, `src/web/{game-client,components/GameTable,components/RunResult}.tsx`, `tests/{run-lifecycle,game-client,full-run,state-serialization}.test.ts`.

**Interfaces:** `handNumber: 1 | 2 | 3 | 4 | 5 | 6`; `createRun({seed,hexEnabled})`; `settleHand`, `startNextHand`, and `SELECT_HEX` retain their signatures.

- [x] Write lifecycle tests for six hands, drafts before hands 1/3, two picks per player, and hidden draft hands.
- [x] Run targeted tests and observe the expected failures.
- [x] Expand prepared deals and hand-number types; route enabled runs through draft before BID at hands 1/3; keep disabled runs direct to BID.
- [x] Update UI six-hand copy and affected existing assertions.
- [x] Run targeted tests and the full suite; verify disabled and enabled runs terminate.

### Task 2: Hex Definitions and Resolved Play Contract

**Files:** `src/domain/{hex,state,commands,events,errors,pattern,compare,play}.ts`, `tests/{pattern,compare,play}.test.ts`, new `tests/hex-rules.test.ts`.

**Interfaces:** stable `HexId`; optional tagged `PLAY` declaration; `PASS` optional `discardCardId`; resolved `PlayedMove` includes actual cards and interpreted pattern.

- [x] Write failing tests for a holder versus nonholder, declarations, ordinary response, resource consumption, and invalid-command atomicity.
- [x] Run the tests to confirm expected failures.
- [x] Implement a single authoritative resolution path for resonance, broken straight, same color, reverse flow, abandon, and crown comparison.
- [x] Run targeted tests and the full suite; keep baseline plays unchanged without hexes.

### Task 3: Crown Setup and Per-Hand Resource Reset

**Files:** `src/domain/{bidding,game,hex,state,scoring,player-view,commands,events}.ts`, new `tests/hex-lifecycle.test.ts`.

**Interfaces:** `KING_DESIGNATE` phase and command; per-hand uses and designated card IDs in `GameState`.

- [x] Write failing tests for designation after bottom cards, multiple holders, invalid ID rejection, use in a combo, and next-hand reset.
- [x] Run the tests to confirm expected failures.
- [x] Add designation stage and public event, then reset charges and physical-card bindings on each new hand.
- [x] Run targeted tests and the full suite.

### Task 4: Legal Actions and AI

**Files:** `src/domain/{legal-plays,ai,player-view}.ts`, `src/cli/run.ts`, `tests/{legal-plays,ai,full-run}.test.ts`.

**Interfaces:** legal actions carry exact IDs and declaration; AI submits one of those actions via `dispatch`.

- [x] Write failing tests that generated special actions are accepted by `dispatch` and that AI advances drafts/designation/play without stalling.
- [x] Run the tests to confirm expected failures.
- [x] Enumerate declared actions by relevant rank/color groups and select them with bounded AI heuristics; support full six-hand CLI runs.
- [x] Run targeted tests, full suite, and deterministic full-run smoke test.

Verification: `npm test` passes 93 tests; `npm run build` passes. Fixed seed 41 completes six hex-enabled hands twice with identical results, two picks per player, and logged hex actions. Ordinary play generation retains the baseline enumerator; resonance uses representative rank-count subsets to avoid equivalent suit permutations. Human special-play controls remain Task 5.

### Task 5: Browser Controls and Documentation

**Files:** `src/web/{App,game-client,components/GameTable,components/HexDraft,components/PlayControls,components/PlayerHand,components/TrickArea,components/EventLog,components/RunResult}.tsx`, `README.md`, `tests/{web-table,game-client}.test.tsx`.

**Interfaces:** player can draft, designate a crown card, declare a special play, reverse a lead, and abandon on pass.

- [x] Write component/client tests for the new command routes and public effect display.
- [x] Run focused component/client tests during implementation.
- [x] Add compact contextual controls and clear resolved-play feedback; update Run copy and README.
- [x] Run full tests and build; inspect desktop/mobile in browser for layout and interaction failures.

Verification: `npm test` passes 99 tests; `npm run build` passes. In browser, drafted and played a declared resonance pair, then confirmed its physical cards and declaration appear on the table and in the event log. Checked desktop and 390px mobile layout, including control widths and horizontal overflow; browser console showed no errors.
