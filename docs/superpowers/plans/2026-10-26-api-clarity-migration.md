# API Clarity Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. The approved review is the binding specification.

**Goal:** Implement all 20 recommendations in the approved API naming review, with one coherent supported public API across tree, DAG and graph walking.

**Architecture:** Migrate canonical names and types first, then separate emitted-event selection from visitor eligibility, then tighten the public construction/export boundaries. Preserve the shared scheduling engine's semantics and use public regressions plus packed consumers to verify the changed contract. Historical reviews remain baseline evidence; current documentation and runnable examples use the implemented API.

**Tech Stack:** TypeScript (existing 4.7 minimum until evidence requires otherwise), Jest, Node >=22.12, CommonJS and ESM facades.

**Spec:** `docs/superpowers/reviews/2026-10-26-api-naming-review.md` and its consolidated `2026-10-26-api-naming-audit/assessment.json` for per-symbol intent. The numbered report controls conflicts.

## Global Constraints

- Implement every numbered recommendation; renamed aliases alone do not satisfy the smaller canonical public-surface requirement.
- Preserve arbitrary ID identity, including undefined, null, NaN, symbols and objects; preserve exact thrown/rejected values.
- Preserve W versus C semantics, structural child relationships, callback-before-commit/event-after-commit timing, generation guards and host ownership of dispatch/claims/retries/storage.
- Preserve synchronous/asynchronous and tree/DAG/walking distinctions. A promise-aware source or factory does not imply concurrent execution.
- Preserve event iterator laziness, visitor command commit pause boundaries, requestPause draining, and terminal walking close behavior.
- Keep 100% source coverage. Run focused tests per task and the complete npm run check before completion. Do not weaken tests or coverage to obtain green output.
- Verify packed ESM/CJS constructor, sentinel, namespace and declaration identity; unsupported deep imports must actually be blocked.
- Preserve the six pre-existing documentation edits and the audit evidence. Never modify the original checkout's unrelated drafts.
- The active isolated worktree is `/home/df/.codex/worktrees/04b4/configurable-tree-traversal`; use explicit working directories. Writes there may require sandbox escalation.
- No npm publication, remote push or merge is part of this goal. Local checkpoint commits are authorized implementation work.
- Existing source filenames can stay internal implementation paths. Avoid unnecessary file renames and preserve historical source links. Public exports and declaration names must use the approved vocabulary.

## Task map and acceptance matrix

| Task | Recommendations completed or advanced | Main evidence |
| --- | --- | --- |
| 1 | 5,6,11,12,14; type names for 17 | Canonical source/factory/inspection imports; typecheck and all migrated runtime tests |
| 2 | 2,13,17, execution part of19 | Distinct DAG event/visitor filters; family-safe compile-time failures; pause/iterator regressions |
| 3 | 3,4,8, DAG part of17/18 | Exact progress sets, W/C constraints, wait-edge direction/SCC membership, work tickets |
| 4 | 15,16, walking part of17 | Predicate timing, budget accounting, per-phase/admission/local-edge coordinates |
| 5 | 7,9,10,18,20; leaf predicates15 | Shared original payloads, partial/final rewrite output, typed mutation patches, references and child indexing |
| 6 | 19, construction and encapsulation1 | Required source at construction, source-preserving patches, private normalized fields/constructors |
| 7 | 1, canonical export completion of all | Curated runtime/type exports, blocked engine imports, packed consumers |
| 8 | Documentation and all20 final audit | Current guides/examples, migration table, npm run check, full review, requirement-by-requirement proof |

## Task 1: Canonical source, factory, family and inspection vocabulary

**Files:** `src/sources/`, `src/core/TraversableTree.ts`, `src/core/TraversableGraph.ts`, `src/core/AsyncTraversableTree.ts`, `src/core/TreeTypeParameters.ts`, `src/core/Traversal.ts`, `src/core/TraversalRunner.ts`, `src/traversals/{depth-first-traversal,breadth-first-traversal,dag-traversal,graph-walk}/`, object source declaration, affected imports in `tests/`, `examples/`, `scripts/` and current docs. Keep filenames stable; replace symbol identifiers without changing module-specifier strings to nonexistent paths.

