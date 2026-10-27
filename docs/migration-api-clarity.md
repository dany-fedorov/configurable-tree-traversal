# Migrate to the clearer public API

[Documentation map](index.md) · [Reference](reference.md) · [Agent workflows](agent-workflows.md) · [Uniform API migration](migration-uniform-api.md)

This migration makes callback eligibility, committed observations, retained structure and host work distinct. It also removes accidental engine extension points. The tables below list the changed supported names, properties and literals; old names and compatibility inputs are removed. Existing implementation filenames do not establish supported import paths.

## Supported imports and removed extension points

Use these explicit package specifiers. Each runtime entry shares its CJS/ESM constructors, sentinels, functions, namespaces and canonical declarations.

| Supported specifier                                                                    | Purpose                                                                                 |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `configurable-tree-traversal`                                                          | All intentional named exports and family namespaces                                     |
| `configurable-tree-traversal/core`                                                     | Source/value/view contracts, execution capabilities, commands and diagnostics           |
| `configurable-tree-traversal/sources`                                                  | Finite DAG catalog/root materializers and selectors                                     |
| `configurable-tree-traversal/traversals/depth-first-traversal`                         | Depth-first tree builders, helpers, phases and runner interfaces                        |
| `configurable-tree-traversal/traversals/breadth-first-traversal`                       | Breadth-first tree equivalents                                                          |
| `configurable-tree-traversal/traversals/dag-traversal`                                 | DAG builders, preparation, sessions, definitions, composition, revisions and inspection |
| `configurable-tree-traversal/traversals/graph-walk`                                    | General graph walking and materializers                                                 |
| `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree` | Object tree source and mutation binder                                                  |
| `configurable-tree-traversal/tools/rewrite-object`                                     | Callable object rewrite helpers and their contracts                                     |
| `configurable-tree-traversal/package.json`                                             | Package metadata; not a runtime API module                                              |

The old `./*` and `./*.js` export routes are removed. This blocks **all unlisted paths**, including `core/Vertex`, `core/CTTRef`, `core/TraversalKernel`, `core/graph/GraphStore`, `core/drivers/runAsync`, `core/drivers/runSync`, `core/effects/*`, `core/scheduling/*`, `core/visitors/*`, `internal/*`, family `lib/*`, family implementation files, `sources/index`, object/rewrite implementation files and `dist/*`. Neither adding `.js` nor importing an `index` file restores access. Internal modules remain physically packaged for relative implementation/declaration references; Node exports and TypeScript node/node16 resolution deny consumer deep imports.

| Removed surface                                                                                                                                                 | Migration and reason                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runner runtime constructors, normalized constructor inputs                                                                                                      | Use builder `.createRunner()` or prepared DAG factories. All eight concrete runner names are capability **interfaces**, not constructable values. Redundant runtime builder/runner/iterable bases are removed.                               |
| Public `icfg`, `state`, `curGenerator`, visitor/container fields; `traversalRunnerInternalObjects` injection                                                    | Use registration/configuration methods, `inspect()`, `summary()`, safe views and public factories. Raw-state injection rejects; no public restoration constructor exists.                                                                    |
| Kernels, `runSync`, deep `runAsync`/`createAsyncDriver`, effect protocols, queue policies, raw graph stores, state bridges, normalized defaults/merge functions | Private implementation. Execute through a runner's `run()` or `iterateEvents()`. Deep `runAsync` was a driver alias, not the counterpart of `runSync`.                                                                                       |
| Internal `WalkLink`, `WalkOperation`, `DagInspectionSnapshot` and normalized option types                                                                       | Use `GraphWalkLink`, public `GraphWalkOperation`, `DagMilestoneSnapshot`, and family input options. `GraphWalkOperation` still describes all nine diagnostic operations; predicate labels are now `shouldFollowEdge` / `shouldExpandVertex`. |
| Runner `inspectDagState()` / assembly `DagInspectionState`                                                                                                      | Removed internal milestone-assembly port; use `inspectMilestones()` / `inspectDagMilestones()` for a captured public snapshot.                                                                                                               |
| `ResolvedTreeStore.getGraphStore()`                                                                                                                             | Removed raw graph-store bridge. Use `asReadOnly()` or the deliberate tree store editing/query methods, preserving consistency yourself.                                                                                                      |

Namespaces `core`, `depthFirstTraversal`, `breadthFirstTraversal`, `dagTraversal`, `graphWalk` and `traversableObjectTree` remain. Root `rewriteObject` changes from namespace to function; its namespace is now `objectRewrite`.

## Discovery and finite materialization

