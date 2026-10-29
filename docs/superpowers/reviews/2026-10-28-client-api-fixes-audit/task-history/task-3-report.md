# Task 3 report: F04 / F05 / F13

Base: `e7092bd2404bf2d8797ba68aa96292cbc093b977` on `feat/api-clarity-migration`.
Worktree: `/home/df/.codex/worktrees/04b4/configurable-tree-traversal`.

## Implemented behavior

- Configure patches retain missing and explicitly undefined supported fields, including sources, concurrency, scheduling policy fields, visitor phase maps, in-order fields, and execution selector controls. Types permit optional/pretyped patches under exactOptionalPropertyTypes. Explicit null remains limited to nullable fields. Walking limits retain their existing whole-record replacement semantics.
- Builder configuration validates detached candidates before replacing current configuration or registrations. Malformed defined fields, unsupported policies, cross-family visitor phase keys and unsupported own string/symbol fields reject with TypeError before callbacks or mutation. Nonenumerable supported own fields apply consistently; unsupported nonenumerable fields reject.
- Strict accepted-key schemas cover sync/async tree and DAG builders, walking option/phase/limit maps, execution options and nested selector bags, visitor definitions/registration options/groups, object source/fromProperties options, object mutation binders, combined rewrite options, collection/walking materializer selector options, DAG composition/wires and fragment instantiation. Existing prepared-DAG option validation remains strict. Canonical Task 1/2 converter, both adapters, assembly cache, array/collision policies and resolveChildHook keys remain accepted.
- Combined helpers capture their own options and project supported subsets into lower-level constructors/binders. Invalid falsy values such as a null/zero assembly cache cannot disappear during projection.
- Option capture preserves getter-once behavior, including nonenumerable source options, nested execution selectors, position selectors/index elements, priority values and path controls. Nested undefined execution selectors remain no-ops through async/DAG/walking detachment and resumption; visitor admission snapshots and event timing are unchanged.
- ChildIndexSelection is now exclusively `{ indices: readonly number[] }` or `{ ranges: readonly { from: number; through: number }[] }`, for primary and fallback positions. Scalars, tuples, old numeric range lists, conflicting tags and malformed endpoints reject. Negative indexing, inclusive/clipped intervals, ordering, omitted-child behavior, all-out-of-bounds fallback, default n-ary order and detached configuration snapshots remain.
- Path query bags accept only optional boolean noRoot/noSelf controls, treating missing/undefined as defaults. The same validator serves explicit tree stores, live tree/graph views and original tree/graph paths; getters are captured once even across multiple graph paths.
- Source receivers are not option bags: caller-owned state, inherited methods, callable structural receivers, arbitrary IDs and opaque data remain valid. Authored DAG declaration records remain declaration inputs, as clarified by the parent. No walking hydration/source-mode work was included.

## RED / GREEN evidence

All evidence is under this task workspace, using task-3-* names.

| Regression | RED | GREEN |
| --- | --- | --- |
| Undefined configuration and strict bags | task-3-red.log: 9 intended runtime failures | task-3-focused-1.log and final source gate |
| Tagged child positions | task-3-positions-red.log: new tags rejected by old types | in-order/async-depth-first tests and final type/source gates |
| Registration and combined helper validation | task-3-registration-red.log | task-3-focused-3.log and final source gate |
| Nested selector resumption through detachment | task-3-detach-red.log: 8 failures, 247 passes | task-3-detach-green.log; cross-family execution/walking regressions |
| Path query controls | task-3-path-red.log: 5 intended failures | task-3-path-green.log and final source gate |
| Supported nonenumerable DAG fields | task-3-nonenumerable-red.log | task-3-own-fields-green.log |
| Supported object-source/registration own fields | task-3-own-fields-red.log | task-3-own-fields-green.log |
| Selection field/index getter capture | task-3-position-capture-red.log: 1 failure | task-3-position-capture-green.log and final source gate |
| Priority getter capture | task-3-priority-red.log: 1 failure | final source gate |
| Callable source receiver preservation | task-3-callable-source-red.log: 1 failure | final source gate |

