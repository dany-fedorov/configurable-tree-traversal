# Task 11 report

## Status

Complete. The synchronous breadth-first runner now delegates traversal execution to `TraversalKernel`, `runSync`, `VisitorChain`, and the shared tree-mode graph store through an explicit `BreadthFirstPolicy`.

## Implementation

- Added `BreadthFirstPolicy` over the existing public unresolved-context queue and queue cursor.
- Added breadth-first policy selection and transitions to `TraversalKernel`.
- Preserved root visit/event, boundary-time sorted context enqueue, dequeue-time child resolution, child registration, visit/event, and next-advancement sibling resolution.
- Delayed graph expansion closure until the last queued context for a parent is consumed, preserving shared slot accounting without resolving children eagerly.
- Replaced the runner's private traversal and visitor algorithm with shared callback bindings and `runSync`, while retaining `icfg`, `state`, `resolvedTreesContainer`, `curGenerator`, public signatures, injected queue identity, and cursor behavior.
- Added `getResolvedGraph()` and frozen, non-advancing `inspect()` snapshots with synchronous driver and zero buffered-event counts.
- Reused existing tree-source diagnostics, saved-tree storage, visitor-chain commands, iterable configuration cloning, and legacy topology acceptance.

## TDD evidence

The new focused parity test was run before migration and failed because `inspect()` and `getResolvedGraph()` were absent. The first implementation then failed against shared slot accounting because it closed parent expansion before dequeue-time child acceptance; the policy was corrected to close a parent only after its final queued context is consumed.

The focused test now pins:

- exact `root`, `resolve:A`, `visit:A` callback timing;
- graph membership containing only root and A at the A event;
- no callback, queue, cursor, or graph advancement caused by inspection;
- B remaining unresolved until the next iterator advancement;
- boundary-time creation of both root child contexts;
- finished queue and cursor clearing;
- terminal policy, chain, and request inspection cleanup;
- completed-container reinjection with original root/child references, records, child-array identity, compact null-slot topology, and no duplicate graph entries.

## Verification

- Baseline focused suite: 4 suites, 37 tests passed.
- RED: `npm test -- tests/breadth-first-core-parity.test.ts` failed on the missing runner inspection and graph APIs.
- Focused parity: 1 suite, 2 tests passed.
- Focused compatibility: 3 suites, 35 tests passed.
- `npm test`: 33 suites, 354 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `git diff --check`: passed.

## Assumptions

- The legacy BFS queue remains the authoritative public queue of unresolved contexts; private policy records only track currently admitted expansion and resolution work.
- Contexts are created after the parent visitor/event boundary and capture the parent vertex at that boundary, including sorted or rewritten hints.
- A completed injected tree is fresh scheduling over retained legacy topology, not a portable live callback checkpoint. Existing compatible children are enrolled and reused by the shared tree scheduler.
- Queue storage is cleared only once all queued contexts have been consumed and no boundary-admitted expansion precedes them.

## Concerns

- The existing 20,000-child breadth-first stress test remains iterative and passes, but takes about 5.9 seconds with shared graph lifecycle and legacy-topology checks, compared with about 0.08 seconds on the pre-migration baseline. No correctness or stack-safety regression was observed.