| Previous                                                                     | Canonical                                                                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `graphFrom`, `graphFromAsync`                                                | `materializeDagInputFromRecords`, `materializeDagInputFromRecordsAsync`                              |
| `forestFrom`, `forestFromAsync`                                              | `materializeDagInputFromRoots`, `materializeDagInputFromRootsAsync`                                  |
| `walkSourceFrom`, `walkSourceFromAsync`                                      | `materializeWalkSourceFromRecords`, `materializeWalkSourceFromRecordsAsync`                            |
| `walkSourceFromDag`                                                          | `materializeWalkSourceFromDagDefinition`                                                               |
| `CollectionSource`                                                           | `MaterializedDagInput`                                                                                |
| `GraphSelectors`, `AsyncGraphSelectors`                                      | `DagRecordSelectors`, `AsyncDagRecordSelectors`                                                        |
| `ForestSelectors`, `AsyncForestSelectors`                                    | `DagRootSelectors`, `AsyncDagRootSelectors`                                                            |
| `TraversableTree`, `AsyncTraversableTree`, `AbstractTraversableTree`         | `TreeSource`, `AsyncTreeSource`; implement these structurally                                          |
| `TraversableGraph`, `AsyncTraversableGraph`                                  | `DagDiscoverySource`, `AsyncDagDiscoverySource`                                                        |
| `TraversableObjectTree`, `TreeTypeParameters`                                | `ObjectTreeSource`, `VertexTypes`                                                                      |
| Source `makeRoot`, `makeVertex`                                              | `resolveRoot`, `resolveChild`                                                                          |
| `MakeVertexOptions`, `MakeGraphVertexOptions`                                | `TreeChildResolutionContext`, `DagChildResolutionContext`                                              |
| `FoundVertexResult`, `OmittedVertexResult`, `SourceVertexResult`             | `DagVertexFound`, `DagVertexOmitted`, `DagVertexResolution`                                            |
| `PrerequisiteResolutionResult`, `MissingVertexResult`                        | `DagPrerequisiteResolution`, `PrerequisiteMissing`                                                     |
| `TreeFoundVertexResult`, `TreeOmittedVertexResult`, `TreeSourceVertexResult` | `TreeVertexFound`, `TreeVertexOmitted`, `TreeVertexResolution`                                         |
| Public legacy `MakeVertexResult`, `MakeTreeVertexResult` imports             | Use the family resolution union. Untagged inputs are removed; return tagged `found`/`omitted` results. |

Materializers eagerly copy finite membership and edge lists and share caller data/ID identity. Record catalogs include disconnected records. Root materialization allows shared records; it does not assert a strict forest. DAG materialization adapts discovery, without executing work or validating all milestone constraints; preparation validates those later. Async materializers await input and return **synchronous** sources. The definition-to-walking adapter materializes selected relations, not a running coordinator. There is no additional async definition adapter.

For lazy fetching, implement the source protocol. `resolveChild` consumes an opaque hint; `resolvePrerequisite` looks up an ID. Tree/DAG results prefer `{ kind: 'found', vertex: { vertexContent: { $data, $childHints }, ... } }` or a family-specific omitted result (DAG `{ kind: 'omitted', satisfiesDependencies: true }`, tree `{ kind: 'omitted' }`); only DAG prerequisite lookup permits `{ kind: 'missing' }`. Trees forbid graph metadata. `GraphWalkSource` / `AsyncGraphWalkSource` retain `roots`, `resolveVertex` and `outgoing`, and walking has its own found/omitted data result. Arbitrary starting vertices are valid roots.

## Builders, factories and options