Initial source-suite runs also exposed old-contract fixtures and accessor rereads. Migrated fixtures now assert undefined retention, strict symbol/__proto__ rejection, family-specific visitor maps, tagged frozen defaults, and canonical Set seed inputs. New validation branches were covered without weakening thresholds. One new cache test initially assumed default assembly saves its cache; corrected it to request assembleCompositesBeforeRewrite, which owns that saving behavior.

## Final validation

All commands below exited 0 against the final production changes. These are the standard check components, run separately so coverage artifacts stay inside the task workspace.

| Command | Result / evidence |
| --- | --- |
| npm run typecheck | exit 0; task-3-typecheck-complete.log |
| npm run lint | exit 0; task-3-lint-complete.log |
| npm run test:coverage -- --coverageDirectory=.superpowers/sdd/2026-10-28-client-api-fixes/task-3-coverage | 128 suites, 2913 tests pass; 100% statements/branches/functions/lines; task-3-suite-complete.log |
| npm run verify-examples | 21 TypeScript examples pass; task-3-examples-complete.log |
| npm run verify-package | build plus packed CJS/native ESM runtime and TypeScript node/node16 .ts/.cts/.mts consumers pass; 26 denied internal paths, guide navigation and 24 standalone snippets verified; task-3-package-final-head.log |
| npm run test:benchmark | 25 pass, 0 fail; task-3-benchmark-final-head.log |
| npm run test:packaging | 7 pass, 0 fail; task-3-packaging-final-head.log |
| git diff --check | exit 0 |

The first parallel benchmark/package-build attempt raced with build's clean step and failed only because dist was absent. Corrected execution order: final package/build first, then benchmark and packaging checks serially. The final logs above contain the successful exits. Subsequent source/accessor changes received fresh source and packed validation.

## Self-review and boundaries

Reviewed candidate atomicity, unsupported own-key detection before capture, source receiver exemptions, exact caller getter/error behavior, helper projection, nested selector detachment, readonly tagged positions, configuration isolation, arbitrary ID identity, family-specific option placement, public path routes, and current docs/packed consumers. No known remaining task defect. Independent parent review remains the next integration checkpoint.

No subagents were spawned, consistent with the parent instruction. No push, merge, release or publication was performed. The original checkout and pre-existing untracked review artifacts were preserved. The parent-authored declaration-versus-query scope clarification in the spec and plan is included in the task commit.

Packed consumers used installed TypeScript 4.9.5. No language-floor change was introduced; the dedicated final TypeScript 4.7.4 audit remains Task 8's check, not a claim of this task.

## Files

68 task-scoped files; exact manifest: [task-3-files.txt](task-3-files.txt).