**Interfaces produced:** canonical names below with existing type parameter order and runtime behavior. `prepareDag`, `prepareDagDefinition`, `defineDag`, `composeDag`, `reviseDag`, `diffDagDefinitions`, `GraphWalk` stay named as they are.

- [ ] Add a public migration regression `tests/api-clarity-migration.test.ts` exercising the new names before implementation. A representative source/factory assertion:

```ts
import { materializeDagSourceFromRecords, prepareDag } from '../src';
const prepared = prepareDag(materializeDagSourceFromRecords([{id:'a'}], {id: x => x.id}));
if (prepared.kind === 'invalid') throw new Error('unexpected invalid fixture');
expect(prepared.dag.createWorkSession().advance().kind).toBe('awaitingSettlement');
```

Run `npm test -- tests/api-clarity-migration.test.ts`; capture expected missing-export/member failure. Add compile-time usages of `TreeSource`, `DagDiscoverySource`, `DepthFirstTreeTraversal`, `DagMilestoneSnapshot` in existing public type assertions.

- [ ] Apply the following exact symbol/factory/source callback mapping, migrating source callers, tests, examples and packed consumers together:

```text
graphFrom / graphFromAsync -> materializeDagSourceFromRecords / materializeDagSourceFromRecordsAsync
forestFrom / forestFromAsync -> materializeDagSourceFromRoots / materializeDagSourceFromRootsAsync
walkSourceFrom / walkSourceFromAsync -> materializeWalkSourceFromRecords / materializeWalkSourceFromRecordsAsync
walkSourceFromDag -> materializeWalkSourceFromDagDefinition
CollectionSource -> MaterializedDagSource
GraphSelectors / AsyncGraphSelectors -> DagRecordSelectors / AsyncDagRecordSelectors
ForestSelectors / AsyncForestSelectors -> DagRootSelectors / AsyncDagRootSelectors
TraversableTree / AsyncTraversableTree -> TreeSource / AsyncTreeSource
AbstractTraversableTree -> AbstractTreeSource
TraversableGraph / AsyncTraversableGraph -> DagDiscoverySource / AsyncDagDiscoverySource
TraversableObjectTree -> ObjectTreeSource
TreeTypeParameters -> VertexTypes
FoundVertexResult / OmittedVertexResult / SourceVertexResult -> DagVertexFound / DagVertexOmitted / DagVertexResolution
PrerequisiteResolutionResult -> DagPrerequisiteResolution
MissingVertexResult -> PrerequisiteMissing
TreeFoundVertexResult / TreeOmittedVertexResult / TreeSourceVertexResult -> TreeVertexFound / TreeVertexOmitted / TreeVertexResolution
source.makeRoot / source.makeVertex -> source.resolveRoot / source.resolveChild (all source protocol implementations and adapters)
DepthFirstTraversal / AsyncDepthFirstTraversal -> DepthFirstTreeTraversal / AsyncDepthFirstTreeTraversal
BreadthFirstTraversal / AsyncBreadthFirstTraversal -> BreadthFirstTreeTraversal / AsyncBreadthFirstTreeTraversal
DepthFirstTraversalRunner / AsyncDepthFirstTraversalRunner -> DepthFirstTreeRunner / AsyncDepthFirstTreeRunner
BreadthFirstTraversalRunner / AsyncBreadthFirstTraversalRunner -> BreadthFirstTreeRunner / AsyncBreadthFirstTreeRunner
traverseDepthFirst / traverseDepthFirstAsync -> traverseTreeDepthFirst / traverseTreeDepthFirstAsync
traverseBreadthFirst / traverseBreadthFirstAsync -> traverseTreeBreadthFirst / traverseTreeBreadthFirstAsync
Traversal / TraversalRunner / TraversalRunnerIterable -> TreeTraversal / TreeTraversalRunner / TreeTraversalIterable
TraversalRunnerIteratorResultContent -> TreeTraversalEvent
makeRunner -> createRunner (public builders and base contract)
DagCoordinator / AsyncDagCoordinator -> DagWorkSession / AsyncDagWorkSession
coordinateDag / coordinateDagAsync -> createDagWorkSession / createAsyncDagWorkSession
PreparedDag.createSession / createAsyncSession -> createWorkSession / createAsyncWorkSession
DagCoordinationBoundary / DagCoordinationResult -> DagWorkBoundary / DagSettlementReceipt
PreparedDagSessionOptions / PreparedAsyncDagSessionOptions -> DagWorkSessionOptions / AsyncDagWorkSessionOptions
DagDefinitionResult -> PrepareDagResult (one declaration; eliminate reverse alias collision)
DagInspection -> DagMilestoneSnapshot
inspectDag (standalone) -> inspectDagMilestones
runner/session.inspectDag -> inspectMilestones
```