| Previous                                                                                                 | Canonical                                                                                              |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `DepthFirstTraversal`, `AsyncDepthFirstTraversal`                                                        | `DepthFirstTreeTraversal`, `AsyncDepthFirstTreeTraversal`                                              |
| `BreadthFirstTraversal`, `AsyncBreadthFirstTraversal`                                                    | `BreadthFirstTreeTraversal`, `AsyncBreadthFirstTreeTraversal`                                          |
| `DepthFirstTraversalRunner`, `AsyncDepthFirstTraversalRunner`                                            | `DepthFirstTreeRunner`, `AsyncDepthFirstTreeRunner` interfaces                                         |
| `BreadthFirstTraversalRunner`, `AsyncBreadthFirstTraversalRunner`                                        | `BreadthFirstTreeRunner`, `AsyncBreadthFirstTreeRunner` interfaces                                     |
| `traverseDepthFirst`, `traverseDepthFirstAsync`                                                          | `traverseTreeDepthFirst`, `traverseTreeDepthFirstAsync`                                                |
| `traverseBreadthFirst`, `traverseBreadthFirstAsync`                                                      | `traverseTreeBreadthFirst`, `traverseTreeBreadthFirstAsync`                                            |
| `Traversal`, `TraversalRunner`, `TraversalRunnerIterable`, `TraversalRunnerIteratorResultContent`        | Use concrete builders, execution capabilities, standard `Iterable`, and `TreeTraversalEvent`           |
| Builder `makeRunner`                                                                                     | `createRunner`                                                                                         |
| `DagCoordinator`, `AsyncDagCoordinator`                                                                  | `DagWorkSession`, `AsyncDagWorkSession`                                                                |
| `coordinateDag`, `coordinateDagAsync`                                                                    | `createDagWorkSession`, `createAsyncDagWorkSession`                                                    |
| Prepared `.createSession`, `.createAsyncSession`                                                         | `.createWorkSession`, `.createAsyncWorkSession`                                                        |
| `DagCoordinationBoundary`, `.frontier`                                                                   | `DagWorkBoundary`, `.workTickets`                                                                      |
| `DagCoordinationResult`                                                                                  | `DagSettlementReceipt`                                                                                 |
| `PreparedDagSessionOptions`, `PreparedAsyncDagSessionOptions`                                            | `DagWorkSessionOptions`, `AsyncDagWorkSessionOptions`                                                  |
| `DagDefinitionResult`                                                                                    | `PrepareDagResult`: success contains a `PreparedDag`                                                   |
| `DagDiscoveryOptions`                                                                                    | `DagSchedulingOptions`                                                                                 |
| `GraphWalkConfigureInput`, `AsyncGraphWalkConfigureInput`                                                | `GraphWalkOptionsPatch`, `AsyncGraphWalkOptionsPatch`                                                  |
| `TraversableObjectTreeInstanceConfigInput`                                                               | `ObjectTreeOptions`; required root remains a positional source value                                   |
| Family `*InstanceConfigInput`, `*ConfigureInput`, `*HelperOptions` / DAG `*HelperConfig`                 | Source-required construction `Options`, source-preserving `OptionsPatch`; helpers use the same options |
| `SortChildrenHintsFn`, `BreadthFirstSortChildrenHintsFn`, `DagSortChildrenHintsFn` and their async forms | Shared `ChildHintSorter`, `AsyncChildHintSorter`                                                       |
| Public `*InstanceConfig`, runner configs/defaults and merge/normalization helpers                        | Private resolved options; there is no public normalized-state construction route                       |

