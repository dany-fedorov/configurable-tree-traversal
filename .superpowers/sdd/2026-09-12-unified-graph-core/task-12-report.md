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
