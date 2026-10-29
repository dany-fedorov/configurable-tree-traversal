# Task 6 report: restricted observations and view vocabulary

Status: complete; full repository gate passed.
Commit: `20acd87e4075b05af3fd6ac45cfe9eb3cf6a6080` (`feat: restrict traversal observations to stable read-only facets`).
Base: `fdb957a72fb968442e26a97b907ef6f19d61d3e9`.
Worktree: `/home/df/.codex/worktrees/04b4/configurable-tree-traversal`.
Branch: `feat/api-clarity-migration`.
Scope: F03, F17 and F20 only; no F09 delivery-time filtering changes.

## Contracts implemented

- `VertexHandle<T>` is a frozen canonical observation object with `getRefId()` and live `getValue()`, without `setValue`. Public `VertexRef<T>` names the same observation type. Private scheduler refs remain mutable.
- `VertexView<T>` is a frozen facade with readonly `$data`/`$childHints`, query methods and frozen copied hint collections. Caller data, graph IDs and individual hint payloads are shallow and retain identity. `clone()` returns an independent editable Vertex and independent hint array.
- Private WeakMap projections preserve handle/ref identity and never trust a forged object's claimed reference UUID. The same public handle appears in tree/graph queries, events, callbacks, previous-phase refs and source parent contexts. View queries unwrap privately.
- Tree callbacks/sources use `resolvedTreeView`; graph callbacks/sources use `resolvedGraphView`. Graph query vocabulary is `ResolvedGraphView` / `getResolvedGraphView`. Old graph names and ordinary runner `getResolvedTreeStore` are absent. Explicit standalone MutableRef, Vertex and ResolvedTreeStore editing remains available.
- Every projected graph record wraps its vertex/ref, incoming edge refs, and linked-slot refs; structural collections are frozen and detached. Original graph/tree queries remain in the input domain and retain separate snapshot handles.
- Events wrap the recorded `event.vertex`; they do not reconstruct historical values by reading the live ref. Tests retain events across later rewrites and verify the old event value beside the new live handle value.
- Source resolution contexts are cached, detached, frozen projections of accepted private contexts. ObjectTreeSource now queries the safe context API. Async BFS previously accepted a context constructed separately from the admitted source call; it now accepts the actual frame context, preserving object identity bookkeeping without object-specific engine hooks.
- Graph-only source contexts have the authorized correlated parent union: both parent fields non-null for a real parent, both null for a hidden synthetic entry parent. Depth, hintIndex and vertexHint remain intact; tree parents remain non-null.
- `isTraversalRoot` / `isTraversalRootVertex` are removed from public types, runtime callback/event records, runners and the internal event transport. Tree/graph family-root predicates and walking entry semantics remain.
- Existing command, source-resolution, original-identity/cycle, strict option/path, arbitrary ID, preparation/progress/ticket, walking, and object-domain contracts remain tested. No compatibility aliases, dependency upgrades or coverage-gate changes were introduced.

## RED and GREEN evidence

- `task-6-red.log`: initial public runtime test failed in all six sync/async DFS/BFS/DAG builders because a safe tree view returned `setValue` authority.
- `task-6-synthetic-red.log`: expanded tests identified the hidden synthetic parent leak in sync/async DAG source contexts and an async BFS source/accepted-context identity mismatch.
- `task-6-focused-green.log`: 4 suites / 52 tests passed, including 26 new observation-route/identity/history/synthetic-context cases plus identity and shared-core parity cases.
- `tests/observation-facets.typecheck.ts` and the equivalent packed fixture reject vertex/ref editing, mutable hints, old names, old root flags and store access; validate original input domains and correlated synthetic-parent narrowing.
- `task-6-coverage-first.log`: 132 suites / 3077 tests passed, with 100% statements, branches, functions and lines (including observationFacets.ts).
- Full-check/package iteration logs preserve migration failures: old packed handle editing, a formatter-moved compiler-negative directive, and a guide's overly narrow object-current type. These were corrected in the callers/tests/docs rather than by relaxing the new contracts.

## Validation commands and outputs

All commands ran with explicit worktree cwd and login disabled. Build/package operations were serialized. Logs are in this plan workspace and edit scripts used uniquely task-prefixed /tmp paths.

- `npm test -- tests/observation-facets.test.ts`: initial RED, then expanded GREEN.
- Focused object, tree-query, identity, graph source/container and shared-core suites: see task-6-focused-*, task-6-migration-focused.log and task-6-facets-expanded.log.
- `npm run typecheck`: passed before final check; compiler-negative consumers included.
- `npm run test:coverage`: 132 suites / 3077 tests, all four global coverage measures 100%.
- `npm run lint`: one unused negative-import alias corrected; final gate reruns lint.
- `npm run verify-package` / `node scripts/verify-package.cjs`: all new packed runtime facets pass across CJS/ESM; final gate validates all runtime/type fixtures and packaged guides.
- `npm run check`: PASS (exit 0), `task-6-check-third.log`. Includes typecheck, lint, coverage, examples, build, packed consumers, guide links/anchors and standalone guide examples, benchmark/generator tests and packaging tests.
- `git diff --check`: clean.

