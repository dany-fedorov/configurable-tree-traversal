# Task 7 / F09 report

Date: 2026-10-29. Worktree: `/home/df/.codex/worktrees/04b4/configurable-tree-traversal`; branch: `feat/api-clarity-migration`; base: `7450f4061b9929a6160083667b02b805b4ec4bfc`.

Local commit: `3c103a40f33a6232f5683df305226f23912e9b55` (`fix: apply event selection consistently at delivery`). Post-commit status contains only the two pre-existing protected review artifacts.

## Contract and implementation

- All tree/DAG/walking selectors apply at delivery. Tree/DAG commit records every semantically valid observation regardless of the admitted emission selector; sync driver delivery and async session buffered delivery consult the current kernel selection. Suppressed records are acknowledged and consumed. No callbacks, resolutions or W/C transitions replay to satisfy a selector.
- Previously unselected observations retained during pause/close remain selectable on a later lease; previously selected buffered observations can be suppressed. Deferred settlement records W independently of the original selector. Normal `run()` drains the same boundaries and preserves completion behavior.
- Callback admission snapshots remain independent. `visitorPhases` patches do not change already admitted callback chains. Top-level inspection `executionOptions.emitEvents` governs delivery; chain `executionOptions.emitEvents` is historical. Pending/buffered counts include unselected observations and are not additive unique counts.
- Synthetic holders and seeded W facts still bypass work-event creation; omission/deletion/visibility guards are unchanged. Strengthened seeded-root low-level regression proves only child W and child/root C records arise after settlement. Existing synthetic/identity/seed/public-facet regressions pass.
- `SelectedTraversalEvent<Event, Kind>` and required-selector overloads narrow public concrete runners and execution capabilities; empty arrays yield `never`. Omitted, undefined and statically optional selectors remain broad. Literal/enum conversion preserves walking kind literals. Data/ID parameters and readonly observation facets remain intact. Dedicated no-argument overloads preserve heterogeneous-family ordinary iteration. Mixed overloaded unions can retain broad inference; this conservative limitation is documented.
- Walking sessions/kernel/resource behavior is untouched. Walking runner declaration changes add only no-argument overloads; existing `GraphWalkEventFor` narrowing remains intact.
- Strict options/getter-once/undefined patch behavior and event snapshot versus live-handle identity are unchanged. No timing-policy option or compatibility aliases added. No F03 authority was reintroduced.

## RED / GREEN evidence

Every command ran with explicit workdir and `login:false`. Worktree writes/tests were authorized escalations outside the root workspace. Logs below live beside this report.

1. RED: `npm test -- tests/execution-selection.test.ts tests/delivery-selection.test.ts tests/dag-deferred-settlement.test.ts tests/async-dag-lifecycle.test.ts` → 15 intended failures in the existing 296 tests (admitted-selector leakage/suppression and settlement leakage); new-suite test.each argument shape initially needed correction. Log: `task-7-red-runtime.log`.
2. Corrected new public regression RED: `npm test -- tests/delivery-selection.test.ts` → 8 failed, 6 passed. Failures establish initially unselected buffering, changed buffered delivery and settlement under empty admission selection. Walking comparison already passed. Log: `task-7-red-buffering.log`.
3. Type RED: `npm run typecheck` → selected tree phases, empty selections, DAG kinds and common walking capability records remained broad (six diagnostics). Log: `task-7-red-types.log`.
4. Runtime GREEN: affected four public suites → 310 passed. Log: `task-7-runtime-iteration-2.log`.
5. Focused GREEN: `npm run typecheck` succeeded (`task-7-types-green.log`); `npm test -- tests/execution-selection.test.ts tests/delivery-selection.test.ts tests/dag-deferred-settlement.test.ts tests/async-dag-lifecycle.test.ts tests/execution-capabilities.test.ts tests/graph-walk-selection.test.ts tests/async-graph-walk-lifecycle.test.ts tests/async-runner-session.test.ts tests/async-driver.test.ts tests/sync-driver.test.ts` → 10 suites, 410 tests passed (`task-7-focused-green.log`).
6. First full source boundary: 100% statements/branches/functions/lines; 3,093 passed and seven superseded expectations failed. Five failures required direct-kernel tests to acknowledge now-recorded unselected observations; two guarded-frontier cases expected settlement W to disappear because its admitted selector was empty. Public expectations now assert the selected W record. Log: `task-7-check-3.log`.
7. Migrated-suite GREEN: `npm test -- tests/dag-inspection.test.ts tests/dag-guarded-frontier.test.ts tests/kernel-transitions.test.ts tests/prerequisite-kernel.test.ts` → 4 suites, 73 tests passed (`task-7-migrated-green.log`).
8. Restored walking’s original specialized declarations plus no-arg overloads: `npm run typecheck` → exit 0 (`task-7-walking-types.log`).
9. Final `npm run check` → exit 0 (`task-7-check-final.log`):
   - Typecheck and lint passed.
   - **134 suites / 3,100 tests passed; 100% statements, branches, functions and lines.**
   - **22 TypeScript examples verified.**
   - Build and packed runtime fixtures passed, including new delivery-selection CJS/ESM checks and existing supported/denied imports, observation facets, ticket/revision/DAG/walking contracts.
   - Type consumers **TypeScript 4.9.5**, node resolution `.ts`, node16 `.ts/.cts/.mts` passed, including new selected-kind/empty/default/facet/ID and root/DAG/core-subpath assertions.
   - Guide navigation in checkout/tarball and **24 standalone snippets** verified; package has 792 files; Node v24.20.0.
   - **25 benchmark tests** and **7 packaging tests** passed.
