# Task 7 review — F09

## Spec compliance

- ✅ **Spec compliant.** Reviewed base `7450f4061b9929a6160083667b02b805b4ec4bfc` through head `3c103a40f33a6232f5683df305226f23912e9b55` against the Task 7 brief, global/F09 requirements, forward note and implementation report.
- Recording no longer depends on the admitted emission selector (`src/core/TraversalKernel.ts:1352`); synchronous delivery filters before yielding (`src/core/drivers/runSync.ts:35`), and asynchronous buffered delivery filters before consuming a waiter, acknowledging suppressed observations (`src/core/drivers/AsyncRunnerSession.ts:255`). This covers both previously selected and previously unselected observations without replaying callbacks or milestones.
- Deferred settlement uses the same commit path (`src/core/TraversalKernel.ts:822`), and admitted callbacks retain copied configuration (`src/core/TraversalKernel.ts:1936`). Public regressions cover reselection, draining, callback counts, settlement, empty selectors and terminal states (`tests/delivery-selection.test.ts:65`, `tests/delivery-selection.test.ts:121`, `tests/execution-selection.test.ts:241`).
- Required selectors narrow concrete and capability iterators; empty selections yield `never`, omitted/undefined/optional selections remain broad, and family/ID/facet types remain represented (`src/core/TraversalExecution.ts:12`, `tests/delivery-selection.typecheck.ts:64`, `scripts/package-consumers/delivery-selection.ts:173`). Dedicated no-argument overloads preserve ordinary mixed-family iteration (`tests/delivery-selection.typecheck.ts:167`).
- Historical chain emission configuration is explicitly distinguished from the current delivery selector (`src/core/CoreInspection.ts:56`, `docs/reference.md:1056`, `docs/migration-idiomatic-api.md:493`). The migration explains consumption rather than replay and adds no timing-policy switch.
- ⚠️ **Outside this task-scoped verification:** TypeScript 4.7.4 packed validation remains assigned to Task 8. The retained final log proves TypeScript 4.9.5 only (`.superpowers/sdd/2026-10-28-client-api-fixes/task-7-check-final.log:3690`). Unchanged Tasks 1–6 contracts were assessed for interference from this diff, not independently re-audited.

## Strengths

- The implementation places filtering at the two actual delivery points while retaining one recording/commit path. Suppression still acknowledges the boundary, preserving expansion progress (`src/core/drivers/runSync.ts:36`, `src/core/drivers/AsyncRunnerSession.ts:263`, `src/core/TraversalKernel.ts:493`).
- Tests prove the important negative and positive cases: an old selector cannot leak a buffered record, and admission with emission disabled cannot permanently erase an undelivered record. Callback drains, once-only work, independent visitor selection and settled W are asserted directly (`tests/delivery-selection.test.ts:67`, `tests/delivery-selection.test.ts:125`).
- Seed regression expectations explicitly distinguish seeded root W from child W and real completion observations (`tests/dag-inspection.test.ts:245`). The implementation retains the visibility/deletion guard before committing an observation (`src/core/TraversalKernel.ts:1320`) and the synthetic-holder bypass (`src/core/TraversalKernel.ts:1919`).
- Packed fixtures exercise CJS and ESM runtime selection with arbitrary object IDs and observational handles, plus selected-kind types through supported package routes (`scripts/package-consumers/delivery-selection.mjs:5`, `scripts/package-consumers/delivery-selection.ts:161`, `scripts/verify-package.cjs:498`).
- Walking runtime code is unchanged; its existing delivery selection and serial/resource lifecycle remain in place. New no-argument overloads and the public pause/limited-outcome comparison are appropriately scoped (`src/traversals/graph-walk/GraphWalkRunner.ts:19`, `tests/delivery-selection.test.ts:173`).

## Issues

### Critical

None found.

### Important

None found.

### Minor

None identified that warrants a change request.

## Named risk checks and review limits

- **Global selector versus live iterator ownership:** Read the complete sync iterator/run bodies because the diff stops before their ownership lifetime. DFS/BFS/DAG all reject a competing iterator before `kernel.resume`, retain ownership across yields, and route `run` through the same guard (`src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner.ts:257`, `src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunner.ts:253`, `src/traversals/dag-traversal/lib/DagTraversalRunner.ts:369`). Thus ordinary interleaving cannot invalidate the selected-kind promise. Checked the shared async acquisition path and existing walking sessions for the same risk (`src/core/drivers/AsyncRunnerSession.ts:153`, `src/traversals/graph-walk/lib/SyncWalkSession.ts:30`, `src/traversals/graph-walk/lib/AsyncWalkSession.ts:72`). No runtime probe was necessary.
- **New unconditional boundaries versus settlement, visibility and expansion:** Read the surrounding `commitChain`, settlement call, synthetic admission bypass, copied callback configuration and boundary acknowledgement code. Deleted refs still return before observation creation; synthetic holders bypass chains; settlement commits through the common path; acknowledgement still schedules initial expansion (`src/core/TraversalKernel.ts:822`, `src/core/TraversalKernel.ts:1298`, `src/core/TraversalKernel.ts:1919`, `src/core/TraversalKernel.ts:1936`, `src/core/TraversalKernel.ts:493`). Seed behavior is supported by the changed focused regression, rather than a broader scheduling audit.
- **Buffered filtering versus pause/drain/failure bookkeeping:** Read the session pump and driver acknowledgement path omitted from the hunks. Existing draining keeps buffered observations, suppression uses the same boundary acknowledgement route, and already acknowledged close boundaries are recognized (`src/core/drivers/AsyncRunnerSession.ts:279`, `src/core/drivers/runAsync.ts:79`, `src/core/drivers/runAsync.ts:116`). No new scheduling or failure policy was introduced.
- Read the 2,668-line review package in bounded chunks. Recovered output-truncated documentation hunks; outside-diff source reads were restricted to the risks above and cut iterator bodies. No source/index/HEAD mutations, subagents, test suites, builds, package checks or scratch probes were run.
- Inspected the retained final validation log: 134 suites / 3,100 tests, 100% coverage, 22 examples, packed consumers, guide/snippet validation and reported benchmark/packaging checks. No warning markers were found in that log (`.superpowers/sdd/2026-10-28-client-api-fixes/task-7-check-final.log:3491`, `:3659`, `:3668`, `:3682`). Initial reviewer login-shell dconf noise was environmental; subsequent read commands used `login:false`.

## Assessment

**Task quality: Approved.** The recording/delivery separation is small and coherent, the narrowing is protected by existing execution ownership, and the regressions cover the previously misleading buffered and deferred cases. No blocking compliance or quality findings remain for Task 7; the declared compiler-floor audit remains Task 8 work.