Internal `TreeSource` union in callback bindings must be renamed to `AnyTreeSource` or inlined to free the public name. Inspect internal-name collisions against the audit before replacements. Do not change event/visitor selectors, W/C field names, diagnostic endpoints, progress fields or object/reference representation in this task; later tasks own these effects.

- [ ] Preserve lazy versus materialized semantics; async materializers still return synchronous sources after awaiting. Sources retain found/omitted/missing distinctions, original receiver binding and all source-family restrictions.
- [ ] Run `npm run typecheck`, the new regression, source/definition/inspection/tree/walk focused suites, then `npm test -- --silent` once. Adjust current consumer uses; do not reduce assertions. Record actual failures and fixes.
- [ ] Self-review and commit only task-owned changes. Report red/green evidence, exact commands/results, commit and remaining task-boundary concerns. A separate reviewer checks specification and quality.

## Task 2: Separate event selection from callback eligibility and execution iteration

**Files:** `src/core/TraversalExecution.ts`, `TraversalRunnerIterableConfig.ts`, `normalizeTraversalExecutionOptions.ts`, `TraversalVisitor.ts`, execution inspection types, drivers/kernel phase gates, tree/DAG/walking public runners, event and visitor contracts, tests for execution capabilities and async lifecycle.

**Interfaces:** Canonical `TraversalExecutionOptions<VisitorPhase, EmittedKind = VisitorPhase>` has independent `emitEvents?: readonly EmittedKind[]` and `visitorPhases?: VisitorPhaseSelection<VisitorPhase>`. Keep execution capability generics phase/event compatible by adding a trailing emitted-kind parameter where needed. DAG emitted kinds are `'workCompleted' | 'subgraphCompleted'`; DAG visitors use `DagVisitorPhase.ON_WORK_READY | ON_SUBGRAPH_READY`. Tree emission uses tree phases; walking emission uses the actual vertex/edge/path event discriminants. Callback context uses `phase`; DAG committed events have kind and no canonical callback-phase field.

- [ ] Extend public type assertions before source changes: DAG `emitEvents:['workCompleted']` accepted, callback phase in emitEvents rejected; event kind in visitorPhases rejected. Tree and walking cross-family selections must fail. Compile and capture expected errors before implementation.
- [ ] Add/update runtime regressions proving work callbacks precede committed work events, external settlement does not emit completion prematurely, callback and emission filters patch independently, filtered callbacks still allow external settlement, and buffered walking records obey delivery-time selection.
- [ ] Implement separate public selector domains and translate to internal scheduler phase gates where appropriate. Preserve legacy compatibility only behind explicitly deprecated/internal translation, not as equally preferred construction options. Do not silently reinterpret invalid keys as empty configuration.

```ts
const runner = prepared.dag.createRunner({ visitors: {
  [DagVisitorPhase.ON_WORK_READY]: () => { calls.push('ready'); }
}});
const events = [...runner.iterateEvents({ emitEvents: ['workCompleted'] })];
expect(calls).toEqual(['ready']);
expect(events.map(event => event.kind)).toEqual(['workCompleted']);
```

- [ ] Rename public `getIterable` to `iterateEvents` everywhere, pause command to `PAUSE_TRAVERSAL`, inspection flag to `pauseRequested`. Keep `run`, broad HALTED/isHalted and explicit stop reason. Rename tree phase enums `DepthFirstPhase`, `BreadthFirstPhase`. Use callback `phase`, `visitorIndex`, `visitorChainState`, `registration`, `phaseVisitIndex`, `previousPhaseVertexRef`; consolidate identical async contexts. Rename callback-supplied input option types to `TreeVisitorContext`, `DagVisitorContext`, `TreeChildResolutionContext`, `DagChildResolutionContext`.
- [ ] Verify iterator first-next laziness, command boundary pause versus cooperative requestPause drain, exact failure replay, and async closure regressions across families. Run typecheck, affected source tests and full suite once; commit and report evidence.

