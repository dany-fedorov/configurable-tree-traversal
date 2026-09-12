# Task 5 Report

## Status

Implemented graph containers, structural original-graph snapshots, and tree/graph source bindings. Scope stops before traversal scheduling.

## Implementation

- Added `ResolvedGraphsContainer<T, R>` with fixed source mode, shared tree-store reuse, graph-store ownership, first-acceptance snapshot capture, reference translation, edge acceptance, and deletion delegation.
- Added a structural-only snapshot facade. It shallowly shares vertex data, copies child-hint arrays, preserves accepted multi-parent topology after active rewrites/deletions, and exposes no lifecycle-status query.
- Staged snapshot vertices and edges before active writes, then committed snapshot topology only after active and legacy-snapshot validation succeeded.
- Added tree and graph callback bindings with real mode-specific options and `MaybePromise` forwarding.
- Centralized the `T | R` hint-to-input-hint type assertion in the binding boundary, including hint identity callbacks.
- Centralized sync/async tree-result rejection for own `vertexId` or `dependsOn` metadata fields.

## TDD Evidence

- Initial focused run failed because `ResolvedGraphsContainer` and `callbackBindings` did not exist.
- The tree slot-ledger assertion failed with a pending slot before `acceptEdge` was corrected to update the shared store and legacy saved topology.
- The graph-mode binding guard test failed before the source/container mode check was added.
- The rewritten hint identity test failed typechecking before `BoundSource` accepted `T | R` hints and translated them at the adapter boundary.

## Verification

- `npm test -- tests/graph-container.test.ts tests/graph-source-binding.test.ts`: 2 suites, 7 tests passed.
- `npm test -- tests/object.test.ts tests/object-edge-cases.test.ts tests/core-edge-cases.test.ts`: 3 suites, 44 tests passed.
- `npm test`: 23 suites, 274 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Focused Prettier check and `git diff --check`: passed.

## Self-Review

- Confirmed snapshot query collections are fresh arrays and the facade omits both `get` and `getStatusOf`.
- Confirmed graph edge rejection cannot mutate snapshot topology.
- Confirmed tree mode reuses the exact legacy `ResolvedTree` graph store/facade and updates its slot ledger and saved-tree edge once.
- Confirmed no scheduler, runner, visitor, or public export work was added.

## Assumptions

- Tree-mode construction receives the existing `DepthFirstTraversalResolvedTreesContainer`; creating a second tree container would violate the required facade/store identity.
- The caller configures that legacy tree container with saved-tree support when tree callbacks require `notMutatedResolvedTree`; `saveOriginal` independently controls the structural graph snapshot.
- For tree sources, the identity passed to `acceptRoot`/`acceptVertex` is the accepted reference UUID, because tree results cannot supply graph identity metadata.
- The scheduling layer prepares active child slots before calling `acceptEdge`, as required by the existing `GraphStore` contract.

## Concerns

None within Task 5 scope.
