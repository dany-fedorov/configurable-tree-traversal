# Migrate from 0.12 to the 0.13 explicit API

<a id="migrate-from-released-012-to-the-explicit-api"></a>

[Documentation map](index.md) · [Current reference](reference.md) · [Agent workflows](agent-workflows.md) · [Public symbol index](api-index.md)

**0.13.0 is a breaking release.** Install `configurable-tree-traversal@^0.13.0` for the API shown here; see [installation](../README.md#install).

The Previous columns below describe 0.12. Current names and examples describe 0.13. There are no compatibility aliases. Update imports, type arguments, own option keys, discriminant strings, and consumers together; an old own key can reject even when its value is undefined. Earlier migration guides preserve their historical release context and are not additional steps for this change.

### Updating an earlier explicit-API checkout

These names also changed during development of 0.13. Apply the same replacements to async counterparts. Registration consistently uses `registerVisitorFor…`, `appendVisitorGroupFor…`, and `replaceVisitorDefinitionsFor…` across all eight builders; the suffix is `Phase` for tree/DAG and `ObservationKind` for walking.

| Earlier checkout | Current |
| --- | --- |
| `rootWorkPrerequisitePolicy` | `rootWorkToWorkPrerequisitePolicy` |
| `undeclaredWorkPrerequisitePolicy` | `undeclaredWorkToWorkPrerequisitePolicy` |
| `hasSkippedPendingChildDiscovery` | `isPendingChildDiscoveryDisabled` |
| `PreCommandDiscoveredGraphView` | `LivePreCommandDiscoveredGraphView` |
| `preCommandDiscoveredTreeView`, `preCommandDiscoveredGraphView` | `livePreCommandDiscoveredTreeView`, `livePreCommandDiscoveredGraphView` |
| `GraphWalkInspection` | `GraphWalkExecutionSnapshot` |
| DAG source `resolveChildHint` | `resolveChildVertexFromHint` |
| `FoundDagSourceVertex`, `TreeVertexResolutionFound` | `ResolvedDagSourceVertex`, `ResolvedTreeSourceVertex` |
| `TreeVertexResolutionOmitted`, `TreeVertexResolution` | `OmittedTreeSourceVertex`, `TreeSourceVertexResolution` |
| Tree/DAG `registerVisitorCallbackForPhase` | `registerVisitorForPhase` |
| Walking `addVisitorForObservationKind` | `registerVisitorForObservationKind` |
| Walking `addVisitorGroupForObservationKind` | `appendVisitorGroupForObservationKind` |
| Walking `replaceVisitorsForObservationKind` | `replaceVisitorDefinitionsForObservationKind` |
| `DagDefinitionVertex`, `DagDefinitionVertexChange` | `DagVertexDeclaration`, `DagVertexDeclarationChange` |
| Revision result `changes` | `declarationDiff` |
| Diagnostic `prerequisiteVertexIdsInReport` | `unmetPrerequisiteVertexIds` |
| Walking outcome `sourceRoutesExhausted` | `explorationExhausted` |
| Stored-tree `InternalChildDiscoveryContext` | `MutableTreeChildDiscoveryContext` |
| Stored-tree context `parentVertexHandle` | `parentVertexReference` |

`rootWorkToWorkPrerequisitePolicy` controls whether root work waits for other vertices' work completion. It does not suppress waits for subgraph completion. Read-only callback contexts retain `parentVertexHandle`; only editable storage contexts use `parentVertexReference`. `Live…View` denotes an updating view, while validated topology `liveVertexSummaries` is a frozen projection of retained, non-omitted vertices.

## Execution roles and observations

| Previous                                                                                      | Current                                                                                                                                                       |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DepthFirstTreeTraversal`, `BreadthFirstTreeTraversal`, async counterparts                    | `DepthFirstTreeTraversalBuilder`, `BreadthFirstTreeTraversalBuilder`, async counterparts                                                                      |
| `DagTraversal`, `AsyncDagTraversal`                                                           | `DagTraversalBuilder`, `AsyncDagTraversalBuilder`                                                                                                             |
| `GraphWalk`, `AsyncGraphWalk`                                                                 | `GraphWalkBuilder`, `AsyncGraphWalkBuilder`                                                                                                                   |
| `DepthFirstTreeOptions`, `BreadthFirstTreeOptions`, `DagOptions` and async/patch counterparts | `DepthFirstTreeTraversalBuilderOptions`, `BreadthFirstTreeTraversalBuilderOptions`, `DagTraversalBuilderOptions` and async/`BuilderOptionsPatch` counterparts |
| `configure(patch)`                                                                            | `patchOptionsForFutureRunners(patch)`                                                                                                                         |
| Builder `createRunner()`                                                                      | `createIndependentRunnerFromCurrentOptions()`                                                                                                                 |
| Prepared `createRunner()` / `createAsyncRunner()`                                             | `createIndependentRunnerFromValidatedTopology()` / `createIndependentAsyncRunnerFromValidatedTopology()`                                                      |
| `run()`                                                                                       | `runUntilSuspendedOrTerminal()`                                                                                                                               |
| `iterateEvents()`                                                                             | `runAndIterateObservationEventsUntilSuspendedOrTerminal()`                                                                                                    |
| `inspect()` / `summary()`                                                                     | `captureExecutionSnapshot()` / `captureProgressSnapshot()`                                                                                                    |
| `inspectMilestones()` / `inspectDagMilestones()`                                              | `captureMilestoneSnapshot()` / `captureDagMilestoneSnapshot()`                                                                                                |
| `getStatus()` / `getStopReason()` / `isHalted()`                                              | `getTraversalLifecycleStatus()` / `getTraversalStopReason()` / `isSuspended()`                                                                                |
| `INITIAL` / `HALTED`                                                                          | `TraversalRunnerStatus.NOT_STARTED` / `.SUSPENDED`                                                                                                            |
| `requestPause()`                                                                              | `requestPauseAfterAdmittedCallbacksDrain()`                                                                                                                   |

Builders configure future runners and do not traverse. Each runner captures its own options/registration wrappers and owns separate progress. Both execution methods can return at suspension, including preparation, pause, or awaiting external settlement. Captures perform no source lookup, callback execution, scheduling, or ownership change. A pause request records intent; admitted callbacks drain without cancellation before acknowledgement.

`TraversalExecutionSnapshot` is the common observational contract. Its fields distinguish `traversalLifecycleStatus`, `traversalStopReason`, `traversalAlgorithm`, `callbackExecutionMode`, `pauseRequested`, `inFlightInvocationCount`, and `bufferedDeliveryEventCount`. Tree/DAG detail is `TreeOrDagExecutionSnapshot`; walking detail is `GraphWalkExecutionSnapshot`. Per-vertex scheduling stage, callback activity, committed DAG milestones, and host-agent activity remain separate facts.

## Callback selection, event delivery, and registration

| Previous                                                                   | Current                                                                                                                                                        |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TraversalExecutionOptions`                                                | `TraversalExecutionSelectionPatch`                                                                                                                             |
| `emitEvents`                                                               | `deliveredEventKinds`                                                                                                                                          |
| `visitorPhases` / `VisitorPhaseSelection`                                  | `admittedVisitorCallbackPhases` / `VisitorCallbackPhaseSelection`                                                                                              |
| `EmissionKind`                                                             | `TraversalEventKindForVisitorPhase`                                                                                                                            |
| Tree event `phase`, DAG/walking event `kind`                               | Top-level `eventKind`                                                                                                                                          |
| Tree/DAG callback `phase`                                                  | `visitorPhase`                                                                                                                                                 |
| Walking callback `phase`                                                   | `observationKind`                                                                                                                                              |
| `addVisitorFor`, `addVisitorGroupFor`, `setVisitorsFor`, `listVisitorsFor` | Tree/DAG `registerVisitorForPhase`, `appendVisitorGroupForPhase`, `replaceVisitorDefinitionsForPhase`, `getDetachedVisitorRegistrationRecordsForPhase` |
| Walking registration methods                                               | `registerVisitorForObservationKind`, `appendVisitorGroupForObservationKind`, `replaceVisitorDefinitionsForObservationKind`, `listVisitorRegistrationsForObservationKind`         |
| `CommandCommitMode`, `commandCommitMode`                                   | `VisitorCommandCommitTiming`, `visitorCommandCommitTiming`                                                                                                     |
| `afterEachVisitor`, `afterGroup`                                           | `afterEachVisitorCallback`, `afterContiguousVisitorBatch`                                                                                                      |
| `priority`, `addedIndex`                                                   | `descendingExecutionPriorityWithinGroup`, `phaseRegistrationInsertionIndex`                                                                                    |
| `phaseVisitIndex`, `visitorIndex`                                          | Tree `phaseVisitorChainIndex`; DAG `phaseVisitorChainAdmissionIndex` (nonempty chain admissions); both `visitorCallbackIndexInPhaseChain`                      |
| `visitorChainState`, `registration`                                        | `currentVertexPhaseChainState`, `visitorRegistrationMetadata`                                                                                                  |
| `previousPhaseVertexRef`                                                   | `previousCommittedVisitVertexHandleForSamePhase`                                                                                                               |
| Group `identity`, `explicit`                                               | `groupIdentity`, `isExplicitlyDeclaredGroup`                                                                                                                   |
| Async tree/DAG `concurrency`                                               | `maxConcurrentCallbackInvocations`                                                                                                                             |

Selectors patch independently. Delivery uses the current selector, including buffered and deferred-settlement observations. Callback admission is captured for each newly admitted chain. A chain's `executionSelectionsAtAdmission` is historical; top-level `executionOptions` controls current delivery. Disabling delivery does not disable callbacks or change discovery.

Higher registration priority executes first within a group, with insertion order breaking ties. Flat visitors sort before contiguous batching. Explicit groups execute in declared group order and own their batch policy. Returned registration records are detached wrappers; callbacks and frozen group metadata remain shared. Command timing does not configure parallel execution. The async callback cap covers CTT source/transformer/visitor invocations, not external agents.

### Tree callback generic order

The callback aliases changed parameter order. Contexts retain their separately declared order; do not reorder every phase-bearing type.

| Previous                                                | Current                                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `TreeVisitor<Phase, Input, Rewritten>`                  | `TreeVertexPhaseVisitorCallback<Input, Rewritten, Phase>`                                                    |
| `AsyncTreeVisitor<Phase, Input, Rewritten>`             | `AsyncTreeVertexPhaseVisitorCallback<Input, Rewritten, Phase>`                                               |
| `TreeVisitor<Phase, Input>`                             | `TreeVertexPhaseVisitorCallback<Input, Input, Phase>`                                                        |
| Vertex-domain `T`/`TTP`, `R`/`RW_TTP`, `ID` hover names | Descriptive input/rewritten vertex domains and `VertexId`; trailing graph identity positions remain trailing |

<!-- standalone -->

```ts
import type {
  DepthFirstTreeVisitPhase,
  TreeVertexPhaseVisitorCallback,
  AsyncTreeVertexPhaseVisitorCallback,
  VertexDataAndChildHintTypes,
} from 'configurable-tree-traversal';
type Input = VertexDataAndChildHintTypes<string, string>;
const visit: TreeVertexPhaseVisitorCallback<
  Input,
  Input,
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION
> = (vertex, context) => {
  console.log(context.visitorPhase, vertex.getVertexData());
};
const asyncVisit: AsyncTreeVertexPhaseVisitorCallback<
  Input,
  Input,
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION
> = async (vertex, context) => {
  visit(vertex, context);
};
void asyncVisit;
```

## Sources, content, handles, and paths

| Previous                                                                        | Current                                                                                                          |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `HintVertexId`                                                                  | `ChildHintVertexIdentity`                                                                                        |
| `VertexTypes`, `VertexHint` member                                              | `VertexDataAndChildHintTypes`, `ChildHint` member                                                                |
| `$data`, `$childHints`                                                          | `$vertexData`, `$childDiscoveryHints` in content, fields, spread, and serialization                              |
| `TreeSource`, `AsyncTreeSource`                                                 | `TreeDiscoverySource`, `AsyncTreeDiscoverySource`                                                                |
| `traversableTree`, `traversableGraph`, walking `source`                         | `treeDiscoverySource`, `dagDiscoverySource`, `graphWalkDiscoverySource`                                          |
| Tree `resolveRoot`, `resolveChild`                                              | `resolveRootVertex`, `resolveChildVertexFromHint`                                                                |
| DAG `resolveRoot`, `resolveChild`, `resolvePrerequisite`, `getVertexIdFromHint` | `resolveRootVertex`, `resolveChildVertexFromHint`, `resolvePrerequisiteByVertexId`, `tryGetVertexIdentityFromHint`         |
| Tree/DAG `{ kind: 'found', vertex: { vertexContent } }`                         | `{ kind: 'vertexResolved', resolvedVertexInput: { vertexContentInput } }`                                        |
| Tree/DAG `kind: 'omitted'`                                                      | `kind: 'vertexIntentionallyOmitted'`                                                                             |
| DAG omission `identity`, `satisfiesDependencies`                                | `omittedVertexIdentity`, `satisfiesWorkAndSubgraphCompletionPrerequisites: true`                                 |
| `VertexResolutionContext` / `resolutionContext`                                 | `ChildDiscoveryContext`; tree `childDiscoveryContext`, DAG `structuralChildResolution`                           |
| Context `depth`, `hintIndex`, `vertexHint`                                      | `discoveryDepthInEdges`, `parentChildHintIndex`, `childDiscoveryHint`                                            |
| Context `parentVertex`, `parentVertexRef`                                       | `parentVertexAtChildResolution`, `parentVertexHandle`                                                            |
| `vertexRef`, `parentRef`, `childRef` in public observations                     | `vertexHandle`, `parentVertexHandle`, `childVertexHandle`                                                        |
| `getRefId`, `vertexRefId`                                                       | `getReferenceIdentity`, `vertexReferenceIdentity`                                                                |
| `VertexHandle.getValue()`                                                       | `getCurrentVertexView()`                                                                                         |
| `MutableRef.getValue()` / `.setValue()`                                         | `MutableValueReference.getReferencedValue()` / `.replaceReferencedValue()`                                       |
| `getData()` / `getChildHints()`                                                 | `getVertexData()`; mutable Vertex `getMutableChildDiscoveryHints()`, observed `getDetachedChildDiscoveryHints()` |
| `clone()` on Vertex / VertexView                                                | `createEditableShallowCloneWithContentOverrides()`                                                               |
| `ResolvedTreeView` / `ResolvedGraphView`                                        | `LiveResolvedTreeView` / `LiveResolvedGraphView`                                                                 |
| `originalTreeView` / `originalGraphView`                                        | `livePreCommandDiscoveredTreeView` / `livePreCommandDiscoveredGraphView`                                                 |
| Retain-original options                                                         | `retainDiscoveredTreeBeforeVisitorCommands` / `retainDiscoveredGraphBeforeVisitorCommands`                       |

Walking keeps its own `found`/`omitted` resolution tags and explicit targets; do not apply tree/DAG envelope replacements to walking. Tree sources still reject graph metadata. Typed live DAG resolutions require an own `vertexId`. A DAG omission's null wrapper differs from `{ vertexId: undefined }`. Only prerequisite lookup accepts `missing`.

<!-- standalone -->

```ts
import type {
  TreeDiscoverySource,
  DagDiscoverySource,
  VertexDataAndChildHintTypes,
} from 'configurable-tree-traversal';
type T = VertexDataAndChildHintTypes<string, string>;
const treeDiscoverySource: TreeDiscoverySource<T> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
    },
  }),
  resolveChildVertexFromHint: () => ({ kind: 'vertexIntentionallyOmitted' }),
};
const dagDiscoverySource: DagDiscoverySource<T, T, string> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexId: 'root',
      workWaitsForWorkOf: [],
      vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
    },
  }),
  resolveChildVertexFromHint: () => ({
    kind: 'vertexIntentionallyOmitted',
    omittedVertexIdentity: null,
    satisfiesWorkAndSubgraphCompletionPrerequisites: true,
  }),
};
void treeDiscoverySource;
void dagDiscoverySource;
```

Views remain live while returned hint/topology collections and snapshot wrappers are frozen and detached. Caller payloads, hint elements, and arbitrary IDs retain shallow identity. A current handle follows replacement; an earlier event vertex retains its captured content. Retained pre-command structure grows with discovery and is not a complete untouched input snapshot.

### Positive flags and predicate inversion

| Previous expression          | Current expression with equivalent meaning |
| ---------------------------- | ------------------------------------------ |
| `{ noRoot: true }`           | `{ includeDesignatedRoot: false }`         |
| `{ noSelf: false }`          | `{ includeTargetVertex: true }`            |
| Omitted/undefined path flags | Both positive controls default to true     |
| `vertex.hasNoChildHints()`   | `!vertex.hasChildDiscoveryHints()`         |
| `!vertex.hasNoChildHints()`  | `vertex.hasChildDiscoveryHints()`          |

Invert every explicitly supplied boolean and every predicate use. Preserve undefined as undefined rather than turning it into false. Neither predicate identifies a resolved structural leaf. `isPendingChildDiscoveryDisabled` separately reports the skip policy.

Tree path lookup is `requireStructuralAncestorPathTo`; graph lookup is `requireAllStructuralAncestorPathsTo`. Tree views query root/child/parent handles through `getRootVertexHandleOrNull`, `getChildVertexHandlesOrNull`, `getParentVertexHandleOrNull`, and `getChildDiscoveryContextOrNull`. Graph views use `getDesignatedRootHandleOrNull`, `getVertexHandles`, `getVertexHandleByIdOrNull`, `getVertexSnapshotOrNull`, `getDistinctStructuralParentHandlesOrNull`, and `getStructuralChildHandlesInSlotOrderOrNull`. Both have `containsVertexHandle`; required identity/path queries throw for absence.

Standalone storage has explicit editing authority: `MutableResolvedTreeStore`, `MutableTreeVertexTopologyRecord`, `getMutableVertexRecordOrNull`, `setVertexRecord`, `appendChildReferencesTo`, and `getLiveReadOnlyTreeView`. Record `childReferences` and discovery context are separate from opaque vertex data/hints. See [store ownership](reference.md#edit-a-resolved-tree-store).

## Phases and commands

| Previous                                              | Current                                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| `DepthFirstPhase.PRE_ORDER`                           | `DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION`                             |
| `.IN_ORDER` / `.POST_ORDER`                           | `.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES` / `.AFTER_CHILD_SUBTREES`           |
| `BreadthFirstPhase.LEVEL_ORDER`                       | `BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX`                            |
| `inOrder`, `InOrderOptions`                           | `childBoundaryVisits`, `DepthFirstChildBoundaryVisitOptions`                  |
| `afterChildIndices`, `fallbackChildIndices`           | `visitAfterChildIndices`, `visitAfterChildIndicesWhenPrimarySelectionIsEmpty` |
| `visitSingleChildParent`, `visitAfterOmittedChildren` | `alsoVisitAfterOnlyChild`, `allowBoundaryVisitsAfterOmittedChildSlots`        |
| Range `from`, `through`                               | `fromInclusive`, `throughInclusive`; negative positions remain end-relative   |
| `NOOP` / `PAUSE_TRAVERSAL`                            | `NO_OPERATION` / `PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY`                 |
| `DEFER_WORK_COMPLETION`                               | `END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION`                            |
| `REWRITE_VERTEX_DATA` / `{ newData }`                 | `REPLACE_CURRENT_VERTEX_DATA` / `{ replacementVertexData }`                   |
| `REWRITE_CHILD_HINTS` / `{ newHints }`                | `REPLACE_CURRENT_VERTEX_CHILD_HINTS` / `{ replacementChildHints }`            |
| `DELETE_TREE_SUBTREE`                                 | `DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS`                         |
| `DELETE_DAG_VERTEX_CASCADE`                           | `DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS`                  |
| `SKIP_REMAINING_CHILDREN`                             | `SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX`                              |
| `SET_VISITOR_CHAIN_STATE` / `{ state }`               | `SET_CURRENT_VERTEX_PHASE_CHAIN_STATE` / `{ phaseChainState }`                |

Child-boundary visits can repeat for one parent and can visit a leaf; they are not limited to binary in-order traversal. Hint replacement retains the source input hint domain even when vertex data is rewritten. DAG deferral must be the sole command and ends its work chain. Pause retains the remaining chain. The family deletion commands are not interchangeable, and skipping discovery retains already resolved descendants.

## DAG readiness, reusable topology, and local settlement

| Previous                                                                    | Current                                                                                                          |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `dependsOnWork`, `dependsOnSubgraphCompletion`                              | `workWaitsForWorkOf`, `workWaitsForSubgraphCompletionOf`                                                         |
| `workCompletion: 'afterWorkReadyChain'`                                     | `workCompletionPolicy: 'afterWorkReadyVisitorChain'`                                                             |
| `workCompletion: 'externalSettlement'`                                      | `workCompletionPolicy: 'requireExternalWorkSettlement'`                                                          |
| `discovery: 'lazy'` / `'eager'`                                             | `discoveryTiming: 'incrementalDuringTraversal'` / `'completeBeforeAnyVisitor'`                                   |
| `rootWorkDependencies`, `dependsOnWorkDefault`                              | `rootWorkToWorkPrerequisitePolicy`, `undeclaredWorkToWorkPrerequisitePolicy`                                                 |
| `discoveryParentWork`                                                       | `waitForDiscoveringParentWork`                                                                                   |
| `completedWork`, `syntheticRoot`                                            | `acceptedCompletedWorkVertexIds`, `sourceRootIsHiddenEntryHolder`                                                |
| Materializer `id`, `dependsOnWork`, `dependsOnSubgraphCompletion` selectors | `selectVertexId`, `selectWorkPrerequisiteVertexIds`, `selectSubgraphCompletionPrerequisiteVertexIds`             |
| Record/root `children` selector                                             | `selectStructuralChildVertexIds` / `selectStructuralChildRecords`                                                |
| `materializeDagInputFromRecords` / `materializeDagInputFromRoots`           | `materializeMultiEntryDagInputFromRecordCatalog` / `materializeDagInputFromRootRecords`, plus Async counterparts |
| `prepareDag`, `prepareDagAsync`                                             | `discoverValidateAndCaptureDag`, `discoverValidateAndCaptureDagAsync`                                            |
| Preparation result `dag`                                                    | `validatedTopology`                                                                                              |
| `PreparedDag` / runner `prepare()`                                          | `ValidatedReusableDagTopology` / `discoverValidateAndFreezeTopology()`                                           |
| Prepared `createWorkSession`, `createAsyncWorkSession`                      | `createExternalWorkSession`, `createAsyncExternalWorkSession`                                                    |
| Session `advance()` / `workTickets`                                         | `runUntilWorkBoundary()` / `workSettlementTickets`                                                               |
| `completeWork(ticket)` / runner `settle(...)`                               | `acceptCompletedWork(ticket)` / `settleDeferredWork(...)`                                                        |
| Deferred `generation`                                                       | `settlementToken`                                                                                                |
| `ON_SUBGRAPH_READY`                                                         | `DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY`                                                                   |
| Events `workCompleted` / `subgraphCompleted`                                | `eventKind: 'workCompletionCommitted'` / `'subgraphCompletionCommitted'`                                         |

W is accepted initial work. C additionally requires closed discovery, every retained child's C, and the committed completion visit. Structural edges and W/C prerequisite wires remain distinct. Default graph policies honor root W and add no implicit parent W; explicit empty prerequisite lists win over inheritance. Tree-source DAG mode retains structural order and rejects explicit graph dependency policies.

Normal work-chain return completes W under the default policy, including empty/filtered chains. Use external settlement for host-controlled work. Session tickets and runner settlement tokens are local; copying/serializing them does not preserve authority. Persist host-accepted completion facts and reconstruct fresh sessions. The settlement outcome `{ kind: 'workCompleted' }` retains its own discriminant: it is not an observation event.

Progress now uses `progressByVertexId`, `workState`, `workAwaitingSettlement`, explicit unmet W/C milestone arrays, and committed/ready/deferred ID collections. Work states distinguish waiting prerequisites, ready admission, admitted chain, deferred completion, and committed completion. [The current schema](reference.md#dag-summary-schema) lists every field/count. Diagnostics use `blockedVertexPrerequisiteReports`, `unresolvedPrerequisiteVertexIds`, `milestoneCycleVertexIdComponents`, `originalMilestoneConstraints`, and explicit non-cycle/incomplete ID collections. Constraint endpoints are `waitingMilestone` and `prerequisiteMilestone`.

Milestone descriptors use `milestone: 'workCompletion'` or `'subgraphCompletion'`. `explainMilestone`, `queryOriginalPrerequisiteMilestonesOf`, and `queryOriginalDependentMilestonesOf` return captured observations, including `milestoneSatisfied`, `reachedMilestones`, and `originalMilestoneConstraints`. Discovery completeness limits what a capture establishes. Structural cycle components are SCC membership; discovered cycle witnesses are ordered closed routes.

Definitions use `vertexDeclarations`, `omittedVertexIds`, `entryDiscoverySlots`, `childDiscoverySlots`, and explicit W/C declarations. `liveVertexSummaries` omits omitted slots and cannot round-trip a definition. Fragments expose `vertexIdsByPortName`; compose `additionalWorkPrerequisites` separately from `additionalStructuralChildLinks`. `mapDagFragmentIds` maps identity explicitly. `applyDagDefinitionRevisionBatch` validates an ordered private candidate and returns a fresh topology plus shallow declaration diff; sessions, tickets and accepted facts do not migrate automatically.

## Object property rewriting and assembly

| Previous                                                      | Current                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `ObjectTreeSource`, property `key`/`value`                    | `ObjectPropertyTreeSource`, `propertyKey`/`propertyValue`                                               |
| `getRootPropertyFromInputObject`, `getChildrenOfProperty`     | `mapInputToRootProperty`, `enumerateChildPropertyHints`                                                 |
| `resolveChildHook`, `fromProperties`                          | `resolveChildPropertyOrUseDefault`, `fromPropertyAdapters`                                              |
| Rewrite option `rewrite`                                      | `rewritePropertyAfterChildTraversal`                                                                    |
| `{ kind: 'rewrite', patch }`                                  | `{ kind: 'patchPropertyKeyOrValue', propertyPatch }`                                                    |
| `{ kind: 'delete' }` / `{ kind: 'keep' }`                     | `{ kind: 'deletePropertySubtree' }` / `{ kind: 'keepPropertyAndAssembleCurrentChildren' }`              |
| Object mutation `makeMutationCommand`                         | `createObjectPropertyMutationCommand`                                                                   |
| `assembleComposite(false)`                                    | `assembleCompositeFromCurrentChildren({ cacheResult: false })`                                          |
| Classifier options `isArray` / `isObject`                     | `matchesArrayAssemblyPredicate` / `matchesObjectAssemblyPredicate`                                      |
| `arrayIndexPolicy: 'compactInTraversalOrder'`                 | `arrayAssemblyIndexPolicy: 'compactRetainedNumericIndices'`                                             |
| `preserveNumericKeys`                                         | `preserveNumericIndicesAndArrayLength`                                                                  |
| `propertyCollision` values `error` / `firstWins` / `lastWins` | `assembledPropertyKeyCollisionPolicy`: `throwOnDuplicateKey` / `keepFirstProperty` / `keepLastProperty` |
| `assembledMap` / Map-style cache methods                      | `assemblyCache` with the explicit assembly protocol below                                               |
| `getOutputResult`, `outputResultAtReturn`                     | `getFinalOutputResult`, `capturedOutputResultAtReturn`                                                  |
| `rewriteObjectAs` / `convertRootValue`                        | `rewriteObjectWithAssertedOutputType` / `convertPresentRootOutputValue`                                 |

Object patches can change only a key, only a value, or both; absent fields retain their current values. Explicit undefined is a value, not a deletion. Current values and assembled results are unknown because retained and rewritten children can mix. Default discovery uses broad property keys/unknown values; precise discovery domains require both root and child adapters. The combined rewrite helper owns its source.

### Cache protocol and options bag

`ObjectPropertyAssemblyCache<Key>` requires three function-valued members. Presence is independent from the cached value, so cached undefined remains a hit. Adapt a Map explicitly rather than passing it directly. Writes accept unknown values.

<!-- standalone -->

```ts
import {
  rewriteObject,
  type ObjectPropertyAssemblyCache,
} from 'configurable-tree-traversal';
const values = new Map<object, unknown>();
const assemblyCache: ObjectPropertyAssemblyCache<object> = {
  hasAssembledValueForVertex: (handle) => values.has(handle),
  getAssembledValueForVertex: (handle) => values.get(handle),
  setAssembledValueForVertex: (handle, value) => {
    values.set(handle, value);
  },
};
const result = rewriteObject(
  { items: [1, 2] },
  {
    assemblyCache,
    arrayAssemblyIndexPolicy: 'preserveNumericIndicesAndArrayLength',
  },
);
if (result.getFinalOutputResult().kind !== 'present')
  throw new Error('Expected retained output');
```

Assembly uses `assembleCompositeFromCurrentChildren({ cacheResult })`; omission defaults true, and positional booleans reject. Array preservation retains numeric positions, holes, and original length, extending length when needed. Compact mode compacts retained numeric indices in numeric order while preserving named property behavior. Duplicate keys are compared as JavaScript property keys; distinct symbols keep identity.

Output remains tagged `{ kind: 'present', value }` or `{ kind: 'absent' }`. Retained null/undefined are present. `capturedOutputResultAtReturn` can be partial while suspended; resume the runner before calling `getFinalOutputResult`, which requires FINISHED and caches successful final conversion. `convertPresentRootOutputValue` receives `isTraversalFinished`; it is not invoked for an absent root. The assertion helper promises no runtime schema validation.

## Walking: occurrences, routes, cache modes, and units

| Previous                                                | Current                                                                                                              |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `revisit: 'once'`                                       | `routeEnumerationPolicy: 'firstAdmittedFoundRoutePerVertex'`                                                         |
| `simplePaths` / `walks`                                 | `allVertexSimpleRoutePrefixes` / `allRoutePrefixesAllowingRepeatedVertices`                                          |
| Observation `vertex`, `edge`, `path`                    | `vertexOccurrence`, `admittedEdgeOccurrence`, `routePrefix`                                                          |
| Phase enum members                                      | `GraphWalkObservationKind.VERTEX_OCCURRENCE`, `.ADMITTED_EDGE_OCCURRENCE`, `.ROUTE_PREFIX`                           |
| Walking `visitors` map                                  | `visitorsByObservationKind`                                                                                          |
| Resolved vertex `data`, edge `data`                     | `vertexData`, `edgeData`                                                                                             |
| Edge `from`, `to`, `index`                              | `fromVertexId`, `toVertexId`, `sourceOutgoingLinkIndexBeforeFiltering`                                               |
| Edge observation `target`                               | `targetResolution`                                                                                                   |
| Source link `target`                                    | `targetToResolveOnAdmission`                                                                                         |
| Target `resolution`                                     | `resolutionIfNotPreviouslyAdmitted`                                                                                  |
| `hydration: 'resolver'` / `'inlineOrCached'`            | `vertexResolutionMode: 'resolverWithOptionalInlineResolution'` / `'inlineResolutionOrPreviouslyAdmittedVertex'`      |
| Inline/cached target tags                               | `kind: 'inlineResolution'` / `'previouslyAdmittedVertex'`                                                            |
| `roots`, `outgoing`, `resolve` source methods           | `enumerateRootTargets`, `enumerateOutgoingLinks`, `resolveVertexDataById`                                            |
| Predicates `shouldFollowEdge`, `shouldExpandVertex`     | `shouldAdmitOutgoingLinkTarget`, `shouldExpandVertexOccurrence`                                                      |
| Observation/context `depth`                             | `vertexHopDepth`, `targetHopDepth`, or `routeHopLength` according to the record                                      |
| Path `vertices`, `edges`                                | `verticesInRootToTargetOrder`, `edgesInRootToTargetOrder`                                                            |
| `maxDepth`, `maxCandidates`, `maxCandidateReadAttempts` | `maxRouteHopDepth`, `maxAdmittedRootOrLinkTargetOccurrences`, `maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay` |
| `close()`                                               | `closePermanentlyAndDisposeSourceIterators()`                                                                        |
| Terminal `exhausted`, `limited`, `closed`               | `explorationExhausted`, `traversalLimitsReached`, `permanentlyClosedByCaller`                                       |

Walking does not consume arbitrary tree/DAG sources. Its first admitted resolution wins, including omission. A rejected link cannot seed the cache; a cached target requires prior admission. Route occurrences can repeat while resolver/adjacency I/O remains cached. The default policy observes parallel/self/back edges even when it does not repeat vertex/prefix observations.

A read limit counts root/link next attempts, including done results, filtering, and cached replay. An admission limit counts root/link target occurrences, including omissions/returns; edge+vertex+prefix is one candidate. A hop limit gates expansion after observations/predicate evaluation. Route modes require a hop bound or read bound, not merely an admission bound. `replaceLimits` replaces an entire prior bounds record atomically. Current count and terminal fields name these distinct units; see [walking contracts](reference.md#general-graph-walking).

Walking callbacks are serial and concurrency options reject. Consumer iterator return pauses; permanent close disposes acquired source iterators in reverse order. FAILED close retains the exact primary failure without repeated cleanup; overlapping async closes share a promise. Completion means the configured source/policy drained, not that a remote graph is globally complete.

DAG walking adapters label declaration relations explicitly and point dependency relationships from dependent to prerequisite. Select `parentToChildSlots`, `dependentToWorkPrerequisites`, or `dependentToSubgraphCompletionPrerequisites`. Adapter labels are detached; arbitrary caller edge data remains shared.

## Imports and final verification

The former `configurable-tree-traversal/sources` entry point is replaced by `configurable-tree-traversal/dag-input-materialization`; the old subpath is unsupported. Use supported root/family entry points and public factories. Raw runner constructors, normalized options, mutable runtime stores, and deep engine paths remain private. Family namespaces are `core`, `depthFirstTreeTraversal`, `breadthFirstTreeTraversal`, `dagTraversal`, `objectPropertyTree`, `objectRewrite`, and `graphWalk`. ESM/CommonJS must preserve constructor, sentinel, namespace and declaration identity.

Compile the host against current public declarations, migrate every discriminant branch and boolean inversion, run the [checkout examples](index.md#runnable-examples), and verify packed consumers before integration. Keep arbitrary IDs, caller payload identity, exact callback errors, callback/event timing, and host policy boundaries unchanged. The [symbol index](api-index.md) gives the complete supported signatures; the [reference](reference.md) owns the current behavioral contracts.