## Task 3: Explicit DAG milestones, progress and diagnostic relations

**Files:** DAG progress/definition/fragment/revision/inspection types and implementations, `src/core/scheduling/`, `TraversalKernel.ts`, graph source/record types, `coordinateDag.ts`, source selectors, DAG walking relation adapter, corresponding runtime/type tests and examples.

**Interfaces:** use fields `dependsOnWork`, `dependsOnSubgraphCompletion`, `subgraphComplete`, `completedSubgraphIds`, `unmetSubgraphPrerequisiteIds`; milestone discriminants `'work' | 'subgraphCompletion'`; relation/aspect `subgraphCompletionDependencies`, relation kind `subgraphCompletionDependency`. Public `DagWaitEdge { waiter: DagMilestone, prerequisite: DagMilestone, reason }`; `dependencyCycleComponents`. Session `completeWork`, boundary `workTickets`, command `DEFER_WORK_COMPLETION`.

- [ ] Migrate a focused external-settlement test before implementation to assert exact overlapping progress facts and new fields:

```ts
expect(runner.summary().readyOrDeferredIds).toEqual(['task']);
expect(runner.summary().activeVisitorVertexIds).toEqual([]);
expect(runner.summary().awaitingSettlement[0]!.vertexId).toBe('task');
```

Capture missing API failures. Add an assertion that accepted-but-uncommitted deferred outcomes leave deferredWorkIds but are excluded from awaitingSettlement at the existing boundary; retain existing generation tests.
- [ ] Apply milestone vocabulary across all public source/definition/prepared/query shapes and runtime reads. Rename counts.ready to readyOrDeferred, inFlight to activeVisitorVertices, deferred to deferredWork, subtreeCompleted to subgraphCompleted. State running becomes visiting; progress id becomes vertexId. Keep exact set membership, overlap and order.
- [ ] Rename diagnostic endpoints semantically, not graph-walk endpoints. Keep waiter→prerequisite direction and SCC membership. Update declarations/inspection/fragment constraint construction and tests that establish W/C and structural constraints.
- [ ] Rename active DEFER_READY command; keep old deprecated sentinel only as compatibility, not a new renamed sentinel. Work sessions still accept W, failTraversal still fails the traversal, tickets remain session-local.
- [ ] Run focused DAG progress, completion-dependency, inspection, definitions/fragments/revisions and walk-adapter tests plus typecheck, then full suite once. Commit and report.

## Task 4: Walking predicates, accounting units and coordinates

**Files:** `src/traversals/graph-walk/GraphWalkOptions.ts`, `GraphWalkVisitor.ts`, `GraphWalkEvent.ts`, `lib/WalkKernel.ts`, `WalkVisitorChain.ts`, summary/inspection/normalization, walking tests/types/examples/packed consumers.

**Interfaces:** `shouldFollowEdge`, `shouldExpandVertex`, `GraphWalkEdgePredicate`, `GraphWalkExpansionPredicate` and Async counterparts. `candidateReadAttempts`, `maxCandidateReadAttempts`, `admittedTargets`, `maxAdmittedTargets`, `uniqueFoundVertices`, `uniqueOmittedVertices`, `discoveredLinks`, `processedObservations`; matching limit reason literals. Context `admissionIndex`, `phaseObservationIndex`; edge `outgoingIndex`; inspection active visitor `visitorIndex` and `executionOptions`.

- [ ] First migrate focused budget/predicate tests to canonical names and assert rejected edges still count fresh adjacency/read attempts without resolving their targets; capture red.
- [ ] Rename contracts and every runtime update/limit comparison atomically. Preserve exhausted-read and cache-replay charging, omitted admissions, per-phase observation acknowledgement and maxDepth behavior. Preserve strict boolean validation and source receiver binding.

```ts
expect(summary.counts.discoveredLinks).toBe(1);
expect(summary.counts.uniqueFoundVertices).toBe(1);
expect(summary.counts.admittedTargets).toBe(1);
```