## Self-review

Reviewed the private/public boundary, all six runner adapters, original projections, nested graph refs, source context lifecycle, hidden synthetic parents, event capture vs live handle semantics, object mutation-binder cache keys, arbitrary identity handling, public exports and packed consumers. Kept historical section anchors and added a direct safe-query anchor; current guides and examples use canonical names. Parent-authored spec/Task 6 plan clarifications are included in the scoped commit. Existing untracked review artifacts are preserved.

No remaining implementation concern identified. Intentional breaking changes require consumers to migrate callbacks/source fields and graph names, stop editing observation handles, and handle null synthetic graph entry parents. Caller-owned payloads intentionally remain mutable/shallow. No push, merge, publication or external write was performed. The final TypeScript floor audit remains Task 8; current repository compiler is 4.9.5 and no version requirement was changed.

## Changed files

- `AGENTS.md`
- `docs/agent-workflows.md`
- `docs/migration-api-clarity.md`
- `docs/migration-idiomatic-api.md`
- `docs/migration-uniform-api.md`
- `docs/reference.md`
- `docs/superpowers/plans/2026-10-28-client-api-fixes.md`
- `docs/superpowers/specs/2026-10-28-client-api-fixes-design.md`
- `examples/agent-orchestration-example.ts`
- `examples/dag-prerequisite-resolution-example.ts`
- `examples/dag-workflow-example.ts`
- `examples/rewrite-object-example.ts`
- `scripts/package-consumers/agent-api-foundations.mjs`
- `scripts/package-consumers/graph-id-types.ts`
- `scripts/package-consumers/idiomatic-api.mjs`
- `scripts/package-consumers/idiomatic-api.ts`
- `scripts/package-consumers/idiomatic-diagnostics.mjs`
- `scripts/package-consumers/idiomatic-diagnostics.ts`
- `scripts/package-consumers/materialized-rewrite-capability.ts`
- `scripts/package-consumers/observation-facets.mjs`
- `scripts/package-consumers/observation-facets.ts`
- `scripts/package-consumers/rewrite-output.ts`
- `scripts/package-consumers/uniform-api.mjs`
- `scripts/package-consumers/uniform-api.ts`
- `scripts/verify-package.cjs`
- `src/core/AsyncTraversalVisitor.ts`
- `src/core/CTTRef.ts`
- `src/core/ResolvedGraph.ts`
- `src/core/ResolvedGraphView.ts`
- `src/core/ResolvedTree.ts`
- `src/core/ResolvedTreeView.ts`
- `src/core/TraversableGraph.ts`
- `src/core/TraversableTree.ts`
- `src/core/TraversalKernel.ts`
- `src/core/TraversalRunner.ts`
- `src/core/TraversalVisitor.ts`
- `src/core/Vertex.ts`
- `src/core/drivers/callbackBindings.ts`
- `src/core/effects/types.ts`
- `src/core/graph/GraphStore.ts`
- `src/core/graph/ResolvedGraphsContainer.ts`
- `src/core/graph/snapshot.ts`
- `src/core/graph/types.ts`
- `src/core/index.ts`
- `src/core/kernelTypes.ts`
- `src/core/observationFacets.ts`
- `src/core/scheduling/GraphScheduling.ts`
- `src/tools/rewrite-object/rewriteObject.ts`
- `src/traversable-tree-implementations/traversable-object-tree/TraversableObjectTree.ts`
- `src/traversable-tree-implementations/traversable-object-tree/lib/makeMutationCommandFactory.ts`
- `src/traversals/breadth-first-traversal/lib/AsyncBreadthFirstTraversalRunner.ts`
- `src/traversals/breadth-first-traversal/lib/BreadthFirstPolicy.ts`
- `src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunner.ts`
- `src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerState.ts`
- `src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalVisitorsState.ts`
- `src/traversals/dag-traversal/hasSingleSink.ts`
- `src/traversals/dag-traversal/inspectDag.ts`
- `src/traversals/dag-traversal/lib/AsyncDagTraversalRunner.ts`
- `src/traversals/dag-traversal/lib/DagGraphView.ts`
- `src/traversals/dag-traversal/lib/DagTraversalRunner.ts`
- `src/traversals/dag-traversal/lib/DagTraversalVisitor.ts`
- `src/traversals/dag-traversal/lib/definitionSource.ts`
- `src/traversals/depth-first-traversal/lib/AsyncDepthFirstTraversalRunner.ts`
- `src/traversals/depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer.ts`
- `src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner.ts`
- `src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerState.ts`
- `src/traversals/depth-first-traversal/lib/DepthFirstTraversalVisitorsState.ts`
- `tests/_main.ts`
- `tests/api-clarity-values.test.ts`
- `tests/api-clarity-values.typecheck.ts`
- `tests/async-breadth-first.test.ts`
- `tests/async-dag-kernel.test.ts`
- `tests/async-dag-lifecycle.test.ts`
- `tests/async-dag-prerequisite-lifecycle.test.ts`
- `tests/async-dag.test.ts`
- `tests/async-depth-first.test.ts`
- `tests/async-helpers.test.ts`
- `tests/async-tree-api.typecheck.ts`
- `tests/breadth-first-core-parity.test.ts`
- `tests/breadth-first.test.ts`
- `tests/collection-sources.test.ts`
- `tests/collection-sources.typecheck.ts`
- `tests/core-coverage-round2.test.ts`
- `tests/core-edge-cases.test.ts`
- `tests/core.test.ts`
- `tests/dag-completion-dependencies.test.ts`
- `tests/dag-configuration.test.ts`
- `tests/dag-definition-validation.test.ts`
- `tests/dag-definition.test.ts`
- `tests/dag-definition.typecheck.ts`
- `tests/dag-discovery.test.ts`
- `tests/dag-event-types.test.ts`
- `tests/dag-filtered-visitors.test.ts`
- `tests/dag-filtered-visitors.typecheck.ts`
- `tests/dag-helpers.test.ts`
- `tests/dag-inspection-terminal.test.ts`
- `tests/dag-inspection.test.ts`
- `tests/dag-performance-regressions.test.ts`
- `tests/dag-prerequisite-resolution.test.ts`
- `tests/dag-source-patches.test.ts`
- `tests/dag-synthetic-root.test.ts`
- `tests/dag-traversal.test.ts`
- `tests/depth-first-core-parity.test.ts`
- `tests/depth-first.test.ts`
- `tests/execute-visitors-compat.test.ts`
- `tests/execution-selection.test.ts`
- `tests/explicit-identity.test.ts`
- `tests/graph-api.typecheck.ts`
- `tests/graph-completion-dependencies.test.ts`
- `tests/graph-completion.test.ts`
- `tests/graph-container.test.ts`
- `tests/graph-id-types.typecheck.ts`
- `tests/graph-pruning.test.ts`
- `tests/graph-readiness.test.ts`
- `tests/graph-source-binding.test.ts`
- `tests/helper-option-capture.test.ts`
- `tests/idiomatic-compatibility.test.ts`
- `tests/idiomatic-compatibility.typecheck.ts`
- `tests/idiomatic-diagnostics.test.ts`
- `tests/idiomatic-diagnostics.typecheck.ts`
- `tests/idiomatic-object-contracts.test.ts`
- `tests/idiomatic-object-contracts.typecheck.ts`
- `tests/idiomatic-scoped-operations.test.ts`
- `tests/internal-runner-fixtures.ts`
- `tests/kernel-transitions.test.ts`
- `tests/materialized-rewrite-capability.test.ts`
- `tests/materialized-rewrite-capability.typecheck.ts`
- `tests/object-coverage.test.ts`
- `tests/object-edge-cases.test.ts`
- `tests/object-resolution-hook.test.ts`
- `tests/observation-facets.test.ts`
- `tests/observation-facets.typecheck.ts`
- `tests/path-options-contract.test.ts`
- `tests/prepared-dag.test.ts`
- `tests/prepared-dag.typecheck.ts`
- `tests/prerequisite-kernel.test.ts`
- `tests/public-api.typecheck.ts`
- `tests/query-identity.typecheck.ts`
- `tests/resolved-tree-coverage.test.ts`
- `tests/runner-coverage.test.ts`
- `tests/runner-state.test.ts`
- `tests/source-hint-contracts.test.ts`
- `tests/test1.ts`
- `tests/traversal-callback-contract.test.ts`
- `tests/traversal-combinations.test.ts`
- `tests/tree-graph-view.test.ts`
- `tests/tree-query-ownership.test.ts`
- `tests/typed-graph-identity.test.ts`
- `tests/uniform-commands.test.ts`
- `tests/uniform-dependencies.test.ts`
- `tests/vertex-content-api.test.ts`
- `tests/visitor-coverage.test.ts`
- `tests/visitor-groups.test.ts`
- `tests/visitor-query-ownership.test.ts`