- `docs/migration-idiomatic-api.md`
- `docs/reference.md`
- `docs/superpowers/plans/2026-10-28-client-api-fixes.md`
- `docs/superpowers/specs/2026-10-28-client-api-fixes-design.md`
- `examples/configuration-patches-example.ts`
- `scripts/package-consumers/composable-api.mjs`
- `scripts/package-consumers/idiomatic-api.mjs`
- `scripts/package-consumers/idiomatic-api.ts`
- `src/core/ResolvedTree.ts`
- `src/core/TraversalRunnerIterableConfig.ts`
- `src/core/TraversalVisitor.ts`
- `src/core/assertPublicOptions.ts`
- `src/core/graph/GraphStore.ts`
- `src/core/graph/snapshot.ts`
- `src/core/normalizePathOptions.ts`
- `src/core/normalizeTraversalExecutionOptions.ts`
- `src/core/visitors/normalizeVisitorDefinitions.ts`
- `src/core/visitors/normalizeVisitorOptions.ts`
- `src/sources/materialize.ts`
- `src/tools/rewrite-object/rewriteObject.ts`
- `src/traversable-tree-implementations/traversable-object-tree/TraversableObjectTree.ts`
- `src/traversable-tree-implementations/traversable-object-tree/lib/makeMutationCommandFactory.ts`
- `src/traversals/breadth-first-traversal/AsyncBreadthFirstTraversal.ts`
- `src/traversals/breadth-first-traversal/BreadthFirstTraversal.ts`
- `src/traversals/breadth-first-traversal/lib/AsyncBreadthFirstTraversalInstanceConfig.ts`
- `src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalInstanceConfig.ts`
- `src/traversals/dag-traversal/AsyncDagTraversal.ts`
- `src/traversals/dag-traversal/DagTraversal.ts`
- `src/traversals/dag-traversal/dagFragments.ts`
- `src/traversals/dag-traversal/lib/AsyncDagTraversalInstanceConfig.ts`
- `src/traversals/dag-traversal/lib/DagTraversalInstanceConfig.ts`
- `src/traversals/dag-traversal/lib/dagSourcePatch.ts`
- `src/traversals/depth-first-traversal/AsyncDepthFirstTraversal.ts`
- `src/traversals/depth-first-traversal/DepthFirstTraversal.ts`
- `src/traversals/depth-first-traversal/in-order-helpers/IndexRange.ts`
- `src/traversals/depth-first-traversal/in-order-helpers/normalizeRange.ts`
- `src/traversals/depth-first-traversal/in-order-helpers/shouldVisitParentOnInOrder.ts`
- `src/traversals/depth-first-traversal/lib/AsyncDepthFirstTraversalInstanceConfig.ts`
- `src/traversals/depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig.ts`
- `src/traversals/depth-first-traversal/lib/DepthFirstTraversalInstanceConfig.ts`
- `src/traversals/graph-walk/AsyncGraphWalk.ts`
- `src/traversals/graph-walk/GraphWalk.ts`
- `src/traversals/graph-walk/GraphWalkOptions.ts`
- `src/traversals/graph-walk/lib/normalizeWalkOptions.ts`
- `src/traversals/graph-walk/walkSourceFrom.ts`
- `src/traversals/graph-walk/walkSourceFromDag.ts`
- `tests/api-clarity-values.test.ts`
- `tests/async-depth-first.test.ts`
- `tests/async-driver.test.ts`
- `tests/async-tree-api.typecheck.ts`
- `tests/async-tree-prefetch.test.ts`
- `tests/canonical-options.test.ts`
- `tests/completion-policy-capture.test.ts`
- `tests/configuration-contract.test.ts`
- `tests/configuration-contract.typecheck.ts`
- `tests/configuration-isolation.test.ts`
- `tests/core-coverage-round2.test.ts`
- `tests/dag-source-patches.test.ts`
- `tests/defaults.test.ts`
- `tests/execution-selection.test.ts`
- `tests/graph-walk-selection.test.ts`
- `tests/idiomatic-scoped-operations.test.ts`
- `tests/in-order.test.ts`
- `tests/kernel-transitions.test.ts`
- `tests/object-coverage.test.ts`
- `tests/options-declaration-compat.typecheck.ts`
- `tests/path-options-contract.test.ts`
- `tests/runner-coverage.test.ts`

Commit: `551edce916be911786c4f67723647edd1f3efea0`


## Review fix round 1 (of 5)

Review: [task-3-review.md](task-3-review.md), based on commit `551edce916be911786c4f67723647edd1f3efea0`.

Addressed both Important findings and the malformed-opposite-source Minor finding:

- Added a mapped supported-field capture helper. It reads each requested property once using ordinary property lookup, retaining inherited fields/getters while keeping unsupported-own-key checks before capture. This is separate from own-field-only configure patch merging, whose approved semantics remain unchanged.
- DAG records/roots materializers (sync and async), walking materializers (sync and async), and fragment mapId validation now consume the captured values throughout their calls and loops. Captured callbacks run with the original selector/options receiver via `.call(originalReceiver, ...)`; no callback is rebound to the snapshot. Optional inherited selectors, inherited roots and inherited mapId getters continue working.
- Visitor group wrappers, group visitor arrays, group mode fields and definition/member fields are captured once before normalization. Flat list/set round trips still accept addedIndex/visitorGroup records, reassign indexes as before, preserve shared group metadata identity and retain callback function identity. No registration-policy or callback-admission/timing changes were made.
- Walking source capture now has a source-specific object-or-function receiver check and captures inherited methods with Reflect.get. Callable sources retain the original receiver and caller state in both sync/async runners. Existing optional resolver behavior remains; F06 hydration is untouched.
- Restored the `[null, 0, {}]` opposite-source matrix for sync/async DAG builders in tree/graph modes: 12 cases assert TypeError, zero source callbacks, unchanged configuration/visitor records and successful subsequent traversal of the original source.
- No completedWork change was made. The review's structural and cross-realm probes remain passing.