The fixture starts at one found vertex with one edge rejected by shouldFollowEdge; source resolution of that rejected target must never occur.
- [ ] Keep source roots terminology and lazy resolution; no starting-vertex invariant added. Preserve same-route edge outgoingIndex on cached replay and distinct original DAG slotIndex.
- [ ] Run walking focused suites/type assertions, then full suite once. Commit and report.

## Task 5: Original structure, references, object mutation/output and tree positioning

**Files:** core reference/vertex/tree/graph value and view types; original snapshot/container code; object source/mutation/rewrite helper; in-order config/helpers; relevant runtime/type tests/examples/packed consumers.

**Interfaces:** `MutableRef<T>` with getValue/setValue/getRefId; `VertexRef<T>` specialized alias; `ResolvedGraphVertex`, `ResolvedVertexStatus`, `StructuralChildEdge`, `TreeVertexRecord` with metadata/children, `ResolvedTreeStore`, getResolvedTreeStore, existing ResolvedTreeView. `retainOriginalTreeStructure`, `retainOriginalGraphStructure`, originalTreeView/originalGraphView, OriginalGraphView. `createObjectMutationBinder`, ObjectMutationBinder, ObjectMutationCommands, ObjectMutationPatch, ObjectMutationOptions; generic MutationCommandBinderFactory/Binder/Builder/Request/Command. Root callable rewriteObject, namespace objectRewrite, result outputAtReturn/getOutput. InOrderOptions, inOrder, ChildIndexSelection, afterChildIndices/fallbackChildIndices/visitSingleChildParent/visitAfterOmittedChildren. Predicates hasNoChildHints/isTraversalLeaf/hasSingleStructuralSink/filterDagDataVisitor.

- [ ] First add/update tests for root callable rewriting, partial outputAtReturn versus getOutput after resume; prove getOutput before FINISHED throws. Add direct handle test:

```ts
const ref = new MutableRef({ value: 1 });
const id = ref.getRefId();
ref.setValue({ value: 2 });
expect(ref.getValue()).toEqual({ value: 2 });
expect(ref.getRefId()).toBe(id);
```

Capture expected missing API failures before implementation.
- [ ] Implement the value/record/store distinction carefully: caller Vertex payload/hints keep canonical $data/$childHints, while TreeVertexRecord metadata/children are different fields. Deprecated Vertex input/access aliases must not be confused with record field migration.
- [ ] Rename original retention options/views without cloning payloads or claiming frozen snapshots. Prove progressive discovery adds structure and payload identity remains shared; tree queries remain detached/shallow.
- [ ] Rename object mutation stages/types without changing property-patch presence semantics, falsy values, symbol keys, composite assembly, or generic rewrite output unknown/assertion behavior. Root exports must identify callable and namespace separately.
- [ ] Rename in-order config preserving index zero, negative indices, range normalization, all-out-of-bounds fallback and omitted slots. Rename leaf/sink/data-filter predicates with unchanged respective criteria.
- [ ] Run object/tree/graph/reference/retention focused tests and typecheck, then full suite once. Commit and report.

## Task 6: Canonical options, construction and encapsulation

**Files:** public builder/runner configuration types and classes across families; default/normalization helpers; shared visitor/sorter types; public construction type tests.

**Interfaces:** `<Family>Options` requires the source; `<Family>OptionsPatch` is source-preserving partial configuration; internal `<Family>ResolvedOptions` owns defaults. Shared ChildHintSorter/AsyncChildHintSorter. DagSchedulingOptions covers discovery/work/dependency policy. Execution input from Task2 remains distinct from effective diagnostic output. Registration uses canonical commandCommitMode.

- [ ] Add compile-time negative assertions before implementation:

```ts
// @ts-expect-error construction requires a source
new DepthFirstTreeTraversal({});
const traversal = new DepthFirstTreeTraversal({ traversableTree: source });
traversal.configure({ visitors: {} });
// @ts-expect-error mutable engine state is not a public configuration port
traversal.configure({ traversalRunnerInternalObjects: {} });
```