## Final gate

`npm run check` completed with exit 0 after the final source/test/doc state:

- Typecheck and lint passed.
- 132 source suites / 3077 tests passed; 100% statements, branches, functions and lines.
- 21 top-level runnable TypeScript examples verified.
- Packed CJS/native ESM observation facets and existing runtime families passed.
- Strict node and node16 .ts/.cts/.mts consumers passed with TypeScript 4.9.5.
- Checkout/tarball guide links and anchors passed; 24 standalone guide snippets compiled and ran.
- 25 benchmark/generator tests and 7 packaging-generator tests passed.
- New/changed runtime behavior retains all existing object cycle/hook/concurrent-source tests.

One automatic approval-review timeout occurred on a small local test import-alias edit; the explicitly permitted single retry succeeded. No task remains blocked by permissions.

Final tracked worktree is clean. Only the pre-existing untracked review directory and review Markdown file remain. Commit contains 153 scoped files; all task evidence remains in this plan workspace.

## Review fix round 1 (Important 1 and Minor 1)

Both independently reviewed findings were verified and fixed. This section supersedes the initial assessment that no implementation concern remained.

**Important 1 — supported standalone live hints:** `vertexView` still caches the frozen facade by Vertex identity, but `$childHints` and `getChildrenHints()` now take fresh frozen shallow snapshots on every read. `hasNoChildHints()` queries the owned Vertex's current collection. This preserves the same canonical handle/facade identities, supports ordinary mutable Vertex array edits, and leaves every previously returned hint array unchanged. Clone reads agree with fresh live reads. No readonly `$data` assignment, private runner access or unsafe casts are needed by the regression. Event projection continues to wrap its recorded Vertex value rather than re-reading the live ref.

