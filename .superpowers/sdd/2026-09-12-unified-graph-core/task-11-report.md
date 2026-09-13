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

## Fix round 1

### RED evidence

- A runner with a valid injected unresolved context at queue cursor 1 failed with `Unknown breadth-first parent expansion` because policy progress existed only for contexts created by `setHints`.
- A fresh 1,000-child BFS traversal called `ResolvedTree.getResolutionContextOf` 499,500 times because each accepted child rescanned every child already appended to its parent.
- A 10,000-vertex readiness FIFO invoked `Array.shift` 10,002 times, including head-blocked probes and final empty consumption.

### GREEN changes

- `BreadthFirstPolicy` now bootstraps parent progress from only the unconsumed queue suffix, preserves the injected queue object and cursor semantics, and distinguishes injected contexts from policy-created expansions that require closure.
- Skipped entries before a nonzero cursor are never resolved. Skipped active entries release their bootstrapped progress without invoking the adapter.
- `GraphScheduling.enrollExisting` captures reusable legacy children once before traversal reset, indexed by original hint index with SameValueZero hint validation. Each candidate is consumed once in O(1); children appended during the new traversal are never candidates.
- `GraphScheduling` now consumes its shared eligible FIFO through a head cursor. `takeReady`, `takeCompleting`, and `takeEligible` retain head-blocking/FIFO semantics; inspection exposes only the pending suffix; deletion filters and compacts that suffix; normal consumption compacts after a bounded threshold.

### GREEN evidence

- Injected queue regression: the supplied queue remains identical, cursor 1 skips the earlier entry, and the valid context resolves and visits exactly once before finished queue clearing.
- Fresh 1,000-child BFS traversal: 1,001 graph vertices and zero legacy resolution-context lookups.
- Wide readiness regression: 10,000 entries preserve exact FIFO inspection/consumption order with head blocking and zero `Array.shift` calls.
- Reinjection parity: BFS compact/null topology and DFS nested legacy topology retain original references and child-array identity.
- Requested focused matrix: 7 suites, 77 tests passed.
- `npm test`: 33 suites, 357 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Timed 20,000-child BFS test: 1.677 seconds Jest test time (`elapsed=3.50`, `user=3.83`, `system=1.60`), down from about 5.8 seconds before this fix round.

### Remaining concern

- Shared graph lifecycle bookkeeping still makes the 20,000-child traversal slower than the approximately 0.08-second legacy loop, but the accidental quadratic legacy-child scan is removed and the stress case remains iterative.

## Fix round 2

### RED evidence

- Resuming a partial traversal whose reachable root retained the injected queue `[A, B]` at cursor 1 failed with `Slot is already linked to another vertex`.
- The shared kernel revisited the root and regenerated its complete hint list, treating the injected queue as unrelated pending work rather than the root's already-established expansion frontier.

### GREEN changes

- `BreadthFirstPolicy` now indexes injected queue contexts by parent, including consumed-prefix hint indices, while progress accounting still covers only the unresolved suffix.
- When an injected frontier's reachable parent is acknowledged, `TraversalKernel` prepares slots from the preserved contexts instead of enqueuing a fresh expansion.
- `GraphScheduling` restores consumed tree slots from captured legacy topology without reenrolling or revisiting consumed children. Missing consumed children become terminal omitted slots.
- The unresolved suffix retains its original queue object, contexts, hints, and cursor behavior; expansion closes when that suffix is consumed.

### GREEN evidence

- The regression preserves root hints `[A, B]`, queue identity, consumed child identity, and two linked root slots while invoking `makeVertex` only for `B`.
- No duplicate contexts are appended: the queue remains exactly `[A, B]` when `B` resolves, then clears with cursor 0 at completion.
- Initial visits resume with the injected visitor state: root is visit index 2 after `A`, followed by `B` at visit index 3 after root.
- Requested focused matrix: 7 suites, 71 tests passed.
- `npm test`: 33 suites, 358 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `git diff --check`: passed.