The exact construction/patch pairs are `DepthFirstTreeOptions` / `DepthFirstTreeOptionsPatch`, `AsyncDepthFirstTreeOptions` / `AsyncDepthFirstTreeOptionsPatch`, `BreadthFirstTreeOptions` / `BreadthFirstTreeOptionsPatch`, `AsyncBreadthFirstTreeOptions` / `AsyncBreadthFirstTreeOptionsPatch`, `DagOptions` / `DagOptionsPatch`, `AsyncDagOptions` / `AsyncDagOptionsPatch`, `GraphWalkOptions` / `GraphWalkOptionsPatch`, and `AsyncGraphWalkOptions` / `AsyncGraphWalkOptionsPatch`. `configure()` mutates the builder fluently, validates patches before mutation and affects future runners. Omitted fields preserve policy; nested visitor/selector fields patch independently, while walking `limits` replaces its record. See [patch rules](reference.md#configuration-patches).

Prepared DAGs and rewrite helpers own their sources and forbid caller source/state overrides. `createAsyncDagWorkSession(runner)` synchronously creates an async wrapper; its execution methods return promises. Prepared `.createAsyncRunner()` and `.createAsyncWorkSession()` themselves return promises. Promise-aware sources/factories do not imply concurrent walking; async walking remains serial. Tree/DAG concurrency is separate policy.

`defineDag` copies/normalizes authored declarations; `prepareDagDefinition` validates/prepares them. `prepareDag`, `composeDag`, `reviseDag` and `diffDagDefinitions` keep their distinct effects. Definitions preserve ordered omitted slots; the prepared `.vertices` projection includes only live structural children. Session `advance`, `failTraversal`, registration methods, `run`, `configure` and graph-walking strategy/revisit configuration remain receiver-scoped operations.

## Callback phases, committed events and execution

| Previous                                                                   | Canonical                                                                                                        |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `DepthFirstTraversalOrder`, `BreadthFirstTraversalOrder`                   | `DepthFirstPhase`, `BreadthFirstPhase`                                                                           |
| `DagTraversalOrder.ON_READY`, `.ON_COMPLETE`                               | `DagVisitorPhase.ON_WORK_READY`, `.ON_SUBGRAPH_READY`                                                            |
| Tree event `order`                                                         | `TreeTraversalEvent.phase`                                                                                       |
| DAG event `order`                                                          | Removed; `kind: 'workCompleted'` / `'subgraphCompleted'` describes committed W/C                                 |
| `emitPhases`                                                               | `emitEvents`, with family-specific event selectors                                                               |
| `getIterable`                                                              | `iterateEvents`                                                                                                  |
| Command `HALT_TRAVERSAL`, inspection `haltRequested`                       | `PAUSE_TRAVERSAL`, `pauseRequested`                                                                              |
| Command `DEFER_READY`                                                      | `DEFER_WORK_COMPLETION`; the `DEFER_READY` sentinel is removed                                                   |
| `TraversalVisitorInputOptions`, `AsyncTraversalVisitorInputOptions`        | Shared `TreeVisitorContext`                                                                                      |
| `DagVisitorOptions`, `AsyncDagVisitorOptions`                              | Shared `DagVisitorContext`                                                                                       |
| Context `order`, `curVertexVisitorVisitIndex`, `vertexVisitorsChainState`, `visitorRecord`    | `phase`, `visitorIndex`, `visitorChainState`, `registration`                                                     |
| Tree/DAG `vertexVisitIndex`, `previousVisitedVertexRef`                    | `phaseVisitIndex`, `previousPhaseVertexRef`                                                                      |
| Walking `occurrenceIndex`, `observationIndex`, edge `index`                | `admissionIndex`, `phaseObservationIndex`, edge `outgoingIndex`                                                  |
| `*RunnerIterableConfigInput`, `TraversalIterableConfigInput`               | `TraversalExecutionOptions<VisitorPhase, EmittedKind>`                                                           |
| Preferred `iterateOver`, visitor enable/disable aliases, `resolutionStyle` | `emitEvents`, `visitorPhases`, `commandCommitMode`; retired runtime input rejects                                |
| Core/walking inspection `iterableConfig`                                   | Canonical effective `executionOptions`                                                                           |
| Walking inspection `activeVisitor.position`                                | `activeVisitor.visitorIndex`                                                                                     |
| Exported `TraversalVisitorFunctionResolutionStyle` enum                    | Removed from supported imports; use `commandCommitMode`. Registration metadata reports only `commandCommitMode`. |

DAG readiness callbacks run **before** commitment. `ON_WORK_READY` normal return commits W under `visitorReturn`; external settlement defers W even with zero/filtered callbacks. `ON_SUBGRAPH_READY` permits C commitment once W, discovery, retained children and declared C requirements allow it. Iterator events report **after** commitment, have `kind` and `vertexId`, and have no callback phase/order field. Seeded W creates no synthetic work event. Use `visitorPhases` for callbacks and `emitEvents` for independent observations. Trees select their event phases; walking selects `'vertex'`, `'edge'`, `'path'` and retains `GraphWalkPhase` callbacks. Shared `SyncTraversalExecution` / `AsyncTraversalExecution` carry separate visitor/event selection parameters; `TraversalExecutionState` remains family-independent.

Calling `iterateEvents()` creates an execution iterator: advancing it can fetch sources, invoke callbacks and commit commands. It is lazy, not passive replay. `PAUSE_TRAVERSAL` keeps its command-commit boundary; cooperative `requestPause()` drains admitted callbacks without cancellation before acknowledging pause. `isHalted()` remains because HALTED also covers prepared or awaiting-settlement states; read `getStopReason()`. Walking iterator `return()` pauses, while runner `close()` is terminal cleanup.

Tree/DAG `phaseVisitIndex` and predecessor references are scoped to a phase. Walking `admissionIndex` counts admissions; `phaseObservationIndex` is per phase, not a global event ID. `outgoingIndex` is the source-local enumeration ordinal before filtering; the DAG adapter's authored structural `slotIndex` stays separate. Phase, strategy and visitor priority are independent axes. The command is `SET_VISITOR_CHAIN_STATE` with `{ state }`; the callback field remains `visitorChainState`. State is local to one phase chain and visible after the configured command commit boundary.

## Work, subgraph completion and progress

| Previous                                                                                 | Canonical                                                      |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Source/definition/prepared/record `dependsOn`, selector `dependencies`                   | `dependsOnWork`                                                |
| Source/definition/prepared/record `dependsOnComplete`, selector `completionDependencies` | `dependsOnSubgraphCompletion`                                  |
| Progress `subtreeComplete`                                                               | `subgraphComplete`                                             |
| `completedSubtreeIds`, count `subtreeCompleted`                                          | `completedSubgraphIds`, count `subgraphCompleted`              |
| `unmetCompletePrerequisiteIds`                                                           | `unmetSubgraphPrerequisiteIds`                                 |
| Milestone `'completion'`, relation/diff `'completionDependencies'`                       | `'subgraphCompletion'`, `'subgraphCompletionDependencies'`     |
| Diagnostic reason `'completionDependency'`                                               | `'subgraphCompletionDependency'`                               |
| Session `.complete(ticket)`                                                              | `.completeWork(ticket)`                                        |
| `readyIds`, `counts.ready`                                                               | `readyOrDeferredIds`, `counts.readyOrDeferred`                 |
| `inFlightIds`, `counts.inFlight`                                                         | `activeVisitorVertexIds`, `counts.activeVisitorVertices`       |
| `deferredFrontier`, `deferredIds`, `counts.deferred`                                     | `awaitingSettlement`, `deferredWorkIds`, `counts.deferredWork` |
| `DagWorkState` literal `'running'`                                                       | `'visiting'`                                                   |
| `DagVertexProgress.id`                                                                   | `vertexId`                                                     |

W is work completion; C includes the vertex's W, structural descendant completion and declared constraints. Shared descendants make this subgraph completion. Structural child links remain separate from dependency relations. The walking `children` relation, definition-diff `slots` aspect, and shared `workDependencies` spelling retain their names. Retired collection-selector keys reject before callbacks, even when inherited or explicitly undefined, to avoid silently losing dependencies.

`readyOrDeferredIds` contains exactly ready/deferred work, excluding visiting/completed work. `activeVisitorVertexIds` includes active completion chains whose W already committed. `deferredWorkIds` includes all deferred W, while `awaitingSettlement` includes only live deferred W **without an accepted outcome**, in discovery order. Counts overlap; they are not a partition or a record of running host agents. Successful settlement commits W immediately; fatal accepted settlement removes dispatch eligibility while W remains uncommitted. Dispatch from atomic `{ vertexId, generation }` records or session work tickets, not `workCompleted` events. Generations are local symbols; duplicate/stale/foreign/conflicting report rules and exact error identities are unchanged.

The host owns dispatch, authorization, capacity/claims, attempts, retries, artifacts, business outcomes and durable storage. Reconstruct from host-accepted `completedWork` facts; neither tickets nor runner state are durable checkpoints.

## Queries, diagnostics and retained structure

| Previous                                                                                 | Canonical                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `saveNotMutatedResolvedTree`, `saveNotMutatedResolvedGraph`                              | `retainOriginalTreeStructure`, `retainOriginalGraphStructure`          |
| `notMutatedResolvedTree`, `notMutatedResolvedGraph`, associated accessors/context fields | `originalTreeView`, `originalGraphView`                                |
| `ResolvedGraphSnapshot`                                                                  | `OriginalGraphView`                                                    |
| `DagDependencyEdge`, `DagDependencyMilestone`                                            | `DagWaitEdge`, `DagMilestone`                                          |
| Diagnostic edge `from`, `to`; `dependencyCycles`                                         | `waiter`, `prerequisite`; `dependencyCycleComponents`                  |
| `DagInspection`, `inspectDag`, receiver `.inspectDag()`                                  | `DagMilestoneSnapshot`, `inspectDagMilestones`, `.inspectMilestones()` |
| Inspection ready/chain `order`; chain `phase`, `position`, `config`, `group`             | `phase`; `state`, `visitorIndex`, `executionOptions`, `commandCommitMode` |
| Inspection pending request `kind` (engine effect key)                                    | `operation` (public callback name)                                        |
| `ResolvedVertexStatus`; graph vertex `status`; `getStatusOf`                             | `ResolvedVisitStage`; `visitStage`; `getVisitStageOf`                     |

Visit stages map in order: `DISCOVERED` → `DISCOVERED`, `READY` → `INITIAL_VISIT_ELIGIBLE`, `PRE_VISITING` → `INITIAL_VISIT_STARTED`, `PRE_VISITED` → `INITIAL_VISIT_COMMITTED`, `COMPLETING` → `COMPLETION_VISIT_ELIGIBLE`, and `COMPLETE` → `COMPLETE`. Scheduling boundaries are unchanged: tree callbacks may remain initial-visit eligible while DAG callbacks are initial-visit started. A deferred DAG can remain initial-visit started with zero callbacks. Use inspection counts/chains for active callbacks and DAG summary/milestones for W/C; `DagWorkState` and runner lifecycle `getStatus()` remain separate.

Pending request operations are `resolveRoot`, `resolveChild`, `resolvePrerequisite`, `sortChildHints`, `getVertexIdFromHint`, and `visit`. Chain `phase` now means the callback phase; chain `state` carries `running | paused | done | invalid`. Frame `stage`, owner tokens, and waits remain mechanical diagnostics. `TreeDagExecutionInspection<Phase>` preserves the explicit runner family's phase type.

Original structure grows during discovery, retains topology/hints independently of command-driven rewrites, and uses distinct retained reference handles while sharing caller payloads. Repeated queries share the handles belonging to that view. Original tree callbacks expose a safe `ResolvedTreeView`, not mutable storage. Live and original query arrays/contexts are detached shallow values; read-only topology does not deeply freeze data, provide rollback, or create a complete discovery snapshot in advance.

`DagMilestoneSnapshot` instead captures progress/constraints once; refresh it after settlement. `explain`, `prerequisitesOf`, `dependentsOf` and `transitive` retain their operations. `summary()` reads current progress; `inspect()` captures execution state; `getResolvedGraph()` returns a live query view. Diagnostic wait edges point **waiter → prerequisite**, including own-work and structural-child constraints. Cycle arrays are strongly connected component membership, not an ordered cycle path. Walking edge `from/to` remains conventional direction. All IDs retain exact identity.

## Handles, records and object operations

| Previous                                                                              | Canonical                                                            |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `CTTRef<T>`, `Ref<T>`                                                                 | `MutableRef<T>`, deliberately exported `VertexRef<T>`                |
| `unref`, `setPointsTo`                                                                | `getValue`, `setValue`                                               |
| `GraphVertex`, `GraphVertexStatus`, `GraphEdge`                                       | `ResolvedGraphVertex`, `ResolvedVisitStage`, `StructuralChildEdge` |
| `VertexResolved`, `VertexResolvedData`, `VertexResolvedContent`                       | `TreeVertexRecord`, `TreeVertexMetadata`, `TreeVertexRecordContent`  |
| Record `$d`, `$c`                                                                     | `metadata`, `children` (actual structural references)                |
| `ResolvedTree`, `getResolvedTree`                                                     | `ResolvedTreeStore`, `getResolvedTreeStore`                          |
| `makeMutationCommandFactory`                                                          | `createObjectMutationBinder`                                         |
| `TO_MakeMutationCommandFunctionFactoryConfiguration`, `TO_IsCompositeAssertionsMixin` | `ObjectMutationOptions`, `ObjectCompositeClassification`             |
| `TO_MakeMutationCommandFunctionFactory`, `TO_MakeMutationCommandFunctionFactory_2`    | `ObjectMutationBinderFactory`, `ObjectMutationBinder`                |
| `TO_MakeMutationCommandFactoryResult`, `TO_MutationPropertyPatch`                     | `ObjectMutationCommands`, `ObjectPropertyPatch`                      |
| `MakeMutationCommandFunctionFactory`, `MakeMutationCommandFunctionFactory_2`          | `TreeMutationCommandBinderFactory`, `TreeMutationCommandBinder`      |
| `MakeMutationCommandFunction`, `MakeMutationCommandFunctionInput`                     | `MutationCommandBuilder`, `MutationRequest`                          |
| `MakeMutationCommandFunctionResult`, `MakeMutationCommandFactoryResult`               | `MutationCommand`, `MutationCommands`                                |
| Root namespace `rewriteObject`                                                        | Callable `rewriteObject`; module namespace `objectRewrite`           |
| Rewrite result `outputObject`                                                         | `outputAtReturn`                                                     |

`MutableRef.setValue()` replaces the held value without changing `getRefId()`'s generated UUID. This reference ID is separate from arbitrary graph `getVertexId()` / `getVertexRefById()` identities, including undefined, null, NaN, symbols and objects. Retired `getId`, `getIdOf`, and `getVertexById` aliases are removed. Nothing implies durable or string IDs.

`Vertex` contains only `$data` / `$childHints`; retired `$d` / `$c` content and access are removed. Tree record metadata/children are a different role. Prefer `getResolvedTreeView()` / `ResolvedTreeStore.asReadOnly()` for safe shallow queries; the deliberate mutable tree store is an advanced capability whose caller maintains consistency.

`RewriteFn`, `RewriteFnOptions`, and `RewriteFnPropInput` are now `ObjectRewriteCallback`, `ObjectRewriteContext`, and `ObjectRewriteInput`, each parameterized by input and output key/value types. `TraversableObjectTTP` and `ResolvedTreeTypeParameters` are now `ObjectTreeVertexTypes` and `ResolvedTreeVertexTypes`. Replace `ObjectTreeSource.getRootPropertyFromInputObjectDefault(rootKey?)` with `.createRootPropertyMapper(rootKey?)`.

`ObjectMutationPatch` is now `ObjectPropertyPatch<T>` and permits only `key` and `value`. Unknown own string/symbol fields throw TypeError at runtime; existing metadata survives patches. Use full `REWRITE_VERTEX_DATA` replacement for arbitrary payload fields. Rewrite callback current properties and live context fields use independent input/output key and value domains, as do classifier and assembler parent/child arguments. `ObjectCurrentVertexTypes<InputTypes, OutputTypes>` includes these mixed records with retained metadata; neither key nor metadata narrowing restores an input-only or output-only value guarantee. Use it as the second type argument when composing an object mutation binder with a generic traversal. The bound command stage is `ObjectMutationCommands<OutputTypes, InputTypes>`; its builder emits current records, while patch fields and assembled results retain configured output types. A prior visitor can rewrite live values; a child can also remain unchanged. Retained original views remain input-typed, while assembled results use output types.

Object mutation is staged: configure the binder, bind a vertex/context, then build commands from property patches. Property presence, falsy/undefined values, symbol keys, `assembledMap` identity, custom composite classifiers and assemblers keep their existing behavior. This is object-domain configuration, not a generic arbitrary-payload mutation engine. The intentional static `ObjectTreeSource.getChildrenOfPropertyDefault` and `.createRootPropertyMapper` helpers remain available for configuring object discovery; their old deep module imports are blocked.

`rewriteObject` owns its source and defaults output to unknown. `rewriteObjectAs<T>` asserts a type without validating it. `outputAtReturn` is captured once and can be partial when paused; it never refreshes after resumption. Resume the returned runner and call `getOutput()`, which requires FINISHED, performs the original conversion, and caches the first successful final result. Conversion failures preserve exact thrown values and are retryable. Shared output values are not deep immutable snapshots.

## Predicates, walking budgets and in-order positions

| Previous                                                                                   | Canonical                                                                                  |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Walking `followEdge`, `expandVertex`                                                       | `shouldFollowEdge`, `shouldExpandVertex`                                                   |
| `GraphWalkFollowEdge`, `AsyncGraphWalkFollowEdge`                                          | `GraphWalkEdgePredicate`, `AsyncGraphWalkEdgePredicate`                                    |
| `GraphWalkExpandVertex`, `AsyncGraphWalkExpandVertex`                                      | `GraphWalkExpansionPredicate`, `AsyncGraphWalkExpansionPredicate`                          |
| `filterDagVisitor`, `filterAsyncDagVisitor`                                                | `filterDagDataVisitor`, `filterAsyncDagDataVisitor`                                        |
| `Vertex.isLeafVertex`, runner `isLeafVertex`, `hasSingleSink`                              | `hasNoChildHints`, `isTraversalLeaf`, `hasSingleStructuralSink`                            |
| Walking `steps`, `maxSteps`                                                                | `candidateReadAttempts`, `maxCandidateReadAttempts`                                        |
| `occurrences`, `maxOccurrences`                                                            | `admittedTargets`, `maxAdmittedTargets`                                                    |
| Counts `foundVertices`, `omittedVertices`, `observedLinks`, `observations`                 | `uniqueFoundVertices`, `uniqueOmittedVertices`, `discoveredLinks`, `processedObservations` |
| Limit reasons `'maxSteps'`, `'maxOccurrences'`                                             | `'maxCandidateReadAttempts'`, `'maxAdmittedTargets'`; `'maxDepth'` is unchanged            |
| `DepthFirstTraversalInOrderTraversalConfig`, option `inOrderTraversalConfig`, `IndexRange` | `InOrderOptions`, option `inOrder`, `ChildIndexSelection`                                  |
| `visitParentAfterChildren`, `visitParentAfterChildrenAllRangesOutOfBoundsFallback`         | `afterChildIndices`, `fallbackChildIndices`                                                |
| `visitUpOneChildParents`, `considerVisitAfterNullContentVertices`                          | `visitSingleChildParent`, `visitAfterOmittedChildren`                                      |

Walking predicates make boolean decisions; `source.outgoing` discovers adjacency. DAG data filters pass payload data and preserve type-guard narrowing. `hasNoChildHints` inspects hints; `isTraversalLeaf` also considers disabled subtrees; `hasSingleStructuralSink` counts childless resolved vertices and ignores W/C edges.

Candidate read attempts include exhausted reads, duplicates and cached replay. Admissions include repeated/omitted targets. Fresh links count before follow predicates; cached replay does not rediscover them. Processed observations count acknowledged phase observations even when emission/callbacks are filtered. `maxDepth` still measures route edges; limits never measure callback time, tokens or unique emitted vertices.

In-order positions are child **indices**: zero means after child index zero. Negative indices and range normalization retain their rules. Fallback applies only when all configured ranges are out of bounds. Omitted-slot handling is independent of whether the child produced content; single-child parent handling remains separately configurable.

## A complete canonical migration example

<!-- standalone -->

```ts
import {
  materializeDagInputFromRecords,
  prepareDag,
  DagVisitorPhase,
} from 'configurable-tree-traversal';

const result = prepareDag(
  materializeDagInputFromRecords(
    [
      { id: 'draft', after: [] as string[] },
      { id: 'review', after: ['draft'] },
    ],
    { id: (task) => task.id, dependsOnWork: (task) => task.after },
  ),
);
if (result.kind === 'invalid') throw new Error('Invalid graph');
const runner = result.dag.createRunner({
  workCompletion: 'externalSettlement',
  visitors: { [DagVisitorPhase.ON_WORK_READY]: () => undefined },
});
runner.run({ emitEvents: ['workCompleted'] });
const before = runner.inspectMilestones();
const ticket = runner.summary().awaitingSettlement[0]!;
runner.settle(ticket.vertexId, { kind: 'workCompleted' }, ticket.generation);
if (before.explain({ vertexId: 'draft', milestone: 'work' }).kind !== 'known') {
  throw new Error('Expected captured discovery');
}
runner.run();
if (runner.summary().awaitingSettlement[0]!.vertexId !== 'review') {
  throw new Error('Expected the dependent task');
}
```

Retired compatibility routes are removed: legacy vertex content/access, untagged source results, boolean settlement outcomes, the `DEFER_READY` sentinel, old object hooks, execution/registration aliases, identity getter aliases, positional helper overloads and the old hint-rewrite command. Use the canonical replacements in this guide. JavaScript policy requests reject before discovery or configuration changes.

## Generic execution and tree callbacks

`TraversalExecutionState`, `SyncTraversalExecution` and `AsyncTraversalExecution` default to `ExecutionInspection`. Their emission default is `EmissionKind<Phase>`; DAG event selectors accept committed event names while callback selectors retain readiness phases. Concrete tree/DAG runners explicitly return `TreeDagExecutionInspection` (formerly `CoreInspection`); walking runners return `GraphWalkInspection`.

`AsyncCoreExecution`, `TreeTraversal`, `TreeTraversalRunner`, `TreeTraversalIterable` and `AbstractTreeSource` are removed. Use execution capabilities for wrappers, concrete builders, `Iterable<TreeTraversalEvent<...>>` for tree iteration, and structural `TreeSource` implementations.

Tree-only callback names are `TreeVisitor`, `AsyncTreeVisitor`, `TreeVisitorRecord`, `TreeMutationCommandBinder` and `TreeMutationCommandBinderFactory` (formerly `TraversalVisitor`, `AsyncTraversalVisitor`, `TraversalVisitorRecord`, `MutationCommandBinder` and `MutationCommandBinderFactory`). Shared command/result algebra, visitor registration policies and `MutationCommandBuilder` remain generic.

## Scoped deletion, policies, entries and chain state

Use `ResolvedTreeStore.deleteSubtree(ref)` for direct stored-tree deletion. Visitor commands distinguish `DELETE_TREE_SUBTREE` from `DELETE_DAG_VERTEX_CASCADE`; the runner family selects the command, including DAG runners consuming TreeSource. DAG cascade deletion removes W/C dependents and orphaned descendants, preserving shared children and detached anchors until they themselves become affected. Root deletion clears the graph. `removeVertexDeclaration` is a revision edit requiring explicit repair of remaining references.

Graph discovery policies are `rootWorkDependencies: 'honor' | 'ignore'` and `omittedWorkDependencies: 'none' | 'discoveryParentWork'`, defaulting to `honor` and `none`. Root ignoring affects W only, never C. Explicit `dependsOnWork` lists, including `[]`, override the omitted-list fallback. Tree discovery rejects both policies and retains fixed ordering. Retired `rootDependencies` and `implicitParentDependency` keys reject.

Definition entry `{ kind: 'roots', slots }` replaces `forest` and preserves ordered live/omitted slots, repeated identities and shared children. `SKIP_REMAINING_CHILDREN` replaces `DISABLE_SUBTREE_TRAVERSAL`: it skips pending local child expansion while keeping resolved descendants. Eager prepared topology forbids this command. `SET_VISITOR_CHAIN_STATE` replaces `SET_VERTEX_VISITORS_CHAIN_STATE` and requires `{ state }`, including explicit undefined; the old argument field rejects.

Shared `MutationCommand`, `MutationCommandBuilder` and `MutationCommands` accept a trailing deletion-command type parameter, defaulting to both scoped names. Tree binders and object helpers select tree deletion explicitly. `TraversalVisitorResult` accepts a trailing `"tree" | "dag"` family parameter; concrete tree/DAG visitors select their family while preserving phase restrictions and exclusive deferral.
