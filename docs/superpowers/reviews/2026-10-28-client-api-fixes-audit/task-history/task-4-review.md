# Task 4 review

## Spec compliance

- ✅ Runtime and type contracts comply with F07, F08, F12, F14 and the tree/DAG portion of F19. One minor documentation omission remains below.
- F07: exact store/error identity gates conversion before error-class discrimination (`src/traversals/dag-traversal/lib/preparationIssue.ts:11`); sync/async helpers apply the same classifier (`lib/prepareDagSource.ts:33`, `prepareDag.ts:76`). Engine construction sites record provenance for discovery cycles and both stall paths (`src/core/graph/GraphStore.ts:170`, `src/core/scheduling/GraphScheduling.ts:129`, `src/core/TraversalKernel.ts:453`). The original ordered closed witness is returned without rotation. Public tests cover callback/getter/iterable errors and prior-runner engine errors (`tests/dag-precise-contracts.test.ts:23`, `:38`, `:198`), plus object-ID identity and unchanged direct-runner errors (`tests/prepared-dag.test.ts:721`). Authored `structuralCycle` remains distinct (`src/traversals/dag-traversal/lib/DagDefinition.ts:46`).
- F08: the accepted literal and default are `afterWorkReadyChain`; old values reject through the existing validator (`src/traversals/dag-traversal/lib/DagTraversalInstanceConfig.ts:19`, `:169`; `lib/DagTraversalRunner.ts:196`; `lib/AsyncDagTraversalRunner.ts:197`). Empty/filtered chains complete W/C in both families (`tests/dag-precise-contracts.test.ts:108`). Existing external-settlement and getter-capture tests were retained and migrated.
- F12: a private declared class with private constructor/member is exposed only through a type alias (`src/traversals/dag-traversal/coordinateDag.ts:15`). Runtime issuance/WeakMap validation is unchanged. Source and packed assertions reject copied tickets and runtime constructor imports while preserving declaration identity (`tests/dag-coordination.typecheck.ts:41`, `scripts/package-consumers/agent-api-foundations.ts:91`, `:229`); runtime copied-ticket rejection still accepts the original (`tests/dag-coordination.test.ts:272`).
- F14: required readonly W/C arrays originate independently from scheduler sets and are copied unconditionally in inspection/terminal snapshots (`src/traversals/dag-traversal/lib/DagProgress.ts:17`; `src/core/TraversalKernel.ts:730`; `lib/DagInspection.ts:111`; `lib/DagTerminalObservation.ts:115`). Tests exercise overlap, empty waits, completion and manual fixture/type rejection (`tests/dag-precise-contracts.test.ts:154`; `tests/dag-inspection.typecheck.ts:203`).
- F19: shared inspection type and runtime mapping agree on `sortChildrenHints` (`src/core/CoreInspection.ts:20`, `src/core/TraversalKernel.ts:652`), with all six families exercised (`tests/idiomatic-diagnostics.test.ts:272`). Walking visit labels correctly remain outside this task.
- ⚠️ Whole-branch preservation of Tasks 1–3 cannot be established by this task diff alone. No conflicting changes appear in the reviewed hunks; recorded full checks include those regressions. The published TypeScript 4.7.4 floor remains for the separately assigned final audit: this task's packed evidence explicitly reports 4.9.5 (`task-4-package-final.log:21`). No F03/F06/F09 work is required here.

## Strengths

- The new provenance mechanism is small, private, and keyed by the preparing runner's actual store; error subclasses alone cannot cause conversion. It also eliminates the incomplete callback-only error capture (`src/core/errors/engineDagValidationErrors.ts:4`, `src/traversals/dag-traversal/lib/capturePreparedSource.ts:17`).
- The ticket change strengthens static ownership without changing the established runtime capability model (`src/traversals/dag-traversal/coordinateDag.ts:15`). Both source and packed consumers exercise the boundary.
- Progress changes remove optional handling and an obsolete helper rather than reconstructing W from a lossy union (`src/core/TraversalKernel.ts:730`, `src/core/graph/GraphStore.ts:88`).

## Issues

### Critical

None.

### Important

None.

### Minor

- `docs/agent-workflows.md:196`: the troubleshooting row still says “Structural child cycles throw `DagDiscoveryCycleError`” immediately after discussing source preparation. Helpers now return `invalid` with a `discoveryCycle` issue; only direct runners throw. Update this row to distinguish helper invalid results from direct-runner exceptions, as the README/reference already do. Otherwise coordinator authors following this guide may put handling on the wrong branch.

## Checks and scope

- Read the supplied task brief, global/scoped design contracts, implementer report and full supplied diff. Read the diff sequentially; recovered a truncated documentation segment only. No git operations, suite reruns, builds, package generation or scratch probes were performed.
- Named outside-diff risk: provenance could be recorded against a store different from the helper's capability store, or omit another engine error constructor. A focused constructor-site search found only the three instrumented sites. Checked `src/core/graph/ResolvedGraphsContainer.ts:60` and capability registration at `src/traversals/dag-traversal/lib/DagTraversalRunner.ts:245` / `lib/AsyncDagTraversalRunner.ts:252`: each fresh graph container owns a fresh DAG store and the capabilities retain that container. This establishes the per-preparation owner key without source callbacks gaining authority.
- Read existing validation evidence: 130 suites / 3,037 tests and 100% coverage (`task-4-coverage-final.log:3405`, `:3572`); typecheck and lint logs; 21 examples (`task-4-examples.log:5`); packed CJS/ESM and mixed declaration checks plus 24 standalone snippets (`task-4-package-final.log:14–25`); benchmark 25/0 and packaging 7/0. No warning/error diagnostics appeared in these final validation logs. Earlier failed boundary attempts are explicitly documented and superseded by the final passing evidence.

## Assessment

**Task quality: Approved.**

The scoped implementation is cohesive, preserves exact errors and identity, and has meaningful public runtime/type/packed coverage. The sole finding is a nonblocking stale troubleshooting sentence; correct it during documentation cleanup.