10. `git diff --check` → exit 0. During final documentation review, one remaining ambiguous historical timing sentence was tightened and an extra blank line removed; no code, links, snippets or package-file entries changed afterward.

Iteration logs retain the intermediate compile failures (missing async tree kernel closure, overloaded union inference, formatter-moved `@ts-expect-error` directives) and one type-fixture lint failure. These were resolved; no test/coverage gates were weakened. Source generation/buffering and delivery behavior are independently covered, not merely queue-filtered after admission suppression.

## Self-review and scope

Reviewed generation, sync delivery, async FIFO filtering/acknowledgement, projected family selectors, public/interface variance, enum/literal normalization, default/optional broad results, documentation snapshots, migrated legacy expectations and packed fixtures. New public runtime tests cover six-family paused chains, three async buffered paths with both initial-selector states, sync/async settlement under empty admission selection, callback counts/no replay, independent visitor selection, terminal/paused/awaitingSettlement states, and sync/async walking with default selection and limited outcome.

No new semantic rulings or unresolved implementation blockers. Conservative heterogeneous-union inference is documented. TypeScript 4.7.4 floor verification was not claimed here; Task 8 dispatch explicitly owns that final packed compiler audit. Local commit only; no push, merge or publish. Original checkout and protected untracked review artifacts were not modified. No subagents were spawned.

## Changed files

- `AGENTS.md`
- `docs/agent-workflows.md`
- `docs/index.md`
- `docs/migration-idiomatic-api.md`
- `docs/migration-uniform-api.md`
- `docs/reference.md`
- `docs/testing.md`
- `scripts/verify-package.cjs`
- `src/core/CoreInspection.ts`
- `src/core/TraversalExecution.ts`
- `src/core/TraversalKernel.ts`
- `src/core/drivers/AsyncRunnerSession.ts`
- `src/core/drivers/runAsync.ts`
- `src/core/drivers/runSync.ts`
- `src/core/effects/types.ts`
- `src/core/index.ts`
- `src/core/kernelTypes.ts`
- `src/traversals/breadth-first-traversal/lib/AsyncBreadthFirstTraversalRunner.ts`
- `src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunner.ts`
- `src/traversals/dag-traversal/lib/AsyncDagTraversalRunner.ts`
- `src/traversals/dag-traversal/lib/DagTraversalRunner.ts`
- `src/traversals/depth-first-traversal/lib/AsyncDepthFirstTraversalRunner.ts`
- `src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner.ts`
- `src/traversals/graph-walk/AsyncGraphWalkRunner.ts`
- `src/traversals/graph-walk/GraphWalkRunner.ts`
- `tests/async-dag-lifecycle.test.ts`
- `tests/async-runner-session.test.ts`
- `tests/dag-deferred-settlement.test.ts`
- `tests/dag-guarded-frontier.test.ts`
- `tests/dag-inspection.test.ts`
- `tests/execution-capabilities.test.ts`
- `tests/execution-selection.test.ts`
- `tests/kernel-transitions.test.ts`
- `tests/prerequisite-kernel.test.ts`
- `examples/event-delivery-selection-example.ts`
- `scripts/package-consumers/delivery-selection.mjs`
- `scripts/package-consumers/delivery-selection.ts`
- `tests/delivery-selection.test.ts`
- `tests/delivery-selection.typecheck.ts`