Source option keys may remain traversableTree/traversableGraph unless the approved source-type migration has already chosen explicit canonical keys; do not invent another source-key vocabulary without need.
- [ ] Separate construction from patch types across tree/DAG/walking/object constructors. Preserve field-wise patch/visitor policy behavior and atomic validation. Keep configure mutating/fluent.
- [ ] Hide mutable public icfg/state/curGenerator/raw visitors/container fields and normalized-constructor protocols. Use private implementation state and public execution capability interfaces/factories. Internally needed engine access must be module-local or through unexported internal capabilities, not new public unsafe getters. Package declarations must not expose construct signatures requiring normalized options.
- [ ] Remove legacy options/aliases from preferred canonical input types. Compatibility support if retained must be explicitly isolated/deprecated and must not silently accept invalid canonical options. Consolidate identical callbacks/context types; preserve distinct async signatures and family-safe phase/event parameters.
- [ ] Run typecheck, config/registration/pause tests and full suite once. Commit and report.

## Task 7: Curated exports and packed-consumer enforcement

**Files:** `package.json`, `typesVersions`, root/family/core/object/source barrels, public runner interface exports, `scripts/build-esm.cjs`, `scripts/verify-package.cjs`, packed consumer fixtures and packaging unit tests.

**Interfaces:** root and explicit family subpaths expose canonical user contracts only. No wildcard engine import routes. ESM/CJS named exports and namespace exports retain identity. package.json metadata stays available. GraphWalkOperation remains a named public diagnostic union or inline equivalent.

- [ ] Add failing packed import/type-consumer assertions that internal paths are unavailable and canonical root/subpath APIs work. Test both extension and extensionless engine paths with actual package resolution, not source-string inspection:

```js
assert.throws(() => require('configurable-tree-traversal/core/TraversalKernel'),
  error => error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED');
assert.equal(typeof require('configurable-tree-traversal').rewriteObject, 'function');
```

- [ ] Replace wildcard exports/typesVersions with the explicit supported map. Curate barrels to remove kernel/driver/state/normalization/default scaffolding, raw injection types and accidental utilities. Retain intentional public types needed in returned diagnostics. Do not treat an internal filename or @internal comment as blocking imports.
- [ ] Ensure root/subpath declarations reference canonical public contracts; inspect emitted class constructors/members and transitive signatures. Exporting an interface over a private implementation is preferable to a public class requiring engine state. Make canonical imports discoverable without hundreds of alias alternatives.
- [ ] Update packaging tests/fixtures that intentionally verified every old deep path: replace them with deliberate public-path identity and denied-internal-path evidence while retaining CJS/ESM and supported TS lanes. No blanket deletion of packaging assertions.
- [ ] Run npm run verify-package and npm run test:packaging plus typecheck. Commit and report.

## Task 8: Current documentation, complete validation and all-20 completion audit

**Files:** `README.md`, `AGENTS.md`, `docs/index.md`, `docs/reference.md`, `docs/agent-workflows.md`, `docs/migration-uniform-api.md`, new `docs/migration-api-clarity.md`, package files list, runnable examples and final implementation audit `docs/superpowers/reviews/2026-10-26-api-clarity-implementation-audit.md`.

- [ ] Write a migration table for every changed supported symbol/property/literal and removed export path, including why old ready/inFlight/output/snapshot names were misleading. Keep original review/audit immutable historical evidence and preserve existing public documentation anchors.
- [ ] Update current guides/examples to canonical API. Do not reintroduce checkout/published-release caveats removed at the user's request. Package the new consumer migration guide and verify its relative links.
- [ ] Add a compact implementation audit with 20 rows, each linking exact source/types, behavior/type/packed tests and verification results. Account for every named change and invariant in the approved report; do not mark a row complete from grep absence alone.
- [ ] Run `npm run check` unchanged. Fix failures using focused regressions, then rerun relevant checks and the required whole-package gate. All source tests retain 100% coverage; examples/build/packed consumers/benchmark and generator checks must pass.
- [ ] Produce a fresh public export/declaration census to prove internals and competing canonical names are absent while intended configurable APIs remain available. Verify runtime and type reachability from the packed package.
- [ ] Commit and report. Controller dispatches broad whole-branch spec/quality review and accounts for findings before goal completion. Local implementation completion does not imply publish/push/merge.