**Minor 1 — dependency collections:** graph records now explicitly shallow-copy and freeze `dependsOnWork` and any present `dependsOnSubgraphCompletion`. Opaque object/symbol IDs preserve identity and remain unfrozen. Optional completion-array absence is preserved. The existing SameValueZero/dependency test now asserts frozen-array write rejection instead of expecting its detached array to be mutable; it still verifies the declaration remains unchanged.

Covering tests:

- `tests/observation-facets-live.test.ts`: `standalone live facets refresh mutable vertex hints without changing retained hint snapshots` covers push, same-length element replacement, clearing, `$childHints`, query methods, clone consistency, retained snapshots, canonical identity and shallow hint identity.
- The same file's sync and async `freezes copied work and subgraph dependency arrays shallowly` cases cover both dependency arrays, object/symbol IDs, copied ownership, write rejection, unchanged declarations and absent optional arrays.
- `tests/observation-facets.test.ts` retains sync/async tree and DAG recorded-event versus live-handle regressions and all ordinary route/identity/synthetic-parent cases.
- `tests/dag-completion-dependencies.test.ts` retains sync/async `C gates preserve SameValueZero and detached summary arrays`, updated for the reviewed frozen public dependency-array contract.

Exact commands/results:

1. `npm test -- tests/observation-facets-live.test.ts` — RED, exit 1: 3 tests failed for stale hints and non-frozen dependency arrays. `task-6-fix1-red.log`.
2. `npm test -- tests/observation-facets-live.test.ts tests/observation-facets.test.ts tests/tree-query-ownership.test.ts tests/object-resolution-hook.test.ts` — GREEN, exit 0: 4 suites / 73 tests. `task-6-fix1-focused-green.log`.
3. `npm run typecheck && npm run lint && npm run test:coverage` — initial shared validation found only the two existing dependency-array mutation expectations; 132 suites passed, 1 failed; 3078 tests passed, 2 failed. The captured output excerpt is `task-6-fix1-validation-first.log` (intermediate passing-test names omitted).
4. `npm test -- tests/observation-facets-live.test.ts tests/observation-facets.test.ts tests/dag-completion-dependencies.test.ts` — GREEN, exit 0: 3 suites / 66 tests. `task-6-fix1-focused-second.log`.
5. `npm run typecheck && npm run lint && npm run test:coverage` — final GREEN, exit 0: typecheck/lint passed; 133 suites / 3080 tests passed; 100% statements, branches, functions and lines globally and for observationFacets.ts. Complete output: `task-6-fix1-validation-green.log`.
6. `git diff --check` — passed.

The full source gate was justified by a shared facade change affecting every tree/DAG observation route. No unrelated package, build, example or benchmark gate was repeated in this fix round. Existing TypeScript-private runner internals remain unsupported; no runtime-sandbox redesign was attempted. Self-review found no remaining concern in these fixes. Only `src/core/observationFacets.ts`, the new live-facet public regression file, and the existing completion-dependency test are in the fix commit. Pre-existing review artifacts are preserved.

Fix round 1 commit: `7450f4061b9929a6160083667b02b805b4ec4bfc` (`fix: refresh live vertex hints and freeze dependency views`). Final tracked worktree is clean; only the pre-existing untracked review artifacts remain.