### Covering regressions and RED/GREEN

`tests/helper-option-capture.test.ts` contains 24 public cases covering all four DAG materializers, both walking materializers, inherited/own getters, original callback receivers, multi-item loops, fragment mapId, nested group wrappers/member fields, sync/async list/set metadata round trips, and callable walking receivers with inherited methods/state. The restored 12 opposite-source cases live in `tests/dag-source-patches.test.ts`.

Initial command: `npm test -- tests/helper-option-capture.test.ts tests/dag-source-patches.test.ts` exited 1; [task-3-review1-red.log](task-3-review1-red.log) recorded 24 failures / 62 passes. Of those initial failures, two came from a malformed fragment fixture (an unreachable second vertex), not the intended mapId behavior. Corrected the fragment fixture to an ordered roots entry, temporarily restored the previous mapId implementation, and reran `npm test -- tests/helper-option-capture.test.ts -t 'fragment mapId'`: exit 1 with two actual `mapId reread` failures and 22 skipped cases, recorded in [task-3-review1-fragment-red.log](task-3-review1-fragment-red.log). Restored the fix afterward.

GREEN covering command: `npm test -- tests/helper-option-capture.test.ts tests/dag-source-patches.test.ts tests/collection-sources.test.ts tests/graph-walk-sources.test.ts tests/visitor-groups.test.ts tests/dag-fragments.test.ts` exited 0: **6 suites / 265 tests pass**, recorded in [task-3-review1-green.log](task-3-review1-green.log).

### Necessary broader verification

The supported-field helper and visitor normalizer are shared across families, so one full source coverage run followed focused GREEN. Source and dist mutations were not run concurrently with packed consumers.

| Command | Final exit and result |
| --- | --- |
| npm run typecheck | 0; task-3-review1-typecheck.log |
| npm run lint | 0; task-3-review1-lint.log |
| npm run test:coverage -- --coverageDirectory=.superpowers/sdd/2026-10-28-client-api-fixes/task-3-review1-coverage | 0; **129 suites / 2949 tests pass; 100% statements, branches, functions and lines**; task-3-review1-suite.log |
| npm run verify-package | 0; build, packed CJS/native ESM and TypeScript node/node16 .ts/.cts/.mts consumers, supported/denied imports, guide navigation and 24 standalone snippets pass; task-3-review1-package.log |
| Original reviewer probe, source imports | 0; task-3-review1-probe.log; both materializer getters and group getter read once, callable GraphWalk/AsyncGraphWalk accepted, addedIndex/visitorGroup accepted, structural/cross-realm completedWork preserved |
| git diff --check | 0 |

The original reviewer probe was rerun with `node -r ts-node/register/transpile-only -r tsconfig-paths/register /tmp/ctt-task3-review-551edce/probe.cjs`, writing only the new output under this task workspace. All new scripts/logs/evidence stay here. No unrelated benchmark/example/package-generator repetition was needed for this shared-helper correction; prior task evidence remains available above.

Self-review checked inherited lookups, exact accessor errors, original callback receivers across async suspension, captured-value use, metadata acceptance, source receiver exemptions and patch atomicity. No known remaining review-round defect. No subagents, push, merge or publication. Pre-existing review artifacts remain untracked and untouched.

Changed files: [task-3-review1-files.txt](task-3-review1-files.txt).

Review round 1 commit: `9bcecd1a916392ce10eda0a8fa82d909c0149715`
