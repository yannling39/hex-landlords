# SDD ledger — plan: docs/superpowers/plans/2026-09-25-landlord-engine.md

BASE: f2833f8 (feature branch created from main after spec and plan commit)

## Pre-flight shared interfaces

- Task 1 -> Task 4: `Card`, seeded `RandomSource`, `shuffle`, and `dealHand` feed deterministic Run setup. No signature conflict; Task 4 pre-generates private deal queue at Run creation.
- Task 2 -> Task 5: classifier and comparator validate exact submitted cards. No signature conflict; `Pattern` carries type, main rank, sequence length, attachment mode, and card count.
- Task 2 -> Task 8: classifier/comparator are reused for legal play enumeration. No signature conflict; enumeration will be bounded by 20-card hand size.
- Task 3 -> Tasks 4-7: serializable state, commands, events, and errors are shared. Ruling: Task 3 owns the stable data shape; later tasks may add optional fields only with tests and corresponding spec-compatible meanings.
- Task 4 -> Task 5: bidding/setup determines landlord, hands, bottom reveal, and initial actor. No signature conflict; `dispatch` will delegate BID actions to the Task 4 bidding transition.
- Task 5 -> Tasks 6, 7, 8, 9: game reducer produces hand/run states and public events. No conflict; settlement will be a reducer helper, view projection explicitly allowlists fields, AI emits commands, CLI only dispatches commands.

## Task progress

Task 1: complete
Task 2: complete
Task 3: complete
Task 4: complete
Task 5: complete
Task 6: in progress
Task 7: not started
Task 8: not started
Task 9: not started

Task 2: Ruling: ambiguous airplane card sets use the valid interpretation with the highest main rank — the GDD and spec do not prescribe a canonical interpretation when the exact cards admit multiple consecutive triple cores; this gives the single-pattern classifier deterministic behavior — cost if wrong: a player may be unable to request another legal interpretation of the same selected card set.
Task 3: Ruling: use `npm run build` as the RED gate for missing type-only modules — `tsx` erases type-only imports so `npm test` passes without runtime modules; the compiler caught the missing type declarations before implementation — cost if wrong: the build gate could miss a runtime defect, which the JSON behavior tests continue to cover.
Task 3: Plan note: `createRun` was intentionally verified in Task 4's behavioral tests because its setup API did not exist when the state protocol types were introduced.
Task 1: complete (commits f2833f8..e3982c1, tests: npm test → ℹ duration_ms 136.1336)
Task 2: complete (commits e3982c1..2dada3f, tests: npm test → ℹ duration_ms 136.0793)
Task 3: complete (commits 2dada3f..5eabda3, tests: npm test → ℹ duration_ms 140.9494)
Task 4: complete (commit 213f877, tests: npm test → 32 passed; npm run build → passed)
Task 5: complete (commit 1699227, tests: npm test → 39 passed; npm run build → passed)
