# Task 12 Report: Public Synchronous DAG Traversal

## Status

Implemented the synchronous `DagTraversal` builder and runner family over the shared traversal kernel. Focused behavior, typecheck, lint, examples, build, and package-consumer checks pass. The aggregate `npm run check` command reaches and passes all 393 tests, but exits nonzero at the repository-wide 100% coverage threshold because previously introduced shared-core and legacy branches remain uncovered.

## Implementation

- Added DAG configuration, recursively frozen defaults, visitor initialization, runner iterable configuration, runner state, internal-object types, and runtime ownership policy.
- Added the synchronous runner with graph/tree source bindings, read-only graph access, graph/traversal-root predicates, graph-shaped visitor options/events, inspection, halt/resume, failure retention, and source/snapshot injection validation.
- Enforced exactly one source, fixed source mode, synchronous `concurrency` rejection by property presence, stable priority ordering, configuration cloning, and runner isolation.
- Wired FIFO `ON_READY`/`ON_COMPLETE` traversal through `TraversalKernel`, including `PRE_VISITING`/`COMPLETING` callback status boundaries and DAG stall diagnostics.
- Fixed the hint-identity frame transition and made known hint identities skip `makeVertex` while retaining edge/cycle/omission/tombstone handling.
- Restricted child-hint rewrite commands to `ON_READY` for DAG traversal.
- Kept root, namespace, package-subpath, and helper exports unchanged for Task 20.

## Tests

Added `tests/dag-traversal.test.ts` and `tests/dag-configuration.test.ts`, covering:

- shared three-parent joins and prerequisite readiness;
- mixed FIFO ready/completion events and lifecycle statuses;
- graph-root and traversal-root metadata;
- source exclusivity, source-mode locking, concurrency rejection, visitor filtering, stable duplicate priorities, defaults, and clone isolation;
- empty roots, missing dependencies, dependency stalls, hint-shortcut discovery cycles, omissions, tombstones, deletion cascades, subtree disabling, data/hint rewrites, and graph snapshots;
- synchronous halt/resume, iterator ownership/close, callback failures, and thenable rejection;
- initial, empty halted, finished, failed, incompatible, and runtime-owned injection boundaries;
- graph callbacks and real tree callback contexts, including `TraversableObjectTree`.

## Verification

- `npm test -- tests/dag-traversal.test.ts tests/dag-configuration.test.ts tests/graph-readiness.test.ts tests/graph-pruning.test.ts`: pass, 60 tests.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run verify-examples`: pass, 7 examples.
- `npm run verify-package`: pass, 206 packed files and CommonJS/ESM/TypeScript consumers.
- `git diff --check`: pass.
- `npm run check`: nonzero only at coverage; 35 suites and 393 tests pass. Coverage is 95.62% statements, 89.97% branches, 97.94% functions, and 96.86% lines versus the global 100% thresholds.

## Assumptions And Concerns

- Task 20 owns `traverseDag`, root exports, namespace exports, and package subpath exports, so Task 12 intentionally exposes only source-level deep imports.
- A live or partially executed halted traversal resumes through its original runner. External injection is accepted for initial and terminal state and for an empty quiescent halted state; runtime ownership prevents another runner from claiming live objects.
- Populated externally reconstructed ready/expansion queues are represented on `DagTraversalRunnerState` but are not restored into the kernel by this task. Supporting non-empty portable halted seeds requires serializing the kernel's vertex-work records as well as queue references; silently treating such records as a portable checkpoint would violate the state/container agreement contract.
- The full coverage gate is not green. The remaining uncovered lines are concentrated in shared kernel defensive transitions, graph/snapshot validation, breadth-first policy, and legacy depth-first helpers rather than the new DAG traversal files, which report 100% statement/branch/function/line coverage.

## Fix Round 1: Portable Halted Seeds And Coverage

This section supersedes the earlier limitation on non-empty portable halted seeds and the earlier non-green coverage status.

### RED

- Added a halted snapshot containing both a queued `ON_READY` visit and an unprepared expansion continuation.
- The first focused run, `npm test -- --runInBand tests/dag-configuration.test.ts`, failed 4 of 17 tests: the valid seed incorrectly called `makeRoot`, and unknown-ready-ref, wrong-ready-status, and prepared-expansion seeds were all accepted.
- The failure demonstrated that `DagTraversalRunnerState.readyVisits` and `expansionQueue` were data-only fields ignored by `TraversalKernel` and `GraphScheduling`.

### GREEN

- Added `GraphStoreContract.getTraversalSlots` so restoration can distinguish an unprepared expansion from a prepared empty expansion without mutating the supplied container.
- Added staged `GraphScheduling.restoreDagSeed` reconstruction. It derives dependency work, reverse dependencies, completion accounting, and exact eligible FIFO entries in temporary maps, validates all lifecycle and slot invariants, and installs the work only after validation succeeds.
- Added DAG kernel seed initialization for quiescent `HALTED` state, exact expansion FIFO restoration, graph/traversal-root agreement, and empty-graph validation.
- Rejected duplicate, unknown, missing, wrong-order, wrong-status, active-visit, partial-expansion, unmet-dependency, and inconsistent completion seeds before runtime ownership or graph/state mutation.
- Verified resumed work emits `ON_READY:B`, `ON_READY:C`, `ON_COMPLETE:B`, `ON_COMPLETE:C`, `ON_COMPLETE:A`, and `ON_COMPLETE:root`; only unresolved `C` is resolved and the retained `root -> [A, B]`, `A -> [C]` topology is preserved.
- Removed the unused `shouldRunVisitorsForOrder` module and defensive fallbacks proven unreachable by graph, owner, and frame invariants. Retained and tested late registered-root adoption after the full suite exposed it as supported behavior.
- Added behavior-bearing coverage for graph snapshots, graph/tree container atomicity, BFS/DFS policy boundaries, callback transport errors, kernel transitions/inspection, scheduler guards, identity helpers, and both sorted DAG hint-identity modes.

### Verification

- RED focused run: 1 suite failed, 4 tests failed, 13 passed.
- GREEN focused Task 12 run: `npm test -- tests/dag-traversal.test.ts tests/dag-configuration.test.ts tests/graph-readiness.test.ts tests/graph-pruning.test.ts` passes, 4 suites and 99 tests.
- `npm run test:coverage` passes, 36 suites and 468 tests.
- Final global coverage: 100% statements, 100% branches, 100% functions, and 100% lines.
- `npm run check`: pass, including typecheck, lint, coverage, examples, build, and package-consumer verification.
- `git diff --check`: pass.

## Fix Round 2: Empty Halted Seed Root Agreement

### RED

- Added a direct empty-container `HALTED` seed regression with a stale non-null `traversalRootVertexRef`.
- The focused run, `npm test -- --runInBand tests/dag-configuration.test.ts`, failed only the new regression: `makeRunner()` accepted the seed instead of reporting a traversal-root mismatch; 48 tests passed.
- The test snapshots the supplied state and container and verifies root resolution is never called, proving rejection occurs before runtime work or mutation.

### GREEN

- Extended DAG seed root agreement so an empty resolved graph requires a null traversal root, before scheduler restoration and expansion-queue installation.
- Retained the valid empty quiescent `HALTED` null-root contract: the seed is accepted, resolves its root on resume, and finishes.

### Verification

- Focused DAG run: `npm test -- tests/dag-configuration.test.ts tests/dag-traversal.test.ts` passes, 2 suites and 72 tests.
- `npm run check`: pass, including typecheck, lint, 36 suites and 469 tests, 100% statements/branches/functions/lines, 7 examples, build, and package-consumer verification.
- `git diff --check`: pass.
