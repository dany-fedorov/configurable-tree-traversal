# Public API symbol index

[Documentation map](index.md) · [Behavior reference](reference.md) · [Upgrade checklist](migration-api-distinctions.md)

These declarations describe the current source checkout; see [install](../README.md#install) for how to run it. Look up a current exported name below, then follow its owning contract and, where one exists, a runnable or related example. Public import routes are exhaustive for each symbol; declaration-module paths are not consumer imports.

Generated from the supported declaration census: **271 public symbols**, **540 export bindings**, **9 runtime entry points**. Run `npm run docs:api` to regenerate; package verification rejects stale output.

Declaration excerpts preserve overloads and public members; referenced support types can be declaration-local and are not additional importable exports. Inline declaration-relative type imports are displayed by type name. These are declaration excerpts, not standalone programs; the linked guide examples are compiled and executed against the packed package. A runnable example or executable snippet names the symbol; a related example exercises the feature that produces or consumes it without naming it. Runtime failures/defaults belong to the linked behavior contract.

## Lookup

| Symbol | Availability | Contract |
| --- | --- | --- |
| [AsyncBreadthFirstTreeOptions](#symbol-AsyncBreadthFirstTreeOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncBreadthFirstTreeOptionsPatch](#symbol-AsyncBreadthFirstTreeOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncBreadthFirstTreeRunner](#symbol-AsyncBreadthFirstTreeRunner) | Type-only | [Behavior](reference.md#breadth-first-traversal) |
| [AsyncBreadthFirstTreeTraversal](#symbol-AsyncBreadthFirstTreeTraversal) | Runtime value and type surface | [Behavior](reference.md#breadth-first-traversal) |
| [AsyncChildHintTransformer](#symbol-AsyncChildHintTransformer) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncCollection](#symbol-AsyncCollection) | Type-only | [Behavior](reference.md#collection-and-forest-sources) |
| [AsyncDagDiscoverySource](#symbol-AsyncDagDiscoverySource) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [AsyncDagOptions](#symbol-AsyncDagOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncDagOptionsPatch](#symbol-AsyncDagOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncDagRecordSelectors](#symbol-AsyncDagRecordSelectors) | Type-only | [Behavior](reference.md#collection-and-forest-sources) |
| [AsyncDagRootSelectors](#symbol-AsyncDagRootSelectors) | Type-only | [Behavior](reference.md#collection-and-forest-sources) |
| [AsyncDagTraversal](#symbol-AsyncDagTraversal) | Runtime value and type surface | [Behavior](reference.md#dag-traversal) |
| [AsyncDagTraversalRunner](#symbol-AsyncDagTraversalRunner) | Type-only | [Behavior](reference.md#dag-traversal) |
| [AsyncDagVisitor](#symbol-AsyncDagVisitor) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [AsyncDagWorkSession](#symbol-AsyncDagWorkSession) | Type-only | [Behavior](reference.md#ticket-coordination) |
| [AsyncDagWorkSessionOptions](#symbol-AsyncDagWorkSessionOptions) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [AsyncDepthFirstTreeOptions](#symbol-AsyncDepthFirstTreeOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncDepthFirstTreeOptionsPatch](#symbol-AsyncDepthFirstTreeOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncDepthFirstTreeRunner](#symbol-AsyncDepthFirstTreeRunner) | Type-only | [Behavior](reference.md#traversal-orders) |
| [AsyncDepthFirstTreeTraversal](#symbol-AsyncDepthFirstTreeTraversal) | Runtime value and type surface | [Behavior](reference.md#traversal-orders) |
| [AsyncGraphWalk](#symbol-AsyncGraphWalk) | Runtime value and type surface | [Behavior](reference.md#general-graph-walking) |
| [AsyncGraphWalkEdgePredicate](#symbol-AsyncGraphWalkEdgePredicate) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [AsyncGraphWalkExpansionPredicate](#symbol-AsyncGraphWalkExpansionPredicate) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [AsyncGraphWalkOptions](#symbol-AsyncGraphWalkOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncGraphWalkOptionsPatch](#symbol-AsyncGraphWalkOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncGraphWalkRecordSelectors](#symbol-AsyncGraphWalkRecordSelectors) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [AsyncGraphWalkRunner](#symbol-AsyncGraphWalkRunner) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [AsyncGraphWalkSource](#symbol-AsyncGraphWalkSource) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [AsyncGraphWalkVisitor](#symbol-AsyncGraphWalkVisitor) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [AsyncTraversalExecution](#symbol-AsyncTraversalExecution) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [AsyncTreeSource](#symbol-AsyncTreeSource) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [AsyncTreeVisitor](#symbol-AsyncTreeVisitor) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [BreadthFirstPhase](#symbol-BreadthFirstPhase) | Runtime value and type surface | [Behavior](reference.md#breadth-first-traversal) |
| [BreadthFirstTreeOptions](#symbol-BreadthFirstTreeOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [BreadthFirstTreeOptionsPatch](#symbol-BreadthFirstTreeOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [BreadthFirstTreeRunner](#symbol-BreadthFirstTreeRunner) | Type-only | [Behavior](reference.md#breadth-first-traversal) |
| [BreadthFirstTreeTraversal](#symbol-BreadthFirstTreeTraversal) | Runtime value and type surface | [Behavior](reference.md#breadth-first-traversal) |
| [ChildHintTransformer](#symbol-ChildHintTransformer) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [ChildIndexSelection](#symbol-ChildIndexSelection) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [ChildSlot](#symbol-ChildSlot) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [CommandCommitMode](#symbol-CommandCommitMode) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [DagBlocker](#symbol-DagBlocker) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagChildResolutionContext](#symbol-DagChildResolutionContext) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [DagCompositionOptions](#symbol-DagCompositionOptions) | Type-only | [Behavior](reference.md#dag-fragments-and-composition) |
| [DagDeferredWork](#symbol-DagDeferredWork) | Type-only | [Behavior](reference.md#dag-summary-schema) |
| [DagDefinition](#symbol-DagDefinition) | Type-only | [Behavior](reference.md#materialized-dag-definitions) |
| [DagDefinitionChangeAspect](#symbol-DagDefinitionChangeAspect) | Type-only | [Behavior](reference.md#validated-dag-revisions) |
| [DagDefinitionDiff](#symbol-DagDefinitionDiff) | Type-only | [Behavior](reference.md#validated-dag-revisions) |
| [DagDefinitionIssue](#symbol-DagDefinitionIssue) | Type-only | [Behavior](reference.md#materialized-dag-definitions) |
| [DagDefinitionSlot](#symbol-DagDefinitionSlot) | Type-only | [Behavior](reference.md#materialized-dag-definitions) |
| [DagDefinitionVertex](#symbol-DagDefinitionVertex) | Type-only | [Behavior](reference.md#materialized-dag-definitions) |
| [DagDefinitionVertexChange](#symbol-DagDefinitionVertexChange) | Type-only | [Behavior](reference.md#validated-dag-revisions) |
| [DagDiscoveryCycleError](#symbol-DagDiscoveryCycleError) | Runtime value and type surface | [Behavior](reference.md#validation-results-and-failures) |
| [DagDiscoverySource](#symbol-DagDiscoverySource) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [DagEvent](#symbol-DagEvent) | Type-only | [Behavior](reference.md#deferred-dag-progress-and-reconciliation) |
| [DagExplanation](#symbol-DagExplanation) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagFragment](#symbol-DagFragment) | Type-only | [Behavior](reference.md#dag-fragments-and-composition) |
| [DagFragmentValidationError](#symbol-DagFragmentValidationError) | Runtime value and type surface | [Behavior](reference.md#dag-fragments-and-composition) |
| [DagMilestone](#symbol-DagMilestone) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagMilestoneQueryOptions](#symbol-DagMilestoneQueryOptions) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagMilestoneQueryResult](#symbol-DagMilestoneQueryResult) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagMilestoneSnapshot](#symbol-DagMilestoneSnapshot) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagMilestoneStatus](#symbol-DagMilestoneStatus) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagOptions](#symbol-DagOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [DagOptionsPatch](#symbol-DagOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [DagPrerequisiteResolution](#symbol-DagPrerequisiteResolution) | Type-only | [Behavior](reference.md#discovery-and-completed-work) |
| [DagRecordSelectors](#symbol-DagRecordSelectors) | Type-only | [Behavior](reference.md#collection-and-forest-sources) |
| [DagRevisionOperation](#symbol-DagRevisionOperation) | Type-only | [Behavior](reference.md#validated-dag-revisions) |
| [DagRevisionResult](#symbol-DagRevisionResult) | Type-only | [Behavior](reference.md#validated-dag-revisions) |
| [DagRootSelectors](#symbol-DagRootSelectors) | Type-only | [Behavior](reference.md#collection-and-forest-sources) |
| [DagSchedulingOptions](#symbol-DagSchedulingOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [DagSettlementGeneration](#symbol-DagSettlementGeneration) | Type-only | [Behavior](reference.md#dag-summary-schema) |
| [DagSettlementOutcome](#symbol-DagSettlementOutcome) | Type-only | [Behavior](reference.md#dag-summary-schema) |
| [DagSettlementReceipt](#symbol-DagSettlementReceipt) | Type-only | [Behavior](reference.md#ticket-coordination) |
| [DagSummary](#symbol-DagSummary) | Type-only | [Behavior](reference.md#dag-summary-schema) |
| [DagTraversal](#symbol-DagTraversal) | Runtime value and type surface | [Behavior](reference.md#dag-traversal) |
| [DagTraversalRunner](#symbol-DagTraversalRunner) | Type-only | [Behavior](reference.md#dag-traversal) |
| [DagTraversalStallDiagnostics](#symbol-DagTraversalStallDiagnostics) | Type-only | [Behavior](reference.md#validation-results-and-failures) |
| [DagTraversalStallError](#symbol-DagTraversalStallError) | Runtime value and type surface | [Behavior](reference.md#validation-results-and-failures) |
| [DagVertexFound](#symbol-DagVertexFound) | Type-only | [Behavior](reference.md#discovery-and-completed-work) |
| [DagVertexOmitted](#symbol-DagVertexOmitted) | Type-only | [Behavior](reference.md#discovery-and-completed-work) |
| [DagVertexProgress](#symbol-DagVertexProgress) | Type-only | [Behavior](reference.md#dag-summary-schema) |
| [DagVertexResolution](#symbol-DagVertexResolution) | Type-only | [Behavior](reference.md#discovery-and-completed-work) |
| [DagVisitor](#symbol-DagVisitor) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [DagVisitorContext](#symbol-DagVisitorContext) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [DagVisitorPhase](#symbol-DagVisitorPhase) | Runtime value and type surface | [Behavior](reference.md#dag-traversal) |
| [DagWaitEdge](#symbol-DagWaitEdge) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagWorkBoundary](#symbol-DagWorkBoundary) | Type-only | [Behavior](reference.md#ticket-coordination) |
| [DagWorkSession](#symbol-DagWorkSession) | Type-only | [Behavior](reference.md#ticket-coordination) |
| [DagWorkSessionControl](#symbol-DagWorkSessionControl) | Type-only | [Behavior](reference.md#ticket-coordination) |
| [DagWorkSessionOptions](#symbol-DagWorkSessionOptions) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [DagWorkState](#symbol-DagWorkState) | Type-only | [Behavior](reference.md#dag-summary-schema) |
| [DagWorkTicket](#symbol-DagWorkTicket) | Type-only | [Behavior](reference.md#ticket-coordination) |
| [DepthFirstPhase](#symbol-DepthFirstPhase) | Runtime value and type surface | [Behavior](reference.md#traversal-orders) |
| [DepthFirstTreeOptions](#symbol-DepthFirstTreeOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [DepthFirstTreeOptionsPatch](#symbol-DepthFirstTreeOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [DepthFirstTreeRunner](#symbol-DepthFirstTreeRunner) | Type-only | [Behavior](reference.md#traversal-orders) |
| [DepthFirstTreeTraversal](#symbol-DepthFirstTreeTraversal) | Runtime value and type surface | [Behavior](reference.md#traversal-orders) |
| [EmissionKind](#symbol-EmissionKind) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [ExecutionInspection](#symbol-ExecutionInspection) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [GetPathToOptions](#symbol-GetPathToOptions) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [GraphWalk](#symbol-GraphWalk) | Runtime value and type surface | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkCatalogLink](#symbol-GraphWalkCatalogLink) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkCounts](#symbol-GraphWalkCounts) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkDagRelation](#symbol-GraphWalkDagRelation) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkEdge](#symbol-GraphWalkEdge) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkEdgePredicate](#symbol-GraphWalkEdgePredicate) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkEvent](#symbol-GraphWalkEvent) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkEventFor](#symbol-GraphWalkEventFor) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkExpandContext](#symbol-GraphWalkExpandContext) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkExpansionPredicate](#symbol-GraphWalkExpansionPredicate) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkFollowContext](#symbol-GraphWalkFollowContext) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkHydration](#symbol-GraphWalkHydration) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkInspection](#symbol-GraphWalkInspection) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkLimits](#symbol-GraphWalkLimits) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [GraphWalkLink](#symbol-GraphWalkLink) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkOperation](#symbol-GraphWalkOperation) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkOptions](#symbol-GraphWalkOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [GraphWalkOptionsPatch](#symbol-GraphWalkOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [GraphWalkOutcome](#symbol-GraphWalkOutcome) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkPathEvent](#symbol-GraphWalkPathEvent) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkPhase](#symbol-GraphWalkPhase) | Runtime value and type surface | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkRecordSelectors](#symbol-GraphWalkRecordSelectors) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkRevisitOptions](#symbol-GraphWalkRevisitOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [GraphWalkRevisitPolicy](#symbol-GraphWalkRevisitPolicy) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkRouteContext](#symbol-GraphWalkRouteContext) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkRunner](#symbol-GraphWalkRunner) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkSource](#symbol-GraphWalkSource) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkStrategy](#symbol-GraphWalkStrategy) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkSummary](#symbol-GraphWalkSummary) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkTarget](#symbol-GraphWalkTarget) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkVertex](#symbol-GraphWalkVertex) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkVertexResult](#symbol-GraphWalkVertexResult) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkVisitor](#symbol-GraphWalkVisitor) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkVisitorContext](#symbol-GraphWalkVisitorContext) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkVisitorResult](#symbol-GraphWalkVisitorResult) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [HintVertexId](#symbol-HintVertexId) | Type-only | [Behavior](reference.md#dag-traversal) |
| [InOrderOptions](#symbol-InOrderOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [InspectionFilters](#symbol-InspectionFilters) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [MaterializedDagInput](#symbol-MaterializedDagInput) | Type-only | [Behavior](reference.md#collection-and-forest-sources) |
| [MaybePromise](#symbol-MaybePromise) | Type-only | [Behavior](reference.md#async-traversal) |
| [MutableRef](#symbol-MutableRef) | Runtime value and type surface | [Behavior](reference.md#views-handles-identity-and-paths) |
| [MutationCommand](#symbol-MutationCommand) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [MutationCommandBuilder](#symbol-MutationCommandBuilder) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [MutationCommands](#symbol-MutationCommands) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [MutationRequest](#symbol-MutationRequest) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectAssemblyCache](#symbol-ObjectAssemblyCache) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectChildHookResult](#symbol-ObjectChildHookResult) | Type-only | [Behavior](reference.md#traverse-an-object) |
| [ObjectCompositeClassification](#symbol-ObjectCompositeClassification) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectCurrentVertexTypes](#symbol-ObjectCurrentVertexTypes) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectMutationBinder](#symbol-ObjectMutationBinder) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectMutationBinderFactory](#symbol-ObjectMutationBinderFactory) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectMutationCommands](#symbol-ObjectMutationCommands) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectMutationOptions](#symbol-ObjectMutationOptions) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectMutationRequest](#symbol-ObjectMutationRequest) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectPropertyPatch](#symbol-ObjectPropertyPatch) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectRewriteCallback](#symbol-ObjectRewriteCallback) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectRewriteContext](#symbol-ObjectRewriteContext) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectRewriteInput](#symbol-ObjectRewriteInput) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectRewriteOutputResult](#symbol-ObjectRewriteOutputResult) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectTreeOptions](#symbol-ObjectTreeOptions) | Type-only | [Behavior](reference.md#traverse-an-object) |
| [ObjectTreePropertyAdapters](#symbol-ObjectTreePropertyAdapters) | Type-only | [Behavior](reference.md#traverse-an-object) |
| [ObjectTreeSource](#symbol-ObjectTreeSource) | Runtime value and type surface | [Behavior](reference.md#traverse-an-object) |
| [ObjectTreeVertexTypes](#symbol-ObjectTreeVertexTypes) | Type-only | [Behavior](reference.md#traverse-an-object) |
| [OriginalGraphView](#symbol-OriginalGraphView) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [PrepareAsyncDagInput](#symbol-PrepareAsyncDagInput) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [PrepareDagInput](#symbol-PrepareDagInput) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [PrepareDagOptions](#symbol-PrepareDagOptions) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [PrepareDagResult](#symbol-PrepareDagResult) | Type-only | [Behavior](reference.md#materialized-dag-definitions) |
| [PreparedAsyncDagRunnerOptions](#symbol-PreparedAsyncDagRunnerOptions) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [PreparedDag](#symbol-PreparedDag) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [PreparedDagRunnerOptions](#symbol-PreparedDagRunnerOptions) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [PreparedDagVertexSummary](#symbol-PreparedDagVertexSummary) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [PrerequisiteMissing](#symbol-PrerequisiteMissing) | Type-only | [Behavior](reference.md#discovery-and-completed-work) |
| [ResolvedGraphVertex](#symbol-ResolvedGraphVertex) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [ResolvedGraphView](#symbol-ResolvedGraphView) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [ResolvedTreeMap](#symbol-ResolvedTreeMap) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [ResolvedTreeStore](#symbol-ResolvedTreeStore) | Runtime value and type surface | [Behavior](reference.md#views-handles-identity-and-paths) |
| [ResolvedTreeVertexTypes](#symbol-ResolvedTreeVertexTypes) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [ResolvedTreeView](#symbol-ResolvedTreeView) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [ResolvedVisitStage](#symbol-ResolvedVisitStage) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [RewriteObjectOptions](#symbol-RewriteObjectOptions) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [RewriteObjectResult](#symbol-RewriteObjectResult) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [RootValueConverter](#symbol-RootValueConverter) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [SelectedTraversalEvent](#symbol-SelectedTraversalEvent) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [StructuralChildEdge](#symbol-StructuralChildEdge) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [SyncTraversalExecution](#symbol-SyncTraversalExecution) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [TraversableObject](#symbol-TraversableObject) | Type-only | [Behavior](reference.md#traverse-an-object) |
| [TraversableObjectProp](#symbol-TraversableObjectProp) | Type-only | [Behavior](reference.md#traverse-an-object) |
| [TraversableObjectPropKey](#symbol-TraversableObjectPropKey) | Type-only | [Behavior](reference.md#traverse-an-object) |
| [TraversalExecutionOptions](#symbol-TraversalExecutionOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [TraversalExecutionState](#symbol-TraversalExecutionState) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [TraversalRunnerStatus](#symbol-TraversalRunnerStatus) | Runtime value and type surface | [Behavior](reference.md#inspection-and-execution) |
| [TraversalStopReason](#symbol-TraversalStopReason) | Type-only | [Behavior](reference.md#pause-and-resume) |
| [TraversalVisitorCommand](#symbol-TraversalVisitorCommand) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [TraversalVisitorCommandArguments](#symbol-TraversalVisitorCommandArguments) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [TraversalVisitorCommandName](#symbol-TraversalVisitorCommandName) | Runtime value and type surface | [Behavior](reference.md#visitors-and-commands) |
| [TraversalVisitorFunctionOptions](#symbol-TraversalVisitorFunctionOptions) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [TraversalVisitorResult](#symbol-TraversalVisitorResult) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [TreeChildResolutionContext](#symbol-TreeChildResolutionContext) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [TreeDagExecutionInspection](#symbol-TreeDagExecutionInspection) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [TreeDagInspectionOperation](#symbol-TreeDagInspectionOperation) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [TreeMutationCommandBinder](#symbol-TreeMutationCommandBinder) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [TreeMutationCommandBinderFactory](#symbol-TreeMutationCommandBinderFactory) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [TreeSource](#symbol-TreeSource) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [TreeTraversalEvent](#symbol-TreeTraversalEvent) | Type-only | [Behavior](reference.md#traversal-orders) |
| [TreeVertexFound](#symbol-TreeVertexFound) | Type-only | [Behavior](reference.md#abstract-trees) |
| [TreeVertexMetadata](#symbol-TreeVertexMetadata) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [TreeVertexOmitted](#symbol-TreeVertexOmitted) | Type-only | [Behavior](reference.md#abstract-trees) |
| [TreeVertexRecord](#symbol-TreeVertexRecord) | Runtime value and type surface | [Behavior](reference.md#views-handles-identity-and-paths) |
| [TreeVertexRecordContent](#symbol-TreeVertexRecordContent) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [TreeVertexResolution](#symbol-TreeVertexResolution) | Type-only | [Behavior](reference.md#abstract-trees) |
| [TreeVisitor](#symbol-TreeVisitor) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [TreeVisitorContext](#symbol-TreeVisitorContext) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [TreeVisitorRecord](#symbol-TreeVisitorRecord) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [Vertex](#symbol-Vertex) | Runtime value and type surface | [Behavior](reference.md#views-handles-identity-and-paths) |
| [VertexCloneContent](#symbol-VertexCloneContent) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [VertexContent](#symbol-VertexContent) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [VertexContentInput](#symbol-VertexContentInput) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [VertexHandle](#symbol-VertexHandle) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [VertexId](#symbol-VertexId) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [VertexResolutionContext](#symbol-VertexResolutionContext) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [VertexTypes](#symbol-VertexTypes) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [VertexView](#symbol-VertexView) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [VisitorDefinition](#symbol-VisitorDefinition) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [VisitorGroupDefinition](#symbol-VisitorGroupDefinition) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [VisitorGroupMember](#symbol-VisitorGroupMember) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [VisitorGroupMetadata](#symbol-VisitorGroupMetadata) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [VisitorPhaseInput](#symbol-VisitorPhaseInput) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [VisitorPhaseSelection](#symbol-VisitorPhaseSelection) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [VisitorRegistrationMetadata](#symbol-VisitorRegistrationMetadata) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [bindAsyncDagWorkSession](#symbol-bindAsyncDagWorkSession) | Runtime value and type surface | [Behavior](reference.md#ticket-coordination) |
| [bindDagWorkSession](#symbol-bindDagWorkSession) | Runtime value and type surface | [Behavior](reference.md#ticket-coordination) |
| [breadthFirstTraversal](#symbol-breadthFirstTraversal) | Runtime value and type surface | [Behavior](reference.md#api-compatibility) |
| [composeDag](#symbol-composeDag) | Runtime value and type surface | [Behavior](reference.md#dag-fragments-and-composition) |
| [core](#symbol-core) | Runtime value and type surface | [Behavior](reference.md#api-compatibility) |
| [createObjectMutationBinder](#symbol-createObjectMutationBinder) | Runtime value and type surface | [Behavior](reference.md#rewrite-objects) |
| [dagTraversal](#symbol-dagTraversal) | Runtime value and type surface | [Behavior](reference.md#api-compatibility) |
| [defineDag](#symbol-defineDag) | Runtime value and type surface | [Behavior](reference.md#materialized-dag-definitions) |
| [defineDagFragment](#symbol-defineDagFragment) | Runtime value and type surface | [Behavior](reference.md#dag-fragments-and-composition) |
| [depthFirstTraversal](#symbol-depthFirstTraversal) | Runtime value and type surface | [Behavior](reference.md#api-compatibility) |
| [diffDagDefinitions](#symbol-diffDagDefinitions) | Runtime value and type surface | [Behavior](reference.md#validated-dag-revisions) |
| [filterAsyncDagDataVisitor](#symbol-filterAsyncDagDataVisitor) | Runtime value and type surface | [Behavior](reference.md#filtered-dag-visitors) |
| [filterDagDataVisitor](#symbol-filterDagDataVisitor) | Runtime value and type surface | [Behavior](reference.md#filtered-dag-visitors) |
| [graphWalk](#symbol-graphWalk) | Runtime value and type surface | [Behavior](reference.md#api-compatibility) |
| [hasSingleStructuralSink](#symbol-hasSingleStructuralSink) | Runtime value and type surface | [Behavior](reference.md#dag-traversal) |
| [inspectDagMilestones](#symbol-inspectDagMilestones) | Runtime value and type surface | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [mapDagFragmentIds](#symbol-mapDagFragmentIds) | Runtime value and type surface | [Behavior](reference.md#dag-fragments-and-composition) |
| [materializeDagInputFromRecords](#symbol-materializeDagInputFromRecords) | Runtime value and type surface | [Behavior](reference.md#collection-and-forest-sources) |
| [materializeDagInputFromRecordsAsync](#symbol-materializeDagInputFromRecordsAsync) | Runtime value and type surface | [Behavior](reference.md#collection-and-forest-sources) |
| [materializeDagInputFromRoots](#symbol-materializeDagInputFromRoots) | Runtime value and type surface | [Behavior](reference.md#collection-and-forest-sources) |
| [materializeDagInputFromRootsAsync](#symbol-materializeDagInputFromRootsAsync) | Runtime value and type surface | [Behavior](reference.md#collection-and-forest-sources) |
| [materializeWalkSourceFromDagDefinition](#symbol-materializeWalkSourceFromDagDefinition) | Runtime value and type surface | [Behavior](reference.md#walking-adapters-and-inspection) |
| [materializeWalkSourceFromRecords](#symbol-materializeWalkSourceFromRecords) | Runtime value and type surface | [Behavior](reference.md#walking-adapters-and-inspection) |
| [materializeWalkSourceFromRecordsAsync](#symbol-materializeWalkSourceFromRecordsAsync) | Runtime value and type surface | [Behavior](reference.md#walking-adapters-and-inspection) |
| [objectRewrite](#symbol-objectRewrite) | Runtime value and type surface | [Behavior](reference.md#api-compatibility) |
| [prepareDag](#symbol-prepareDag) | Runtime value and type surface | [Behavior](reference.md#reusable-prepared-dags) |
| [prepareDagAsync](#symbol-prepareDagAsync) | Runtime value and type surface | [Behavior](reference.md#reusable-prepared-dags) |
| [prepareDagDefinition](#symbol-prepareDagDefinition) | Runtime value and type surface | [Behavior](reference.md#materialized-dag-definitions) |
| [reviseDag](#symbol-reviseDag) | Runtime value and type surface | [Behavior](reference.md#validated-dag-revisions) |
| [rewriteObject](#symbol-rewriteObject) | Runtime value and type surface | [Behavior](reference.md#rewrite-objects) |
| [rewriteObjectAs](#symbol-rewriteObjectAs) | Runtime value and type surface | [Behavior](reference.md#rewrite-objects) |
| [traversableObjectTree](#symbol-traversableObjectTree) | Runtime value and type surface | [Behavior](reference.md#api-compatibility) |
| [traverseDag](#symbol-traverseDag) | Runtime value and type surface | [Behavior](reference.md#dag-traversal) |
| [traverseDagAsync](#symbol-traverseDagAsync) | Runtime value and type surface | [Behavior](reference.md#dag-traversal) |
| [traverseTreeBreadthFirst](#symbol-traverseTreeBreadthFirst) | Runtime value and type surface | [Behavior](reference.md#breadth-first-traversal) |
| [traverseTreeBreadthFirstAsync](#symbol-traverseTreeBreadthFirstAsync) | Runtime value and type surface | [Behavior](reference.md#breadth-first-traversal) |
| [traverseTreeDepthFirst](#symbol-traverseTreeDepthFirst) | Runtime value and type surface | [Behavior](reference.md#traversal-orders) |
| [traverseTreeDepthFirstAsync](#symbol-traverseTreeDepthFirstAsync) | Runtime value and type surface | [Behavior](reference.md#traversal-orders) |
| [walkGraph](#symbol-walkGraph) | Runtime value and type surface | [Behavior](reference.md#general-graph-walking) |
| [walkGraphAsync](#symbol-walkGraphAsync) | Runtime value and type surface | [Behavior](reference.md#general-graph-walking) |

## Declarations

<a id="symbol-AsyncBreadthFirstTreeOptions"></a>

### AsyncBreadthFirstTreeOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export type AsyncBreadthFirstTreeOptions<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP> = AsyncBreadthFirstTreeOptionsPatch<TTP, RW_TTP> & {
    traversableTree: AsyncTreeSource<TTP, RW_TTP>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `concurrency` | <code>number &#124; undefined</code> |
| `retainOriginalTreeStructure` | <code>boolean &#124; undefined</code> |
| `transformChildHints` | <code>AsyncChildHintTransformer&lt;TTP&gt; &#124; null &#124; undefined</code> |
| `traversableTree` | <code>AsyncTreeSource&lt;TTP, RW_TTP&gt;</code> |
| `visitors` | <code>VisitorInputs&lt;AsyncBreadthFirstTraversalVisitors&lt;TTP, RW_TTP&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-AsyncBreadthFirstTreeOptionsPatch"></a>

### AsyncBreadthFirstTreeOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export type AsyncBreadthFirstTreeOptionsPatch<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP> = {
    traversableTree?: AsyncTreeSource<TTP, RW_TTP> | undefined;
    transformChildHints?: AsyncChildHintTransformer<TTP> | null | undefined;
    visitors?: VisitorInputs<AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>> | undefined;
    retainOriginalTreeStructure?: boolean | undefined;
    concurrency?: number | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `concurrency` | <code>number &#124; undefined</code> |
| `retainOriginalTreeStructure` | <code>boolean &#124; undefined</code> |
| `transformChildHints` | <code>AsyncChildHintTransformer&lt;TTP&gt; &#124; null &#124; undefined</code> |
| `traversableTree` | <code>AsyncTreeSource&lt;TTP, RW_TTP&gt; &#124; undefined</code> |
| `visitors` | <code>VisitorInputs&lt;AsyncBreadthFirstTraversalVisitors&lt;TTP, RW_TTP&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-AsyncBreadthFirstTreeRunner"></a>

### AsyncBreadthFirstTreeRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#breadth-first-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/breadth-first-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export interface AsyncBreadthFirstTreeRunner<TTP extends VertexTypes, RW_TTP extends VertexTypes = TTP> extends AsyncTraversalExecution<BreadthFirstPhase, TreeTraversalEvent<BreadthFirstPhase, TTP, RW_TTP>, TreeDagExecutionInspection<BreadthFirstPhase>> {
getResolvedTreeView(): ResolvedTreeView<TTP | RW_TTP>;
getResolvedGraphView(): ResolvedGraphView<TTP | RW_TTP>;
isTreeRootVertex(ref: VertexHandle<TTP | RW_TTP>): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getResolvedGraphView` | <code>() =&gt; ResolvedGraphView&lt;TTP &#124; RW_TTP, unknown&gt;</code> |
| `getResolvedTreeView` | <code>() =&gt; ResolvedTreeView&lt;TTP &#124; RW_TTP&gt;</code> |
| `getStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `inspect` | <code>() =&gt; TreeDagExecutionInspection&lt;BreadthFirstPhase&gt;</code> |
| `isHalted` | <code>() =&gt; boolean</code> |
| `isTreeRootVertex` | <code>(ref: VertexHandle&lt;TTP &#124; RW_TTP&gt;) =&gt; boolean</code> |
| `iterateEvents` | <code>{ (): AsyncGenerator&lt;TreeTraversalEvent&lt;BreadthFirstPhase, TTP, RW_TTP&gt;, void, unknown&gt;; &lt;Kind extends BreadthFirstPhase&gt;(config: TraversalExecutionOptions&lt;BreadthFirstPhase, Kind&gt; &amp; { emitEvents: readonly Kind[]; }): AsyncGenerator&lt;SelectedTraversalEvent&lt;TreeTraversalEvent&lt;BreadthFirstPhase, TTP, RW_TTP&gt;, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionOptions&lt;BreadthFirstPhase, BreadthFirstPhase&gt; &#124; undefined): AsyncGenerator&lt;TreeTraversalEvent&lt;BreadthFirstPhase, TTP, RW_TTP&gt;, void, unknown&gt;; }</code> |
| `requestPause` | <code>() =&gt; boolean</code> |
| `run` | <code>(config?: TraversalExecutionOptions&lt;BreadthFirstPhase, BreadthFirstPhase&gt; &#124; undefined) =&gt; Promise&lt;AsyncBreadthFirstTreeRunner&lt;TTP, RW_TTP&gt;&gt;</code> |

</details>

<a id="symbol-AsyncBreadthFirstTreeTraversal"></a>

### AsyncBreadthFirstTreeTraversal

Runtime value and public type surface. [Owning contract](reference.md#breadth-first-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/breadth-first-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export declare class AsyncBreadthFirstTreeTraversal<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP> {
constructor(icfgInput: AsyncBreadthFirstTreeOptions<TTP, RW_TTP>);
configure(icfgInput: AsyncBreadthFirstTreeOptionsPatch<TTP, RW_TTP>): this;
addVisitorFor<Phase extends BreadthFirstPhase>(phase: Phase, visitor: AsyncTreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>, options?: Partial<TraversalVisitorFunctionOptions>): this;
addVisitorGroupFor<Phase extends BreadthFirstPhase>(phase: Phase, group: VisitorGroupDefinition<AsyncTreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>>): this;
listVisitorsFor<Phase extends BreadthFirstPhase>(phase: Phase): AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>[Phase];
setVisitorsFor<Phase extends BreadthFirstPhase>(phase: Phase, input: VisitorPhaseInput<AsyncTreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>>): this;
createRunner(): AsyncBreadthFirstTreeRunner<TTP, RW_TTP>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `addVisitorFor` | <code>&lt;Phase extends BreadthFirstPhase&gt;(phase: Phase, visitor: AsyncTreeVisitor&lt;NoInferPhase&lt;Phase&gt;, TTP, RW_TTP&gt;, options?: Partial&lt;TraversalVisitorFunctionOptions&gt; &#124; undefined) =&gt; AsyncBreadthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |
| `addVisitorGroupFor` | <code>&lt;Phase extends BreadthFirstPhase&gt;(phase: Phase, group: VisitorGroupDefinition&lt;AsyncTreeVisitor&lt;NoInferPhase&lt;Phase&gt;, TTP, RW_TTP&gt;&gt;) =&gt; AsyncBreadthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |
| `configure` | <code>(icfgInput: AsyncBreadthFirstTreeOptionsPatch&lt;TTP, RW_TTP&gt;) =&gt; AsyncBreadthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |
| `createRunner` | <code>() =&gt; AsyncBreadthFirstTreeRunner&lt;TTP, RW_TTP&gt;</code> |
| `listVisitorsFor` | <code>&lt;Phase extends BreadthFirstPhase&gt;(phase: Phase) =&gt; AsyncBreadthFirstTraversalVisitors&lt;TTP, RW_TTP&gt;[Phase]</code> |
| `setVisitorsFor` | <code>&lt;Phase extends BreadthFirstPhase&gt;(phase: Phase, input: VisitorPhaseInput&lt;AsyncTreeVisitor&lt;NoInferPhase&lt;Phase&gt;, TTP, RW_TTP&gt;&gt;) =&gt; AsyncBreadthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |

</details>

<a id="symbol-AsyncChildHintTransformer"></a>

### AsyncChildHintTransformer

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](reference.md#hint-transformation-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type AsyncChildHintTransformer<T extends VertexTypes> = (hints: T['VertexHint'][]) => MaybePromise<T['VertexHint'][]>;
```

<a id="symbol-AsyncCollection"></a>

### AsyncCollection

Type-only; no runtime constructor/value. [Owning contract](reference.md#collection-and-forest-sources) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/quickstart-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/sources`.

```ts
export type AsyncCollection<Item> = Iterable<Item> | AsyncIterable<Item>;
```

<a id="symbol-AsyncDagDiscoverySource"></a>

### AsyncDagDiscoverySource

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-prerequisite-resolution-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface AsyncDagDiscoverySource<T extends VertexTypes, R extends VertexTypes = T, ID = unknown> {
resolvePrerequisite?: (id: ID) => MaybePromise<DagPrerequisiteResolution<T, ID>>;
resolveRoot: () => MaybePromise<DagVertexResolution<T, ID>>;
resolveChild: (hint: T['VertexHint'], options: DagChildResolutionContext<T, R, ID>) => MaybePromise<DagVertexResolution<T, ID>>;
getVertexIdFromHint?: (hint: T['VertexHint']) => MaybePromise<HintVertexId<ID> | undefined>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getVertexIdFromHint` | <code>((hint: T["VertexHint"]) =&gt; MaybePromise&lt;HintVertexId&lt;ID&gt; &#124; undefined&gt;) &#124; undefined</code> |
| `resolveChild` | <code>(hint: T["VertexHint"], options: DagChildResolutionContext&lt;T, R, ID&gt;) =&gt; MaybePromise&lt;DagVertexResolution&lt;T, ID&gt;&gt;</code> |
| `resolvePrerequisite` | <code>((id: ID) =&gt; MaybePromise&lt;DagPrerequisiteResolution&lt;T, ID&gt;&gt;) &#124; undefined</code> |
| `resolveRoot` | <code>() =&gt; MaybePromise&lt;DagVertexResolution&lt;T, ID&gt;&gt;</code> |

</details>

<a id="symbol-AsyncDagOptions"></a>

### AsyncDagOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type AsyncDagOptions<T extends VertexTypes = VertexTypes, R extends VertexTypes = T, ID = unknown> = AsyncDagSource<T, R, ID> & AsyncDagTraversalOptionsInput<T, R, ID> & ({
    traversableGraph: AsyncDagDiscoverySource<T, R, ID>;
} | {
    rootWorkDependencies?: never;
    dependsOnWorkDefault?: never;
});
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `completedWork` | <code>ReadonlySet&lt;ID&gt; &#124; undefined</code> |
| `concurrency` | <code>number &#124; undefined</code> |
| `dependsOnWorkDefault` | <code>"none" &#124; "discoveryParentWork" &#124; undefined</code> |
| `discovery` | <code>"lazy" &#124; "eager" &#124; undefined</code> |
| `retainOriginalGraphStructure` | <code>boolean &#124; undefined</code> |
| `rootWorkDependencies` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `syntheticRoot` | <code>boolean &#124; undefined</code> |
| `transformChildHints` | <code>AsyncChildHintTransformer&lt;T&gt; &#124; null &#124; undefined</code> |
| `traversableGraph` | <code>AsyncDagDiscoverySource&lt;T, R, ID&gt; &#124; undefined</code> |
| `traversableTree` | <code>(unknown extends ID ? AsyncTreeSource&lt;T, R&gt; : never) &#124; undefined</code> |
| `visitors` | <code>VisitorInputs&lt;AsyncDagTraversalVisitors&lt;T, R, ID&gt;&gt; &#124; undefined</code> |
| `workCompletion` | <code>"afterWorkReadyChain" &#124; "externalSettlement" &#124; undefined</code> |

</details>

<a id="symbol-AsyncDagOptionsPatch"></a>

### AsyncDagOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type AsyncDagOptionsPatch<T extends VertexTypes = VertexTypes, R extends VertexTypes = T, ID = unknown> = AsyncDagTraversalOptionsInput<T, R, ID> & ({
    traversableGraph?: AsyncDagDiscoverySource<T, R, ID> | undefined;
    traversableTree?: undefined;
} | {
    rootWorkDependencies?: never;
    dependsOnWorkDefault?: never;
    traversableTree?: (unknown extends ID ? AsyncTreeSource<T, R> : never) | undefined;
    traversableGraph?: undefined;
});
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `completedWork` | <code>ReadonlySet&lt;ID&gt; &#124; undefined</code> |
| `concurrency` | <code>number &#124; undefined</code> |
| `dependsOnWorkDefault` | <code>"none" &#124; "discoveryParentWork" &#124; undefined</code> |
| `discovery` | <code>"lazy" &#124; "eager" &#124; undefined</code> |
| `retainOriginalGraphStructure` | <code>boolean &#124; undefined</code> |
| `rootWorkDependencies` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `syntheticRoot` | <code>boolean &#124; undefined</code> |
| `transformChildHints` | <code>AsyncChildHintTransformer&lt;T&gt; &#124; null &#124; undefined</code> |
| `traversableGraph` | <code>AsyncDagDiscoverySource&lt;T, R, ID&gt; &#124; undefined</code> |
| `traversableTree` | <code>(unknown extends ID ? AsyncTreeSource&lt;T, R&gt; : never) &#124; undefined</code> |
| `visitors` | <code>VisitorInputs&lt;AsyncDagTraversalVisitors&lt;T, R, ID&gt;&gt; &#124; undefined</code> |
| `workCompletion` | <code>"afterWorkReadyChain" &#124; "externalSettlement" &#124; undefined</code> |

</details>

<a id="symbol-AsyncDagRecordSelectors"></a>

### AsyncDagRecordSelectors

Type-only; no runtime constructor/value. [Owning contract](reference.md#collection-and-forest-sources) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/quickstart-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/sources`.

```ts
export type AsyncDagRecordSelectors<Item, ID> = {
    id(item: Item): MaybePromise<ID>;
    children?(item: Item): MaybePromise<AsyncCollection<ID>>;
    dependsOnWork?(item: Item): MaybePromise<AsyncCollection<ID>>;
    dependsOnSubgraphCompletion?(item: Item): MaybePromise<AsyncCollection<ID>>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `children` | <code>((item: Item) =&gt; MaybePromise&lt;AsyncCollection&lt;ID&gt;&gt;) &#124; undefined</code> |
| `dependsOnSubgraphCompletion` | <code>((item: Item) =&gt; MaybePromise&lt;AsyncCollection&lt;ID&gt;&gt;) &#124; undefined</code> |
| `dependsOnWork` | <code>((item: Item) =&gt; MaybePromise&lt;AsyncCollection&lt;ID&gt;&gt;) &#124; undefined</code> |
| `id` | <code>(item: Item) =&gt; MaybePromise&lt;ID&gt;</code> |

</details>

<a id="symbol-AsyncDagRootSelectors"></a>

### AsyncDagRootSelectors

Type-only; no runtime constructor/value. [Owning contract](reference.md#collection-and-forest-sources) · [Related example](reference.md#roots-materialization-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/sources`.

```ts
export type AsyncDagRootSelectors<Item, ID> = Omit<AsyncDagRecordSelectors<Item, ID>, 'children'> & {
    children?(item: Item): MaybePromise<AsyncCollection<Item>>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `children` | <code>((item: Item) =&gt; MaybePromise&lt;AsyncCollection&lt;Item&gt;&gt;) &#124; undefined</code> |
| `dependsOnSubgraphCompletion` | <code>((item: Item) =&gt; MaybePromise&lt;AsyncCollection&lt;ID&gt;&gt;) &#124; undefined</code> |
| `dependsOnWork` | <code>((item: Item) =&gt; MaybePromise&lt;AsyncCollection&lt;ID&gt;&gt;) &#124; undefined</code> |
| `id` | <code>(item: Item) =&gt; MaybePromise&lt;ID&gt;</code> |

</details>

<a id="symbol-AsyncDagTraversal"></a>

### AsyncDagTraversal

Runtime value and public type surface. [Owning contract](reference.md#dag-traversal) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-prerequisite-resolution-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare class AsyncDagTraversal<T extends VertexTypes = VertexTypes, R extends VertexTypes = T, ID = unknown> {
constructor(input: Omit<AsyncDagOptions<T, R, ID>, 'traversableGraph' | 'traversableTree'> & ({
        traversableGraph: DagDiscoverySource<T, R, ID>;
        traversableTree?: undefined;
    } | {
        rootWorkDependencies?: never;
        dependsOnWorkDefault?: never;
        traversableTree: unknown extends ID ? AsyncTreeSource<T, R> : never;
        traversableGraph?: undefined;
    }));
constructor(input: AsyncDagOptions<T, R, ID>);
configure(input: AsyncDagOptionsPatch<T, R, ID>): this;
addVisitorFor<ORDER extends DagVisitorPhase>(order: ORDER, visitor: AsyncDagVisitor<T, R, NoInferPhase<ORDER>, ID>, options?: Partial<TraversalVisitorFunctionOptions>): this;
addVisitorGroupFor<ORDER extends DagVisitorPhase>(order: ORDER, group: VisitorGroupDefinition<AsyncDagVisitor<T, R, NoInferPhase<ORDER>, ID>>): this;
listVisitorsFor<ORDER extends DagVisitorPhase>(order: ORDER): AsyncDagTraversalVisitors<T, R, ID>[ORDER];
setVisitorsFor<ORDER extends DagVisitorPhase>(order: ORDER, input: VisitorPhaseInput<AsyncDagVisitor<T, R, NoInferPhase<ORDER>, ID>>): this;
createRunner(): AsyncDagTraversalRunner<T, R, ID>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `addVisitorFor` | <code>&lt;ORDER extends DagVisitorPhase&gt;(order: ORDER, visitor: AsyncDagVisitor&lt;T, R, NoInferPhase&lt;ORDER&gt;, ID&gt;, options?: Partial&lt;TraversalVisitorFunctionOptions&gt; &#124; undefined) =&gt; AsyncDagTraversal&lt;T, R, ID&gt;</code> |
| `addVisitorGroupFor` | <code>&lt;ORDER extends DagVisitorPhase&gt;(order: ORDER, group: VisitorGroupDefinition&lt;AsyncDagVisitor&lt;T, R, NoInferPhase&lt;ORDER&gt;, ID&gt;&gt;) =&gt; AsyncDagTraversal&lt;T, R, ID&gt;</code> |
| `configure` | <code>(input: AsyncDagOptionsPatch&lt;T, R, ID&gt;) =&gt; AsyncDagTraversal&lt;T, R, ID&gt;</code> |
| `createRunner` | <code>() =&gt; AsyncDagTraversalRunner&lt;T, R, ID&gt;</code> |
| `listVisitorsFor` | <code>&lt;ORDER extends DagVisitorPhase&gt;(order: ORDER) =&gt; AsyncDagTraversalVisitors&lt;T, R, ID&gt;[ORDER]</code> |
| `setVisitorsFor` | <code>&lt;ORDER extends DagVisitorPhase&gt;(order: ORDER, input: VisitorPhaseInput&lt;AsyncDagVisitor&lt;T, R, NoInferPhase&lt;ORDER&gt;, ID&gt;&gt;) =&gt; AsyncDagTraversal&lt;T, R, ID&gt;</code> |

</details>

<a id="symbol-AsyncDagTraversalRunner"></a>

### AsyncDagTraversalRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-prerequisite-resolution-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export interface AsyncDagTraversalRunner<T extends VertexTypes = VertexTypes, R extends VertexTypes = T, ID = unknown> extends AsyncTraversalExecution<DagVisitorPhase, DagEvent<T | R, ID>, TreeDagExecutionInspection<DagVisitorPhase>, 'workCompleted' | 'subgraphCompleted'> {
readonly originalGraphView: OriginalGraphView<T, ID> | null;
prepare(): Promise<this>;
inspectMilestones(): DagMilestoneSnapshot<ID>;
summary(): DagSummary<ID>;
settle(id: ID, outcome: DagSettlementOutcome, expectedGeneration: DagSettlementGeneration): boolean;
getResolvedTreeView(): ResolvedTreeView<T | R> | null;
getResolvedGraphView(): ResolvedGraphView<T | R, ID>;
isGraphRootVertex(ref: VertexHandle<T | R>): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getResolvedGraphView` | <code>() =&gt; ResolvedGraphView&lt;T &#124; R, ID&gt;</code> |
| `getResolvedTreeView` | <code>() =&gt; ResolvedTreeView&lt;T &#124; R&gt; &#124; null</code> |
| `getStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `inspect` | <code>() =&gt; TreeDagExecutionInspection&lt;DagVisitorPhase&gt;</code> |
| `inspectMilestones` | <code>() =&gt; DagMilestoneSnapshot&lt;ID&gt;</code> |
| `isGraphRootVertex` | <code>(ref: VertexHandle&lt;T &#124; R&gt;) =&gt; boolean</code> |
| `isHalted` | <code>() =&gt; boolean</code> |
| `iterateEvents` | <code>{ (): AsyncGenerator&lt;DagEvent&lt;T &#124; R, ID&gt;, void, unknown&gt;; &lt;Kind extends "workCompleted" &#124; "subgraphCompleted"&gt;(config: TraversalExecutionOptions&lt;DagVisitorPhase, Kind&gt; &amp; { emitEvents: readonly Kind[]; }): AsyncGenerator&lt;SelectedTraversalEvent&lt;DagEvent&lt;T &#124; R, ID&gt;, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionOptions&lt;DagVisitorPhase, "workCompleted" &#124; "subgraphCompleted"&gt; &#124; undefined): AsyncGenerator&lt;DagEvent&lt;T &#124; R, ID&gt;, void, unknown&gt;; }</code> |
| `originalGraphView` | <code>OriginalGraphView&lt;T, ID&gt; &#124; null</code> |
| `prepare` | <code>() =&gt; Promise&lt;AsyncDagTraversalRunner&lt;T, R, ID&gt;&gt;</code> |
| `requestPause` | <code>() =&gt; boolean</code> |
| `run` | <code>(config?: TraversalExecutionOptions&lt;DagVisitorPhase, "workCompleted" &#124; "subgraphCompleted"&gt; &#124; undefined) =&gt; Promise&lt;AsyncDagTraversalRunner&lt;T, R, ID&gt;&gt;</code> |
| `settle` | <code>(id: ID, outcome: DagSettlementOutcome, expectedGeneration: symbol) =&gt; boolean</code> |
| `summary` | <code>() =&gt; Readonly&lt;{ discovery: Readonly&lt;{ mode: "lazy" &#124; "eager"; complete: boolean; }&gt;; counts: Readonly&lt;{ discovered: number; pending: number; readyOrDeferred: number; deferredWork: number; activeVisitorVertices: number; workCompleted: number; subgraphCompleted: number; }&gt;; vertices: ReadonlyMap&lt;ID, Readonly&lt;{ vertexId: ID; work: DagWorkState; subgraphComplete: boolean; unmetPrerequisiteIds: readonly ID[]; unmetWorkPrerequisiteIds: readonly ID[]; unmetSubgraphPrerequisiteIds: readonly ID[]; generation?: symbol &#124; undefined; }&gt;&gt;; readyOrDeferredIds: readonly ID[]; deferredWorkIds: readonly ID[]; awaitingSettlement: readonly Readonly&lt;{ vertexId: ID; generation: symbol; }&gt;[]; activeVisitorVertexIds: readonly ID[]; completedWorkIds: readonly ID[]; completedSubgraphIds: readonly ID[]; unusedCompletedWorkIds: readonly ID[]; diagnostics: DagTraversalStallDiagnostics&lt;ID&gt; &#124; null; }&gt;</code> |

</details>

<a id="symbol-AsyncDagVisitor"></a>

### AsyncDagVisitor

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-prerequisite-resolution-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type AsyncDagVisitor<T extends VertexTypes, R extends VertexTypes = T, ORDER extends DagVisitorPhase = DagVisitorPhase, ID = unknown> = VisitResult<R, ORDER, 'dag', T['VertexHint']> extends infer RESULT ? (vertex: VertexView<T | R>, options: DagVisitorContext<T, R, ORDER, ID>) => MaybePromise<RESULT> : never;
```

<a id="symbol-AsyncDagWorkSession"></a>

### AsyncDagWorkSession

Type-only; no runtime constructor/value. [Owning contract](reference.md#ticket-coordination) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export interface AsyncDagWorkSession<ID = unknown> extends DagWorkSessionControl<ID> {
advance(): Promise<DagWorkBoundary<ID>>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `advance` | <code>() =&gt; Promise&lt;DagWorkBoundary&lt;ID&gt;&gt;</code> |
| `completeWork` | <code>(ticket: DagWorkTicket&lt;ID&gt;) =&gt; DagSettlementReceipt</code> |
| `failTraversal` | <code>(ticket: DagWorkTicket&lt;ID&gt;, error: unknown) =&gt; DagSettlementReceipt</code> |
| `getStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `inspect` | <code>() =&gt; TreeDagExecutionInspection&lt;DagVisitorPhase&gt;</code> |
| `inspectMilestones` | <code>() =&gt; DagMilestoneSnapshot&lt;ID&gt;</code> |
| `isHalted` | <code>() =&gt; boolean</code> |
| `requestPause` | <code>() =&gt; boolean</code> |
| `summary` | <code>() =&gt; Readonly&lt;{ discovery: Readonly&lt;{ mode: "lazy" &#124; "eager"; complete: boolean; }&gt;; counts: Readonly&lt;{ discovered: number; pending: number; readyOrDeferred: number; deferredWork: number; activeVisitorVertices: number; workCompleted: number; subgraphCompleted: number; }&gt;; vertices: ReadonlyMap&lt;ID, Readonly&lt;{ vertexId: ID; work: DagWorkState; subgraphComplete: boolean; unmetPrerequisiteIds: readonly ID[]; unmetWorkPrerequisiteIds: readonly ID[]; unmetSubgraphPrerequisiteIds: readonly ID[]; generation?: symbol &#124; undefined; }&gt;&gt;; readyOrDeferredIds: readonly ID[]; deferredWorkIds: readonly ID[]; awaitingSettlement: readonly Readonly&lt;{ vertexId: ID; generation: symbol; }&gt;[]; activeVisitorVertexIds: readonly ID[]; completedWorkIds: readonly ID[]; completedSubgraphIds: readonly ID[]; unusedCompletedWorkIds: readonly ID[]; diagnostics: DagTraversalStallDiagnostics&lt;ID&gt; &#124; null; }&gt;</code> |

</details>

<a id="symbol-AsyncDagWorkSessionOptions"></a>

### AsyncDagWorkSessionOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type AsyncDagWorkSessionOptions<ID> = DagWorkSessionOptions<ID> & {
    concurrency?: number;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `completedWork` | <code>ReadonlySet&lt;ID&gt; &#124; undefined</code> |
| `concurrency` | <code>number &#124; undefined</code> |
| `dependsOnWorkDefault` | <code>undefined</code> |
| `discovery` | <code>undefined</code> |
| `retainOriginalGraphStructure` | <code>undefined</code> |
| `rootWorkDependencies` | <code>undefined</code> |
| `syntheticRoot` | <code>undefined</code> |
| `transformChildHints` | <code>undefined</code> |
| `traversableGraph` | <code>undefined</code> |
| `traversableTree` | <code>undefined</code> |
| `traversalRunnerInternalObjects` | <code>undefined</code> |
| `visitors` | <code>undefined</code> |
| `workCompletion` | <code>undefined</code> |

</details>

<a id="symbol-AsyncDepthFirstTreeOptions"></a>

### AsyncDepthFirstTreeOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export type AsyncDepthFirstTreeOptions<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP> = AsyncDepthFirstTreeOptionsPatch<TTP, RW_TTP> & {
    traversableTree: AsyncTreeSource<TTP, RW_TTP>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `concurrency` | <code>number &#124; undefined</code> |
| `inOrder` | <code>InOrderOptionsPatch &#124; undefined</code> |
| `retainOriginalTreeStructure` | <code>boolean &#124; undefined</code> |
| `transformChildHints` | <code>AsyncChildHintTransformer&lt;TTP&gt; &#124; null &#124; undefined</code> |
| `traversableTree` | <code>AsyncTreeSource&lt;TTP, RW_TTP&gt;</code> |
| `visitors` | <code>VisitorInputs&lt;AsyncDepthFirstTraversalVisitors&lt;TTP, RW_TTP&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-AsyncDepthFirstTreeOptionsPatch"></a>

### AsyncDepthFirstTreeOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export type AsyncDepthFirstTreeOptionsPatch<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP> = {
    traversableTree?: AsyncTreeSource<TTP, RW_TTP> | undefined;
    transformChildHints?: AsyncChildHintTransformer<TTP> | null | undefined;
    visitors?: VisitorInputs<AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>> | undefined;
    retainOriginalTreeStructure?: boolean | undefined;
    inOrder?: InOrderOptionsPatch | undefined;
    concurrency?: number | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `concurrency` | <code>number &#124; undefined</code> |
| `inOrder` | <code>InOrderOptionsPatch &#124; undefined</code> |
| `retainOriginalTreeStructure` | <code>boolean &#124; undefined</code> |
| `transformChildHints` | <code>AsyncChildHintTransformer&lt;TTP&gt; &#124; null &#124; undefined</code> |
| `traversableTree` | <code>AsyncTreeSource&lt;TTP, RW_TTP&gt; &#124; undefined</code> |
| `visitors` | <code>VisitorInputs&lt;AsyncDepthFirstTraversalVisitors&lt;TTP, RW_TTP&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-AsyncDepthFirstTreeRunner"></a>

### AsyncDepthFirstTreeRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#traversal-orders) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/async-adapter-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export interface AsyncDepthFirstTreeRunner<TTP extends VertexTypes, RW_TTP extends VertexTypes = TTP> extends AsyncTraversalExecution<DepthFirstPhase, TreeTraversalEvent<DepthFirstPhase, TTP, RW_TTP>, TreeDagExecutionInspection<DepthFirstPhase>> {
getResolvedTreeView(): ResolvedTreeView<TTP | RW_TTP>;
getResolvedGraphView(): ResolvedGraphView<TTP | RW_TTP>;
isTreeRootVertex(ref: VertexHandle<TTP | RW_TTP>): boolean;
isChildExpansionSkipped(ref: VertexHandle<TTP | RW_TTP>): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getResolvedGraphView` | <code>() =&gt; ResolvedGraphView&lt;TTP &#124; RW_TTP, unknown&gt;</code> |
| `getResolvedTreeView` | <code>() =&gt; ResolvedTreeView&lt;TTP &#124; RW_TTP&gt;</code> |
| `getStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `inspect` | <code>() =&gt; TreeDagExecutionInspection&lt;DepthFirstPhase&gt;</code> |
| `isChildExpansionSkipped` | <code>(ref: VertexHandle&lt;TTP &#124; RW_TTP&gt;) =&gt; boolean</code> |
| `isHalted` | <code>() =&gt; boolean</code> |
| `isTreeRootVertex` | <code>(ref: VertexHandle&lt;TTP &#124; RW_TTP&gt;) =&gt; boolean</code> |
| `iterateEvents` | <code>{ (): AsyncGenerator&lt;TreeTraversalEvent&lt;DepthFirstPhase, TTP, RW_TTP&gt;, void, unknown&gt;; &lt;Kind extends DepthFirstPhase&gt;(config: TraversalExecutionOptions&lt;DepthFirstPhase, Kind&gt; &amp; { emitEvents: readonly Kind[]; }): AsyncGenerator&lt;SelectedTraversalEvent&lt;TreeTraversalEvent&lt;DepthFirstPhase, TTP, RW_TTP&gt;, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionOptions&lt;DepthFirstPhase, DepthFirstPhase&gt; &#124; undefined): AsyncGenerator&lt;TreeTraversalEvent&lt;DepthFirstPhase, TTP, RW_TTP&gt;, void, unknown&gt;; }</code> |
| `requestPause` | <code>() =&gt; boolean</code> |
| `run` | <code>(config?: TraversalExecutionOptions&lt;DepthFirstPhase, DepthFirstPhase&gt; &#124; undefined) =&gt; Promise&lt;AsyncDepthFirstTreeRunner&lt;TTP, RW_TTP&gt;&gt;</code> |

</details>

<a id="symbol-AsyncDepthFirstTreeTraversal"></a>

### AsyncDepthFirstTreeTraversal

Runtime value and public type surface. [Owning contract](reference.md#traversal-orders) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/async-adapter-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export declare class AsyncDepthFirstTreeTraversal<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP> {
constructor(icfgInput: AsyncDepthFirstTreeOptions<TTP, RW_TTP>);
configure(icfgInput: AsyncDepthFirstTreeOptionsPatch<TTP, RW_TTP>): this;
addVisitorFor<Phase extends DepthFirstPhase>(phase: Phase, visitor: AsyncTreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>, options?: Partial<TraversalVisitorFunctionOptions>): this;
addVisitorGroupFor<Phase extends DepthFirstPhase>(phase: Phase, group: VisitorGroupDefinition<AsyncTreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>>): this;
listVisitorsFor<Phase extends DepthFirstPhase>(phase: Phase): AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>[Phase];
setVisitorsFor<Phase extends DepthFirstPhase>(phase: Phase, input: VisitorPhaseInput<AsyncTreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>>): this;
createRunner(): AsyncDepthFirstTreeRunner<TTP, RW_TTP>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `addVisitorFor` | <code>&lt;Phase extends DepthFirstPhase&gt;(phase: Phase, visitor: AsyncTreeVisitor&lt;NoInferPhase&lt;Phase&gt;, TTP, RW_TTP&gt;, options?: Partial&lt;TraversalVisitorFunctionOptions&gt; &#124; undefined) =&gt; AsyncDepthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |
| `addVisitorGroupFor` | <code>&lt;Phase extends DepthFirstPhase&gt;(phase: Phase, group: VisitorGroupDefinition&lt;AsyncTreeVisitor&lt;NoInferPhase&lt;Phase&gt;, TTP, RW_TTP&gt;&gt;) =&gt; AsyncDepthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |
| `configure` | <code>(icfgInput: AsyncDepthFirstTreeOptionsPatch&lt;TTP, RW_TTP&gt;) =&gt; AsyncDepthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |
| `createRunner` | <code>() =&gt; AsyncDepthFirstTreeRunner&lt;TTP, RW_TTP&gt;</code> |
| `listVisitorsFor` | <code>&lt;Phase extends DepthFirstPhase&gt;(phase: Phase) =&gt; AsyncDepthFirstTraversalVisitors&lt;TTP, RW_TTP&gt;[Phase]</code> |
| `setVisitorsFor` | <code>&lt;Phase extends DepthFirstPhase&gt;(phase: Phase, input: VisitorPhaseInput&lt;AsyncTreeVisitor&lt;NoInferPhase&lt;Phase&gt;, TTP, RW_TTP&gt;&gt;) =&gt; AsyncDepthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |

</details>

<a id="symbol-AsyncGraphWalk"></a>

### AsyncGraphWalk

Runtime value and public type surface. [Owning contract](reference.md#general-graph-walking) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare class AsyncGraphWalk<Data, Edge, ID> {
constructor(options: AsyncGraphWalkOptions<Data, Edge, ID>);
configure(patch: AsyncGraphWalkOptionsPatch<Data, Edge, ID>): this;
addVisitorFor<Phase extends GraphWalkPhase>(phase: Phase, visitor: AsyncGraphWalkVisitor<Data, Edge, NoInferPhase<Phase>, ID>, options?: Partial<TraversalVisitorFunctionOptions>): this;
addVisitorGroupFor<Phase extends GraphWalkPhase>(phase: Phase, group: VisitorGroupDefinition<AsyncGraphWalkVisitor<Data, Edge, NoInferPhase<Phase>, ID>>): this;
setVisitorsFor<Phase extends GraphWalkPhase>(phase: Phase, input: VisitorPhaseInput<AsyncGraphWalkVisitor<Data, Edge, NoInferPhase<Phase>, ID>>): this;
listVisitorsFor<Phase extends GraphWalkPhase>(phase: Phase): VisitorRecord<AsyncGraphWalkVisitor<Data, Edge, Phase, ID>>[];
createRunner(): AsyncGraphWalkRunner<Data, Edge, ID>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `addVisitorFor` | <code>&lt;Phase extends GraphWalkPhase&gt;(phase: Phase, visitor: AsyncGraphWalkVisitor&lt;Data, Edge, NoInferPhase&lt;Phase&gt;, ID&gt;, options?: Partial&lt;TraversalVisitorFunctionOptions&gt; &#124; undefined) =&gt; AsyncGraphWalk&lt;Data, Edge, ID&gt;</code> |
| `addVisitorGroupFor` | <code>&lt;Phase extends GraphWalkPhase&gt;(phase: Phase, group: VisitorGroupDefinition&lt;AsyncGraphWalkVisitor&lt;Data, Edge, NoInferPhase&lt;Phase&gt;, ID&gt;&gt;) =&gt; AsyncGraphWalk&lt;Data, Edge, ID&gt;</code> |
| `configure` | <code>(patch: AsyncGraphWalkOptionsPatch&lt;Data, Edge, ID&gt;) =&gt; AsyncGraphWalk&lt;Data, Edge, ID&gt;</code> |
| `createRunner` | <code>() =&gt; AsyncGraphWalkRunner&lt;Data, Edge, ID&gt;</code> |
| `listVisitorsFor` | <code>&lt;Phase extends GraphWalkPhase&gt;(phase: Phase) =&gt; VisitorRecord&lt;AsyncGraphWalkVisitor&lt;Data, Edge, Phase, ID&gt;&gt;[]</code> |
| `setVisitorsFor` | <code>&lt;Phase extends GraphWalkPhase&gt;(phase: Phase, input: VisitorPhaseInput&lt;AsyncGraphWalkVisitor&lt;Data, Edge, NoInferPhase&lt;Phase&gt;, ID&gt;&gt;) =&gt; AsyncGraphWalk&lt;Data, Edge, ID&gt;</code> |

</details>

<a id="symbol-AsyncGraphWalkEdgePredicate"></a>

### AsyncGraphWalkEdgePredicate

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type AsyncGraphWalkEdgePredicate<Data, Edge, ID> = (edge: GraphWalkEdge<Edge, ID>, context: GraphWalkFollowContext<Data, Edge, ID>) => MaybePromise<boolean>;
```

<a id="symbol-AsyncGraphWalkExpansionPredicate"></a>

### AsyncGraphWalkExpansionPredicate

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type AsyncGraphWalkExpansionPredicate<Data, Edge, ID> = (vertex: GraphWalkVertex<Data, ID>, context: GraphWalkExpandContext<Data, Edge, ID>) => MaybePromise<boolean>;
```

<a id="symbol-AsyncGraphWalkOptions"></a>

### AsyncGraphWalkOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type AsyncGraphWalkOptions<Data, Edge, ID> = AsyncGraphWalkFields<Data, Edge, ID> & GraphWalkRevisitOptions;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `emitEvents` | <code>readonly ("vertex" &#124; "edge" &#124; "path")[] &#124; undefined</code> |
| `limits` | <code>GraphWalkLimits &#124; (GraphWalkLimits &amp; ({ maxDepth: number; } &#124; { maxCandidateReadAttempts: number; })) &#124; undefined</code> |
| `revisit` | <code>"once" &#124; "simplePaths" &#124; "walks" &#124; undefined</code> |
| `shouldExpandVertex` | <code>AsyncGraphWalkExpansionPredicate&lt;Data, Edge, ID&gt; &#124; null &#124; undefined</code> |
| `shouldFollowEdge` | <code>AsyncGraphWalkEdgePredicate&lt;Data, Edge, ID&gt; &#124; null &#124; undefined</code> |
| `source` | <code>AsyncGraphWalkSource&lt;Data, Edge, ID&gt;</code> |
| `strategy` | <code>GraphWalkStrategy &#124; undefined</code> |
| `visitorPhases` | <code>VisitorPhaseSelection&lt;GraphWalkPhase&gt; &#124; { include: undefined; exclude?: undefined; } &#124; { exclude: undefined; include?: undefined; } &#124; undefined</code> |
| `visitors` | <code>{ vertex?: VisitorPhaseInput&lt;AsyncGraphWalkVisitor&lt;Data, Edge, GraphWalkPhase.VERTEX, ID&gt;&gt; &#124; undefined; edge?: VisitorPhaseInput&lt;AsyncGraphWalkVisitor&lt;Data, Edge, GraphWalkPhase.EDGE, ID&gt;&gt; &#124; undefined; path?: VisitorPhaseInput&lt;AsyncGraphWalkVisitor&lt;Data, Edge, GraphWalkPhase.PATH, ID&gt;&gt; &#124; undefined; } &#124; undefined</code> |

</details>

<a id="symbol-AsyncGraphWalkOptionsPatch"></a>

### AsyncGraphWalkOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type AsyncGraphWalkOptionsPatch<Data, Edge, ID> = UndefinedPatch<AsyncGraphWalkFields<Data, Edge, ID>> & {
    revisit?: GraphWalkRevisitPolicy | undefined;
    replaceLimits?: GraphWalkLimits | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `emitEvents` | <code>readonly ("vertex" &#124; "edge" &#124; "path")[] &#124; undefined</code> |
| `replaceLimits` | <code>GraphWalkLimits &#124; undefined</code> |
| `revisit` | <code>GraphWalkRevisitPolicy &#124; undefined</code> |
| `shouldExpandVertex` | <code>AsyncGraphWalkExpansionPredicate&lt;Data, Edge, ID&gt; &#124; null &#124; undefined</code> |
| `shouldFollowEdge` | <code>AsyncGraphWalkEdgePredicate&lt;Data, Edge, ID&gt; &#124; null &#124; undefined</code> |
| `source` | <code>AsyncGraphWalkSource&lt;Data, Edge, ID&gt; &#124; undefined</code> |
| `strategy` | <code>GraphWalkStrategy &#124; undefined</code> |
| `visitorPhases` | <code>VisitorPhaseSelection&lt;GraphWalkPhase&gt; &#124; { include: undefined; exclude?: undefined; } &#124; { exclude: undefined; include?: undefined; } &#124; undefined</code> |
| `visitors` | <code>{ vertex?: VisitorPhaseInput&lt;AsyncGraphWalkVisitor&lt;Data, Edge, GraphWalkPhase.VERTEX, ID&gt;&gt; &#124; undefined; edge?: VisitorPhaseInput&lt;AsyncGraphWalkVisitor&lt;Data, Edge, GraphWalkPhase.EDGE, ID&gt;&gt; &#124; undefined; path?: VisitorPhaseInput&lt;AsyncGraphWalkVisitor&lt;Data, Edge, GraphWalkPhase.PATH, ID&gt;&gt; &#124; undefined; } &#124; undefined</code> |

</details>

<a id="symbol-AsyncGraphWalkRecordSelectors"></a>

### AsyncGraphWalkRecordSelectors

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export interface AsyncGraphWalkRecordSelectors<Data, Edge, ID> {
id(item: Data): MaybePromise<ID>;
outgoing(item: Data): MaybePromise<Iterable<GraphWalkCatalogLink<Edge, ID>> | AsyncIterable<GraphWalkCatalogLink<Edge, ID>>>;
roots: Iterable<ID> | AsyncIterable<ID>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `id` | <code>(item: Data) =&gt; MaybePromise&lt;ID&gt;</code> |
| `outgoing` | <code>(item: Data) =&gt; MaybePromise&lt;Iterable&lt;Readonly&lt;{ to: ID; data: Edge; }&gt;&gt; &#124; AsyncIterable&lt;Readonly&lt;{ to: ID; data: Edge; }&gt;&gt;&gt;</code> |
| `roots` | <code>Iterable&lt;ID&gt; &#124; AsyncIterable&lt;ID&gt;</code> |

</details>

<a id="symbol-AsyncGraphWalkRunner"></a>

### AsyncGraphWalkRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export interface AsyncGraphWalkRunner<Data, Edge, ID> extends AsyncTraversalExecution<GraphWalkPhase, GraphWalkEvent<Data, Edge, ID>, GraphWalkInspection, `${GraphWalkPhase}`> {
iterateEvents: {
        (): AsyncGenerator<GraphWalkEvent<Data, Edge, ID>, void, unknown>;
        <Phase extends `${GraphWalkPhase}`>(config: TraversalExecutionOptions<GraphWalkPhase, Phase> & {
            emitEvents: readonly Phase[];
        }): AsyncGenerator<GraphWalkEventFor<Data, Edge, Phase, ID>, void, unknown>;
        (config?: TraversalExecutionOptions<GraphWalkPhase>): AsyncGenerator<GraphWalkEvent<Data, Edge, ID>, void, unknown>;
    };
close(): Promise<void>;
summary(): GraphWalkSummary;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `close` | <code>() =&gt; Promise&lt;void&gt;</code> |
| `getStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `inspect` | <code>() =&gt; GraphWalkInspection</code> |
| `isHalted` | <code>() =&gt; boolean</code> |
| `iterateEvents` | <code>{ (): AsyncGenerator&lt;GraphWalkEvent&lt;Data, Edge, ID&gt;, void, unknown&gt;; &lt;Phase extends "vertex" &#124; "edge" &#124; "path"&gt;(config: TraversalExecutionOptions&lt;GraphWalkPhase, Phase&gt; &amp; { emitEvents: readonly Phase[]; }): AsyncGenerator&lt;GraphWalkEventFor&lt;Data, Edge, Phase, ID&gt;, void, unknown&gt;; (config?: TraversalExecutionOptions&lt;GraphWalkPhase, "vertex" &#124; "edge" &#124; "path"&gt; &#124; undefined): AsyncGenerator&lt;GraphWalkEvent&lt;Data, Edge, ID&gt;, void, unknown&gt;; }</code> |
| `requestPause` | <code>() =&gt; boolean</code> |
| `run` | <code>(config?: TraversalExecutionOptions&lt;GraphWalkPhase, "vertex" &#124; "edge" &#124; "path"&gt; &#124; undefined) =&gt; Promise&lt;AsyncGraphWalkRunner&lt;Data, Edge, ID&gt;&gt;</code> |
| `summary` | <code>() =&gt; Readonly&lt;{ status: TraversalRunnerStatus; counts: Readonly&lt;{ candidateReadAttempts: number; admittedTargets: number; uniqueFoundVertices: number; uniqueOmittedVertices: number; discoveredLinks: number; processedObservations: Readonly&lt;Record&lt;GraphWalkPhase, number&gt;&gt;; }&gt;; outcome: GraphWalkOutcome &#124; null; }&gt;</code> |

</details>

<a id="symbol-AsyncGraphWalkSource"></a>

### AsyncGraphWalkSource

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type AsyncGraphWalkSource<Data, Edge, ID> = ({
    hydration: 'resolver';
    resolveVertex(vertexId: ID): MaybePromise<GraphWalkVertexResult<Data>>;
} & AsyncSourceProtocol<Data, Edge, ID, ResolverTarget<Data, ID>>) | ({
    hydration: 'inlineOrCached';
    resolveVertex?: undefined;
} & AsyncSourceProtocol<Data, Edge, ID, InlineOrCachedTarget<Data, ID>>);
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `hydration` | <code>"resolver" &#124; "inlineOrCached"</code> |
| `outgoing` | <code>((vertex: Readonly&lt;{ vertexId: ID; data: Data; }&gt;) =&gt; AsyncIterableResult&lt;Readonly&lt;{ target: Readonly&lt;{ vertexId: ID; resolution?: GraphWalkVertexResult&lt;Data&gt; &#124; undefined; }&gt;; data: Edge; }&gt;&gt;) &#124; ((vertex: Readonly&lt;{ vertexId: ID; data: Data; }&gt;) =&gt; AsyncIterableResult&lt;Readonly&lt;{ target: InlineOrCachedTarget&lt;Data, ID&gt;; data: Edge; }&gt;&gt;)</code> |
| `resolveVertex` | <code>((vertexId: ID) =&gt; MaybePromise&lt;GraphWalkVertexResult&lt;Data&gt;&gt;) &#124; undefined</code> |
| `roots` | <code>(() =&gt; AsyncIterableResult&lt;Readonly&lt;{ vertexId: ID; resolution?: GraphWalkVertexResult&lt;Data&gt; &#124; undefined; }&gt;&gt;) &#124; (() =&gt; AsyncIterableResult&lt;InlineOrCachedTarget&lt;Data, ID&gt;&gt;)</code> |

</details>

<a id="symbol-AsyncGraphWalkVisitor"></a>

### AsyncGraphWalkVisitor

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type AsyncGraphWalkVisitor<Data, Edge, Phase extends GraphWalkPhase, ID> = (event: GraphWalkEventFor<Data, Edge, Phase, ID>, options: GraphWalkVisitorContext<Phase>) => MaybePromise<GraphWalkVisitorResult>;
```

<a id="symbol-AsyncTraversalExecution"></a>

### AsyncTraversalExecution

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface AsyncTraversalExecution<Phase extends string, Event, Inspection extends ExecutionInspection = ExecutionInspection, EmittedKind extends string = EmissionKind<Phase>> extends TraversalExecutionState<Inspection> {
iterateEvents: {
        (): AsyncGenerator<Event, void, unknown>;
        <Kind extends EmittedKind>(config: TraversalExecutionOptions<Phase, Kind> & {
            emitEvents: readonly Kind[];
        }): AsyncGenerator<SelectedTraversalEvent<Event, Kind>, void, unknown>;
        (config?: TraversalExecutionOptions<Phase, EmittedKind>): AsyncGenerator<Event, void, unknown>;
    };
run: (config?: TraversalExecutionOptions<Phase, EmittedKind>) => Promise<this>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `inspect` | <code>() =&gt; Inspection</code> |
| `isHalted` | <code>() =&gt; boolean</code> |
| `iterateEvents` | <code>{ (): AsyncGenerator&lt;Event, void, unknown&gt;; &lt;Kind extends EmittedKind&gt;(config: TraversalExecutionOptions&lt;Phase, Kind&gt; &amp; { emitEvents: readonly Kind[]; }): AsyncGenerator&lt;SelectedTraversalEvent&lt;Event, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionOptions&lt;Phase, EmittedKind&gt; &#124; undefined): AsyncGenerator&lt;Event, void, unknown&gt;; }</code> |
| `requestPause` | <code>() =&gt; boolean</code> |
| `run` | <code>(config?: TraversalExecutionOptions&lt;Phase, EmittedKind&gt; &#124; undefined) =&gt; Promise&lt;AsyncTraversalExecution&lt;Phase, Event, Inspection, EmittedKind&gt;&gt;</code> |

</details>

<a id="symbol-AsyncTreeSource"></a>

### AsyncTreeSource

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/async-adapter-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface AsyncTreeSource<T extends VertexTypes, R extends VertexTypes = T> {
resolveRoot: () => MaybePromise<TreeVertexResolution<T>>;
resolveChild: (hint: T['VertexHint'], options: TreeChildResolutionContext<T, R>) => MaybePromise<TreeVertexResolution<T>>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `resolveChild` | <code>(hint: T["VertexHint"], options: TreeChildResolutionContext&lt;T, R&gt;) =&gt; MaybePromise&lt;TreeVertexResolution&lt;T&gt;&gt;</code> |
| `resolveRoot` | <code>() =&gt; MaybePromise&lt;TreeVertexResolution&lt;T&gt;&gt;</code> |

</details>

<a id="symbol-AsyncTreeVisitor"></a>

### AsyncTreeVisitor

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type AsyncTreeVisitor<Phase extends string = string, T extends VertexTypes = VertexTypes, R extends VertexTypes = T> = TraversalVisitorResult<R, Phase, 'tree', T['VertexHint']> extends infer RESULT ? (vertex: VertexView<T | R>, options: TreeVisitorContext<Phase, T, R>) => MaybePromise<RESULT | undefined | void> : never;
```

<a id="symbol-BreadthFirstPhase"></a>

### BreadthFirstPhase

Runtime value and public type surface. [Owning contract](reference.md#breadth-first-traversal) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/breadth-first-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export declare enum BreadthFirstPhase {
LEVEL_ORDER = "LEVEL_ORDER"
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `LEVEL_ORDER` | <code>BreadthFirstPhase.LEVEL_ORDER</code> |

</details>

<a id="symbol-BreadthFirstTreeOptions"></a>

### BreadthFirstTreeOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export type BreadthFirstTreeOptions<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP> = BreadthFirstTreeOptionsPatch<TTP, RW_TTP> & {
    traversableTree: TreeSource<TTP, RW_TTP>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `retainOriginalTreeStructure` | <code>boolean &#124; undefined</code> |
| `transformChildHints` | <code>ChildHintTransformer&lt;TTP&gt; &#124; null &#124; undefined</code> |
| `traversableTree` | <code>TreeSource&lt;TTP, RW_TTP&gt;</code> |
| `visitors` | <code>VisitorInputs&lt;BreadthFirstTraversalVisitors&lt;TTP, RW_TTP&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-BreadthFirstTreeOptionsPatch"></a>

### BreadthFirstTreeOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export type BreadthFirstTreeOptionsPatch<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP> = {
    traversableTree?: TreeSource<TTP, RW_TTP> | undefined;
    transformChildHints?: ChildHintTransformer<TTP> | null | undefined;
    visitors?: VisitorInputs<BreadthFirstTraversalVisitors<TTP, RW_TTP>> | undefined;
    retainOriginalTreeStructure?: boolean | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `retainOriginalTreeStructure` | <code>boolean &#124; undefined</code> |
| `transformChildHints` | <code>ChildHintTransformer&lt;TTP&gt; &#124; null &#124; undefined</code> |
| `traversableTree` | <code>TreeSource&lt;TTP, RW_TTP&gt; &#124; undefined</code> |
| `visitors` | <code>VisitorInputs&lt;BreadthFirstTraversalVisitors&lt;TTP, RW_TTP&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-BreadthFirstTreeRunner"></a>

### BreadthFirstTreeRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#breadth-first-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/breadth-first-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export interface BreadthFirstTreeRunner<TTP extends VertexTypes, RW_TTP extends VertexTypes = TTP> extends SyncTraversalExecution<BreadthFirstPhase, TreeTraversalEvent<BreadthFirstPhase, TTP, RW_TTP>, TreeDagExecutionInspection<BreadthFirstPhase>> {
getResolvedTreeView(): ResolvedTreeView<TTP | RW_TTP>;
getResolvedGraphView(): ResolvedGraphView<TTP | RW_TTP>;
isTreeRootVertex(ref: VertexHandle<TTP | RW_TTP>): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getResolvedGraphView` | <code>() =&gt; ResolvedGraphView&lt;TTP &#124; RW_TTP, unknown&gt;</code> |
| `getResolvedTreeView` | <code>() =&gt; ResolvedTreeView&lt;TTP &#124; RW_TTP&gt;</code> |
| `getStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `inspect` | <code>() =&gt; TreeDagExecutionInspection&lt;BreadthFirstPhase&gt;</code> |
| `isHalted` | <code>() =&gt; boolean</code> |
| `isTreeRootVertex` | <code>(ref: VertexHandle&lt;TTP &#124; RW_TTP&gt;) =&gt; boolean</code> |
| `iterateEvents` | <code>{ (): Generator&lt;TreeTraversalEvent&lt;BreadthFirstPhase, TTP, RW_TTP&gt;, void, unknown&gt;; &lt;Kind extends BreadthFirstPhase&gt;(config: TraversalExecutionOptions&lt;BreadthFirstPhase, Kind&gt; &amp; { emitEvents: readonly Kind[]; }): Generator&lt;SelectedTraversalEvent&lt;TreeTraversalEvent&lt;BreadthFirstPhase, TTP, RW_TTP&gt;, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionOptions&lt;BreadthFirstPhase, BreadthFirstPhase&gt; &#124; undefined): Generator&lt;TreeTraversalEvent&lt;BreadthFirstPhase, TTP, RW_TTP&gt;, void, unknown&gt;; }</code> |
| `requestPause` | <code>() =&gt; boolean</code> |
| `run` | <code>(config?: TraversalExecutionOptions&lt;BreadthFirstPhase, BreadthFirstPhase&gt; &#124; undefined) =&gt; BreadthFirstTreeRunner&lt;TTP, RW_TTP&gt;</code> |

</details>

<a id="symbol-BreadthFirstTreeTraversal"></a>

### BreadthFirstTreeTraversal

Runtime value and public type surface. [Owning contract](reference.md#breadth-first-traversal) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/breadth-first-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export declare class BreadthFirstTreeTraversal<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP> {
constructor(icfgInput: BreadthFirstTreeOptions<TTP, RW_TTP>);
configure(icfgInput: BreadthFirstTreeOptionsPatch<TTP, RW_TTP>): this;
addVisitorFor<Phase extends BreadthFirstPhase>(phase: Phase, visitor: TreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>, options?: Partial<TraversalVisitorFunctionOptions>): this;
addVisitorGroupFor<Phase extends BreadthFirstPhase>(phase: Phase, group: VisitorGroupDefinition<TreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>>): this;
listVisitorsFor<Phase extends BreadthFirstPhase>(phase: Phase): BreadthFirstTraversalVisitors<TTP, RW_TTP>[Phase];
setVisitorsFor<Phase extends BreadthFirstPhase>(phase: Phase, input: VisitorPhaseInput<TreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>>): this;
createRunner(): BreadthFirstTreeRunner<TTP, RW_TTP>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `addVisitorFor` | <code>&lt;Phase extends BreadthFirstPhase&gt;(phase: Phase, visitor: TreeVisitor&lt;NoInferPhase&lt;Phase&gt;, TTP, RW_TTP&gt;, options?: Partial&lt;TraversalVisitorFunctionOptions&gt; &#124; undefined) =&gt; BreadthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |
| `addVisitorGroupFor` | <code>&lt;Phase extends BreadthFirstPhase&gt;(phase: Phase, group: VisitorGroupDefinition&lt;TreeVisitor&lt;NoInferPhase&lt;Phase&gt;, TTP, RW_TTP&gt;&gt;) =&gt; BreadthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |
| `configure` | <code>(icfgInput: BreadthFirstTreeOptionsPatch&lt;TTP, RW_TTP&gt;) =&gt; BreadthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |
| `createRunner` | <code>() =&gt; BreadthFirstTreeRunner&lt;TTP, RW_TTP&gt;</code> |
| `listVisitorsFor` | <code>&lt;Phase extends BreadthFirstPhase&gt;(phase: Phase) =&gt; BreadthFirstTraversalVisitors&lt;TTP, RW_TTP&gt;[Phase]</code> |
| `setVisitorsFor` | <code>&lt;Phase extends BreadthFirstPhase&gt;(phase: Phase, input: VisitorPhaseInput&lt;TreeVisitor&lt;NoInferPhase&lt;Phase&gt;, TTP, RW_TTP&gt;&gt;) =&gt; BreadthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |

</details>

<a id="symbol-ChildHintTransformer"></a>

### ChildHintTransformer

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](reference.md#hint-transformation-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type ChildHintTransformer<T extends VertexTypes> = (hints: T['VertexHint'][]) => T['VertexHint'][];
```

<a id="symbol-ChildIndexSelection"></a>

### ChildIndexSelection

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export type ChildIndexSelection = {
    readonly indices: readonly number[];
    readonly ranges?: never;
} | {
    readonly ranges: readonly {
        readonly from: number;
        readonly through: number;
    }[];
    readonly indices?: never;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `indices` | <code>readonly number[] &#124; undefined</code> |
| `ranges` | <code>readonly { readonly from: number; readonly through: number; }[] &#124; undefined</code> |

</details>

<a id="symbol-ChildSlot"></a>

### ChildSlot

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type ChildSlot<T extends VertexTypes, ID = unknown> = Readonly<{
    kind: 'pending';
    hint: T['VertexHint'];
}> | Readonly<{
    kind: 'linked';
    hint: T['VertexHint'];
    childRef: VertexHandle<T>;
}> | Readonly<{
    kind: 'omitted';
    hint: T['VertexHint'];
    identity: Readonly<{
        vertexId: ID;
    }> | null;
}> | Readonly<{
    kind: 'deleted' | 'disabled';
    hint: T['VertexHint'];
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `hint` | <code>T["VertexHint"]</code> |
| `kind` | <code>"omitted" &#124; "pending" &#124; "deleted" &#124; "linked" &#124; "disabled"</code> |

</details>

<a id="symbol-CommandCommitMode"></a>

### CommandCommitMode

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type CommandCommitMode = 'afterEachVisitor' | 'afterGroup';
```

<a id="symbol-DagBlocker"></a>

### DagBlocker

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagBlocker<ID = unknown> = (DagWaitEdge<ID> & {
    kind: 'constraint';
    waiterStatus: DagMilestoneStatus;
    prerequisiteStatus: DagMilestoneStatus;
}) | {
    kind: 'unfinishedWork';
    target: WorkTarget<ID>;
    work: Exclude<DagWorkState, 'completed'>;
} | {
    kind: 'discoveryOpen' | 'completionPending';
    target: CompletionTarget<ID>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"constraint" &#124; "unfinishedWork" &#124; "discoveryOpen" &#124; "completionPending"</code> |

</details>

<a id="symbol-DagChildResolutionContext"></a>

### DagChildResolutionContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Related example](reference.md#source-callback-contexts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type DagChildResolutionContext<T extends VertexTypes, R extends VertexTypes = T, ID = unknown> = {
    resolutionContext: VertexResolutionContext<T | R> | Readonly<Omit<VertexResolutionContext<T | R>, 'parentVertex' | 'parentVertexRef'> & {
        /** Synthetic entry-slot parent is private; both parent fields are null. */
        parentVertex: null;
        parentVertexRef: null;
    }>;
    resolvedGraphView: ResolvedGraphView<T | R, ID>;
    originalGraphView: OriginalGraphView<T, ID> | null;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `originalGraphView` | <code>OriginalGraphView&lt;T, ID&gt; &#124; null</code> |
| `resolutionContext` | <code>Readonly&lt;{ depth: number; parentVertex: VertexView&lt;T &#124; R&gt;; parentVertexRef: VertexHandle&lt;T &#124; R&gt;; hintIndex: number; vertexHint: (T &#124; R)["VertexHint"]; }&gt; &#124; Readonly&lt;Omit&lt;Readonly&lt;{ depth: number; parentVertex: VertexView&lt;T &#124; R&gt;; parentVertexRef: VertexHandle&lt;T &#124; R&gt;; hintIndex: number; vertexHint: (T &#124; R)["VertexHint"]; }&gt;, "parentVertex" &#124; "parentVertexRef"&gt; &amp; { parentVertex: null; parentVertexRef: null; }&gt;</code> |
| `resolvedGraphView` | <code>ResolvedGraphView&lt;T &#124; R, ID&gt;</code> |

</details>

<a id="symbol-DagCompositionOptions"></a>

### DagCompositionOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-fragments-and-composition) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagCompositionOptions<ID = unknown> = {
    readonly dependencies?: readonly {
        readonly dependent: ID;
        readonly prerequisite: DagMilestone<ID>;
    }[];
    readonly children?: readonly {
        readonly parent: ID;
        readonly child: ID;
    }[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `children` | <code>readonly { readonly parent: ID; readonly child: ID; }[] &#124; undefined</code> |
| `dependencies` | <code>readonly { readonly dependent: ID; readonly prerequisite: DagMilestone&lt;ID&gt;; }[] &#124; undefined</code> |

</details>

<a id="symbol-DagDeferredWork"></a>

### DagDeferredWork

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-summary-schema) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-orchestration-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagDeferredWork<ID = unknown> = Readonly<{
    vertexId: ID;
    generation: DagSettlementGeneration;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `generation` | <code>symbol</code> |
| `vertexId` | <code>ID</code> |

</details>

<a id="symbol-DagDefinition"></a>

### DagDefinition

Type-only; no runtime constructor/value. [Owning contract](reference.md#materialized-dag-definitions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagDefinition<Data, ID = unknown> = {
    readonly vertices: readonly DagDefinitionVertex<Data, ID>[];
    readonly omittedIds: readonly ID[];
    readonly entry: {
        readonly kind: 'root';
        readonly vertexId: ID;
    } | {
        readonly kind: 'roots';
        readonly slots: readonly DagDefinitionSlot<ID>[];
    } | {
        readonly kind: 'empty';
    };
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `entry` | <code>{ readonly kind: "root"; readonly vertexId: ID; } &#124; { readonly kind: "roots"; readonly slots: readonly DagDefinitionSlot&lt;ID&gt;[]; } &#124; { readonly kind: "empty"; }</code> |
| `omittedIds` | <code>readonly ID[]</code> |
| `vertices` | <code>readonly DagDefinitionVertex&lt;Data, ID&gt;[]</code> |

</details>

<a id="symbol-DagDefinitionChangeAspect"></a>

### DagDefinitionChangeAspect

Type-only; no runtime constructor/value. [Owning contract](reference.md#validated-dag-revisions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagDefinitionChangeAspect = 'data' | 'slots' | 'workDependencies' | 'subgraphCompletionDependencies';
```

<a id="symbol-DagDefinitionDiff"></a>

### DagDefinitionDiff

Type-only; no runtime constructor/value. [Owning contract](reference.md#validated-dag-revisions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagDefinitionDiff<ID = unknown> = {
    readonly addedIds: readonly ID[];
    readonly removedIds: readonly ID[];
    readonly changedVertices: readonly DagDefinitionVertexChange<ID>[];
    /** True whenever the ordered live ID sequence differs, including add/remove. */
    readonly vertexOrderChanged: boolean;
    readonly entryChanged: boolean;
    readonly omissionsChanged: boolean;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `addedIds` | <code>readonly ID[]</code> |
| `changedVertices` | <code>readonly DagDefinitionVertexChange&lt;ID&gt;[]</code> |
| `entryChanged` | <code>boolean</code> |
| `omissionsChanged` | <code>boolean</code> |
| `removedIds` | <code>readonly ID[]</code> |
| `vertexOrderChanged` | <code>boolean</code> |

</details>

<a id="symbol-DagDefinitionIssue"></a>

### DagDefinitionIssue

Type-only; no runtime constructor/value. [Owning contract](reference.md#materialized-dag-definitions) · [Executable snippet](reference.md#narrow-invalid-issues)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagDefinitionIssue<ID = unknown> = {
    kind: 'missingStructuralEndpoint';
    parent: {
        vertexId: ID;
    } | null;
    vertexId: ID;
} | {
    kind: 'invalidEntry';
    reason: 'unknownRoot' | 'anonymousCatalogEntry' | 'emptyWithVertices';
    vertexIds: readonly ID[];
} | {
    kind: 'invalidOmission';
    vertexIds: readonly ID[];
} | {
    kind: 'unreachable';
    vertexIds: readonly ID[];
} | {
    kind: 'structuralCycle';
    componentVertexIds: readonly ID[];
} | {
    kind: 'discoveryCycle';
    cycleWitnessVertexIds: readonly ID[];
} | {
    kind: 'milestone';
    diagnostics: DagTraversalStallDiagnostics<ID>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"missingStructuralEndpoint" &#124; "invalidEntry" &#124; "invalidOmission" &#124; "unreachable" &#124; "structuralCycle" &#124; "discoveryCycle" &#124; "milestone"</code> |

</details>

<a id="symbol-DagDefinitionSlot"></a>

### DagDefinitionSlot

Type-only; no runtime constructor/value. [Owning contract](reference.md#materialized-dag-definitions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagDefinitionSlot<ID> = {
    readonly kind: 'vertex';
    readonly vertexId: ID;
} | {
    readonly kind: 'omitted';
    readonly identity: {
        readonly vertexId: ID;
    } | null;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"vertex" &#124; "omitted"</code> |

</details>

<a id="symbol-DagDefinitionVertex"></a>

### DagDefinitionVertex

Type-only; no runtime constructor/value. [Owning contract](reference.md#materialized-dag-definitions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagDefinitionVertex<Data, ID> = {
    readonly vertexId: ID;
    readonly data: Data;
    readonly slots: readonly DagDefinitionSlot<ID>[];
    readonly dependsOnWork: readonly ID[];
    readonly dependsOnSubgraphCompletion: readonly ID[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `data` | <code>Data</code> |
| `dependsOnSubgraphCompletion` | <code>readonly ID[]</code> |
| `dependsOnWork` | <code>readonly ID[]</code> |
| `slots` | <code>readonly DagDefinitionSlot&lt;ID&gt;[]</code> |
| `vertexId` | <code>ID</code> |

</details>

<a id="symbol-DagDefinitionVertexChange"></a>

### DagDefinitionVertexChange

Type-only; no runtime constructor/value. [Owning contract](reference.md#validated-dag-revisions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagDefinitionVertexChange<ID = unknown> = {
    readonly vertexId: ID;
    readonly aspects: readonly DagDefinitionChangeAspect[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `aspects` | <code>readonly DagDefinitionChangeAspect[]</code> |
| `vertexId` | <code>ID</code> |

</details>

<a id="symbol-DagDiscoveryCycleError"></a>

### DagDiscoveryCycleError

Runtime value and public type surface. [Owning contract](reference.md#validation-results-and-failures) · [Related example](reference.md#narrow-invalid-issues)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare class DagDiscoveryCycleError<ID = unknown> extends Error {
readonly cycleWitnessVertexIds: readonly ID[];
constructor(cycleWitnessVertexIds: readonly ID[]);
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `cycleWitnessVertexIds` | <code>readonly ID[]</code> |

</details>

<a id="symbol-DagDiscoverySource"></a>

### DagDiscoverySource

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Executable snippet](reference.md#dag-traversal)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface DagDiscoverySource<T extends VertexTypes, R extends VertexTypes = T, ID = unknown> {
resolvePrerequisite?: (id: ID) => DagPrerequisiteResolution<T, ID>;
resolveRoot: () => DagVertexResolution<T, ID>;
resolveChild: (hint: T['VertexHint'], options: DagChildResolutionContext<T, R, ID>) => DagVertexResolution<T, ID>;
getVertexIdFromHint?: (hint: T['VertexHint']) => HintVertexId<ID> | undefined;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getVertexIdFromHint` | <code>((hint: T["VertexHint"]) =&gt; HintVertexId&lt;ID&gt; &#124; undefined) &#124; undefined</code> |
| `resolveChild` | <code>(hint: T["VertexHint"], options: DagChildResolutionContext&lt;T, R, ID&gt;) =&gt; DagVertexResolution&lt;T, ID&gt;</code> |
| `resolvePrerequisite` | <code>((id: ID) =&gt; DagPrerequisiteResolution&lt;T, ID&gt;) &#124; undefined</code> |
| `resolveRoot` | <code>() =&gt; DagVertexResolution&lt;T, ID&gt;</code> |

</details>

<a id="symbol-DagEvent"></a>

### DagEvent

Type-only; no runtime constructor/value. [Owning contract](reference.md#deferred-dag-progress-and-reconciliation) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/event-delivery-selection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagEvent<T extends VertexTypes, ID = unknown> = {
    vertexId: ID;
    vertex: VertexView<T>;
    vertexRef: VertexHandle<T>;
    isGraphRoot: boolean;
} & ({
    kind: 'workCompleted';
} | {
    kind: 'subgraphCompleted';
});
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `isGraphRoot` | <code>boolean</code> |
| `kind` | <code>"workCompleted" &#124; "subgraphCompleted"</code> |
| `vertex` | <code>VertexView&lt;T&gt;</code> |
| `vertexId` | <code>ID</code> |
| `vertexRef` | <code>VertexHandle&lt;T&gt;</code> |

</details>

<a id="symbol-DagExplanation"></a>

### DagExplanation

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagExplanation<ID = unknown> = Readonly<{
    kind: 'unresolved' | 'deleted';
    target: DagMilestone<ID>;
    discoveryComplete: boolean;
}> | Readonly<{
    kind: 'live';
    target: DagMilestone<ID>;
    satisfied: boolean;
    progress: DagVertexProgress<ID>;
    blockers: readonly DagBlocker<ID>[];
    discoveryComplete: boolean;
}> | Readonly<{
    kind: 'omitted';
    target: DagMilestone<ID>;
    satisfied: true;
    progress: null;
    blockers: readonly DagBlocker<ID>[];
    discoveryComplete: boolean;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `discoveryComplete` | <code>boolean</code> |
| `kind` | <code>"omitted" &#124; "live" &#124; "deleted" &#124; "unresolved"</code> |
| `target` | <code>DagMilestone&lt;ID&gt;</code> |

</details>

<a id="symbol-DagFragment"></a>

### DagFragment

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-fragments-and-composition) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagFragment<Data, ID = unknown, Port extends string = string> = Readonly<{
    definition: DagDefinition<Data, ID>;
    ports: Readonly<Record<Port, ID>>;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `definition` | <code>DagDefinition&lt;Data, ID&gt;</code> |
| `ports` | <code>Readonly&lt;Record&lt;Port, ID&gt;&gt;</code> |

</details>

<a id="symbol-DagFragmentValidationError"></a>

### DagFragmentValidationError

Runtime value and public type surface. [Owning contract](reference.md#dag-fragments-and-composition) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare class DagFragmentValidationError<ID = unknown> extends TypeError {
readonly issues: readonly DagDefinitionIssue<ID>[];
constructor(issues: readonly DagDefinitionIssue<ID>[]);
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `issues` | <code>readonly DagDefinitionIssue&lt;ID&gt;[]</code> |

</details>

<a id="symbol-DagMilestone"></a>

### DagMilestone

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagMilestone<ID = unknown> = {
    vertexId: ID;
    milestone: 'work' | 'subgraphCompletion';
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `milestone` | <code>"work" &#124; "subgraphCompletion"</code> |
| `vertexId` | <code>ID</code> |

</details>

<a id="symbol-DagMilestoneQueryOptions"></a>

### DagMilestoneQueryOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagMilestoneQueryOptions = {
    readonly transitive?: boolean;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `transitive` | <code>boolean &#124; undefined</code> |

</details>

<a id="symbol-DagMilestoneQueryResult"></a>

### DagMilestoneQueryResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagMilestoneQueryResult<ID = unknown> = Readonly<{
    milestones: readonly DagMilestone<ID>[];
    edges: readonly DagWaitEdge<ID>[];
    discoveryComplete: boolean;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `discoveryComplete` | <code>boolean</code> |
| `edges` | <code>readonly DagWaitEdge&lt;ID&gt;[]</code> |
| `milestones` | <code>readonly DagMilestone&lt;ID&gt;[]</code> |

</details>

<a id="symbol-DagMilestoneSnapshot"></a>

### DagMilestoneSnapshot

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export interface DagMilestoneSnapshot<ID = unknown> {
explain(target: DagMilestone<ID>): DagExplanation<ID>;
prerequisitesOf(target: DagMilestone<ID>, options?: DagMilestoneQueryOptions): DagMilestoneQueryResult<ID>;
dependentsOf(target: DagMilestone<ID>, options?: DagMilestoneQueryOptions): DagMilestoneQueryResult<ID>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `dependentsOf` | <code>(target: DagMilestone&lt;ID&gt;, options?: DagMilestoneQueryOptions &#124; undefined) =&gt; Readonly&lt;{ milestones: readonly DagMilestone&lt;ID&gt;[]; edges: readonly DagWaitEdge&lt;ID&gt;[]; discoveryComplete: boolean; }&gt;</code> |
| `explain` | <code>(target: DagMilestone&lt;ID&gt;) =&gt; DagExplanation&lt;ID&gt;</code> |
| `prerequisitesOf` | <code>(target: DagMilestone&lt;ID&gt;, options?: DagMilestoneQueryOptions &#124; undefined) =&gt; Readonly&lt;{ milestones: readonly DagMilestone&lt;ID&gt;[]; edges: readonly DagWaitEdge&lt;ID&gt;[]; discoveryComplete: boolean; }&gt;</code> |

</details>

<a id="symbol-DagMilestoneStatus"></a>

### DagMilestoneStatus

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagMilestoneStatus = {
    kind: 'live';
    work: DagWorkState;
    satisfied: boolean;
} | {
    kind: 'omitted' | 'deleted' | 'unresolved';
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"omitted" &#124; "live" &#124; "deleted" &#124; "unresolved"</code> |

</details>

<a id="symbol-DagOptions"></a>

### DagOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagOptions<T extends VertexTypes = VertexTypes, R extends VertexTypes = T, ID = unknown> = DagSource<T, R, ID> & DagTraversalOptionsInput<T, R, ID> & ({
    traversableGraph: DagDiscoverySource<T, R, ID>;
} | {
    rootWorkDependencies?: never;
    dependsOnWorkDefault?: never;
});
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `completedWork` | <code>ReadonlySet&lt;ID&gt; &#124; undefined</code> |
| `dependsOnWorkDefault` | <code>"none" &#124; "discoveryParentWork" &#124; undefined</code> |
| `discovery` | <code>"lazy" &#124; "eager" &#124; undefined</code> |
| `retainOriginalGraphStructure` | <code>boolean &#124; undefined</code> |
| `rootWorkDependencies` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `syntheticRoot` | <code>boolean &#124; undefined</code> |
| `transformChildHints` | <code>ChildHintTransformer&lt;T&gt; &#124; null &#124; undefined</code> |
| `traversableGraph` | <code>DagDiscoverySource&lt;T, R, ID&gt; &#124; undefined</code> |
| `traversableTree` | <code>(unknown extends ID ? TreeSource&lt;T, R&gt; : never) &#124; undefined</code> |
| `visitors` | <code>VisitorInputs&lt;DagTraversalVisitors&lt;T, R, ID&gt;&gt; &#124; undefined</code> |
| `workCompletion` | <code>"afterWorkReadyChain" &#124; "externalSettlement" &#124; undefined</code> |

</details>

<a id="symbol-DagOptionsPatch"></a>

### DagOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagOptionsPatch<T extends VertexTypes = VertexTypes, R extends VertexTypes = T, ID = unknown> = DagTraversalOptionsInput<T, R, ID> & ({
    traversableGraph?: DagDiscoverySource<T, R, ID> | undefined;
    traversableTree?: undefined;
} | {
    rootWorkDependencies?: never;
    dependsOnWorkDefault?: never;
    traversableTree?: (unknown extends ID ? TreeSource<T, R> : never) | undefined;
    traversableGraph?: undefined;
});
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `completedWork` | <code>ReadonlySet&lt;ID&gt; &#124; undefined</code> |
| `dependsOnWorkDefault` | <code>"none" &#124; "discoveryParentWork" &#124; undefined</code> |
| `discovery` | <code>"lazy" &#124; "eager" &#124; undefined</code> |
| `retainOriginalGraphStructure` | <code>boolean &#124; undefined</code> |
| `rootWorkDependencies` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `syntheticRoot` | <code>boolean &#124; undefined</code> |
| `transformChildHints` | <code>ChildHintTransformer&lt;T&gt; &#124; null &#124; undefined</code> |
| `traversableGraph` | <code>DagDiscoverySource&lt;T, R, ID&gt; &#124; undefined</code> |
| `traversableTree` | <code>(unknown extends ID ? TreeSource&lt;T, R&gt; : never) &#124; undefined</code> |
| `visitors` | <code>VisitorInputs&lt;DagTraversalVisitors&lt;T, R, ID&gt;&gt; &#124; undefined</code> |
| `workCompletion` | <code>"afterWorkReadyChain" &#124; "externalSettlement" &#124; undefined</code> |

</details>

<a id="symbol-DagPrerequisiteResolution"></a>

### DagPrerequisiteResolution

Type-only; no runtime constructor/value. [Owning contract](reference.md#discovery-and-completed-work) · [Executable snippet](reference.md#graph-source-result-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type DagPrerequisiteResolution<T extends VertexTypes, ID = unknown> = DagVertexResolution<T, ID> | PrerequisiteMissing;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"found" &#124; "omitted" &#124; "missing"</code> |

</details>

<a id="symbol-DagRecordSelectors"></a>

### DagRecordSelectors

Type-only; no runtime constructor/value. [Owning contract](reference.md#collection-and-forest-sources) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/quickstart-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/sources`.

```ts
export type DagRecordSelectors<Item, ID> = {
    id(item: Item): ID;
    children?(item: Item): Iterable<ID>;
    dependsOnWork?(item: Item): Iterable<ID>;
    dependsOnSubgraphCompletion?(item: Item): Iterable<ID>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `children` | <code>((item: Item) =&gt; Iterable&lt;ID&gt;) &#124; undefined</code> |
| `dependsOnSubgraphCompletion` | <code>((item: Item) =&gt; Iterable&lt;ID&gt;) &#124; undefined</code> |
| `dependsOnWork` | <code>((item: Item) =&gt; Iterable&lt;ID&gt;) &#124; undefined</code> |
| `id` | <code>(item: Item) =&gt; ID</code> |

</details>

<a id="symbol-DagRevisionOperation"></a>

### DagRevisionOperation

Type-only; no runtime constructor/value. [Owning contract](reference.md#validated-dag-revisions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagRevisionOperation<Data, ID = unknown> = {
    readonly kind: 'addVertex';
    readonly vertex: DagDefinitionVertex<Data, ID>;
} | {
    readonly kind: 'replaceVertex';
    readonly vertex: DagDefinitionVertex<Data, ID>;
} | {
    readonly kind: 'removeVertexDeclaration';
    readonly vertexId: ID;
} | {
    readonly kind: 'replaceEntry';
    readonly entry: DagDefinition<Data, ID>['entry'];
} | {
    readonly kind: 'replaceOmissions';
    readonly omittedIds: readonly ID[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"addVertex" &#124; "replaceVertex" &#124; "removeVertexDeclaration" &#124; "replaceEntry" &#124; "replaceOmissions"</code> |

</details>

<a id="symbol-DagRevisionResult"></a>

### DagRevisionResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#validated-dag-revisions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagRevisionResult<Data, ID = unknown> = {
    kind: 'valid';
    dag: PreparedDag<Data, ID>;
    changes: DagDefinitionDiff<ID>;
} | {
    kind: 'invalid';
    issues: readonly DagDefinitionIssue<ID>[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"valid" &#124; "invalid"</code> |

</details>

<a id="symbol-DagRootSelectors"></a>

### DagRootSelectors

Type-only; no runtime constructor/value. [Owning contract](reference.md#collection-and-forest-sources) · [Related example](reference.md#roots-materialization-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/sources`.

```ts
export type DagRootSelectors<Item, ID> = Omit<DagRecordSelectors<Item, ID>, 'children'> & {
    children?(item: Item): Iterable<Item>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `children` | <code>((item: Item) =&gt; Iterable&lt;Item&gt;) &#124; undefined</code> |
| `dependsOnSubgraphCompletion` | <code>((item: Item) =&gt; Iterable&lt;ID&gt;) &#124; undefined</code> |
| `dependsOnWork` | <code>((item: Item) =&gt; Iterable&lt;ID&gt;) &#124; undefined</code> |
| `id` | <code>(item: Item) =&gt; ID</code> |

</details>

<a id="symbol-DagSchedulingOptions"></a>

### DagSchedulingOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagSchedulingOptions = {
    workCompletion?: 'afterWorkReadyChain' | 'externalSettlement' | undefined;
    discovery?: 'lazy' | 'eager' | undefined;
    rootWorkDependencies?: 'honor' | 'ignore' | undefined;
    dependsOnWorkDefault?: 'none' | 'discoveryParentWork' | undefined;
    syntheticRoot?: boolean | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `dependsOnWorkDefault` | <code>"none" &#124; "discoveryParentWork" &#124; undefined</code> |
| `discovery` | <code>"lazy" &#124; "eager" &#124; undefined</code> |
| `rootWorkDependencies` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `syntheticRoot` | <code>boolean &#124; undefined</code> |
| `workCompletion` | <code>"afterWorkReadyChain" &#124; "externalSettlement" &#124; undefined</code> |

</details>

<a id="symbol-DagSettlementGeneration"></a>

### DagSettlementGeneration

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-summary-schema) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-orchestration-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagSettlementGeneration = symbol;
```

<a id="symbol-DagSettlementOutcome"></a>

### DagSettlementOutcome

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-summary-schema) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-orchestration-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagSettlementOutcome = {
    kind: 'workCompleted';
    ok?: never;
    error?: never;
} | {
    kind: 'traversalFailed';
    error: unknown;
    ok?: never;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `error` | <code>unknown</code> |
| `kind` | <code>"workCompleted" &#124; "traversalFailed"</code> |
| `ok` | <code>undefined</code> |

</details>

<a id="symbol-DagSettlementReceipt"></a>

### DagSettlementReceipt

Type-only; no runtime constructor/value. [Owning contract](reference.md#ticket-coordination) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagSettlementReceipt = Readonly<{
    kind: 'accepted';
}> | Readonly<{
    kind: 'alreadyAccepted';
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"accepted" &#124; "alreadyAccepted"</code> |

</details>

<a id="symbol-DagSummary"></a>

### DagSummary

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-summary-schema) · [Executable snippet](reference.md#dag-summary-schema)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagSummary<ID = unknown> = Readonly<{
    discovery: Readonly<{
        mode: 'lazy' | 'eager';
        complete: boolean;
    }>;
    counts: Readonly<{
        discovered: number;
        pending: number;
        readyOrDeferred: number;
        deferredWork: number;
        activeVisitorVertices: number;
        workCompleted: number;
        subgraphCompleted: number;
    }>;
    vertices: ReadonlyMap<ID, DagVertexProgress<ID>>;
    readyOrDeferredIds: readonly ID[];
    deferredWorkIds: readonly ID[];
    awaitingSettlement: readonly DagDeferredWork<ID>[];
    activeVisitorVertexIds: readonly ID[];
    completedWorkIds: readonly ID[];
    completedSubgraphIds: readonly ID[];
    unusedCompletedWorkIds: readonly ID[];
    diagnostics: DagTraversalStallDiagnostics<ID> | null;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `activeVisitorVertexIds` | <code>readonly ID[]</code> |
| `awaitingSettlement` | <code>readonly Readonly&lt;{ vertexId: ID; generation: symbol; }&gt;[]</code> |
| `completedSubgraphIds` | <code>readonly ID[]</code> |
| `completedWorkIds` | <code>readonly ID[]</code> |
| `counts` | <code>Readonly&lt;{ discovered: number; pending: number; readyOrDeferred: number; deferredWork: number; activeVisitorVertices: number; workCompleted: number; subgraphCompleted: number; }&gt;</code> |
| `deferredWorkIds` | <code>readonly ID[]</code> |
| `diagnostics` | <code>DagTraversalStallDiagnostics&lt;ID&gt; &#124; null</code> |
| `discovery` | <code>Readonly&lt;{ mode: "lazy" &#124; "eager"; complete: boolean; }&gt;</code> |
| `readyOrDeferredIds` | <code>readonly ID[]</code> |
| `unusedCompletedWorkIds` | <code>readonly ID[]</code> |
| `vertices` | <code>ReadonlyMap&lt;ID, Readonly&lt;{ vertexId: ID; work: DagWorkState; subgraphComplete: boolean; unmetPrerequisiteIds: readonly ID[]; unmetWorkPrerequisiteIds: readonly ID[]; unmetSubgraphPrerequisiteIds: readonly ID[]; generation?: symbol &#124; undefined; }&gt;&gt;</code> |

</details>

<a id="symbol-DagTraversal"></a>

### DagTraversal

Runtime value and public type surface. [Owning contract](reference.md#dag-traversal) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-workflow-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare class DagTraversal<T extends VertexTypes = VertexTypes, R extends VertexTypes = T, ID = unknown> {
constructor(input: DagOptions<T, R, ID>);
configure(input: DagOptionsPatch<T, R, ID>): this;
addVisitorFor<ORDER extends DagVisitorPhase>(order: ORDER, visitor: DagVisitor<T, R, NoInferPhase<ORDER>, ID>, options?: Partial<TraversalVisitorFunctionOptions>): this;
addVisitorGroupFor<ORDER extends DagVisitorPhase>(order: ORDER, group: VisitorGroupDefinition<DagVisitor<T, R, NoInferPhase<ORDER>, ID>>): this;
listVisitorsFor<ORDER extends DagVisitorPhase>(order: ORDER): DagTraversalVisitors<T, R, ID>[ORDER];
setVisitorsFor<ORDER extends DagVisitorPhase>(order: ORDER, input: VisitorPhaseInput<DagVisitor<T, R, NoInferPhase<ORDER>, ID>>): this;
createRunner(): DagTraversalRunner<T, R, ID>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `addVisitorFor` | <code>&lt;ORDER extends DagVisitorPhase&gt;(order: ORDER, visitor: DagVisitor&lt;T, R, NoInferPhase&lt;ORDER&gt;, ID&gt;, options?: Partial&lt;TraversalVisitorFunctionOptions&gt; &#124; undefined) =&gt; DagTraversal&lt;T, R, ID&gt;</code> |
| `addVisitorGroupFor` | <code>&lt;ORDER extends DagVisitorPhase&gt;(order: ORDER, group: VisitorGroupDefinition&lt;DagVisitor&lt;T, R, NoInferPhase&lt;ORDER&gt;, ID&gt;&gt;) =&gt; DagTraversal&lt;T, R, ID&gt;</code> |
| `configure` | <code>(input: DagOptionsPatch&lt;T, R, ID&gt;) =&gt; DagTraversal&lt;T, R, ID&gt;</code> |
| `createRunner` | <code>() =&gt; DagTraversalRunner&lt;T, R, ID&gt;</code> |
| `listVisitorsFor` | <code>&lt;ORDER extends DagVisitorPhase&gt;(order: ORDER) =&gt; DagTraversalVisitors&lt;T, R, ID&gt;[ORDER]</code> |
| `setVisitorsFor` | <code>&lt;ORDER extends DagVisitorPhase&gt;(order: ORDER, input: VisitorPhaseInput&lt;DagVisitor&lt;T, R, NoInferPhase&lt;ORDER&gt;, ID&gt;&gt;) =&gt; DagTraversal&lt;T, R, ID&gt;</code> |

</details>

<a id="symbol-DagTraversalRunner"></a>

### DagTraversalRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-workflow-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export interface DagTraversalRunner<T extends VertexTypes = VertexTypes, R extends VertexTypes = T, ID = unknown> extends SyncTraversalExecution<DagVisitorPhase, DagEvent<T | R, ID>, TreeDagExecutionInspection<DagVisitorPhase>, 'workCompleted' | 'subgraphCompleted'> {
readonly originalGraphView: OriginalGraphView<T, ID> | null;
prepare(): this;
inspectMilestones(): DagMilestoneSnapshot<ID>;
summary(): DagSummary<ID>;
settle(id: ID, outcome: DagSettlementOutcome, expectedGeneration: DagSettlementGeneration): boolean;
getResolvedTreeView(): ResolvedTreeView<T | R> | null;
getResolvedGraphView(): ResolvedGraphView<T | R, ID>;
isGraphRootVertex(ref: VertexHandle<T | R>): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getResolvedGraphView` | <code>() =&gt; ResolvedGraphView&lt;T &#124; R, ID&gt;</code> |
| `getResolvedTreeView` | <code>() =&gt; ResolvedTreeView&lt;T &#124; R&gt; &#124; null</code> |
| `getStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `inspect` | <code>() =&gt; TreeDagExecutionInspection&lt;DagVisitorPhase&gt;</code> |
| `inspectMilestones` | <code>() =&gt; DagMilestoneSnapshot&lt;ID&gt;</code> |
| `isGraphRootVertex` | <code>(ref: VertexHandle&lt;T &#124; R&gt;) =&gt; boolean</code> |
| `isHalted` | <code>() =&gt; boolean</code> |
| `iterateEvents` | <code>{ (): Generator&lt;DagEvent&lt;T &#124; R, ID&gt;, void, unknown&gt;; &lt;Kind extends "workCompleted" &#124; "subgraphCompleted"&gt;(config: TraversalExecutionOptions&lt;DagVisitorPhase, Kind&gt; &amp; { emitEvents: readonly Kind[]; }): Generator&lt;SelectedTraversalEvent&lt;DagEvent&lt;T &#124; R, ID&gt;, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionOptions&lt;DagVisitorPhase, "workCompleted" &#124; "subgraphCompleted"&gt; &#124; undefined): Generator&lt;DagEvent&lt;T &#124; R, ID&gt;, void, unknown&gt;; }</code> |
| `originalGraphView` | <code>OriginalGraphView&lt;T, ID&gt; &#124; null</code> |
| `prepare` | <code>() =&gt; DagTraversalRunner&lt;T, R, ID&gt;</code> |
| `requestPause` | <code>() =&gt; boolean</code> |
| `run` | <code>(config?: TraversalExecutionOptions&lt;DagVisitorPhase, "workCompleted" &#124; "subgraphCompleted"&gt; &#124; undefined) =&gt; DagTraversalRunner&lt;T, R, ID&gt;</code> |
| `settle` | <code>(id: ID, outcome: DagSettlementOutcome, expectedGeneration: symbol) =&gt; boolean</code> |
| `summary` | <code>() =&gt; Readonly&lt;{ discovery: Readonly&lt;{ mode: "lazy" &#124; "eager"; complete: boolean; }&gt;; counts: Readonly&lt;{ discovered: number; pending: number; readyOrDeferred: number; deferredWork: number; activeVisitorVertices: number; workCompleted: number; subgraphCompleted: number; }&gt;; vertices: ReadonlyMap&lt;ID, Readonly&lt;{ vertexId: ID; work: DagWorkState; subgraphComplete: boolean; unmetPrerequisiteIds: readonly ID[]; unmetWorkPrerequisiteIds: readonly ID[]; unmetSubgraphPrerequisiteIds: readonly ID[]; generation?: symbol &#124; undefined; }&gt;&gt;; readyOrDeferredIds: readonly ID[]; deferredWorkIds: readonly ID[]; awaitingSettlement: readonly Readonly&lt;{ vertexId: ID; generation: symbol; }&gt;[]; activeVisitorVertexIds: readonly ID[]; completedWorkIds: readonly ID[]; completedSubgraphIds: readonly ID[]; unusedCompletedWorkIds: readonly ID[]; diagnostics: DagTraversalStallDiagnostics&lt;ID&gt; &#124; null; }&gt;</code> |

</details>

<a id="symbol-DagTraversalStallDiagnostics"></a>

### DagTraversalStallDiagnostics

Type-only; no runtime constructor/value. [Owning contract](reference.md#validation-results-and-failures) · [Related example](reference.md#narrow-invalid-issues)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagTraversalStallDiagnostics<ID = unknown> = {
    dependencies: Array<{
        vertexId: ID;
        unmetPrerequisiteIds: ID[];
    }>;
    unknownPrerequisiteIds: ID[];
    /** Strongly connected component membership, not ordered cycle witnesses. */
    dependencyCycleComponents: ID[][];
    dependencyEdges: DagWaitEdge<ID>[];
    dependencyBlockedIds: ID[];
    structurallyIncompleteIds: ID[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `dependencies` | <code>{ vertexId: ID; unmetPrerequisiteIds: ID[]; }[]</code> |
| `dependencyBlockedIds` | <code>ID[]</code> |
| `dependencyCycleComponents` | <code>ID[][]</code> |
| `dependencyEdges` | <code>DagWaitEdge&lt;ID&gt;[]</code> |
| `structurallyIncompleteIds` | <code>ID[]</code> |
| `unknownPrerequisiteIds` | <code>ID[]</code> |

</details>

<a id="symbol-DagTraversalStallError"></a>

### DagTraversalStallError

Runtime value and public type surface. [Owning contract](reference.md#validation-results-and-failures) · [Related example](reference.md#narrow-invalid-issues)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare class DagTraversalStallError<ID = unknown> extends Error {
readonly diagnostics: DagTraversalStallDiagnostics<ID>;
constructor(diagnostics: Omit<DagTraversalStallDiagnostics<DiagnosticId<ID>>, 'dependencyEdges'> & Partial<Pick<DagTraversalStallDiagnostics<DiagnosticId<ID>>, 'dependencyEdges'>>);
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `diagnostics` | <code>DagTraversalStallDiagnostics&lt;ID&gt;</code> |

</details>

<a id="symbol-DagVertexFound"></a>

### DagVertexFound

Type-only; no runtime constructor/value. [Owning contract](reference.md#discovery-and-completed-work) · [Executable snippet](reference.md#graph-source-result-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type DagVertexFound<T extends VertexTypes, ID = unknown> = {
    kind: 'found';
    vertex: GraphDependencies<ID> & RequiredGraphVertexIdentity<ID> & {
        vertexContent: VertexContentInput<T>;
        vertexId?: ID;
    };
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"found"</code> |
| `vertex` | <code>GraphDependencies&lt;ID&gt; &amp; RequiredGraphVertexIdentity&lt;ID&gt; &amp; { vertexContent: VertexContentInput&lt;T&gt;; vertexId?: ID &#124; undefined; }</code> |

</details>

<a id="symbol-DagVertexOmitted"></a>

### DagVertexOmitted

Type-only; no runtime constructor/value. [Owning contract](reference.md#discovery-and-completed-work) · [Executable snippet](reference.md#graph-source-result-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type DagVertexOmitted<ID = unknown> = {
    kind: 'omitted';
    identity: Readonly<{
        vertexId: ID;
    }> | null;
    satisfiesDependencies: true;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `identity` | <code>Readonly&lt;{ vertexId: ID; }&gt; &#124; null</code> |
| `kind` | <code>"omitted"</code> |
| `satisfiesDependencies` | <code>true</code> |

</details>

<a id="symbol-DagVertexProgress"></a>

### DagVertexProgress

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-summary-schema) · [Executable snippet](reference.md#dag-summary-schema)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagVertexProgress<ID = unknown> = Readonly<{
    vertexId: ID;
    work: DagWorkState;
    subgraphComplete: boolean;
    unmetPrerequisiteIds: readonly ID[];
    /** Exact W waits, independent of C waits even when their IDs overlap. */
    unmetWorkPrerequisiteIds: readonly ID[];
    unmetSubgraphPrerequisiteIds: readonly ID[];
    generation?: DagSettlementGeneration;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `generation` | <code>symbol &#124; undefined</code> |
| `subgraphComplete` | <code>boolean</code> |
| `unmetPrerequisiteIds` | <code>readonly ID[]</code> |
| `unmetSubgraphPrerequisiteIds` | <code>readonly ID[]</code> |
| `unmetWorkPrerequisiteIds` | <code>readonly ID[]</code> |
| `vertexId` | <code>ID</code> |
| `work` | <code>DagWorkState</code> |

</details>

<a id="symbol-DagVertexResolution"></a>

### DagVertexResolution

Type-only; no runtime constructor/value. [Owning contract](reference.md#discovery-and-completed-work) · [Executable snippet](reference.md#graph-source-result-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type DagVertexResolution<T extends VertexTypes, ID = unknown> = DagVertexFound<T, ID> | DagVertexOmitted<ID>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"found" &#124; "omitted"</code> |

</details>

<a id="symbol-DagVisitor"></a>

### DagVisitor

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-workflow-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagVisitor<T extends VertexTypes, R extends VertexTypes = T, ORDER extends DagVisitorPhase = DagVisitorPhase, ID = unknown> = VisitResult<R, ORDER, 'dag', T['VertexHint']> extends infer RESULT ? (vertex: VertexView<T | R>, options: DagVisitorContext<T, R, ORDER, ID>) => RESULT : never;
```

<a id="symbol-DagVisitorContext"></a>

### DagVisitorContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-workflow-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagVisitorContext<T extends VertexTypes, R extends VertexTypes = T, ORDER extends DagVisitorPhase = DagVisitorPhase, ID = unknown> = {
    resolvedGraphView: ResolvedGraphView<T | R, ID>;
    originalGraphView: OriginalGraphView<T, ID> | null;
    vertexRef: VertexHandle<T | R>;
    phase: ORDER;
    isGraphRoot: boolean;
    phaseVisitIndex: number;
    visitorIndex: number;
    previousPhaseVertexRef: VertexHandle<T | R> | null;
    visitorChainState: unknown;
    registration: VisitorRegistrationMetadata;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `isGraphRoot` | <code>boolean</code> |
| `originalGraphView` | <code>OriginalGraphView&lt;T, ID&gt; &#124; null</code> |
| `phase` | <code>ORDER</code> |
| `phaseVisitIndex` | <code>number</code> |
| `previousPhaseVertexRef` | <code>VertexHandle&lt;T &#124; R&gt; &#124; null</code> |
| `registration` | <code>Readonly&lt;TraversalVisitorFunctionOptions &amp; { addedIndex: number; visitorGroup?: Readonly&lt;{ identity: symbol; explicit: boolean; commandCommitMode: CommandCommitMode; }&gt; &#124; undefined; }&gt;</code> |
| `resolvedGraphView` | <code>ResolvedGraphView&lt;T &#124; R, ID&gt;</code> |
| `vertexRef` | <code>VertexHandle&lt;T &#124; R&gt;</code> |
| `visitorChainState` | <code>unknown</code> |
| `visitorIndex` | <code>number</code> |

</details>

<a id="symbol-DagVisitorPhase"></a>

### DagVisitorPhase

Runtime value and public type surface. [Owning contract](reference.md#dag-traversal) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-workflow-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare enum DagVisitorPhase {
ON_WORK_READY = "ON_WORK_READY"
ON_SUBGRAPH_READY = "ON_SUBGRAPH_READY"
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `ON_SUBGRAPH_READY` | <code>DagVisitorPhase.ON_SUBGRAPH_READY</code> |
| `ON_WORK_READY` | <code>DagVisitorPhase.ON_WORK_READY</code> |

</details>

<a id="symbol-DagWaitEdge"></a>

### DagWaitEdge

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagWaitEdge<ID = unknown> = {
    waiter: DagMilestone<ID>;
    prerequisite: DagMilestone<ID>;
    reason: 'workDependency' | 'subgraphCompletionDependency' | 'ownWork' | 'structuralChild';
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `prerequisite` | <code>DagMilestone&lt;ID&gt;</code> |
| `reason` | <code>"workDependency" &#124; "subgraphCompletionDependency" &#124; "ownWork" &#124; "structuralChild"</code> |
| `waiter` | <code>DagMilestone&lt;ID&gt;</code> |

</details>

<a id="symbol-DagWorkBoundary"></a>

### DagWorkBoundary

Type-only; no runtime constructor/value. [Owning contract](reference.md#ticket-coordination) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagWorkBoundary<ID = unknown> = Readonly<{
    kind: 'awaitingSettlement';
    workTickets: readonly DagWorkTicket<ID>[];
}> | Readonly<{
    kind: 'paused';
}> | Readonly<{
    kind: 'finished';
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"paused" &#124; "awaitingSettlement" &#124; "finished"</code> |

</details>

<a id="symbol-DagWorkSession"></a>

### DagWorkSession

Type-only; no runtime constructor/value. [Owning contract](reference.md#ticket-coordination) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export interface DagWorkSession<ID = unknown> extends DagWorkSessionControl<ID> {
advance(): DagWorkBoundary<ID>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `advance` | <code>() =&gt; DagWorkBoundary&lt;ID&gt;</code> |
| `completeWork` | <code>(ticket: DagWorkTicket&lt;ID&gt;) =&gt; DagSettlementReceipt</code> |
| `failTraversal` | <code>(ticket: DagWorkTicket&lt;ID&gt;, error: unknown) =&gt; DagSettlementReceipt</code> |
| `getStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `inspect` | <code>() =&gt; TreeDagExecutionInspection&lt;DagVisitorPhase&gt;</code> |
| `inspectMilestones` | <code>() =&gt; DagMilestoneSnapshot&lt;ID&gt;</code> |
| `isHalted` | <code>() =&gt; boolean</code> |
| `requestPause` | <code>() =&gt; boolean</code> |
| `summary` | <code>() =&gt; Readonly&lt;{ discovery: Readonly&lt;{ mode: "lazy" &#124; "eager"; complete: boolean; }&gt;; counts: Readonly&lt;{ discovered: number; pending: number; readyOrDeferred: number; deferredWork: number; activeVisitorVertices: number; workCompleted: number; subgraphCompleted: number; }&gt;; vertices: ReadonlyMap&lt;ID, Readonly&lt;{ vertexId: ID; work: DagWorkState; subgraphComplete: boolean; unmetPrerequisiteIds: readonly ID[]; unmetWorkPrerequisiteIds: readonly ID[]; unmetSubgraphPrerequisiteIds: readonly ID[]; generation?: symbol &#124; undefined; }&gt;&gt;; readyOrDeferredIds: readonly ID[]; deferredWorkIds: readonly ID[]; awaitingSettlement: readonly Readonly&lt;{ vertexId: ID; generation: symbol; }&gt;[]; activeVisitorVertexIds: readonly ID[]; completedWorkIds: readonly ID[]; completedSubgraphIds: readonly ID[]; unusedCompletedWorkIds: readonly ID[]; diagnostics: DagTraversalStallDiagnostics&lt;ID&gt; &#124; null; }&gt;</code> |

</details>

<a id="symbol-DagWorkSessionControl"></a>

### DagWorkSessionControl

Type-only; no runtime constructor/value. [Owning contract](reference.md#ticket-coordination) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export interface DagWorkSessionControl<ID = unknown> extends TraversalExecutionState<TreeDagExecutionInspection<DagVisitorPhase>> {
completeWork(ticket: DagWorkTicket<ID>): DagSettlementReceipt;
failTraversal(ticket: DagWorkTicket<ID>, error: unknown): DagSettlementReceipt;
inspectMilestones(): DagMilestoneSnapshot<ID>;
summary(): DagSummary<ID>;
requestPause(): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `completeWork` | <code>(ticket: DagWorkTicket&lt;ID&gt;) =&gt; DagSettlementReceipt</code> |
| `failTraversal` | <code>(ticket: DagWorkTicket&lt;ID&gt;, error: unknown) =&gt; DagSettlementReceipt</code> |
| `getStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `inspect` | <code>() =&gt; TreeDagExecutionInspection&lt;DagVisitorPhase&gt;</code> |
| `inspectMilestones` | <code>() =&gt; DagMilestoneSnapshot&lt;ID&gt;</code> |
| `isHalted` | <code>() =&gt; boolean</code> |
| `requestPause` | <code>() =&gt; boolean</code> |
| `summary` | <code>() =&gt; Readonly&lt;{ discovery: Readonly&lt;{ mode: "lazy" &#124; "eager"; complete: boolean; }&gt;; counts: Readonly&lt;{ discovered: number; pending: number; readyOrDeferred: number; deferredWork: number; activeVisitorVertices: number; workCompleted: number; subgraphCompleted: number; }&gt;; vertices: ReadonlyMap&lt;ID, Readonly&lt;{ vertexId: ID; work: DagWorkState; subgraphComplete: boolean; unmetPrerequisiteIds: readonly ID[]; unmetWorkPrerequisiteIds: readonly ID[]; unmetSubgraphPrerequisiteIds: readonly ID[]; generation?: symbol &#124; undefined; }&gt;&gt;; readyOrDeferredIds: readonly ID[]; deferredWorkIds: readonly ID[]; awaitingSettlement: readonly Readonly&lt;{ vertexId: ID; generation: symbol; }&gt;[]; activeVisitorVertexIds: readonly ID[]; completedWorkIds: readonly ID[]; completedSubgraphIds: readonly ID[]; unusedCompletedWorkIds: readonly ID[]; diagnostics: DagTraversalStallDiagnostics&lt;ID&gt; &#124; null; }&gt;</code> |

</details>

<a id="symbol-DagWorkSessionOptions"></a>

### DagWorkSessionOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagWorkSessionOptions<ID> = OwnedOptions & {
    completedWork?: ReadonlySet<ID>;
    visitors?: never;
    workCompletion?: never;
    retainOriginalGraphStructure?: never;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `completedWork` | <code>ReadonlySet&lt;ID&gt; &#124; undefined</code> |
| `dependsOnWorkDefault` | <code>undefined</code> |
| `discovery` | <code>undefined</code> |
| `retainOriginalGraphStructure` | <code>undefined</code> |
| `rootWorkDependencies` | <code>undefined</code> |
| `syntheticRoot` | <code>undefined</code> |
| `transformChildHints` | <code>undefined</code> |
| `traversableGraph` | <code>undefined</code> |
| `traversableTree` | <code>undefined</code> |
| `traversalRunnerInternalObjects` | <code>undefined</code> |
| `visitors` | <code>undefined</code> |
| `workCompletion` | <code>undefined</code> |

</details>

<a id="symbol-DagWorkState"></a>

### DagWorkState

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-summary-schema) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-orchestration-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagWorkState = 'pending' | 'ready' | 'visiting' | 'deferred' | 'completed';
```

<a id="symbol-DagWorkTicket"></a>

### DagWorkTicket

Type-only; no runtime constructor/value. [Owning contract](reference.md#ticket-coordination) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagWorkTicket<ID = unknown> = NominalDagWorkTicket<ID>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `vertexId` | <code>ID</code> |

</details>

<a id="symbol-DepthFirstPhase"></a>

### DepthFirstPhase

Runtime value and public type surface. [Owning contract](reference.md#traversal-orders) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export declare enum DepthFirstPhase {
PRE_ORDER = "PRE_ORDER"
IN_ORDER = "IN_ORDER"
POST_ORDER = "POST_ORDER"
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `IN_ORDER` | <code>DepthFirstPhase.IN_ORDER</code> |
| `POST_ORDER` | <code>DepthFirstPhase.POST_ORDER</code> |
| `PRE_ORDER` | <code>DepthFirstPhase.PRE_ORDER</code> |

</details>

<a id="symbol-DepthFirstTreeOptions"></a>

### DepthFirstTreeOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export type DepthFirstTreeOptions<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP> = DepthFirstTreeOptionsPatch<TTP, RW_TTP> & {
    traversableTree: TreeSource<TTP, RW_TTP>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `inOrder` | <code>InOrderOptionsPatch &#124; undefined</code> |
| `retainOriginalTreeStructure` | <code>boolean &#124; undefined</code> |
| `transformChildHints` | <code>ChildHintTransformer&lt;TTP&gt; &#124; null &#124; undefined</code> |
| `traversableTree` | <code>TreeSource&lt;TTP, RW_TTP&gt;</code> |
| `visitors` | <code>VisitorInputs&lt;DepthFirstTraversalVisitors&lt;TTP, RW_TTP&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-DepthFirstTreeOptionsPatch"></a>

### DepthFirstTreeOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export type DepthFirstTreeOptionsPatch<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP> = {
    traversableTree?: TreeSource<TTP, RW_TTP> | undefined;
    transformChildHints?: ChildHintTransformer<TTP> | null | undefined;
    visitors?: VisitorInputs<DepthFirstTraversalVisitors<TTP, RW_TTP>> | undefined;
    retainOriginalTreeStructure?: boolean | undefined;
    inOrder?: InOrderOptionsPatch | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `inOrder` | <code>InOrderOptionsPatch &#124; undefined</code> |
| `retainOriginalTreeStructure` | <code>boolean &#124; undefined</code> |
| `transformChildHints` | <code>ChildHintTransformer&lt;TTP&gt; &#124; null &#124; undefined</code> |
| `traversableTree` | <code>TreeSource&lt;TTP, RW_TTP&gt; &#124; undefined</code> |
| `visitors` | <code>VisitorInputs&lt;DepthFirstTraversalVisitors&lt;TTP, RW_TTP&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-DepthFirstTreeRunner"></a>

### DepthFirstTreeRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#traversal-orders) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export interface DepthFirstTreeRunner<TTP extends VertexTypes, RW_TTP extends VertexTypes = TTP> extends SyncTraversalExecution<DepthFirstPhase, TreeTraversalEvent<DepthFirstPhase, TTP, RW_TTP>, TreeDagExecutionInspection<DepthFirstPhase>> {
getResolvedTreeView(): ResolvedTreeView<TTP | RW_TTP>;
getResolvedGraphView(): ResolvedGraphView<TTP | RW_TTP>;
isTreeRootVertex(ref: VertexHandle<TTP | RW_TTP>): boolean;
isChildExpansionSkipped(ref: VertexHandle<TTP | RW_TTP>): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getResolvedGraphView` | <code>() =&gt; ResolvedGraphView&lt;TTP &#124; RW_TTP, unknown&gt;</code> |
| `getResolvedTreeView` | <code>() =&gt; ResolvedTreeView&lt;TTP &#124; RW_TTP&gt;</code> |
| `getStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `inspect` | <code>() =&gt; TreeDagExecutionInspection&lt;DepthFirstPhase&gt;</code> |
| `isChildExpansionSkipped` | <code>(ref: VertexHandle&lt;TTP &#124; RW_TTP&gt;) =&gt; boolean</code> |
| `isHalted` | <code>() =&gt; boolean</code> |
| `isTreeRootVertex` | <code>(ref: VertexHandle&lt;TTP &#124; RW_TTP&gt;) =&gt; boolean</code> |
| `iterateEvents` | <code>{ (): Generator&lt;TreeTraversalEvent&lt;DepthFirstPhase, TTP, RW_TTP&gt;, void, unknown&gt;; &lt;Kind extends DepthFirstPhase&gt;(config: TraversalExecutionOptions&lt;DepthFirstPhase, Kind&gt; &amp; { emitEvents: readonly Kind[]; }): Generator&lt;SelectedTraversalEvent&lt;TreeTraversalEvent&lt;DepthFirstPhase, TTP, RW_TTP&gt;, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionOptions&lt;DepthFirstPhase, DepthFirstPhase&gt; &#124; undefined): Generator&lt;TreeTraversalEvent&lt;DepthFirstPhase, TTP, RW_TTP&gt;, void, unknown&gt;; }</code> |
| `requestPause` | <code>() =&gt; boolean</code> |
| `run` | <code>(config?: TraversalExecutionOptions&lt;DepthFirstPhase, DepthFirstPhase&gt; &#124; undefined) =&gt; DepthFirstTreeRunner&lt;TTP, RW_TTP&gt;</code> |

</details>

<a id="symbol-DepthFirstTreeTraversal"></a>

### DepthFirstTreeTraversal

Runtime value and public type surface. [Owning contract](reference.md#traversal-orders) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export declare class DepthFirstTreeTraversal<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP> {
constructor(icfgInput: DepthFirstTreeOptions<TTP, RW_TTP>);
configure(icfgInput: DepthFirstTreeOptionsPatch<TTP, RW_TTP>): this;
addVisitorFor<Phase extends DepthFirstPhase>(phase: Phase, visitor: TreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>, options?: Partial<TraversalVisitorFunctionOptions>): this;
addVisitorGroupFor<Phase extends DepthFirstPhase>(phase: Phase, group: VisitorGroupDefinition<TreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>>): this;
listVisitorsFor<Phase extends DepthFirstPhase>(phase: Phase): DepthFirstTraversalVisitors<TTP, RW_TTP>[Phase];
setVisitorsFor<Phase extends DepthFirstPhase>(phase: Phase, input: VisitorPhaseInput<TreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>>): this;
createRunner(): DepthFirstTreeRunner<TTP, RW_TTP>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `addVisitorFor` | <code>&lt;Phase extends DepthFirstPhase&gt;(phase: Phase, visitor: TreeVisitor&lt;NoInferPhase&lt;Phase&gt;, TTP, RW_TTP&gt;, options?: Partial&lt;TraversalVisitorFunctionOptions&gt; &#124; undefined) =&gt; DepthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |
| `addVisitorGroupFor` | <code>&lt;Phase extends DepthFirstPhase&gt;(phase: Phase, group: VisitorGroupDefinition&lt;TreeVisitor&lt;NoInferPhase&lt;Phase&gt;, TTP, RW_TTP&gt;&gt;) =&gt; DepthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |
| `configure` | <code>(icfgInput: DepthFirstTreeOptionsPatch&lt;TTP, RW_TTP&gt;) =&gt; DepthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |
| `createRunner` | <code>() =&gt; DepthFirstTreeRunner&lt;TTP, RW_TTP&gt;</code> |
| `listVisitorsFor` | <code>&lt;Phase extends DepthFirstPhase&gt;(phase: Phase) =&gt; DepthFirstTraversalVisitors&lt;TTP, RW_TTP&gt;[Phase]</code> |
| `setVisitorsFor` | <code>&lt;Phase extends DepthFirstPhase&gt;(phase: Phase, input: VisitorPhaseInput&lt;TreeVisitor&lt;NoInferPhase&lt;Phase&gt;, TTP, RW_TTP&gt;&gt;) =&gt; DepthFirstTreeTraversal&lt;TTP, RW_TTP&gt;</code> |

</details>

<a id="symbol-EmissionKind"></a>

### EmissionKind

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type EmissionKind<Phase extends string> = Phase extends 'ON_WORK_READY' ? 'workCompleted' : Phase extends 'ON_SUBGRAPH_READY' ? 'subgraphCompleted' : Phase extends 'vertex' ? 'vertex' : Phase extends 'edge' ? 'edge' : Phase extends 'path' ? 'path' : Phase;
```

<a id="symbol-ExecutionInspection"></a>

### ExecutionInspection

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Related example](reference.md#inspection-and-execution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface ExecutionInspection {
readonly status: TraversalRunnerStatus;
readonly stopReason: TraversalStopReason | null;
readonly pauseRequested: boolean;
readonly kind: string;
readonly execution: 'sync' | 'async';
readonly inFlightCallbackCount: number;
readonly bufferedEventCount: number;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `bufferedEventCount` | <code>number</code> |
| `execution` | <code>"sync" &#124; "async"</code> |
| `inFlightCallbackCount` | <code>number</code> |
| `kind` | <code>string</code> |
| `pauseRequested` | <code>boolean</code> |
| `status` | <code>TraversalRunnerStatus</code> |
| `stopReason` | <code>TraversalStopReason &#124; null</code> |

</details>

<a id="symbol-GetPathToOptions"></a>

### GetPathToOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type GetPathToOptions = {
    noRoot?: boolean | undefined;
    noSelf?: boolean | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `noRoot` | <code>boolean &#124; undefined</code> |
| `noSelf` | <code>boolean &#124; undefined</code> |

</details>

<a id="symbol-GraphWalk"></a>

### GraphWalk

Runtime value and public type surface. [Owning contract](reference.md#general-graph-walking) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare class GraphWalk<Data, Edge, ID> {
constructor(options: GraphWalkOptions<Data, Edge, ID>);
configure(patch: GraphWalkOptionsPatch<Data, Edge, ID>): this;
addVisitorFor<Phase extends GraphWalkPhase>(phase: Phase, visitor: GraphWalkVisitor<Data, Edge, NoInferPhase<Phase>, ID>, options?: Partial<TraversalVisitorFunctionOptions>): this;
addVisitorGroupFor<Phase extends GraphWalkPhase>(phase: Phase, group: VisitorGroupDefinition<GraphWalkVisitor<Data, Edge, NoInferPhase<Phase>, ID>>): this;
setVisitorsFor<Phase extends GraphWalkPhase>(phase: Phase, input: VisitorPhaseInput<GraphWalkVisitor<Data, Edge, NoInferPhase<Phase>, ID>>): this;
listVisitorsFor<Phase extends GraphWalkPhase>(phase: Phase): VisitorRecord<GraphWalkVisitor<Data, Edge, Phase, ID>>[];
createRunner(): GraphWalkRunner<Data, Edge, ID>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `addVisitorFor` | <code>&lt;Phase extends GraphWalkPhase&gt;(phase: Phase, visitor: GraphWalkVisitor&lt;Data, Edge, NoInferPhase&lt;Phase&gt;, ID&gt;, options?: Partial&lt;TraversalVisitorFunctionOptions&gt; &#124; undefined) =&gt; GraphWalk&lt;Data, Edge, ID&gt;</code> |
| `addVisitorGroupFor` | <code>&lt;Phase extends GraphWalkPhase&gt;(phase: Phase, group: VisitorGroupDefinition&lt;GraphWalkVisitor&lt;Data, Edge, NoInferPhase&lt;Phase&gt;, ID&gt;&gt;) =&gt; GraphWalk&lt;Data, Edge, ID&gt;</code> |
| `configure` | <code>(patch: GraphWalkOptionsPatch&lt;Data, Edge, ID&gt;) =&gt; GraphWalk&lt;Data, Edge, ID&gt;</code> |
| `createRunner` | <code>() =&gt; GraphWalkRunner&lt;Data, Edge, ID&gt;</code> |
| `listVisitorsFor` | <code>&lt;Phase extends GraphWalkPhase&gt;(phase: Phase) =&gt; VisitorRecord&lt;GraphWalkVisitor&lt;Data, Edge, Phase, ID&gt;&gt;[]</code> |
| `setVisitorsFor` | <code>&lt;Phase extends GraphWalkPhase&gt;(phase: Phase, input: VisitorPhaseInput&lt;GraphWalkVisitor&lt;Data, Edge, NoInferPhase&lt;Phase&gt;, ID&gt;&gt;) =&gt; GraphWalk&lt;Data, Edge, ID&gt;</code> |

</details>

<a id="symbol-GraphWalkCatalogLink"></a>

### GraphWalkCatalogLink

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkCatalogLink<Edge, ID> = Readonly<{
    to: ID;
    data: Edge;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `data` | <code>Edge</code> |
| `to` | <code>ID</code> |

</details>

<a id="symbol-GraphWalkCounts"></a>

### GraphWalkCounts

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkCounts = Readonly<{
    /** Attempted root/link reads, including done results and cached route replay. */
    candidateReadAttempts: number;
    /** Distinct roots and eligible followed links, including omissions and returns. */
    admittedTargets: number;
    uniqueFoundVertices: number;
    uniqueOmittedVertices: number;
    /** Fresh source links read before filtering; cached replay is not recounted. */
    discoveredLinks: number;
    /** Per-phase acknowledged observations, independent of callback/delivery filters. */
    processedObservations: Readonly<Record<GraphWalkPhase, number>>;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `admittedTargets` | <code>number</code> |
| `candidateReadAttempts` | <code>number</code> |
| `discoveredLinks` | <code>number</code> |
| `processedObservations` | <code>Readonly&lt;Record&lt;GraphWalkPhase, number&gt;&gt;</code> |
| `uniqueFoundVertices` | <code>number</code> |
| `uniqueOmittedVertices` | <code>number</code> |

</details>

<a id="symbol-GraphWalkDagRelation"></a>

### GraphWalkDagRelation

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkDagRelation = {
    kind: 'child';
    slotIndex: number;
} | {
    kind: 'workDependency';
} | {
    kind: 'subgraphCompletionDependency';
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"child" &#124; "workDependency" &#124; "subgraphCompletionDependency"</code> |

</details>

<a id="symbol-GraphWalkEdge"></a>

### GraphWalkEdge

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkEdge<Edge, ID> = Readonly<{
    from: ID;
    /** Zero-based source adjacency position before filtering; stable on cached replay. */
    outgoingIndex: number;
    to: ID;
    data: Edge;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `data` | <code>Edge</code> |
| `from` | <code>ID</code> |
| `outgoingIndex` | <code>number</code> |
| `to` | <code>ID</code> |

</details>

<a id="symbol-GraphWalkEdgePredicate"></a>

### GraphWalkEdgePredicate

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkEdgePredicate<Data, Edge, ID> = (edge: GraphWalkEdge<Edge, ID>, context: GraphWalkFollowContext<Data, Edge, ID>) => boolean;
```

<a id="symbol-GraphWalkEvent"></a>

### GraphWalkEvent

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkEvent<Data, Edge, ID> = Readonly<{
    kind: 'vertex';
    vertex: GraphWalkVertex<Data, ID>;
    depth: number;
    via: GraphWalkEdge<Edge, ID> | null;
}> | Readonly<{
    kind: 'edge';
    edge: GraphWalkEdge<Edge, ID>;
    fromVertex: GraphWalkVertex<Data, ID>;
    depth: number;
    target: Readonly<{
        kind: 'found';
        vertex: GraphWalkVertex<Data, ID>;
    }> | Readonly<{
        kind: 'omitted';
    }>;
}> | Readonly<{
    kind: 'path';
    vertices: readonly GraphWalkVertex<Data, ID>[];
    edges: readonly GraphWalkEdge<Edge, ID>[];
    depth: number;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `depth` | <code>number</code> |
| `kind` | <code>"vertex" &#124; "edge" &#124; "path"</code> |

</details>

<a id="symbol-GraphWalkEventFor"></a>

### GraphWalkEventFor

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkEventFor<Data, Edge, Phase extends `${GraphWalkPhase}`, ID> = Extract<GraphWalkEvent<Data, Edge, ID>, {
    kind: `${Phase}`;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `depth` | <code>number</code> |
| `kind` | <code>(`${Phase}` &amp; "vertex") &#124; (`${Phase}` &amp; "edge") &#124; (`${Phase}` &amp; "path")</code> |

</details>

<a id="symbol-GraphWalkExpandContext"></a>

### GraphWalkExpandContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkExpandContext<Data, Edge, ID> = GraphWalkRouteContext<Data, Edge, ID> & Readonly<{
    depth: number;
    via: GraphWalkEdge<Edge, ID> | null;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `depth` | <code>number</code> |
| `revisit` | <code>"once" &#124; "simplePaths" &#124; "walks"</code> |
| `via` | <code>Readonly&lt;{ from: ID; outgoingIndex: number; to: ID; data: Edge; }&gt; &#124; null</code> |

</details>

<a id="symbol-GraphWalkExpansionPredicate"></a>

### GraphWalkExpansionPredicate

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkExpansionPredicate<Data, Edge, ID> = (vertex: GraphWalkVertex<Data, ID>, context: GraphWalkExpandContext<Data, Edge, ID>) => boolean;
```

<a id="symbol-GraphWalkFollowContext"></a>

### GraphWalkFollowContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkFollowContext<Data, Edge, ID> = GraphWalkRouteContext<Data, Edge, ID> & Readonly<{
    fromVertex: GraphWalkVertex<Data, ID>;
    depth: number;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `depth` | <code>number</code> |
| `fromVertex` | <code>Readonly&lt;{ vertexId: ID; data: Data; }&gt;</code> |
| `revisit` | <code>"once" &#124; "simplePaths" &#124; "walks"</code> |

</details>

<a id="symbol-GraphWalkHydration"></a>

### GraphWalkHydration

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkHydration = 'resolver' | 'inlineOrCached';
```

<a id="symbol-GraphWalkInspection"></a>

### GraphWalkInspection

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export interface GraphWalkInspection extends ExecutionInspection {
readonly kind: 'graph-walk';
readonly sourceMode: 'graph';
readonly concurrency: 1;
readonly strategy: GraphWalkStrategy;
readonly revisit: GraphWalkRevisitPolicy;
readonly executionOptions: InspectionFilters<GraphWalkPhase>;
readonly counts: GraphWalkCounts;
readonly frontierSize: number;
readonly openSourceIteratorCount: number;
readonly pendingObservationKinds: readonly GraphWalkPhase[];
readonly activeVisitor: Readonly<{
        phase: GraphWalkPhase;
        visitorIndex: number;
    }> | null;
readonly pendingRequests: readonly Readonly<{
        requestId: number;
        operation: GraphWalkOperation;
        /** Stable runner-local identity; never a caller vertex ID. */
        vertexToken?: symbol | undefined;
    }>[];
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `activeVisitor` | <code>Readonly&lt;{ phase: GraphWalkPhase; visitorIndex: number; }&gt; &#124; null</code> |
| `bufferedEventCount` | <code>number</code> |
| `concurrency` | <code>1</code> |
| `counts` | <code>Readonly&lt;{ candidateReadAttempts: number; admittedTargets: number; uniqueFoundVertices: number; uniqueOmittedVertices: number; discoveredLinks: number; processedObservations: Readonly&lt;Record&lt;GraphWalkPhase, number&gt;&gt;; }&gt;</code> |
| `execution` | <code>"sync" &#124; "async"</code> |
| `executionOptions` | <code>Readonly&lt;{ emitEvents: readonly ("vertex" &#124; "edge" &#124; "path")[]; visitorPhases: VisitorPhaseSelection&lt;GraphWalkPhase&gt;; }&gt;</code> |
| `frontierSize` | <code>number</code> |
| `inFlightCallbackCount` | <code>number</code> |
| `kind` | <code>"graph-walk"</code> |
| `openSourceIteratorCount` | <code>number</code> |
| `pauseRequested` | <code>boolean</code> |
| `pendingObservationKinds` | <code>readonly GraphWalkPhase[]</code> |
| `pendingRequests` | <code>readonly Readonly&lt;{ requestId: number; operation: GraphWalkOperation; vertexToken?: symbol &#124; undefined; }&gt;[]</code> |
| `revisit` | <code>GraphWalkRevisitPolicy</code> |
| `sourceMode` | <code>"graph"</code> |
| `status` | <code>TraversalRunnerStatus</code> |
| `stopReason` | <code>TraversalStopReason &#124; null</code> |
| `strategy` | <code>GraphWalkStrategy</code> |

</details>

<a id="symbol-GraphWalkLimits"></a>

### GraphWalkLimits

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkLimits = {
    /** Maximum route depth; gates expansion after the expansion predicate. */
    maxDepth?: number;
    /** Distinct roots and eligible followed links, including returning/omitted targets. */
    maxAdmittedTargets?: number;
    /** Root/link read attempts, including exhaustion, filtering, and cached replay. */
    maxCandidateReadAttempts?: number;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `maxAdmittedTargets` | <code>number &#124; undefined</code> |
| `maxCandidateReadAttempts` | <code>number &#124; undefined</code> |
| `maxDepth` | <code>number &#124; undefined</code> |

</details>

<a id="symbol-GraphWalkLink"></a>

### GraphWalkLink

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkLink<Data, Edge, ID, Hydration extends GraphWalkHydration = GraphWalkHydration> = LinkTo<Edge, GraphWalkTarget<Data, ID, Hydration>>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `data` | <code>Edge</code> |
| `target` | <code>GraphWalkTarget&lt;Data, ID, Hydration&gt;</code> |

</details>

<a id="symbol-GraphWalkOperation"></a>

### GraphWalkOperation

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkOperation = 'roots' | 'rootNext' | 'resolveVertex' | 'outgoing' | 'edgeNext' | 'shouldFollowEdge' | 'shouldExpandVertex' | 'visit' | 'iteratorReturn';
```

<a id="symbol-GraphWalkOptions"></a>

### GraphWalkOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkOptions<Data, Edge, ID> = GraphWalkFields<Data, Edge, ID> & GraphWalkRevisitOptions;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `emitEvents` | <code>readonly ("vertex" &#124; "edge" &#124; "path")[] &#124; undefined</code> |
| `limits` | <code>GraphWalkLimits &#124; (GraphWalkLimits &amp; ({ maxDepth: number; } &#124; { maxCandidateReadAttempts: number; })) &#124; undefined</code> |
| `revisit` | <code>"once" &#124; "simplePaths" &#124; "walks" &#124; undefined</code> |
| `shouldExpandVertex` | <code>GraphWalkExpansionPredicate&lt;Data, Edge, ID&gt; &#124; null &#124; undefined</code> |
| `shouldFollowEdge` | <code>GraphWalkEdgePredicate&lt;Data, Edge, ID&gt; &#124; null &#124; undefined</code> |
| `source` | <code>GraphWalkSource&lt;Data, Edge, ID&gt;</code> |
| `strategy` | <code>GraphWalkStrategy &#124; undefined</code> |
| `visitorPhases` | <code>VisitorPhaseSelection&lt;GraphWalkPhase&gt; &#124; { include: undefined; exclude?: undefined; } &#124; { exclude: undefined; include?: undefined; } &#124; undefined</code> |
| `visitors` | <code>{ vertex?: VisitorPhaseInput&lt;GraphWalkVisitor&lt;Data, Edge, GraphWalkPhase.VERTEX, ID&gt;&gt; &#124; undefined; edge?: VisitorPhaseInput&lt;GraphWalkVisitor&lt;Data, Edge, GraphWalkPhase.EDGE, ID&gt;&gt; &#124; undefined; path?: VisitorPhaseInput&lt;GraphWalkVisitor&lt;Data, Edge, GraphWalkPhase.PATH, ID&gt;&gt; &#124; undefined; } &#124; undefined</code> |

</details>

<a id="symbol-GraphWalkOptionsPatch"></a>

### GraphWalkOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkOptionsPatch<Data, Edge, ID> = UndefinedPatch<GraphWalkFields<Data, Edge, ID>> & {
    revisit?: GraphWalkRevisitPolicy | undefined;
    replaceLimits?: GraphWalkLimits | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `emitEvents` | <code>readonly ("vertex" &#124; "edge" &#124; "path")[] &#124; undefined</code> |
| `replaceLimits` | <code>GraphWalkLimits &#124; undefined</code> |
| `revisit` | <code>GraphWalkRevisitPolicy &#124; undefined</code> |
| `shouldExpandVertex` | <code>GraphWalkExpansionPredicate&lt;Data, Edge, ID&gt; &#124; null &#124; undefined</code> |
| `shouldFollowEdge` | <code>GraphWalkEdgePredicate&lt;Data, Edge, ID&gt; &#124; null &#124; undefined</code> |
| `source` | <code>GraphWalkSource&lt;Data, Edge, ID&gt; &#124; undefined</code> |
| `strategy` | <code>GraphWalkStrategy &#124; undefined</code> |
| `visitorPhases` | <code>VisitorPhaseSelection&lt;GraphWalkPhase&gt; &#124; { include: undefined; exclude?: undefined; } &#124; { exclude: undefined; include?: undefined; } &#124; undefined</code> |
| `visitors` | <code>{ vertex?: VisitorPhaseInput&lt;GraphWalkVisitor&lt;Data, Edge, GraphWalkPhase.VERTEX, ID&gt;&gt; &#124; undefined; edge?: VisitorPhaseInput&lt;GraphWalkVisitor&lt;Data, Edge, GraphWalkPhase.EDGE, ID&gt;&gt; &#124; undefined; path?: VisitorPhaseInput&lt;GraphWalkVisitor&lt;Data, Edge, GraphWalkPhase.PATH, ID&gt;&gt; &#124; undefined; } &#124; undefined</code> |

</details>

<a id="symbol-GraphWalkOutcome"></a>

### GraphWalkOutcome

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkOutcome = {
    readonly kind: 'exhausted' | 'closed';
} | {
    readonly kind: 'limited';
    readonly reasons: readonly ('maxDepth' | 'maxAdmittedTargets' | 'maxCandidateReadAttempts')[];
} | {
    readonly kind: 'failed';
    readonly error: unknown;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"failed" &#124; "exhausted" &#124; "closed" &#124; "limited"</code> |

</details>

<a id="symbol-GraphWalkPathEvent"></a>

### GraphWalkPathEvent

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkPathEvent<Data, Edge, ID> = GraphWalkEventFor<Data, Edge, GraphWalkPhase.PATH, ID>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `depth` | <code>number</code> |
| `edges` | <code>readonly Readonly&lt;{ from: ID; outgoingIndex: number; to: ID; data: Edge; }&gt;[]</code> |
| `kind` | <code>"path"</code> |
| `vertices` | <code>readonly Readonly&lt;{ vertexId: ID; data: Data; }&gt;[]</code> |

</details>

<a id="symbol-GraphWalkPhase"></a>

### GraphWalkPhase

Runtime value and public type surface. [Owning contract](reference.md#general-graph-walking) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare enum GraphWalkPhase {
VERTEX = "vertex"
EDGE = "edge"
PATH = "path"
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `EDGE` | <code>GraphWalkPhase.EDGE</code> |
| `PATH` | <code>GraphWalkPhase.PATH</code> |
| `VERTEX` | <code>GraphWalkPhase.VERTEX</code> |

</details>

<a id="symbol-GraphWalkRecordSelectors"></a>

### GraphWalkRecordSelectors

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export interface GraphWalkRecordSelectors<Data, Edge, ID> {
id(item: Data): ID;
outgoing(item: Data): Iterable<GraphWalkCatalogLink<Edge, ID>>;
roots: Iterable<ID>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `id` | <code>(item: Data) =&gt; ID</code> |
| `outgoing` | <code>(item: Data) =&gt; Iterable&lt;Readonly&lt;{ to: ID; data: Edge; }&gt;&gt;</code> |
| `roots` | <code>Iterable&lt;ID&gt;</code> |

</details>

<a id="symbol-GraphWalkRevisitOptions"></a>

### GraphWalkRevisitOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkRevisitOptions = {
    revisit?: 'once';
    limits?: GraphWalkLimits;
} | {
    revisit: 'simplePaths' | 'walks';
    limits: GraphWalkLimits & ({
        maxDepth: number;
    } | {
        maxCandidateReadAttempts: number;
    });
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `limits` | <code>GraphWalkLimits &#124; (GraphWalkLimits &amp; ({ maxDepth: number; } &#124; { maxCandidateReadAttempts: number; })) &#124; undefined</code> |
| `revisit` | <code>"once" &#124; "simplePaths" &#124; "walks" &#124; undefined</code> |

</details>

<a id="symbol-GraphWalkRevisitPolicy"></a>

### GraphWalkRevisitPolicy

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkRevisitPolicy = 'once' | 'simplePaths' | 'walks';
```

<a id="symbol-GraphWalkRouteContext"></a>

### GraphWalkRouteContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkRouteContext<Data, Edge, ID> = Readonly<{
    revisit: 'once';
}> | Readonly<{
    revisit: 'simplePaths' | 'walks';
    path: GraphWalkPathEvent<Data, Edge, ID>;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `revisit` | <code>"once" &#124; "simplePaths" &#124; "walks"</code> |

</details>

<a id="symbol-GraphWalkRunner"></a>

### GraphWalkRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export interface GraphWalkRunner<Data, Edge, ID> extends SyncTraversalExecution<GraphWalkPhase, GraphWalkEvent<Data, Edge, ID>, GraphWalkInspection, `${GraphWalkPhase}`> {
iterateEvents: {
        (): Generator<GraphWalkEvent<Data, Edge, ID>, void, unknown>;
        <Phase extends `${GraphWalkPhase}`>(config: TraversalExecutionOptions<GraphWalkPhase, Phase> & {
            emitEvents: readonly Phase[];
        }): Generator<GraphWalkEventFor<Data, Edge, Phase, ID>, void, unknown>;
        (config?: TraversalExecutionOptions<GraphWalkPhase>): Generator<GraphWalkEvent<Data, Edge, ID>, void, unknown>;
    };
close(): void;
summary(): GraphWalkSummary;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `close` | <code>() =&gt; void</code> |
| `getStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `inspect` | <code>() =&gt; GraphWalkInspection</code> |
| `isHalted` | <code>() =&gt; boolean</code> |
| `iterateEvents` | <code>{ (): Generator&lt;GraphWalkEvent&lt;Data, Edge, ID&gt;, void, unknown&gt;; &lt;Phase extends "vertex" &#124; "edge" &#124; "path"&gt;(config: TraversalExecutionOptions&lt;GraphWalkPhase, Phase&gt; &amp; { emitEvents: readonly Phase[]; }): Generator&lt;GraphWalkEventFor&lt;Data, Edge, Phase, ID&gt;, void, unknown&gt;; (config?: TraversalExecutionOptions&lt;GraphWalkPhase, "vertex" &#124; "edge" &#124; "path"&gt; &#124; undefined): Generator&lt;GraphWalkEvent&lt;Data, Edge, ID&gt;, void, unknown&gt;; }</code> |
| `requestPause` | <code>() =&gt; boolean</code> |
| `run` | <code>(config?: TraversalExecutionOptions&lt;GraphWalkPhase, "vertex" &#124; "edge" &#124; "path"&gt; &#124; undefined) =&gt; GraphWalkRunner&lt;Data, Edge, ID&gt;</code> |
| `summary` | <code>() =&gt; Readonly&lt;{ status: TraversalRunnerStatus; counts: Readonly&lt;{ candidateReadAttempts: number; admittedTargets: number; uniqueFoundVertices: number; uniqueOmittedVertices: number; discoveredLinks: number; processedObservations: Readonly&lt;Record&lt;GraphWalkPhase, number&gt;&gt;; }&gt;; outcome: GraphWalkOutcome &#124; null; }&gt;</code> |

</details>

<a id="symbol-GraphWalkSource"></a>

### GraphWalkSource

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkSource<Data, Edge, ID> = ({
    hydration: 'resolver';
    resolveVertex(vertexId: ID): GraphWalkVertexResult<Data>;
} & SourceProtocol<Data, Edge, ID, ResolverTarget<Data, ID>>) | ({
    hydration: 'inlineOrCached';
    resolveVertex?: undefined;
} & SourceProtocol<Data, Edge, ID, InlineOrCachedTarget<Data, ID>>);
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `hydration` | <code>"resolver" &#124; "inlineOrCached"</code> |
| `outgoing` | <code>((vertex: Readonly&lt;{ vertexId: ID; data: Data; }&gt;) =&gt; Iterable&lt;Readonly&lt;{ target: Readonly&lt;{ vertexId: ID; resolution?: GraphWalkVertexResult&lt;Data&gt; &#124; undefined; }&gt;; data: Edge; }&gt;&gt;) &#124; ((vertex: Readonly&lt;{ vertexId: ID; data: Data; }&gt;) =&gt; Iterable&lt;Readonly&lt;{ target: InlineOrCachedTarget&lt;Data, ID&gt;; data: Edge; }&gt;&gt;)</code> |
| `resolveVertex` | <code>((vertexId: ID) =&gt; GraphWalkVertexResult&lt;Data&gt;) &#124; undefined</code> |
| `roots` | <code>(() =&gt; Iterable&lt;Readonly&lt;{ vertexId: ID; resolution?: GraphWalkVertexResult&lt;Data&gt; &#124; undefined; }&gt;&gt;) &#124; (() =&gt; Iterable&lt;InlineOrCachedTarget&lt;Data, ID&gt;&gt;)</code> |

</details>

<a id="symbol-GraphWalkStrategy"></a>

### GraphWalkStrategy

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkStrategy = 'breadthFirst' | 'depthFirst';
```

<a id="symbol-GraphWalkSummary"></a>

### GraphWalkSummary

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkSummary = Readonly<{
    status: TraversalRunnerStatus;
    counts: GraphWalkCounts;
    outcome: GraphWalkOutcome | null;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `counts` | <code>Readonly&lt;{ candidateReadAttempts: number; admittedTargets: number; uniqueFoundVertices: number; uniqueOmittedVertices: number; discoveredLinks: number; processedObservations: Readonly&lt;Record&lt;GraphWalkPhase, number&gt;&gt;; }&gt;</code> |
| `outcome` | <code>GraphWalkOutcome &#124; null</code> |
| `status` | <code>TraversalRunnerStatus</code> |

</details>

<a id="symbol-GraphWalkTarget"></a>

### GraphWalkTarget

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkTarget<Data, ID, Hydration extends GraphWalkHydration = GraphWalkHydration> = Hydration extends 'resolver' ? ResolverTarget<Data, ID> : InlineOrCachedTarget<Data, ID>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `resolution` | <code>GraphWalkVertexResult&lt;Data&gt; &#124; undefined</code> |
| `vertexId` | <code>ID</code> |

</details>

<a id="symbol-GraphWalkVertex"></a>

### GraphWalkVertex

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkVertex<Data, ID> = Readonly<{
    vertexId: ID;
    data: Data;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `data` | <code>Data</code> |
| `vertexId` | <code>ID</code> |

</details>

<a id="symbol-GraphWalkVertexResult"></a>

### GraphWalkVertexResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkVertexResult<Data> = {
    kind: 'found';
    data: Data;
} | {
    kind: 'omitted';
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"found" &#124; "omitted"</code> |

</details>

<a id="symbol-GraphWalkVisitor"></a>

### GraphWalkVisitor

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkVisitor<Data, Edge, Phase extends GraphWalkPhase, ID> = (event: GraphWalkEventFor<Data, Edge, Phase, ID>, options: GraphWalkVisitorContext<Phase>) => GraphWalkVisitorResult;
```

<a id="symbol-GraphWalkVisitorContext"></a>

### GraphWalkVisitorContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkVisitorContext<Phase extends GraphWalkPhase> = Readonly<{
    phase: Phase;
    admissionIndex: number;
    phaseObservationIndex: number;
    visitorIndex: number;
    registration: VisitorRegistrationMetadata;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `admissionIndex` | <code>number</code> |
| `phase` | <code>Phase</code> |
| `phaseObservationIndex` | <code>number</code> |
| `registration` | <code>Readonly&lt;TraversalVisitorFunctionOptions &amp; { addedIndex: number; visitorGroup?: Readonly&lt;{ identity: symbol; explicit: boolean; commandCommitMode: CommandCommitMode; }&gt; &#124; undefined; }&gt;</code> |
| `visitorIndex` | <code>number</code> |

</details>

<a id="symbol-GraphWalkVisitorResult"></a>

### GraphWalkVisitorResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkVisitorResult = void | {
    commands?: readonly TraversalVisitorCommand<VertexTypes, TraversalVisitorCommandName.PAUSE_TRAVERSAL | TraversalVisitorCommandName.NOOP>[];
};
```

<a id="symbol-HintVertexId"></a>

### HintVertexId

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-traversal) · [Related example](reference.md#dag-traversal)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type HintVertexId<ID = unknown> = {
    vertexId: ID;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `vertexId` | <code>ID</code> |

</details>

<a id="symbol-InOrderOptions"></a>

### InOrderOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export type InOrderOptions = {
    afterChildIndices: ChildIndexSelection;
    fallbackChildIndices: ChildIndexSelection;
    visitSingleChildParent: boolean;
    visitAfterOmittedChildren: boolean;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `afterChildIndices` | <code>ChildIndexSelection</code> |
| `fallbackChildIndices` | <code>ChildIndexSelection</code> |
| `visitAfterOmittedChildren` | <code>boolean</code> |
| `visitSingleChildParent` | <code>boolean</code> |

</details>

<a id="symbol-InspectionFilters"></a>

### InspectionFilters

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Executable snippet](reference.md#inspection-and-execution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type InspectionFilters<Phase extends string = VisitPhase, EmittedKind extends string = EmissionKind<Phase>> = Readonly<{
    emitEvents: readonly EmittedKind[];
    visitorPhases: VisitorPhaseSelection<Phase>;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `emitEvents` | <code>readonly EmittedKind[]</code> |
| `visitorPhases` | <code>VisitorPhaseSelection&lt;Phase&gt;</code> |

</details>

<a id="symbol-MaterializedDagInput"></a>

### MaterializedDagInput

Type-only; no runtime constructor/value. [Owning contract](reference.md#collection-and-forest-sources) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/quickstart-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/sources`.

```ts
export type MaterializedDagInput<Item, ID> = {
    traversableGraph: {
        /** Captured catalog lookup accepts any rewritten live-data domain. */
        resolveChild: <R extends VertexTypes>(hint: ID, options: DagChildResolutionContext<VertexTypes<Item, ID>, R, ID>) => DagVertexResolution<VertexTypes<Item, ID>, ID>;
    } & DagDiscoverySource<VertexTypes<Item, ID>, VertexTypes<Item, ID>, ID>;
    syntheticRoot: true;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `syntheticRoot` | <code>true</code> |
| `traversableGraph` | <code>{ resolveChild: &lt;R extends VertexTypes&lt;unknown, unknown&gt;&gt;(hint: ID, options: DagChildResolutionContext&lt;VertexTypes&lt;Item, ID&gt;, R, ID&gt;) =&gt; DagVertexResolution&lt;VertexTypes&lt;Item, ID&gt;, ID&gt;; } &amp; DagDiscoverySource&lt;VertexTypes&lt;Item, ID&gt;, VertexTypes&lt;Item, ID&gt;, ID&gt;</code> |

</details>

<a id="symbol-MaybePromise"></a>

### MaybePromise

Type-only; no runtime constructor/value. [Owning contract](reference.md#async-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/async-adapter-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type MaybePromise<T> = T | PromiseLike<T>;
```

<a id="symbol-MutableRef"></a>

### MutableRef

Runtime value and public type surface. [Owning contract](reference.md#views-handles-identity-and-paths) · [Executable snippet](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export declare class MutableRef<T> {
constructor(ref: T);
getValue(): T;
setValue(ref: T): void;
getRefId(): string;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getRefId` | <code>() =&gt; string</code> |
| `getValue` | <code>() =&gt; T</code> |
| `setValue` | <code>(ref: T) =&gt; void</code> |

</details>

<a id="symbol-MutationCommand"></a>

### MutationCommand

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type MutationCommand<TTP extends VertexTypes, Delete extends DeletionCommandName = DeletionCommandName> = TraversalVisitorCommand<TTP, Delete | TraversalVisitorCommandName.REWRITE_VERTEX_DATA | TraversalVisitorCommandName.NOOP>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `commandArguments` | <code>{ newData: TTP["VertexData"]; } &#124; TraversalVisitorCommandArguments&lt;TTP, TTP["VertexHint"]&gt;[Delete] &#124; undefined</code> |
| `commandName` | <code>TraversalVisitorCommandName.NOOP &#124; TraversalVisitorCommandName.REWRITE_VERTEX_DATA &#124; Delete</code> |

</details>

<a id="symbol-MutationCommandBuilder"></a>

### MutationCommandBuilder

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type MutationCommandBuilder<OUT_TTP extends VertexTypes, RewriteInput = OUT_TTP['VertexData'], Delete extends DeletionCommandName = DeletionCommandName> = (request?: MutationRequest<RewriteInput>) => MutationCommand<OUT_TTP, Delete>;
```

<a id="symbol-MutationCommands"></a>

### MutationCommands

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type MutationCommands<OUT_TTP extends VertexTypes, RewriteInput = OUT_TTP['VertexData'], Delete extends DeletionCommandName = DeletionCommandName> = {
    makeMutationCommand: MutationCommandBuilder<OUT_TTP, RewriteInput, Delete>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `makeMutationCommand` | <code>MutationCommandBuilder&lt;OUT_TTP, RewriteInput, Delete&gt;</code> |

</details>

<a id="symbol-MutationRequest"></a>

### MutationRequest

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type MutationRequest<RW_V> = {
    kind: 'rewrite';
    value: RW_V;
    patch?: never;
} | {
    kind: 'delete';
    value?: never;
    patch?: never;
} | {
    kind: 'keep';
    value?: never;
    patch?: never;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"rewrite" &#124; "delete" &#124; "keep"</code> |
| `patch` | <code>undefined</code> |
| `value` | <code>RW_V &#124; undefined</code> |

</details>

<a id="symbol-ObjectAssemblyCache"></a>

### ObjectAssemblyCache

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectAssemblyCache<Key> = {
    has: (key: Key) => boolean;
    get: (key: Key) => unknown;
    set: (key: Key, value: unknown) => unknown;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `get` | <code>(key: Key) =&gt; unknown</code> |
| `has` | <code>(key: Key) =&gt; boolean</code> |
| `set` | <code>(key: Key, value: unknown) =&gt; unknown</code> |

</details>

<a id="symbol-ObjectChildHookResult"></a>

### ObjectChildHookResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#traverse-an-object) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectChildHookResult<T extends VertexTypes> = {
    kind: 'useDefault';
    vertexId?: never;
    dependsOnWork?: never;
    dependsOnSubgraphCompletion?: never;
    satisfiesDependencies?: never;
} | TreeVertexFound<T> | TreeVertexOmitted;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `dependsOnSubgraphCompletion` | <code>undefined</code> |
| `dependsOnWork` | <code>undefined</code> |
| `kind` | <code>"found" &#124; "omitted" &#124; "useDefault"</code> |
| `satisfiesDependencies` | <code>undefined</code> |
| `vertexId` | <code>undefined</code> |

</details>

<a id="symbol-ObjectCompositeClassification"></a>

### ObjectCompositeClassification

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](reference.md#rewrite-objects)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectCompositeClassification = {
    isComposite: boolean;
    isArray: boolean;
    isObject: boolean;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `isArray` | <code>boolean</code> |
| `isComposite` | <code>boolean</code> |
| `isObject` | <code>boolean</code> |

</details>

<a id="symbol-ObjectCurrentVertexTypes"></a>

### ObjectCurrentVertexTypes

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Executable snippet](reference.md#rewrite-objects)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectCurrentVertexTypes<InputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>, OutputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>> = VertexTypes<InputTypes['VertexData'] | OutputTypes['VertexData'] | (PropertyMetadata<InputTypes['VertexData'] | OutputTypes['VertexData']> & TraversableObjectProp<InputTypes['VertexData']['key'] | OutputTypes['VertexData']['key'], unknown>), InputTypes['VertexHint'] | OutputTypes['VertexHint']>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `VertexData` | <code>InputTypes["VertexData"] &#124; OutputTypes["VertexData"] &#124; ((PropertyMetadata&lt;InputTypes["VertexData"]&gt; &#124; PropertyMetadata&lt;OutputTypes["VertexData"]&gt;) &amp; TraversableObjectProp&lt;InputTypes["VertexData"]["key"] &#124; OutputTypes["VertexData"]["key"], unknown&gt;)</code> |
| `VertexHint` | <code>InputTypes["VertexHint"] &#124; OutputTypes["VertexHint"]</code> |

</details>

<a id="symbol-ObjectMutationBinder"></a>

### ObjectMutationBinder

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectMutationBinder<InputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>, OutputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>> = (...visitorArguments: Parameters<TreeVisitor<string, InputTypes, ObjectCurrentVertexTypes<InputTypes, OutputTypes>>>) => ObjectMutationCommands<OutputTypes, InputTypes>;
```

<a id="symbol-ObjectMutationBinderFactory"></a>

### ObjectMutationBinderFactory

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectMutationBinderFactory = <InputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>, OutputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>>(options?: ObjectMutationOptions<InputTypes, OutputTypes>) => ObjectMutationBinder<InputTypes, OutputTypes>;
```

<a id="symbol-ObjectMutationCommands"></a>

### ObjectMutationCommands

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectMutationCommands<OutputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>, InputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown> = OutputTypes> = ObjectCompositeClassification & {
    makeMutationCommand: (request?: ObjectMutationRequest<OutputTypes>) => MutationCommand<ObjectCurrentVertexTypes<InputTypes, OutputTypes>, TraversalVisitorCommandName.DELETE_TREE_SUBTREE>;
    assembleComposite: (saveToMap?: boolean) => unknown;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `assembleComposite` | <code>(saveToMap?: boolean &#124; undefined) =&gt; unknown</code> |
| `isArray` | <code>boolean</code> |
| `isComposite` | <code>boolean</code> |
| `isObject` | <code>boolean</code> |
| `makeMutationCommand` | <code>(request?: ObjectMutationRequest&lt;OutputTypes&gt; &#124; undefined) =&gt; MutationCommand&lt;ObjectCurrentVertexTypes&lt;InputTypes, OutputTypes&gt;, TraversalVisitorCommandName.DELETE_TREE_SUBTREE&gt;</code> |

</details>

<a id="symbol-ObjectMutationOptions"></a>

### ObjectMutationOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectMutationOptions<InputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>, OutputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>> = {
    arrayIndexPolicy?: 'compactInTraversalOrder' | 'preserveNumericKeys';
    propertyCollision?: 'error' | 'firstWins' | 'lastWins';
    isArray?: (vertexData: ObjectCurrentVertexTypes<InputTypes, OutputTypes>['VertexData']) => boolean;
    isObject?: (vertexData: ObjectCurrentVertexTypes<InputTypes, OutputTypes>['VertexData']) => boolean;
    assembleArray?: (processedChildren: ObjectCurrentVertexTypes<InputTypes, OutputTypes>['VertexData'][], vertexData: ObjectCurrentVertexTypes<InputTypes, OutputTypes>['VertexData'], visitorArguments: Parameters<TreeVisitor<string, InputTypes, ObjectCurrentVertexTypes<InputTypes, OutputTypes>>>, isCompositeAssertions: ObjectCompositeClassification) => unknown;
    assembleObject?: (processedChildren: ObjectCurrentVertexTypes<InputTypes, OutputTypes>['VertexData'][], vertexData: ObjectCurrentVertexTypes<InputTypes, OutputTypes>['VertexData'], visitorArguments: Parameters<TreeVisitor<string, InputTypes, ObjectCurrentVertexTypes<InputTypes, OutputTypes>>>, isCompositeAssertions: ObjectCompositeClassification) => unknown;
    assembledMap?: ObjectAssemblyCache<VertexHandle<ObjectCurrentVertexTypes<InputTypes, OutputTypes>>>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `arrayIndexPolicy` | <code>"compactInTraversalOrder" &#124; "preserveNumericKeys" &#124; undefined</code> |
| `assembleArray` | <code>((processedChildren: (InputTypes["VertexData"] &#124; OutputTypes["VertexData"] &#124; ((PropertyMetadata&lt;InputTypes["VertexData"]&gt; &#124; PropertyMetadata&lt;OutputTypes["VertexData"]&gt;) &amp; TraversableObjectProp&lt;InputTypes["VertexData"]["key"] &#124; OutputTypes["VertexData"]["key"], unknown&gt;))[], vertexData: InputTypes["VertexData"] &#124; OutputTypes["VertexData"] &#124; ((PropertyMetadata&lt;InputTypes["VertexData"]&gt; &#124; PropertyMetadata&lt;OutputTypes["VertexData"]&gt;) &amp; TraversableObjectProp&lt;InputTypes["VertexData"]["key"] &#124; OutputTypes["VertexData"]["key"], unknown&gt;), visitorArguments: [vertex: VertexView&lt;InputTypes &#124; ObjectCurrentVertexTypes&lt;InputTypes, OutputTypes&gt;&gt;, options: TreeVisitorContext&lt;string, InputTypes, ObjectCurrentVertexTypes&lt;InputTypes, OutputTypes&gt;&gt;], isCompositeAssertions: ObjectCompositeClassification) =&gt; unknown) &#124; undefined</code> |
| `assembleObject` | <code>((processedChildren: (InputTypes["VertexData"] &#124; OutputTypes["VertexData"] &#124; ((PropertyMetadata&lt;InputTypes["VertexData"]&gt; &#124; PropertyMetadata&lt;OutputTypes["VertexData"]&gt;) &amp; TraversableObjectProp&lt;InputTypes["VertexData"]["key"] &#124; OutputTypes["VertexData"]["key"], unknown&gt;))[], vertexData: InputTypes["VertexData"] &#124; OutputTypes["VertexData"] &#124; ((PropertyMetadata&lt;InputTypes["VertexData"]&gt; &#124; PropertyMetadata&lt;OutputTypes["VertexData"]&gt;) &amp; TraversableObjectProp&lt;InputTypes["VertexData"]["key"] &#124; OutputTypes["VertexData"]["key"], unknown&gt;), visitorArguments: [vertex: VertexView&lt;InputTypes &#124; ObjectCurrentVertexTypes&lt;InputTypes, OutputTypes&gt;&gt;, options: TreeVisitorContext&lt;string, InputTypes, ObjectCurrentVertexTypes&lt;InputTypes, OutputTypes&gt;&gt;], isCompositeAssertions: ObjectCompositeClassification) =&gt; unknown) &#124; undefined</code> |
| `assembledMap` | <code>ObjectAssemblyCache&lt;VertexHandle&lt;ObjectCurrentVertexTypes&lt;InputTypes, OutputTypes&gt;&gt;&gt; &#124; undefined</code> |
| `isArray` | <code>((vertexData: InputTypes["VertexData"] &#124; OutputTypes["VertexData"] &#124; ((PropertyMetadata&lt;InputTypes["VertexData"]&gt; &#124; PropertyMetadata&lt;OutputTypes["VertexData"]&gt;) &amp; TraversableObjectProp&lt;InputTypes["VertexData"]["key"] &#124; OutputTypes["VertexData"]["key"], unknown&gt;)) =&gt; boolean) &#124; undefined</code> |
| `isObject` | <code>((vertexData: InputTypes["VertexData"] &#124; OutputTypes["VertexData"] &#124; ((PropertyMetadata&lt;InputTypes["VertexData"]&gt; &#124; PropertyMetadata&lt;OutputTypes["VertexData"]&gt;) &amp; TraversableObjectProp&lt;InputTypes["VertexData"]["key"] &#124; OutputTypes["VertexData"]["key"], unknown&gt;)) =&gt; boolean) &#124; undefined</code> |
| `propertyCollision` | <code>"error" &#124; "firstWins" &#124; "lastWins" &#124; undefined</code> |

</details>

<a id="symbol-ObjectMutationRequest"></a>

### ObjectMutationRequest

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectMutationRequest<OutputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>> = {
    kind: 'rewrite';
    patch: ObjectPropertyPatch<OutputTypes>;
    value?: never;
} | {
    kind: 'delete';
    patch?: never;
    value?: never;
} | {
    kind: 'keep';
    patch?: never;
    value?: never;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"rewrite" &#124; "delete" &#124; "keep"</code> |
| `patch` | <code>Partial&lt;Pick&lt;OutputTypes["VertexData"], "key" &#124; "value"&gt;&gt; &#124; undefined</code> |
| `value` | <code>undefined</code> |

</details>

<a id="symbol-ObjectPropertyPatch"></a>

### ObjectPropertyPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectPropertyPatch<OutputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>> = Partial<Pick<OutputTypes['VertexData'], 'key' | 'value'>>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `key` | <code>OutputTypes["VertexData"]["key"] &#124; undefined</code> |
| `value` | <code>OutputTypes["VertexData"]["value"] &#124; undefined</code> |

</details>

<a id="symbol-ObjectRewriteCallback"></a>

### ObjectRewriteCallback

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export type ObjectRewriteCallback<InK extends TraversableObjectPropKey, InV, OutK extends TraversableObjectPropKey, OutV> = (prop: ObjectRewriteInput<InK, InV, OutK, OutV>, context: ObjectRewriteContext<InK, InV, OutK, OutV>) => ObjectMutationRequest<ObjectTreeVertexTypes<OutK, OutV>> | undefined;
```

<a id="symbol-ObjectRewriteContext"></a>

### ObjectRewriteContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export type ObjectRewriteContext<InK extends TraversableObjectPropKey, InV, OutK extends TraversableObjectPropKey, OutV> = TreeVisitorContext<DepthFirstPhase.POST_ORDER, ObjectTreeVertexTypes<InK, InV>, ObjectCurrentVertexTypes<ObjectTreeVertexTypes<InK, InV>, ObjectTreeVertexTypes<OutK, OutV>>> & ObjectCompositeClassification & {
    vertex: VertexView<ObjectCurrentVertexTypes<ObjectTreeVertexTypes<InK, InV>, ObjectTreeVertexTypes<OutK, OutV>>>;
    getKeyPath: (options?: GetPathToOptions) => (InK | OutK)[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getKeyPath` | <code>(options?: GetPathToOptions &#124; undefined) =&gt; (InK &#124; OutK)[]</code> |
| `isArray` | <code>boolean</code> |
| `isComposite` | <code>boolean</code> |
| `isObject` | <code>boolean</code> |
| `isTreeRoot` | <code>boolean</code> |
| `originalTreeView` | <code>ResolvedTreeView&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;&gt; &#124; null</code> |
| `phase` | <code>DepthFirstPhase.POST_ORDER</code> |
| `phaseVisitIndex` | <code>number</code> |
| `previousPhaseVertexRef` | <code>VertexHandle&lt;ObjectTreeVertexTypes&lt;InK, InV&gt; &#124; ObjectCurrentVertexTypes&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectTreeVertexTypes&lt;OutK, OutV&gt;&gt;&gt; &#124; null</code> |
| `registration` | <code>Readonly&lt;TraversalVisitorFunctionOptions &amp; { addedIndex: number; visitorGroup?: Readonly&lt;{ identity: symbol; explicit: boolean; commandCommitMode: CommandCommitMode; }&gt; &#124; undefined; }&gt;</code> |
| `resolvedTreeView` | <code>ResolvedTreeView&lt;ObjectTreeVertexTypes&lt;InK, InV&gt; &#124; ObjectCurrentVertexTypes&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectTreeVertexTypes&lt;OutK, OutV&gt;&gt;&gt;</code> |
| `vertex` | <code>VertexView&lt;ObjectCurrentVertexTypes&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectTreeVertexTypes&lt;OutK, OutV&gt;&gt;&gt;</code> |
| `vertexRef` | <code>VertexHandle&lt;ObjectTreeVertexTypes&lt;InK, InV&gt; &#124; ObjectCurrentVertexTypes&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectTreeVertexTypes&lt;OutK, OutV&gt;&gt;&gt;</code> |
| `visitorChainState` | <code>unknown</code> |
| `visitorIndex` | <code>number</code> |

</details>

<a id="symbol-ObjectRewriteInput"></a>

### ObjectRewriteInput

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export type ObjectRewriteInput<InK extends TraversableObjectPropKey, InV, OutK extends TraversableObjectPropKey, OutV> = ObjectCurrentVertexTypes<ObjectTreeVertexTypes<InK, InV>, ObjectTreeVertexTypes<OutK, OutV>>['VertexData'] & {
    assembledComposite?: unknown;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `assembledComposite` | <code>unknown</code> |
| `key` | <code>InK &#124; OutK</code> |
| `value` | <code>unknown</code> |

</details>

<a id="symbol-ObjectRewriteOutputResult"></a>

### ObjectRewriteOutputResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export type ObjectRewriteOutputResult<Out> = Readonly<{
    kind: 'present';
    value: Out;
}> | Readonly<{
    kind: 'absent';
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"present" &#124; "absent"</code> |

</details>

<a id="symbol-ObjectTreeOptions"></a>

### ObjectTreeOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#traverse-an-object) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectTreeOptions<In, InK extends TraversableObjectPropKey, InV, OutK extends TraversableObjectPropKey, OutV> = ObjectTreeBaseOptions<In, InK, InV, OutK, OutV> & ([TraversableObjectPropKey, unknown] extends [InK, InV] ? unknown : ObjectTreePropertyAdapters<In, InK, InV>);
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getChildrenOfProperty` | <code>((prop: TraversableObjectProp&lt;InK, InV&gt;) =&gt; TraversableObjectProp&lt;InK, InV&gt;[]) &#124; undefined</code> |
| `getRootPropertyFromInputObject` | <code>((inputObj: In) =&gt; TraversableObjectProp&lt;InK, InV&gt;) &#124; undefined</code> |
| `resolveChildHook` | <code>((vertexHint: TraversableObjectProp&lt;InK, InV&gt;, context: TreeChildResolutionContext&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectCurrentVertexTypes&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectTreeVertexTypes&lt;OutK, OutV&gt;&gt;&gt;) =&gt; ObjectChildHookResult&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;&gt;) &#124; undefined</code> |

</details>

<a id="symbol-ObjectTreePropertyAdapters"></a>

### ObjectTreePropertyAdapters

Type-only; no runtime constructor/value. [Owning contract](reference.md#traverse-an-object) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectTreePropertyAdapters<In, InK extends TraversableObjectPropKey, InV> = Required<Pick<ObjectTreeBaseOptions<In, InK, InV, InK, InV>, 'getRootPropertyFromInputObject' | 'getChildrenOfProperty'>>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getChildrenOfProperty` | <code>(prop: TraversableObjectProp&lt;InK, InV&gt;) =&gt; TraversableObjectProp&lt;InK, InV&gt;[]</code> |
| `getRootPropertyFromInputObject` | <code>(inputObj: In) =&gt; TraversableObjectProp&lt;InK, InV&gt;</code> |

</details>

<a id="symbol-ObjectTreeSource"></a>

### ObjectTreeSource

Runtime value and public type surface. [Owning contract](reference.md#traverse-an-object) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export declare class ObjectTreeSource<In = TraversableObject<TraversableObjectPropKey, unknown>, InK extends TraversableObjectPropKey = TraversableObjectPropKey, InV = unknown, OutK extends TraversableObjectPropKey = InK, OutV = InV> implements TreeSource<ObjectTreeVertexTypes<InK, InV>, ObjectCurrentVertexTypes<ObjectTreeVertexTypes<InK, InV>, ObjectTreeVertexTypes<OutK, OutV>>> {
readonly rootObject: In;
static getChildrenOfPropertyDefault: typeof getChildrenOfPropertyDefault;
static createRootPropertyMapper: typeof createRootPropertyMapper;
static fromProperties<In, InK extends TraversableObjectPropKey, InV, OutK extends TraversableObjectPropKey = InK, OutV = InV>(rootObject: In, options: ObjectTreeBaseOptions<In, InK, InV, OutK, OutV> & ObjectTreePropertyAdapters<In, InK, InV>): ObjectTreeSource<In, InK, InV, OutK, OutV>;
constructor(rootObject: In, options: ObjectTreeBaseOptions<In, InK, InV, OutK, OutV> & ObjectTreePropertyAdapters<In, InK, InV>);
constructor(rootObject: In, ...args: [TraversableObjectPropKey, unknown] extends [InK, InV] ? [options?: ObjectTreeOptions<In, InK, InV, OutK, OutV>] : [options: ObjectTreeOptions<In, InK, InV, OutK, OutV>]);
static createObjectMutationBinder: ObjectMutationBinderFactory;
resolveRoot(): TreeVertexFound<ObjectTreeVertexTypes<InK, InV>>;
resolveChild(vertexHint: ObjectTreeVertexTypes<InK, InV>['VertexHint'], options: TreeChildResolutionContext<ObjectTreeVertexTypes<InK, InV>, ObjectCurrentVertexTypes<ObjectTreeVertexTypes<InK, InV>, ObjectTreeVertexTypes<OutK, OutV>>>): TreeVertexResolution<ObjectTreeVertexTypes<InK, InV>>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `resolveChild` | <code>(vertexHint: TraversableObjectProp&lt;InK, InV&gt;, options: TreeChildResolutionContext&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectCurrentVertexTypes&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectTreeVertexTypes&lt;OutK, OutV&gt;&gt;&gt;) =&gt; TreeVertexResolution&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;&gt;</code> |
| `resolveRoot` | <code>() =&gt; TreeVertexFound&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;&gt;</code> |
| `rootObject` | <code>In</code> |

</details>

<a id="symbol-ObjectTreeVertexTypes"></a>

### ObjectTreeVertexTypes

Type-only; no runtime constructor/value. [Owning contract](reference.md#traverse-an-object) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectTreeVertexTypes<K extends TraversableObjectPropKey, V> = VertexTypes<TraversableObjectProp<K, V>, TraversableObjectProp<K, V>>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `VertexData` | <code>TraversableObjectProp&lt;K, V&gt;</code> |
| `VertexHint` | <code>TraversableObjectProp&lt;K, V&gt;</code> |

</details>

<a id="symbol-OriginalGraphView"></a>

### OriginalGraphView

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type OriginalGraphView<T extends VertexTypes, ID = unknown> = Pick<ResolvedGraphView<T, ID>, 'has' | 'getRoot' | 'getVertexRefs' | 'getVertexRefById' | 'requireVertexId' | 'getParentsOf' | 'getChildrenOf' | 'requirePathsTo'>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getChildrenOf` | <code>(ref: VertexHandle&lt;T&gt;) =&gt; readonly VertexHandle&lt;T&gt;[] &#124; null</code> |
| `getParentsOf` | <code>(ref: VertexHandle&lt;T&gt;) =&gt; readonly VertexHandle&lt;T&gt;[] &#124; null</code> |
| `getRoot` | <code>() =&gt; VertexHandle&lt;T&gt; &#124; null</code> |
| `getVertexRefById` | <code>(id: ID) =&gt; VertexHandle&lt;T&gt; &#124; null</code> |
| `getVertexRefs` | <code>() =&gt; readonly VertexHandle&lt;T&gt;[]</code> |
| `has` | <code>(ref: VertexHandle&lt;T&gt;) =&gt; boolean</code> |
| `requirePathsTo` | <code>(ref: VertexHandle&lt;T&gt;, options?: GetPathToOptions &#124; undefined) =&gt; readonly (readonly VertexHandle&lt;T&gt;[])[]</code> |
| `requireVertexId` | <code>(ref: VertexHandle&lt;T&gt;) =&gt; ID</code> |

</details>

<a id="symbol-PrepareAsyncDagInput"></a>

### PrepareAsyncDagInput

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type PrepareAsyncDagInput<T extends VertexTypes, ID = unknown> = PrepareDagOptions & {
    traversableGraph: AsyncDagDiscoverySource<T, T, ID>;
    concurrency?: number;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `completedWork` | <code>undefined</code> |
| `concurrency` | <code>number &#124; undefined</code> |
| `dependsOnWorkDefault` | <code>"none" &#124; "discoveryParentWork" &#124; undefined</code> |
| `discovery` | <code>undefined</code> |
| `retainOriginalGraphStructure` | <code>undefined</code> |
| `rootWorkDependencies` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `syntheticRoot` | <code>boolean &#124; undefined</code> |
| `transformChildHints` | <code>undefined</code> |
| `traversableGraph` | <code>AsyncDagDiscoverySource&lt;T, T, ID&gt;</code> |
| `traversableTree` | <code>undefined</code> |
| `traversalRunnerInternalObjects` | <code>undefined</code> |
| `visitors` | <code>undefined</code> |
| `workCompletion` | <code>undefined</code> |

</details>

<a id="symbol-PrepareDagInput"></a>

### PrepareDagInput

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type PrepareDagInput<T extends VertexTypes, ID = unknown> = PrepareDagOptions & {
    traversableGraph: DagDiscoverySource<T, T, ID>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `completedWork` | <code>undefined</code> |
| `dependsOnWorkDefault` | <code>"none" &#124; "discoveryParentWork" &#124; undefined</code> |
| `discovery` | <code>undefined</code> |
| `retainOriginalGraphStructure` | <code>undefined</code> |
| `rootWorkDependencies` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `syntheticRoot` | <code>boolean &#124; undefined</code> |
| `transformChildHints` | <code>undefined</code> |
| `traversableGraph` | <code>DagDiscoverySource&lt;T, T, ID&gt;</code> |
| `traversableTree` | <code>undefined</code> |
| `traversalRunnerInternalObjects` | <code>undefined</code> |
| `visitors` | <code>undefined</code> |
| `workCompletion` | <code>undefined</code> |

</details>

<a id="symbol-PrepareDagOptions"></a>

### PrepareDagOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type PrepareDagOptions = {
    syntheticRoot?: boolean;
    rootWorkDependencies?: 'honor' | 'ignore';
    dependsOnWorkDefault?: 'none' | 'discoveryParentWork';
    traversableTree?: never;
    visitors?: never;
    completedWork?: never;
    traversalRunnerInternalObjects?: never;
    workCompletion?: never;
    discovery?: never;
    transformChildHints?: never;
    retainOriginalGraphStructure?: never;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `completedWork` | <code>undefined</code> |
| `dependsOnWorkDefault` | <code>"none" &#124; "discoveryParentWork" &#124; undefined</code> |
| `discovery` | <code>undefined</code> |
| `retainOriginalGraphStructure` | <code>undefined</code> |
| `rootWorkDependencies` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `syntheticRoot` | <code>boolean &#124; undefined</code> |
| `transformChildHints` | <code>undefined</code> |
| `traversableTree` | <code>undefined</code> |
| `traversalRunnerInternalObjects` | <code>undefined</code> |
| `visitors` | <code>undefined</code> |
| `workCompletion` | <code>undefined</code> |

</details>

<a id="symbol-PrepareDagResult"></a>

### PrepareDagResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#materialized-dag-definitions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type PrepareDagResult<Data, ID = unknown> = {
    kind: 'valid';
    dag: PreparedDag<Data, ID>;
} | {
    kind: 'invalid';
    issues: readonly DagDefinitionIssue<ID>[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"valid" &#124; "invalid"</code> |

</details>

<a id="symbol-PreparedAsyncDagRunnerOptions"></a>

### PreparedAsyncDagRunnerOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type PreparedAsyncDagRunnerOptions<Data, ID> = Pick<AsyncDagOptionsPatch<VertexTypes<Data, ID>, VertexTypes<Data, ID>, ID>, 'visitors' | 'completedWork' | 'workCompletion' | 'retainOriginalGraphStructure' | 'concurrency'> & OwnedOptions;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `completedWork` | <code>ReadonlySet&lt;ID&gt; &#124; undefined</code> |
| `concurrency` | <code>number &#124; undefined</code> |
| `dependsOnWorkDefault` | <code>undefined</code> |
| `discovery` | <code>undefined</code> |
| `retainOriginalGraphStructure` | <code>boolean &#124; undefined</code> |
| `rootWorkDependencies` | <code>undefined</code> |
| `syntheticRoot` | <code>undefined</code> |
| `transformChildHints` | <code>undefined</code> |
| `traversableGraph` | <code>undefined</code> |
| `traversableTree` | <code>undefined</code> |
| `traversalRunnerInternalObjects` | <code>undefined</code> |
| `visitors` | <code>VisitorInputs&lt;AsyncDagTraversalVisitors&lt;VertexTypes&lt;Data, ID&gt;, VertexTypes&lt;Data, ID&gt;, ID&gt;&gt; &#124; undefined</code> |
| `workCompletion` | <code>"afterWorkReadyChain" &#124; "externalSettlement" &#124; undefined</code> |

</details>

<a id="symbol-PreparedDag"></a>

### PreparedDag

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export interface PreparedDag<Data, ID = unknown> {
readonly liveVertexSummaries: readonly PreparedDagVertexSummary<Data, ID>[];
readonly definition: DagDefinition<Data, ID>;
createRunner(options?: PreparedDagRunnerOptions<Data, ID>): DagTraversalRunner<VertexTypes<Data, ID>, VertexTypes<Data, ID>, ID>;
createAsyncRunner(options?: PreparedAsyncDagRunnerOptions<Data, ID>): Promise<AsyncDagTraversalRunner<VertexTypes<Data, ID>, VertexTypes<Data, ID>, ID>>;
createWorkSession(options?: DagWorkSessionOptions<ID>): DagWorkSession<ID>;
createAsyncWorkSession(options?: AsyncDagWorkSessionOptions<ID>): Promise<AsyncDagWorkSession<ID>>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `createAsyncRunner` | <code>(options?: PreparedAsyncDagRunnerOptions&lt;Data, ID&gt; &#124; undefined) =&gt; Promise&lt;AsyncDagTraversalRunner&lt;VertexTypes&lt;Data, ID&gt;, VertexTypes&lt;Data, ID&gt;, ID&gt;&gt;</code> |
| `createAsyncWorkSession` | <code>(options?: AsyncDagWorkSessionOptions&lt;ID&gt; &#124; undefined) =&gt; Promise&lt;AsyncDagWorkSession&lt;ID&gt;&gt;</code> |
| `createRunner` | <code>(options?: PreparedDagRunnerOptions&lt;Data, ID&gt; &#124; undefined) =&gt; DagTraversalRunner&lt;VertexTypes&lt;Data, ID&gt;, VertexTypes&lt;Data, ID&gt;, ID&gt;</code> |
| `createWorkSession` | <code>(options?: DagWorkSessionOptions&lt;ID&gt; &#124; undefined) =&gt; DagWorkSession&lt;ID&gt;</code> |
| `definition` | <code>DagDefinition&lt;Data, ID&gt;</code> |
| `liveVertexSummaries` | <code>readonly Readonly&lt;{ vertexId: ID; data: Data; children: readonly ID[]; dependsOnWork: readonly ID[]; dependsOnSubgraphCompletion: readonly ID[]; }&gt;[]</code> |

</details>

<a id="symbol-PreparedDagRunnerOptions"></a>

### PreparedDagRunnerOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type PreparedDagRunnerOptions<Data, ID> = Pick<DagOptionsPatch<VertexTypes<Data, ID>, VertexTypes<Data, ID>, ID>, 'visitors' | 'completedWork' | 'workCompletion' | 'retainOriginalGraphStructure'> & OwnedOptions;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `completedWork` | <code>ReadonlySet&lt;ID&gt; &#124; undefined</code> |
| `dependsOnWorkDefault` | <code>undefined</code> |
| `discovery` | <code>undefined</code> |
| `retainOriginalGraphStructure` | <code>boolean &#124; undefined</code> |
| `rootWorkDependencies` | <code>undefined</code> |
| `syntheticRoot` | <code>undefined</code> |
| `transformChildHints` | <code>undefined</code> |
| `traversableGraph` | <code>undefined</code> |
| `traversableTree` | <code>undefined</code> |
| `traversalRunnerInternalObjects` | <code>undefined</code> |
| `visitors` | <code>VisitorInputs&lt;DagTraversalVisitors&lt;VertexTypes&lt;Data, ID&gt;, VertexTypes&lt;Data, ID&gt;, ID&gt;&gt; &#124; undefined</code> |
| `workCompletion` | <code>"afterWorkReadyChain" &#124; "externalSettlement" &#124; undefined</code> |

</details>

<a id="symbol-PreparedDagVertexSummary"></a>

### PreparedDagVertexSummary

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type PreparedDagVertexSummary<Data, ID> = Readonly<{
    vertexId: ID;
    data: Data;
    children: readonly ID[];
    dependsOnWork: readonly ID[];
    dependsOnSubgraphCompletion: readonly ID[];
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `children` | <code>readonly ID[]</code> |
| `data` | <code>Data</code> |
| `dependsOnSubgraphCompletion` | <code>readonly ID[]</code> |
| `dependsOnWork` | <code>readonly ID[]</code> |
| `vertexId` | <code>ID</code> |

</details>

<a id="symbol-PrerequisiteMissing"></a>

### PrerequisiteMissing

Type-only; no runtime constructor/value. [Owning contract](reference.md#discovery-and-completed-work) · [Executable snippet](reference.md#graph-source-result-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type PrerequisiteMissing = {
    kind: 'missing';
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"missing"</code> |

</details>

<a id="symbol-ResolvedGraphVertex"></a>

### ResolvedGraphVertex

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type ResolvedGraphVertex<T extends VertexTypes, ID = unknown> = Readonly<{
    vertexRef: VertexHandle<T>;
    vertex: VertexView<T>;
    vertexId: ID;
    discoveryDepth: number;
    dependsOnWork: readonly ID[];
    dependsOnSubgraphCompletion?: readonly ID[];
    visitStage: ResolvedVisitStage;
    incoming: readonly StructuralChildEdge<T>[];
    slots: readonly ChildSlot<T, ID>[];
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `dependsOnSubgraphCompletion` | <code>readonly ID[] &#124; undefined</code> |
| `dependsOnWork` | <code>readonly ID[]</code> |
| `discoveryDepth` | <code>number</code> |
| `incoming` | <code>readonly Readonly&lt;{ parentRef: VertexHandle&lt;T&gt;; childRef: VertexHandle&lt;T&gt;; hintIndex: number; hint: T["VertexHint"]; }&gt;[]</code> |
| `slots` | <code>readonly ChildSlot&lt;T, ID&gt;[]</code> |
| `vertex` | <code>VertexView&lt;T&gt;</code> |
| `vertexId` | <code>ID</code> |
| `vertexRef` | <code>VertexHandle&lt;T&gt;</code> |
| `visitStage` | <code>ResolvedVisitStage</code> |

</details>

<a id="symbol-ResolvedGraphView"></a>

### ResolvedGraphView

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface ResolvedGraphView<T extends VertexTypes, ID = unknown> {
get(ref: VertexHandle<T>): ResolvedGraphVertex<T, ID> | null;
has(ref: VertexHandle<T>): boolean;
getRoot(): VertexHandle<T> | null;
getVertexRefs(): readonly VertexHandle<T>[];
getVertexRefById(id: ID): VertexHandle<T> | null;
requireVertexId(ref: VertexHandle<T>): ID;
getVisitStageOf(ref: VertexHandle<T>): ResolvedVisitStage | null;
getParentsOf(ref: VertexHandle<T>): readonly VertexHandle<T>[] | null;
getChildrenOf(ref: VertexHandle<T>): readonly VertexHandle<T>[] | null;
requirePathsTo(ref: VertexHandle<T>, options?: GetPathToOptions): readonly (readonly VertexHandle<T>[])[];
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `get` | <code>(ref: VertexHandle&lt;T&gt;) =&gt; Readonly&lt;{ vertexRef: VertexHandle&lt;T&gt;; vertex: VertexView&lt;T&gt;; vertexId: ID; discoveryDepth: number; dependsOnWork: readonly ID[]; dependsOnSubgraphCompletion?: readonly ID[] &#124; undefined; visitStage: ResolvedVisitStage; incoming: readonly Readonly&lt;{ parentRef: VertexHandle&lt;T&gt;; childRef: VertexHandle&lt;T&gt;; hintIndex: number; hint: T["VertexHint"]; }&gt;[]; slots: readonly ChildSlot&lt;T, ID&gt;[]; }&gt; &#124; null</code> |
| `getChildrenOf` | <code>(ref: VertexHandle&lt;T&gt;) =&gt; readonly VertexHandle&lt;T&gt;[] &#124; null</code> |
| `getParentsOf` | <code>(ref: VertexHandle&lt;T&gt;) =&gt; readonly VertexHandle&lt;T&gt;[] &#124; null</code> |
| `getRoot` | <code>() =&gt; VertexHandle&lt;T&gt; &#124; null</code> |
| `getVertexRefById` | <code>(id: ID) =&gt; VertexHandle&lt;T&gt; &#124; null</code> |
| `getVertexRefs` | <code>() =&gt; readonly VertexHandle&lt;T&gt;[]</code> |
| `getVisitStageOf` | <code>(ref: VertexHandle&lt;T&gt;) =&gt; ResolvedVisitStage &#124; null</code> |
| `has` | <code>(ref: VertexHandle&lt;T&gt;) =&gt; boolean</code> |
| `requirePathsTo` | <code>(ref: VertexHandle&lt;T&gt;, options?: GetPathToOptions &#124; undefined) =&gt; readonly (readonly VertexHandle&lt;T&gt;[])[]</code> |
| `requireVertexId` | <code>(ref: VertexHandle&lt;T&gt;) =&gt; ID</code> |

</details>

<a id="symbol-ResolvedTreeMap"></a>

### ResolvedTreeMap

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type ResolvedTreeMap<TTP extends VertexTypes> = Map<MutableRef<Vertex<TTP>>, TreeVertexRecord<TTP>>;
```

<a id="symbol-ResolvedTreeStore"></a>

### ResolvedTreeStore

Runtime value and public type surface. [Owning contract](reference.md#views-handles-identity-and-paths) · [Executable snippet](reference.md#edit-a-resolved-tree-store)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export declare class ResolvedTreeStore<TTP extends VertexTypes> implements TreeSource<ResolvedTreeVertexTypes<TTP>> {
constructor();
asReadOnly(): ResolvedTreeView<TTP>;
getRoot(): MutableRef<Vertex<TTP>> | null;
setRoot(root: MutableRef<Vertex<TTP>>): void;
getResolvedGraphView(): ResolvedGraphView<TTP>;
getChildrenOf(vertexRef: MutableRef<Vertex<TTP>>): Array<MutableRef<Vertex<TTP>>> | null;
getParentOf(vertexRef: MutableRef<Vertex<TTP>>): MutableRef<Vertex<TTP>> | null;
deleteSubtree(vertexRef: MutableRef<Vertex<TTP>>): void;
has(vertexRef: MutableRef<Vertex<TTP>>): boolean;
get(vertexRef: MutableRef<Vertex<TTP>>): TreeVertexRecord<TTP> | null;
set(vertexRef: MutableRef<Vertex<TTP>>, vertexResolved: TreeVertexRecord<TTP>): void;
getResolutionContextOf(vertexRef: MutableRef<Vertex<TTP>>): InternalVertexResolutionContext<TTP> | null;
pushChildrenTo(vertexRef: MutableRef<Vertex<TTP>>, children: Array<MutableRef<Vertex<TTP>>>): void;
requirePathTo(vertexRef: MutableRef<Vertex<TTP>>, options?: GetPathToOptions): MutableRef<Vertex<TTP>>[];
resolveRoot(): TreeVertexResolution<ResolvedTreeVertexTypes<TTP>>;
resolveChild(vertexHint: ResolvedTreeVertexTypes<TTP>['VertexHint']): TreeVertexResolution<ResolvedTreeVertexTypes<TTP>>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `asReadOnly` | <code>() =&gt; ResolvedTreeView&lt;TTP&gt;</code> |
| `deleteSubtree` | <code>(vertexRef: MutableRef&lt;Vertex&lt;TTP&gt;&gt;) =&gt; void</code> |
| `get` | <code>(vertexRef: MutableRef&lt;Vertex&lt;TTP&gt;&gt;) =&gt; TreeVertexRecord&lt;TTP&gt; &#124; null</code> |
| `getChildrenOf` | <code>(vertexRef: MutableRef&lt;Vertex&lt;TTP&gt;&gt;) =&gt; MutableRef&lt;Vertex&lt;TTP&gt;&gt;[] &#124; null</code> |
| `getParentOf` | <code>(vertexRef: MutableRef&lt;Vertex&lt;TTP&gt;&gt;) =&gt; MutableRef&lt;Vertex&lt;TTP&gt;&gt; &#124; null</code> |
| `getResolutionContextOf` | <code>(vertexRef: MutableRef&lt;Vertex&lt;TTP&gt;&gt;) =&gt; InternalVertexResolutionContext&lt;TTP&gt; &#124; null</code> |
| `getResolvedGraphView` | <code>() =&gt; ResolvedGraphView&lt;TTP, unknown&gt;</code> |
| `getRoot` | <code>() =&gt; MutableRef&lt;Vertex&lt;TTP&gt;&gt; &#124; null</code> |
| `has` | <code>(vertexRef: MutableRef&lt;Vertex&lt;TTP&gt;&gt;) =&gt; boolean</code> |
| `pushChildrenTo` | <code>(vertexRef: MutableRef&lt;Vertex&lt;TTP&gt;&gt;, children: MutableRef&lt;Vertex&lt;TTP&gt;&gt;[]) =&gt; void</code> |
| `requirePathTo` | <code>(vertexRef: MutableRef&lt;Vertex&lt;TTP&gt;&gt;, options?: GetPathToOptions &#124; undefined) =&gt; MutableRef&lt;Vertex&lt;TTP&gt;&gt;[]</code> |
| `resolveChild` | <code>(vertexHint: MutableRef&lt;Vertex&lt;TTP&gt;&gt;) =&gt; TreeVertexResolution&lt;ResolvedTreeVertexTypes&lt;TTP&gt;&gt;</code> |
| `resolveRoot` | <code>() =&gt; TreeVertexResolution&lt;ResolvedTreeVertexTypes&lt;TTP&gt;&gt;</code> |
| `set` | <code>(vertexRef: MutableRef&lt;Vertex&lt;TTP&gt;&gt;, vertexResolved: TreeVertexRecord&lt;TTP&gt;) =&gt; void</code> |
| `setRoot` | <code>(root: MutableRef&lt;Vertex&lt;TTP&gt;&gt;) =&gt; void</code> |

</details>

<a id="symbol-ResolvedTreeVertexTypes"></a>

### ResolvedTreeVertexTypes

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface ResolvedTreeVertexTypes<InputTypes extends VertexTypes> {
VertexData: MutableRef<Vertex<InputTypes>>;
VertexHint: MutableRef<Vertex<InputTypes>>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `VertexData` | <code>MutableRef&lt;Vertex&lt;InputTypes&gt;&gt;</code> |
| `VertexHint` | <code>MutableRef&lt;Vertex&lt;InputTypes&gt;&gt;</code> |

</details>

<a id="symbol-ResolvedTreeView"></a>

### ResolvedTreeView

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface ResolvedTreeView<T extends VertexTypes> {
getRoot(): VertexHandle<T> | null;
has(ref: VertexHandle<T>): boolean;
getChildrenOf(ref: VertexHandle<T>): readonly VertexHandle<T>[] | null;
getParentOf(ref: VertexHandle<T>): VertexHandle<T> | null;
requirePathTo(ref: VertexHandle<T>, options?: GetPathToOptions): readonly VertexHandle<T>[];
getResolutionContextOf(ref: VertexHandle<T>): Readonly<VertexResolutionContext<T>> | null;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getChildrenOf` | <code>(ref: VertexHandle&lt;T&gt;) =&gt; readonly VertexHandle&lt;T&gt;[] &#124; null</code> |
| `getParentOf` | <code>(ref: VertexHandle&lt;T&gt;) =&gt; VertexHandle&lt;T&gt; &#124; null</code> |
| `getResolutionContextOf` | <code>(ref: VertexHandle&lt;T&gt;) =&gt; Readonly&lt;Readonly&lt;{ depth: number; parentVertex: VertexView&lt;T&gt;; parentVertexRef: VertexHandle&lt;T&gt;; hintIndex: number; vertexHint: T["VertexHint"]; }&gt;&gt; &#124; null</code> |
| `getRoot` | <code>() =&gt; VertexHandle&lt;T&gt; &#124; null</code> |
| `has` | <code>(ref: VertexHandle&lt;T&gt;) =&gt; boolean</code> |
| `requirePathTo` | <code>(ref: VertexHandle&lt;T&gt;, options?: GetPathToOptions &#124; undefined) =&gt; readonly VertexHandle&lt;T&gt;[]</code> |

</details>

<a id="symbol-ResolvedVisitStage"></a>

### ResolvedVisitStage

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type ResolvedVisitStage = 'DISCOVERED' | 'INITIAL_VISIT_ELIGIBLE' | 'INITIAL_VISIT_STARTED' | 'INITIAL_VISIT_COMMITTED' | 'COMPLETION_VISIT_ELIGIBLE' | 'COMPLETE';
```

<a id="symbol-RewriteObjectOptions"></a>

### RewriteObjectOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export type RewriteObjectOptions<In, InK extends TraversableObjectPropKey, InV, Out, OutK extends TraversableObjectPropKey, OutV> = ObjectTreeOptions<In, InK, InV, OutK, OutV> & Partial<ObjectMutationOptions<ObjectTreeVertexTypes<InK, InV>, ObjectTreeVertexTypes<OutK, OutV>> & Omit<DepthFirstTreeOptionsPatch<ObjectTreeVertexTypes<InK, InV>, ObjectCurrentVertexTypes<ObjectTreeVertexTypes<InK, InV>, ObjectTreeVertexTypes<OutK, OutV>>>, 'traversableTree'>> & {
    traversableTree?: never;
    rewrite?: ObjectRewriteCallback<InK, InV, OutK, OutV>;
    assembleCompositesBeforeRewrite?: boolean;
} & (unknown extends Out ? {
    convertRootValue?: RootValueConverter<Out>;
} : {
    convertRootValue: RootValueConverter<Out>;
});
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `arrayIndexPolicy` | <code>"compactInTraversalOrder" &#124; "preserveNumericKeys" &#124; undefined</code> |
| `assembleArray` | <code>((processedChildren: (TraversableObjectProp&lt;InK, InV&gt; &#124; TraversableObjectProp&lt;OutK, OutV&gt; &#124; ((Omit&lt;TraversableObjectProp&lt;InK, InV&gt;, "key" &#124; "value"&gt; &#124; Omit&lt;TraversableObjectProp&lt;OutK, OutV&gt;, "key" &#124; "value"&gt;) &amp; TraversableObjectProp&lt;InK &#124; OutK, unknown&gt;))[], vertexData: TraversableObjectProp&lt;InK, InV&gt; &#124; TraversableObjectProp&lt;OutK, OutV&gt; &#124; ((Omit&lt;TraversableObjectProp&lt;InK, InV&gt;, "key" &#124; "value"&gt; &#124; Omit&lt;TraversableObjectProp&lt;OutK, OutV&gt;, "key" &#124; "value"&gt;) &amp; TraversableObjectProp&lt;InK &#124; OutK, unknown&gt;), visitorArguments: [vertex: VertexView&lt;ObjectTreeVertexTypes&lt;InK, InV&gt; &#124; ObjectCurrentVertexTypes&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectTreeVertexTypes&lt;OutK, OutV&gt;&gt;&gt;, options: TreeVisitorContext&lt;string, ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectCurrentVertexTypes&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectTreeVertexTypes&lt;OutK, OutV&gt;&gt;&gt;], isCompositeAssertions: ObjectCompositeClassification) =&gt; unknown) &#124; undefined</code> |
| `assembleCompositesBeforeRewrite` | <code>boolean &#124; undefined</code> |
| `assembleObject` | <code>((processedChildren: (TraversableObjectProp&lt;InK, InV&gt; &#124; TraversableObjectProp&lt;OutK, OutV&gt; &#124; ((Omit&lt;TraversableObjectProp&lt;InK, InV&gt;, "key" &#124; "value"&gt; &#124; Omit&lt;TraversableObjectProp&lt;OutK, OutV&gt;, "key" &#124; "value"&gt;) &amp; TraversableObjectProp&lt;InK &#124; OutK, unknown&gt;))[], vertexData: TraversableObjectProp&lt;InK, InV&gt; &#124; TraversableObjectProp&lt;OutK, OutV&gt; &#124; ((Omit&lt;TraversableObjectProp&lt;InK, InV&gt;, "key" &#124; "value"&gt; &#124; Omit&lt;TraversableObjectProp&lt;OutK, OutV&gt;, "key" &#124; "value"&gt;) &amp; TraversableObjectProp&lt;InK &#124; OutK, unknown&gt;), visitorArguments: [vertex: VertexView&lt;ObjectTreeVertexTypes&lt;InK, InV&gt; &#124; ObjectCurrentVertexTypes&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectTreeVertexTypes&lt;OutK, OutV&gt;&gt;&gt;, options: TreeVisitorContext&lt;string, ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectCurrentVertexTypes&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectTreeVertexTypes&lt;OutK, OutV&gt;&gt;&gt;], isCompositeAssertions: ObjectCompositeClassification) =&gt; unknown) &#124; undefined</code> |
| `assembledMap` | <code>ObjectAssemblyCache&lt;VertexHandle&lt;ObjectCurrentVertexTypes&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectTreeVertexTypes&lt;OutK, OutV&gt;&gt;&gt;&gt; &#124; undefined</code> |
| `convertRootValue` | <code>RootValueConverter&lt;Out&gt; &#124; undefined</code> |
| `getChildrenOfProperty` | <code>((prop: TraversableObjectProp&lt;InK, InV&gt;) =&gt; TraversableObjectProp&lt;InK, InV&gt;[]) &#124; undefined</code> |
| `getRootPropertyFromInputObject` | <code>((inputObj: In) =&gt; TraversableObjectProp&lt;InK, InV&gt;) &#124; undefined</code> |
| `inOrder` | <code>InOrderOptionsPatch &#124; undefined</code> |
| `isArray` | <code>((vertexData: TraversableObjectProp&lt;InK, InV&gt; &#124; TraversableObjectProp&lt;OutK, OutV&gt; &#124; ((Omit&lt;TraversableObjectProp&lt;InK, InV&gt;, "key" &#124; "value"&gt; &#124; Omit&lt;TraversableObjectProp&lt;OutK, OutV&gt;, "key" &#124; "value"&gt;) &amp; TraversableObjectProp&lt;InK &#124; OutK, unknown&gt;)) =&gt; boolean) &#124; undefined</code> |
| `isObject` | <code>((vertexData: TraversableObjectProp&lt;InK, InV&gt; &#124; TraversableObjectProp&lt;OutK, OutV&gt; &#124; ((Omit&lt;TraversableObjectProp&lt;InK, InV&gt;, "key" &#124; "value"&gt; &#124; Omit&lt;TraversableObjectProp&lt;OutK, OutV&gt;, "key" &#124; "value"&gt;) &amp; TraversableObjectProp&lt;InK &#124; OutK, unknown&gt;)) =&gt; boolean) &#124; undefined</code> |
| `propertyCollision` | <code>"error" &#124; "firstWins" &#124; "lastWins" &#124; undefined</code> |
| `resolveChildHook` | <code>((vertexHint: TraversableObjectProp&lt;InK, InV&gt;, context: TreeChildResolutionContext&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectCurrentVertexTypes&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectTreeVertexTypes&lt;OutK, OutV&gt;&gt;&gt;) =&gt; ObjectChildHookResult&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;&gt;) &#124; undefined</code> |
| `retainOriginalTreeStructure` | <code>boolean &#124; undefined</code> |
| `rewrite` | <code>ObjectRewriteCallback&lt;InK, InV, OutK, OutV&gt; &#124; undefined</code> |
| `transformChildHints` | <code>ChildHintTransformer&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;&gt; &#124; null &#124; undefined</code> |
| `traversableTree` | <code>undefined</code> |
| `visitors` | <code>VisitorInputs&lt;DepthFirstTraversalVisitors&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectCurrentVertexTypes&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectTreeVertexTypes&lt;OutK, OutV&gt;&gt;&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-RewriteObjectResult"></a>

### RewriteObjectResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export type RewriteObjectResult<InK extends TraversableObjectPropKey, InV, Out, OutK extends TraversableObjectPropKey, OutV> = {
    /** Converted output captured at return, possibly partial before completion. */
    outputResultAtReturn: ObjectRewriteOutputResult<Out>;
    /** Final converted output; throws until the runner has finished. */
    getOutputResult(): ObjectRewriteOutputResult<Out>;
    traversalRunner: DepthFirstTreeRunner<ObjectTreeVertexTypes<InK, InV>, ObjectCurrentVertexTypes<ObjectTreeVertexTypes<InK, InV>, ObjectTreeVertexTypes<OutK, OutV>>>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getOutputResult` | <code>() =&gt; ObjectRewriteOutputResult&lt;Out&gt;</code> |
| `outputResultAtReturn` | <code>ObjectRewriteOutputResult&lt;Out&gt;</code> |
| `traversalRunner` | <code>DepthFirstTreeRunner&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectCurrentVertexTypes&lt;ObjectTreeVertexTypes&lt;InK, InV&gt;, ObjectTreeVertexTypes&lt;OutK, OutV&gt;&gt;&gt;</code> |

</details>

<a id="symbol-RootValueConverter"></a>

### RootValueConverter

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export type RootValueConverter<Out> = (value: unknown, context: {
    readonly complete: boolean;
}) => Out;
```

<a id="symbol-SelectedTraversalEvent"></a>

### SelectedTraversalEvent

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Related example](reference.md#inspection-and-execution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type SelectedTraversalEvent<Event, Kind extends string> = [
    Kind
] extends [never] ? never : Event extends {
    kind: string;
} ? Event & {
    readonly kind: `${Kind}`;
} : Event extends {
    phase: string;
} ? Event & {
    readonly phase: Kind;
} : Event;
```

<a id="symbol-StructuralChildEdge"></a>

### StructuralChildEdge

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type StructuralChildEdge<T extends VertexTypes> = Readonly<{
    parentRef: VertexHandle<T>;
    childRef: VertexHandle<T>;
    hintIndex: number;
    hint: T['VertexHint'];
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `childRef` | <code>VertexHandle&lt;T&gt;</code> |
| `hint` | <code>T["VertexHint"]</code> |
| `hintIndex` | <code>number</code> |
| `parentRef` | <code>VertexHandle&lt;T&gt;</code> |

</details>

<a id="symbol-SyncTraversalExecution"></a>

### SyncTraversalExecution

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Executable snippet](reference.md#inspection-and-execution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface SyncTraversalExecution<Phase extends string, Event, Inspection extends ExecutionInspection = ExecutionInspection, EmittedKind extends string = EmissionKind<Phase>> extends TraversalExecutionState<Inspection> {
iterateEvents: {
        (): Generator<Event, void, unknown>;
        <Kind extends EmittedKind>(config: TraversalExecutionOptions<Phase, Kind> & {
            emitEvents: readonly Kind[];
        }): Generator<SelectedTraversalEvent<Event, Kind>, void, unknown>;
        (config?: TraversalExecutionOptions<Phase, EmittedKind>): Generator<Event, void, unknown>;
    };
run: (config?: TraversalExecutionOptions<Phase, EmittedKind>) => this;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `inspect` | <code>() =&gt; Inspection</code> |
| `isHalted` | <code>() =&gt; boolean</code> |
| `iterateEvents` | <code>{ (): Generator&lt;Event, void, unknown&gt;; &lt;Kind extends EmittedKind&gt;(config: TraversalExecutionOptions&lt;Phase, Kind&gt; &amp; { emitEvents: readonly Kind[]; }): Generator&lt;SelectedTraversalEvent&lt;Event, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionOptions&lt;Phase, EmittedKind&gt; &#124; undefined): Generator&lt;Event, void, unknown&gt;; }</code> |
| `requestPause` | <code>() =&gt; boolean</code> |
| `run` | <code>(config?: TraversalExecutionOptions&lt;Phase, EmittedKind&gt; &#124; undefined) =&gt; SyncTraversalExecution&lt;Phase, Event, Inspection, EmittedKind&gt;</code> |

</details>

<a id="symbol-TraversableObject"></a>

### TraversableObject

Type-only; no runtime constructor/value. [Owning contract](reference.md#traverse-an-object) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type TraversableObject<K extends TraversableObjectPropKey, PV> = Array<TraversableObject<K, PV> | PV> | {
    [KK in K]: TraversableObject<K, PV> | PV;
};
```

<a id="symbol-TraversableObjectProp"></a>

### TraversableObjectProp

Type-only; no runtime constructor/value. [Owning contract](reference.md#traverse-an-object) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type TraversableObjectProp<K extends TraversableObjectPropKey, V> = {
    key: K;
    value: V;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `key` | <code>K</code> |
| `value` | <code>V</code> |

</details>

<a id="symbol-TraversableObjectPropKey"></a>

### TraversableObjectPropKey

Type-only; no runtime constructor/value. [Owning contract](reference.md#traverse-an-object) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type TraversableObjectPropKey = number | string | symbol;
```

<a id="symbol-TraversalExecutionOptions"></a>

### TraversalExecutionOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/event-delivery-selection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TraversalExecutionOptions<VisitorPhase extends string, EmittedKind extends string = EmissionKind<VisitorPhase>> = {
    emitEvents?: readonly EmittedKind[] | undefined;
    visitorPhases?: VisitorPhaseSelection<VisitorPhase> | {
        include: undefined;
        exclude?: never;
    } | {
        exclude: undefined;
        include?: never;
    } | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `emitEvents` | <code>readonly EmittedKind[] &#124; undefined</code> |
| `visitorPhases` | <code>VisitorPhaseSelection&lt;VisitorPhase&gt; &#124; { include: undefined; exclude?: undefined; } &#124; { exclude: undefined; include?: undefined; } &#124; undefined</code> |

</details>

<a id="symbol-TraversalExecutionState"></a>

### TraversalExecutionState

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Executable snippet](reference.md#inspection-and-execution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface TraversalExecutionState<Inspection extends ExecutionInspection = ExecutionInspection> {
getStatus(): TraversalRunnerStatus;
getStopReason(): TraversalStopReason | null;
isHalted(): boolean;
inspect(): Inspection;
requestPause(): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `inspect` | <code>() =&gt; Inspection</code> |
| `isHalted` | <code>() =&gt; boolean</code> |
| `requestPause` | <code>() =&gt; boolean</code> |

</details>

<a id="symbol-TraversalRunnerStatus"></a>

### TraversalRunnerStatus

Runtime value and public type surface. [Owning contract](reference.md#inspection-and-execution) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-reconciliation-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export declare enum TraversalRunnerStatus {
INITIAL = "INITIAL"
RUNNING = "RUNNING"
HALTED = "HALTED"
FINISHED = "FINISHED"
FAILED = "FAILED"
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `FAILED` | <code>TraversalRunnerStatus.FAILED</code> |
| `FINISHED` | <code>TraversalRunnerStatus.FINISHED</code> |
| `HALTED` | <code>TraversalRunnerStatus.HALTED</code> |
| `INITIAL` | <code>TraversalRunnerStatus.INITIAL</code> |
| `RUNNING` | <code>TraversalRunnerStatus.RUNNING</code> |

</details>

<a id="symbol-TraversalStopReason"></a>

### TraversalStopReason

Type-only; no runtime constructor/value. [Owning contract](reference.md#pause-and-resume) · [Related example](reference.md#pause-and-resume)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TraversalStopReason = 'prepared' | 'paused' | 'awaitingSettlement' | 'finished' | 'failed';
```

<a id="symbol-TraversalVisitorCommand"></a>

### TraversalVisitorCommand

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TraversalVisitorCommand<RW_TTP extends VertexTypes, T extends TraversalVisitorCommandName = TraversalVisitorCommandName, SourceHint = RW_TTP['VertexHint']> = {
    [Name in T]: {
        commandName: Name;
    } & ([
        TraversalVisitorCommandArguments<RW_TTP, SourceHint>[Name]
    ] extends [never] ? {
        commandArguments?: never;
    } : {
        commandArguments: TraversalVisitorCommandArguments<RW_TTP, SourceHint>[Name];
    });
}[T];
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `commandArguments` | <code>TraversalVisitorCommandArguments&lt;RW_TTP, SourceHint&gt;[T] &#124; undefined</code> |
| `commandName` | <code>T</code> |

</details>

<a id="symbol-TraversalVisitorCommandArguments"></a>

### TraversalVisitorCommandArguments

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TraversalVisitorCommandArguments<RW_TTP extends VertexTypes, SourceHint = RW_TTP['VertexHint']> = {
    [TraversalVisitorCommandName.NOOP]: never;
    [TraversalVisitorCommandName.DEFER_WORK_COMPLETION]: never;
    [TraversalVisitorCommandName.REWRITE_CHILD_HINTS]: {
        newHints: readonly SourceHint[];
    };
    [TraversalVisitorCommandName.PAUSE_TRAVERSAL]: never;
    [TraversalVisitorCommandName.DELETE_TREE_SUBTREE]: never;
    [TraversalVisitorCommandName.DELETE_DAG_VERTEX_CASCADE]: never;
    [TraversalVisitorCommandName.SET_VISITOR_CHAIN_STATE]: {
        state: unknown;
    };
    [TraversalVisitorCommandName.REWRITE_VERTEX_DATA]: {
        newData: RW_TTP['VertexData'];
    };
    [TraversalVisitorCommandName.SKIP_REMAINING_CHILDREN]: never;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `DEFER_WORK_COMPLETION` | <code>never</code> |
| `DELETE_DAG_VERTEX_CASCADE` | <code>never</code> |
| `DELETE_TREE_SUBTREE` | <code>never</code> |
| `NOOP` | <code>never</code> |
| `PAUSE_TRAVERSAL` | <code>never</code> |
| `REWRITE_CHILD_HINTS` | <code>{ newHints: readonly SourceHint[]; }</code> |
| `REWRITE_VERTEX_DATA` | <code>{ newData: RW_TTP["VertexData"]; }</code> |
| `SET_VISITOR_CHAIN_STATE` | <code>{ state: unknown; }</code> |
| `SKIP_REMAINING_CHILDREN` | <code>never</code> |

</details>

<a id="symbol-TraversalVisitorCommandName"></a>

### TraversalVisitorCommandName

Runtime value and public type surface. [Owning contract](reference.md#visitors-and-commands) · [Executable snippet](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export declare enum TraversalVisitorCommandName {
NOOP = "NOOP"
DEFER_WORK_COMPLETION = "DEFER_WORK_COMPLETION"
REWRITE_CHILD_HINTS = "REWRITE_CHILD_HINTS"
PAUSE_TRAVERSAL = "PAUSE_TRAVERSAL"
DELETE_TREE_SUBTREE = "DELETE_TREE_SUBTREE"
DELETE_DAG_VERTEX_CASCADE = "DELETE_DAG_VERTEX_CASCADE"
SET_VISITOR_CHAIN_STATE = "SET_VISITOR_CHAIN_STATE"
REWRITE_VERTEX_DATA = "REWRITE_VERTEX_DATA"
SKIP_REMAINING_CHILDREN = "SKIP_REMAINING_CHILDREN"
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `DEFER_WORK_COMPLETION` | <code>TraversalVisitorCommandName.DEFER_WORK_COMPLETION</code> |
| `DELETE_DAG_VERTEX_CASCADE` | <code>TraversalVisitorCommandName.DELETE_DAG_VERTEX_CASCADE</code> |
| `DELETE_TREE_SUBTREE` | <code>TraversalVisitorCommandName.DELETE_TREE_SUBTREE</code> |
| `NOOP` | <code>TraversalVisitorCommandName.NOOP</code> |
| `PAUSE_TRAVERSAL` | <code>TraversalVisitorCommandName.PAUSE_TRAVERSAL</code> |
| `REWRITE_CHILD_HINTS` | <code>TraversalVisitorCommandName.REWRITE_CHILD_HINTS</code> |
| `REWRITE_VERTEX_DATA` | <code>TraversalVisitorCommandName.REWRITE_VERTEX_DATA</code> |
| `SET_VISITOR_CHAIN_STATE` | <code>TraversalVisitorCommandName.SET_VISITOR_CHAIN_STATE</code> |
| `SKIP_REMAINING_CHILDREN` | <code>TraversalVisitorCommandName.SKIP_REMAINING_CHILDREN</code> |

</details>

<a id="symbol-TraversalVisitorFunctionOptions"></a>

### TraversalVisitorFunctionOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TraversalVisitorFunctionOptions = {
    priority: number;
    commandCommitMode?: CommandCommitMode | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `commandCommitMode` | <code>CommandCommitMode &#124; undefined</code> |
| `priority` | <code>number</code> |

</details>

<a id="symbol-TraversalVisitorResult"></a>

### TraversalVisitorResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TraversalVisitorResult<RW_TTP extends VertexTypes, Phase extends string = string, Family extends 'tree' | 'dag' = 'tree' | 'dag', SourceHint = RW_TTP['VertexHint']> = {
    commands?: TraversalVisitorCommand<RW_TTP, CommonCommand | (Family extends 'tree' ? TraversalVisitorCommandName.DELETE_TREE_SUBTREE : TraversalVisitorCommandName.DELETE_DAG_VERTEX_CASCADE) | ([Phase] extends ['PRE_ORDER' | 'LEVEL_ORDER' | 'ON_WORK_READY'] ? HintCommand : never), SourceHint>[];
} | ([Phase] extends ['ON_WORK_READY'] ? {
    commands: [
        TraversalVisitorCommand<RW_TTP, TraversalVisitorCommandName.DEFER_WORK_COMPLETION, SourceHint>
    ];
} : never);
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `commands` | <code>TraversalVisitorCommand&lt;RW_TTP, CommonCommand &#124; (Family extends "tree" ? TraversalVisitorCommandName.DELETE_TREE_SUBTREE : TraversalVisitorCommandName.DELETE_DAG_VERTEX_CASCADE) &#124; ([Phase] extends ["ON_WORK_READY" &#124; "PRE_ORDER" &#124; "LEVEL_ORDER"] ? TraversalVisitorCommandName.REWRITE_CHILD_HINTS : never), SourceHint&gt;[] &#124; [{ commandName: TraversalVisitorCommandName.DEFER_WORK_COMPLETION; } &amp; { commandArguments?: undefined; }] &#124; undefined</code> |

</details>

<a id="symbol-TreeChildResolutionContext"></a>

### TreeChildResolutionContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Related example](reference.md#source-callback-contexts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeChildResolutionContext<TTP extends VertexTypes, RW_TTP extends VertexTypes> = {
    resolutionContext: VertexResolutionContext<TTP | RW_TTP>;
    resolvedTreeView: ResolvedTreeView<TTP | RW_TTP>;
    originalTreeView: ResolvedTreeView<TTP> | null;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `originalTreeView` | <code>ResolvedTreeView&lt;TTP&gt; &#124; null</code> |
| `resolutionContext` | <code>Readonly&lt;{ depth: number; parentVertex: VertexView&lt;TTP &#124; RW_TTP&gt;; parentVertexRef: VertexHandle&lt;TTP &#124; RW_TTP&gt;; hintIndex: number; vertexHint: (TTP &#124; RW_TTP)["VertexHint"]; }&gt;</code> |
| `resolvedTreeView` | <code>ResolvedTreeView&lt;TTP &#124; RW_TTP&gt;</code> |

</details>

<a id="symbol-TreeDagExecutionInspection"></a>

### TreeDagExecutionInspection

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Related example](reference.md#inspection-and-execution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeDagExecutionInspection<Phase extends string = VisitPhase> = DriverInspection<Phase> & Readonly<{
    bufferedEventCount: number;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `bufferedEventCount` | <code>number</code> |
| `chains` | <code>readonly Readonly&lt;{ owner: Readonly&lt;OwnerToken&gt;; vertexRefId: string; phase: Phase; state: "paused" &#124; "invalid" &#124; "done" &#124; "running"; commandCommitMode: CommandCommitMode; visitorIndex: number; waitingFor: "none" &#124; "callback" &#124; "batch"; executionOptions: Readonly&lt;{ emitEvents: readonly EmissionKind&lt;Phase&gt;[]; visitorPhases: VisitorPhaseSelection&lt;Phase&gt;; }&gt;; }&gt;[]</code> |
| `concurrency` | <code>number</code> |
| `execution` | <code>"sync" &#124; "async"</code> |
| `executionOptions` | <code>Readonly&lt;{ emitEvents: readonly EmissionKind&lt;Phase&gt;[]; visitorPhases: VisitorPhaseSelection&lt;Phase&gt;; }&gt;</code> |
| `frames` | <code>readonly Readonly&lt;{ owner: Readonly&lt;OwnerToken&gt;; vertexRefId: string; stage: "closed" &#124; DepthFirstFrameStage &#124; "identify" &#124; "resolve"; pendingIndices: readonly number[]; }&gt;[]</code> |
| `hasHintIds` | <code>boolean</code> |
| `hasHintTransformer` | <code>boolean</code> |
| `inFlightCallbackCount` | <code>number</code> |
| `kind` | <code>"dag" &#124; "depth-first" &#124; "breadth-first"</code> |
| `pauseRequested` | <code>boolean</code> |
| `pendingEventBoundaryCount` | <code>number</code> |
| `pendingRequests` | <code>readonly Readonly&lt;{ requestId: number; operation: TreeDagInspectionOperation; owner: Readonly&lt;OwnerToken&gt;; valid: boolean; }&gt;[]</code> |
| `readyVisits` | <code>readonly Readonly&lt;{ vertexRefId: string; phase: Phase; }&gt;[]</code> |
| `sourceMode` | <code>"graph" &#124; "tree"</code> |
| `status` | <code>TraversalRunnerStatus</code> |
| `stopReason` | <code>TraversalStopReason &#124; null</code> |

</details>

<a id="symbol-TreeDagInspectionOperation"></a>

### TreeDagInspectionOperation

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Related example](reference.md#inspection-and-execution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeDagInspectionOperation = 'resolveRoot' | 'resolveChild' | 'resolvePrerequisite' | 'transformChildHints' | 'getVertexIdFromHint' | 'visit';
```

<a id="symbol-TreeMutationCommandBinder"></a>

### TreeMutationCommandBinder

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeMutationCommandBinder<Phase extends string, IN_TTP extends VertexTypes, OUT_TTP extends VertexTypes, RewriteInput = OUT_TTP['VertexData']> = (...visitorArguments: Parameters<TreeVisitor<Phase, IN_TTP, OUT_TTP>>) => MutationCommands<OUT_TTP, RewriteInput, TraversalVisitorCommandName.DELETE_TREE_SUBTREE>;
```

<a id="symbol-TreeMutationCommandBinderFactory"></a>

### TreeMutationCommandBinderFactory

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeMutationCommandBinderFactory<Configuration = unknown> = <Phase extends string, IN_TTP extends VertexTypes, OUT_TTP extends VertexTypes, RewriteInput = OUT_TTP['VertexData']>(options?: Configuration) => TreeMutationCommandBinder<Phase, IN_TTP, OUT_TTP, RewriteInput>;
```

<a id="symbol-TreeSource"></a>

### TreeSource

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeSource<TTP extends VertexTypes, RW_TTP extends VertexTypes = TTP> = {
    resolveRoot: () => TreeVertexResolution<TTP>;
    resolveChild: (vertexHint: TTP['VertexHint'], options: TreeChildResolutionContext<TTP, RW_TTP>) => TreeVertexResolution<TTP>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `resolveChild` | <code>(vertexHint: TTP["VertexHint"], options: TreeChildResolutionContext&lt;TTP, RW_TTP&gt;) =&gt; TreeVertexResolution&lt;TTP&gt;</code> |
| `resolveRoot` | <code>() =&gt; TreeVertexResolution&lt;TTP&gt;</code> |

</details>

<a id="symbol-TreeTraversalEvent"></a>

### TreeTraversalEvent

Type-only; no runtime constructor/value. [Owning contract](reference.md#traversal-orders) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-iterable-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeTraversalEvent<Phase extends string, TTP extends VertexTypes, RW_TTP extends VertexTypes> = {
    vertex: VertexView<TTP | RW_TTP>;
    vertexRef: VertexHandle<TTP | RW_TTP>;
    phase: Phase;
    isTreeRoot: boolean;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `isTreeRoot` | <code>boolean</code> |
| `phase` | <code>Phase</code> |
| `vertex` | <code>VertexView&lt;TTP &#124; RW_TTP&gt;</code> |
| `vertexRef` | <code>VertexHandle&lt;TTP &#124; RW_TTP&gt;</code> |

</details>

<a id="symbol-TreeVertexFound"></a>

### TreeVertexFound

Type-only; no runtime constructor/value. [Owning contract](reference.md#abstract-trees) · [Related example](reference.md#abstract-trees)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVertexFound<T extends VertexTypes> = TreeMetadataRestrictions & {
    kind: 'found';
    vertex: TreeMetadataRestrictions & {
        vertexContent: VertexContentInput<T>;
    };
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `dependsOnSubgraphCompletion` | <code>undefined</code> |
| `dependsOnWork` | <code>undefined</code> |
| `identity` | <code>undefined</code> |
| `kind` | <code>"found"</code> |
| `satisfiesDependencies` | <code>undefined</code> |
| `vertex` | <code>TreeMetadataRestrictions &amp; { vertexContent: VertexContentInput&lt;T&gt;; }</code> |
| `vertexId` | <code>undefined</code> |

</details>

<a id="symbol-TreeVertexMetadata"></a>

### TreeVertexMetadata

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVertexMetadata<TTP extends VertexTypes> = {
    resolutionContext: InternalVertexResolutionContext<TTP> | null;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `resolutionContext` | <code>InternalVertexResolutionContext&lt;TTP&gt; &#124; null</code> |

</details>

<a id="symbol-TreeVertexOmitted"></a>

### TreeVertexOmitted

Type-only; no runtime constructor/value. [Owning contract](reference.md#abstract-trees) · [Executable snippet](migration-uniform-api.md#source-resolution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVertexOmitted = TreeMetadataRestrictions & {
    kind: 'omitted';
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `dependsOnSubgraphCompletion` | <code>undefined</code> |
| `dependsOnWork` | <code>undefined</code> |
| `identity` | <code>undefined</code> |
| `kind` | <code>"omitted"</code> |
| `satisfiesDependencies` | <code>undefined</code> |
| `vertexId` | <code>undefined</code> |

</details>

<a id="symbol-TreeVertexRecord"></a>

### TreeVertexRecord

Runtime value and public type surface. [Owning contract](reference.md#views-handles-identity-and-paths) · [Executable snippet](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export declare class TreeVertexRecord<TTP extends VertexTypes> implements TreeVertexRecordContent<TTP> {
readonly metadata: TreeVertexMetadata<TTP>;
readonly children: MutableRef<Vertex<TTP>>[];
constructor(vertexContent: TreeVertexRecordContent<TTP>);
pushChildren(children: Array<MutableRef<Vertex<TTP>>>): void;
getResolutionContext(): InternalVertexResolutionContext<TTP> | null;
setResolutionContext(resolutionContext: InternalVertexResolutionContext<TTP> | null): void;
getChildren(): MutableRef<Vertex<TTP>>[];
getParent(): MutableRef<Vertex<TTP>> | null;
clone(content?: Partial<TreeVertexRecordContent<TTP>>): TreeVertexRecord<TTP>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `children` | <code>MutableRef&lt;Vertex&lt;TTP&gt;&gt;[]</code> |
| `clone` | <code>(content?: Partial&lt;TreeVertexRecordContent&lt;TTP&gt;&gt; &#124; undefined) =&gt; TreeVertexRecord&lt;TTP&gt;</code> |
| `getChildren` | <code>() =&gt; MutableRef&lt;Vertex&lt;TTP&gt;&gt;[]</code> |
| `getParent` | <code>() =&gt; MutableRef&lt;Vertex&lt;TTP&gt;&gt; &#124; null</code> |
| `getResolutionContext` | <code>() =&gt; InternalVertexResolutionContext&lt;TTP&gt; &#124; null</code> |
| `metadata` | <code>TreeVertexMetadata&lt;TTP&gt;</code> |
| `pushChildren` | <code>(children: MutableRef&lt;Vertex&lt;TTP&gt;&gt;[]) =&gt; void</code> |
| `setResolutionContext` | <code>(resolutionContext: InternalVertexResolutionContext&lt;TTP&gt; &#124; null) =&gt; void</code> |

</details>

<a id="symbol-TreeVertexRecordContent"></a>

### TreeVertexRecordContent

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVertexRecordContent<TTP extends VertexTypes> = {
    metadata: TreeVertexMetadata<TTP>;
    children: MutableRef<Vertex<TTP>>[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `children` | <code>MutableRef&lt;Vertex&lt;TTP&gt;&gt;[]</code> |
| `metadata` | <code>TreeVertexMetadata&lt;TTP&gt;</code> |

</details>

<a id="symbol-TreeVertexResolution"></a>

### TreeVertexResolution

Type-only; no runtime constructor/value. [Owning contract](reference.md#abstract-trees) · [Related example](reference.md#abstract-trees)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVertexResolution<T extends VertexTypes> = TreeVertexFound<T> | TreeVertexOmitted;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `dependsOnSubgraphCompletion` | <code>undefined</code> |
| `dependsOnWork` | <code>undefined</code> |
| `identity` | <code>undefined</code> |
| `kind` | <code>"found" &#124; "omitted"</code> |
| `satisfiesDependencies` | <code>undefined</code> |
| `vertexId` | <code>undefined</code> |

</details>

<a id="symbol-TreeVisitor"></a>

### TreeVisitor

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Executable snippet](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVisitor<Phase extends string = string, TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP> = TraversalVisitorResult<RW_TTP, Phase, 'tree', TTP['VertexHint']> extends infer RESULT ? (vertex: VertexView<TTP | RW_TTP>, options: TreeVisitorContext<Phase, TTP, RW_TTP>) => RESULT | undefined | void : never;
```

<a id="symbol-TreeVisitorContext"></a>

### TreeVisitorContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVisitorContext<Phase extends string, TTP extends VertexTypes, RW_TTP extends VertexTypes> = {
    resolvedTreeView: ResolvedTreeView<TTP | RW_TTP>;
    originalTreeView: ResolvedTreeView<TTP> | null;
    phaseVisitIndex: number;
    visitorIndex: number;
    previousPhaseVertexRef: VertexHandle<TTP | RW_TTP> | null;
    isTreeRoot: boolean;
    vertexRef: VertexHandle<TTP | RW_TTP>;
    visitorChainState: unknown;
    registration: VisitorRegistrationMetadata;
    phase: Phase;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `isTreeRoot` | <code>boolean</code> |
| `originalTreeView` | <code>ResolvedTreeView&lt;TTP&gt; &#124; null</code> |
| `phase` | <code>Phase</code> |
| `phaseVisitIndex` | <code>number</code> |
| `previousPhaseVertexRef` | <code>VertexHandle&lt;TTP &#124; RW_TTP&gt; &#124; null</code> |
| `registration` | <code>Readonly&lt;TraversalVisitorFunctionOptions &amp; { addedIndex: number; visitorGroup?: Readonly&lt;{ identity: symbol; explicit: boolean; commandCommitMode: CommandCommitMode; }&gt; &#124; undefined; }&gt;</code> |
| `resolvedTreeView` | <code>ResolvedTreeView&lt;TTP &#124; RW_TTP&gt;</code> |
| `vertexRef` | <code>VertexHandle&lt;TTP &#124; RW_TTP&gt;</code> |
| `visitorChainState` | <code>unknown</code> |
| `visitorIndex` | <code>number</code> |

</details>

<a id="symbol-TreeVisitorRecord"></a>

### TreeVisitorRecord

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVisitorRecord<Phase extends string, TTP extends VertexTypes, RW_TTP extends VertexTypes> = VisitorRecord<TreeVisitor<Phase, TTP, RW_TTP>>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `addedIndex` | <code>number</code> |
| `commandCommitMode` | <code>CommandCommitMode &#124; undefined</code> |
| `priority` | <code>number</code> |
| `visitor` | <code>TreeVisitor&lt;Phase, TTP, RW_TTP&gt;</code> |
| `visitorGroup` | <code>Readonly&lt;{ identity: symbol; explicit: boolean; commandCommitMode: CommandCommitMode; }&gt; &#124; undefined</code> |

</details>

<a id="symbol-Vertex"></a>

### Vertex

Runtime value and public type surface. [Owning contract](reference.md#views-handles-identity-and-paths) · [Executable snippet](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export declare class Vertex<TTP extends VertexTypes> implements VertexContent<TTP> {
readonly $data: TTP['VertexData'];
readonly $childHints: TTP['VertexHint'][];
constructor(vertexContent: VertexContentInput<TTP>);
getData(): TTP['VertexData'];
getChildHints(): TTP['VertexHint'][];
hasNoChildHints(): boolean;
clone(content?: VertexCloneContent<TTP>): Vertex<TTP>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `$childHints` | <code>TTP["VertexHint"][]</code> |
| `$data` | <code>TTP["VertexData"]</code> |
| `clone` | <code>(content?: Partial&lt;VertexContentInput&lt;TTP&gt;&gt; &#124; undefined) =&gt; Vertex&lt;TTP&gt;</code> |
| `getChildHints` | <code>() =&gt; TTP["VertexHint"][]</code> |
| `getData` | <code>() =&gt; TTP["VertexData"]</code> |
| `hasNoChildHints` | <code>() =&gt; boolean</code> |

</details>

<a id="symbol-VertexCloneContent"></a>

### VertexCloneContent

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexCloneContent<TTP extends VertexTypes> = Partial<VertexContentInput<TTP>>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `$c` | <code>undefined</code> |
| `$childHints` | <code>readonly TTP["VertexHint"][] &#124; undefined</code> |
| `$d` | <code>undefined</code> |
| `$data` | <code>TTP["VertexData"] &#124; undefined</code> |

</details>

<a id="symbol-VertexContent"></a>

### VertexContent

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexContent<TTP extends VertexTypes> = {
    $data: TTP['VertexData'];
    $childHints: TTP['VertexHint'][];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `$childHints` | <code>TTP["VertexHint"][]</code> |
| `$data` | <code>TTP["VertexData"]</code> |

</details>

<a id="symbol-VertexContentInput"></a>

### VertexContentInput

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexContentInput<TTP extends VertexTypes> = {
    $data: TTP['VertexData'];
    $childHints: readonly TTP['VertexHint'][];
    $d?: never;
    $c?: never;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `$c` | <code>undefined</code> |
| `$childHints` | <code>readonly TTP["VertexHint"][]</code> |
| `$d` | <code>undefined</code> |
| `$data` | <code>TTP["VertexData"]</code> |

</details>

<a id="symbol-VertexHandle"></a>

### VertexHandle

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface VertexHandle<T extends VertexTypes> {
getValue(): VertexView<T>;
getRefId(): string;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getRefId` | <code>() =&gt; string</code> |
| `getValue` | <code>() =&gt; VertexView&lt;T&gt;</code> |

</details>

<a id="symbol-VertexId"></a>

### VertexId

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexId = unknown;
```

<a id="symbol-VertexResolutionContext"></a>

### VertexResolutionContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Related example](reference.md#source-callback-contexts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexResolutionContext<T extends VertexTypes> = Readonly<{
    depth: number;
    parentVertex: VertexView<T>;
    parentVertexRef: VertexHandle<T>;
    hintIndex: number;
    vertexHint: T['VertexHint'];
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `depth` | <code>number</code> |
| `hintIndex` | <code>number</code> |
| `parentVertex` | <code>VertexView&lt;T&gt;</code> |
| `parentVertexRef` | <code>VertexHandle&lt;T&gt;</code> |
| `vertexHint` | <code>T["VertexHint"]</code> |

</details>

<a id="symbol-VertexTypes"></a>

### VertexTypes

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/async-adapter-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexTypes<VD = unknown, VH = unknown> = {
    VertexData: VD;
    VertexHint: VH;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `VertexData` | <code>VD</code> |
| `VertexHint` | <code>VH</code> |

</details>

<a id="symbol-VertexView"></a>

### VertexView

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface VertexView<T extends VertexTypes> {
readonly $data: T['VertexData'];
readonly $childHints: readonly T['VertexHint'][];
getData(): T['VertexData'];
getChildHints(): readonly T['VertexHint'][];
hasNoChildHints(): boolean;
clone(content?: VertexCloneContent<T>): Vertex<T>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `$childHints` | <code>readonly T["VertexHint"][]</code> |
| `$data` | <code>T["VertexData"]</code> |
| `clone` | <code>(content?: Partial&lt;VertexContentInput&lt;T&gt;&gt; &#124; undefined) =&gt; Vertex&lt;T&gt;</code> |
| `getChildHints` | <code>() =&gt; readonly T["VertexHint"][]</code> |
| `getData` | <code>() =&gt; T["VertexData"]</code> |
| `hasNoChildHints` | <code>() =&gt; boolean</code> |

</details>

<a id="symbol-VisitorDefinition"></a>

### VisitorDefinition

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorDefinition<F> = F | ({
    visitor: F;
} & Partial<TraversalVisitorFunctionOptions>);
```

<a id="symbol-VisitorGroupDefinition"></a>

### VisitorGroupDefinition

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorGroupDefinition<F> = {
    visitors: readonly VisitorGroupMember<F>[];
    commandCommitMode?: CommandCommitMode;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `commandCommitMode` | <code>CommandCommitMode &#124; undefined</code> |
| `visitors` | <code>readonly VisitorGroupMember&lt;F&gt;[]</code> |

</details>

<a id="symbol-VisitorGroupMember"></a>

### VisitorGroupMember

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorGroupMember<F> = F | {
    visitor: F;
    priority?: number;
    commandCommitMode?: never;
    resolutionStyle?: never;
};
```

<a id="symbol-VisitorGroupMetadata"></a>

### VisitorGroupMetadata

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorGroupMetadata = Readonly<{
    identity: symbol;
    explicit: boolean;
    commandCommitMode: CommandCommitMode;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `commandCommitMode` | <code>CommandCommitMode</code> |
| `explicit` | <code>boolean</code> |
| `identity` | <code>symbol</code> |

</details>

<a id="symbol-VisitorPhaseInput"></a>

### VisitorPhaseInput

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Executable snippet](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorPhaseInput<F> = VisitorDefinition<F> | readonly VisitorDefinition<F>[] | {
    groups: readonly VisitorGroupDefinition<F>[];
};
```

<a id="symbol-VisitorPhaseSelection"></a>

### VisitorPhaseSelection

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/event-delivery-selection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorPhaseSelection<ORDER extends string> = 'all' | {
    include: readonly ORDER[];
    exclude?: never;
} | {
    exclude: readonly ORDER[];
    include?: never;
};
```

<a id="symbol-VisitorRegistrationMetadata"></a>

### VisitorRegistrationMetadata

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorRegistrationMetadata = Readonly<TraversalVisitorFunctionOptions & {
    addedIndex: number;
    visitorGroup?: VisitorGroupMetadata | undefined;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `addedIndex` | <code>number</code> |
| `commandCommitMode` | <code>CommandCommitMode &#124; undefined</code> |
| `priority` | <code>number</code> |
| `visitorGroup` | <code>Readonly&lt;{ identity: symbol; explicit: boolean; commandCommitMode: CommandCommitMode; }&gt; &#124; undefined</code> |

</details>

<a id="symbol-bindAsyncDagWorkSession"></a>

### bindAsyncDagWorkSession

Runtime value and public type surface. [Owning contract](reference.md#ticket-coordination) · [Related example](reference.md#bind-an-existing-runner-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function bindAsyncDagWorkSession<T extends VertexTypes, R extends VertexTypes, ID>(runner: AsyncDagTraversalRunner<T, R, ID>): AsyncDagWorkSession<ID>;
```

<a id="symbol-bindDagWorkSession"></a>

### bindDagWorkSession

Runtime value and public type surface. [Owning contract](reference.md#ticket-coordination) · [Executable snippet](reference.md#bind-an-existing-runner-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function bindDagWorkSession<T extends VertexTypes, R extends VertexTypes, ID>(runner: DagTraversalRunner<T, R, ID>): DagWorkSession<ID>;
```

<a id="symbol-breadthFirstTraversal"></a>

### breadthFirstTraversal

Runtime value and public type surface. [Owning contract](reference.md#api-compatibility) · [Related example](reference.md#api-compatibility)

Supported imports: `configurable-tree-traversal`.

Namespace for `configurable-tree-traversal/traversals/breadth-first-traversal`: [AsyncBreadthFirstTreeOptions](#symbol-AsyncBreadthFirstTreeOptions), [AsyncBreadthFirstTreeOptionsPatch](#symbol-AsyncBreadthFirstTreeOptionsPatch), [AsyncBreadthFirstTreeRunner](#symbol-AsyncBreadthFirstTreeRunner), [AsyncBreadthFirstTreeTraversal](#symbol-AsyncBreadthFirstTreeTraversal), [BreadthFirstPhase](#symbol-BreadthFirstPhase), [BreadthFirstTreeOptions](#symbol-BreadthFirstTreeOptions), [BreadthFirstTreeOptionsPatch](#symbol-BreadthFirstTreeOptionsPatch), [BreadthFirstTreeRunner](#symbol-BreadthFirstTreeRunner), [BreadthFirstTreeTraversal](#symbol-BreadthFirstTreeTraversal), [traverseTreeBreadthFirst](#symbol-traverseTreeBreadthFirst), [traverseTreeBreadthFirstAsync](#symbol-traverseTreeBreadthFirstAsync).

<a id="symbol-composeDag"></a>

### composeDag

Runtime value and public type surface. [Owning contract](reference.md#dag-fragments-and-composition) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function composeDag<Data, ID>(instances: readonly DagFragment<Data, ID>[], options?: DagCompositionOptions<InferredDagId<ID>>): PrepareDagResult<Data, ID>;
```

<a id="symbol-core"></a>

### core

Runtime value and public type surface. [Owning contract](reference.md#api-compatibility) · [Executable snippet](reference.md#api-compatibility)

Supported imports: `configurable-tree-traversal`.

Namespace for `configurable-tree-traversal/core`: [AsyncChildHintTransformer](#symbol-AsyncChildHintTransformer), [AsyncDagDiscoverySource](#symbol-AsyncDagDiscoverySource), [AsyncTraversalExecution](#symbol-AsyncTraversalExecution), [AsyncTreeSource](#symbol-AsyncTreeSource), [AsyncTreeVisitor](#symbol-AsyncTreeVisitor), [ChildHintTransformer](#symbol-ChildHintTransformer), [ChildSlot](#symbol-ChildSlot), [CommandCommitMode](#symbol-CommandCommitMode), [DagChildResolutionContext](#symbol-DagChildResolutionContext), [DagDiscoveryCycleError](#symbol-DagDiscoveryCycleError), [DagDiscoverySource](#symbol-DagDiscoverySource), [DagMilestone](#symbol-DagMilestone), [DagPrerequisiteResolution](#symbol-DagPrerequisiteResolution), [DagTraversalStallDiagnostics](#symbol-DagTraversalStallDiagnostics), [DagTraversalStallError](#symbol-DagTraversalStallError), [DagVertexFound](#symbol-DagVertexFound), [DagVertexOmitted](#symbol-DagVertexOmitted), [DagVertexResolution](#symbol-DagVertexResolution), [DagWaitEdge](#symbol-DagWaitEdge), [EmissionKind](#symbol-EmissionKind), [ExecutionInspection](#symbol-ExecutionInspection), [GetPathToOptions](#symbol-GetPathToOptions), [HintVertexId](#symbol-HintVertexId), [InspectionFilters](#symbol-InspectionFilters), [MaybePromise](#symbol-MaybePromise), [MutableRef](#symbol-MutableRef), [MutationCommand](#symbol-MutationCommand), [MutationCommandBuilder](#symbol-MutationCommandBuilder), [MutationCommands](#symbol-MutationCommands), [MutationRequest](#symbol-MutationRequest), [OriginalGraphView](#symbol-OriginalGraphView), [PrerequisiteMissing](#symbol-PrerequisiteMissing), [ResolvedGraphVertex](#symbol-ResolvedGraphVertex), [ResolvedGraphView](#symbol-ResolvedGraphView), [ResolvedTreeMap](#symbol-ResolvedTreeMap), [ResolvedTreeStore](#symbol-ResolvedTreeStore), [ResolvedTreeVertexTypes](#symbol-ResolvedTreeVertexTypes), [ResolvedTreeView](#symbol-ResolvedTreeView), [ResolvedVisitStage](#symbol-ResolvedVisitStage), [SelectedTraversalEvent](#symbol-SelectedTraversalEvent), [StructuralChildEdge](#symbol-StructuralChildEdge), [SyncTraversalExecution](#symbol-SyncTraversalExecution), [TraversalExecutionOptions](#symbol-TraversalExecutionOptions), [TraversalExecutionState](#symbol-TraversalExecutionState), [TraversalRunnerStatus](#symbol-TraversalRunnerStatus), [TraversalStopReason](#symbol-TraversalStopReason), [TraversalVisitorCommand](#symbol-TraversalVisitorCommand), [TraversalVisitorCommandArguments](#symbol-TraversalVisitorCommandArguments), [TraversalVisitorCommandName](#symbol-TraversalVisitorCommandName), [TraversalVisitorFunctionOptions](#symbol-TraversalVisitorFunctionOptions), [TraversalVisitorResult](#symbol-TraversalVisitorResult), [TreeChildResolutionContext](#symbol-TreeChildResolutionContext), [TreeDagExecutionInspection](#symbol-TreeDagExecutionInspection), [TreeDagInspectionOperation](#symbol-TreeDagInspectionOperation), [TreeMutationCommandBinder](#symbol-TreeMutationCommandBinder), [TreeMutationCommandBinderFactory](#symbol-TreeMutationCommandBinderFactory), [TreeSource](#symbol-TreeSource), [TreeTraversalEvent](#symbol-TreeTraversalEvent), [TreeVertexFound](#symbol-TreeVertexFound), [TreeVertexMetadata](#symbol-TreeVertexMetadata), [TreeVertexOmitted](#symbol-TreeVertexOmitted), [TreeVertexRecord](#symbol-TreeVertexRecord), [TreeVertexRecordContent](#symbol-TreeVertexRecordContent), [TreeVertexResolution](#symbol-TreeVertexResolution), [TreeVisitor](#symbol-TreeVisitor), [TreeVisitorContext](#symbol-TreeVisitorContext), [TreeVisitorRecord](#symbol-TreeVisitorRecord), [Vertex](#symbol-Vertex), [VertexCloneContent](#symbol-VertexCloneContent), [VertexContent](#symbol-VertexContent), [VertexContentInput](#symbol-VertexContentInput), [VertexHandle](#symbol-VertexHandle), [VertexId](#symbol-VertexId), [VertexResolutionContext](#symbol-VertexResolutionContext), [VertexTypes](#symbol-VertexTypes), [VertexView](#symbol-VertexView), [VisitorDefinition](#symbol-VisitorDefinition), [VisitorGroupDefinition](#symbol-VisitorGroupDefinition), [VisitorGroupMember](#symbol-VisitorGroupMember), [VisitorGroupMetadata](#symbol-VisitorGroupMetadata), [VisitorPhaseInput](#symbol-VisitorPhaseInput), [VisitorPhaseSelection](#symbol-VisitorPhaseSelection), [VisitorRegistrationMetadata](#symbol-VisitorRegistrationMetadata).

<a id="symbol-createObjectMutationBinder"></a>

### createObjectMutationBinder

Runtime value and public type surface. [Owning contract](reference.md#rewrite-objects) · [Executable snippet](reference.md#rewrite-objects)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
createObjectMutationBinder: ObjectMutationBinderFactory
```

<a id="symbol-dagTraversal"></a>

### dagTraversal

Runtime value and public type surface. [Owning contract](reference.md#api-compatibility) · [Related example](reference.md#api-compatibility)

Supported imports: `configurable-tree-traversal`.

Namespace for `configurable-tree-traversal/traversals/dag-traversal`: [AsyncDagOptions](#symbol-AsyncDagOptions), [AsyncDagOptionsPatch](#symbol-AsyncDagOptionsPatch), [AsyncDagTraversal](#symbol-AsyncDagTraversal), [AsyncDagTraversalRunner](#symbol-AsyncDagTraversalRunner), [AsyncDagVisitor](#symbol-AsyncDagVisitor), [AsyncDagWorkSession](#symbol-AsyncDagWorkSession), [AsyncDagWorkSessionOptions](#symbol-AsyncDagWorkSessionOptions), [DagBlocker](#symbol-DagBlocker), [DagCompositionOptions](#symbol-DagCompositionOptions), [DagDeferredWork](#symbol-DagDeferredWork), [DagDefinition](#symbol-DagDefinition), [DagDefinitionChangeAspect](#symbol-DagDefinitionChangeAspect), [DagDefinitionDiff](#symbol-DagDefinitionDiff), [DagDefinitionIssue](#symbol-DagDefinitionIssue), [DagDefinitionSlot](#symbol-DagDefinitionSlot), [DagDefinitionVertex](#symbol-DagDefinitionVertex), [DagDefinitionVertexChange](#symbol-DagDefinitionVertexChange), [DagDiscoveryCycleError](#symbol-DagDiscoveryCycleError), [DagEvent](#symbol-DagEvent), [DagExplanation](#symbol-DagExplanation), [DagFragment](#symbol-DagFragment), [DagFragmentValidationError](#symbol-DagFragmentValidationError), [DagMilestone](#symbol-DagMilestone), [DagMilestoneQueryOptions](#symbol-DagMilestoneQueryOptions), [DagMilestoneQueryResult](#symbol-DagMilestoneQueryResult), [DagMilestoneSnapshot](#symbol-DagMilestoneSnapshot), [DagMilestoneStatus](#symbol-DagMilestoneStatus), [DagOptions](#symbol-DagOptions), [DagOptionsPatch](#symbol-DagOptionsPatch), [DagRevisionOperation](#symbol-DagRevisionOperation), [DagRevisionResult](#symbol-DagRevisionResult), [DagSchedulingOptions](#symbol-DagSchedulingOptions), [DagSettlementGeneration](#symbol-DagSettlementGeneration), [DagSettlementOutcome](#symbol-DagSettlementOutcome), [DagSettlementReceipt](#symbol-DagSettlementReceipt), [DagSummary](#symbol-DagSummary), [DagTraversal](#symbol-DagTraversal), [DagTraversalRunner](#symbol-DagTraversalRunner), [DagTraversalStallDiagnostics](#symbol-DagTraversalStallDiagnostics), [DagTraversalStallError](#symbol-DagTraversalStallError), [DagVertexProgress](#symbol-DagVertexProgress), [DagVisitor](#symbol-DagVisitor), [DagVisitorContext](#symbol-DagVisitorContext), [DagVisitorPhase](#symbol-DagVisitorPhase), [DagWaitEdge](#symbol-DagWaitEdge), [DagWorkBoundary](#symbol-DagWorkBoundary), [DagWorkSession](#symbol-DagWorkSession), [DagWorkSessionControl](#symbol-DagWorkSessionControl), [DagWorkSessionOptions](#symbol-DagWorkSessionOptions), [DagWorkState](#symbol-DagWorkState), [DagWorkTicket](#symbol-DagWorkTicket), [PrepareAsyncDagInput](#symbol-PrepareAsyncDagInput), [PrepareDagInput](#symbol-PrepareDagInput), [PrepareDagOptions](#symbol-PrepareDagOptions), [PrepareDagResult](#symbol-PrepareDagResult), [PreparedAsyncDagRunnerOptions](#symbol-PreparedAsyncDagRunnerOptions), [PreparedDag](#symbol-PreparedDag), [PreparedDagRunnerOptions](#symbol-PreparedDagRunnerOptions), [PreparedDagVertexSummary](#symbol-PreparedDagVertexSummary), [bindAsyncDagWorkSession](#symbol-bindAsyncDagWorkSession), [bindDagWorkSession](#symbol-bindDagWorkSession), [composeDag](#symbol-composeDag), [defineDag](#symbol-defineDag), [defineDagFragment](#symbol-defineDagFragment), [diffDagDefinitions](#symbol-diffDagDefinitions), [filterAsyncDagDataVisitor](#symbol-filterAsyncDagDataVisitor), [filterDagDataVisitor](#symbol-filterDagDataVisitor), [hasSingleStructuralSink](#symbol-hasSingleStructuralSink), [inspectDagMilestones](#symbol-inspectDagMilestones), [mapDagFragmentIds](#symbol-mapDagFragmentIds), [prepareDag](#symbol-prepareDag), [prepareDagAsync](#symbol-prepareDagAsync), [prepareDagDefinition](#symbol-prepareDagDefinition), [reviseDag](#symbol-reviseDag), [traverseDag](#symbol-traverseDag), [traverseDagAsync](#symbol-traverseDagAsync).

<a id="symbol-defineDag"></a>

### defineDag

Runtime value and public type surface. [Owning contract](reference.md#materialized-dag-definitions) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function defineDag<Data, ID = unknown>(input: DagDefinition<Data, ID>): DagDefinition<Data, ID>;
```

<a id="symbol-defineDagFragment"></a>

### defineDagFragment

Runtime value and public type surface. [Owning contract](reference.md#dag-fragments-and-composition) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function defineDagFragment<Data, ID, Port extends string>(definition: DagDefinition<Data, ID>, ports: Readonly<Record<Port, InferredDagId<ID>>>): DagFragment<Data, ID, Port>;
```

<a id="symbol-depthFirstTraversal"></a>

### depthFirstTraversal

Runtime value and public type surface. [Owning contract](reference.md#api-compatibility) · [Related example](reference.md#api-compatibility)

Supported imports: `configurable-tree-traversal`.

Namespace for `configurable-tree-traversal/traversals/depth-first-traversal`: [AsyncDepthFirstTreeOptions](#symbol-AsyncDepthFirstTreeOptions), [AsyncDepthFirstTreeOptionsPatch](#symbol-AsyncDepthFirstTreeOptionsPatch), [AsyncDepthFirstTreeRunner](#symbol-AsyncDepthFirstTreeRunner), [AsyncDepthFirstTreeTraversal](#symbol-AsyncDepthFirstTreeTraversal), [ChildIndexSelection](#symbol-ChildIndexSelection), [DepthFirstPhase](#symbol-DepthFirstPhase), [DepthFirstTreeOptions](#symbol-DepthFirstTreeOptions), [DepthFirstTreeOptionsPatch](#symbol-DepthFirstTreeOptionsPatch), [DepthFirstTreeRunner](#symbol-DepthFirstTreeRunner), [DepthFirstTreeTraversal](#symbol-DepthFirstTreeTraversal), [InOrderOptions](#symbol-InOrderOptions), [traverseTreeDepthFirst](#symbol-traverseTreeDepthFirst), [traverseTreeDepthFirstAsync](#symbol-traverseTreeDepthFirstAsync).

<a id="symbol-diffDagDefinitions"></a>

### diffDagDefinitions

Runtime value and public type surface. [Owning contract](reference.md#validated-dag-revisions) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function diffDagDefinitions<BeforeData, AfterData, ID = unknown>(before: DagDefinition<BeforeData, ID>, after: DagDefinition<AfterData, ID>): DagDefinitionDiff<ID>;
```

<a id="symbol-filterAsyncDagDataVisitor"></a>

### filterAsyncDagDataVisitor

Runtime value and public type surface. [Owning contract](reference.md#filtered-dag-visitors) · [Executable snippet](reference.md#filtered-visitor-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function filterAsyncDagDataVisitor<DATA, NARROWED extends DATA, T extends VertexTypes<DATA> = VertexTypes<DATA>, R extends VertexTypes<DATA> = T, ORDER extends DagVisitorPhase = DagVisitorPhase, ID = unknown>(predicate: (data: DATA) => data is NARROWED, visitor: AsyncFilteredVisitor<NARROWED, T, R, ORDER, ID>): AsyncDagVisitor<T, R, ORDER, ID>;
export declare function filterAsyncDagDataVisitor<DATA, T extends VertexTypes<DATA> = VertexTypes<DATA>, R extends VertexTypes<DATA> = T, ORDER extends DagVisitorPhase = DagVisitorPhase, ID = unknown>(predicate: (data: DATA) => boolean, visitor: AsyncFilteredVisitor<DATA, T, R, ORDER, ID>): AsyncDagVisitor<T, R, ORDER, ID>;
```

<a id="symbol-filterDagDataVisitor"></a>

### filterDagDataVisitor

Runtime value and public type surface. [Owning contract](reference.md#filtered-dag-visitors) · [Executable snippet](reference.md#filtered-visitor-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function filterDagDataVisitor<DATA, NARROWED extends DATA, T extends VertexTypes<DATA> = VertexTypes<DATA>, R extends VertexTypes<DATA> = T, ORDER extends DagVisitorPhase = DagVisitorPhase, ID = unknown>(predicate: (data: DATA) => data is NARROWED, visitor: FilteredVisitor<NARROWED, T, R, ORDER, ID>): DagVisitor<T, R, ORDER, ID>;
export declare function filterDagDataVisitor<DATA, T extends VertexTypes<DATA> = VertexTypes<DATA>, R extends VertexTypes<DATA> = T, ORDER extends DagVisitorPhase = DagVisitorPhase, ID = unknown>(predicate: (data: DATA) => boolean, visitor: FilteredVisitor<DATA, T, R, ORDER, ID>): DagVisitor<T, R, ORDER, ID>;
```

<a id="symbol-graphWalk"></a>

### graphWalk

Runtime value and public type surface. [Owning contract](reference.md#api-compatibility) · [Related example](reference.md#api-compatibility)

Supported imports: `configurable-tree-traversal`.

Namespace for `configurable-tree-traversal/traversals/graph-walk`: [AsyncGraphWalk](#symbol-AsyncGraphWalk), [AsyncGraphWalkEdgePredicate](#symbol-AsyncGraphWalkEdgePredicate), [AsyncGraphWalkExpansionPredicate](#symbol-AsyncGraphWalkExpansionPredicate), [AsyncGraphWalkOptions](#symbol-AsyncGraphWalkOptions), [AsyncGraphWalkOptionsPatch](#symbol-AsyncGraphWalkOptionsPatch), [AsyncGraphWalkRecordSelectors](#symbol-AsyncGraphWalkRecordSelectors), [AsyncGraphWalkRunner](#symbol-AsyncGraphWalkRunner), [AsyncGraphWalkSource](#symbol-AsyncGraphWalkSource), [AsyncGraphWalkVisitor](#symbol-AsyncGraphWalkVisitor), [GraphWalk](#symbol-GraphWalk), [GraphWalkCatalogLink](#symbol-GraphWalkCatalogLink), [GraphWalkCounts](#symbol-GraphWalkCounts), [GraphWalkDagRelation](#symbol-GraphWalkDagRelation), [GraphWalkEdge](#symbol-GraphWalkEdge), [GraphWalkEdgePredicate](#symbol-GraphWalkEdgePredicate), [GraphWalkEvent](#symbol-GraphWalkEvent), [GraphWalkEventFor](#symbol-GraphWalkEventFor), [GraphWalkExpandContext](#symbol-GraphWalkExpandContext), [GraphWalkExpansionPredicate](#symbol-GraphWalkExpansionPredicate), [GraphWalkFollowContext](#symbol-GraphWalkFollowContext), [GraphWalkHydration](#symbol-GraphWalkHydration), [GraphWalkInspection](#symbol-GraphWalkInspection), [GraphWalkLimits](#symbol-GraphWalkLimits), [GraphWalkLink](#symbol-GraphWalkLink), [GraphWalkOperation](#symbol-GraphWalkOperation), [GraphWalkOptions](#symbol-GraphWalkOptions), [GraphWalkOptionsPatch](#symbol-GraphWalkOptionsPatch), [GraphWalkOutcome](#symbol-GraphWalkOutcome), [GraphWalkPathEvent](#symbol-GraphWalkPathEvent), [GraphWalkPhase](#symbol-GraphWalkPhase), [GraphWalkRecordSelectors](#symbol-GraphWalkRecordSelectors), [GraphWalkRevisitOptions](#symbol-GraphWalkRevisitOptions), [GraphWalkRevisitPolicy](#symbol-GraphWalkRevisitPolicy), [GraphWalkRouteContext](#symbol-GraphWalkRouteContext), [GraphWalkRunner](#symbol-GraphWalkRunner), [GraphWalkSource](#symbol-GraphWalkSource), [GraphWalkStrategy](#symbol-GraphWalkStrategy), [GraphWalkSummary](#symbol-GraphWalkSummary), [GraphWalkTarget](#symbol-GraphWalkTarget), [GraphWalkVertex](#symbol-GraphWalkVertex), [GraphWalkVertexResult](#symbol-GraphWalkVertexResult), [GraphWalkVisitor](#symbol-GraphWalkVisitor), [GraphWalkVisitorContext](#symbol-GraphWalkVisitorContext), [GraphWalkVisitorResult](#symbol-GraphWalkVisitorResult), [materializeWalkSourceFromDagDefinition](#symbol-materializeWalkSourceFromDagDefinition), [materializeWalkSourceFromRecords](#symbol-materializeWalkSourceFromRecords), [materializeWalkSourceFromRecordsAsync](#symbol-materializeWalkSourceFromRecordsAsync), [walkGraph](#symbol-walkGraph), [walkGraphAsync](#symbol-walkGraphAsync).

<a id="symbol-hasSingleStructuralSink"></a>

### hasSingleStructuralSink

Runtime value and public type surface. [Owning contract](reference.md#dag-traversal) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-workflow-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function hasSingleStructuralSink<T extends VertexTypes>(graph: OriginalGraphView<T>): boolean;
```

<a id="symbol-inspectDagMilestones"></a>

### inspectDagMilestones

Runtime value and public type surface. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function inspectDagMilestones<T extends VertexTypes, R extends VertexTypes, ID>(runner: DagTraversalRunner<T, R, ID> | AsyncDagTraversalRunner<T, R, ID>): DagMilestoneSnapshot<ID>;
```

<a id="symbol-mapDagFragmentIds"></a>

### mapDagFragmentIds

Runtime value and public type surface. [Owning contract](reference.md#dag-fragments-and-composition) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function mapDagFragmentIds<Data, ID, Port extends string, MappedID>(fragment: DagFragment<Data, ID, Port>, options: {
    mapId: (id: ID) => MappedID;
}): DagFragment<Data, MappedID, Port>;
```

<a id="symbol-materializeDagInputFromRecords"></a>

### materializeDagInputFromRecords

Runtime value and public type surface. [Owning contract](reference.md#collection-and-forest-sources) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/quickstart-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/sources`.

```ts
export declare function materializeDagInputFromRecords<Item, ID>(items: Iterable<Item>, selectors: DagRecordSelectors<Item, ID>): MaterializedDagInput<Item, ID>;
```

<a id="symbol-materializeDagInputFromRecordsAsync"></a>

### materializeDagInputFromRecordsAsync

Runtime value and public type surface. [Owning contract](reference.md#collection-and-forest-sources) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/quickstart-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/sources`.

```ts
export declare function materializeDagInputFromRecordsAsync<Item, ID>(items: AsyncCollection<Item>, selectors: AsyncDagRecordSelectors<Item, ID>): Promise<MaterializedDagInput<Item, ID>>;
```

<a id="symbol-materializeDagInputFromRoots"></a>

### materializeDagInputFromRoots

Runtime value and public type surface. [Owning contract](reference.md#collection-and-forest-sources) · [Executable snippet](reference.md#roots-materialization-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/sources`.

```ts
export declare function materializeDagInputFromRoots<Item, ID>(roots: Iterable<Item>, selectors: DagRootSelectors<Item, ID>): MaterializedDagInput<Item, ID>;
```

<a id="symbol-materializeDagInputFromRootsAsync"></a>

### materializeDagInputFromRootsAsync

Runtime value and public type surface. [Owning contract](reference.md#collection-and-forest-sources) · [Executable snippet](reference.md#roots-materialization-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/sources`.

```ts
export declare function materializeDagInputFromRootsAsync<Item, ID>(roots: AsyncCollection<Item>, selectors: AsyncDagRootSelectors<Item, ID>): Promise<MaterializedDagInput<Item, ID>>;
```

<a id="symbol-materializeWalkSourceFromDagDefinition"></a>

### materializeWalkSourceFromDagDefinition

Runtime value and public type surface. [Owning contract](reference.md#walking-adapters-and-inspection) · [Executable snippet](reference.md#definition-walk-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare function materializeWalkSourceFromDagDefinition<Data, ID>(definition: DagDefinition<Data, ID>, options: {
    relations: readonly [RelationSelection, ...RelationSelection[]];
}): Extract<GraphWalkSource<Data, GraphWalkDagRelation, ID>, {
    hydration: 'resolver';
}>;
```

<a id="symbol-materializeWalkSourceFromRecords"></a>

### materializeWalkSourceFromRecords

Runtime value and public type surface. [Owning contract](reference.md#walking-adapters-and-inspection) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare function materializeWalkSourceFromRecords<Data, Edge, ID>(items: Iterable<Data>, options: GraphWalkRecordSelectors<Data, Edge, ID>): Extract<GraphWalkSource<Data, Edge, ID>, {
    hydration: 'resolver';
}>;
```

<a id="symbol-materializeWalkSourceFromRecordsAsync"></a>

### materializeWalkSourceFromRecordsAsync

Runtime value and public type surface. [Owning contract](reference.md#walking-adapters-and-inspection) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare function materializeWalkSourceFromRecordsAsync<Data, Edge, ID>(items: Iterable<Data> | AsyncIterable<Data>, options: AsyncGraphWalkRecordSelectors<Data, Edge, ID>): Promise<Extract<GraphWalkSource<Data, Edge, ID>, {
    hydration: 'resolver';
}>>;
```

<a id="symbol-objectRewrite"></a>

### objectRewrite

Runtime value and public type surface. [Owning contract](reference.md#api-compatibility) · [Related example](reference.md#api-compatibility)

Supported imports: `configurable-tree-traversal`.

Namespace for `configurable-tree-traversal/tools/rewrite-object`: [ObjectRewriteCallback](#symbol-ObjectRewriteCallback), [ObjectRewriteContext](#symbol-ObjectRewriteContext), [ObjectRewriteInput](#symbol-ObjectRewriteInput), [ObjectRewriteOutputResult](#symbol-ObjectRewriteOutputResult), [RewriteObjectOptions](#symbol-RewriteObjectOptions), [RewriteObjectResult](#symbol-RewriteObjectResult), [RootValueConverter](#symbol-RootValueConverter), [rewriteObject](#symbol-rewriteObject), [rewriteObjectAs](#symbol-rewriteObjectAs).

<a id="symbol-prepareDag"></a>

### prepareDag

Runtime value and public type surface. [Owning contract](reference.md#reusable-prepared-dags) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function prepareDag<T extends VertexTypes, ID = unknown>(input: PrepareDagInput<T, ID>): PrepareDagResult<T['VertexData'], ID>;
```

<a id="symbol-prepareDagAsync"></a>

### prepareDagAsync

Runtime value and public type surface. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function prepareDagAsync<T extends VertexTypes, ID = unknown>(input: PrepareDagInput<T, ID> & {
    concurrency?: number;
}): Promise<PrepareDagResult<T['VertexData'], ID>>;
export declare function prepareDagAsync<T extends VertexTypes, ID = unknown>(input: PrepareAsyncDagInput<T, ID>): Promise<PrepareDagResult<T['VertexData'], ID>>;
```

<a id="symbol-prepareDagDefinition"></a>

### prepareDagDefinition

Runtime value and public type surface. [Owning contract](reference.md#materialized-dag-definitions) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function prepareDagDefinition<Data, ID = unknown>(input: DagDefinition<Data, ID>): PrepareDagResult<Data, ID>;
```

<a id="symbol-reviseDag"></a>

### reviseDag

Runtime value and public type surface. [Owning contract](reference.md#validated-dag-revisions) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function reviseDag<Data, ID = unknown>(prepared: PreparedDag<Data, ID>, operations: readonly DagRevisionOperation<RevisionDomain<Data>, RevisionDomain<ID>>[]): DagRevisionResult<Data, ID>;
```

<a id="symbol-rewriteObject"></a>

### rewriteObject

Runtime value and public type surface. [Owning contract](reference.md#rewrite-objects) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export declare function rewriteObject<In = TraversableObject<TraversableObjectPropKey, unknown>, InK extends TraversableObjectPropKey = TraversableObjectPropKey, InV = unknown, Out = unknown, OutK extends TraversableObjectPropKey = InK, OutV = InV>(object: In, ...args: Record<never, never> extends RewriteObjectOptions<In, InK, InV, Out, OutK, OutV> ? [options?: RewriteObjectOptions<In, InK, InV, Out, OutK, OutV>] : [options: RewriteObjectOptions<In, InK, InV, Out, OutK, OutV>]): RewriteObjectResult<InK, InV, Out, OutK, OutV>;
```

<a id="symbol-rewriteObjectAs"></a>

### rewriteObjectAs

Runtime value and public type surface. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export declare function rewriteObjectAs<Out>(object: unknown, options?: RewriteObjectOptions<unknown, TraversableObjectPropKey, unknown, unknown, TraversableObjectPropKey, unknown>): RewriteObjectResult<TraversableObjectPropKey, unknown, Out, TraversableObjectPropKey, unknown>;
```

<a id="symbol-traversableObjectTree"></a>

### traversableObjectTree

Runtime value and public type surface. [Owning contract](reference.md#api-compatibility) · [Related example](reference.md#api-compatibility)

Supported imports: `configurable-tree-traversal`.

Namespace for `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`: [ObjectAssemblyCache](#symbol-ObjectAssemblyCache), [ObjectChildHookResult](#symbol-ObjectChildHookResult), [ObjectCompositeClassification](#symbol-ObjectCompositeClassification), [ObjectCurrentVertexTypes](#symbol-ObjectCurrentVertexTypes), [ObjectMutationBinder](#symbol-ObjectMutationBinder), [ObjectMutationBinderFactory](#symbol-ObjectMutationBinderFactory), [ObjectMutationCommands](#symbol-ObjectMutationCommands), [ObjectMutationOptions](#symbol-ObjectMutationOptions), [ObjectMutationRequest](#symbol-ObjectMutationRequest), [ObjectPropertyPatch](#symbol-ObjectPropertyPatch), [ObjectTreeOptions](#symbol-ObjectTreeOptions), [ObjectTreePropertyAdapters](#symbol-ObjectTreePropertyAdapters), [ObjectTreeSource](#symbol-ObjectTreeSource), [ObjectTreeVertexTypes](#symbol-ObjectTreeVertexTypes), [TraversableObject](#symbol-TraversableObject), [TraversableObjectProp](#symbol-TraversableObjectProp), [TraversableObjectPropKey](#symbol-TraversableObjectPropKey), [createObjectMutationBinder](#symbol-createObjectMutationBinder).

<a id="symbol-traverseDag"></a>

### traverseDag

Runtime value and public type surface. [Owning contract](reference.md#dag-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-workflow-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function traverseDag<T extends VertexTypes = VertexTypes, R extends VertexTypes = T, ID = unknown>(options: DagOptions<T, R, ID>): DagTraversalRunner<T, R, ID>;
```

<a id="symbol-traverseDagAsync"></a>

### traverseDagAsync

Runtime value and public type surface. [Owning contract](reference.md#dag-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-prerequisite-resolution-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function traverseDagAsync<T extends VertexTypes = VertexTypes, R extends VertexTypes = T, ID = unknown>(options: AsyncDagOptions<T, R, ID>): Promise<AsyncDagTraversalRunner<T, R, ID>>;
```

<a id="symbol-traverseTreeBreadthFirst"></a>

### traverseTreeBreadthFirst

Runtime value and public type surface. [Owning contract](reference.md#breadth-first-traversal) · [Executable snippet](reference.md#breadth-first-traversal)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export declare function traverseTreeBreadthFirst<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP>(options: BreadthFirstTreeOptions<TTP, RW_TTP>): BreadthFirstTreeRunner<TTP, RW_TTP>;
```

<a id="symbol-traverseTreeBreadthFirstAsync"></a>

### traverseTreeBreadthFirstAsync

Runtime value and public type surface. [Owning contract](reference.md#breadth-first-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/breadth-first-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export declare function traverseTreeBreadthFirstAsync<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP>(options: AsyncBreadthFirstTreeOptions<TTP, RW_TTP>): Promise<AsyncBreadthFirstTreeRunner<TTP, RW_TTP>>;
```

<a id="symbol-traverseTreeDepthFirst"></a>

### traverseTreeDepthFirst

Runtime value and public type surface. [Owning contract](reference.md#traversal-orders) · [Executable snippet](reference.md#ordered-visitor-groups)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export declare function traverseTreeDepthFirst<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP>(options: DepthFirstTreeOptions<TTP, RW_TTP>): DepthFirstTreeRunner<TTP, RW_TTP>;
```

<a id="symbol-traverseTreeDepthFirstAsync"></a>

### traverseTreeDepthFirstAsync

Runtime value and public type surface. [Owning contract](reference.md#traversal-orders) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/async-adapter-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export declare function traverseTreeDepthFirstAsync<TTP extends VertexTypes = VertexTypes, RW_TTP extends VertexTypes = TTP>(options: AsyncDepthFirstTreeOptions<TTP, RW_TTP>): Promise<AsyncDepthFirstTreeRunner<TTP, RW_TTP>>;
```

<a id="symbol-walkGraph"></a>

### walkGraph

Runtime value and public type surface. [Owning contract](reference.md#general-graph-walking) · [Executable snippet](reference.md#definition-walk-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare function walkGraph<Data, Edge, ID>(options: GraphWalkOptions<Data, Edge, ID>): GraphWalkRunner<Data, Edge, ID>;
```

<a id="symbol-walkGraphAsync"></a>

### walkGraphAsync

Runtime value and public type surface. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare function walkGraphAsync<Data, Edge, ID>(options: AsyncGraphWalkOptions<Data, Edge, ID>): Promise<AsyncGraphWalkRunner<Data, Edge, ID>>;
```

