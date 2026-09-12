# Task 4 Report: Move ResolvedTree onto the compatibility store

## Status

Complete.

## Assumptions

- Task 3's `GraphStore` tree mode is the normative compatibility implementation and should be reused without duplicating topology in `ResolvedTree`.
- `DepthFirstTraversalResolvedTreesContainer` already prevalidates saved parent and child mappings before updating active storage, and its existing injected-container branch already preserves the exact `ResolvedTree`; no container code change is needed to preserve facade/store identity once those objects belong to `ResolvedTree`.
- The existing exported `ResolvedTreeMap` type is retained as part of signature compatibility even though `ResolvedTree` no longer owns a map of that type.
- `getGraphStore()` is marked `@internal` but remains callable by core consumers and focused compatibility tests; it is not documented as a supported public mutation API.

## Implementation

- Replaced `ResolvedTree`'s private map and root fields with one tree-mode `GraphStore`.
- Routed root, record lookup/replacement, membership, and iterative subtree removal through the store.
- Added `getResolvedGraph()` and the internal `getGraphStore()` bridge.
- Preserved direct record and child-array identity, unresolved-root adapter fallbacks, compact duplicate child arrays, iterative deletion, clone-on-parent-detach, and manual delete/re-set behavior.
- Added focused tests for supplied record/live-array identity, clone-on-detach and resurrection, and injected tree/facade/store identity.

## RED/GREEN

- RED: `npm test -- tests/tree-graph-view.test.ts` failed with TS2339 because `ResolvedTree.getResolvedGraph` did not exist.
- GREEN: the same focused command passes 3 tests after implementation.

## Verification

- `npm test -- tests/tree-graph-view.test.ts`: PASS, 1 suite / 3 tests.
- `npm test`: PASS, 21 suites / 266 tests.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `git diff --check`: PASS.

## Self-Review

- Existing assertions were not changed.
- `ResolvedTree.delete` still clones and replaces the surviving parent record before removing the iterative descendant set.
- Tree raw setters retain Task 3's tombstone resurrection behavior; strict DAG insertion behavior was not changed.
- Saved mapping validation and mutation ordering remain unchanged and are covered by the original atomicity tests.
- Injected containers continue to reuse the exact active and saved tree objects; focused coverage additionally verifies exact graph facade and store identity.

## Concerns

None. Changes are limited to the Task 4 migration, focused compatibility tests, and this report.
