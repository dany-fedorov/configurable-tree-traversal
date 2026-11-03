# Public API symbol index

[Documentation map](index.md) · [Behavior reference](reference.md) · [Explicit API migration](migration-explicit-api.md)

These declarations describe the unreleased explicit API in this source checkout. The package version remains `0.12.0`; the released `0.12.0` API differs. See [checkout installation](../README.md#install) and the [migration guide](migration-explicit-api.md). Look up a current exported name below, then follow its owning contract and, where one exists, a runnable or related example. Public import routes are exhaustive for each symbol; declaration-module paths are not consumer imports.

Generated from the supported declaration census: **271 public symbols**, **540 export bindings**, **9 runtime entry points**. Run `npm run docs:api` to regenerate; package verification rejects stale output.

Declaration excerpts preserve overloads and public members; referenced support types can be declaration-local and are not additional importable exports. Inline declaration-relative type imports are displayed by type name. These are declaration excerpts, not standalone programs; the linked guide examples are compiled and executed against the packed package. A runnable example or executable snippet names the symbol; a related example exercises the feature that produces or consumes it without naming it. Runtime failures/defaults belong to the linked behavior contract.

## Lookup

| Symbol | Availability | Contract |
| --- | --- | --- |
| [AsyncBreadthFirstTreeRunner](#symbol-AsyncBreadthFirstTreeRunner) | Type-only | [Behavior](reference.md#breadth-first-traversal) |
| [AsyncBreadthFirstTreeTraversalBuilder](#symbol-AsyncBreadthFirstTreeTraversalBuilder) | Runtime value and type surface | [Behavior](reference.md#breadth-first-traversal) |
| [AsyncBreadthFirstTreeTraversalBuilderOptions](#symbol-AsyncBreadthFirstTreeTraversalBuilderOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncBreadthFirstTreeTraversalBuilderOptionsPatch](#symbol-AsyncBreadthFirstTreeTraversalBuilderOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncChildHintsListTransformer](#symbol-AsyncChildHintsListTransformer) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncDagDiscoverySource](#symbol-AsyncDagDiscoverySource) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [AsyncDagExternalWorkSession](#symbol-AsyncDagExternalWorkSession) | Type-only | [Behavior](reference.md#ticket-coordination) |
| [AsyncDagExternalWorkSessionOptions](#symbol-AsyncDagExternalWorkSessionOptions) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [AsyncDagRecordSelectors](#symbol-AsyncDagRecordSelectors) | Type-only | [Behavior](reference.md#collection-and-forest-sources) |
| [AsyncDagRootRecordSelectors](#symbol-AsyncDagRootRecordSelectors) | Type-only | [Behavior](reference.md#collection-and-forest-sources) |
| [AsyncDagTopologyDiscoveryInput](#symbol-AsyncDagTopologyDiscoveryInput) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [AsyncDagTraversalBuilder](#symbol-AsyncDagTraversalBuilder) | Runtime value and type surface | [Behavior](reference.md#dag-traversal) |
| [AsyncDagTraversalBuilderOptions](#symbol-AsyncDagTraversalBuilderOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncDagTraversalBuilderOptionsPatch](#symbol-AsyncDagTraversalBuilderOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncDagTraversalRunner](#symbol-AsyncDagTraversalRunner) | Type-only | [Behavior](reference.md#dag-traversal) |
| [AsyncDagVisitor](#symbol-AsyncDagVisitor) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [AsyncDepthFirstTreeRunner](#symbol-AsyncDepthFirstTreeRunner) | Type-only | [Behavior](reference.md#traversal-orders) |
| [AsyncDepthFirstTreeTraversalBuilder](#symbol-AsyncDepthFirstTreeTraversalBuilder) | Runtime value and type surface | [Behavior](reference.md#traversal-orders) |
| [AsyncDepthFirstTreeTraversalBuilderOptions](#symbol-AsyncDepthFirstTreeTraversalBuilderOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncDepthFirstTreeTraversalBuilderOptionsPatch](#symbol-AsyncDepthFirstTreeTraversalBuilderOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncGraphWalkBuilder](#symbol-AsyncGraphWalkBuilder) | Runtime value and type surface | [Behavior](reference.md#general-graph-walking) |
| [AsyncGraphWalkBuilderOptions](#symbol-AsyncGraphWalkBuilderOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncGraphWalkBuilderOptionsPatch](#symbol-AsyncGraphWalkBuilderOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncGraphWalkDiscoverySource](#symbol-AsyncGraphWalkDiscoverySource) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [AsyncGraphWalkLinkTargetAdmissionPredicate](#symbol-AsyncGraphWalkLinkTargetAdmissionPredicate) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [AsyncGraphWalkRecordMaterializationOptions](#symbol-AsyncGraphWalkRecordMaterializationOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [AsyncGraphWalkRunner](#symbol-AsyncGraphWalkRunner) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [AsyncGraphWalkVertexOccurrenceExpansionPredicate](#symbol-AsyncGraphWalkVertexOccurrenceExpansionPredicate) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [AsyncGraphWalkVisitor](#symbol-AsyncGraphWalkVisitor) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [AsyncTraversalExecution](#symbol-AsyncTraversalExecution) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [AsyncTreeDiscoverySource](#symbol-AsyncTreeDiscoverySource) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [AsyncTreeVertexPhaseVisitorCallback](#symbol-AsyncTreeVertexPhaseVisitorCallback) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [BoundObjectPropertyMutationHelpers](#symbol-BoundObjectPropertyMutationHelpers) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [BreadthFirstTreeRunner](#symbol-BreadthFirstTreeRunner) | Type-only | [Behavior](reference.md#breadth-first-traversal) |
| [BreadthFirstTreeTraversalBuilder](#symbol-BreadthFirstTreeTraversalBuilder) | Runtime value and type surface | [Behavior](reference.md#breadth-first-traversal) |
| [BreadthFirstTreeTraversalBuilderOptions](#symbol-BreadthFirstTreeTraversalBuilderOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [BreadthFirstTreeTraversalBuilderOptionsPatch](#symbol-BreadthFirstTreeTraversalBuilderOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [BreadthFirstTreeVisitPhase](#symbol-BreadthFirstTreeVisitPhase) | Runtime value and type surface | [Behavior](reference.md#breadth-first-traversal) |
| [ChildDiscoveryContext](#symbol-ChildDiscoveryContext) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [ChildDiscoverySlot](#symbol-ChildDiscoverySlot) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [ChildHintVertexIdentity](#symbol-ChildHintVertexIdentity) | Type-only | [Behavior](reference.md#dag-traversal) |
| [ChildHintsListTransformer](#symbol-ChildHintsListTransformer) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [DagChildResolutionContext](#symbol-DagChildResolutionContext) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [DagCommittedMilestoneEvent](#symbol-DagCommittedMilestoneEvent) | Type-only | [Behavior](reference.md#deferred-dag-progress-and-reconciliation) |
| [DagCompositionOptions](#symbol-DagCompositionOptions) | Type-only | [Behavior](reference.md#dag-fragments-and-composition) |
| [DagDefinition](#symbol-DagDefinition) | Type-only | [Behavior](reference.md#materialized-dag-definitions) |
| [DagDefinitionChangeAspect](#symbol-DagDefinitionChangeAspect) | Type-only | [Behavior](reference.md#validated-dag-revisions) |
| [DagDefinitionDiff](#symbol-DagDefinitionDiff) | Type-only | [Behavior](reference.md#validated-dag-revisions) |
| [DagDefinitionIssue](#symbol-DagDefinitionIssue) | Type-only | [Behavior](reference.md#materialized-dag-definitions) |
| [DagDefinitionVertex](#symbol-DagDefinitionVertex) | Type-only | [Behavior](reference.md#materialized-dag-definitions) |
| [DagDefinitionVertexChange](#symbol-DagDefinitionVertexChange) | Type-only | [Behavior](reference.md#validated-dag-revisions) |
| [DagDiscoverySource](#symbol-DagDiscoverySource) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [DagExternalWorkRunBoundary](#symbol-DagExternalWorkRunBoundary) | Type-only | [Behavior](reference.md#ticket-coordination) |
| [DagExternalWorkSession](#symbol-DagExternalWorkSession) | Type-only | [Behavior](reference.md#ticket-coordination) |
| [DagExternalWorkSessionControl](#symbol-DagExternalWorkSessionControl) | Type-only | [Behavior](reference.md#ticket-coordination) |
| [DagExternalWorkSessionOptions](#symbol-DagExternalWorkSessionOptions) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [DagFragment](#symbol-DagFragment) | Type-only | [Behavior](reference.md#dag-fragments-and-composition) |
| [DagFragmentValidationError](#symbol-DagFragmentValidationError) | Runtime value and type surface | [Behavior](reference.md#dag-fragments-and-composition) |
| [DagMilestone](#symbol-DagMilestone) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagMilestoneBlocker](#symbol-DagMilestoneBlocker) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagMilestoneConstraint](#symbol-DagMilestoneConstraint) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagMilestoneExplanation](#symbol-DagMilestoneExplanation) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagMilestoneQueryOptions](#symbol-DagMilestoneQueryOptions) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagMilestoneQueryResult](#symbol-DagMilestoneQueryResult) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagMilestoneSnapshot](#symbol-DagMilestoneSnapshot) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagMilestoneStatus](#symbol-DagMilestoneStatus) | Type-only | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [DagPrerequisiteLookupMissing](#symbol-DagPrerequisiteLookupMissing) | Type-only | [Behavior](reference.md#discovery-and-completed-work) |
| [DagPrerequisiteLookupResult](#symbol-DagPrerequisiteLookupResult) | Type-only | [Behavior](reference.md#discovery-and-completed-work) |
| [DagProgressSnapshot](#symbol-DagProgressSnapshot) | Type-only | [Behavior](reference.md#dag-summary-schema) |
| [DagRecordSelectors](#symbol-DagRecordSelectors) | Type-only | [Behavior](reference.md#collection-and-forest-sources) |
| [DagRevisionOperation](#symbol-DagRevisionOperation) | Type-only | [Behavior](reference.md#validated-dag-revisions) |
| [DagRevisionResult](#symbol-DagRevisionResult) | Type-only | [Behavior](reference.md#validated-dag-revisions) |
| [DagRootRecordSelectors](#symbol-DagRootRecordSelectors) | Type-only | [Behavior](reference.md#collection-and-forest-sources) |
| [DagSchedulingOptions](#symbol-DagSchedulingOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [DagSettlementOutcome](#symbol-DagSettlementOutcome) | Type-only | [Behavior](reference.md#dag-summary-schema) |
| [DagSettlementReceipt](#symbol-DagSettlementReceipt) | Type-only | [Behavior](reference.md#ticket-coordination) |
| [DagSourceVertexResolution](#symbol-DagSourceVertexResolution) | Type-only | [Behavior](reference.md#discovery-and-completed-work) |
| [DagStructuralDiscoveryCycleError](#symbol-DagStructuralDiscoveryCycleError) | Runtime value and type surface | [Behavior](reference.md#validation-results-and-failures) |
| [DagStructuralDiscoverySlot](#symbol-DagStructuralDiscoverySlot) | Type-only | [Behavior](reference.md#materialized-dag-definitions) |
| [DagTopologyDiscoveryInput](#symbol-DagTopologyDiscoveryInput) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [DagTopologyDiscoveryOptions](#symbol-DagTopologyDiscoveryOptions) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [DagTopologyValidationResult](#symbol-DagTopologyValidationResult) | Type-only | [Behavior](reference.md#materialized-dag-definitions) |
| [DagTraversalBuilder](#symbol-DagTraversalBuilder) | Runtime value and type surface | [Behavior](reference.md#dag-traversal) |
| [DagTraversalBuilderOptions](#symbol-DagTraversalBuilderOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [DagTraversalBuilderOptionsPatch](#symbol-DagTraversalBuilderOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [DagTraversalRunner](#symbol-DagTraversalRunner) | Type-only | [Behavior](reference.md#dag-traversal) |
| [DagTraversalStallDiagnostics](#symbol-DagTraversalStallDiagnostics) | Type-only | [Behavior](reference.md#validation-results-and-failures) |
| [DagTraversalStallError](#symbol-DagTraversalStallError) | Runtime value and type surface | [Behavior](reference.md#validation-results-and-failures) |
| [DagVertexProgress](#symbol-DagVertexProgress) | Type-only | [Behavior](reference.md#dag-summary-schema) |
| [DagVisitor](#symbol-DagVisitor) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [DagVisitorContext](#symbol-DagVisitorContext) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [DagVisitorPhase](#symbol-DagVisitorPhase) | Runtime value and type surface | [Behavior](reference.md#dag-traversal) |
| [DagWorkAwaitingSettlement](#symbol-DagWorkAwaitingSettlement) | Type-only | [Behavior](reference.md#dag-summary-schema) |
| [DagWorkSettlementTicket](#symbol-DagWorkSettlementTicket) | Type-only | [Behavior](reference.md#ticket-coordination) |
| [DagWorkSettlementToken](#symbol-DagWorkSettlementToken) | Type-only | [Behavior](reference.md#dag-summary-schema) |
| [DagWorkState](#symbol-DagWorkState) | Type-only | [Behavior](reference.md#dag-summary-schema) |
| [DepthFirstChildBoundaryVisitOptions](#symbol-DepthFirstChildBoundaryVisitOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [DepthFirstTreeRunner](#symbol-DepthFirstTreeRunner) | Type-only | [Behavior](reference.md#traversal-orders) |
| [DepthFirstTreeTraversalBuilder](#symbol-DepthFirstTreeTraversalBuilder) | Runtime value and type surface | [Behavior](reference.md#traversal-orders) |
| [DepthFirstTreeTraversalBuilderOptions](#symbol-DepthFirstTreeTraversalBuilderOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [DepthFirstTreeTraversalBuilderOptionsPatch](#symbol-DepthFirstTreeTraversalBuilderOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [DepthFirstTreeVisitPhase](#symbol-DepthFirstTreeVisitPhase) | Runtime value and type surface | [Behavior](reference.md#traversal-orders) |
| [FoundDagSourceVertex](#symbol-FoundDagSourceVertex) | Type-only | [Behavior](reference.md#discovery-and-completed-work) |
| [GraphWalkBuilder](#symbol-GraphWalkBuilder) | Runtime value and type surface | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkBuilderOptions](#symbol-GraphWalkBuilderOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [GraphWalkBuilderOptionsPatch](#symbol-GraphWalkBuilderOptionsPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [GraphWalkCatalogOutgoingLinkToVertexId](#symbol-GraphWalkCatalogOutgoingLinkToVertexId) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkDagDeclarationRelation](#symbol-GraphWalkDagDeclarationRelation) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkDiscoverySource](#symbol-GraphWalkDiscoverySource) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkEdge](#symbol-GraphWalkEdge) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkEvent](#symbol-GraphWalkEvent) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkEventForObservationKind](#symbol-GraphWalkEventForObservationKind) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkExpansionOrder](#symbol-GraphWalkExpansionOrder) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkExplorationLimits](#symbol-GraphWalkExplorationLimits) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [GraphWalkInspection](#symbol-GraphWalkInspection) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkLinkTargetAdmissionContext](#symbol-GraphWalkLinkTargetAdmissionContext) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkLinkTargetAdmissionPredicate](#symbol-GraphWalkLinkTargetAdmissionPredicate) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkObservationKind](#symbol-GraphWalkObservationKind) | Runtime value and type surface | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkOutgoingLink](#symbol-GraphWalkOutgoingLink) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkPendingInvocationOperation](#symbol-GraphWalkPendingInvocationOperation) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkProgressCounts](#symbol-GraphWalkProgressCounts) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkProgressSnapshot](#symbol-GraphWalkProgressSnapshot) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkRecordMaterializationOptions](#symbol-GraphWalkRecordMaterializationOptions) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [GraphWalkResolvedVertex](#symbol-GraphWalkResolvedVertex) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkRouteEnumerationAndRequiredBounds](#symbol-GraphWalkRouteEnumerationAndRequiredBounds) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkRouteEnumerationContext](#symbol-GraphWalkRouteEnumerationContext) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkRouteEnumerationPolicy](#symbol-GraphWalkRouteEnumerationPolicy) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkRoutePrefixEvent](#symbol-GraphWalkRoutePrefixEvent) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkRunner](#symbol-GraphWalkRunner) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkTerminalOutcome](#symbol-GraphWalkTerminalOutcome) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkVertexOccurrenceExpansionContext](#symbol-GraphWalkVertexOccurrenceExpansionContext) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkVertexOccurrenceExpansionPredicate](#symbol-GraphWalkVertexOccurrenceExpansionPredicate) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkVertexResolutionMode](#symbol-GraphWalkVertexResolutionMode) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkVertexResolutionResult](#symbol-GraphWalkVertexResolutionResult) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkVertexResolutionTarget](#symbol-GraphWalkVertexResolutionTarget) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkVisitor](#symbol-GraphWalkVisitor) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkVisitorContext](#symbol-GraphWalkVisitorContext) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [GraphWalkVisitorResult](#symbol-GraphWalkVisitorResult) | Type-only | [Behavior](reference.md#general-graph-walking) |
| [LiveObjectPropertyVertexTypes](#symbol-LiveObjectPropertyVertexTypes) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [LiveResolvedGraphView](#symbol-LiveResolvedGraphView) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [LiveResolvedTreeView](#symbol-LiveResolvedTreeView) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [MaterializedDagTraversalInput](#symbol-MaterializedDagTraversalInput) | Type-only | [Behavior](reference.md#collection-and-forest-sources) |
| [MaybePromise](#symbol-MaybePromise) | Type-only | [Behavior](reference.md#async-traversal) |
| [MutableResolvedTreeStore](#symbol-MutableResolvedTreeStore) | Runtime value and type surface | [Behavior](reference.md#views-handles-identity-and-paths) |
| [MutableTreeVertexRecordMap](#symbol-MutableTreeVertexRecordMap) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [MutableTreeVertexTopologyRecord](#symbol-MutableTreeVertexTopologyRecord) | Runtime value and type surface | [Behavior](reference.md#views-handles-identity-and-paths) |
| [MutableValueReference](#symbol-MutableValueReference) | Runtime value and type surface | [Behavior](reference.md#views-handles-identity-and-paths) |
| [NestedObjectOrArray](#symbol-NestedObjectOrArray) | Type-only | [Behavior](reference.md#traverse-an-object) |
| [ObjectChildPropertyResolutionOverrideResult](#symbol-ObjectChildPropertyResolutionOverrideResult) | Type-only | [Behavior](reference.md#traverse-an-object) |
| [ObjectMutationOptions](#symbol-ObjectMutationOptions) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectPropertyAssemblyCache](#symbol-ObjectPropertyAssemblyCache) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectPropertyAssemblyClassification](#symbol-ObjectPropertyAssemblyClassification) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectPropertyKey](#symbol-ObjectPropertyKey) | Type-only | [Behavior](reference.md#traverse-an-object) |
| [ObjectPropertyKeyValuePatch](#symbol-ObjectPropertyKeyValuePatch) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectPropertyMutationHelperBinder](#symbol-ObjectPropertyMutationHelperBinder) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectPropertyMutationHelperBinderFactory](#symbol-ObjectPropertyMutationHelperBinderFactory) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectPropertyPostOrderRewriteCallback](#symbol-ObjectPropertyPostOrderRewriteCallback) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectPropertyRecord](#symbol-ObjectPropertyRecord) | Type-only | [Behavior](reference.md#traverse-an-object) |
| [ObjectPropertyRewriteContext](#symbol-ObjectPropertyRewriteContext) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectPropertyRewriteInput](#symbol-ObjectPropertyRewriteInput) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectPropertyRewriteOptions](#symbol-ObjectPropertyRewriteOptions) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectPropertyRewriteRequest](#symbol-ObjectPropertyRewriteRequest) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectPropertyRewriteResult](#symbol-ObjectPropertyRewriteResult) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ObjectPropertyTreeAdapters](#symbol-ObjectPropertyTreeAdapters) | Type-only | [Behavior](reference.md#traverse-an-object) |
| [ObjectPropertyTreeSource](#symbol-ObjectPropertyTreeSource) | Runtime value and type surface | [Behavior](reference.md#traverse-an-object) |
| [ObjectPropertyTreeSourceOptions](#symbol-ObjectPropertyTreeSourceOptions) | Type-only | [Behavior](reference.md#traverse-an-object) |
| [ObjectPropertyTreeVertexTypes](#symbol-ObjectPropertyTreeVertexTypes) | Type-only | [Behavior](reference.md#traverse-an-object) |
| [ObjectRewriteOutputResult](#symbol-ObjectRewriteOutputResult) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [OmittedDagSourceVertex](#symbol-OmittedDagSourceVertex) | Type-only | [Behavior](reference.md#discovery-and-completed-work) |
| [PreCommandDiscoveredGraphView](#symbol-PreCommandDiscoveredGraphView) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [PresentRootOutputConverter](#symbol-PresentRootOutputConverter) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ResolvedGraphVertexSnapshot](#symbol-ResolvedGraphVertexSnapshot) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [StoredTreeReferenceVertexTypes](#symbol-StoredTreeReferenceVertexTypes) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [StructuralAncestorPathOptions](#symbol-StructuralAncestorPathOptions) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [StructuralChildEdge](#symbol-StructuralChildEdge) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [SyncOrAsyncIterable](#symbol-SyncOrAsyncIterable) | Type-only | [Behavior](reference.md#collection-and-forest-sources) |
| [SyncTraversalExecution](#symbol-SyncTraversalExecution) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [TraversalEventKindForVisitorPhase](#symbol-TraversalEventKindForVisitorPhase) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [TraversalEventNarrowedToSelectedKinds](#symbol-TraversalEventNarrowedToSelectedKinds) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [TraversalExecutionSelectionPatch](#symbol-TraversalExecutionSelectionPatch) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [TraversalExecutionSelections](#symbol-TraversalExecutionSelections) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [TraversalExecutionSnapshot](#symbol-TraversalExecutionSnapshot) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [TraversalExecutionState](#symbol-TraversalExecutionState) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [TraversalRunnerStatus](#symbol-TraversalRunnerStatus) | Runtime value and type surface | [Behavior](reference.md#inspection-and-execution) |
| [TraversalStopReason](#symbol-TraversalStopReason) | Type-only | [Behavior](reference.md#pause-and-resume) |
| [TraversalVisitorCommand](#symbol-TraversalVisitorCommand) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [TraversalVisitorCommandArguments](#symbol-TraversalVisitorCommandArguments) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [TraversalVisitorCommandName](#symbol-TraversalVisitorCommandName) | Runtime value and type surface | [Behavior](reference.md#visitors-and-commands) |
| [TreeChildResolverContext](#symbol-TreeChildResolverContext) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [TreeDiscoverySource](#symbol-TreeDiscoverySource) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [TreeOrDagCallbackOperation](#symbol-TreeOrDagCallbackOperation) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [TreeOrDagExecutionSnapshot](#symbol-TreeOrDagExecutionSnapshot) | Type-only | [Behavior](reference.md#inspection-and-execution) |
| [TreePhaseVisitorRegistrationRecord](#symbol-TreePhaseVisitorRegistrationRecord) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [TreeTraversalEvent](#symbol-TreeTraversalEvent) | Type-only | [Behavior](reference.md#traversal-orders) |
| [TreeVertexDiscoveryMetadata](#symbol-TreeVertexDiscoveryMetadata) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [TreeVertexPhaseVisitorCallback](#symbol-TreeVertexPhaseVisitorCallback) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [TreeVertexResolution](#symbol-TreeVertexResolution) | Type-only | [Behavior](reference.md#abstract-trees) |
| [TreeVertexResolutionFound](#symbol-TreeVertexResolutionFound) | Type-only | [Behavior](reference.md#abstract-trees) |
| [TreeVertexResolutionOmitted](#symbol-TreeVertexResolutionOmitted) | Type-only | [Behavior](reference.md#abstract-trees) |
| [TreeVertexTopologyRecordInput](#symbol-TreeVertexTopologyRecordInput) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [TreeVisitorContext](#symbol-TreeVisitorContext) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [TreeVisitorVertexDataMutationToolsBinder](#symbol-TreeVisitorVertexDataMutationToolsBinder) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [TreeVisitorVertexDataMutationToolsBinderFactory](#symbol-TreeVisitorVertexDataMutationToolsBinderFactory) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [ValidatedDagTopologyAsyncRunnerOptions](#symbol-ValidatedDagTopologyAsyncRunnerOptions) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [ValidatedDagTopologyLiveVertexSummary](#symbol-ValidatedDagTopologyLiveVertexSummary) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [ValidatedDagTopologyRunnerOptions](#symbol-ValidatedDagTopologyRunnerOptions) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [ValidatedReusableDagTopology](#symbol-ValidatedReusableDagTopology) | Type-only | [Behavior](reference.md#reusable-prepared-dags) |
| [Vertex](#symbol-Vertex) | Runtime value and type surface | [Behavior](reference.md#views-handles-identity-and-paths) |
| [VertexContent](#symbol-VertexContent) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [VertexContentInput](#symbol-VertexContentInput) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [VertexContentOverridesForShallowClone](#symbol-VertexContentOverridesForShallowClone) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [VertexDataAndChildHintTypes](#symbol-VertexDataAndChildHintTypes) | Type-only | [Behavior](reference.md#source-callback-contexts) |
| [VertexDataMutationCommandBuilder](#symbol-VertexDataMutationCommandBuilder) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [VertexDataMutationCommandTools](#symbol-VertexDataMutationCommandTools) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [VertexDataReplacementOrDeletionCommand](#symbol-VertexDataReplacementOrDeletionCommand) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [VertexDataReplacementOrDeletionRequest](#symbol-VertexDataReplacementOrDeletionRequest) | Type-only | [Behavior](reference.md#rewrite-objects) |
| [VertexHandle](#symbol-VertexHandle) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [VertexId](#symbol-VertexId) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [VertexView](#symbol-VertexView) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [VertexVisitSchedulingStage](#symbol-VertexVisitSchedulingStage) | Type-only | [Behavior](reference.md#views-handles-identity-and-paths) |
| [VisitorCallbackPhaseSelection](#symbol-VisitorCallbackPhaseSelection) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [VisitorCommandCommitTiming](#symbol-VisitorCommandCommitTiming) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [VisitorCommandsResult](#symbol-VisitorCommandsResult) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [VisitorDefinitionsForPhase](#symbol-VisitorDefinitionsForPhase) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [VisitorGroupDefinition](#symbol-VisitorGroupDefinition) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [VisitorGroupMember](#symbol-VisitorGroupMember) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [VisitorGroupMetadata](#symbol-VisitorGroupMetadata) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [VisitorRegistrationDefinition](#symbol-VisitorRegistrationDefinition) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [VisitorRegistrationMetadata](#symbol-VisitorRegistrationMetadata) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [VisitorRegistrationOptions](#symbol-VisitorRegistrationOptions) | Type-only | [Behavior](reference.md#visitors-and-commands) |
| [ZeroBasedOrEndRelativeChildIndexSelection](#symbol-ZeroBasedOrEndRelativeChildIndexSelection) | Type-only | [Behavior](reference.md#options-and-defaults) |
| [applyDagDefinitionRevisionBatch](#symbol-applyDagDefinitionRevisionBatch) | Runtime value and type surface | [Behavior](reference.md#validated-dag-revisions) |
| [bindAsyncDagExternalWorkSession](#symbol-bindAsyncDagExternalWorkSession) | Runtime value and type surface | [Behavior](reference.md#ticket-coordination) |
| [bindDagExternalWorkSession](#symbol-bindDagExternalWorkSession) | Runtime value and type surface | [Behavior](reference.md#ticket-coordination) |
| [breadthFirstTreeTraversal](#symbol-breadthFirstTreeTraversal) | Runtime value and type surface | [Behavior](reference.md#api-compatibility) |
| [captureDagMilestoneSnapshot](#symbol-captureDagMilestoneSnapshot) | Runtime value and type surface | [Behavior](reference.md#dag-dependency-queries-and-explanations) |
| [composeAndValidateDagFragments](#symbol-composeAndValidateDagFragments) | Runtime value and type surface | [Behavior](reference.md#dag-fragments-and-composition) |
| [copyAndNormalizeDagDefinition](#symbol-copyAndNormalizeDagDefinition) | Runtime value and type surface | [Behavior](reference.md#materialized-dag-definitions) |
| [core](#symbol-core) | Runtime value and type surface | [Behavior](reference.md#api-compatibility) |
| [createAndRunGraphWalkUntilSuspendedOrTerminal](#symbol-createAndRunGraphWalkUntilSuspendedOrTerminal) | Runtime value and type surface | [Behavior](reference.md#general-graph-walking) |
| [createAndRunGraphWalkUntilSuspendedOrTerminalAsync](#symbol-createAndRunGraphWalkUntilSuspendedOrTerminalAsync) | Runtime value and type surface | [Behavior](reference.md#general-graph-walking) |
| [createConditionalAsyncDagDataVisitor](#symbol-createConditionalAsyncDagDataVisitor) | Runtime value and type surface | [Behavior](reference.md#filtered-dag-visitors) |
| [createConditionalDagDataVisitor](#symbol-createConditionalDagDataVisitor) | Runtime value and type surface | [Behavior](reference.md#filtered-dag-visitors) |
| [createObjectPropertyMutationHelperBinder](#symbol-createObjectPropertyMutationHelperBinder) | Runtime value and type surface | [Behavior](reference.md#rewrite-objects) |
| [dagTraversal](#symbol-dagTraversal) | Runtime value and type surface | [Behavior](reference.md#api-compatibility) |
| [depthFirstTreeTraversal](#symbol-depthFirstTreeTraversal) | Runtime value and type surface | [Behavior](reference.md#api-compatibility) |
| [diffDagDefinitionDeclarationsShallowly](#symbol-diffDagDefinitionDeclarationsShallowly) | Runtime value and type surface | [Behavior](reference.md#validated-dag-revisions) |
| [discoverValidateAndCaptureDag](#symbol-discoverValidateAndCaptureDag) | Runtime value and type surface | [Behavior](reference.md#reusable-prepared-dags) |
| [discoverValidateAndCaptureDagAsync](#symbol-discoverValidateAndCaptureDagAsync) | Runtime value and type surface | [Behavior](reference.md#reusable-prepared-dags) |
| [graphWalk](#symbol-graphWalk) | Runtime value and type surface | [Behavior](reference.md#api-compatibility) |
| [hasExactlyOneResolvedStructuralLeaf](#symbol-hasExactlyOneResolvedStructuralLeaf) | Runtime value and type surface | [Behavior](reference.md#dag-traversal) |
| [mapDagFragmentIds](#symbol-mapDagFragmentIds) | Runtime value and type surface | [Behavior](reference.md#dag-fragments-and-composition) |
| [materializeDagInputFromRootRecords](#symbol-materializeDagInputFromRootRecords) | Runtime value and type surface | [Behavior](reference.md#collection-and-forest-sources) |
| [materializeDagInputFromRootRecordsAsync](#symbol-materializeDagInputFromRootRecordsAsync) | Runtime value and type surface | [Behavior](reference.md#collection-and-forest-sources) |
| [materializeGraphWalkSourceFromDagDeclarationRelations](#symbol-materializeGraphWalkSourceFromDagDeclarationRelations) | Runtime value and type surface | [Behavior](reference.md#walking-adapters-and-inspection) |
| [materializeGraphWalkSourceFromVertexRecords](#symbol-materializeGraphWalkSourceFromVertexRecords) | Runtime value and type surface | [Behavior](reference.md#general-graph-walking) |
| [materializeMultiEntryDagInputFromRecordCatalog](#symbol-materializeMultiEntryDagInputFromRecordCatalog) | Runtime value and type surface | [Behavior](reference.md#collection-and-forest-sources) |
| [materializeMultiEntryDagInputFromRecordCatalogAsync](#symbol-materializeMultiEntryDagInputFromRecordCatalogAsync) | Runtime value and type surface | [Behavior](reference.md#collection-and-forest-sources) |
| [materializeSynchronousGraphWalkSourceFromAsyncRecords](#symbol-materializeSynchronousGraphWalkSourceFromAsyncRecords) | Runtime value and type surface | [Behavior](reference.md#general-graph-walking) |
| [objectPropertyTree](#symbol-objectPropertyTree) | Runtime value and type surface | [Behavior](reference.md#api-compatibility) |
| [objectRewrite](#symbol-objectRewrite) | Runtime value and type surface | [Behavior](reference.md#api-compatibility) |
| [rewriteObject](#symbol-rewriteObject) | Runtime value and type surface | [Behavior](reference.md#rewrite-objects) |
| [rewriteObjectWithAssertedOutputType](#symbol-rewriteObjectWithAssertedOutputType) | Runtime value and type surface | [Behavior](reference.md#rewrite-objects) |
| [runTreeBreadthFirstUntilSuspendedOrTerminal](#symbol-runTreeBreadthFirstUntilSuspendedOrTerminal) | Runtime value and type surface | [Behavior](reference.md#breadth-first-traversal) |
| [runTreeBreadthFirstUntilSuspendedOrTerminalAsync](#symbol-runTreeBreadthFirstUntilSuspendedOrTerminalAsync) | Runtime value and type surface | [Behavior](reference.md#breadth-first-traversal) |
| [runTreeDepthFirstUntilSuspendedOrTerminal](#symbol-runTreeDepthFirstUntilSuspendedOrTerminal) | Runtime value and type surface | [Behavior](reference.md#traversal-orders) |
| [runTreeDepthFirstUntilSuspendedOrTerminalAsync](#symbol-runTreeDepthFirstUntilSuspendedOrTerminalAsync) | Runtime value and type surface | [Behavior](reference.md#traversal-orders) |
| [traverseDag](#symbol-traverseDag) | Runtime value and type surface | [Behavior](reference.md#dag-traversal) |
| [traverseDagAsync](#symbol-traverseDagAsync) | Runtime value and type surface | [Behavior](reference.md#dag-traversal) |
| [validateAndCreateDagFragment](#symbol-validateAndCreateDagFragment) | Runtime value and type surface | [Behavior](reference.md#dag-fragments-and-composition) |
| [validateAndPrepareDagDefinition](#symbol-validateAndPrepareDagDefinition) | Runtime value and type surface | [Behavior](reference.md#materialized-dag-definitions) |

## Declarations

<a id="symbol-AsyncBreadthFirstTreeRunner"></a>

### AsyncBreadthFirstTreeRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#breadth-first-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/breadth-first-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export interface AsyncBreadthFirstTreeRunner<InputVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> extends AsyncTraversalExecution<BreadthFirstTreeVisitPhase, TreeTraversalEvent<BreadthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes>, TreeOrDagExecutionSnapshot<BreadthFirstTreeVisitPhase>> {
getLiveResolvedTreeView(): LiveResolvedTreeView<InputVertexTypes | RewrittenVertexTypes>;
getLiveResolvedGraphView(): LiveResolvedGraphView<InputVertexTypes | RewrittenVertexTypes>;
isTreeRootVertex(ref: VertexHandle<InputVertexTypes | RewrittenVertexTypes>): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `captureExecutionSnapshot` | <code>() =&gt; TreeOrDagExecutionSnapshot&lt;BreadthFirstTreeVisitPhase&gt;</code> |
| `getLiveResolvedGraphView` | <code>() =&gt; LiveResolvedGraphView&lt;InputVertexTypes &#124; RewrittenVertexTypes, unknown&gt;</code> |
| `getLiveResolvedTreeView` | <code>() =&gt; LiveResolvedTreeView&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;</code> |
| `getTraversalLifecycleStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getTraversalStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `isSuspended` | <code>() =&gt; boolean</code> |
| `isTreeRootVertex` | <code>(ref: VertexHandle&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;) =&gt; boolean</code> |
| `requestPauseAfterAdmittedCallbacksDrain` | <code>() =&gt; boolean</code> |
| `runAndIterateObservationEventsUntilSuspendedOrTerminal` | <code>{ (): AsyncGenerator&lt;TreeTraversalEvent&lt;BreadthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes&gt;, void, unknown&gt;; &lt;Kind extends BreadthFirstTreeVisitPhase&gt;(config: TraversalExecutionSelectionPatch&lt;BreadthFirstTreeVisitPhase, Kind&gt; &amp; { deliveredEventKinds: readonly Kind[]; }): AsyncGenerator&lt;TraversalEventNarrowedToSelectedKinds&lt;TreeTraversalEvent&lt;BreadthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes&gt;, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionSelectionPatch&lt;BreadthFirstTreeVisitPhase, BreadthFirstTreeVisitPhase&gt; &#124; undefined): AsyncGenerator&lt;TreeTraversalEvent&lt;BreadthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes&gt;, void, unknown&gt;; }</code> |
| `runUntilSuspendedOrTerminal` | <code>(config?: TraversalExecutionSelectionPatch&lt;BreadthFirstTreeVisitPhase, BreadthFirstTreeVisitPhase&gt; &#124; undefined) =&gt; Promise&lt;AsyncBreadthFirstTreeRunner&lt;InputVertexTypes, RewrittenVertexTypes&gt;&gt;</code> |

</details>

<a id="symbol-AsyncBreadthFirstTreeTraversalBuilder"></a>

### AsyncBreadthFirstTreeTraversalBuilder

Runtime value and public type surface. [Owning contract](reference.md#breadth-first-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/breadth-first-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export declare class AsyncBreadthFirstTreeTraversalBuilder<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> {
constructor(icfgInput: AsyncBreadthFirstTreeTraversalBuilderOptions<InputVertexTypes, RewrittenVertexTypes>);
patchOptionsForFutureRunners(icfgInput: AsyncBreadthFirstTreeTraversalBuilderOptionsPatch<InputVertexTypes, RewrittenVertexTypes>): this;
registerVisitorCallbackForPhase<Phase extends BreadthFirstTreeVisitPhase>(phase: Phase, visitor: AsyncTreeVertexPhaseVisitorCallback<InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>>, options?: Partial<VisitorRegistrationOptions>): this;
appendVisitorGroupForPhase<Phase extends BreadthFirstTreeVisitPhase>(phase: Phase, group: VisitorGroupDefinition<AsyncTreeVertexPhaseVisitorCallback<InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>>>): this;
getDetachedVisitorRegistrationRecordsForPhase<Phase extends BreadthFirstTreeVisitPhase>(phase: Phase): AsyncBreadthFirstTreeVisitorRegistrationsByPhase<InputVertexTypes, RewrittenVertexTypes>[Phase];
replaceVisitorDefinitionsForPhase<Phase extends BreadthFirstTreeVisitPhase>(phase: Phase, input: VisitorDefinitionsForPhase<AsyncTreeVertexPhaseVisitorCallback<InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>>>): this;
createIndependentRunnerFromCurrentOptions(): AsyncBreadthFirstTreeRunner<InputVertexTypes, RewrittenVertexTypes>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `appendVisitorGroupForPhase` | <code>&lt;Phase extends BreadthFirstTreeVisitPhase&gt;(phase: Phase, group: VisitorGroupDefinition&lt;AsyncTreeVertexPhaseVisitorCallback&lt;InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;&gt;&gt;) =&gt; AsyncBreadthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `createIndependentRunnerFromCurrentOptions` | <code>() =&gt; AsyncBreadthFirstTreeRunner&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `getDetachedVisitorRegistrationRecordsForPhase` | <code>&lt;Phase extends BreadthFirstTreeVisitPhase&gt;(phase: Phase) =&gt; AsyncBreadthFirstTreeVisitorRegistrationsByPhase&lt;InputVertexTypes, RewrittenVertexTypes&gt;[Phase]</code> |
| `patchOptionsForFutureRunners` | <code>(icfgInput: AsyncBreadthFirstTreeTraversalBuilderOptionsPatch&lt;InputVertexTypes, RewrittenVertexTypes&gt;) =&gt; AsyncBreadthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `registerVisitorCallbackForPhase` | <code>&lt;Phase extends BreadthFirstTreeVisitPhase&gt;(phase: Phase, visitor: AsyncTreeVertexPhaseVisitorCallback&lt;InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;&gt;, options?: Partial&lt;VisitorRegistrationOptions&gt; &#124; undefined) =&gt; AsyncBreadthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `replaceVisitorDefinitionsForPhase` | <code>&lt;Phase extends BreadthFirstTreeVisitPhase&gt;(phase: Phase, input: VisitorDefinitionsForPhase&lt;AsyncTreeVertexPhaseVisitorCallback&lt;InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;&gt;&gt;) =&gt; AsyncBreadthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |

</details>

<a id="symbol-AsyncBreadthFirstTreeTraversalBuilderOptions"></a>

### AsyncBreadthFirstTreeTraversalBuilderOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export type AsyncBreadthFirstTreeTraversalBuilderOptions<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> = AsyncBreadthFirstTreeTraversalBuilderOptionsPatch<InputVertexTypes, RewrittenVertexTypes> & {
    treeDiscoverySource: AsyncTreeDiscoverySource<InputVertexTypes, RewrittenVertexTypes>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `maxConcurrentCallbackInvocations` | <code>number &#124; undefined</code> |
| `retainDiscoveredTreeBeforeVisitorCommands` | <code>boolean &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>AsyncChildHintsListTransformer&lt;InputVertexTypes&gt; &#124; null &#124; undefined</code> |
| `treeDiscoverySource` | <code>AsyncTreeDiscoverySource&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `visitors` | <code>VisitorDefinitionsByPhase&lt;AsyncBreadthFirstTreeVisitorRegistrationsByPhase&lt;InputVertexTypes, RewrittenVertexTypes&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-AsyncBreadthFirstTreeTraversalBuilderOptionsPatch"></a>

### AsyncBreadthFirstTreeTraversalBuilderOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export type AsyncBreadthFirstTreeTraversalBuilderOptionsPatch<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> = {
    treeDiscoverySource?: AsyncTreeDiscoverySource<InputVertexTypes, RewrittenVertexTypes> | undefined;
    transformChildHintsBeforeResolution?: AsyncChildHintsListTransformer<InputVertexTypes> | null | undefined;
    visitors?: VisitorDefinitionsByPhase<AsyncBreadthFirstTreeVisitorRegistrationsByPhase<InputVertexTypes, RewrittenVertexTypes>> | undefined;
    retainDiscoveredTreeBeforeVisitorCommands?: boolean | undefined;
    maxConcurrentCallbackInvocations?: number | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `maxConcurrentCallbackInvocations` | <code>number &#124; undefined</code> |
| `retainDiscoveredTreeBeforeVisitorCommands` | <code>boolean &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>AsyncChildHintsListTransformer&lt;InputVertexTypes&gt; &#124; null &#124; undefined</code> |
| `treeDiscoverySource` | <code>AsyncTreeDiscoverySource&lt;InputVertexTypes, RewrittenVertexTypes&gt; &#124; undefined</code> |
| `visitors` | <code>VisitorDefinitionsByPhase&lt;AsyncBreadthFirstTreeVisitorRegistrationsByPhase&lt;InputVertexTypes, RewrittenVertexTypes&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-AsyncChildHintsListTransformer"></a>

### AsyncChildHintsListTransformer

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](reference.md#hint-transformation-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type AsyncChildHintsListTransformer<InputVertexTypes extends VertexDataAndChildHintTypes> = (hints: InputVertexTypes['ChildHint'][]) => MaybePromise<InputVertexTypes['ChildHint'][]>;
```

<a id="symbol-AsyncDagDiscoverySource"></a>

### AsyncDagDiscoverySource

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-prerequisite-resolution-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface AsyncDagDiscoverySource<SourceVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, VertexId = unknown> {
resolvePrerequisiteByVertexId?: (vertexId: VertexId) => MaybePromise<DagPrerequisiteLookupResult<SourceVertexTypes, VertexId>>;
resolveRootVertex: () => MaybePromise<DagSourceVertexResolution<SourceVertexTypes, VertexId>>;
resolveChildHint: (hint: SourceVertexTypes['ChildHint'], context: DagChildResolutionContext<SourceVertexTypes, RewrittenVertexTypes, VertexId>) => MaybePromise<DagSourceVertexResolution<SourceVertexTypes, VertexId>>;
tryGetVertexIdentityFromHint?: (hint: SourceVertexTypes['ChildHint']) => MaybePromise<ChildHintVertexIdentity<VertexId> | undefined>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `resolveChildHint` | <code>(hint: SourceVertexTypes["ChildHint"], context: DagChildResolutionContext&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;) =&gt; MaybePromise&lt;DagSourceVertexResolution&lt;SourceVertexTypes, VertexId&gt;&gt;</code> |
| `resolvePrerequisiteByVertexId` | <code>((vertexId: VertexId) =&gt; MaybePromise&lt;DagPrerequisiteLookupResult&lt;SourceVertexTypes, VertexId&gt;&gt;) &#124; undefined</code> |
| `resolveRootVertex` | <code>() =&gt; MaybePromise&lt;DagSourceVertexResolution&lt;SourceVertexTypes, VertexId&gt;&gt;</code> |
| `tryGetVertexIdentityFromHint` | <code>((hint: SourceVertexTypes["ChildHint"]) =&gt; MaybePromise&lt;ChildHintVertexIdentity&lt;VertexId&gt; &#124; undefined&gt;) &#124; undefined</code> |

</details>

<a id="symbol-AsyncDagExternalWorkSession"></a>

### AsyncDagExternalWorkSession

Type-only; no runtime constructor/value. [Owning contract](reference.md#ticket-coordination) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export interface AsyncDagExternalWorkSession<VertexId = unknown> extends DagExternalWorkSessionControl<VertexId> {
runUntilWorkBoundary(): Promise<DagExternalWorkRunBoundary<VertexId>>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `acceptCompletedWork` | <code>(ticket: DagWorkSettlementTicket&lt;VertexId&gt;) =&gt; DagSettlementReceipt</code> |
| `captureExecutionSnapshot` | <code>() =&gt; TreeOrDagExecutionSnapshot&lt;DagVisitorPhase&gt;</code> |
| `captureMilestoneSnapshot` | <code>() =&gt; DagMilestoneSnapshot&lt;VertexId&gt;</code> |
| `captureProgressSnapshot` | <code>() =&gt; Readonly&lt;{ discovery: Readonly&lt;{ timing: "incrementalDuringTraversal" &#124; "completeBeforeAnyVisitor"; complete: boolean; }&gt;; counts: Readonly&lt;{ retainedLiveVertices: number; verticesWaitingForPrerequisiteMilestones: number; workVisitorReadyOrWorkCompletionDeferredVertices: number; workCompletionDeferredVertices: number; verticesWithAdmittedVisitorChains: number; workCompletionCommittedVertices: number; subgraphCompletionCommittedVertices: number; }&gt;; progressByVertexId: ReadonlyMap&lt;VertexId, Readonly&lt;{ vertexId: VertexId; workState: DagWorkState; subgraphCompletionCommitted: boolean; unmetPrerequisiteVertexIds: readonly VertexId[]; unmetWorkMilestoneVertexIds: readonly VertexId[]; unmetSubgraphCompletionMilestoneVertexIds: readonly VertexId[]; settlementToken?: symbol &#124; undefined; }&gt;&gt;; workVisitorReadyOrWorkCompletionDeferredVertexIds: readonly VertexId[]; workCompletionDeferredVertexIds: readonly VertexId[]; workAwaitingSettlement: readonly Readonly&lt;{ vertexId: VertexId; settlementToken: symbol; }&gt;[]; admittedVisitorChainVertexIds: readonly VertexId[]; workCompletionCommittedVertexIds: readonly VertexId[]; subgraphCompletionCommittedVertexIds: readonly VertexId[]; unmatchedCompletedWorkSeedVertexIds: readonly VertexId[]; invalidDependencyTopologyDiagnostics: DagTraversalStallDiagnostics&lt;VertexId&gt; &#124; null; }&gt;</code> |
| `failTraversal` | <code>(ticket: DagWorkSettlementTicket&lt;VertexId&gt;, error: unknown) =&gt; DagSettlementReceipt</code> |
| `getTraversalLifecycleStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getTraversalStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `isSuspended` | <code>() =&gt; boolean</code> |
| `requestPauseAfterAdmittedCallbacksDrain` | <code>() =&gt; boolean</code> |
| `runUntilWorkBoundary` | <code>() =&gt; Promise&lt;DagExternalWorkRunBoundary&lt;VertexId&gt;&gt;</code> |

</details>

<a id="symbol-AsyncDagExternalWorkSessionOptions"></a>

### AsyncDagExternalWorkSessionOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type AsyncDagExternalWorkSessionOptions<VertexId> = DagExternalWorkSessionOptions<VertexId> & {
    maxConcurrentCallbackInvocations?: number;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `acceptedCompletedWorkVertexIds` | <code>ReadonlySet&lt;VertexId&gt; &#124; undefined</code> |
| `dagDiscoverySource` | <code>undefined</code> |
| `discoveryTiming` | <code>undefined</code> |
| `maxConcurrentCallbackInvocations` | <code>number &#124; undefined</code> |
| `retainDiscoveredGraphBeforeVisitorCommands` | <code>undefined</code> |
| `rootWorkPrerequisitePolicy` | <code>undefined</code> |
| `sourceRootIsHiddenEntryHolder` | <code>undefined</code> |
| `transformChildHintsBeforeResolution` | <code>undefined</code> |
| `traversalRunnerInternalObjects` | <code>undefined</code> |
| `treeDiscoverySource` | <code>undefined</code> |
| `undeclaredWorkPrerequisitePolicy` | <code>undefined</code> |
| `visitors` | <code>undefined</code> |
| `workCompletionPolicy` | <code>undefined</code> |

</details>

<a id="symbol-AsyncDagRecordSelectors"></a>

### AsyncDagRecordSelectors

Type-only; no runtime constructor/value. [Owning contract](reference.md#collection-and-forest-sources) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/quickstart-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/dag-input-materialization`.

```ts
export type AsyncDagRecordSelectors<Item, VertexId> = {
    selectVertexId(item: Item): MaybePromise<VertexId>;
    selectStructuralChildVertexIds?(item: Item): MaybePromise<SyncOrAsyncIterable<VertexId>>;
    selectWorkPrerequisiteVertexIds?(item: Item): MaybePromise<SyncOrAsyncIterable<VertexId>>;
    selectSubgraphCompletionPrerequisiteVertexIds?(item: Item): MaybePromise<SyncOrAsyncIterable<VertexId>>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `selectStructuralChildVertexIds` | <code>((item: Item) =&gt; MaybePromise&lt;SyncOrAsyncIterable&lt;VertexId&gt;&gt;) &#124; undefined</code> |
| `selectSubgraphCompletionPrerequisiteVertexIds` | <code>((item: Item) =&gt; MaybePromise&lt;SyncOrAsyncIterable&lt;VertexId&gt;&gt;) &#124; undefined</code> |
| `selectVertexId` | <code>(item: Item) =&gt; MaybePromise&lt;VertexId&gt;</code> |
| `selectWorkPrerequisiteVertexIds` | <code>((item: Item) =&gt; MaybePromise&lt;SyncOrAsyncIterable&lt;VertexId&gt;&gt;) &#124; undefined</code> |

</details>

<a id="symbol-AsyncDagRootRecordSelectors"></a>

### AsyncDagRootRecordSelectors

Type-only; no runtime constructor/value. [Owning contract](reference.md#collection-and-forest-sources) · [Related example](reference.md#roots-materialization-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/dag-input-materialization`.

```ts
export type AsyncDagRootRecordSelectors<Item, VertexId> = Omit<AsyncDagRecordSelectors<Item, VertexId>, 'selectStructuralChildVertexIds'> & {
    selectStructuralChildRecords?(item: Item): MaybePromise<SyncOrAsyncIterable<Item>>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `selectStructuralChildRecords` | <code>((item: Item) =&gt; MaybePromise&lt;SyncOrAsyncIterable&lt;Item&gt;&gt;) &#124; undefined</code> |
| `selectSubgraphCompletionPrerequisiteVertexIds` | <code>((item: Item) =&gt; MaybePromise&lt;SyncOrAsyncIterable&lt;VertexId&gt;&gt;) &#124; undefined</code> |
| `selectVertexId` | <code>(item: Item) =&gt; MaybePromise&lt;VertexId&gt;</code> |
| `selectWorkPrerequisiteVertexIds` | <code>((item: Item) =&gt; MaybePromise&lt;SyncOrAsyncIterable&lt;VertexId&gt;&gt;) &#124; undefined</code> |

</details>

<a id="symbol-AsyncDagTopologyDiscoveryInput"></a>

### AsyncDagTopologyDiscoveryInput

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type AsyncDagTopologyDiscoveryInput<SourceVertexTypes extends VertexDataAndChildHintTypes, VertexId = unknown> = DagTopologyDiscoveryOptions & {
    dagDiscoverySource: AsyncDagDiscoverySource<SourceVertexTypes, SourceVertexTypes, VertexId>;
    maxConcurrentCallbackInvocations?: number;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `acceptedCompletedWorkVertexIds` | <code>undefined</code> |
| `dagDiscoverySource` | <code>AsyncDagDiscoverySource&lt;SourceVertexTypes, SourceVertexTypes, VertexId&gt;</code> |
| `discoveryTiming` | <code>undefined</code> |
| `maxConcurrentCallbackInvocations` | <code>number &#124; undefined</code> |
| `retainDiscoveredGraphBeforeVisitorCommands` | <code>undefined</code> |
| `rootWorkPrerequisitePolicy` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `sourceRootIsHiddenEntryHolder` | <code>boolean &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>undefined</code> |
| `traversalRunnerInternalObjects` | <code>undefined</code> |
| `treeDiscoverySource` | <code>undefined</code> |
| `undeclaredWorkPrerequisitePolicy` | <code>"none" &#124; "waitForDiscoveringParentWork" &#124; undefined</code> |
| `visitors` | <code>undefined</code> |
| `workCompletionPolicy` | <code>undefined</code> |

</details>

<a id="symbol-AsyncDagTraversalBuilder"></a>

### AsyncDagTraversalBuilder

Runtime value and public type surface. [Owning contract](reference.md#dag-traversal) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-prerequisite-resolution-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare class AsyncDagTraversalBuilder<SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, VertexId = unknown> {
constructor(input: Omit<AsyncDagTraversalBuilderOptions<SourceVertexTypes, RewrittenVertexTypes, VertexId>, 'dagDiscoverySource' | 'treeDiscoverySource'> & ({
        dagDiscoverySource: DagDiscoverySource<SourceVertexTypes, RewrittenVertexTypes, VertexId>;
        treeDiscoverySource?: undefined;
    } | {
        rootWorkPrerequisitePolicy?: never;
        undeclaredWorkPrerequisitePolicy?: never;
        treeDiscoverySource: unknown extends VertexId ? AsyncTreeDiscoverySource<SourceVertexTypes, RewrittenVertexTypes> : never;
        dagDiscoverySource?: undefined;
    }));
constructor(input: AsyncDagTraversalBuilderOptions<SourceVertexTypes, RewrittenVertexTypes, VertexId>);
patchOptionsForFutureRunners(input: AsyncDagTraversalBuilderOptionsPatch<SourceVertexTypes, RewrittenVertexTypes, VertexId>): this;
registerVisitorCallbackForPhase<Phase extends DagVisitorPhase>(order: Phase, visitor: AsyncDagVisitor<SourceVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>, VertexId>, options?: Partial<VisitorRegistrationOptions>): this;
appendVisitorGroupForPhase<Phase extends DagVisitorPhase>(order: Phase, group: VisitorGroupDefinition<AsyncDagVisitor<SourceVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>, VertexId>>): this;
getDetachedVisitorRegistrationRecordsForPhase<Phase extends DagVisitorPhase>(order: Phase): AsyncDagTraversalVisitors<SourceVertexTypes, RewrittenVertexTypes, VertexId>[Phase];
replaceVisitorDefinitionsForPhase<Phase extends DagVisitorPhase>(order: Phase, input: VisitorDefinitionsForPhase<AsyncDagVisitor<SourceVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>, VertexId>>): this;
createIndependentRunnerFromCurrentOptions(): AsyncDagTraversalRunner<SourceVertexTypes, RewrittenVertexTypes, VertexId>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `appendVisitorGroupForPhase` | <code>&lt;Phase extends DagVisitorPhase&gt;(order: Phase, group: VisitorGroupDefinition&lt;AsyncDagVisitor&lt;SourceVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;, VertexId&gt;&gt;) =&gt; AsyncDagTraversalBuilder&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;</code> |
| `createIndependentRunnerFromCurrentOptions` | <code>() =&gt; AsyncDagTraversalRunner&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;</code> |
| `getDetachedVisitorRegistrationRecordsForPhase` | <code>&lt;Phase extends DagVisitorPhase&gt;(order: Phase) =&gt; AsyncDagTraversalVisitors&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;[Phase]</code> |
| `patchOptionsForFutureRunners` | <code>(input: AsyncDagTraversalBuilderOptionsPatch&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;) =&gt; AsyncDagTraversalBuilder&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;</code> |
| `registerVisitorCallbackForPhase` | <code>&lt;Phase extends DagVisitorPhase&gt;(order: Phase, visitor: AsyncDagVisitor&lt;SourceVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;, VertexId&gt;, options?: Partial&lt;VisitorRegistrationOptions&gt; &#124; undefined) =&gt; AsyncDagTraversalBuilder&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;</code> |
| `replaceVisitorDefinitionsForPhase` | <code>&lt;Phase extends DagVisitorPhase&gt;(order: Phase, input: VisitorDefinitionsForPhase&lt;AsyncDagVisitor&lt;SourceVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;, VertexId&gt;&gt;) =&gt; AsyncDagTraversalBuilder&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;</code> |

</details>

<a id="symbol-AsyncDagTraversalBuilderOptions"></a>

### AsyncDagTraversalBuilderOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type AsyncDagTraversalBuilderOptions<SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, VertexId = unknown> = AsyncDagSource<SourceVertexTypes, RewrittenVertexTypes, VertexId> & AsyncDagTraversalOptionsInput<SourceVertexTypes, RewrittenVertexTypes, VertexId> & ({
    dagDiscoverySource: AsyncDagDiscoverySource<SourceVertexTypes, RewrittenVertexTypes, VertexId>;
} | {
    rootWorkPrerequisitePolicy?: never;
    undeclaredWorkPrerequisitePolicy?: never;
});
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `acceptedCompletedWorkVertexIds` | <code>ReadonlySet&lt;VertexId&gt; &#124; undefined</code> |
| `dagDiscoverySource` | <code>AsyncDagDiscoverySource&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt; &#124; undefined</code> |
| `discoveryTiming` | <code>"incrementalDuringTraversal" &#124; "completeBeforeAnyVisitor" &#124; undefined</code> |
| `maxConcurrentCallbackInvocations` | <code>number &#124; undefined</code> |
| `retainDiscoveredGraphBeforeVisitorCommands` | <code>boolean &#124; undefined</code> |
| `rootWorkPrerequisitePolicy` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `sourceRootIsHiddenEntryHolder` | <code>boolean &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>AsyncChildHintsListTransformer&lt;SourceVertexTypes&gt; &#124; null &#124; undefined</code> |
| `treeDiscoverySource` | <code>(unknown extends VertexId ? AsyncTreeDiscoverySource&lt;SourceVertexTypes, RewrittenVertexTypes&gt; : never) &#124; undefined</code> |
| `undeclaredWorkPrerequisitePolicy` | <code>"none" &#124; "waitForDiscoveringParentWork" &#124; undefined</code> |
| `visitors` | <code>VisitorDefinitionsByPhase&lt;AsyncDagTraversalVisitors&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;&gt; &#124; undefined</code> |
| `workCompletionPolicy` | <code>"afterWorkReadyVisitorChain" &#124; "requireExternalWorkSettlement" &#124; undefined</code> |

</details>

<a id="symbol-AsyncDagTraversalBuilderOptionsPatch"></a>

### AsyncDagTraversalBuilderOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type AsyncDagTraversalBuilderOptionsPatch<SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, VertexId = unknown> = AsyncDagTraversalOptionsInput<SourceVertexTypes, RewrittenVertexTypes, VertexId> & ({
    dagDiscoverySource?: AsyncDagDiscoverySource<SourceVertexTypes, RewrittenVertexTypes, VertexId> | undefined;
    treeDiscoverySource?: undefined;
} | {
    rootWorkPrerequisitePolicy?: never;
    undeclaredWorkPrerequisitePolicy?: never;
    treeDiscoverySource?: (unknown extends VertexId ? AsyncTreeDiscoverySource<SourceVertexTypes, RewrittenVertexTypes> : never) | undefined;
    dagDiscoverySource?: undefined;
});
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `acceptedCompletedWorkVertexIds` | <code>ReadonlySet&lt;VertexId&gt; &#124; undefined</code> |
| `dagDiscoverySource` | <code>AsyncDagDiscoverySource&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt; &#124; undefined</code> |
| `discoveryTiming` | <code>"incrementalDuringTraversal" &#124; "completeBeforeAnyVisitor" &#124; undefined</code> |
| `maxConcurrentCallbackInvocations` | <code>number &#124; undefined</code> |
| `retainDiscoveredGraphBeforeVisitorCommands` | <code>boolean &#124; undefined</code> |
| `rootWorkPrerequisitePolicy` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `sourceRootIsHiddenEntryHolder` | <code>boolean &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>AsyncChildHintsListTransformer&lt;SourceVertexTypes&gt; &#124; null &#124; undefined</code> |
| `treeDiscoverySource` | <code>(unknown extends VertexId ? AsyncTreeDiscoverySource&lt;SourceVertexTypes, RewrittenVertexTypes&gt; : never) &#124; undefined</code> |
| `undeclaredWorkPrerequisitePolicy` | <code>"none" &#124; "waitForDiscoveringParentWork" &#124; undefined</code> |
| `visitors` | <code>VisitorDefinitionsByPhase&lt;AsyncDagTraversalVisitors&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;&gt; &#124; undefined</code> |
| `workCompletionPolicy` | <code>"afterWorkReadyVisitorChain" &#124; "requireExternalWorkSettlement" &#124; undefined</code> |

</details>

<a id="symbol-AsyncDagTraversalRunner"></a>

### AsyncDagTraversalRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-prerequisite-resolution-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export interface AsyncDagTraversalRunner<SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, VertexId = unknown> extends AsyncTraversalExecution<DagVisitorPhase, DagCommittedMilestoneEvent<SourceVertexTypes | RewrittenVertexTypes, VertexId>, TreeOrDagExecutionSnapshot<DagVisitorPhase>, 'workCompletionCommitted' | 'subgraphCompletionCommitted'> {
readonly preCommandDiscoveredGraphView: PreCommandDiscoveredGraphView<SourceVertexTypes, VertexId> | null;
discoverValidateAndFreezeTopology(): Promise<this>;
captureMilestoneSnapshot(): DagMilestoneSnapshot<VertexId>;
captureProgressSnapshot(): DagProgressSnapshot<VertexId>;
settleDeferredWork(vertexId: VertexId, outcome: DagSettlementOutcome, expectedSettlementToken: DagWorkSettlementToken): boolean;
getLiveResolvedTreeView(): LiveResolvedTreeView<SourceVertexTypes | RewrittenVertexTypes> | null;
getLiveResolvedGraphView(): LiveResolvedGraphView<SourceVertexTypes | RewrittenVertexTypes, VertexId>;
isVisibleSourceRootVertex(vertexHandle: VertexHandle<SourceVertexTypes | RewrittenVertexTypes>): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `captureExecutionSnapshot` | <code>() =&gt; TreeOrDagExecutionSnapshot&lt;DagVisitorPhase&gt;</code> |
| `captureMilestoneSnapshot` | <code>() =&gt; DagMilestoneSnapshot&lt;VertexId&gt;</code> |
| `captureProgressSnapshot` | <code>() =&gt; Readonly&lt;{ discovery: Readonly&lt;{ timing: "incrementalDuringTraversal" &#124; "completeBeforeAnyVisitor"; complete: boolean; }&gt;; counts: Readonly&lt;{ retainedLiveVertices: number; verticesWaitingForPrerequisiteMilestones: number; workVisitorReadyOrWorkCompletionDeferredVertices: number; workCompletionDeferredVertices: number; verticesWithAdmittedVisitorChains: number; workCompletionCommittedVertices: number; subgraphCompletionCommittedVertices: number; }&gt;; progressByVertexId: ReadonlyMap&lt;VertexId, Readonly&lt;{ vertexId: VertexId; workState: DagWorkState; subgraphCompletionCommitted: boolean; unmetPrerequisiteVertexIds: readonly VertexId[]; unmetWorkMilestoneVertexIds: readonly VertexId[]; unmetSubgraphCompletionMilestoneVertexIds: readonly VertexId[]; settlementToken?: symbol &#124; undefined; }&gt;&gt;; workVisitorReadyOrWorkCompletionDeferredVertexIds: readonly VertexId[]; workCompletionDeferredVertexIds: readonly VertexId[]; workAwaitingSettlement: readonly Readonly&lt;{ vertexId: VertexId; settlementToken: symbol; }&gt;[]; admittedVisitorChainVertexIds: readonly VertexId[]; workCompletionCommittedVertexIds: readonly VertexId[]; subgraphCompletionCommittedVertexIds: readonly VertexId[]; unmatchedCompletedWorkSeedVertexIds: readonly VertexId[]; invalidDependencyTopologyDiagnostics: DagTraversalStallDiagnostics&lt;VertexId&gt; &#124; null; }&gt;</code> |
| `discoverValidateAndFreezeTopology` | <code>() =&gt; Promise&lt;AsyncDagTraversalRunner&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;&gt;</code> |
| `getLiveResolvedGraphView` | <code>() =&gt; LiveResolvedGraphView&lt;SourceVertexTypes &#124; RewrittenVertexTypes, VertexId&gt;</code> |
| `getLiveResolvedTreeView` | <code>() =&gt; LiveResolvedTreeView&lt;SourceVertexTypes &#124; RewrittenVertexTypes&gt; &#124; null</code> |
| `getTraversalLifecycleStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getTraversalStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `isSuspended` | <code>() =&gt; boolean</code> |
| `isVisibleSourceRootVertex` | <code>(vertexHandle: VertexHandle&lt;SourceVertexTypes &#124; RewrittenVertexTypes&gt;) =&gt; boolean</code> |
| `preCommandDiscoveredGraphView` | <code>PreCommandDiscoveredGraphView&lt;SourceVertexTypes, VertexId&gt; &#124; null</code> |
| `requestPauseAfterAdmittedCallbacksDrain` | <code>() =&gt; boolean</code> |
| `runAndIterateObservationEventsUntilSuspendedOrTerminal` | <code>{ (): AsyncGenerator&lt;DagCommittedMilestoneEvent&lt;SourceVertexTypes &#124; RewrittenVertexTypes, VertexId&gt;, void, unknown&gt;; &lt;Kind extends "workCompletionCommitted" &#124; "subgraphCompletionCommitted"&gt;(config: TraversalExecutionSelectionPatch&lt;DagVisitorPhase, Kind&gt; &amp; { deliveredEventKinds: readonly Kind[]; }): AsyncGenerator&lt;TraversalEventNarrowedToSelectedKinds&lt;DagCommittedMilestoneEvent&lt;SourceVertexTypes &#124; RewrittenVertexTypes, VertexId&gt;, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionSelectionPatch&lt;DagVisitorPhase, "workCompletionCommitted" &#124; "subgraphCompletionCommitted"&gt; &#124; undefined): AsyncGenerator&lt;DagCommittedMilestoneEvent&lt;SourceVertexTypes &#124; RewrittenVertexTypes, VertexId&gt;, void, unknown&gt;; }</code> |
| `runUntilSuspendedOrTerminal` | <code>(config?: TraversalExecutionSelectionPatch&lt;DagVisitorPhase, "workCompletionCommitted" &#124; "subgraphCompletionCommitted"&gt; &#124; undefined) =&gt; Promise&lt;AsyncDagTraversalRunner&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;&gt;</code> |
| `settleDeferredWork` | <code>(vertexId: VertexId, outcome: DagSettlementOutcome, expectedSettlementToken: symbol) =&gt; boolean</code> |

</details>

<a id="symbol-AsyncDagVisitor"></a>

### AsyncDagVisitor

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-prerequisite-resolution-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type AsyncDagVisitor<SourceVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, Phase extends DagVisitorPhase = DagVisitorPhase, VertexId = unknown> = VisitorCallbackReturnValue<RewrittenVertexTypes, Phase, 'dag', SourceVertexTypes['ChildHint']> extends infer VisitorResult ? (vertex: VertexView<SourceVertexTypes | RewrittenVertexTypes>, context: DagVisitorContext<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>) => MaybePromise<VisitorResult> : never;
```

<a id="symbol-AsyncDepthFirstTreeRunner"></a>

### AsyncDepthFirstTreeRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#traversal-orders) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/async-adapter-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export interface AsyncDepthFirstTreeRunner<InputVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> extends AsyncTraversalExecution<DepthFirstTreeVisitPhase, TreeTraversalEvent<DepthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes>, TreeOrDagExecutionSnapshot<DepthFirstTreeVisitPhase>> {
getLiveResolvedTreeView(): LiveResolvedTreeView<InputVertexTypes | RewrittenVertexTypes>;
getLiveResolvedGraphView(): LiveResolvedGraphView<InputVertexTypes | RewrittenVertexTypes>;
isTreeRootVertex(ref: VertexHandle<InputVertexTypes | RewrittenVertexTypes>): boolean;
hasSkippedPendingChildDiscovery(ref: VertexHandle<InputVertexTypes | RewrittenVertexTypes>): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `captureExecutionSnapshot` | <code>() =&gt; TreeOrDagExecutionSnapshot&lt;DepthFirstTreeVisitPhase&gt;</code> |
| `getLiveResolvedGraphView` | <code>() =&gt; LiveResolvedGraphView&lt;InputVertexTypes &#124; RewrittenVertexTypes, unknown&gt;</code> |
| `getLiveResolvedTreeView` | <code>() =&gt; LiveResolvedTreeView&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;</code> |
| `getTraversalLifecycleStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getTraversalStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `hasSkippedPendingChildDiscovery` | <code>(ref: VertexHandle&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;) =&gt; boolean</code> |
| `isSuspended` | <code>() =&gt; boolean</code> |
| `isTreeRootVertex` | <code>(ref: VertexHandle&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;) =&gt; boolean</code> |
| `requestPauseAfterAdmittedCallbacksDrain` | <code>() =&gt; boolean</code> |
| `runAndIterateObservationEventsUntilSuspendedOrTerminal` | <code>{ (): AsyncGenerator&lt;TreeTraversalEvent&lt;DepthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes&gt;, void, unknown&gt;; &lt;Kind extends DepthFirstTreeVisitPhase&gt;(config: TraversalExecutionSelectionPatch&lt;DepthFirstTreeVisitPhase, Kind&gt; &amp; { deliveredEventKinds: readonly Kind[]; }): AsyncGenerator&lt;TraversalEventNarrowedToSelectedKinds&lt;TreeTraversalEvent&lt;DepthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes&gt;, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionSelectionPatch&lt;DepthFirstTreeVisitPhase, DepthFirstTreeVisitPhase&gt; &#124; undefined): AsyncGenerator&lt;TreeTraversalEvent&lt;DepthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes&gt;, void, unknown&gt;; }</code> |
| `runUntilSuspendedOrTerminal` | <code>(config?: TraversalExecutionSelectionPatch&lt;DepthFirstTreeVisitPhase, DepthFirstTreeVisitPhase&gt; &#124; undefined) =&gt; Promise&lt;AsyncDepthFirstTreeRunner&lt;InputVertexTypes, RewrittenVertexTypes&gt;&gt;</code> |

</details>

<a id="symbol-AsyncDepthFirstTreeTraversalBuilder"></a>

### AsyncDepthFirstTreeTraversalBuilder

Runtime value and public type surface. [Owning contract](reference.md#traversal-orders) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/async-adapter-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export declare class AsyncDepthFirstTreeTraversalBuilder<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> {
constructor(icfgInput: AsyncDepthFirstTreeTraversalBuilderOptions<InputVertexTypes, RewrittenVertexTypes>);
patchOptionsForFutureRunners(icfgInput: AsyncDepthFirstTreeTraversalBuilderOptionsPatch<InputVertexTypes, RewrittenVertexTypes>): this;
registerVisitorCallbackForPhase<Phase extends DepthFirstTreeVisitPhase>(phase: Phase, visitor: AsyncTreeVertexPhaseVisitorCallback<InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>>, options?: Partial<VisitorRegistrationOptions>): this;
appendVisitorGroupForPhase<Phase extends DepthFirstTreeVisitPhase>(phase: Phase, group: VisitorGroupDefinition<AsyncTreeVertexPhaseVisitorCallback<InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>>>): this;
getDetachedVisitorRegistrationRecordsForPhase<Phase extends DepthFirstTreeVisitPhase>(phase: Phase): AsyncDepthFirstTreeVisitorRegistrationsByPhase<InputVertexTypes, RewrittenVertexTypes>[Phase];
replaceVisitorDefinitionsForPhase<Phase extends DepthFirstTreeVisitPhase>(phase: Phase, input: VisitorDefinitionsForPhase<AsyncTreeVertexPhaseVisitorCallback<InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>>>): this;
createIndependentRunnerFromCurrentOptions(): AsyncDepthFirstTreeRunner<InputVertexTypes, RewrittenVertexTypes>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `appendVisitorGroupForPhase` | <code>&lt;Phase extends DepthFirstTreeVisitPhase&gt;(phase: Phase, group: VisitorGroupDefinition&lt;AsyncTreeVertexPhaseVisitorCallback&lt;InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;&gt;&gt;) =&gt; AsyncDepthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `createIndependentRunnerFromCurrentOptions` | <code>() =&gt; AsyncDepthFirstTreeRunner&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `getDetachedVisitorRegistrationRecordsForPhase` | <code>&lt;Phase extends DepthFirstTreeVisitPhase&gt;(phase: Phase) =&gt; AsyncDepthFirstTreeVisitorRegistrationsByPhase&lt;InputVertexTypes, RewrittenVertexTypes&gt;[Phase]</code> |
| `patchOptionsForFutureRunners` | <code>(icfgInput: AsyncDepthFirstTreeTraversalBuilderOptionsPatch&lt;InputVertexTypes, RewrittenVertexTypes&gt;) =&gt; AsyncDepthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `registerVisitorCallbackForPhase` | <code>&lt;Phase extends DepthFirstTreeVisitPhase&gt;(phase: Phase, visitor: AsyncTreeVertexPhaseVisitorCallback&lt;InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;&gt;, options?: Partial&lt;VisitorRegistrationOptions&gt; &#124; undefined) =&gt; AsyncDepthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `replaceVisitorDefinitionsForPhase` | <code>&lt;Phase extends DepthFirstTreeVisitPhase&gt;(phase: Phase, input: VisitorDefinitionsForPhase&lt;AsyncTreeVertexPhaseVisitorCallback&lt;InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;&gt;&gt;) =&gt; AsyncDepthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |

</details>

<a id="symbol-AsyncDepthFirstTreeTraversalBuilderOptions"></a>

### AsyncDepthFirstTreeTraversalBuilderOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export type AsyncDepthFirstTreeTraversalBuilderOptions<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> = AsyncDepthFirstTreeTraversalBuilderOptionsPatch<InputVertexTypes, RewrittenVertexTypes> & {
    treeDiscoverySource: AsyncTreeDiscoverySource<InputVertexTypes, RewrittenVertexTypes>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `childBoundaryVisits` | <code>DepthFirstChildBoundaryVisitOptionsPatch &#124; undefined</code> |
| `maxConcurrentCallbackInvocations` | <code>number &#124; undefined</code> |
| `retainDiscoveredTreeBeforeVisitorCommands` | <code>boolean &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>AsyncChildHintsListTransformer&lt;InputVertexTypes&gt; &#124; null &#124; undefined</code> |
| `treeDiscoverySource` | <code>AsyncTreeDiscoverySource&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `visitors` | <code>VisitorDefinitionsByPhase&lt;AsyncDepthFirstTreeVisitorRegistrationsByPhase&lt;InputVertexTypes, RewrittenVertexTypes&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-AsyncDepthFirstTreeTraversalBuilderOptionsPatch"></a>

### AsyncDepthFirstTreeTraversalBuilderOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export type AsyncDepthFirstTreeTraversalBuilderOptionsPatch<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> = {
    treeDiscoverySource?: AsyncTreeDiscoverySource<InputVertexTypes, RewrittenVertexTypes> | undefined;
    transformChildHintsBeforeResolution?: AsyncChildHintsListTransformer<InputVertexTypes> | null | undefined;
    visitors?: VisitorDefinitionsByPhase<AsyncDepthFirstTreeVisitorRegistrationsByPhase<InputVertexTypes, RewrittenVertexTypes>> | undefined;
    retainDiscoveredTreeBeforeVisitorCommands?: boolean | undefined;
    childBoundaryVisits?: DepthFirstChildBoundaryVisitOptionsPatch | undefined;
    maxConcurrentCallbackInvocations?: number | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `childBoundaryVisits` | <code>DepthFirstChildBoundaryVisitOptionsPatch &#124; undefined</code> |
| `maxConcurrentCallbackInvocations` | <code>number &#124; undefined</code> |
| `retainDiscoveredTreeBeforeVisitorCommands` | <code>boolean &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>AsyncChildHintsListTransformer&lt;InputVertexTypes&gt; &#124; null &#124; undefined</code> |
| `treeDiscoverySource` | <code>AsyncTreeDiscoverySource&lt;InputVertexTypes, RewrittenVertexTypes&gt; &#124; undefined</code> |
| `visitors` | <code>VisitorDefinitionsByPhase&lt;AsyncDepthFirstTreeVisitorRegistrationsByPhase&lt;InputVertexTypes, RewrittenVertexTypes&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-AsyncGraphWalkBuilder"></a>

### AsyncGraphWalkBuilder

Runtime value and public type surface. [Owning contract](reference.md#general-graph-walking) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare class AsyncGraphWalkBuilder<VertexData, EdgeData, VertexId> {
constructor(options: AsyncGraphWalkBuilderOptions<VertexData, EdgeData, VertexId>);
patchOptionsForFutureRunners(patch: AsyncGraphWalkBuilderOptionsPatch<VertexData, EdgeData, VertexId>): this;
addVisitorForObservationKind<ObservationKind extends GraphWalkObservationKind>(observationKind: ObservationKind, visitor: AsyncGraphWalkVisitor<VertexData, EdgeData, PreventVisitorReturnFromWideningPhase<ObservationKind>, VertexId>, options?: Partial<VisitorRegistrationOptions>): this;
addVisitorGroupForObservationKind<ObservationKind extends GraphWalkObservationKind>(observationKind: ObservationKind, group: VisitorGroupDefinition<AsyncGraphWalkVisitor<VertexData, EdgeData, PreventVisitorReturnFromWideningPhase<ObservationKind>, VertexId>>): this;
replaceVisitorsForObservationKind<ObservationKind extends GraphWalkObservationKind>(observationKind: ObservationKind, input: VisitorDefinitionsForPhase<AsyncGraphWalkVisitor<VertexData, EdgeData, PreventVisitorReturnFromWideningPhase<ObservationKind>, VertexId>>): this;
listVisitorRegistrationsForObservationKind<ObservationKind extends GraphWalkObservationKind>(observationKind: ObservationKind): VisitorRecord<AsyncGraphWalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>>[];
createIndependentRunnerFromCurrentOptions(): AsyncGraphWalkRunner<VertexData, EdgeData, VertexId>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `addVisitorForObservationKind` | <code>&lt;ObservationKind extends GraphWalkObservationKind&gt;(observationKind: ObservationKind, visitor: AsyncGraphWalkVisitor&lt;VertexData, EdgeData, PreventVisitorReturnFromWideningPhase&lt;ObservationKind&gt;, VertexId&gt;, options?: Partial&lt;VisitorRegistrationOptions&gt; &#124; undefined) =&gt; AsyncGraphWalkBuilder&lt;VertexData, EdgeData, VertexId&gt;</code> |
| `addVisitorGroupForObservationKind` | <code>&lt;ObservationKind extends GraphWalkObservationKind&gt;(observationKind: ObservationKind, group: VisitorGroupDefinition&lt;AsyncGraphWalkVisitor&lt;VertexData, EdgeData, PreventVisitorReturnFromWideningPhase&lt;ObservationKind&gt;, VertexId&gt;&gt;) =&gt; AsyncGraphWalkBuilder&lt;VertexData, EdgeData, VertexId&gt;</code> |
| `createIndependentRunnerFromCurrentOptions` | <code>() =&gt; AsyncGraphWalkRunner&lt;VertexData, EdgeData, VertexId&gt;</code> |
| `listVisitorRegistrationsForObservationKind` | <code>&lt;ObservationKind extends GraphWalkObservationKind&gt;(observationKind: ObservationKind) =&gt; VisitorRecord&lt;AsyncGraphWalkVisitor&lt;VertexData, EdgeData, ObservationKind, VertexId&gt;&gt;[]</code> |
| `patchOptionsForFutureRunners` | <code>(patch: AsyncGraphWalkBuilderOptionsPatch&lt;VertexData, EdgeData, VertexId&gt;) =&gt; AsyncGraphWalkBuilder&lt;VertexData, EdgeData, VertexId&gt;</code> |
| `replaceVisitorsForObservationKind` | <code>&lt;ObservationKind extends GraphWalkObservationKind&gt;(observationKind: ObservationKind, input: VisitorDefinitionsForPhase&lt;AsyncGraphWalkVisitor&lt;VertexData, EdgeData, PreventVisitorReturnFromWideningPhase&lt;ObservationKind&gt;, VertexId&gt;&gt;) =&gt; AsyncGraphWalkBuilder&lt;VertexData, EdgeData, VertexId&gt;</code> |

</details>

<a id="symbol-AsyncGraphWalkBuilderOptions"></a>

### AsyncGraphWalkBuilderOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type AsyncGraphWalkBuilderOptions<VertexData, EdgeData, VertexId> = AsyncGraphWalkCommonBuilderOptions<VertexData, EdgeData, VertexId> & GraphWalkRouteEnumerationAndRequiredBounds;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `admittedVisitorCallbackPhases` | <code>VisitorCallbackPhaseSelection&lt;GraphWalkObservationKind&gt; &#124; { include: undefined; exclude?: undefined; } &#124; { exclude: undefined; include?: undefined; } &#124; undefined</code> |
| `deliveredEventKinds` | <code>readonly ("vertexOccurrence" &#124; "admittedEdgeOccurrence" &#124; "routePrefix")[] &#124; undefined</code> |
| `expansionOrder` | <code>GraphWalkExpansionOrder &#124; undefined</code> |
| `graphWalkDiscoverySource` | <code>AsyncGraphWalkDiscoverySource&lt;VertexData, EdgeData, VertexId&gt;</code> |
| `limits` | <code>GraphWalkExplorationLimits &#124; (GraphWalkExplorationLimits &amp; ({ maxRouteHopDepth: number; } &#124; { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: number; })) &#124; undefined</code> |
| `routeEnumerationPolicy` | <code>"firstAdmittedFoundRoutePerVertex" &#124; "allVertexSimpleRoutePrefixes" &#124; "allRoutePrefixesAllowingRepeatedVertices" &#124; undefined</code> |
| `shouldAdmitOutgoingLinkTarget` | <code>AsyncGraphWalkLinkTargetAdmissionPredicate&lt;VertexData, EdgeData, VertexId&gt; &#124; null &#124; undefined</code> |
| `shouldExpandVertexOccurrence` | <code>AsyncGraphWalkVertexOccurrenceExpansionPredicate&lt;VertexData, EdgeData, VertexId&gt; &#124; null &#124; undefined</code> |
| `visitorsByObservationKind` | <code>{ vertexOccurrence?: VisitorDefinitionsForPhase&lt;AsyncGraphWalkVisitor&lt;VertexData, EdgeData, GraphWalkObservationKind.VERTEX_OCCURRENCE, VertexId&gt;&gt; &#124; undefined; admittedEdgeOccurrence?: VisitorDefinitionsForPhase&lt;AsyncGraphWalkVisitor&lt;VertexData, EdgeData, GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE, VertexId&gt;&gt; &#124; undefined; routePrefix?: VisitorDefinitionsForPhase&lt;AsyncGraphWalkVisitor&lt;VertexData, EdgeData, GraphWalkObservationKind.ROUTE_PREFIX, VertexId&gt;&gt; &#124; undefined; } &#124; undefined</code> |

</details>

<a id="symbol-AsyncGraphWalkBuilderOptionsPatch"></a>

### AsyncGraphWalkBuilderOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type AsyncGraphWalkBuilderOptionsPatch<VertexData, EdgeData, VertexId> = OptionalFieldsAllowingUndefined<AsyncGraphWalkCommonBuilderOptions<VertexData, EdgeData, VertexId>> & {
    routeEnumerationPolicy?: GraphWalkRouteEnumerationPolicy | undefined;
    replaceLimits?: GraphWalkExplorationLimits | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `admittedVisitorCallbackPhases` | <code>VisitorCallbackPhaseSelection&lt;GraphWalkObservationKind&gt; &#124; { include: undefined; exclude?: undefined; } &#124; { exclude: undefined; include?: undefined; } &#124; undefined</code> |
| `deliveredEventKinds` | <code>readonly ("vertexOccurrence" &#124; "admittedEdgeOccurrence" &#124; "routePrefix")[] &#124; undefined</code> |
| `expansionOrder` | <code>GraphWalkExpansionOrder &#124; undefined</code> |
| `graphWalkDiscoverySource` | <code>AsyncGraphWalkDiscoverySource&lt;VertexData, EdgeData, VertexId&gt; &#124; undefined</code> |
| `replaceLimits` | <code>GraphWalkExplorationLimits &#124; undefined</code> |
| `routeEnumerationPolicy` | <code>GraphWalkRouteEnumerationPolicy &#124; undefined</code> |
| `shouldAdmitOutgoingLinkTarget` | <code>AsyncGraphWalkLinkTargetAdmissionPredicate&lt;VertexData, EdgeData, VertexId&gt; &#124; null &#124; undefined</code> |
| `shouldExpandVertexOccurrence` | <code>AsyncGraphWalkVertexOccurrenceExpansionPredicate&lt;VertexData, EdgeData, VertexId&gt; &#124; null &#124; undefined</code> |
| `visitorsByObservationKind` | <code>{ vertexOccurrence?: VisitorDefinitionsForPhase&lt;AsyncGraphWalkVisitor&lt;VertexData, EdgeData, GraphWalkObservationKind.VERTEX_OCCURRENCE, VertexId&gt;&gt; &#124; undefined; admittedEdgeOccurrence?: VisitorDefinitionsForPhase&lt;AsyncGraphWalkVisitor&lt;VertexData, EdgeData, GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE, VertexId&gt;&gt; &#124; undefined; routePrefix?: VisitorDefinitionsForPhase&lt;AsyncGraphWalkVisitor&lt;VertexData, EdgeData, GraphWalkObservationKind.ROUTE_PREFIX, VertexId&gt;&gt; &#124; undefined; } &#124; undefined</code> |

</details>

<a id="symbol-AsyncGraphWalkDiscoverySource"></a>

### AsyncGraphWalkDiscoverySource

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type AsyncGraphWalkDiscoverySource<VertexData, EdgeData, VertexId> = ({
    vertexResolutionMode: 'resolverWithOptionalInlineResolution';
    resolveVertexDataById(vertexId: VertexId): MaybePromise<GraphWalkVertexResolutionResult<VertexData>>;
} & AsyncGraphWalkTargetEnumerationProtocol<VertexData, EdgeData, VertexId, GraphWalkResolverOrInlineTarget<VertexData, VertexId>>) | ({
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex';
    resolveVertexDataById?: undefined;
} & AsyncGraphWalkTargetEnumerationProtocol<VertexData, EdgeData, VertexId, GraphWalkInlineOrPreviouslyAdmittedTarget<VertexData, VertexId>>);
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `enumerateOutgoingLinks` | <code>((vertex: Readonly&lt;{ vertexId: VertexId; vertexData: VertexData; }&gt;) =&gt; MaybePromiseOfSyncOrAsyncIterable&lt;Readonly&lt;{ targetToResolveOnAdmission: Readonly&lt;{ vertexId: VertexId; resolutionIfNotPreviouslyAdmitted?: GraphWalkVertexResolutionResult&lt;VertexData&gt; &#124; undefined; }&gt;; edgeData: EdgeData; }&gt;&gt;) &#124; ((vertex: Readonly&lt;{ vertexId: VertexId; vertexData: VertexData; }&gt;) =&gt; MaybePromiseOfSyncOrAsyncIterable&lt;Readonly&lt;{ targetToResolveOnAdmission: GraphWalkInlineOrPreviouslyAdmittedTarget&lt;VertexData, VertexId&gt;; edgeData: EdgeData; }&gt;&gt;)</code> |
| `enumerateRootTargets` | <code>(() =&gt; MaybePromiseOfSyncOrAsyncIterable&lt;Readonly&lt;{ vertexId: VertexId; resolutionIfNotPreviouslyAdmitted?: GraphWalkVertexResolutionResult&lt;VertexData&gt; &#124; undefined; }&gt;&gt;) &#124; (() =&gt; MaybePromiseOfSyncOrAsyncIterable&lt;GraphWalkInlineOrPreviouslyAdmittedTarget&lt;VertexData, VertexId&gt;&gt;)</code> |
| `resolveVertexDataById` | <code>((vertexId: VertexId) =&gt; MaybePromise&lt;GraphWalkVertexResolutionResult&lt;VertexData&gt;&gt;) &#124; undefined</code> |
| `vertexResolutionMode` | <code>"resolverWithOptionalInlineResolution" &#124; "inlineResolutionOrPreviouslyAdmittedVertex"</code> |

</details>

<a id="symbol-AsyncGraphWalkLinkTargetAdmissionPredicate"></a>

### AsyncGraphWalkLinkTargetAdmissionPredicate

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type AsyncGraphWalkLinkTargetAdmissionPredicate<VertexData, EdgeData, VertexId> = (edge: GraphWalkEdge<EdgeData, VertexId>, context: GraphWalkLinkTargetAdmissionContext<VertexData, EdgeData, VertexId>) => MaybePromise<boolean>;
```

<a id="symbol-AsyncGraphWalkRecordMaterializationOptions"></a>

### AsyncGraphWalkRecordMaterializationOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export interface AsyncGraphWalkRecordMaterializationOptions<VertexData, EdgeData, VertexId> {
getVertexId(vertexRecord: VertexData): MaybePromise<VertexId>;
enumerateOutgoingLinks(vertexRecord: VertexData): MaybePromise<Iterable<GraphWalkCatalogOutgoingLinkToVertexId<EdgeData, VertexId>> | AsyncIterable<GraphWalkCatalogOutgoingLinkToVertexId<EdgeData, VertexId>>>;
rootVertexIds: Iterable<VertexId> | AsyncIterable<VertexId>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `enumerateOutgoingLinks` | <code>(vertexRecord: VertexData) =&gt; MaybePromise&lt;Iterable&lt;Readonly&lt;{ toVertexId: VertexId; edgeData: EdgeData; }&gt;&gt; &#124; AsyncIterable&lt;Readonly&lt;{ toVertexId: VertexId; edgeData: EdgeData; }&gt;&gt;&gt;</code> |
| `getVertexId` | <code>(vertexRecord: VertexData) =&gt; MaybePromise&lt;VertexId&gt;</code> |
| `rootVertexIds` | <code>Iterable&lt;VertexId&gt; &#124; AsyncIterable&lt;VertexId&gt;</code> |

</details>

<a id="symbol-AsyncGraphWalkRunner"></a>

### AsyncGraphWalkRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export interface AsyncGraphWalkRunner<VertexData, EdgeData, VertexId> extends AsyncTraversalExecution<GraphWalkObservationKind, GraphWalkEvent<VertexData, EdgeData, VertexId>, GraphWalkInspection, `${GraphWalkObservationKind}`> {
runAndIterateObservationEventsUntilSuspendedOrTerminal: {
        (): AsyncGenerator<GraphWalkEvent<VertexData, EdgeData, VertexId>, void, unknown>;
        <ObservationKind extends `${GraphWalkObservationKind}`>(executionOptionsPatch: TraversalExecutionSelectionPatch<GraphWalkObservationKind, ObservationKind> & {
            deliveredEventKinds: readonly ObservationKind[];
        }): AsyncGenerator<GraphWalkEventForObservationKind<VertexData, EdgeData, ObservationKind, VertexId>, void, unknown>;
        (executionOptionsPatch?: TraversalExecutionSelectionPatch<GraphWalkObservationKind>): AsyncGenerator<GraphWalkEvent<VertexData, EdgeData, VertexId>, void, unknown>;
    };
runUntilSuspendedOrTerminal: (executionOptionsPatch?: TraversalExecutionSelectionPatch<GraphWalkObservationKind>) => Promise<this>;
closePermanentlyAndDisposeSourceIterators(): Promise<void>;
captureProgressSnapshot(): GraphWalkProgressSnapshot;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `captureExecutionSnapshot` | <code>() =&gt; GraphWalkInspection</code> |
| `captureProgressSnapshot` | <code>() =&gt; Readonly&lt;{ status: TraversalRunnerStatus; counts: Readonly&lt;{ rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: number; admittedRootOrLinkTargetOccurrences: number; resolvedFoundVertexIdCount: number; resolvedOmittedVertexIdCount: number; freshSourceOutgoingLinkCount: number; acknowledgedObservationCountsByKind: Readonly&lt;Record&lt;GraphWalkObservationKind, number&gt;&gt;; }&gt;; terminalOutcome: GraphWalkTerminalOutcome &#124; null; }&gt;</code> |
| `closePermanentlyAndDisposeSourceIterators` | <code>() =&gt; Promise&lt;void&gt;</code> |
| `getTraversalLifecycleStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getTraversalStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `isSuspended` | <code>() =&gt; boolean</code> |
| `requestPauseAfterAdmittedCallbacksDrain` | <code>() =&gt; boolean</code> |
| `runAndIterateObservationEventsUntilSuspendedOrTerminal` | <code>{ (): AsyncGenerator&lt;GraphWalkEvent&lt;VertexData, EdgeData, VertexId&gt;, void, unknown&gt;; &lt;ObservationKind extends "vertexOccurrence" &#124; "admittedEdgeOccurrence" &#124; "routePrefix"&gt;(executionOptionsPatch: TraversalExecutionSelectionPatch&lt;GraphWalkObservationKind, ObservationKind&gt; &amp; { deliveredEventKinds: readonly ObservationKind[]; }): AsyncGenerator&lt;GraphWalkEventForObservationKind&lt;VertexData, EdgeData, ObservationKind, VertexId&gt;, void, unknown&gt;; (executionOptionsPatch?: TraversalExecutionSelectionPatch&lt;GraphWalkObservationKind, "vertexOccurrence" &#124; "admittedEdgeOccurrence" &#124; "routePrefix"&gt; &#124; undefined): AsyncGenerator&lt;GraphWalkEvent&lt;VertexData, EdgeData, VertexId&gt;, void, unknown&gt;; }</code> |
| `runUntilSuspendedOrTerminal` | <code>(executionOptionsPatch?: TraversalExecutionSelectionPatch&lt;GraphWalkObservationKind, "vertexOccurrence" &#124; "admittedEdgeOccurrence" &#124; "routePrefix"&gt; &#124; undefined) =&gt; Promise&lt;AsyncGraphWalkRunner&lt;VertexData, EdgeData, VertexId&gt;&gt;</code> |

</details>

<a id="symbol-AsyncGraphWalkVertexOccurrenceExpansionPredicate"></a>

### AsyncGraphWalkVertexOccurrenceExpansionPredicate

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type AsyncGraphWalkVertexOccurrenceExpansionPredicate<VertexData, EdgeData, VertexId> = (vertex: GraphWalkResolvedVertex<VertexData, VertexId>, context: GraphWalkVertexOccurrenceExpansionContext<VertexData, EdgeData, VertexId>) => MaybePromise<boolean>;
```

<a id="symbol-AsyncGraphWalkVisitor"></a>

### AsyncGraphWalkVisitor

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type AsyncGraphWalkVisitor<VertexData, EdgeData, ObservationKind extends GraphWalkObservationKind, VertexId> = (event: GraphWalkEventForObservationKind<VertexData, EdgeData, ObservationKind, VertexId>, context: GraphWalkVisitorContext<ObservationKind>) => MaybePromise<GraphWalkVisitorResult>;
```

<a id="symbol-AsyncTraversalExecution"></a>

### AsyncTraversalExecution

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface AsyncTraversalExecution<Phase extends string, Event, Inspection extends TraversalExecutionSnapshot = TraversalExecutionSnapshot, EmittedKind extends string = TraversalEventKindForVisitorPhase<Phase>> extends TraversalExecutionState<Inspection> {
runAndIterateObservationEventsUntilSuspendedOrTerminal: {
        (): AsyncGenerator<Event, void, unknown>;
        <Kind extends EmittedKind>(config: TraversalExecutionSelectionPatch<Phase, Kind> & {
            deliveredEventKinds: readonly Kind[];
        }): AsyncGenerator<TraversalEventNarrowedToSelectedKinds<Event, Kind>, void, unknown>;
        (config?: TraversalExecutionSelectionPatch<Phase, EmittedKind>): AsyncGenerator<Event, void, unknown>;
    };
runUntilSuspendedOrTerminal: (config?: TraversalExecutionSelectionPatch<Phase, EmittedKind>) => Promise<this>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `captureExecutionSnapshot` | <code>() =&gt; Inspection</code> |
| `getTraversalLifecycleStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getTraversalStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `isSuspended` | <code>() =&gt; boolean</code> |
| `requestPauseAfterAdmittedCallbacksDrain` | <code>() =&gt; boolean</code> |
| `runAndIterateObservationEventsUntilSuspendedOrTerminal` | <code>{ (): AsyncGenerator&lt;Event, void, unknown&gt;; &lt;Kind extends EmittedKind&gt;(config: TraversalExecutionSelectionPatch&lt;Phase, Kind&gt; &amp; { deliveredEventKinds: readonly Kind[]; }): AsyncGenerator&lt;TraversalEventNarrowedToSelectedKinds&lt;Event, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionSelectionPatch&lt;Phase, EmittedKind&gt; &#124; undefined): AsyncGenerator&lt;Event, void, unknown&gt;; }</code> |
| `runUntilSuspendedOrTerminal` | <code>(config?: TraversalExecutionSelectionPatch&lt;Phase, EmittedKind&gt; &#124; undefined) =&gt; Promise&lt;AsyncTraversalExecution&lt;Phase, Event, Inspection, EmittedKind&gt;&gt;</code> |

</details>

<a id="symbol-AsyncTreeDiscoverySource"></a>

### AsyncTreeDiscoverySource

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/async-adapter-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface AsyncTreeDiscoverySource<InputVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> {
resolveRootVertex: () => MaybePromise<TreeVertexResolution<InputVertexTypes>>;
resolveChildVertexFromHint: (hint: InputVertexTypes['ChildHint'], options: TreeChildResolverContext<InputVertexTypes, RewrittenVertexTypes>) => MaybePromise<TreeVertexResolution<InputVertexTypes>>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `resolveChildVertexFromHint` | <code>(hint: InputVertexTypes["ChildHint"], options: TreeChildResolverContext&lt;InputVertexTypes, RewrittenVertexTypes&gt;) =&gt; MaybePromise&lt;TreeVertexResolution&lt;InputVertexTypes&gt;&gt;</code> |
| `resolveRootVertex` | <code>() =&gt; MaybePromise&lt;TreeVertexResolution&lt;InputVertexTypes&gt;&gt;</code> |

</details>

<a id="symbol-AsyncTreeVertexPhaseVisitorCallback"></a>

### AsyncTreeVertexPhaseVisitorCallback

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type AsyncTreeVertexPhaseVisitorCallback<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes, Phase extends string = string> = VisitorCommandsResult<RewrittenVertexTypes, Phase, 'tree', InputVertexTypes['ChildHint']> extends infer RESULT ? (vertex: VertexView<InputVertexTypes | RewrittenVertexTypes>, options: TreeVisitorContext<Phase, InputVertexTypes, RewrittenVertexTypes>) => MaybePromise<RESULT | undefined | void> : never;
```

<a id="symbol-BoundObjectPropertyMutationHelpers"></a>

### BoundObjectPropertyMutationHelpers

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type BoundObjectPropertyMutationHelpers<OutputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>, InputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown> = OutputTypes> = ObjectPropertyAssemblyClassification & {
    createObjectPropertyMutationCommand: (request?: ObjectPropertyRewriteRequest<OutputTypes>) => VertexDataReplacementOrDeletionCommand<LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>, TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS>;
    assembleCompositeFromCurrentChildren: (options?: {
        cacheResult?: boolean;
    }) => unknown;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `assembleCompositeFromCurrentChildren` | <code>(options?: { cacheResult?: boolean &#124; undefined; } &#124; undefined) =&gt; unknown</code> |
| `createObjectPropertyMutationCommand` | <code>(request?: ObjectPropertyRewriteRequest&lt;OutputTypes&gt; &#124; undefined) =&gt; VertexDataReplacementOrDeletionCommand&lt;LiveObjectPropertyVertexTypes&lt;InputTypes, OutputTypes&gt;, TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS&gt;</code> |
| `matchesAnyCompositeAssemblyPredicate` | <code>boolean</code> |
| `matchesArrayAssemblyPredicate` | <code>boolean</code> |
| `matchesObjectAssemblyPredicate` | <code>boolean</code> |

</details>

<a id="symbol-BreadthFirstTreeRunner"></a>

### BreadthFirstTreeRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#breadth-first-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/breadth-first-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export interface BreadthFirstTreeRunner<InputVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> extends SyncTraversalExecution<BreadthFirstTreeVisitPhase, TreeTraversalEvent<BreadthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes>, TreeOrDagExecutionSnapshot<BreadthFirstTreeVisitPhase>> {
getLiveResolvedTreeView(): LiveResolvedTreeView<InputVertexTypes | RewrittenVertexTypes>;
getLiveResolvedGraphView(): LiveResolvedGraphView<InputVertexTypes | RewrittenVertexTypes>;
isTreeRootVertex(ref: VertexHandle<InputVertexTypes | RewrittenVertexTypes>): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `captureExecutionSnapshot` | <code>() =&gt; TreeOrDagExecutionSnapshot&lt;BreadthFirstTreeVisitPhase&gt;</code> |
| `getLiveResolvedGraphView` | <code>() =&gt; LiveResolvedGraphView&lt;InputVertexTypes &#124; RewrittenVertexTypes, unknown&gt;</code> |
| `getLiveResolvedTreeView` | <code>() =&gt; LiveResolvedTreeView&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;</code> |
| `getTraversalLifecycleStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getTraversalStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `isSuspended` | <code>() =&gt; boolean</code> |
| `isTreeRootVertex` | <code>(ref: VertexHandle&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;) =&gt; boolean</code> |
| `requestPauseAfterAdmittedCallbacksDrain` | <code>() =&gt; boolean</code> |
| `runAndIterateObservationEventsUntilSuspendedOrTerminal` | <code>{ (): Generator&lt;TreeTraversalEvent&lt;BreadthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes&gt;, void, unknown&gt;; &lt;Kind extends BreadthFirstTreeVisitPhase&gt;(config: TraversalExecutionSelectionPatch&lt;BreadthFirstTreeVisitPhase, Kind&gt; &amp; { deliveredEventKinds: readonly Kind[]; }): Generator&lt;TraversalEventNarrowedToSelectedKinds&lt;TreeTraversalEvent&lt;BreadthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes&gt;, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionSelectionPatch&lt;BreadthFirstTreeVisitPhase, BreadthFirstTreeVisitPhase&gt; &#124; undefined): Generator&lt;TreeTraversalEvent&lt;BreadthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes&gt;, void, unknown&gt;; }</code> |
| `runUntilSuspendedOrTerminal` | <code>(config?: TraversalExecutionSelectionPatch&lt;BreadthFirstTreeVisitPhase, BreadthFirstTreeVisitPhase&gt; &#124; undefined) =&gt; BreadthFirstTreeRunner&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |

</details>

<a id="symbol-BreadthFirstTreeTraversalBuilder"></a>

### BreadthFirstTreeTraversalBuilder

Runtime value and public type surface. [Owning contract](reference.md#breadth-first-traversal) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/breadth-first-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export declare class BreadthFirstTreeTraversalBuilder<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> {
constructor(icfgInput: BreadthFirstTreeTraversalBuilderOptions<InputVertexTypes, RewrittenVertexTypes>);
patchOptionsForFutureRunners(icfgInput: BreadthFirstTreeTraversalBuilderOptionsPatch<InputVertexTypes, RewrittenVertexTypes>): this;
registerVisitorCallbackForPhase<Phase extends BreadthFirstTreeVisitPhase>(phase: Phase, visitor: TreeVertexPhaseVisitorCallback<InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>>, options?: Partial<VisitorRegistrationOptions>): this;
appendVisitorGroupForPhase<Phase extends BreadthFirstTreeVisitPhase>(phase: Phase, group: VisitorGroupDefinition<TreeVertexPhaseVisitorCallback<InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>>>): this;
getDetachedVisitorRegistrationRecordsForPhase<Phase extends BreadthFirstTreeVisitPhase>(phase: Phase): BreadthFirstTreeVisitorRegistrationsByPhase<InputVertexTypes, RewrittenVertexTypes>[Phase];
replaceVisitorDefinitionsForPhase<Phase extends BreadthFirstTreeVisitPhase>(phase: Phase, input: VisitorDefinitionsForPhase<TreeVertexPhaseVisitorCallback<InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>>>): this;
createIndependentRunnerFromCurrentOptions(): BreadthFirstTreeRunner<InputVertexTypes, RewrittenVertexTypes>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `appendVisitorGroupForPhase` | <code>&lt;Phase extends BreadthFirstTreeVisitPhase&gt;(phase: Phase, group: VisitorGroupDefinition&lt;TreeVertexPhaseVisitorCallback&lt;InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;&gt;&gt;) =&gt; BreadthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `createIndependentRunnerFromCurrentOptions` | <code>() =&gt; BreadthFirstTreeRunner&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `getDetachedVisitorRegistrationRecordsForPhase` | <code>&lt;Phase extends BreadthFirstTreeVisitPhase&gt;(phase: Phase) =&gt; BreadthFirstTreeVisitorRegistrationsByPhase&lt;InputVertexTypes, RewrittenVertexTypes&gt;[Phase]</code> |
| `patchOptionsForFutureRunners` | <code>(icfgInput: BreadthFirstTreeTraversalBuilderOptionsPatch&lt;InputVertexTypes, RewrittenVertexTypes&gt;) =&gt; BreadthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `registerVisitorCallbackForPhase` | <code>&lt;Phase extends BreadthFirstTreeVisitPhase&gt;(phase: Phase, visitor: TreeVertexPhaseVisitorCallback&lt;InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;&gt;, options?: Partial&lt;VisitorRegistrationOptions&gt; &#124; undefined) =&gt; BreadthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `replaceVisitorDefinitionsForPhase` | <code>&lt;Phase extends BreadthFirstTreeVisitPhase&gt;(phase: Phase, input: VisitorDefinitionsForPhase&lt;TreeVertexPhaseVisitorCallback&lt;InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;&gt;&gt;) =&gt; BreadthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |

</details>

<a id="symbol-BreadthFirstTreeTraversalBuilderOptions"></a>

### BreadthFirstTreeTraversalBuilderOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export type BreadthFirstTreeTraversalBuilderOptions<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> = BreadthFirstTreeTraversalBuilderOptionsPatch<InputVertexTypes, RewrittenVertexTypes> & {
    treeDiscoverySource: TreeDiscoverySource<InputVertexTypes, RewrittenVertexTypes>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `retainDiscoveredTreeBeforeVisitorCommands` | <code>boolean &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>ChildHintsListTransformer&lt;InputVertexTypes&gt; &#124; null &#124; undefined</code> |
| `treeDiscoverySource` | <code>TreeDiscoverySource&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `visitors` | <code>VisitorDefinitionsByPhase&lt;BreadthFirstTreeVisitorRegistrationsByPhase&lt;InputVertexTypes, RewrittenVertexTypes&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-BreadthFirstTreeTraversalBuilderOptionsPatch"></a>

### BreadthFirstTreeTraversalBuilderOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export type BreadthFirstTreeTraversalBuilderOptionsPatch<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> = {
    treeDiscoverySource?: TreeDiscoverySource<InputVertexTypes, RewrittenVertexTypes> | undefined;
    transformChildHintsBeforeResolution?: ChildHintsListTransformer<InputVertexTypes> | null | undefined;
    visitors?: VisitorDefinitionsByPhase<BreadthFirstTreeVisitorRegistrationsByPhase<InputVertexTypes, RewrittenVertexTypes>> | undefined;
    retainDiscoveredTreeBeforeVisitorCommands?: boolean | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `retainDiscoveredTreeBeforeVisitorCommands` | <code>boolean &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>ChildHintsListTransformer&lt;InputVertexTypes&gt; &#124; null &#124; undefined</code> |
| `treeDiscoverySource` | <code>TreeDiscoverySource&lt;InputVertexTypes, RewrittenVertexTypes&gt; &#124; undefined</code> |
| `visitors` | <code>VisitorDefinitionsByPhase&lt;BreadthFirstTreeVisitorRegistrationsByPhase&lt;InputVertexTypes, RewrittenVertexTypes&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-BreadthFirstTreeVisitPhase"></a>

### BreadthFirstTreeVisitPhase

Runtime value and public type surface. [Owning contract](reference.md#breadth-first-traversal) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/breadth-first-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export declare enum BreadthFirstTreeVisitPhase {
AT_LEVEL_ORDER_VERTEX = "AT_LEVEL_ORDER_VERTEX"
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `AT_LEVEL_ORDER_VERTEX` | <code>BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX</code> |

</details>

<a id="symbol-ChildDiscoveryContext"></a>

### ChildDiscoveryContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Related example](reference.md#source-callback-contexts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type ChildDiscoveryContext<InputVertexTypes extends VertexDataAndChildHintTypes> = Readonly<{
    discoveryDepthInEdges: number;
    parentVertexAtChildResolution: VertexView<InputVertexTypes>;
    parentVertexHandle: VertexHandle<InputVertexTypes>;
    parentChildHintIndex: number;
    childDiscoveryHint: InputVertexTypes['ChildHint'];
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `childDiscoveryHint` | <code>InputVertexTypes["ChildHint"]</code> |
| `discoveryDepthInEdges` | <code>number</code> |
| `parentChildHintIndex` | <code>number</code> |
| `parentVertexAtChildResolution` | <code>VertexView&lt;InputVertexTypes&gt;</code> |
| `parentVertexHandle` | <code>VertexHandle&lt;InputVertexTypes&gt;</code> |

</details>

<a id="symbol-ChildDiscoverySlot"></a>

### ChildDiscoverySlot

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type ChildDiscoverySlot<InputVertexTypes extends VertexDataAndChildHintTypes, VertexId = unknown> = Readonly<{
    kind: 'awaitingResolution';
    childDiscoveryHint: InputVertexTypes['ChildHint'];
}> | Readonly<{
    kind: 'linkedToVertex';
    childDiscoveryHint: InputVertexTypes['ChildHint'];
    childVertexHandle: VertexHandle<InputVertexTypes>;
}> | Readonly<{
    kind: 'omitted';
    childDiscoveryHint: InputVertexTypes['ChildHint'];
    omittedVertexIdentity: Readonly<{
        vertexId: VertexId;
    }> | null;
}> | Readonly<{
    kind: 'targetDeleted' | 'discoverySkipped';
    childDiscoveryHint: InputVertexTypes['ChildHint'];
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `childDiscoveryHint` | <code>InputVertexTypes["ChildHint"]</code> |
| `kind` | <code>"omitted" &#124; "awaitingResolution" &#124; "linkedToVertex" &#124; "targetDeleted" &#124; "discoverySkipped"</code> |

</details>

<a id="symbol-ChildHintVertexIdentity"></a>

### ChildHintVertexIdentity

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-traversal) · [Related example](reference.md#dag-traversal)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type ChildHintVertexIdentity<VertexId = unknown> = {
    vertexId: VertexId;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `vertexId` | <code>VertexId</code> |

</details>

<a id="symbol-ChildHintsListTransformer"></a>

### ChildHintsListTransformer

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](reference.md#hint-transformation-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type ChildHintsListTransformer<InputVertexTypes extends VertexDataAndChildHintTypes> = (hints: InputVertexTypes['ChildHint'][]) => InputVertexTypes['ChildHint'][];
```

<a id="symbol-DagChildResolutionContext"></a>

### DagChildResolutionContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Related example](reference.md#source-callback-contexts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type DagChildResolutionContext<SourceVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, VertexId = unknown> = {
    structuralChildResolution: ChildDiscoveryContext<SourceVertexTypes | RewrittenVertexTypes> | Readonly<Omit<ChildDiscoveryContext<SourceVertexTypes | RewrittenVertexTypes>, 'parentVertexAtChildResolution' | 'parentVertexHandle'> & {
        /** Synthetic entry-slot parent is private; both parent fields are null. */
        parentVertexAtChildResolution: null;
        parentVertexHandle: null;
    }>;
    liveResolvedGraphView: LiveResolvedGraphView<SourceVertexTypes | RewrittenVertexTypes, VertexId>;
    preCommandDiscoveredGraphView: PreCommandDiscoveredGraphView<SourceVertexTypes, VertexId> | null;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `liveResolvedGraphView` | <code>LiveResolvedGraphView&lt;SourceVertexTypes &#124; RewrittenVertexTypes, VertexId&gt;</code> |
| `preCommandDiscoveredGraphView` | <code>PreCommandDiscoveredGraphView&lt;SourceVertexTypes, VertexId&gt; &#124; null</code> |
| `structuralChildResolution` | <code>Readonly&lt;{ discoveryDepthInEdges: number; parentVertexAtChildResolution: VertexView&lt;SourceVertexTypes &#124; RewrittenVertexTypes&gt;; parentVertexHandle: VertexHandle&lt;SourceVertexTypes &#124; RewrittenVertexTypes&gt;; parentChildHintIndex: number; childDiscoveryHint: (SourceVertexTypes &#124; RewrittenVertexTypes)["ChildHint"]; }&gt; &#124; Readonly&lt;Omit&lt;Readonly&lt;{ discoveryDepthInEdges: number; parentVertexAtChildResolution: VertexView&lt;SourceVertexTypes &#124; RewrittenVertexTypes&gt;; parentVertexHandle: VertexHandle&lt;SourceVertexTypes &#124; RewrittenVertexTypes&gt;; parentChildHintIndex: number; childDiscoveryHint: (SourceVertexTypes &#124; RewrittenVertexTypes)["ChildHint"]; }&gt;, "parentVertexAtChildResolution" &#124; "parentVertexHandle"&gt; &amp; { parentVertexAtChildResolution: null; parentVertexHandle: null; }&gt;</code> |

</details>

<a id="symbol-DagCommittedMilestoneEvent"></a>

### DagCommittedMilestoneEvent

Type-only; no runtime constructor/value. [Owning contract](reference.md#deferred-dag-progress-and-reconciliation) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/event-delivery-selection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagCommittedMilestoneEvent<SourceVertexTypes extends VertexDataAndChildHintTypes, VertexId = unknown> = {
    vertexId: VertexId;
    vertex: VertexView<SourceVertexTypes>;
    vertexHandle: VertexHandle<SourceVertexTypes>;
    isVisibleSourceRoot: boolean;
} & ({
    eventKind: 'workCompletionCommitted';
} | {
    eventKind: 'subgraphCompletionCommitted';
});
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `eventKind` | <code>"workCompletionCommitted" &#124; "subgraphCompletionCommitted"</code> |
| `isVisibleSourceRoot` | <code>boolean</code> |
| `vertex` | <code>VertexView&lt;SourceVertexTypes&gt;</code> |
| `vertexHandle` | <code>VertexHandle&lt;SourceVertexTypes&gt;</code> |
| `vertexId` | <code>VertexId</code> |

</details>

<a id="symbol-DagCompositionOptions"></a>

### DagCompositionOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-fragments-and-composition) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagCompositionOptions<VertexId = unknown> = {
    readonly additionalWorkPrerequisites?: readonly {
        readonly dependentWorkVertexId: VertexId;
        readonly prerequisite: DagMilestone<VertexId>;
    }[];
    readonly additionalStructuralChildLinks?: readonly {
        readonly parentVertexId: VertexId;
        readonly childVertexId: VertexId;
    }[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `additionalStructuralChildLinks` | <code>readonly { readonly parentVertexId: VertexId; readonly childVertexId: VertexId; }[] &#124; undefined</code> |
| `additionalWorkPrerequisites` | <code>readonly { readonly dependentWorkVertexId: VertexId; readonly prerequisite: DagMilestone&lt;VertexId&gt;; }[] &#124; undefined</code> |

</details>

<a id="symbol-DagDefinition"></a>

### DagDefinition

Type-only; no runtime constructor/value. [Owning contract](reference.md#materialized-dag-definitions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagDefinition<Data, VertexId = unknown> = {
    readonly vertexDeclarations: readonly DagDefinitionVertex<Data, VertexId>[];
    readonly omittedVertexIds: readonly VertexId[];
    readonly entry: {
        readonly kind: 'root';
        readonly vertexId: VertexId;
    } | {
        readonly kind: 'roots';
        readonly entryDiscoverySlots: readonly DagStructuralDiscoverySlot<VertexId>[];
    } | {
        readonly kind: 'empty';
    };
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `entry` | <code>{ readonly kind: "root"; readonly vertexId: VertexId; } &#124; { readonly kind: "roots"; readonly entryDiscoverySlots: readonly DagStructuralDiscoverySlot&lt;VertexId&gt;[]; } &#124; { readonly kind: "empty"; }</code> |
| `omittedVertexIds` | <code>readonly VertexId[]</code> |
| `vertexDeclarations` | <code>readonly DagDefinitionVertex&lt;Data, VertexId&gt;[]</code> |

</details>

<a id="symbol-DagDefinitionChangeAspect"></a>

### DagDefinitionChangeAspect

Type-only; no runtime constructor/value. [Owning contract](reference.md#validated-dag-revisions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagDefinitionChangeAspect = 'data' | 'childDiscoverySlots' | 'workWaitsForWorkOf' | 'workWaitsForSubgraphCompletionOf';
```

<a id="symbol-DagDefinitionDiff"></a>

### DagDefinitionDiff

Type-only; no runtime constructor/value. [Owning contract](reference.md#validated-dag-revisions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagDefinitionDiff<VertexId = unknown> = {
    readonly addedVertexDeclarationIds: readonly VertexId[];
    readonly removedVertexDeclarationIds: readonly VertexId[];
    readonly changedVertexDeclarations: readonly DagDefinitionVertexChange<VertexId>[];
    /** True whenever the ordered live ID sequence differs, including add/remove. */
    readonly vertexDeclarationSequenceChanged: boolean;
    readonly entryChanged: boolean;
    readonly omittedVertexIdSequenceChanged: boolean;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `addedVertexDeclarationIds` | <code>readonly VertexId[]</code> |
| `changedVertexDeclarations` | <code>readonly DagDefinitionVertexChange&lt;VertexId&gt;[]</code> |
| `entryChanged` | <code>boolean</code> |
| `omittedVertexIdSequenceChanged` | <code>boolean</code> |
| `removedVertexDeclarationIds` | <code>readonly VertexId[]</code> |
| `vertexDeclarationSequenceChanged` | <code>boolean</code> |

</details>

<a id="symbol-DagDefinitionIssue"></a>

### DagDefinitionIssue

Type-only; no runtime constructor/value. [Owning contract](reference.md#materialized-dag-definitions) · [Executable snippet](reference.md#narrow-invalid-issues)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagDefinitionIssue<VertexId = unknown> = {
    kind: 'missingStructuralEndpoint';
    parent: {
        vertexId: VertexId;
    } | null;
    vertexId: VertexId;
} | {
    kind: 'invalidEntry';
    reason: 'unknownRoot' | 'entryOmissionMissingIdentity' | 'emptyWithVertices';
    vertexIds: readonly VertexId[];
} | {
    kind: 'omissionIdentityNotDeclared';
    vertexIds: readonly VertexId[];
} | {
    kind: 'outsideEntryDiscoveryClosure';
    vertexIds: readonly VertexId[];
} | {
    kind: 'structuralChildCycleComponent';
    componentVertexIds: readonly VertexId[];
} | {
    kind: 'discoveredStructuralChildCycleWitness';
    cycleWitnessVertexIds: readonly VertexId[];
} | {
    kind: 'milestoneDependencyStall';
    diagnostics: DagTraversalStallDiagnostics<VertexId>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"missingStructuralEndpoint" &#124; "invalidEntry" &#124; "omissionIdentityNotDeclared" &#124; "outsideEntryDiscoveryClosure" &#124; "structuralChildCycleComponent" &#124; "discoveredStructuralChildCycleWitness" &#124; "milestoneDependencyStall"</code> |

</details>

<a id="symbol-DagDefinitionVertex"></a>

### DagDefinitionVertex

Type-only; no runtime constructor/value. [Owning contract](reference.md#materialized-dag-definitions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagDefinitionVertex<Data, VertexId> = {
    readonly vertexId: VertexId;
    readonly data: Data;
    readonly childDiscoverySlots: readonly DagStructuralDiscoverySlot<VertexId>[];
    readonly workWaitsForWorkOf: readonly VertexId[];
    readonly workWaitsForSubgraphCompletionOf: readonly VertexId[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `childDiscoverySlots` | <code>readonly DagStructuralDiscoverySlot&lt;VertexId&gt;[]</code> |
| `data` | <code>Data</code> |
| `vertexId` | <code>VertexId</code> |
| `workWaitsForSubgraphCompletionOf` | <code>readonly VertexId[]</code> |
| `workWaitsForWorkOf` | <code>readonly VertexId[]</code> |

</details>

<a id="symbol-DagDefinitionVertexChange"></a>

### DagDefinitionVertexChange

Type-only; no runtime constructor/value. [Owning contract](reference.md#validated-dag-revisions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagDefinitionVertexChange<VertexId = unknown> = {
    readonly vertexId: VertexId;
    readonly changedDeclarationFields: readonly DagDefinitionChangeAspect[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `changedDeclarationFields` | <code>readonly DagDefinitionChangeAspect[]</code> |
| `vertexId` | <code>VertexId</code> |

</details>

<a id="symbol-DagDiscoverySource"></a>

### DagDiscoverySource

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Executable snippet](reference.md#dag-traversal)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface DagDiscoverySource<SourceVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, VertexId = unknown> {
resolvePrerequisiteByVertexId?: (vertexId: VertexId) => DagPrerequisiteLookupResult<SourceVertexTypes, VertexId>;
resolveRootVertex: () => DagSourceVertexResolution<SourceVertexTypes, VertexId>;
resolveChildHint: (hint: SourceVertexTypes['ChildHint'], context: DagChildResolutionContext<SourceVertexTypes, RewrittenVertexTypes, VertexId>) => DagSourceVertexResolution<SourceVertexTypes, VertexId>;
tryGetVertexIdentityFromHint?: (hint: SourceVertexTypes['ChildHint']) => ChildHintVertexIdentity<VertexId> | undefined;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `resolveChildHint` | <code>(hint: SourceVertexTypes["ChildHint"], context: DagChildResolutionContext&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;) =&gt; DagSourceVertexResolution&lt;SourceVertexTypes, VertexId&gt;</code> |
| `resolvePrerequisiteByVertexId` | <code>((vertexId: VertexId) =&gt; DagPrerequisiteLookupResult&lt;SourceVertexTypes, VertexId&gt;) &#124; undefined</code> |
| `resolveRootVertex` | <code>() =&gt; DagSourceVertexResolution&lt;SourceVertexTypes, VertexId&gt;</code> |
| `tryGetVertexIdentityFromHint` | <code>((hint: SourceVertexTypes["ChildHint"]) =&gt; ChildHintVertexIdentity&lt;VertexId&gt; &#124; undefined) &#124; undefined</code> |

</details>

<a id="symbol-DagExternalWorkRunBoundary"></a>

### DagExternalWorkRunBoundary

Type-only; no runtime constructor/value. [Owning contract](reference.md#ticket-coordination) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagExternalWorkRunBoundary<VertexId = unknown> = Readonly<{
    kind: 'awaitingSettlement';
    workSettlementTickets: readonly DagWorkSettlementTicket<VertexId>[];
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

<a id="symbol-DagExternalWorkSession"></a>

### DagExternalWorkSession

Type-only; no runtime constructor/value. [Owning contract](reference.md#ticket-coordination) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export interface DagExternalWorkSession<VertexId = unknown> extends DagExternalWorkSessionControl<VertexId> {
runUntilWorkBoundary(): DagExternalWorkRunBoundary<VertexId>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `acceptCompletedWork` | <code>(ticket: DagWorkSettlementTicket&lt;VertexId&gt;) =&gt; DagSettlementReceipt</code> |
| `captureExecutionSnapshot` | <code>() =&gt; TreeOrDagExecutionSnapshot&lt;DagVisitorPhase&gt;</code> |
| `captureMilestoneSnapshot` | <code>() =&gt; DagMilestoneSnapshot&lt;VertexId&gt;</code> |
| `captureProgressSnapshot` | <code>() =&gt; Readonly&lt;{ discovery: Readonly&lt;{ timing: "incrementalDuringTraversal" &#124; "completeBeforeAnyVisitor"; complete: boolean; }&gt;; counts: Readonly&lt;{ retainedLiveVertices: number; verticesWaitingForPrerequisiteMilestones: number; workVisitorReadyOrWorkCompletionDeferredVertices: number; workCompletionDeferredVertices: number; verticesWithAdmittedVisitorChains: number; workCompletionCommittedVertices: number; subgraphCompletionCommittedVertices: number; }&gt;; progressByVertexId: ReadonlyMap&lt;VertexId, Readonly&lt;{ vertexId: VertexId; workState: DagWorkState; subgraphCompletionCommitted: boolean; unmetPrerequisiteVertexIds: readonly VertexId[]; unmetWorkMilestoneVertexIds: readonly VertexId[]; unmetSubgraphCompletionMilestoneVertexIds: readonly VertexId[]; settlementToken?: symbol &#124; undefined; }&gt;&gt;; workVisitorReadyOrWorkCompletionDeferredVertexIds: readonly VertexId[]; workCompletionDeferredVertexIds: readonly VertexId[]; workAwaitingSettlement: readonly Readonly&lt;{ vertexId: VertexId; settlementToken: symbol; }&gt;[]; admittedVisitorChainVertexIds: readonly VertexId[]; workCompletionCommittedVertexIds: readonly VertexId[]; subgraphCompletionCommittedVertexIds: readonly VertexId[]; unmatchedCompletedWorkSeedVertexIds: readonly VertexId[]; invalidDependencyTopologyDiagnostics: DagTraversalStallDiagnostics&lt;VertexId&gt; &#124; null; }&gt;</code> |
| `failTraversal` | <code>(ticket: DagWorkSettlementTicket&lt;VertexId&gt;, error: unknown) =&gt; DagSettlementReceipt</code> |
| `getTraversalLifecycleStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getTraversalStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `isSuspended` | <code>() =&gt; boolean</code> |
| `requestPauseAfterAdmittedCallbacksDrain` | <code>() =&gt; boolean</code> |
| `runUntilWorkBoundary` | <code>() =&gt; DagExternalWorkRunBoundary&lt;VertexId&gt;</code> |

</details>

<a id="symbol-DagExternalWorkSessionControl"></a>

### DagExternalWorkSessionControl

Type-only; no runtime constructor/value. [Owning contract](reference.md#ticket-coordination) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export interface DagExternalWorkSessionControl<VertexId = unknown> extends TraversalExecutionState<TreeOrDagExecutionSnapshot<DagVisitorPhase>> {
acceptCompletedWork(ticket: DagWorkSettlementTicket<VertexId>): DagSettlementReceipt;
failTraversal(ticket: DagWorkSettlementTicket<VertexId>, error: unknown): DagSettlementReceipt;
captureMilestoneSnapshot(): DagMilestoneSnapshot<VertexId>;
captureProgressSnapshot(): DagProgressSnapshot<VertexId>;
requestPauseAfterAdmittedCallbacksDrain(): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `acceptCompletedWork` | <code>(ticket: DagWorkSettlementTicket&lt;VertexId&gt;) =&gt; DagSettlementReceipt</code> |
| `captureExecutionSnapshot` | <code>() =&gt; TreeOrDagExecutionSnapshot&lt;DagVisitorPhase&gt;</code> |
| `captureMilestoneSnapshot` | <code>() =&gt; DagMilestoneSnapshot&lt;VertexId&gt;</code> |
| `captureProgressSnapshot` | <code>() =&gt; Readonly&lt;{ discovery: Readonly&lt;{ timing: "incrementalDuringTraversal" &#124; "completeBeforeAnyVisitor"; complete: boolean; }&gt;; counts: Readonly&lt;{ retainedLiveVertices: number; verticesWaitingForPrerequisiteMilestones: number; workVisitorReadyOrWorkCompletionDeferredVertices: number; workCompletionDeferredVertices: number; verticesWithAdmittedVisitorChains: number; workCompletionCommittedVertices: number; subgraphCompletionCommittedVertices: number; }&gt;; progressByVertexId: ReadonlyMap&lt;VertexId, Readonly&lt;{ vertexId: VertexId; workState: DagWorkState; subgraphCompletionCommitted: boolean; unmetPrerequisiteVertexIds: readonly VertexId[]; unmetWorkMilestoneVertexIds: readonly VertexId[]; unmetSubgraphCompletionMilestoneVertexIds: readonly VertexId[]; settlementToken?: symbol &#124; undefined; }&gt;&gt;; workVisitorReadyOrWorkCompletionDeferredVertexIds: readonly VertexId[]; workCompletionDeferredVertexIds: readonly VertexId[]; workAwaitingSettlement: readonly Readonly&lt;{ vertexId: VertexId; settlementToken: symbol; }&gt;[]; admittedVisitorChainVertexIds: readonly VertexId[]; workCompletionCommittedVertexIds: readonly VertexId[]; subgraphCompletionCommittedVertexIds: readonly VertexId[]; unmatchedCompletedWorkSeedVertexIds: readonly VertexId[]; invalidDependencyTopologyDiagnostics: DagTraversalStallDiagnostics&lt;VertexId&gt; &#124; null; }&gt;</code> |
| `failTraversal` | <code>(ticket: DagWorkSettlementTicket&lt;VertexId&gt;, error: unknown) =&gt; DagSettlementReceipt</code> |
| `getTraversalLifecycleStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getTraversalStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `isSuspended` | <code>() =&gt; boolean</code> |
| `requestPauseAfterAdmittedCallbacksDrain` | <code>() =&gt; boolean</code> |

</details>

<a id="symbol-DagExternalWorkSessionOptions"></a>

### DagExternalWorkSessionOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagExternalWorkSessionOptions<VertexId> = OwnedOptions & {
    acceptedCompletedWorkVertexIds?: ReadonlySet<VertexId>;
    visitors?: never;
    workCompletionPolicy?: never;
    retainDiscoveredGraphBeforeVisitorCommands?: never;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `acceptedCompletedWorkVertexIds` | <code>ReadonlySet&lt;VertexId&gt; &#124; undefined</code> |
| `dagDiscoverySource` | <code>undefined</code> |
| `discoveryTiming` | <code>undefined</code> |
| `retainDiscoveredGraphBeforeVisitorCommands` | <code>undefined</code> |
| `rootWorkPrerequisitePolicy` | <code>undefined</code> |
| `sourceRootIsHiddenEntryHolder` | <code>undefined</code> |
| `transformChildHintsBeforeResolution` | <code>undefined</code> |
| `traversalRunnerInternalObjects` | <code>undefined</code> |
| `treeDiscoverySource` | <code>undefined</code> |
| `undeclaredWorkPrerequisitePolicy` | <code>undefined</code> |
| `visitors` | <code>undefined</code> |
| `workCompletionPolicy` | <code>undefined</code> |

</details>

<a id="symbol-DagFragment"></a>

### DagFragment

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-fragments-and-composition) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagFragment<Data, VertexId = unknown, Port extends string = string> = Readonly<{
    definition: DagDefinition<Data, VertexId>;
    vertexIdsByPortName: Readonly<Record<Port, VertexId>>;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `definition` | <code>DagDefinition&lt;Data, VertexId&gt;</code> |
| `vertexIdsByPortName` | <code>Readonly&lt;Record&lt;Port, VertexId&gt;&gt;</code> |

</details>

<a id="symbol-DagFragmentValidationError"></a>

### DagFragmentValidationError

Runtime value and public type surface. [Owning contract](reference.md#dag-fragments-and-composition) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare class DagFragmentValidationError<VertexId = unknown> extends TypeError {
readonly issues: readonly DagDefinitionIssue<VertexId>[];
constructor(issues: readonly DagDefinitionIssue<VertexId>[]);
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `issues` | <code>readonly DagDefinitionIssue&lt;VertexId&gt;[]</code> |

</details>

<a id="symbol-DagMilestone"></a>

### DagMilestone

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagMilestone<VertexId = unknown> = {
    vertexId: VertexId;
    milestone: 'workCompletion' | 'subgraphCompletion';
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `milestone` | <code>"subgraphCompletion" &#124; "workCompletion"</code> |
| `vertexId` | <code>VertexId</code> |

</details>

<a id="symbol-DagMilestoneBlocker"></a>

### DagMilestoneBlocker

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagMilestoneBlocker<VertexId = unknown> = (DagMilestoneConstraint<VertexId> & {
    kind: 'unmetMilestoneConstraint';
    waiterStatus: DagMilestoneStatus;
    prerequisiteStatus: DagMilestoneStatus;
}) | {
    kind: 'workCompletionUncommitted';
    targetMilestone: WorkTarget<VertexId>;
    workState: Exclude<DagWorkState, 'workCompletionCommitted'>;
} | {
    kind: 'childDiscoveryNotClosed' | 'subgraphCompletionCommitPending';
    targetMilestone: CompletionTarget<VertexId>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"unmetMilestoneConstraint" &#124; "workCompletionUncommitted" &#124; "childDiscoveryNotClosed" &#124; "subgraphCompletionCommitPending"</code> |

</details>

<a id="symbol-DagMilestoneConstraint"></a>

### DagMilestoneConstraint

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagMilestoneConstraint<VertexId = unknown> = {
    waitingMilestone: DagMilestone<VertexId>;
    prerequisiteMilestone: DagMilestone<VertexId>;
    reason: 'workDependency' | 'subgraphCompletionDependency' | 'ownWork' | 'structuralChild';
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `prerequisiteMilestone` | <code>DagMilestone&lt;VertexId&gt;</code> |
| `reason` | <code>"workDependency" &#124; "subgraphCompletionDependency" &#124; "ownWork" &#124; "structuralChild"</code> |
| `waitingMilestone` | <code>DagMilestone&lt;VertexId&gt;</code> |

</details>

<a id="symbol-DagMilestoneExplanation"></a>

### DagMilestoneExplanation

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagMilestoneExplanation<VertexId = unknown> = Readonly<{
    kind: 'unresolved' | 'deleted';
    targetMilestone: DagMilestone<VertexId>;
    discoveryComplete: boolean;
}> | Readonly<{
    kind: 'live';
    targetMilestone: DagMilestone<VertexId>;
    milestoneSatisfied: boolean;
    progress: DagVertexProgress<VertexId>;
    blockers: readonly DagMilestoneBlocker<VertexId>[];
    discoveryComplete: boolean;
}> | Readonly<{
    kind: 'omitted';
    targetMilestone: DagMilestone<VertexId>;
    milestoneSatisfied: true;
    progress: null;
    blockers: readonly DagMilestoneBlocker<VertexId>[];
    discoveryComplete: boolean;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `discoveryComplete` | <code>boolean</code> |
| `kind` | <code>"omitted" &#124; "live" &#124; "deleted" &#124; "unresolved"</code> |
| `targetMilestone` | <code>DagMilestone&lt;VertexId&gt;</code> |

</details>

<a id="symbol-DagMilestoneQueryOptions"></a>

### DagMilestoneQueryOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagMilestoneQueryOptions = {
    readonly includeTransitiveMilestones?: boolean;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `includeTransitiveMilestones` | <code>boolean &#124; undefined</code> |

</details>

<a id="symbol-DagMilestoneQueryResult"></a>

### DagMilestoneQueryResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagMilestoneQueryResult<VertexId = unknown> = Readonly<{
    reachedMilestones: readonly DagMilestone<VertexId>[];
    originalMilestoneConstraints: readonly DagMilestoneConstraint<VertexId>[];
    discoveryComplete: boolean;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `discoveryComplete` | <code>boolean</code> |
| `originalMilestoneConstraints` | <code>readonly DagMilestoneConstraint&lt;VertexId&gt;[]</code> |
| `reachedMilestones` | <code>readonly DagMilestone&lt;VertexId&gt;[]</code> |

</details>

<a id="symbol-DagMilestoneSnapshot"></a>

### DagMilestoneSnapshot

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export interface DagMilestoneSnapshot<VertexId = unknown> {
explainMilestone(targetMilestone: DagMilestone<VertexId>): DagMilestoneExplanation<VertexId>;
queryOriginalPrerequisiteMilestonesOf(targetMilestone: DagMilestone<VertexId>, options?: DagMilestoneQueryOptions): DagMilestoneQueryResult<VertexId>;
queryOriginalDependentMilestonesOf(targetMilestone: DagMilestone<VertexId>, options?: DagMilestoneQueryOptions): DagMilestoneQueryResult<VertexId>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `explainMilestone` | <code>(targetMilestone: DagMilestone&lt;VertexId&gt;) =&gt; DagMilestoneExplanation&lt;VertexId&gt;</code> |
| `queryOriginalDependentMilestonesOf` | <code>(targetMilestone: DagMilestone&lt;VertexId&gt;, options?: DagMilestoneQueryOptions &#124; undefined) =&gt; Readonly&lt;{ reachedMilestones: readonly DagMilestone&lt;VertexId&gt;[]; originalMilestoneConstraints: readonly DagMilestoneConstraint&lt;VertexId&gt;[]; discoveryComplete: boolean; }&gt;</code> |
| `queryOriginalPrerequisiteMilestonesOf` | <code>(targetMilestone: DagMilestone&lt;VertexId&gt;, options?: DagMilestoneQueryOptions &#124; undefined) =&gt; Readonly&lt;{ reachedMilestones: readonly DagMilestone&lt;VertexId&gt;[]; originalMilestoneConstraints: readonly DagMilestoneConstraint&lt;VertexId&gt;[]; discoveryComplete: boolean; }&gt;</code> |

</details>

<a id="symbol-DagMilestoneStatus"></a>

### DagMilestoneStatus

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagMilestoneStatus = {
    kind: 'live';
    workState: DagWorkState;
    milestoneSatisfied: boolean;
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

<a id="symbol-DagPrerequisiteLookupMissing"></a>

### DagPrerequisiteLookupMissing

Type-only; no runtime constructor/value. [Owning contract](reference.md#discovery-and-completed-work) · [Executable snippet](reference.md#graph-source-result-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type DagPrerequisiteLookupMissing = {
    kind: 'missing';
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"missing"</code> |

</details>

<a id="symbol-DagPrerequisiteLookupResult"></a>

### DagPrerequisiteLookupResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#discovery-and-completed-work) · [Executable snippet](reference.md#graph-source-result-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type DagPrerequisiteLookupResult<InputVertexTypes extends VertexDataAndChildHintTypes, VertexId = unknown> = DagSourceVertexResolution<InputVertexTypes, VertexId> | DagPrerequisiteLookupMissing;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"vertexResolved" &#124; "vertexIntentionallyOmitted" &#124; "missing"</code> |

</details>

<a id="symbol-DagProgressSnapshot"></a>

### DagProgressSnapshot

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-summary-schema) · [Executable snippet](reference.md#dag-summary-schema)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagProgressSnapshot<VertexId = unknown> = Readonly<{
    discovery: Readonly<{
        timing: 'incrementalDuringTraversal' | 'completeBeforeAnyVisitor';
        complete: boolean;
    }>;
    counts: Readonly<{
        retainedLiveVertices: number;
        verticesWaitingForPrerequisiteMilestones: number;
        workVisitorReadyOrWorkCompletionDeferredVertices: number;
        workCompletionDeferredVertices: number;
        verticesWithAdmittedVisitorChains: number;
        workCompletionCommittedVertices: number;
        subgraphCompletionCommittedVertices: number;
    }>;
    progressByVertexId: ReadonlyMap<VertexId, DagVertexProgress<VertexId>>;
    workVisitorReadyOrWorkCompletionDeferredVertexIds: readonly VertexId[];
    workCompletionDeferredVertexIds: readonly VertexId[];
    workAwaitingSettlement: readonly DagWorkAwaitingSettlement<VertexId>[];
    admittedVisitorChainVertexIds: readonly VertexId[];
    workCompletionCommittedVertexIds: readonly VertexId[];
    subgraphCompletionCommittedVertexIds: readonly VertexId[];
    unmatchedCompletedWorkSeedVertexIds: readonly VertexId[];
    invalidDependencyTopologyDiagnostics: DagTraversalStallDiagnostics<VertexId> | null;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `admittedVisitorChainVertexIds` | <code>readonly VertexId[]</code> |
| `counts` | <code>Readonly&lt;{ retainedLiveVertices: number; verticesWaitingForPrerequisiteMilestones: number; workVisitorReadyOrWorkCompletionDeferredVertices: number; workCompletionDeferredVertices: number; verticesWithAdmittedVisitorChains: number; workCompletionCommittedVertices: number; subgraphCompletionCommittedVertices: number; }&gt;</code> |
| `discovery` | <code>Readonly&lt;{ timing: "incrementalDuringTraversal" &#124; "completeBeforeAnyVisitor"; complete: boolean; }&gt;</code> |
| `invalidDependencyTopologyDiagnostics` | <code>DagTraversalStallDiagnostics&lt;VertexId&gt; &#124; null</code> |
| `progressByVertexId` | <code>ReadonlyMap&lt;VertexId, Readonly&lt;{ vertexId: VertexId; workState: DagWorkState; subgraphCompletionCommitted: boolean; unmetPrerequisiteVertexIds: readonly VertexId[]; unmetWorkMilestoneVertexIds: readonly VertexId[]; unmetSubgraphCompletionMilestoneVertexIds: readonly VertexId[]; settlementToken?: symbol &#124; undefined; }&gt;&gt;</code> |
| `subgraphCompletionCommittedVertexIds` | <code>readonly VertexId[]</code> |
| `unmatchedCompletedWorkSeedVertexIds` | <code>readonly VertexId[]</code> |
| `workAwaitingSettlement` | <code>readonly Readonly&lt;{ vertexId: VertexId; settlementToken: symbol; }&gt;[]</code> |
| `workCompletionCommittedVertexIds` | <code>readonly VertexId[]</code> |
| `workCompletionDeferredVertexIds` | <code>readonly VertexId[]</code> |
| `workVisitorReadyOrWorkCompletionDeferredVertexIds` | <code>readonly VertexId[]</code> |

</details>

<a id="symbol-DagRecordSelectors"></a>

### DagRecordSelectors

Type-only; no runtime constructor/value. [Owning contract](reference.md#collection-and-forest-sources) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/quickstart-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/dag-input-materialization`.

```ts
export type DagRecordSelectors<Item, VertexId> = {
    selectVertexId(item: Item): VertexId;
    selectStructuralChildVertexIds?(item: Item): Iterable<VertexId>;
    selectWorkPrerequisiteVertexIds?(item: Item): Iterable<VertexId>;
    selectSubgraphCompletionPrerequisiteVertexIds?(item: Item): Iterable<VertexId>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `selectStructuralChildVertexIds` | <code>((item: Item) =&gt; Iterable&lt;VertexId&gt;) &#124; undefined</code> |
| `selectSubgraphCompletionPrerequisiteVertexIds` | <code>((item: Item) =&gt; Iterable&lt;VertexId&gt;) &#124; undefined</code> |
| `selectVertexId` | <code>(item: Item) =&gt; VertexId</code> |
| `selectWorkPrerequisiteVertexIds` | <code>((item: Item) =&gt; Iterable&lt;VertexId&gt;) &#124; undefined</code> |

</details>

<a id="symbol-DagRevisionOperation"></a>

### DagRevisionOperation

Type-only; no runtime constructor/value. [Owning contract](reference.md#validated-dag-revisions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagRevisionOperation<Data, VertexId = unknown> = {
    readonly kind: 'addVertexDeclaration';
    readonly vertexDeclaration: DagDefinitionVertex<Data, VertexId>;
} | {
    readonly kind: 'replaceVertexDeclaration';
    readonly vertexDeclaration: DagDefinitionVertex<Data, VertexId>;
} | {
    readonly kind: 'removeVertexDeclaration';
    readonly vertexId: VertexId;
} | {
    readonly kind: 'replaceEntryDeclaration';
    readonly entry: DagDefinition<Data, VertexId>['entry'];
} | {
    readonly kind: 'replaceOmittedVertexIds';
    readonly omittedVertexIds: readonly VertexId[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"addVertexDeclaration" &#124; "replaceVertexDeclaration" &#124; "removeVertexDeclaration" &#124; "replaceEntryDeclaration" &#124; "replaceOmittedVertexIds"</code> |

</details>

<a id="symbol-DagRevisionResult"></a>

### DagRevisionResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#validated-dag-revisions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagRevisionResult<Data, VertexId = unknown> = {
    kind: 'valid';
    validatedTopology: ValidatedReusableDagTopology<Data, VertexId>;
    changes: DagDefinitionDiff<VertexId>;
} | {
    kind: 'invalid';
    issues: readonly DagDefinitionIssue<VertexId>[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"valid" &#124; "invalid"</code> |

</details>

<a id="symbol-DagRootRecordSelectors"></a>

### DagRootRecordSelectors

Type-only; no runtime constructor/value. [Owning contract](reference.md#collection-and-forest-sources) · [Related example](reference.md#roots-materialization-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/dag-input-materialization`.

```ts
export type DagRootRecordSelectors<Item, VertexId> = Omit<DagRecordSelectors<Item, VertexId>, 'selectStructuralChildVertexIds'> & {
    selectStructuralChildRecords?(item: Item): Iterable<Item>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `selectStructuralChildRecords` | <code>((item: Item) =&gt; Iterable&lt;Item&gt;) &#124; undefined</code> |
| `selectSubgraphCompletionPrerequisiteVertexIds` | <code>((item: Item) =&gt; Iterable&lt;VertexId&gt;) &#124; undefined</code> |
| `selectVertexId` | <code>(item: Item) =&gt; VertexId</code> |
| `selectWorkPrerequisiteVertexIds` | <code>((item: Item) =&gt; Iterable&lt;VertexId&gt;) &#124; undefined</code> |

</details>

<a id="symbol-DagSchedulingOptions"></a>

### DagSchedulingOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagSchedulingOptions = {
    workCompletionPolicy?: 'afterWorkReadyVisitorChain' | 'requireExternalWorkSettlement' | undefined;
    discoveryTiming?: 'incrementalDuringTraversal' | 'completeBeforeAnyVisitor' | undefined;
    rootWorkPrerequisitePolicy?: 'honor' | 'ignore' | undefined;
    undeclaredWorkPrerequisitePolicy?: 'none' | 'waitForDiscoveringParentWork' | undefined;
    sourceRootIsHiddenEntryHolder?: boolean | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `discoveryTiming` | <code>"incrementalDuringTraversal" &#124; "completeBeforeAnyVisitor" &#124; undefined</code> |
| `rootWorkPrerequisitePolicy` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `sourceRootIsHiddenEntryHolder` | <code>boolean &#124; undefined</code> |
| `undeclaredWorkPrerequisitePolicy` | <code>"none" &#124; "waitForDiscoveringParentWork" &#124; undefined</code> |
| `workCompletionPolicy` | <code>"afterWorkReadyVisitorChain" &#124; "requireExternalWorkSettlement" &#124; undefined</code> |

</details>

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

<a id="symbol-DagSourceVertexResolution"></a>

### DagSourceVertexResolution

Type-only; no runtime constructor/value. [Owning contract](reference.md#discovery-and-completed-work) · [Executable snippet](reference.md#graph-source-result-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type DagSourceVertexResolution<InputVertexTypes extends VertexDataAndChildHintTypes, VertexId = unknown> = FoundDagSourceVertex<InputVertexTypes, VertexId> | OmittedDagSourceVertex<VertexId>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"vertexResolved" &#124; "vertexIntentionallyOmitted"</code> |

</details>

<a id="symbol-DagStructuralDiscoveryCycleError"></a>

### DagStructuralDiscoveryCycleError

Runtime value and public type surface. [Owning contract](reference.md#validation-results-and-failures) · [Related example](reference.md#narrow-invalid-issues)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare class DagStructuralDiscoveryCycleError<VertexId = unknown> extends Error {
readonly cycleWitnessVertexIds: readonly VertexId[];
constructor(cycleWitnessVertexIds: readonly VertexId[]);
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `cycleWitnessVertexIds` | <code>readonly VertexId[]</code> |

</details>

<a id="symbol-DagStructuralDiscoverySlot"></a>

### DagStructuralDiscoverySlot

Type-only; no runtime constructor/value. [Owning contract](reference.md#materialized-dag-definitions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagStructuralDiscoverySlot<VertexId> = {
    readonly kind: 'vertex';
    readonly vertexId: VertexId;
} | {
    readonly kind: 'omitted';
    readonly omittedVertexIdentity: {
        readonly vertexId: VertexId;
    } | null;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"vertex" &#124; "omitted"</code> |

</details>

<a id="symbol-DagTopologyDiscoveryInput"></a>

### DagTopologyDiscoveryInput

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagTopologyDiscoveryInput<SourceVertexTypes extends VertexDataAndChildHintTypes, VertexId = unknown> = DagTopologyDiscoveryOptions & {
    dagDiscoverySource: DagDiscoverySource<SourceVertexTypes, SourceVertexTypes, VertexId>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `acceptedCompletedWorkVertexIds` | <code>undefined</code> |
| `dagDiscoverySource` | <code>DagDiscoverySource&lt;SourceVertexTypes, SourceVertexTypes, VertexId&gt;</code> |
| `discoveryTiming` | <code>undefined</code> |
| `retainDiscoveredGraphBeforeVisitorCommands` | <code>undefined</code> |
| `rootWorkPrerequisitePolicy` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `sourceRootIsHiddenEntryHolder` | <code>boolean &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>undefined</code> |
| `traversalRunnerInternalObjects` | <code>undefined</code> |
| `treeDiscoverySource` | <code>undefined</code> |
| `undeclaredWorkPrerequisitePolicy` | <code>"none" &#124; "waitForDiscoveringParentWork" &#124; undefined</code> |
| `visitors` | <code>undefined</code> |
| `workCompletionPolicy` | <code>undefined</code> |

</details>

<a id="symbol-DagTopologyDiscoveryOptions"></a>

### DagTopologyDiscoveryOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagTopologyDiscoveryOptions = {
    sourceRootIsHiddenEntryHolder?: boolean;
    rootWorkPrerequisitePolicy?: 'honor' | 'ignore';
    undeclaredWorkPrerequisitePolicy?: 'none' | 'waitForDiscoveringParentWork';
    treeDiscoverySource?: never;
    visitors?: never;
    acceptedCompletedWorkVertexIds?: never;
    traversalRunnerInternalObjects?: never;
    workCompletionPolicy?: never;
    discoveryTiming?: never;
    transformChildHintsBeforeResolution?: never;
    retainDiscoveredGraphBeforeVisitorCommands?: never;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `acceptedCompletedWorkVertexIds` | <code>undefined</code> |
| `discoveryTiming` | <code>undefined</code> |
| `retainDiscoveredGraphBeforeVisitorCommands` | <code>undefined</code> |
| `rootWorkPrerequisitePolicy` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `sourceRootIsHiddenEntryHolder` | <code>boolean &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>undefined</code> |
| `traversalRunnerInternalObjects` | <code>undefined</code> |
| `treeDiscoverySource` | <code>undefined</code> |
| `undeclaredWorkPrerequisitePolicy` | <code>"none" &#124; "waitForDiscoveringParentWork" &#124; undefined</code> |
| `visitors` | <code>undefined</code> |
| `workCompletionPolicy` | <code>undefined</code> |

</details>

<a id="symbol-DagTopologyValidationResult"></a>

### DagTopologyValidationResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#materialized-dag-definitions) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagTopologyValidationResult<Data, VertexId = unknown> = {
    kind: 'valid';
    validatedTopology: ValidatedReusableDagTopology<Data, VertexId>;
} | {
    kind: 'invalid';
    issues: readonly DagDefinitionIssue<VertexId>[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"valid" &#124; "invalid"</code> |

</details>

<a id="symbol-DagTraversalBuilder"></a>

### DagTraversalBuilder

Runtime value and public type surface. [Owning contract](reference.md#dag-traversal) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-workflow-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare class DagTraversalBuilder<SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, VertexId = unknown> {
constructor(input: DagTraversalBuilderOptions<SourceVertexTypes, RewrittenVertexTypes, VertexId>);
patchOptionsForFutureRunners(input: DagTraversalBuilderOptionsPatch<SourceVertexTypes, RewrittenVertexTypes, VertexId>): this;
registerVisitorCallbackForPhase<Phase extends DagVisitorPhase>(order: Phase, visitor: DagVisitor<SourceVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>, VertexId>, options?: Partial<VisitorRegistrationOptions>): this;
appendVisitorGroupForPhase<Phase extends DagVisitorPhase>(order: Phase, group: VisitorGroupDefinition<DagVisitor<SourceVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>, VertexId>>): this;
getDetachedVisitorRegistrationRecordsForPhase<Phase extends DagVisitorPhase>(order: Phase): DagTraversalVisitors<SourceVertexTypes, RewrittenVertexTypes, VertexId>[Phase];
replaceVisitorDefinitionsForPhase<Phase extends DagVisitorPhase>(order: Phase, input: VisitorDefinitionsForPhase<DagVisitor<SourceVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>, VertexId>>): this;
createIndependentRunnerFromCurrentOptions(): DagTraversalRunner<SourceVertexTypes, RewrittenVertexTypes, VertexId>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `appendVisitorGroupForPhase` | <code>&lt;Phase extends DagVisitorPhase&gt;(order: Phase, group: VisitorGroupDefinition&lt;DagVisitor&lt;SourceVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;, VertexId&gt;&gt;) =&gt; DagTraversalBuilder&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;</code> |
| `createIndependentRunnerFromCurrentOptions` | <code>() =&gt; DagTraversalRunner&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;</code> |
| `getDetachedVisitorRegistrationRecordsForPhase` | <code>&lt;Phase extends DagVisitorPhase&gt;(order: Phase) =&gt; DagTraversalVisitors&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;[Phase]</code> |
| `patchOptionsForFutureRunners` | <code>(input: DagTraversalBuilderOptionsPatch&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;) =&gt; DagTraversalBuilder&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;</code> |
| `registerVisitorCallbackForPhase` | <code>&lt;Phase extends DagVisitorPhase&gt;(order: Phase, visitor: DagVisitor&lt;SourceVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;, VertexId&gt;, options?: Partial&lt;VisitorRegistrationOptions&gt; &#124; undefined) =&gt; DagTraversalBuilder&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;</code> |
| `replaceVisitorDefinitionsForPhase` | <code>&lt;Phase extends DagVisitorPhase&gt;(order: Phase, input: VisitorDefinitionsForPhase&lt;DagVisitor&lt;SourceVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;, VertexId&gt;&gt;) =&gt; DagTraversalBuilder&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;</code> |

</details>

<a id="symbol-DagTraversalBuilderOptions"></a>

### DagTraversalBuilderOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagTraversalBuilderOptions<SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, VertexId = unknown> = DagSource<SourceVertexTypes, RewrittenVertexTypes, VertexId> & DagTraversalOptionsInput<SourceVertexTypes, RewrittenVertexTypes, VertexId> & ({
    dagDiscoverySource: DagDiscoverySource<SourceVertexTypes, RewrittenVertexTypes, VertexId>;
} | {
    rootWorkPrerequisitePolicy?: never;
    undeclaredWorkPrerequisitePolicy?: never;
});
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `acceptedCompletedWorkVertexIds` | <code>ReadonlySet&lt;VertexId&gt; &#124; undefined</code> |
| `dagDiscoverySource` | <code>DagDiscoverySource&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt; &#124; undefined</code> |
| `discoveryTiming` | <code>"incrementalDuringTraversal" &#124; "completeBeforeAnyVisitor" &#124; undefined</code> |
| `retainDiscoveredGraphBeforeVisitorCommands` | <code>boolean &#124; undefined</code> |
| `rootWorkPrerequisitePolicy` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `sourceRootIsHiddenEntryHolder` | <code>boolean &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>ChildHintsListTransformer&lt;SourceVertexTypes&gt; &#124; null &#124; undefined</code> |
| `treeDiscoverySource` | <code>(unknown extends VertexId ? TreeDiscoverySource&lt;SourceVertexTypes, RewrittenVertexTypes&gt; : never) &#124; undefined</code> |
| `undeclaredWorkPrerequisitePolicy` | <code>"none" &#124; "waitForDiscoveringParentWork" &#124; undefined</code> |
| `visitors` | <code>VisitorDefinitionsByPhase&lt;DagTraversalVisitors&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;&gt; &#124; undefined</code> |
| `workCompletionPolicy` | <code>"afterWorkReadyVisitorChain" &#124; "requireExternalWorkSettlement" &#124; undefined</code> |

</details>

<a id="symbol-DagTraversalBuilderOptionsPatch"></a>

### DagTraversalBuilderOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagTraversalBuilderOptionsPatch<SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, VertexId = unknown> = DagTraversalOptionsInput<SourceVertexTypes, RewrittenVertexTypes, VertexId> & ({
    dagDiscoverySource?: DagDiscoverySource<SourceVertexTypes, RewrittenVertexTypes, VertexId> | undefined;
    treeDiscoverySource?: undefined;
} | {
    rootWorkPrerequisitePolicy?: never;
    undeclaredWorkPrerequisitePolicy?: never;
    treeDiscoverySource?: (unknown extends VertexId ? TreeDiscoverySource<SourceVertexTypes, RewrittenVertexTypes> : never) | undefined;
    dagDiscoverySource?: undefined;
});
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `acceptedCompletedWorkVertexIds` | <code>ReadonlySet&lt;VertexId&gt; &#124; undefined</code> |
| `dagDiscoverySource` | <code>DagDiscoverySource&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt; &#124; undefined</code> |
| `discoveryTiming` | <code>"incrementalDuringTraversal" &#124; "completeBeforeAnyVisitor" &#124; undefined</code> |
| `retainDiscoveredGraphBeforeVisitorCommands` | <code>boolean &#124; undefined</code> |
| `rootWorkPrerequisitePolicy` | <code>"honor" &#124; "ignore" &#124; undefined</code> |
| `sourceRootIsHiddenEntryHolder` | <code>boolean &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>ChildHintsListTransformer&lt;SourceVertexTypes&gt; &#124; null &#124; undefined</code> |
| `treeDiscoverySource` | <code>(unknown extends VertexId ? TreeDiscoverySource&lt;SourceVertexTypes, RewrittenVertexTypes&gt; : never) &#124; undefined</code> |
| `undeclaredWorkPrerequisitePolicy` | <code>"none" &#124; "waitForDiscoveringParentWork" &#124; undefined</code> |
| `visitors` | <code>VisitorDefinitionsByPhase&lt;DagTraversalVisitors&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;&gt; &#124; undefined</code> |
| `workCompletionPolicy` | <code>"afterWorkReadyVisitorChain" &#124; "requireExternalWorkSettlement" &#124; undefined</code> |

</details>

<a id="symbol-DagTraversalRunner"></a>

### DagTraversalRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-workflow-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export interface DagTraversalRunner<SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, VertexId = unknown> extends SyncTraversalExecution<DagVisitorPhase, DagCommittedMilestoneEvent<SourceVertexTypes | RewrittenVertexTypes, VertexId>, TreeOrDagExecutionSnapshot<DagVisitorPhase>, 'workCompletionCommitted' | 'subgraphCompletionCommitted'> {
readonly preCommandDiscoveredGraphView: PreCommandDiscoveredGraphView<SourceVertexTypes, VertexId> | null;
discoverValidateAndFreezeTopology(): this;
captureMilestoneSnapshot(): DagMilestoneSnapshot<VertexId>;
captureProgressSnapshot(): DagProgressSnapshot<VertexId>;
settleDeferredWork(vertexId: VertexId, outcome: DagSettlementOutcome, expectedSettlementToken: DagWorkSettlementToken): boolean;
getLiveResolvedTreeView(): LiveResolvedTreeView<SourceVertexTypes | RewrittenVertexTypes> | null;
getLiveResolvedGraphView(): LiveResolvedGraphView<SourceVertexTypes | RewrittenVertexTypes, VertexId>;
isVisibleSourceRootVertex(vertexHandle: VertexHandle<SourceVertexTypes | RewrittenVertexTypes>): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `captureExecutionSnapshot` | <code>() =&gt; TreeOrDagExecutionSnapshot&lt;DagVisitorPhase&gt;</code> |
| `captureMilestoneSnapshot` | <code>() =&gt; DagMilestoneSnapshot&lt;VertexId&gt;</code> |
| `captureProgressSnapshot` | <code>() =&gt; Readonly&lt;{ discovery: Readonly&lt;{ timing: "incrementalDuringTraversal" &#124; "completeBeforeAnyVisitor"; complete: boolean; }&gt;; counts: Readonly&lt;{ retainedLiveVertices: number; verticesWaitingForPrerequisiteMilestones: number; workVisitorReadyOrWorkCompletionDeferredVertices: number; workCompletionDeferredVertices: number; verticesWithAdmittedVisitorChains: number; workCompletionCommittedVertices: number; subgraphCompletionCommittedVertices: number; }&gt;; progressByVertexId: ReadonlyMap&lt;VertexId, Readonly&lt;{ vertexId: VertexId; workState: DagWorkState; subgraphCompletionCommitted: boolean; unmetPrerequisiteVertexIds: readonly VertexId[]; unmetWorkMilestoneVertexIds: readonly VertexId[]; unmetSubgraphCompletionMilestoneVertexIds: readonly VertexId[]; settlementToken?: symbol &#124; undefined; }&gt;&gt;; workVisitorReadyOrWorkCompletionDeferredVertexIds: readonly VertexId[]; workCompletionDeferredVertexIds: readonly VertexId[]; workAwaitingSettlement: readonly Readonly&lt;{ vertexId: VertexId; settlementToken: symbol; }&gt;[]; admittedVisitorChainVertexIds: readonly VertexId[]; workCompletionCommittedVertexIds: readonly VertexId[]; subgraphCompletionCommittedVertexIds: readonly VertexId[]; unmatchedCompletedWorkSeedVertexIds: readonly VertexId[]; invalidDependencyTopologyDiagnostics: DagTraversalStallDiagnostics&lt;VertexId&gt; &#124; null; }&gt;</code> |
| `discoverValidateAndFreezeTopology` | <code>() =&gt; DagTraversalRunner&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;</code> |
| `getLiveResolvedGraphView` | <code>() =&gt; LiveResolvedGraphView&lt;SourceVertexTypes &#124; RewrittenVertexTypes, VertexId&gt;</code> |
| `getLiveResolvedTreeView` | <code>() =&gt; LiveResolvedTreeView&lt;SourceVertexTypes &#124; RewrittenVertexTypes&gt; &#124; null</code> |
| `getTraversalLifecycleStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getTraversalStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `isSuspended` | <code>() =&gt; boolean</code> |
| `isVisibleSourceRootVertex` | <code>(vertexHandle: VertexHandle&lt;SourceVertexTypes &#124; RewrittenVertexTypes&gt;) =&gt; boolean</code> |
| `preCommandDiscoveredGraphView` | <code>PreCommandDiscoveredGraphView&lt;SourceVertexTypes, VertexId&gt; &#124; null</code> |
| `requestPauseAfterAdmittedCallbacksDrain` | <code>() =&gt; boolean</code> |
| `runAndIterateObservationEventsUntilSuspendedOrTerminal` | <code>{ (): Generator&lt;DagCommittedMilestoneEvent&lt;SourceVertexTypes &#124; RewrittenVertexTypes, VertexId&gt;, void, unknown&gt;; &lt;Kind extends "workCompletionCommitted" &#124; "subgraphCompletionCommitted"&gt;(config: TraversalExecutionSelectionPatch&lt;DagVisitorPhase, Kind&gt; &amp; { deliveredEventKinds: readonly Kind[]; }): Generator&lt;TraversalEventNarrowedToSelectedKinds&lt;DagCommittedMilestoneEvent&lt;SourceVertexTypes &#124; RewrittenVertexTypes, VertexId&gt;, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionSelectionPatch&lt;DagVisitorPhase, "workCompletionCommitted" &#124; "subgraphCompletionCommitted"&gt; &#124; undefined): Generator&lt;DagCommittedMilestoneEvent&lt;SourceVertexTypes &#124; RewrittenVertexTypes, VertexId&gt;, void, unknown&gt;; }</code> |
| `runUntilSuspendedOrTerminal` | <code>(config?: TraversalExecutionSelectionPatch&lt;DagVisitorPhase, "workCompletionCommitted" &#124; "subgraphCompletionCommitted"&gt; &#124; undefined) =&gt; DagTraversalRunner&lt;SourceVertexTypes, RewrittenVertexTypes, VertexId&gt;</code> |
| `settleDeferredWork` | <code>(vertexId: VertexId, outcome: DagSettlementOutcome, expectedSettlementToken: symbol) =&gt; boolean</code> |

</details>

<a id="symbol-DagTraversalStallDiagnostics"></a>

### DagTraversalStallDiagnostics

Type-only; no runtime constructor/value. [Owning contract](reference.md#validation-results-and-failures) · [Related example](reference.md#narrow-invalid-issues)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagTraversalStallDiagnostics<VertexId = unknown> = {
    blockedVertexPrerequisiteReports: Array<{
        vertexId: VertexId;
        prerequisiteVertexIdsInReport: VertexId[];
    }>;
    unresolvedPrerequisiteVertexIds: VertexId[];
    /** Strongly connected component membership, not ordered cycle witnesses. */
    milestoneCycleVertexIdComponents: VertexId[][];
    originalMilestoneConstraints: DagMilestoneConstraint<VertexId>[];
    nonCyclePrerequisiteBlockedVertexIds: VertexId[];
    incompleteVertexIdsWithoutUnmetPrerequisites: VertexId[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `blockedVertexPrerequisiteReports` | <code>{ vertexId: VertexId; prerequisiteVertexIdsInReport: VertexId[]; }[]</code> |
| `incompleteVertexIdsWithoutUnmetPrerequisites` | <code>VertexId[]</code> |
| `milestoneCycleVertexIdComponents` | <code>VertexId[][]</code> |
| `nonCyclePrerequisiteBlockedVertexIds` | <code>VertexId[]</code> |
| `originalMilestoneConstraints` | <code>DagMilestoneConstraint&lt;VertexId&gt;[]</code> |
| `unresolvedPrerequisiteVertexIds` | <code>VertexId[]</code> |

</details>

<a id="symbol-DagTraversalStallError"></a>

### DagTraversalStallError

Runtime value and public type surface. [Owning contract](reference.md#validation-results-and-failures) · [Related example](reference.md#narrow-invalid-issues)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare class DagTraversalStallError<VertexId = unknown> extends Error {
readonly diagnostics: DagTraversalStallDiagnostics<VertexId>;
constructor(diagnostics: Omit<DagTraversalStallDiagnostics<DiagnosticId<VertexId>>, 'originalMilestoneConstraints'> & Partial<Pick<DagTraversalStallDiagnostics<DiagnosticId<VertexId>>, 'originalMilestoneConstraints'>>);
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `diagnostics` | <code>DagTraversalStallDiagnostics&lt;VertexId&gt;</code> |

</details>

<a id="symbol-DagVertexProgress"></a>

### DagVertexProgress

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-summary-schema) · [Executable snippet](reference.md#dag-summary-schema)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagVertexProgress<VertexId = unknown> = Readonly<{
    vertexId: VertexId;
    workState: DagWorkState;
    subgraphCompletionCommitted: boolean;
    unmetPrerequisiteVertexIds: readonly VertexId[];
    /** Exact W waits, independent of C waits even when their IDs overlap. */
    unmetWorkMilestoneVertexIds: readonly VertexId[];
    unmetSubgraphCompletionMilestoneVertexIds: readonly VertexId[];
    settlementToken?: DagWorkSettlementToken;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `settlementToken` | <code>symbol &#124; undefined</code> |
| `subgraphCompletionCommitted` | <code>boolean</code> |
| `unmetPrerequisiteVertexIds` | <code>readonly VertexId[]</code> |
| `unmetSubgraphCompletionMilestoneVertexIds` | <code>readonly VertexId[]</code> |
| `unmetWorkMilestoneVertexIds` | <code>readonly VertexId[]</code> |
| `vertexId` | <code>VertexId</code> |
| `workState` | <code>DagWorkState</code> |

</details>

<a id="symbol-DagVisitor"></a>

### DagVisitor

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-workflow-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagVisitor<SourceVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, Phase extends DagVisitorPhase = DagVisitorPhase, VertexId = unknown> = VisitorCallbackReturnValue<RewrittenVertexTypes, Phase, 'dag', SourceVertexTypes['ChildHint']> extends infer VisitorResult ? (vertex: VertexView<SourceVertexTypes | RewrittenVertexTypes>, context: DagVisitorContext<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>) => VisitorResult : never;
```

<a id="symbol-DagVisitorContext"></a>

### DagVisitorContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-workflow-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagVisitorContext<SourceVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, Phase extends DagVisitorPhase = DagVisitorPhase, VertexId = unknown> = {
    liveResolvedGraphView: LiveResolvedGraphView<SourceVertexTypes | RewrittenVertexTypes, VertexId>;
    preCommandDiscoveredGraphView: PreCommandDiscoveredGraphView<SourceVertexTypes, VertexId> | null;
    vertexHandle: VertexHandle<SourceVertexTypes | RewrittenVertexTypes>;
    visitorPhase: Phase;
    isVisibleSourceRoot: boolean;
    phaseVisitorChainAdmissionIndex: number;
    visitorCallbackIndexInPhaseChain: number;
    previousCommittedVisitVertexHandleForSamePhase: VertexHandle<SourceVertexTypes | RewrittenVertexTypes> | null;
    currentVertexPhaseChainState: unknown;
    visitorRegistrationMetadata: VisitorRegistrationMetadata;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `currentVertexPhaseChainState` | <code>unknown</code> |
| `isVisibleSourceRoot` | <code>boolean</code> |
| `liveResolvedGraphView` | <code>LiveResolvedGraphView&lt;SourceVertexTypes &#124; RewrittenVertexTypes, VertexId&gt;</code> |
| `phaseVisitorChainAdmissionIndex` | <code>number</code> |
| `preCommandDiscoveredGraphView` | <code>PreCommandDiscoveredGraphView&lt;SourceVertexTypes, VertexId&gt; &#124; null</code> |
| `previousCommittedVisitVertexHandleForSamePhase` | <code>VertexHandle&lt;SourceVertexTypes &#124; RewrittenVertexTypes&gt; &#124; null</code> |
| `vertexHandle` | <code>VertexHandle&lt;SourceVertexTypes &#124; RewrittenVertexTypes&gt;</code> |
| `visitorCallbackIndexInPhaseChain` | <code>number</code> |
| `visitorPhase` | <code>Phase</code> |
| `visitorRegistrationMetadata` | <code>Readonly&lt;VisitorRegistrationOptions &amp; { phaseRegistrationInsertionIndex: number; visitorGroup?: Readonly&lt;{ groupIdentity: symbol; isExplicitlyDeclaredGroup: boolean; visitorCommandCommitTiming: VisitorCommandCommitTiming; }&gt; &#124; undefined; }&gt;</code> |

</details>

<a id="symbol-DagVisitorPhase"></a>

### DagVisitorPhase

Runtime value and public type surface. [Owning contract](reference.md#dag-traversal) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-workflow-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare enum DagVisitorPhase {
ON_WORK_READY = "ON_WORK_READY"
ON_SUBGRAPH_COMPLETION_READY = "ON_SUBGRAPH_COMPLETION_READY"
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `ON_SUBGRAPH_COMPLETION_READY` | <code>DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY</code> |
| `ON_WORK_READY` | <code>DagVisitorPhase.ON_WORK_READY</code> |

</details>

<a id="symbol-DagWorkAwaitingSettlement"></a>

### DagWorkAwaitingSettlement

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-summary-schema) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-orchestration-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagWorkAwaitingSettlement<VertexId = unknown> = Readonly<{
    vertexId: VertexId;
    settlementToken: DagWorkSettlementToken;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `settlementToken` | <code>symbol</code> |
| `vertexId` | <code>VertexId</code> |

</details>

<a id="symbol-DagWorkSettlementTicket"></a>

### DagWorkSettlementTicket

Type-only; no runtime constructor/value. [Owning contract](reference.md#ticket-coordination) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagWorkSettlementTicket<VertexId = unknown> = NominalDagWorkSettlementTicket<VertexId>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `vertexId` | <code>VertexId</code> |

</details>

<a id="symbol-DagWorkSettlementToken"></a>

### DagWorkSettlementToken

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-summary-schema) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-orchestration-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagWorkSettlementToken = symbol;
```

<a id="symbol-DagWorkState"></a>

### DagWorkState

Type-only; no runtime constructor/value. [Owning contract](reference.md#dag-summary-schema) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-orchestration-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type DagWorkState = 'waitingForPrerequisiteMilestones' | 'readyForWorkVisitorAdmission' | 'workVisitorChainAdmitted' | 'workCompletionDeferred' | 'workCompletionCommitted';
```

<a id="symbol-DepthFirstChildBoundaryVisitOptions"></a>

### DepthFirstChildBoundaryVisitOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export type DepthFirstChildBoundaryVisitOptions = {
    visitAfterChildIndices: ZeroBasedOrEndRelativeChildIndexSelection;
    visitAfterChildIndicesWhenPrimarySelectionIsEmpty: ZeroBasedOrEndRelativeChildIndexSelection;
    alsoVisitAfterOnlyChild: boolean;
    allowBoundaryVisitsAfterOmittedChildSlots: boolean;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `allowBoundaryVisitsAfterOmittedChildSlots` | <code>boolean</code> |
| `alsoVisitAfterOnlyChild` | <code>boolean</code> |
| `visitAfterChildIndices` | <code>ZeroBasedOrEndRelativeChildIndexSelection</code> |
| `visitAfterChildIndicesWhenPrimarySelectionIsEmpty` | <code>ZeroBasedOrEndRelativeChildIndexSelection</code> |

</details>

<a id="symbol-DepthFirstTreeRunner"></a>

### DepthFirstTreeRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#traversal-orders) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export interface DepthFirstTreeRunner<InputVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> extends SyncTraversalExecution<DepthFirstTreeVisitPhase, TreeTraversalEvent<DepthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes>, TreeOrDagExecutionSnapshot<DepthFirstTreeVisitPhase>> {
getLiveResolvedTreeView(): LiveResolvedTreeView<InputVertexTypes | RewrittenVertexTypes>;
getLiveResolvedGraphView(): LiveResolvedGraphView<InputVertexTypes | RewrittenVertexTypes>;
isTreeRootVertex(ref: VertexHandle<InputVertexTypes | RewrittenVertexTypes>): boolean;
hasSkippedPendingChildDiscovery(ref: VertexHandle<InputVertexTypes | RewrittenVertexTypes>): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `captureExecutionSnapshot` | <code>() =&gt; TreeOrDagExecutionSnapshot&lt;DepthFirstTreeVisitPhase&gt;</code> |
| `getLiveResolvedGraphView` | <code>() =&gt; LiveResolvedGraphView&lt;InputVertexTypes &#124; RewrittenVertexTypes, unknown&gt;</code> |
| `getLiveResolvedTreeView` | <code>() =&gt; LiveResolvedTreeView&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;</code> |
| `getTraversalLifecycleStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getTraversalStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `hasSkippedPendingChildDiscovery` | <code>(ref: VertexHandle&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;) =&gt; boolean</code> |
| `isSuspended` | <code>() =&gt; boolean</code> |
| `isTreeRootVertex` | <code>(ref: VertexHandle&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;) =&gt; boolean</code> |
| `requestPauseAfterAdmittedCallbacksDrain` | <code>() =&gt; boolean</code> |
| `runAndIterateObservationEventsUntilSuspendedOrTerminal` | <code>{ (): Generator&lt;TreeTraversalEvent&lt;DepthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes&gt;, void, unknown&gt;; &lt;Kind extends DepthFirstTreeVisitPhase&gt;(config: TraversalExecutionSelectionPatch&lt;DepthFirstTreeVisitPhase, Kind&gt; &amp; { deliveredEventKinds: readonly Kind[]; }): Generator&lt;TraversalEventNarrowedToSelectedKinds&lt;TreeTraversalEvent&lt;DepthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes&gt;, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionSelectionPatch&lt;DepthFirstTreeVisitPhase, DepthFirstTreeVisitPhase&gt; &#124; undefined): Generator&lt;TreeTraversalEvent&lt;DepthFirstTreeVisitPhase, InputVertexTypes, RewrittenVertexTypes&gt;, void, unknown&gt;; }</code> |
| `runUntilSuspendedOrTerminal` | <code>(config?: TraversalExecutionSelectionPatch&lt;DepthFirstTreeVisitPhase, DepthFirstTreeVisitPhase&gt; &#124; undefined) =&gt; DepthFirstTreeRunner&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |

</details>

<a id="symbol-DepthFirstTreeTraversalBuilder"></a>

### DepthFirstTreeTraversalBuilder

Runtime value and public type surface. [Owning contract](reference.md#traversal-orders) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export declare class DepthFirstTreeTraversalBuilder<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> {
constructor(icfgInput: DepthFirstTreeTraversalBuilderOptions<InputVertexTypes, RewrittenVertexTypes>);
patchOptionsForFutureRunners(icfgInput: DepthFirstTreeTraversalBuilderOptionsPatch<InputVertexTypes, RewrittenVertexTypes>): this;
registerVisitorCallbackForPhase<Phase extends DepthFirstTreeVisitPhase>(phase: Phase, visitor: TreeVertexPhaseVisitorCallback<InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>>, options?: Partial<VisitorRegistrationOptions>): this;
appendVisitorGroupForPhase<Phase extends DepthFirstTreeVisitPhase>(phase: Phase, group: VisitorGroupDefinition<TreeVertexPhaseVisitorCallback<InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>>>): this;
getDetachedVisitorRegistrationRecordsForPhase<Phase extends DepthFirstTreeVisitPhase>(phase: Phase): DepthFirstTreeVisitorRegistrationsByPhase<InputVertexTypes, RewrittenVertexTypes>[Phase];
replaceVisitorDefinitionsForPhase<Phase extends DepthFirstTreeVisitPhase>(phase: Phase, input: VisitorDefinitionsForPhase<TreeVertexPhaseVisitorCallback<InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase<Phase>>>): this;
createIndependentRunnerFromCurrentOptions(): DepthFirstTreeRunner<InputVertexTypes, RewrittenVertexTypes>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `appendVisitorGroupForPhase` | <code>&lt;Phase extends DepthFirstTreeVisitPhase&gt;(phase: Phase, group: VisitorGroupDefinition&lt;TreeVertexPhaseVisitorCallback&lt;InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;&gt;&gt;) =&gt; DepthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `createIndependentRunnerFromCurrentOptions` | <code>() =&gt; DepthFirstTreeRunner&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `getDetachedVisitorRegistrationRecordsForPhase` | <code>&lt;Phase extends DepthFirstTreeVisitPhase&gt;(phase: Phase) =&gt; DepthFirstTreeVisitorRegistrationsByPhase&lt;InputVertexTypes, RewrittenVertexTypes&gt;[Phase]</code> |
| `patchOptionsForFutureRunners` | <code>(icfgInput: DepthFirstTreeTraversalBuilderOptionsPatch&lt;InputVertexTypes, RewrittenVertexTypes&gt;) =&gt; DepthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `registerVisitorCallbackForPhase` | <code>&lt;Phase extends DepthFirstTreeVisitPhase&gt;(phase: Phase, visitor: TreeVertexPhaseVisitorCallback&lt;InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;&gt;, options?: Partial&lt;VisitorRegistrationOptions&gt; &#124; undefined) =&gt; DepthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `replaceVisitorDefinitionsForPhase` | <code>&lt;Phase extends DepthFirstTreeVisitPhase&gt;(phase: Phase, input: VisitorDefinitionsForPhase&lt;TreeVertexPhaseVisitorCallback&lt;InputVertexTypes, RewrittenVertexTypes, PreventVisitorReturnFromWideningPhase&lt;Phase&gt;&gt;&gt;) =&gt; DepthFirstTreeTraversalBuilder&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |

</details>

<a id="symbol-DepthFirstTreeTraversalBuilderOptions"></a>

### DepthFirstTreeTraversalBuilderOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export type DepthFirstTreeTraversalBuilderOptions<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> = DepthFirstTreeTraversalBuilderOptionsPatch<InputVertexTypes, RewrittenVertexTypes> & {
    treeDiscoverySource: TreeDiscoverySource<InputVertexTypes, RewrittenVertexTypes>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `childBoundaryVisits` | <code>DepthFirstChildBoundaryVisitOptionsPatch &#124; undefined</code> |
| `retainDiscoveredTreeBeforeVisitorCommands` | <code>boolean &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>ChildHintsListTransformer&lt;InputVertexTypes&gt; &#124; null &#124; undefined</code> |
| `treeDiscoverySource` | <code>TreeDiscoverySource&lt;InputVertexTypes, RewrittenVertexTypes&gt;</code> |
| `visitors` | <code>VisitorDefinitionsByPhase&lt;DepthFirstTreeVisitorRegistrationsByPhase&lt;InputVertexTypes, RewrittenVertexTypes&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-DepthFirstTreeTraversalBuilderOptionsPatch"></a>

### DepthFirstTreeTraversalBuilderOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export type DepthFirstTreeTraversalBuilderOptionsPatch<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> = {
    treeDiscoverySource?: TreeDiscoverySource<InputVertexTypes, RewrittenVertexTypes> | undefined;
    transformChildHintsBeforeResolution?: ChildHintsListTransformer<InputVertexTypes> | null | undefined;
    visitors?: VisitorDefinitionsByPhase<DepthFirstTreeVisitorRegistrationsByPhase<InputVertexTypes, RewrittenVertexTypes>> | undefined;
    retainDiscoveredTreeBeforeVisitorCommands?: boolean | undefined;
    childBoundaryVisits?: DepthFirstChildBoundaryVisitOptionsPatch | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `childBoundaryVisits` | <code>DepthFirstChildBoundaryVisitOptionsPatch &#124; undefined</code> |
| `retainDiscoveredTreeBeforeVisitorCommands` | <code>boolean &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>ChildHintsListTransformer&lt;InputVertexTypes&gt; &#124; null &#124; undefined</code> |
| `treeDiscoverySource` | <code>TreeDiscoverySource&lt;InputVertexTypes, RewrittenVertexTypes&gt; &#124; undefined</code> |
| `visitors` | <code>VisitorDefinitionsByPhase&lt;DepthFirstTreeVisitorRegistrationsByPhase&lt;InputVertexTypes, RewrittenVertexTypes&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-DepthFirstTreeVisitPhase"></a>

### DepthFirstTreeVisitPhase

Runtime value and public type surface. [Owning contract](reference.md#traversal-orders) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export declare enum DepthFirstTreeVisitPhase {
BEFORE_CHILD_EXPANSION = "BEFORE_CHILD_EXPANSION"
AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES = "AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES"
AFTER_CHILD_SUBTREES = "AFTER_CHILD_SUBTREES"
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `AFTER_CHILD_SUBTREES` | <code>DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES</code> |
| `AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES` | <code>DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES</code> |
| `BEFORE_CHILD_EXPANSION` | <code>DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION</code> |

</details>

<a id="symbol-FoundDagSourceVertex"></a>

### FoundDagSourceVertex

Type-only; no runtime constructor/value. [Owning contract](reference.md#discovery-and-completed-work) · [Executable snippet](reference.md#graph-source-result-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type FoundDagSourceVertex<InputVertexTypes extends VertexDataAndChildHintTypes, VertexId = unknown> = {
    kind: 'vertexResolved';
    resolvedVertexInput: GraphDependencies<VertexId> & RequiredGraphVertexIdentity<VertexId> & {
        vertexContentInput: VertexContentInput<InputVertexTypes>;
        vertexId?: VertexId;
    };
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"vertexResolved"</code> |
| `resolvedVertexInput` | <code>GraphDependencies&lt;VertexId&gt; &amp; RequiredGraphVertexIdentity&lt;VertexId&gt; &amp; { vertexContentInput: VertexContentInput&lt;InputVertexTypes&gt;; vertexId?: VertexId &#124; undefined; }</code> |

</details>

<a id="symbol-GraphWalkBuilder"></a>

### GraphWalkBuilder

Runtime value and public type surface. [Owning contract](reference.md#general-graph-walking) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare class GraphWalkBuilder<VertexData, EdgeData, VertexId> {
constructor(options: GraphWalkBuilderOptions<VertexData, EdgeData, VertexId>);
patchOptionsForFutureRunners(patch: GraphWalkBuilderOptionsPatch<VertexData, EdgeData, VertexId>): this;
addVisitorForObservationKind<ObservationKind extends GraphWalkObservationKind>(observationKind: ObservationKind, visitor: GraphWalkVisitor<VertexData, EdgeData, PreventVisitorReturnFromWideningPhase<ObservationKind>, VertexId>, options?: Partial<VisitorRegistrationOptions>): this;
addVisitorGroupForObservationKind<ObservationKind extends GraphWalkObservationKind>(observationKind: ObservationKind, group: VisitorGroupDefinition<GraphWalkVisitor<VertexData, EdgeData, PreventVisitorReturnFromWideningPhase<ObservationKind>, VertexId>>): this;
replaceVisitorsForObservationKind<ObservationKind extends GraphWalkObservationKind>(observationKind: ObservationKind, input: VisitorDefinitionsForPhase<GraphWalkVisitor<VertexData, EdgeData, PreventVisitorReturnFromWideningPhase<ObservationKind>, VertexId>>): this;
listVisitorRegistrationsForObservationKind<ObservationKind extends GraphWalkObservationKind>(observationKind: ObservationKind): VisitorRecord<GraphWalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>>[];
createIndependentRunnerFromCurrentOptions(): GraphWalkRunner<VertexData, EdgeData, VertexId>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `addVisitorForObservationKind` | <code>&lt;ObservationKind extends GraphWalkObservationKind&gt;(observationKind: ObservationKind, visitor: GraphWalkVisitor&lt;VertexData, EdgeData, PreventVisitorReturnFromWideningPhase&lt;ObservationKind&gt;, VertexId&gt;, options?: Partial&lt;VisitorRegistrationOptions&gt; &#124; undefined) =&gt; GraphWalkBuilder&lt;VertexData, EdgeData, VertexId&gt;</code> |
| `addVisitorGroupForObservationKind` | <code>&lt;ObservationKind extends GraphWalkObservationKind&gt;(observationKind: ObservationKind, group: VisitorGroupDefinition&lt;GraphWalkVisitor&lt;VertexData, EdgeData, PreventVisitorReturnFromWideningPhase&lt;ObservationKind&gt;, VertexId&gt;&gt;) =&gt; GraphWalkBuilder&lt;VertexData, EdgeData, VertexId&gt;</code> |
| `createIndependentRunnerFromCurrentOptions` | <code>() =&gt; GraphWalkRunner&lt;VertexData, EdgeData, VertexId&gt;</code> |
| `listVisitorRegistrationsForObservationKind` | <code>&lt;ObservationKind extends GraphWalkObservationKind&gt;(observationKind: ObservationKind) =&gt; VisitorRecord&lt;GraphWalkVisitor&lt;VertexData, EdgeData, ObservationKind, VertexId&gt;&gt;[]</code> |
| `patchOptionsForFutureRunners` | <code>(patch: GraphWalkBuilderOptionsPatch&lt;VertexData, EdgeData, VertexId&gt;) =&gt; GraphWalkBuilder&lt;VertexData, EdgeData, VertexId&gt;</code> |
| `replaceVisitorsForObservationKind` | <code>&lt;ObservationKind extends GraphWalkObservationKind&gt;(observationKind: ObservationKind, input: VisitorDefinitionsForPhase&lt;GraphWalkVisitor&lt;VertexData, EdgeData, PreventVisitorReturnFromWideningPhase&lt;ObservationKind&gt;, VertexId&gt;&gt;) =&gt; GraphWalkBuilder&lt;VertexData, EdgeData, VertexId&gt;</code> |

</details>

<a id="symbol-GraphWalkBuilderOptions"></a>

### GraphWalkBuilderOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkBuilderOptions<VertexData, EdgeData, VertexId> = GraphWalkCommonBuilderOptions<VertexData, EdgeData, VertexId> & GraphWalkRouteEnumerationAndRequiredBounds;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `admittedVisitorCallbackPhases` | <code>VisitorCallbackPhaseSelection&lt;GraphWalkObservationKind&gt; &#124; { include: undefined; exclude?: undefined; } &#124; { exclude: undefined; include?: undefined; } &#124; undefined</code> |
| `deliveredEventKinds` | <code>readonly ("vertexOccurrence" &#124; "admittedEdgeOccurrence" &#124; "routePrefix")[] &#124; undefined</code> |
| `expansionOrder` | <code>GraphWalkExpansionOrder &#124; undefined</code> |
| `graphWalkDiscoverySource` | <code>GraphWalkDiscoverySource&lt;VertexData, EdgeData, VertexId&gt;</code> |
| `limits` | <code>GraphWalkExplorationLimits &#124; (GraphWalkExplorationLimits &amp; ({ maxRouteHopDepth: number; } &#124; { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: number; })) &#124; undefined</code> |
| `routeEnumerationPolicy` | <code>"firstAdmittedFoundRoutePerVertex" &#124; "allVertexSimpleRoutePrefixes" &#124; "allRoutePrefixesAllowingRepeatedVertices" &#124; undefined</code> |
| `shouldAdmitOutgoingLinkTarget` | <code>GraphWalkLinkTargetAdmissionPredicate&lt;VertexData, EdgeData, VertexId&gt; &#124; null &#124; undefined</code> |
| `shouldExpandVertexOccurrence` | <code>GraphWalkVertexOccurrenceExpansionPredicate&lt;VertexData, EdgeData, VertexId&gt; &#124; null &#124; undefined</code> |
| `visitorsByObservationKind` | <code>{ vertexOccurrence?: VisitorDefinitionsForPhase&lt;GraphWalkVisitor&lt;VertexData, EdgeData, GraphWalkObservationKind.VERTEX_OCCURRENCE, VertexId&gt;&gt; &#124; undefined; admittedEdgeOccurrence?: VisitorDefinitionsForPhase&lt;GraphWalkVisitor&lt;VertexData, EdgeData, GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE, VertexId&gt;&gt; &#124; undefined; routePrefix?: VisitorDefinitionsForPhase&lt;GraphWalkVisitor&lt;VertexData, EdgeData, GraphWalkObservationKind.ROUTE_PREFIX, VertexId&gt;&gt; &#124; undefined; } &#124; undefined</code> |

</details>

<a id="symbol-GraphWalkBuilderOptionsPatch"></a>

### GraphWalkBuilderOptionsPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkBuilderOptionsPatch<VertexData, EdgeData, VertexId> = OptionalFieldsAllowingUndefined<GraphWalkCommonBuilderOptions<VertexData, EdgeData, VertexId>> & {
    routeEnumerationPolicy?: GraphWalkRouteEnumerationPolicy | undefined;
    replaceLimits?: GraphWalkExplorationLimits | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `admittedVisitorCallbackPhases` | <code>VisitorCallbackPhaseSelection&lt;GraphWalkObservationKind&gt; &#124; { include: undefined; exclude?: undefined; } &#124; { exclude: undefined; include?: undefined; } &#124; undefined</code> |
| `deliveredEventKinds` | <code>readonly ("vertexOccurrence" &#124; "admittedEdgeOccurrence" &#124; "routePrefix")[] &#124; undefined</code> |
| `expansionOrder` | <code>GraphWalkExpansionOrder &#124; undefined</code> |
| `graphWalkDiscoverySource` | <code>GraphWalkDiscoverySource&lt;VertexData, EdgeData, VertexId&gt; &#124; undefined</code> |
| `replaceLimits` | <code>GraphWalkExplorationLimits &#124; undefined</code> |
| `routeEnumerationPolicy` | <code>GraphWalkRouteEnumerationPolicy &#124; undefined</code> |
| `shouldAdmitOutgoingLinkTarget` | <code>GraphWalkLinkTargetAdmissionPredicate&lt;VertexData, EdgeData, VertexId&gt; &#124; null &#124; undefined</code> |
| `shouldExpandVertexOccurrence` | <code>GraphWalkVertexOccurrenceExpansionPredicate&lt;VertexData, EdgeData, VertexId&gt; &#124; null &#124; undefined</code> |
| `visitorsByObservationKind` | <code>{ vertexOccurrence?: VisitorDefinitionsForPhase&lt;GraphWalkVisitor&lt;VertexData, EdgeData, GraphWalkObservationKind.VERTEX_OCCURRENCE, VertexId&gt;&gt; &#124; undefined; admittedEdgeOccurrence?: VisitorDefinitionsForPhase&lt;GraphWalkVisitor&lt;VertexData, EdgeData, GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE, VertexId&gt;&gt; &#124; undefined; routePrefix?: VisitorDefinitionsForPhase&lt;GraphWalkVisitor&lt;VertexData, EdgeData, GraphWalkObservationKind.ROUTE_PREFIX, VertexId&gt;&gt; &#124; undefined; } &#124; undefined</code> |

</details>

<a id="symbol-GraphWalkCatalogOutgoingLinkToVertexId"></a>

### GraphWalkCatalogOutgoingLinkToVertexId

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkCatalogOutgoingLinkToVertexId<EdgeData, VertexId> = Readonly<{
    toVertexId: VertexId;
    edgeData: EdgeData;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `edgeData` | <code>EdgeData</code> |
| `toVertexId` | <code>VertexId</code> |

</details>

<a id="symbol-GraphWalkDagDeclarationRelation"></a>

### GraphWalkDagDeclarationRelation

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkDagDeclarationRelation = {
    kind: 'structuralChildSlot';
    childSlotIndex: number;
} | {
    kind: 'workPrerequisite';
} | {
    kind: 'subgraphCompletionPrerequisite';
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"structuralChildSlot" &#124; "workPrerequisite" &#124; "subgraphCompletionPrerequisite"</code> |

</details>

<a id="symbol-GraphWalkDiscoverySource"></a>

### GraphWalkDiscoverySource

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkDiscoverySource<VertexData, EdgeData, VertexId> = ({
    vertexResolutionMode: 'resolverWithOptionalInlineResolution';
    resolveVertexDataById(vertexId: VertexId): GraphWalkVertexResolutionResult<VertexData>;
} & GraphWalkTargetEnumerationProtocol<VertexData, EdgeData, VertexId, GraphWalkResolverOrInlineTarget<VertexData, VertexId>>) | ({
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex';
    resolveVertexDataById?: undefined;
} & GraphWalkTargetEnumerationProtocol<VertexData, EdgeData, VertexId, GraphWalkInlineOrPreviouslyAdmittedTarget<VertexData, VertexId>>);
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `enumerateOutgoingLinks` | <code>((vertex: Readonly&lt;{ vertexId: VertexId; vertexData: VertexData; }&gt;) =&gt; Iterable&lt;Readonly&lt;{ targetToResolveOnAdmission: Readonly&lt;{ vertexId: VertexId; resolutionIfNotPreviouslyAdmitted?: GraphWalkVertexResolutionResult&lt;VertexData&gt; &#124; undefined; }&gt;; edgeData: EdgeData; }&gt;&gt;) &#124; ((vertex: Readonly&lt;{ vertexId: VertexId; vertexData: VertexData; }&gt;) =&gt; Iterable&lt;Readonly&lt;{ targetToResolveOnAdmission: GraphWalkInlineOrPreviouslyAdmittedTarget&lt;VertexData, VertexId&gt;; edgeData: EdgeData; }&gt;&gt;)</code> |
| `enumerateRootTargets` | <code>(() =&gt; Iterable&lt;Readonly&lt;{ vertexId: VertexId; resolutionIfNotPreviouslyAdmitted?: GraphWalkVertexResolutionResult&lt;VertexData&gt; &#124; undefined; }&gt;&gt;) &#124; (() =&gt; Iterable&lt;GraphWalkInlineOrPreviouslyAdmittedTarget&lt;VertexData, VertexId&gt;&gt;)</code> |
| `resolveVertexDataById` | <code>((vertexId: VertexId) =&gt; GraphWalkVertexResolutionResult&lt;VertexData&gt;) &#124; undefined</code> |
| `vertexResolutionMode` | <code>"resolverWithOptionalInlineResolution" &#124; "inlineResolutionOrPreviouslyAdmittedVertex"</code> |

</details>

<a id="symbol-GraphWalkEdge"></a>

### GraphWalkEdge

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkEdge<EdgeData, VertexId> = Readonly<{
    fromVertexId: VertexId;
    /** Zero-based source adjacency position before filtering; stable on cached replay. */
    sourceOutgoingLinkIndexBeforeFiltering: number;
    toVertexId: VertexId;
    edgeData: EdgeData;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `edgeData` | <code>EdgeData</code> |
| `fromVertexId` | <code>VertexId</code> |
| `sourceOutgoingLinkIndexBeforeFiltering` | <code>number</code> |
| `toVertexId` | <code>VertexId</code> |

</details>

<a id="symbol-GraphWalkEvent"></a>

### GraphWalkEvent

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkEvent<VertexData, EdgeData, VertexId> = Readonly<{
    eventKind: 'vertexOccurrence';
    vertex: GraphWalkResolvedVertex<VertexData, VertexId>;
    vertexHopDepth: number;
    incomingEdgeFromParentRouteOccurrence: GraphWalkEdge<EdgeData, VertexId> | null;
}> | Readonly<{
    eventKind: 'admittedEdgeOccurrence';
    edge: GraphWalkEdge<EdgeData, VertexId>;
    fromVertex: GraphWalkResolvedVertex<VertexData, VertexId>;
    targetHopDepth: number;
    targetResolution: Readonly<{
        kind: 'found';
        vertex: GraphWalkResolvedVertex<VertexData, VertexId>;
    }> | Readonly<{
        kind: 'omitted';
    }>;
}> | Readonly<{
    eventKind: 'routePrefix';
    verticesInRootToTargetOrder: readonly GraphWalkResolvedVertex<VertexData, VertexId>[];
    edgesInRootToTargetOrder: readonly GraphWalkEdge<EdgeData, VertexId>[];
    routeHopLength: number;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `eventKind` | <code>"vertexOccurrence" &#124; "admittedEdgeOccurrence" &#124; "routePrefix"</code> |

</details>

<a id="symbol-GraphWalkEventForObservationKind"></a>

### GraphWalkEventForObservationKind

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkEventForObservationKind<VertexData, EdgeData, ObservationKind extends `${GraphWalkObservationKind}`, VertexId> = Extract<GraphWalkEvent<VertexData, EdgeData, VertexId>, {
    eventKind: `${ObservationKind}`;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `eventKind` | <code>(`${ObservationKind}` &amp; "vertexOccurrence") &#124; (`${ObservationKind}` &amp; "admittedEdgeOccurrence") &#124; (`${ObservationKind}` &amp; "routePrefix")</code> |

</details>

<a id="symbol-GraphWalkExpansionOrder"></a>

### GraphWalkExpansionOrder

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkExpansionOrder = 'breadthFirst' | 'depthFirst';
```

<a id="symbol-GraphWalkExplorationLimits"></a>

### GraphWalkExplorationLimits

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkExplorationLimits = {
    /** Maximum route depth; gates expansion after the expansion predicate. */
    maxRouteHopDepth?: number;
    /** Distinct roots and eligible followed links, including returning/omitted targets. */
    maxAdmittedRootOrLinkTargetOccurrences?: number;
    /** Root/link read attempts, including exhaustion, filtering, and cached replay. */
    maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay?: number;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `maxAdmittedRootOrLinkTargetOccurrences` | <code>number &#124; undefined</code> |
| `maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay` | <code>number &#124; undefined</code> |
| `maxRouteHopDepth` | <code>number &#124; undefined</code> |

</details>

<a id="symbol-GraphWalkInspection"></a>

### GraphWalkInspection

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export interface GraphWalkInspection extends TraversalExecutionSnapshot {
readonly traversalAlgorithm: 'graph-walk';
readonly sourceMode: 'graph';
readonly concurrency: 1;
readonly expansionOrder: GraphWalkExpansionOrder;
readonly routeEnumerationPolicy: GraphWalkRouteEnumerationPolicy;
readonly executionOptions: TraversalExecutionSelections<GraphWalkObservationKind>;
readonly counts: GraphWalkProgressCounts;
readonly pendingRouteExpansionFrameCount: number;
readonly openSourceIteratorCount: number;
readonly pendingObservationKinds: readonly GraphWalkObservationKind[];
readonly visitorChainPosition: Readonly<{
        observationKind: GraphWalkObservationKind;
        visitorIndexInObservationChain: number;
    }> | null;
readonly pendingInvocationRequests: readonly Readonly<{
        runnerLocalInvocationRequestId: number;
        operation: GraphWalkPendingInvocationOperation;
        /** Stable runner-local identity; never a caller vertex ID. */
        runnerLocalVertexIdentityToken?: symbol | undefined;
    }>[];
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `bufferedDeliveryEventCount` | <code>number</code> |
| `callbackExecutionMode` | <code>"sync" &#124; "async"</code> |
| `concurrency` | <code>1</code> |
| `counts` | <code>Readonly&lt;{ rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: number; admittedRootOrLinkTargetOccurrences: number; resolvedFoundVertexIdCount: number; resolvedOmittedVertexIdCount: number; freshSourceOutgoingLinkCount: number; acknowledgedObservationCountsByKind: Readonly&lt;Record&lt;GraphWalkObservationKind, number&gt;&gt;; }&gt;</code> |
| `executionOptions` | <code>Readonly&lt;{ deliveredEventKinds: readonly ("vertexOccurrence" &#124; "admittedEdgeOccurrence" &#124; "routePrefix")[]; admittedVisitorCallbackPhases: VisitorCallbackPhaseSelection&lt;GraphWalkObservationKind&gt;; }&gt;</code> |
| `expansionOrder` | <code>GraphWalkExpansionOrder</code> |
| `inFlightInvocationCount` | <code>number</code> |
| `openSourceIteratorCount` | <code>number</code> |
| `pauseRequested` | <code>boolean</code> |
| `pendingInvocationRequests` | <code>readonly Readonly&lt;{ runnerLocalInvocationRequestId: number; operation: GraphWalkPendingInvocationOperation; runnerLocalVertexIdentityToken?: symbol &#124; undefined; }&gt;[]</code> |
| `pendingObservationKinds` | <code>readonly GraphWalkObservationKind[]</code> |
| `pendingRouteExpansionFrameCount` | <code>number</code> |
| `routeEnumerationPolicy` | <code>GraphWalkRouteEnumerationPolicy</code> |
| `sourceMode` | <code>"graph"</code> |
| `traversalAlgorithm` | <code>"graph-walk"</code> |
| `traversalLifecycleStatus` | <code>TraversalRunnerStatus</code> |
| `traversalStopReason` | <code>TraversalStopReason &#124; null</code> |
| `visitorChainPosition` | <code>Readonly&lt;{ observationKind: GraphWalkObservationKind; visitorIndexInObservationChain: number; }&gt; &#124; null</code> |

</details>

<a id="symbol-GraphWalkLinkTargetAdmissionContext"></a>

### GraphWalkLinkTargetAdmissionContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkLinkTargetAdmissionContext<VertexData, EdgeData, VertexId> = GraphWalkRouteEnumerationContext<VertexData, EdgeData, VertexId> & Readonly<{
    fromVertex: GraphWalkResolvedVertex<VertexData, VertexId>;
    targetHopDepth: number;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `fromVertex` | <code>Readonly&lt;{ vertexId: VertexId; vertexData: VertexData; }&gt;</code> |
| `routeEnumerationPolicy` | <code>"firstAdmittedFoundRoutePerVertex" &#124; "allVertexSimpleRoutePrefixes" &#124; "allRoutePrefixesAllowingRepeatedVertices"</code> |
| `targetHopDepth` | <code>number</code> |

</details>

<a id="symbol-GraphWalkLinkTargetAdmissionPredicate"></a>

### GraphWalkLinkTargetAdmissionPredicate

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkLinkTargetAdmissionPredicate<VertexData, EdgeData, VertexId> = (edge: GraphWalkEdge<EdgeData, VertexId>, context: GraphWalkLinkTargetAdmissionContext<VertexData, EdgeData, VertexId>) => boolean;
```

<a id="symbol-GraphWalkObservationKind"></a>

### GraphWalkObservationKind

Runtime value and public type surface. [Owning contract](reference.md#general-graph-walking) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare enum GraphWalkObservationKind {
VERTEX_OCCURRENCE = "vertexOccurrence"
ADMITTED_EDGE_OCCURRENCE = "admittedEdgeOccurrence"
ROUTE_PREFIX = "routePrefix"
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `ADMITTED_EDGE_OCCURRENCE` | <code>GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE</code> |
| `ROUTE_PREFIX` | <code>GraphWalkObservationKind.ROUTE_PREFIX</code> |
| `VERTEX_OCCURRENCE` | <code>GraphWalkObservationKind.VERTEX_OCCURRENCE</code> |

</details>

<a id="symbol-GraphWalkOutgoingLink"></a>

### GraphWalkOutgoingLink

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkOutgoingLink<VertexData, EdgeData, VertexId, VertexResolutionMode extends GraphWalkVertexResolutionMode = GraphWalkVertexResolutionMode> = GraphWalkOutgoingTargetLink<EdgeData, GraphWalkVertexResolutionTarget<VertexData, VertexId, VertexResolutionMode>>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `edgeData` | <code>EdgeData</code> |
| `targetToResolveOnAdmission` | <code>GraphWalkVertexResolutionTarget&lt;VertexData, VertexId, VertexResolutionMode&gt;</code> |

</details>

<a id="symbol-GraphWalkPendingInvocationOperation"></a>

### GraphWalkPendingInvocationOperation

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkPendingInvocationOperation = 'enumerateRootTargets' | 'readNextRootTarget' | 'resolveVertexDataById' | 'enumerateOutgoingLinks' | 'readNextOutgoingLinkOrCachedReplay' | 'shouldAdmitOutgoingLinkTarget' | 'shouldExpandVertexOccurrence' | 'invokeVisitorCallback' | 'returnSourceIteratorForDisposal';
```

<a id="symbol-GraphWalkProgressCounts"></a>

### GraphWalkProgressCounts

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkProgressCounts = Readonly<{
    /** Attempted root/link reads, including done results and cached route replay. */
    rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: number;
    /** Distinct roots and eligible followed links, including omissions and returns. */
    admittedRootOrLinkTargetOccurrences: number;
    resolvedFoundVertexIdCount: number;
    resolvedOmittedVertexIdCount: number;
    /** Fresh source links read before filtering; cached replay is not recounted. */
    freshSourceOutgoingLinkCount: number;
    /** Per-kind acknowledged observations, independent of callback/delivery filters. */
    acknowledgedObservationCountsByKind: Readonly<Record<GraphWalkObservationKind, number>>;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `acknowledgedObservationCountsByKind` | <code>Readonly&lt;Record&lt;GraphWalkObservationKind, number&gt;&gt;</code> |
| `admittedRootOrLinkTargetOccurrences` | <code>number</code> |
| `freshSourceOutgoingLinkCount` | <code>number</code> |
| `resolvedFoundVertexIdCount` | <code>number</code> |
| `resolvedOmittedVertexIdCount` | <code>number</code> |
| `rootOrLinkReadAttemptsIncludingDoneAndCacheReplay` | <code>number</code> |

</details>

<a id="symbol-GraphWalkProgressSnapshot"></a>

### GraphWalkProgressSnapshot

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkProgressSnapshot = Readonly<{
    status: TraversalRunnerStatus;
    counts: GraphWalkProgressCounts;
    terminalOutcome: GraphWalkTerminalOutcome | null;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `counts` | <code>Readonly&lt;{ rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: number; admittedRootOrLinkTargetOccurrences: number; resolvedFoundVertexIdCount: number; resolvedOmittedVertexIdCount: number; freshSourceOutgoingLinkCount: number; acknowledgedObservationCountsByKind: Readonly&lt;Record&lt;GraphWalkObservationKind, number&gt;&gt;; }&gt;</code> |
| `status` | <code>TraversalRunnerStatus</code> |
| `terminalOutcome` | <code>GraphWalkTerminalOutcome &#124; null</code> |

</details>

<a id="symbol-GraphWalkRecordMaterializationOptions"></a>

### GraphWalkRecordMaterializationOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export interface GraphWalkRecordMaterializationOptions<VertexData, EdgeData, VertexId> {
getVertexId(vertexRecord: VertexData): VertexId;
enumerateOutgoingLinks(vertexRecord: VertexData): Iterable<GraphWalkCatalogOutgoingLinkToVertexId<EdgeData, VertexId>>;
rootVertexIds: Iterable<VertexId>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `enumerateOutgoingLinks` | <code>(vertexRecord: VertexData) =&gt; Iterable&lt;Readonly&lt;{ toVertexId: VertexId; edgeData: EdgeData; }&gt;&gt;</code> |
| `getVertexId` | <code>(vertexRecord: VertexData) =&gt; VertexId</code> |
| `rootVertexIds` | <code>Iterable&lt;VertexId&gt;</code> |

</details>

<a id="symbol-GraphWalkResolvedVertex"></a>

### GraphWalkResolvedVertex

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkResolvedVertex<VertexData, VertexId> = Readonly<{
    vertexId: VertexId;
    vertexData: VertexData;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `vertexData` | <code>VertexData</code> |
| `vertexId` | <code>VertexId</code> |

</details>

<a id="symbol-GraphWalkRouteEnumerationAndRequiredBounds"></a>

### GraphWalkRouteEnumerationAndRequiredBounds

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkRouteEnumerationAndRequiredBounds = {
    routeEnumerationPolicy?: 'firstAdmittedFoundRoutePerVertex';
    limits?: GraphWalkExplorationLimits;
} | {
    routeEnumerationPolicy: 'allVertexSimpleRoutePrefixes' | 'allRoutePrefixesAllowingRepeatedVertices';
    limits: GraphWalkExplorationLimits & ({
        maxRouteHopDepth: number;
    } | {
        maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: number;
    });
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `limits` | <code>GraphWalkExplorationLimits &#124; (GraphWalkExplorationLimits &amp; ({ maxRouteHopDepth: number; } &#124; { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: number; })) &#124; undefined</code> |
| `routeEnumerationPolicy` | <code>"firstAdmittedFoundRoutePerVertex" &#124; "allVertexSimpleRoutePrefixes" &#124; "allRoutePrefixesAllowingRepeatedVertices" &#124; undefined</code> |

</details>

<a id="symbol-GraphWalkRouteEnumerationContext"></a>

### GraphWalkRouteEnumerationContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkRouteEnumerationContext<VertexData, EdgeData, VertexId> = Readonly<{
    routeEnumerationPolicy: 'firstAdmittedFoundRoutePerVertex';
}> | Readonly<{
    routeEnumerationPolicy: 'allVertexSimpleRoutePrefixes' | 'allRoutePrefixesAllowingRepeatedVertices';
    routePrefix: GraphWalkRoutePrefixEvent<VertexData, EdgeData, VertexId>;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `routeEnumerationPolicy` | <code>"firstAdmittedFoundRoutePerVertex" &#124; "allVertexSimpleRoutePrefixes" &#124; "allRoutePrefixesAllowingRepeatedVertices"</code> |

</details>

<a id="symbol-GraphWalkRouteEnumerationPolicy"></a>

### GraphWalkRouteEnumerationPolicy

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkRouteEnumerationPolicy = 'firstAdmittedFoundRoutePerVertex' | 'allVertexSimpleRoutePrefixes' | 'allRoutePrefixesAllowingRepeatedVertices';
```

<a id="symbol-GraphWalkRoutePrefixEvent"></a>

### GraphWalkRoutePrefixEvent

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkRoutePrefixEvent<VertexData, EdgeData, VertexId> = GraphWalkEventForObservationKind<VertexData, EdgeData, GraphWalkObservationKind.ROUTE_PREFIX, VertexId>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `edgesInRootToTargetOrder` | <code>readonly Readonly&lt;{ fromVertexId: VertexId; sourceOutgoingLinkIndexBeforeFiltering: number; toVertexId: VertexId; edgeData: EdgeData; }&gt;[]</code> |
| `eventKind` | <code>"routePrefix"</code> |
| `routeHopLength` | <code>number</code> |
| `verticesInRootToTargetOrder` | <code>readonly Readonly&lt;{ vertexId: VertexId; vertexData: VertexData; }&gt;[]</code> |

</details>

<a id="symbol-GraphWalkRunner"></a>

### GraphWalkRunner

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export interface GraphWalkRunner<VertexData, EdgeData, VertexId> extends SyncTraversalExecution<GraphWalkObservationKind, GraphWalkEvent<VertexData, EdgeData, VertexId>, GraphWalkInspection, `${GraphWalkObservationKind}`> {
runAndIterateObservationEventsUntilSuspendedOrTerminal: {
        (): Generator<GraphWalkEvent<VertexData, EdgeData, VertexId>, void, unknown>;
        <ObservationKind extends `${GraphWalkObservationKind}`>(executionOptionsPatch: TraversalExecutionSelectionPatch<GraphWalkObservationKind, ObservationKind> & {
            deliveredEventKinds: readonly ObservationKind[];
        }): Generator<GraphWalkEventForObservationKind<VertexData, EdgeData, ObservationKind, VertexId>, void, unknown>;
        (executionOptionsPatch?: TraversalExecutionSelectionPatch<GraphWalkObservationKind>): Generator<GraphWalkEvent<VertexData, EdgeData, VertexId>, void, unknown>;
    };
runUntilSuspendedOrTerminal: (executionOptionsPatch?: TraversalExecutionSelectionPatch<GraphWalkObservationKind>) => this;
closePermanentlyAndDisposeSourceIterators(): void;
captureProgressSnapshot(): GraphWalkProgressSnapshot;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `captureExecutionSnapshot` | <code>() =&gt; GraphWalkInspection</code> |
| `captureProgressSnapshot` | <code>() =&gt; Readonly&lt;{ status: TraversalRunnerStatus; counts: Readonly&lt;{ rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: number; admittedRootOrLinkTargetOccurrences: number; resolvedFoundVertexIdCount: number; resolvedOmittedVertexIdCount: number; freshSourceOutgoingLinkCount: number; acknowledgedObservationCountsByKind: Readonly&lt;Record&lt;GraphWalkObservationKind, number&gt;&gt;; }&gt;; terminalOutcome: GraphWalkTerminalOutcome &#124; null; }&gt;</code> |
| `closePermanentlyAndDisposeSourceIterators` | <code>() =&gt; void</code> |
| `getTraversalLifecycleStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getTraversalStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `isSuspended` | <code>() =&gt; boolean</code> |
| `requestPauseAfterAdmittedCallbacksDrain` | <code>() =&gt; boolean</code> |
| `runAndIterateObservationEventsUntilSuspendedOrTerminal` | <code>{ (): Generator&lt;GraphWalkEvent&lt;VertexData, EdgeData, VertexId&gt;, void, unknown&gt;; &lt;ObservationKind extends "vertexOccurrence" &#124; "admittedEdgeOccurrence" &#124; "routePrefix"&gt;(executionOptionsPatch: TraversalExecutionSelectionPatch&lt;GraphWalkObservationKind, ObservationKind&gt; &amp; { deliveredEventKinds: readonly ObservationKind[]; }): Generator&lt;GraphWalkEventForObservationKind&lt;VertexData, EdgeData, ObservationKind, VertexId&gt;, void, unknown&gt;; (executionOptionsPatch?: TraversalExecutionSelectionPatch&lt;GraphWalkObservationKind, "vertexOccurrence" &#124; "admittedEdgeOccurrence" &#124; "routePrefix"&gt; &#124; undefined): Generator&lt;GraphWalkEvent&lt;VertexData, EdgeData, VertexId&gt;, void, unknown&gt;; }</code> |
| `runUntilSuspendedOrTerminal` | <code>(executionOptionsPatch?: TraversalExecutionSelectionPatch&lt;GraphWalkObservationKind, "vertexOccurrence" &#124; "admittedEdgeOccurrence" &#124; "routePrefix"&gt; &#124; undefined) =&gt; GraphWalkRunner&lt;VertexData, EdgeData, VertexId&gt;</code> |

</details>

<a id="symbol-GraphWalkTerminalOutcome"></a>

### GraphWalkTerminalOutcome

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkTerminalOutcome = {
    readonly kind: 'sourceRoutesExhausted' | 'permanentlyClosedByCaller';
} | {
    readonly kind: 'traversalLimitsReached';
    readonly reachedLimits: readonly ('maxRouteHopDepth' | 'maxAdmittedRootOrLinkTargetOccurrences' | 'maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay')[];
} | {
    readonly kind: 'failed';
    readonly error: unknown;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"failed" &#124; "sourceRoutesExhausted" &#124; "permanentlyClosedByCaller" &#124; "traversalLimitsReached"</code> |

</details>

<a id="symbol-GraphWalkVertexOccurrenceExpansionContext"></a>

### GraphWalkVertexOccurrenceExpansionContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkVertexOccurrenceExpansionContext<VertexData, EdgeData, VertexId> = GraphWalkRouteEnumerationContext<VertexData, EdgeData, VertexId> & Readonly<{
    vertexHopDepth: number;
    incomingEdgeFromParentRouteOccurrence: GraphWalkEdge<EdgeData, VertexId> | null;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `incomingEdgeFromParentRouteOccurrence` | <code>Readonly&lt;{ fromVertexId: VertexId; sourceOutgoingLinkIndexBeforeFiltering: number; toVertexId: VertexId; edgeData: EdgeData; }&gt; &#124; null</code> |
| `routeEnumerationPolicy` | <code>"firstAdmittedFoundRoutePerVertex" &#124; "allVertexSimpleRoutePrefixes" &#124; "allRoutePrefixesAllowingRepeatedVertices"</code> |
| `vertexHopDepth` | <code>number</code> |

</details>

<a id="symbol-GraphWalkVertexOccurrenceExpansionPredicate"></a>

### GraphWalkVertexOccurrenceExpansionPredicate

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkVertexOccurrenceExpansionPredicate<VertexData, EdgeData, VertexId> = (vertex: GraphWalkResolvedVertex<VertexData, VertexId>, context: GraphWalkVertexOccurrenceExpansionContext<VertexData, EdgeData, VertexId>) => boolean;
```

<a id="symbol-GraphWalkVertexResolutionMode"></a>

### GraphWalkVertexResolutionMode

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkVertexResolutionMode = 'resolverWithOptionalInlineResolution' | 'inlineResolutionOrPreviouslyAdmittedVertex';
```

<a id="symbol-GraphWalkVertexResolutionResult"></a>

### GraphWalkVertexResolutionResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkVertexResolutionResult<VertexData> = {
    kind: 'found';
    vertexData: VertexData;
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

<a id="symbol-GraphWalkVertexResolutionTarget"></a>

### GraphWalkVertexResolutionTarget

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkVertexResolutionTarget<VertexData, VertexId, VertexResolutionMode extends GraphWalkVertexResolutionMode = GraphWalkVertexResolutionMode> = VertexResolutionMode extends 'resolverWithOptionalInlineResolution' ? GraphWalkResolverOrInlineTarget<VertexData, VertexId> : GraphWalkInlineOrPreviouslyAdmittedTarget<VertexData, VertexId>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `resolutionIfNotPreviouslyAdmitted` | <code>GraphWalkVertexResolutionResult&lt;VertexData&gt; &#124; undefined</code> |
| `vertexId` | <code>VertexId</code> |

</details>

<a id="symbol-GraphWalkVisitor"></a>

### GraphWalkVisitor

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkVisitor<VertexData, EdgeData, ObservationKind extends GraphWalkObservationKind, VertexId> = (event: GraphWalkEventForObservationKind<VertexData, EdgeData, ObservationKind, VertexId>, context: GraphWalkVisitorContext<ObservationKind>) => GraphWalkVisitorResult;
```

<a id="symbol-GraphWalkVisitorContext"></a>

### GraphWalkVisitorContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkVisitorContext<ObservationKind extends GraphWalkObservationKind> = Readonly<{
    observationKind: ObservationKind;
    admittedTargetOccurrenceIndex: number;
    observationIndexWithinKind: number;
    visitorIndexInObservationChain: number;
    visitorRegistrationMetadata: VisitorRegistrationMetadata;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `admittedTargetOccurrenceIndex` | <code>number</code> |
| `observationIndexWithinKind` | <code>number</code> |
| `observationKind` | <code>ObservationKind</code> |
| `visitorIndexInObservationChain` | <code>number</code> |
| `visitorRegistrationMetadata` | <code>Readonly&lt;VisitorRegistrationOptions &amp; { phaseRegistrationInsertionIndex: number; visitorGroup?: Readonly&lt;{ groupIdentity: symbol; isExplicitlyDeclaredGroup: boolean; visitorCommandCommitTiming: VisitorCommandCommitTiming; }&gt; &#124; undefined; }&gt;</code> |

</details>

<a id="symbol-GraphWalkVisitorResult"></a>

### GraphWalkVisitorResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export type GraphWalkVisitorResult = void | {
    commands?: readonly TraversalVisitorCommand<VertexDataAndChildHintTypes, TraversalVisitorCommandName.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY | TraversalVisitorCommandName.NO_OPERATION>[];
};
```

<a id="symbol-LiveObjectPropertyVertexTypes"></a>

### LiveObjectPropertyVertexTypes

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Executable snippet](reference.md#rewrite-objects)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type LiveObjectPropertyVertexTypes<InputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>, OutputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>> = VertexDataAndChildHintTypes<InputTypes['VertexData'] | OutputTypes['VertexData'] | (PropertyMetadata<InputTypes['VertexData'] | OutputTypes['VertexData']> & ObjectPropertyRecord<InputTypes['VertexData']['propertyKey'] | OutputTypes['VertexData']['propertyKey'], unknown>), InputTypes['ChildHint'] | OutputTypes['ChildHint']>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `ChildHint` | <code>InputTypes["ChildHint"] &#124; OutputTypes["ChildHint"]</code> |
| `VertexData` | <code>InputTypes["VertexData"] &#124; OutputTypes["VertexData"] &#124; ((PropertyMetadata&lt;InputTypes["VertexData"]&gt; &#124; PropertyMetadata&lt;OutputTypes["VertexData"]&gt;) &amp; ObjectPropertyRecord&lt;InputTypes["VertexData"]["propertyKey"] &#124; OutputTypes["VertexData"]["propertyKey"], unknown&gt;)</code> |

</details>

<a id="symbol-LiveResolvedGraphView"></a>

### LiveResolvedGraphView

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface LiveResolvedGraphView<InputVertexTypes extends VertexDataAndChildHintTypes, VertexId = unknown> {
getVertexSnapshotOrNull(ref: VertexHandle<InputVertexTypes>): ResolvedGraphVertexSnapshot<InputVertexTypes, VertexId> | null;
containsVertexHandle(ref: VertexHandle<InputVertexTypes>): boolean;
getDesignatedRootHandleOrNull(): VertexHandle<InputVertexTypes> | null;
getVertexHandles(): readonly VertexHandle<InputVertexTypes>[];
getVertexHandleByIdOrNull(id: VertexId): VertexHandle<InputVertexTypes> | null;
requireVertexId(ref: VertexHandle<InputVertexTypes>): VertexId;
getVertexVisitSchedulingStageOrNull(ref: VertexHandle<InputVertexTypes>): VertexVisitSchedulingStage | null;
getDistinctStructuralParentHandlesOrNull(ref: VertexHandle<InputVertexTypes>): readonly VertexHandle<InputVertexTypes>[] | null;
getStructuralChildHandlesInSlotOrderOrNull(ref: VertexHandle<InputVertexTypes>): readonly VertexHandle<InputVertexTypes>[] | null;
requireAllStructuralAncestorPathsTo(ref: VertexHandle<InputVertexTypes>, options?: StructuralAncestorPathOptions): readonly (readonly VertexHandle<InputVertexTypes>[])[];
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `containsVertexHandle` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;) =&gt; boolean</code> |
| `getDesignatedRootHandleOrNull` | <code>() =&gt; VertexHandle&lt;InputVertexTypes&gt; &#124; null</code> |
| `getDistinctStructuralParentHandlesOrNull` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;) =&gt; readonly VertexHandle&lt;InputVertexTypes&gt;[] &#124; null</code> |
| `getStructuralChildHandlesInSlotOrderOrNull` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;) =&gt; readonly VertexHandle&lt;InputVertexTypes&gt;[] &#124; null</code> |
| `getVertexHandleByIdOrNull` | <code>(id: VertexId) =&gt; VertexHandle&lt;InputVertexTypes&gt; &#124; null</code> |
| `getVertexHandles` | <code>() =&gt; readonly VertexHandle&lt;InputVertexTypes&gt;[]</code> |
| `getVertexSnapshotOrNull` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;) =&gt; Readonly&lt;{ vertexHandle: VertexHandle&lt;InputVertexTypes&gt;; vertex: VertexView&lt;InputVertexTypes&gt;; vertexId: VertexId; firstDiscoveryDepthInEdges: number; workWaitsForWorkOf: readonly VertexId[]; workWaitsForSubgraphCompletionOf?: readonly VertexId[] &#124; undefined; schedulingVisitStage: VertexVisitSchedulingStage; incomingStructuralChildEdges: readonly Readonly&lt;{ parentVertexHandle: VertexHandle&lt;InputVertexTypes&gt;; childVertexHandle: VertexHandle&lt;InputVertexTypes&gt;; parentChildHintIndex: number; childDiscoveryHint: InputVertexTypes["ChildHint"]; }&gt;[]; orderedChildDiscoverySlots: readonly ChildDiscoverySlot&lt;InputVertexTypes, VertexId&gt;[]; }&gt; &#124; null</code> |
| `getVertexVisitSchedulingStageOrNull` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;) =&gt; VertexVisitSchedulingStage &#124; null</code> |
| `requireAllStructuralAncestorPathsTo` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;, options?: StructuralAncestorPathOptions &#124; undefined) =&gt; readonly (readonly VertexHandle&lt;InputVertexTypes&gt;[])[]</code> |
| `requireVertexId` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;) =&gt; VertexId</code> |

</details>

<a id="symbol-LiveResolvedTreeView"></a>

### LiveResolvedTreeView

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface LiveResolvedTreeView<InputVertexTypes extends VertexDataAndChildHintTypes> {
getRootVertexHandleOrNull(): VertexHandle<InputVertexTypes> | null;
containsVertexHandle(ref: VertexHandle<InputVertexTypes>): boolean;
getChildVertexHandlesOrNull(ref: VertexHandle<InputVertexTypes>): readonly VertexHandle<InputVertexTypes>[] | null;
getParentVertexHandleOrNull(ref: VertexHandle<InputVertexTypes>): VertexHandle<InputVertexTypes> | null;
requireStructuralAncestorPathTo(ref: VertexHandle<InputVertexTypes>, options?: StructuralAncestorPathOptions): readonly VertexHandle<InputVertexTypes>[];
getChildDiscoveryContextOrNull(ref: VertexHandle<InputVertexTypes>): Readonly<ChildDiscoveryContext<InputVertexTypes>> | null;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `containsVertexHandle` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;) =&gt; boolean</code> |
| `getChildDiscoveryContextOrNull` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;) =&gt; Readonly&lt;Readonly&lt;{ discoveryDepthInEdges: number; parentVertexAtChildResolution: VertexView&lt;InputVertexTypes&gt;; parentVertexHandle: VertexHandle&lt;InputVertexTypes&gt;; parentChildHintIndex: number; childDiscoveryHint: InputVertexTypes["ChildHint"]; }&gt;&gt; &#124; null</code> |
| `getChildVertexHandlesOrNull` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;) =&gt; readonly VertexHandle&lt;InputVertexTypes&gt;[] &#124; null</code> |
| `getParentVertexHandleOrNull` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;) =&gt; VertexHandle&lt;InputVertexTypes&gt; &#124; null</code> |
| `getRootVertexHandleOrNull` | <code>() =&gt; VertexHandle&lt;InputVertexTypes&gt; &#124; null</code> |
| `requireStructuralAncestorPathTo` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;, options?: StructuralAncestorPathOptions &#124; undefined) =&gt; readonly VertexHandle&lt;InputVertexTypes&gt;[]</code> |

</details>

<a id="symbol-MaterializedDagTraversalInput"></a>

### MaterializedDagTraversalInput

Type-only; no runtime constructor/value. [Owning contract](reference.md#collection-and-forest-sources) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/quickstart-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/dag-input-materialization`.

```ts
export type MaterializedDagTraversalInput<Item, VertexId> = {
    dagDiscoverySource: {
        /** Captured catalog lookup accepts any rewritten live-data domain. */
        resolveChildHint: <RewrittenVertexTypes extends VertexDataAndChildHintTypes>(hint: VertexId, context: DagChildResolutionContext<VertexDataAndChildHintTypes<Item, VertexId>, RewrittenVertexTypes, VertexId>) => DagSourceVertexResolution<VertexDataAndChildHintTypes<Item, VertexId>, VertexId>;
    } & DagDiscoverySource<VertexDataAndChildHintTypes<Item, VertexId>, VertexDataAndChildHintTypes<Item, VertexId>, VertexId>;
    sourceRootIsHiddenEntryHolder: true;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `dagDiscoverySource` | <code>{ resolveChildHint: &lt;RewrittenVertexTypes extends VertexDataAndChildHintTypes&lt;unknown, unknown&gt;&gt;(hint: VertexId, context: DagChildResolutionContext&lt;VertexDataAndChildHintTypes&lt;Item, VertexId&gt;, RewrittenVertexTypes, VertexId&gt;) =&gt; DagSourceVertexResolution&lt;VertexDataAndChildHintTypes&lt;Item, VertexId&gt;, VertexId&gt;; } &amp; DagDiscoverySource&lt;VertexDataAndChildHintTypes&lt;Item, VertexId&gt;, VertexDataAndChildHintTypes&lt;Item, VertexId&gt;, VertexId&gt;</code> |
| `sourceRootIsHiddenEntryHolder` | <code>true</code> |

</details>

<a id="symbol-MaybePromise"></a>

### MaybePromise

Type-only; no runtime constructor/value. [Owning contract](reference.md#async-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/async-adapter-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type MaybePromise<T> = T | PromiseLike<T>;
```

<a id="symbol-MutableResolvedTreeStore"></a>

### MutableResolvedTreeStore

Runtime value and public type surface. [Owning contract](reference.md#views-handles-identity-and-paths) · [Executable snippet](reference.md#edit-a-resolved-tree-store)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export declare class MutableResolvedTreeStore<InputVertexTypes extends VertexDataAndChildHintTypes> implements TreeDiscoverySource<StoredTreeReferenceVertexTypes<InputVertexTypes>> {
constructor();
getLiveReadOnlyTreeView(): LiveResolvedTreeView<InputVertexTypes>;
getRootVertexReferenceOrNull(): MutableValueReference<Vertex<InputVertexTypes>> | null;
setRootVertexReference(root: MutableValueReference<Vertex<InputVertexTypes>>): void;
getLiveResolvedGraphView(): LiveResolvedGraphView<InputVertexTypes>;
getDetachedChildReferenceListOrNull(vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>): Array<MutableValueReference<Vertex<InputVertexTypes>>> | null;
getParentVertexReferenceOrNull(vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>): MutableValueReference<Vertex<InputVertexTypes>> | null;
deleteSubtree(vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>): void;
containsVertexReference(vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>): boolean;
getMutableVertexRecordOrNull(vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>): MutableTreeVertexTopologyRecord<InputVertexTypes> | null;
setVertexRecord(vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>, vertexResolved: MutableTreeVertexTopologyRecord<InputVertexTypes>): void;
getDetachedChildDiscoveryContextOrNull(vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>): InternalChildDiscoveryContext<InputVertexTypes> | null;
appendChildReferencesTo(vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>, children: Array<MutableValueReference<Vertex<InputVertexTypes>>>): void;
requireStructuralAncestorPathTo(vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>, options?: StructuralAncestorPathOptions): MutableValueReference<Vertex<InputVertexTypes>>[];
resolveRootVertex(): TreeVertexResolution<StoredTreeReferenceVertexTypes<InputVertexTypes>>;
resolveChildVertexFromHint(vertexHint: StoredTreeReferenceVertexTypes<InputVertexTypes>['ChildHint']): TreeVertexResolution<StoredTreeReferenceVertexTypes<InputVertexTypes>>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `appendChildReferencesTo` | <code>(vertexHandle: MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;, children: MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;[]) =&gt; void</code> |
| `containsVertexReference` | <code>(vertexHandle: MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;) =&gt; boolean</code> |
| `deleteSubtree` | <code>(vertexHandle: MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;) =&gt; void</code> |
| `getDetachedChildDiscoveryContextOrNull` | <code>(vertexHandle: MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;) =&gt; InternalChildDiscoveryContext&lt;InputVertexTypes&gt; &#124; null</code> |
| `getDetachedChildReferenceListOrNull` | <code>(vertexHandle: MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;) =&gt; MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;[] &#124; null</code> |
| `getLiveReadOnlyTreeView` | <code>() =&gt; LiveResolvedTreeView&lt;InputVertexTypes&gt;</code> |
| `getLiveResolvedGraphView` | <code>() =&gt; LiveResolvedGraphView&lt;InputVertexTypes, unknown&gt;</code> |
| `getMutableVertexRecordOrNull` | <code>(vertexHandle: MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;) =&gt; MutableTreeVertexTopologyRecord&lt;InputVertexTypes&gt; &#124; null</code> |
| `getParentVertexReferenceOrNull` | <code>(vertexHandle: MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;) =&gt; MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt; &#124; null</code> |
| `getRootVertexReferenceOrNull` | <code>() =&gt; MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt; &#124; null</code> |
| `requireStructuralAncestorPathTo` | <code>(vertexHandle: MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;, options?: StructuralAncestorPathOptions &#124; undefined) =&gt; MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;[]</code> |
| `resolveChildVertexFromHint` | <code>(vertexHint: MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;) =&gt; TreeVertexResolution&lt;StoredTreeReferenceVertexTypes&lt;InputVertexTypes&gt;&gt;</code> |
| `resolveRootVertex` | <code>() =&gt; TreeVertexResolution&lt;StoredTreeReferenceVertexTypes&lt;InputVertexTypes&gt;&gt;</code> |
| `setRootVertexReference` | <code>(root: MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;) =&gt; void</code> |
| `setVertexRecord` | <code>(vertexHandle: MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;, vertexResolved: MutableTreeVertexTopologyRecord&lt;InputVertexTypes&gt;) =&gt; void</code> |

</details>

<a id="symbol-MutableTreeVertexRecordMap"></a>

### MutableTreeVertexRecordMap

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type MutableTreeVertexRecordMap<InputVertexTypes extends VertexDataAndChildHintTypes> = Map<MutableValueReference<Vertex<InputVertexTypes>>, MutableTreeVertexTopologyRecord<InputVertexTypes>>;
```

<a id="symbol-MutableTreeVertexTopologyRecord"></a>

### MutableTreeVertexTopologyRecord

Runtime value and public type surface. [Owning contract](reference.md#views-handles-identity-and-paths) · [Executable snippet](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export declare class MutableTreeVertexTopologyRecord<InputVertexTypes extends VertexDataAndChildHintTypes> implements TreeVertexTopologyRecordInput<InputVertexTypes> {
readonly metadata: TreeVertexDiscoveryMetadata<InputVertexTypes>;
readonly childReferences: MutableValueReference<Vertex<InputVertexTypes>>[];
constructor(vertexContent: TreeVertexTopologyRecordInput<InputVertexTypes>);
appendChildReferences(childReferences: Array<MutableValueReference<Vertex<InputVertexTypes>>>): void;
getMutableChildDiscoveryContextOrNull(): InternalChildDiscoveryContext<InputVertexTypes> | null;
replaceChildDiscoveryContext(childDiscoveryContext: InternalChildDiscoveryContext<InputVertexTypes> | null): void;
getMutableChildReferenceList(): MutableValueReference<Vertex<InputVertexTypes>>[];
getParentVertexReferenceOrNull(): MutableValueReference<Vertex<InputVertexTypes>> | null;
shallowCloneWithRecordOverrides(content?: Partial<TreeVertexTopologyRecordInput<InputVertexTypes>>): MutableTreeVertexTopologyRecord<InputVertexTypes>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `appendChildReferences` | <code>(childReferences: MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;[]) =&gt; void</code> |
| `childReferences` | <code>MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;[]</code> |
| `getMutableChildDiscoveryContextOrNull` | <code>() =&gt; InternalChildDiscoveryContext&lt;InputVertexTypes&gt; &#124; null</code> |
| `getMutableChildReferenceList` | <code>() =&gt; MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;[]</code> |
| `getParentVertexReferenceOrNull` | <code>() =&gt; MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt; &#124; null</code> |
| `metadata` | <code>TreeVertexDiscoveryMetadata&lt;InputVertexTypes&gt;</code> |
| `replaceChildDiscoveryContext` | <code>(childDiscoveryContext: InternalChildDiscoveryContext&lt;InputVertexTypes&gt; &#124; null) =&gt; void</code> |
| `shallowCloneWithRecordOverrides` | <code>(content?: Partial&lt;TreeVertexTopologyRecordInput&lt;InputVertexTypes&gt;&gt; &#124; undefined) =&gt; MutableTreeVertexTopologyRecord&lt;InputVertexTypes&gt;</code> |

</details>

<a id="symbol-MutableValueReference"></a>

### MutableValueReference

Runtime value and public type surface. [Owning contract](reference.md#views-handles-identity-and-paths) · [Executable snippet](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export declare class MutableValueReference<T> {
constructor(ref: T);
getReferencedValue(): T;
replaceReferencedValue(ref: T): void;
getReferenceIdentity(): string;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getReferenceIdentity` | <code>() =&gt; string</code> |
| `getReferencedValue` | <code>() =&gt; T</code> |
| `replaceReferencedValue` | <code>(ref: T) =&gt; void</code> |

</details>

<a id="symbol-NestedObjectOrArray"></a>

### NestedObjectOrArray

Type-only; no runtime constructor/value. [Owning contract](reference.md#traverse-an-object) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type NestedObjectOrArray<K extends ObjectPropertyKey, PV> = Array<NestedObjectOrArray<K, PV> | PV> | {
    [KK in K]: NestedObjectOrArray<K, PV> | PV;
};
```

<a id="symbol-ObjectChildPropertyResolutionOverrideResult"></a>

### ObjectChildPropertyResolutionOverrideResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#traverse-an-object) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectChildPropertyResolutionOverrideResult<T extends VertexDataAndChildHintTypes> = {
    kind: 'useDefaultChildPropertyResolution';
    vertexId?: never;
    omittedVertexIdentity?: never;
    workWaitsForWorkOf?: never;
    workWaitsForSubgraphCompletionOf?: never;
    satisfiesWorkAndSubgraphCompletionPrerequisites?: never;
    dependsOnWork?: never;
    dependsOnSubgraphCompletion?: never;
    satisfiesDependencies?: never;
} | TreeVertexResolutionFound<T> | TreeVertexResolutionOmitted;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"useDefaultChildPropertyResolution" &#124; "vertexResolved" &#124; "vertexIntentionallyOmitted"</code> |
| `omittedVertexIdentity` | <code>undefined</code> |
| `satisfiesDependencies` | <code>undefined</code> |
| `satisfiesWorkAndSubgraphCompletionPrerequisites` | <code>undefined</code> |
| `vertexId` | <code>undefined</code> |
| `workWaitsForSubgraphCompletionOf` | <code>undefined</code> |
| `workWaitsForWorkOf` | <code>undefined</code> |

</details>

<a id="symbol-ObjectMutationOptions"></a>

### ObjectMutationOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectMutationOptions<InputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>, OutputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>> = {
    arrayAssemblyIndexPolicy?: 'compactRetainedNumericIndices' | 'preserveNumericIndicesAndArrayLength';
    assembledPropertyKeyCollisionPolicy?: 'throwOnDuplicateKey' | 'keepFirstProperty' | 'keepLastProperty';
    matchesArrayAssemblyPredicate?: (vertexData: LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>['VertexData']) => boolean;
    matchesObjectAssemblyPredicate?: (vertexData: LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>['VertexData']) => boolean;
    assembleArrayValueFromChildProperties?: (processedChildProperties: LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>['VertexData'][], vertexData: LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>['VertexData'], propertyVisitorArguments: Parameters<TreeVertexPhaseVisitorCallback<InputTypes, LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>, string>>, assemblyClassification: ObjectPropertyAssemblyClassification) => unknown;
    assembleObjectValueFromChildProperties?: (processedChildProperties: LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>['VertexData'][], vertexData: LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>['VertexData'], propertyVisitorArguments: Parameters<TreeVertexPhaseVisitorCallback<InputTypes, LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>, string>>, assemblyClassification: ObjectPropertyAssemblyClassification) => unknown;
    assemblyCache?: ObjectPropertyAssemblyCache<VertexHandle<LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>>>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `arrayAssemblyIndexPolicy` | <code>"compactRetainedNumericIndices" &#124; "preserveNumericIndicesAndArrayLength" &#124; undefined</code> |
| `assembleArrayValueFromChildProperties` | <code>((processedChildProperties: (InputTypes["VertexData"] &#124; OutputTypes["VertexData"] &#124; ((PropertyMetadata&lt;InputTypes["VertexData"]&gt; &#124; PropertyMetadata&lt;OutputTypes["VertexData"]&gt;) &amp; ObjectPropertyRecord&lt;InputTypes["VertexData"]["propertyKey"] &#124; OutputTypes["VertexData"]["propertyKey"], unknown&gt;))[], vertexData: InputTypes["VertexData"] &#124; OutputTypes["VertexData"] &#124; ((PropertyMetadata&lt;InputTypes["VertexData"]&gt; &#124; PropertyMetadata&lt;OutputTypes["VertexData"]&gt;) &amp; ObjectPropertyRecord&lt;InputTypes["VertexData"]["propertyKey"] &#124; OutputTypes["VertexData"]["propertyKey"], unknown&gt;), propertyVisitorArguments: [vertex: VertexView&lt;InputTypes &#124; LiveObjectPropertyVertexTypes&lt;InputTypes, OutputTypes&gt;&gt;, options: TreeVisitorContext&lt;string, InputTypes, LiveObjectPropertyVertexTypes&lt;InputTypes, OutputTypes&gt;&gt;], assemblyClassification: ObjectPropertyAssemblyClassification) =&gt; unknown) &#124; undefined</code> |
| `assembleObjectValueFromChildProperties` | <code>((processedChildProperties: (InputTypes["VertexData"] &#124; OutputTypes["VertexData"] &#124; ((PropertyMetadata&lt;InputTypes["VertexData"]&gt; &#124; PropertyMetadata&lt;OutputTypes["VertexData"]&gt;) &amp; ObjectPropertyRecord&lt;InputTypes["VertexData"]["propertyKey"] &#124; OutputTypes["VertexData"]["propertyKey"], unknown&gt;))[], vertexData: InputTypes["VertexData"] &#124; OutputTypes["VertexData"] &#124; ((PropertyMetadata&lt;InputTypes["VertexData"]&gt; &#124; PropertyMetadata&lt;OutputTypes["VertexData"]&gt;) &amp; ObjectPropertyRecord&lt;InputTypes["VertexData"]["propertyKey"] &#124; OutputTypes["VertexData"]["propertyKey"], unknown&gt;), propertyVisitorArguments: [vertex: VertexView&lt;InputTypes &#124; LiveObjectPropertyVertexTypes&lt;InputTypes, OutputTypes&gt;&gt;, options: TreeVisitorContext&lt;string, InputTypes, LiveObjectPropertyVertexTypes&lt;InputTypes, OutputTypes&gt;&gt;], assemblyClassification: ObjectPropertyAssemblyClassification) =&gt; unknown) &#124; undefined</code> |
| `assembledPropertyKeyCollisionPolicy` | <code>"throwOnDuplicateKey" &#124; "keepFirstProperty" &#124; "keepLastProperty" &#124; undefined</code> |
| `assemblyCache` | <code>ObjectPropertyAssemblyCache&lt;VertexHandle&lt;LiveObjectPropertyVertexTypes&lt;InputTypes, OutputTypes&gt;&gt;&gt; &#124; undefined</code> |
| `matchesArrayAssemblyPredicate` | <code>((vertexData: InputTypes["VertexData"] &#124; OutputTypes["VertexData"] &#124; ((PropertyMetadata&lt;InputTypes["VertexData"]&gt; &#124; PropertyMetadata&lt;OutputTypes["VertexData"]&gt;) &amp; ObjectPropertyRecord&lt;InputTypes["VertexData"]["propertyKey"] &#124; OutputTypes["VertexData"]["propertyKey"], unknown&gt;)) =&gt; boolean) &#124; undefined</code> |
| `matchesObjectAssemblyPredicate` | <code>((vertexData: InputTypes["VertexData"] &#124; OutputTypes["VertexData"] &#124; ((PropertyMetadata&lt;InputTypes["VertexData"]&gt; &#124; PropertyMetadata&lt;OutputTypes["VertexData"]&gt;) &amp; ObjectPropertyRecord&lt;InputTypes["VertexData"]["propertyKey"] &#124; OutputTypes["VertexData"]["propertyKey"], unknown&gt;)) =&gt; boolean) &#124; undefined</code> |

</details>

<a id="symbol-ObjectPropertyAssemblyCache"></a>

### ObjectPropertyAssemblyCache

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectPropertyAssemblyCache<Key> = {
    hasAssembledValueForVertex: (vertexHandle: Key) => boolean;
    getAssembledValueForVertex: (vertexHandle: Key) => unknown;
    setAssembledValueForVertex: (vertexHandle: Key, assembledValue: unknown) => unknown;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getAssembledValueForVertex` | <code>(vertexHandle: Key) =&gt; unknown</code> |
| `hasAssembledValueForVertex` | <code>(vertexHandle: Key) =&gt; boolean</code> |
| `setAssembledValueForVertex` | <code>(vertexHandle: Key, assembledValue: unknown) =&gt; unknown</code> |

</details>

<a id="symbol-ObjectPropertyAssemblyClassification"></a>

### ObjectPropertyAssemblyClassification

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](reference.md#rewrite-objects)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectPropertyAssemblyClassification = {
    matchesAnyCompositeAssemblyPredicate: boolean;
    matchesArrayAssemblyPredicate: boolean;
    matchesObjectAssemblyPredicate: boolean;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `matchesAnyCompositeAssemblyPredicate` | <code>boolean</code> |
| `matchesArrayAssemblyPredicate` | <code>boolean</code> |
| `matchesObjectAssemblyPredicate` | <code>boolean</code> |

</details>

<a id="symbol-ObjectPropertyKey"></a>

### ObjectPropertyKey

Type-only; no runtime constructor/value. [Owning contract](reference.md#traverse-an-object) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectPropertyKey = number | string | symbol;
```

<a id="symbol-ObjectPropertyKeyValuePatch"></a>

### ObjectPropertyKeyValuePatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectPropertyKeyValuePatch<OutputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>> = Partial<Pick<OutputTypes['VertexData'], 'propertyKey' | 'propertyValue'>>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `propertyKey` | <code>OutputTypes["VertexData"]["propertyKey"] &#124; undefined</code> |
| `propertyValue` | <code>OutputTypes["VertexData"]["propertyValue"] &#124; undefined</code> |

</details>

<a id="symbol-ObjectPropertyMutationHelperBinder"></a>

### ObjectPropertyMutationHelperBinder

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectPropertyMutationHelperBinder<InputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>, OutputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>> = (...propertyVisitorArguments: Parameters<TreeVertexPhaseVisitorCallback<InputTypes, LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>, string>>) => BoundObjectPropertyMutationHelpers<OutputTypes, InputTypes>;
```

<a id="symbol-ObjectPropertyMutationHelperBinderFactory"></a>

### ObjectPropertyMutationHelperBinderFactory

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectPropertyMutationHelperBinderFactory = <InputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>, OutputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>>(options?: ObjectMutationOptions<InputTypes, OutputTypes>) => ObjectPropertyMutationHelperBinder<InputTypes, OutputTypes>;
```

<a id="symbol-ObjectPropertyPostOrderRewriteCallback"></a>

### ObjectPropertyPostOrderRewriteCallback

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export type ObjectPropertyPostOrderRewriteCallback<InputPropertyKey extends ObjectPropertyKey, InputPropertyValue, RewrittenPropertyKey extends ObjectPropertyKey, RewrittenPropertyValue> = (prop: ObjectPropertyRewriteInput<InputPropertyKey, InputPropertyValue, RewrittenPropertyKey, RewrittenPropertyValue>, context: ObjectPropertyRewriteContext<InputPropertyKey, InputPropertyValue, RewrittenPropertyKey, RewrittenPropertyValue>) => ObjectPropertyRewriteRequest<ObjectPropertyTreeVertexTypes<RewrittenPropertyKey, RewrittenPropertyValue>> | undefined;
```

<a id="symbol-ObjectPropertyRecord"></a>

### ObjectPropertyRecord

Type-only; no runtime constructor/value. [Owning contract](reference.md#traverse-an-object) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectPropertyRecord<K extends ObjectPropertyKey, V> = {
    propertyKey: K;
    propertyValue: V;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `propertyKey` | <code>K</code> |
| `propertyValue` | <code>V</code> |

</details>

<a id="symbol-ObjectPropertyRewriteContext"></a>

### ObjectPropertyRewriteContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export type ObjectPropertyRewriteContext<InputPropertyKey extends ObjectPropertyKey, InputPropertyValue, RewrittenPropertyKey extends ObjectPropertyKey, RewrittenPropertyValue> = TreeVisitorContext<DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES, ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>, LiveObjectPropertyVertexTypes<ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>, ObjectPropertyTreeVertexTypes<RewrittenPropertyKey, RewrittenPropertyValue>>> & ObjectPropertyAssemblyClassification & {
    vertex: VertexView<LiveObjectPropertyVertexTypes<ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>, ObjectPropertyTreeVertexTypes<RewrittenPropertyKey, RewrittenPropertyValue>>>;
    requirePropertyKeyPathFromRoot: (options?: StructuralAncestorPathOptions) => (InputPropertyKey | RewrittenPropertyKey)[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `currentVertexPhaseChainState` | <code>unknown</code> |
| `isTreeRoot` | <code>boolean</code> |
| `liveResolvedTreeView` | <code>LiveResolvedTreeView&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt; &#124; LiveObjectPropertyVertexTypes&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, ObjectPropertyTreeVertexTypes&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;&gt;&gt;</code> |
| `matchesAnyCompositeAssemblyPredicate` | <code>boolean</code> |
| `matchesArrayAssemblyPredicate` | <code>boolean</code> |
| `matchesObjectAssemblyPredicate` | <code>boolean</code> |
| `phaseVisitorChainIndex` | <code>number</code> |
| `preCommandDiscoveredTreeView` | <code>LiveResolvedTreeView&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;&gt; &#124; null</code> |
| `previousCommittedVisitVertexHandleForSamePhase` | <code>VertexHandle&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt; &#124; LiveObjectPropertyVertexTypes&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, ObjectPropertyTreeVertexTypes&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;&gt;&gt; &#124; null</code> |
| `requirePropertyKeyPathFromRoot` | <code>(options?: StructuralAncestorPathOptions &#124; undefined) =&gt; (InputPropertyKey &#124; RewrittenPropertyKey)[]</code> |
| `vertex` | <code>VertexView&lt;LiveObjectPropertyVertexTypes&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, ObjectPropertyTreeVertexTypes&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;&gt;&gt;</code> |
| `vertexHandle` | <code>VertexHandle&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt; &#124; LiveObjectPropertyVertexTypes&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, ObjectPropertyTreeVertexTypes&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;&gt;&gt;</code> |
| `visitorCallbackIndexInPhaseChain` | <code>number</code> |
| `visitorPhase` | <code>DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES</code> |
| `visitorRegistrationMetadata` | <code>Readonly&lt;VisitorRegistrationOptions &amp; { phaseRegistrationInsertionIndex: number; visitorGroup?: Readonly&lt;{ groupIdentity: symbol; isExplicitlyDeclaredGroup: boolean; visitorCommandCommitTiming: VisitorCommandCommitTiming; }&gt; &#124; undefined; }&gt;</code> |

</details>

<a id="symbol-ObjectPropertyRewriteInput"></a>

### ObjectPropertyRewriteInput

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export type ObjectPropertyRewriteInput<InputPropertyKey extends ObjectPropertyKey, InputPropertyValue, RewrittenPropertyKey extends ObjectPropertyKey, RewrittenPropertyValue> = LiveObjectPropertyVertexTypes<ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>, ObjectPropertyTreeVertexTypes<RewrittenPropertyKey, RewrittenPropertyValue>>['VertexData'] & {
    assembledValueFromCurrentChildren?: unknown;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `assembledValueFromCurrentChildren` | <code>unknown</code> |
| `propertyKey` | <code>InputPropertyKey &#124; RewrittenPropertyKey</code> |
| `propertyValue` | <code>unknown</code> |

</details>

<a id="symbol-ObjectPropertyRewriteOptions"></a>

### ObjectPropertyRewriteOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export type ObjectPropertyRewriteOptions<InputValue, InputPropertyKey extends ObjectPropertyKey, InputPropertyValue, OutputValue, RewrittenPropertyKey extends ObjectPropertyKey, RewrittenPropertyValue> = ObjectPropertyTreeSourceOptions<InputValue, InputPropertyKey, InputPropertyValue, RewrittenPropertyKey, RewrittenPropertyValue> & Partial<ObjectMutationOptions<ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>, ObjectPropertyTreeVertexTypes<RewrittenPropertyKey, RewrittenPropertyValue>> & Omit<DepthFirstTreeTraversalBuilderOptionsPatch<ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>, LiveObjectPropertyVertexTypes<ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>, ObjectPropertyTreeVertexTypes<RewrittenPropertyKey, RewrittenPropertyValue>>>, 'treeDiscoverySource'>> & {
    treeDiscoverySource?: never;
    rewritePropertyAfterChildTraversal?: ObjectPropertyPostOrderRewriteCallback<InputPropertyKey, InputPropertyValue, RewrittenPropertyKey, RewrittenPropertyValue>;
    includeAssembledValueInRewriteInput?: boolean;
} & (unknown extends OutputValue ? {
    convertPresentRootOutputValue?: PresentRootOutputConverter<OutputValue>;
} : {
    convertPresentRootOutputValue: PresentRootOutputConverter<OutputValue>;
});
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `arrayAssemblyIndexPolicy` | <code>"compactRetainedNumericIndices" &#124; "preserveNumericIndicesAndArrayLength" &#124; undefined</code> |
| `assembleArrayValueFromChildProperties` | <code>((processedChildProperties: (ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt; &#124; ObjectPropertyRecord&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt; &#124; ((Omit&lt;ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;, "propertyKey" &#124; "propertyValue"&gt; &#124; Omit&lt;ObjectPropertyRecord&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;, "propertyKey" &#124; "propertyValue"&gt;) &amp; ObjectPropertyRecord&lt;InputPropertyKey &#124; RewrittenPropertyKey, unknown&gt;))[], vertexData: ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt; &#124; ObjectPropertyRecord&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt; &#124; ((Omit&lt;ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;, "propertyKey" &#124; "propertyValue"&gt; &#124; Omit&lt;ObjectPropertyRecord&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;, "propertyKey" &#124; "propertyValue"&gt;) &amp; ObjectPropertyRecord&lt;InputPropertyKey &#124; RewrittenPropertyKey, unknown&gt;), propertyVisitorArguments: [vertex: VertexView&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt; &#124; LiveObjectPropertyVertexTypes&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, ObjectPropertyTreeVertexTypes&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;&gt;&gt;, options: TreeVisitorContext&lt;string, ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, LiveObjectPropertyVertexTypes&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, ObjectPropertyTreeVertexTypes&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;&gt;&gt;], assemblyClassification: ObjectPropertyAssemblyClassification) =&gt; unknown) &#124; undefined</code> |
| `assembleObjectValueFromChildProperties` | <code>((processedChildProperties: (ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt; &#124; ObjectPropertyRecord&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt; &#124; ((Omit&lt;ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;, "propertyKey" &#124; "propertyValue"&gt; &#124; Omit&lt;ObjectPropertyRecord&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;, "propertyKey" &#124; "propertyValue"&gt;) &amp; ObjectPropertyRecord&lt;InputPropertyKey &#124; RewrittenPropertyKey, unknown&gt;))[], vertexData: ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt; &#124; ObjectPropertyRecord&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt; &#124; ((Omit&lt;ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;, "propertyKey" &#124; "propertyValue"&gt; &#124; Omit&lt;ObjectPropertyRecord&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;, "propertyKey" &#124; "propertyValue"&gt;) &amp; ObjectPropertyRecord&lt;InputPropertyKey &#124; RewrittenPropertyKey, unknown&gt;), propertyVisitorArguments: [vertex: VertexView&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt; &#124; LiveObjectPropertyVertexTypes&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, ObjectPropertyTreeVertexTypes&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;&gt;&gt;, options: TreeVisitorContext&lt;string, ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, LiveObjectPropertyVertexTypes&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, ObjectPropertyTreeVertexTypes&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;&gt;&gt;], assemblyClassification: ObjectPropertyAssemblyClassification) =&gt; unknown) &#124; undefined</code> |
| `assembledPropertyKeyCollisionPolicy` | <code>"throwOnDuplicateKey" &#124; "keepFirstProperty" &#124; "keepLastProperty" &#124; undefined</code> |
| `assemblyCache` | <code>ObjectPropertyAssemblyCache&lt;VertexHandle&lt;LiveObjectPropertyVertexTypes&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, ObjectPropertyTreeVertexTypes&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;&gt;&gt;&gt; &#124; undefined</code> |
| `childBoundaryVisits` | <code>DepthFirstChildBoundaryVisitOptionsPatch &#124; undefined</code> |
| `convertPresentRootOutputValue` | <code>PresentRootOutputConverter&lt;OutputValue&gt; &#124; undefined</code> |
| `enumerateChildPropertyHints` | <code>((prop: ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;) =&gt; ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;[]) &#124; undefined</code> |
| `includeAssembledValueInRewriteInput` | <code>boolean &#124; undefined</code> |
| `mapInputToRootProperty` | <code>((inputObj: InputValue) =&gt; ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;) &#124; undefined</code> |
| `matchesArrayAssemblyPredicate` | <code>((vertexData: ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt; &#124; ObjectPropertyRecord&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt; &#124; ((Omit&lt;ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;, "propertyKey" &#124; "propertyValue"&gt; &#124; Omit&lt;ObjectPropertyRecord&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;, "propertyKey" &#124; "propertyValue"&gt;) &amp; ObjectPropertyRecord&lt;InputPropertyKey &#124; RewrittenPropertyKey, unknown&gt;)) =&gt; boolean) &#124; undefined</code> |
| `matchesObjectAssemblyPredicate` | <code>((vertexData: ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt; &#124; ObjectPropertyRecord&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt; &#124; ((Omit&lt;ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;, "propertyKey" &#124; "propertyValue"&gt; &#124; Omit&lt;ObjectPropertyRecord&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;, "propertyKey" &#124; "propertyValue"&gt;) &amp; ObjectPropertyRecord&lt;InputPropertyKey &#124; RewrittenPropertyKey, unknown&gt;)) =&gt; boolean) &#124; undefined</code> |
| `resolveChildPropertyOrUseDefault` | <code>((childDiscoveryHint: ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;, context: TreeChildResolverContext&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, LiveObjectPropertyVertexTypes&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, ObjectPropertyTreeVertexTypes&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;&gt;&gt;) =&gt; ObjectChildPropertyResolutionOverrideResult&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;&gt;) &#124; undefined</code> |
| `retainDiscoveredTreeBeforeVisitorCommands` | <code>boolean &#124; undefined</code> |
| `rewritePropertyAfterChildTraversal` | <code>ObjectPropertyPostOrderRewriteCallback&lt;InputPropertyKey, InputPropertyValue, RewrittenPropertyKey, RewrittenPropertyValue&gt; &#124; undefined</code> |
| `transformChildHintsBeforeResolution` | <code>ChildHintsListTransformer&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;&gt; &#124; null &#124; undefined</code> |
| `treeDiscoverySource` | <code>undefined</code> |
| `visitors` | <code>VisitorDefinitionsByPhase&lt;DepthFirstTreeVisitorRegistrationsByPhase&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, LiveObjectPropertyVertexTypes&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, ObjectPropertyTreeVertexTypes&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;&gt;&gt;&gt; &#124; undefined</code> |

</details>

<a id="symbol-ObjectPropertyRewriteRequest"></a>

### ObjectPropertyRewriteRequest

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectPropertyRewriteRequest<OutputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>> = {
    kind: 'patchPropertyKeyOrValue';
    propertyPatch: ObjectPropertyKeyValuePatch<OutputTypes>;
    propertyValue?: never;
} | {
    kind: 'deletePropertySubtree';
    propertyPatch?: never;
    propertyValue?: never;
} | {
    kind: 'keepPropertyAndAssembleCurrentChildren';
    propertyPatch?: never;
    propertyValue?: never;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"patchPropertyKeyOrValue" &#124; "deletePropertySubtree" &#124; "keepPropertyAndAssembleCurrentChildren"</code> |
| `propertyPatch` | <code>Partial&lt;Pick&lt;OutputTypes["VertexData"], "propertyKey" &#124; "propertyValue"&gt;&gt; &#124; undefined</code> |
| `propertyValue` | <code>undefined</code> |

</details>

<a id="symbol-ObjectPropertyRewriteResult"></a>

### ObjectPropertyRewriteResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export type ObjectPropertyRewriteResult<InputPropertyKey extends ObjectPropertyKey, InputPropertyValue, OutputValue, RewrittenPropertyKey extends ObjectPropertyKey, RewrittenPropertyValue> = {
    /** Converted output captured at return, possibly partial before completion. */
    capturedOutputResultAtReturn: ObjectRewriteOutputResult<OutputValue>;
    /** Final converted output; throws until the runner has finished. */
    getFinalOutputResult(): ObjectRewriteOutputResult<OutputValue>;
    traversalRunner: DepthFirstTreeRunner<ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>, LiveObjectPropertyVertexTypes<ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>, ObjectPropertyTreeVertexTypes<RewrittenPropertyKey, RewrittenPropertyValue>>>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `capturedOutputResultAtReturn` | <code>ObjectRewriteOutputResult&lt;OutputValue&gt;</code> |
| `getFinalOutputResult` | <code>() =&gt; ObjectRewriteOutputResult&lt;OutputValue&gt;</code> |
| `traversalRunner` | <code>DepthFirstTreeRunner&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, LiveObjectPropertyVertexTypes&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, ObjectPropertyTreeVertexTypes&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;&gt;&gt;</code> |

</details>

<a id="symbol-ObjectPropertyTreeAdapters"></a>

### ObjectPropertyTreeAdapters

Type-only; no runtime constructor/value. [Owning contract](reference.md#traverse-an-object) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectPropertyTreeAdapters<InputValue, InputPropertyKey extends ObjectPropertyKey, InputPropertyValue> = Required<Pick<ObjectPropertyTreeBaseOptions<InputValue, InputPropertyKey, InputPropertyValue, InputPropertyKey, InputPropertyValue>, 'mapInputToRootProperty' | 'enumerateChildPropertyHints'>>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `enumerateChildPropertyHints` | <code>(prop: ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;) =&gt; ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;[]</code> |
| `mapInputToRootProperty` | <code>(inputObj: InputValue) =&gt; ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;</code> |

</details>

<a id="symbol-ObjectPropertyTreeSource"></a>

### ObjectPropertyTreeSource

Runtime value and public type surface. [Owning contract](reference.md#traverse-an-object) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export declare class ObjectPropertyTreeSource<InputValue = NestedObjectOrArray<ObjectPropertyKey, unknown>, InputPropertyKey extends ObjectPropertyKey = ObjectPropertyKey, InputPropertyValue = unknown, RewrittenPropertyKey extends ObjectPropertyKey = InputPropertyKey, RewrittenPropertyValue = InputPropertyValue> implements TreeDiscoverySource<ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>, LiveObjectPropertyVertexTypes<ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>, ObjectPropertyTreeVertexTypes<RewrittenPropertyKey, RewrittenPropertyValue>>> {
readonly inputRootValue: InputValue;
static enumerateOwnEnumerableChildProperties: typeof enumerateOwnEnumerableChildProperties;
static createInputValueToRootPropertyMapper: typeof createInputValueToRootPropertyMapper;
static fromPropertyAdapters<InputValue, InputPropertyKey extends ObjectPropertyKey, InputPropertyValue, RewrittenPropertyKey extends ObjectPropertyKey = InputPropertyKey, RewrittenPropertyValue = InputPropertyValue>(inputRootValue: InputValue, options: ObjectPropertyTreeBaseOptions<InputValue, InputPropertyKey, InputPropertyValue, RewrittenPropertyKey, RewrittenPropertyValue> & ObjectPropertyTreeAdapters<InputValue, InputPropertyKey, InputPropertyValue>): ObjectPropertyTreeSource<InputValue, InputPropertyKey, InputPropertyValue, RewrittenPropertyKey, RewrittenPropertyValue>;
constructor(inputRootValue: InputValue, options: ObjectPropertyTreeBaseOptions<InputValue, InputPropertyKey, InputPropertyValue, RewrittenPropertyKey, RewrittenPropertyValue> & ObjectPropertyTreeAdapters<InputValue, InputPropertyKey, InputPropertyValue>);
constructor(inputRootValue: InputValue, ...args: [ObjectPropertyKey, unknown] extends [
        InputPropertyKey,
        InputPropertyValue
    ] ? [
        options?: ObjectPropertyTreeSourceOptions<InputValue, InputPropertyKey, InputPropertyValue, RewrittenPropertyKey, RewrittenPropertyValue>
    ] : [
        options: ObjectPropertyTreeSourceOptions<InputValue, InputPropertyKey, InputPropertyValue, RewrittenPropertyKey, RewrittenPropertyValue>
    ]);
static createObjectPropertyMutationHelperBinder: ObjectPropertyMutationHelperBinderFactory;
resolveRootVertex(): TreeVertexResolutionFound<ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>>;
resolveChildVertexFromHint(childDiscoveryHint: ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>['ChildHint'], options: TreeChildResolverContext<ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>, LiveObjectPropertyVertexTypes<ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>, ObjectPropertyTreeVertexTypes<RewrittenPropertyKey, RewrittenPropertyValue>>>): TreeVertexResolution<ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `inputRootValue` | <code>InputValue</code> |
| `resolveChildVertexFromHint` | <code>(childDiscoveryHint: ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;, options: TreeChildResolverContext&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, LiveObjectPropertyVertexTypes&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, ObjectPropertyTreeVertexTypes&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;&gt;&gt;) =&gt; TreeVertexResolution&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;&gt;</code> |
| `resolveRootVertex` | <code>() =&gt; TreeVertexResolutionFound&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;&gt;</code> |

</details>

<a id="symbol-ObjectPropertyTreeSourceOptions"></a>

### ObjectPropertyTreeSourceOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#traverse-an-object) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectPropertyTreeSourceOptions<InputValue, InputPropertyKey extends ObjectPropertyKey, InputPropertyValue, RewrittenPropertyKey extends ObjectPropertyKey, RewrittenPropertyValue> = ObjectPropertyTreeBaseOptions<InputValue, InputPropertyKey, InputPropertyValue, RewrittenPropertyKey, RewrittenPropertyValue> & ([ObjectPropertyKey, unknown] extends [InputPropertyKey, InputPropertyValue] ? unknown : ObjectPropertyTreeAdapters<InputValue, InputPropertyKey, InputPropertyValue>);
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `enumerateChildPropertyHints` | <code>((prop: ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;) =&gt; ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;[]) &#124; undefined</code> |
| `mapInputToRootProperty` | <code>((inputObj: InputValue) =&gt; ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;) &#124; undefined</code> |
| `resolveChildPropertyOrUseDefault` | <code>((childDiscoveryHint: ObjectPropertyRecord&lt;InputPropertyKey, InputPropertyValue&gt;, context: TreeChildResolverContext&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, LiveObjectPropertyVertexTypes&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;, ObjectPropertyTreeVertexTypes&lt;RewrittenPropertyKey, RewrittenPropertyValue&gt;&gt;&gt;) =&gt; ObjectChildPropertyResolutionOverrideResult&lt;ObjectPropertyTreeVertexTypes&lt;InputPropertyKey, InputPropertyValue&gt;&gt;) &#124; undefined</code> |

</details>

<a id="symbol-ObjectPropertyTreeVertexTypes"></a>

### ObjectPropertyTreeVertexTypes

Type-only; no runtime constructor/value. [Owning contract](reference.md#traverse-an-object) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
export type ObjectPropertyTreeVertexTypes<K extends ObjectPropertyKey, V> = VertexDataAndChildHintTypes<ObjectPropertyRecord<K, V>, ObjectPropertyRecord<K, V>>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `ChildHint` | <code>ObjectPropertyRecord&lt;K, V&gt;</code> |
| `VertexData` | <code>ObjectPropertyRecord&lt;K, V&gt;</code> |

</details>

<a id="symbol-ObjectRewriteOutputResult"></a>

### ObjectRewriteOutputResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export type ObjectRewriteOutputResult<OutputValue> = Readonly<{
    kind: 'present';
    value: OutputValue;
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

<a id="symbol-OmittedDagSourceVertex"></a>

### OmittedDagSourceVertex

Type-only; no runtime constructor/value. [Owning contract](reference.md#discovery-and-completed-work) · [Executable snippet](reference.md#graph-source-result-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type OmittedDagSourceVertex<VertexId = unknown> = {
    kind: 'vertexIntentionallyOmitted';
    omittedVertexIdentity: Readonly<{
        vertexId: VertexId;
    }> | null;
    satisfiesWorkAndSubgraphCompletionPrerequisites: true;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"vertexIntentionallyOmitted"</code> |
| `omittedVertexIdentity` | <code>Readonly&lt;{ vertexId: VertexId; }&gt; &#124; null</code> |
| `satisfiesWorkAndSubgraphCompletionPrerequisites` | <code>true</code> |

</details>

<a id="symbol-PreCommandDiscoveredGraphView"></a>

### PreCommandDiscoveredGraphView

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type PreCommandDiscoveredGraphView<InputVertexTypes extends VertexDataAndChildHintTypes, VertexId = unknown> = Pick<LiveResolvedGraphView<InputVertexTypes, VertexId>, 'containsVertexHandle' | 'getDesignatedRootHandleOrNull' | 'getVertexHandles' | 'getVertexHandleByIdOrNull' | 'requireVertexId' | 'getDistinctStructuralParentHandlesOrNull' | 'getStructuralChildHandlesInSlotOrderOrNull' | 'requireAllStructuralAncestorPathsTo'>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `containsVertexHandle` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;) =&gt; boolean</code> |
| `getDesignatedRootHandleOrNull` | <code>() =&gt; VertexHandle&lt;InputVertexTypes&gt; &#124; null</code> |
| `getDistinctStructuralParentHandlesOrNull` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;) =&gt; readonly VertexHandle&lt;InputVertexTypes&gt;[] &#124; null</code> |
| `getStructuralChildHandlesInSlotOrderOrNull` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;) =&gt; readonly VertexHandle&lt;InputVertexTypes&gt;[] &#124; null</code> |
| `getVertexHandleByIdOrNull` | <code>(id: VertexId) =&gt; VertexHandle&lt;InputVertexTypes&gt; &#124; null</code> |
| `getVertexHandles` | <code>() =&gt; readonly VertexHandle&lt;InputVertexTypes&gt;[]</code> |
| `requireAllStructuralAncestorPathsTo` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;, options?: StructuralAncestorPathOptions &#124; undefined) =&gt; readonly (readonly VertexHandle&lt;InputVertexTypes&gt;[])[]</code> |
| `requireVertexId` | <code>(ref: VertexHandle&lt;InputVertexTypes&gt;) =&gt; VertexId</code> |

</details>

<a id="symbol-PresentRootOutputConverter"></a>

### PresentRootOutputConverter

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export type PresentRootOutputConverter<OutputValue> = (propertyValue: unknown, context: {
    readonly isTraversalFinished: boolean;
}) => OutputValue;
```

<a id="symbol-ResolvedGraphVertexSnapshot"></a>

### ResolvedGraphVertexSnapshot

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type ResolvedGraphVertexSnapshot<InputVertexTypes extends VertexDataAndChildHintTypes, VertexId = unknown> = Readonly<{
    vertexHandle: VertexHandle<InputVertexTypes>;
    vertex: VertexView<InputVertexTypes>;
    vertexId: VertexId;
    firstDiscoveryDepthInEdges: number;
    workWaitsForWorkOf: readonly VertexId[];
    workWaitsForSubgraphCompletionOf?: readonly VertexId[];
    schedulingVisitStage: VertexVisitSchedulingStage;
    incomingStructuralChildEdges: readonly StructuralChildEdge<InputVertexTypes>[];
    orderedChildDiscoverySlots: readonly ChildDiscoverySlot<InputVertexTypes, VertexId>[];
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `firstDiscoveryDepthInEdges` | <code>number</code> |
| `incomingStructuralChildEdges` | <code>readonly Readonly&lt;{ parentVertexHandle: VertexHandle&lt;InputVertexTypes&gt;; childVertexHandle: VertexHandle&lt;InputVertexTypes&gt;; parentChildHintIndex: number; childDiscoveryHint: InputVertexTypes["ChildHint"]; }&gt;[]</code> |
| `orderedChildDiscoverySlots` | <code>readonly ChildDiscoverySlot&lt;InputVertexTypes, VertexId&gt;[]</code> |
| `schedulingVisitStage` | <code>VertexVisitSchedulingStage</code> |
| `vertex` | <code>VertexView&lt;InputVertexTypes&gt;</code> |
| `vertexHandle` | <code>VertexHandle&lt;InputVertexTypes&gt;</code> |
| `vertexId` | <code>VertexId</code> |
| `workWaitsForSubgraphCompletionOf` | <code>readonly VertexId[] &#124; undefined</code> |
| `workWaitsForWorkOf` | <code>readonly VertexId[]</code> |

</details>

<a id="symbol-StoredTreeReferenceVertexTypes"></a>

### StoredTreeReferenceVertexTypes

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface StoredTreeReferenceVertexTypes<InputTypes extends VertexDataAndChildHintTypes> {
VertexData: MutableValueReference<Vertex<InputTypes>>;
ChildHint: MutableValueReference<Vertex<InputTypes>>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `ChildHint` | <code>MutableValueReference&lt;Vertex&lt;InputTypes&gt;&gt;</code> |
| `VertexData` | <code>MutableValueReference&lt;Vertex&lt;InputTypes&gt;&gt;</code> |

</details>

<a id="symbol-StructuralAncestorPathOptions"></a>

### StructuralAncestorPathOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type StructuralAncestorPathOptions = {
    includeDesignatedRoot?: boolean | undefined;
    includeTargetVertex?: boolean | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `includeDesignatedRoot` | <code>boolean &#124; undefined</code> |
| `includeTargetVertex` | <code>boolean &#124; undefined</code> |

</details>

<a id="symbol-StructuralChildEdge"></a>

### StructuralChildEdge

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type StructuralChildEdge<InputVertexTypes extends VertexDataAndChildHintTypes> = Readonly<{
    parentVertexHandle: VertexHandle<InputVertexTypes>;
    childVertexHandle: VertexHandle<InputVertexTypes>;
    parentChildHintIndex: number;
    childDiscoveryHint: InputVertexTypes['ChildHint'];
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `childDiscoveryHint` | <code>InputVertexTypes["ChildHint"]</code> |
| `childVertexHandle` | <code>VertexHandle&lt;InputVertexTypes&gt;</code> |
| `parentChildHintIndex` | <code>number</code> |
| `parentVertexHandle` | <code>VertexHandle&lt;InputVertexTypes&gt;</code> |

</details>

<a id="symbol-SyncOrAsyncIterable"></a>

### SyncOrAsyncIterable

Type-only; no runtime constructor/value. [Owning contract](reference.md#collection-and-forest-sources) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/quickstart-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/dag-input-materialization`.

```ts
export type SyncOrAsyncIterable<Item> = Iterable<Item> | AsyncIterable<Item>;
```

<a id="symbol-SyncTraversalExecution"></a>

### SyncTraversalExecution

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Executable snippet](reference.md#inspection-and-execution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface SyncTraversalExecution<Phase extends string, Event, Inspection extends TraversalExecutionSnapshot = TraversalExecutionSnapshot, EmittedKind extends string = TraversalEventKindForVisitorPhase<Phase>> extends TraversalExecutionState<Inspection> {
runAndIterateObservationEventsUntilSuspendedOrTerminal: {
        (): Generator<Event, void, unknown>;
        <Kind extends EmittedKind>(config: TraversalExecutionSelectionPatch<Phase, Kind> & {
            deliveredEventKinds: readonly Kind[];
        }): Generator<TraversalEventNarrowedToSelectedKinds<Event, Kind>, void, unknown>;
        (config?: TraversalExecutionSelectionPatch<Phase, EmittedKind>): Generator<Event, void, unknown>;
    };
runUntilSuspendedOrTerminal: (config?: TraversalExecutionSelectionPatch<Phase, EmittedKind>) => this;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `captureExecutionSnapshot` | <code>() =&gt; Inspection</code> |
| `getTraversalLifecycleStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getTraversalStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `isSuspended` | <code>() =&gt; boolean</code> |
| `requestPauseAfterAdmittedCallbacksDrain` | <code>() =&gt; boolean</code> |
| `runAndIterateObservationEventsUntilSuspendedOrTerminal` | <code>{ (): Generator&lt;Event, void, unknown&gt;; &lt;Kind extends EmittedKind&gt;(config: TraversalExecutionSelectionPatch&lt;Phase, Kind&gt; &amp; { deliveredEventKinds: readonly Kind[]; }): Generator&lt;TraversalEventNarrowedToSelectedKinds&lt;Event, Kind&gt;, void, unknown&gt;; (config?: TraversalExecutionSelectionPatch&lt;Phase, EmittedKind&gt; &#124; undefined): Generator&lt;Event, void, unknown&gt;; }</code> |
| `runUntilSuspendedOrTerminal` | <code>(config?: TraversalExecutionSelectionPatch&lt;Phase, EmittedKind&gt; &#124; undefined) =&gt; SyncTraversalExecution&lt;Phase, Event, Inspection, EmittedKind&gt;</code> |

</details>

<a id="symbol-TraversalEventKindForVisitorPhase"></a>

### TraversalEventKindForVisitorPhase

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TraversalEventKindForVisitorPhase<Phase extends string> = Phase extends 'ON_WORK_READY' ? 'workCompletionCommitted' : Phase extends 'ON_SUBGRAPH_COMPLETION_READY' ? 'subgraphCompletionCommitted' : Phase extends 'vertexOccurrence' ? 'vertexOccurrence' : Phase extends 'admittedEdgeOccurrence' ? 'admittedEdgeOccurrence' : Phase extends 'routePrefix' ? 'routePrefix' : Phase;
```

<a id="symbol-TraversalEventNarrowedToSelectedKinds"></a>

### TraversalEventNarrowedToSelectedKinds

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Related example](reference.md#inspection-and-execution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TraversalEventNarrowedToSelectedKinds<Event, Kind extends string> = [Kind] extends [never] ? never : Event extends {
    eventKind: string;
} ? Event & {
    readonly eventKind: Kind;
} : Event;
```

<a id="symbol-TraversalExecutionSelectionPatch"></a>

### TraversalExecutionSelectionPatch

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/event-delivery-selection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TraversalExecutionSelectionPatch<VisitorPhase extends string, EmittedKind extends string = TraversalEventKindForVisitorPhase<VisitorPhase>> = {
    deliveredEventKinds?: readonly EmittedKind[] | undefined;
    admittedVisitorCallbackPhases?: VisitorCallbackPhaseSelection<VisitorPhase> | {
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
| `admittedVisitorCallbackPhases` | <code>VisitorCallbackPhaseSelection&lt;VisitorPhase&gt; &#124; { include: undefined; exclude?: undefined; } &#124; { exclude: undefined; include?: undefined; } &#124; undefined</code> |
| `deliveredEventKinds` | <code>readonly EmittedKind[] &#124; undefined</code> |

</details>

<a id="symbol-TraversalExecutionSelections"></a>

### TraversalExecutionSelections

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Executable snippet](reference.md#inspection-and-execution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TraversalExecutionSelections<Phase extends string = TreeOrDagVisitorPhase, EmittedKind extends string = TraversalEventKindForVisitorPhase<Phase>> = Readonly<{
    deliveredEventKinds: readonly EmittedKind[];
    admittedVisitorCallbackPhases: VisitorCallbackPhaseSelection<Phase>;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `admittedVisitorCallbackPhases` | <code>VisitorCallbackPhaseSelection&lt;Phase&gt;</code> |
| `deliveredEventKinds` | <code>readonly EmittedKind[]</code> |

</details>

<a id="symbol-TraversalExecutionSnapshot"></a>

### TraversalExecutionSnapshot

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Related example](reference.md#inspection-and-execution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface TraversalExecutionSnapshot {
readonly traversalLifecycleStatus: TraversalRunnerStatus;
readonly traversalStopReason: TraversalStopReason | null;
readonly pauseRequested: boolean;
readonly traversalAlgorithm: string;
readonly callbackExecutionMode: 'sync' | 'async';
readonly inFlightInvocationCount: number;
readonly bufferedDeliveryEventCount: number;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `bufferedDeliveryEventCount` | <code>number</code> |
| `callbackExecutionMode` | <code>"sync" &#124; "async"</code> |
| `inFlightInvocationCount` | <code>number</code> |
| `pauseRequested` | <code>boolean</code> |
| `traversalAlgorithm` | <code>string</code> |
| `traversalLifecycleStatus` | <code>TraversalRunnerStatus</code> |
| `traversalStopReason` | <code>TraversalStopReason &#124; null</code> |

</details>

<a id="symbol-TraversalExecutionState"></a>

### TraversalExecutionState

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Executable snippet](reference.md#inspection-and-execution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface TraversalExecutionState<Inspection extends TraversalExecutionSnapshot = TraversalExecutionSnapshot> {
getTraversalLifecycleStatus(): TraversalRunnerStatus;
getTraversalStopReason(): TraversalStopReason | null;
isSuspended(): boolean;
captureExecutionSnapshot(): Inspection;
requestPauseAfterAdmittedCallbacksDrain(): boolean;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `captureExecutionSnapshot` | <code>() =&gt; Inspection</code> |
| `getTraversalLifecycleStatus` | <code>() =&gt; TraversalRunnerStatus</code> |
| `getTraversalStopReason` | <code>() =&gt; TraversalStopReason &#124; null</code> |
| `isSuspended` | <code>() =&gt; boolean</code> |
| `requestPauseAfterAdmittedCallbacksDrain` | <code>() =&gt; boolean</code> |

</details>

<a id="symbol-TraversalRunnerStatus"></a>

### TraversalRunnerStatus

Runtime value and public type surface. [Owning contract](reference.md#inspection-and-execution) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-reconciliation-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export declare enum TraversalRunnerStatus {
NOT_STARTED = "NOT_STARTED"
RUNNING = "RUNNING"
SUSPENDED = "SUSPENDED"
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
| `NOT_STARTED` | <code>TraversalRunnerStatus.NOT_STARTED</code> |
| `RUNNING` | <code>TraversalRunnerStatus.RUNNING</code> |
| `SUSPENDED` | <code>TraversalRunnerStatus.SUSPENDED</code> |

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
export type TraversalVisitorCommand<RewrittenVertexTypes extends VertexDataAndChildHintTypes, T extends TraversalVisitorCommandName = TraversalVisitorCommandName, SourceHint = RewrittenVertexTypes['ChildHint']> = {
    [Name in T]: {
        commandName: Name;
    } & ([
        TraversalVisitorCommandArguments<RewrittenVertexTypes, SourceHint>[Name]
    ] extends [never] ? {
        commandArguments?: never;
    } : {
        commandArguments: TraversalVisitorCommandArguments<RewrittenVertexTypes, SourceHint>[Name];
    });
}[T];
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `commandArguments` | <code>TraversalVisitorCommandArguments&lt;RewrittenVertexTypes, SourceHint&gt;[T] &#124; undefined</code> |
| `commandName` | <code>T</code> |

</details>

<a id="symbol-TraversalVisitorCommandArguments"></a>

### TraversalVisitorCommandArguments

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TraversalVisitorCommandArguments<RewrittenVertexTypes extends VertexDataAndChildHintTypes, SourceHint = RewrittenVertexTypes['ChildHint']> = {
    [TraversalVisitorCommandName.NO_OPERATION]: never;
    [TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION]: never;
    [TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_CHILD_HINTS]: {
        replacementChildHints: readonly SourceHint[];
    };
    [TraversalVisitorCommandName.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY]: never;
    [TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS]: never;
    [TraversalVisitorCommandName.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS]: never;
    [TraversalVisitorCommandName.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE]: {
        phaseChainState: unknown;
    };
    [TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA]: {
        replacementVertexData: RewrittenVertexTypes['VertexData'];
    };
    [TraversalVisitorCommandName.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX]: never;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS` | <code>never</code> |
| `DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS` | <code>never</code> |
| `END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION` | <code>never</code> |
| `NO_OPERATION` | <code>never</code> |
| `PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY` | <code>never</code> |
| `REPLACE_CURRENT_VERTEX_CHILD_HINTS` | <code>{ replacementChildHints: readonly SourceHint[]; }</code> |
| `REPLACE_CURRENT_VERTEX_DATA` | <code>{ replacementVertexData: RewrittenVertexTypes["VertexData"]; }</code> |
| `SET_CURRENT_VERTEX_PHASE_CHAIN_STATE` | <code>{ phaseChainState: unknown; }</code> |
| `SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX` | <code>never</code> |

</details>

<a id="symbol-TraversalVisitorCommandName"></a>

### TraversalVisitorCommandName

Runtime value and public type surface. [Owning contract](reference.md#visitors-and-commands) · [Executable snippet](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export declare enum TraversalVisitorCommandName {
NO_OPERATION = "NO_OPERATION"
END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION = "END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION"
REPLACE_CURRENT_VERTEX_CHILD_HINTS = "REPLACE_CURRENT_VERTEX_CHILD_HINTS"
PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY = "PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY"
DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS = "DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS"
DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS = "DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS"
SET_CURRENT_VERTEX_PHASE_CHAIN_STATE = "SET_CURRENT_VERTEX_PHASE_CHAIN_STATE"
REPLACE_CURRENT_VERTEX_DATA = "REPLACE_CURRENT_VERTEX_DATA"
SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX = "SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX"
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS` | <code>TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS</code> |
| `DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS` | <code>TraversalVisitorCommandName.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS</code> |
| `END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION` | <code>TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION</code> |
| `NO_OPERATION` | <code>TraversalVisitorCommandName.NO_OPERATION</code> |
| `PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY` | <code>TraversalVisitorCommandName.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY</code> |
| `REPLACE_CURRENT_VERTEX_CHILD_HINTS` | <code>TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_CHILD_HINTS</code> |
| `REPLACE_CURRENT_VERTEX_DATA` | <code>TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA</code> |
| `SET_CURRENT_VERTEX_PHASE_CHAIN_STATE` | <code>TraversalVisitorCommandName.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE</code> |
| `SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX` | <code>TraversalVisitorCommandName.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX</code> |

</details>

<a id="symbol-TreeChildResolverContext"></a>

### TreeChildResolverContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Related example](reference.md#source-callback-contexts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeChildResolverContext<InputVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes> = {
    childDiscoveryContext: ChildDiscoveryContext<InputVertexTypes | RewrittenVertexTypes>;
    liveResolvedTreeView: LiveResolvedTreeView<InputVertexTypes | RewrittenVertexTypes>;
    preCommandDiscoveredTreeView: LiveResolvedTreeView<InputVertexTypes> | null;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `childDiscoveryContext` | <code>Readonly&lt;{ discoveryDepthInEdges: number; parentVertexAtChildResolution: VertexView&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;; parentVertexHandle: VertexHandle&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;; parentChildHintIndex: number; childDiscoveryHint: (InputVertexTypes &#124; RewrittenVertexTypes)["ChildHint"]; }&gt;</code> |
| `liveResolvedTreeView` | <code>LiveResolvedTreeView&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;</code> |
| `preCommandDiscoveredTreeView` | <code>LiveResolvedTreeView&lt;InputVertexTypes&gt; &#124; null</code> |

</details>

<a id="symbol-TreeDiscoverySource"></a>

### TreeDiscoverySource

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeDiscoverySource<InputVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes> = {
    resolveRootVertex: () => TreeVertexResolution<InputVertexTypes>;
    resolveChildVertexFromHint: (vertexHint: InputVertexTypes['ChildHint'], options: TreeChildResolverContext<InputVertexTypes, RewrittenVertexTypes>) => TreeVertexResolution<InputVertexTypes>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `resolveChildVertexFromHint` | <code>(vertexHint: InputVertexTypes["ChildHint"], options: TreeChildResolverContext&lt;InputVertexTypes, RewrittenVertexTypes&gt;) =&gt; TreeVertexResolution&lt;InputVertexTypes&gt;</code> |
| `resolveRootVertex` | <code>() =&gt; TreeVertexResolution&lt;InputVertexTypes&gt;</code> |

</details>

<a id="symbol-TreeOrDagCallbackOperation"></a>

### TreeOrDagCallbackOperation

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Related example](reference.md#inspection-and-execution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeOrDagCallbackOperation = 'resolveRootVertex' | 'resolveChildVertexFromHint' | 'resolveChildHint' | 'resolvePrerequisiteByVertexId' | 'transformChildHintsBeforeResolution' | 'tryGetVertexIdentityFromHint' | 'invokeVisitorCallback';
```

<a id="symbol-TreeOrDagExecutionSnapshot"></a>

### TreeOrDagExecutionSnapshot

Type-only; no runtime constructor/value. [Owning contract](reference.md#inspection-and-execution) · [Related example](reference.md#inspection-and-execution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeOrDagExecutionSnapshot<Phase extends string = TreeOrDagVisitorPhase> = TreeOrDagCallbackDriverSnapshot<Phase> & Readonly<{
    bufferedDeliveryEventCount: number;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `bufferedDeliveryEventCount` | <code>number</code> |
| `callbackExecutionMode` | <code>"sync" &#124; "async"</code> |
| `dependencyEligiblePhaseVisits` | <code>readonly Readonly&lt;{ vertexReferenceIdentity: string; visitorPhase: Phase; }&gt;[]</code> |
| `executionOptions` | <code>Readonly&lt;{ deliveredEventKinds: readonly TraversalEventKindForVisitorPhase&lt;Phase&gt;[]; admittedVisitorCallbackPhases: VisitorCallbackPhaseSelection&lt;Phase&gt;; }&gt;</code> |
| `hasChildHintVertexIdResolver` | <code>boolean</code> |
| `hasChildHintsListTransformer` | <code>boolean</code> |
| `inFlightInvocationCount` | <code>number</code> |
| `maxConcurrentCallbackInvocations` | <code>number</code> |
| `pauseRequested` | <code>boolean</code> |
| `pendingCallbackRequests` | <code>readonly Readonly&lt;{ callbackRequestId: number; operation: TreeOrDagCallbackOperation; owner: Readonly&lt;SchedulingOwnerValidityToken&gt;; ownerStillValid: boolean; }&gt;[]</code> |
| `sourceTopologyKind` | <code>"graph" &#124; "tree"</code> |
| `traversalAlgorithm` | <code>"dag" &#124; "depth-first" &#124; "breadth-first"</code> |
| `traversalLifecycleStatus` | <code>TraversalRunnerStatus</code> |
| `traversalStopReason` | <code>TraversalStopReason &#124; null</code> |
| `unacknowledgedCommittedEventBoundaryCount` | <code>number</code> |
| `vertexPhaseVisitorChains` | <code>readonly Readonly&lt;{ owner: Readonly&lt;SchedulingOwnerValidityToken&gt;; vertexReferenceIdentity: string; visitorPhase: Phase; state: "active" &#124; "pausedAtCommandBoundary" &#124; "phaseChainFinished" &#124; "invalidated"; visitorCommandCommitTiming: VisitorCommandCommitTiming; visitorCallbackIndexInPhaseChain: number; pendingCallbackOrCommandBatch: "none" &#124; "visitorCallbackResult" &#124; "commandBatchCommit"; executionSelectionsAtAdmission: Readonly&lt;{ deliveredEventKinds: readonly TraversalEventKindForVisitorPhase&lt;Phase&gt;[]; admittedVisitorCallbackPhases: VisitorCallbackPhaseSelection&lt;Phase&gt;; }&gt;; }&gt;[]</code> |
| `vertexTraversalFrames` | <code>readonly Readonly&lt;{ owner: Readonly&lt;SchedulingOwnerValidityToken&gt;; vertexReferenceIdentity: string; stage: DepthFirstTraversalFrameStage &#124; "resolvingChildHintVertexIds" &#124; "resolvingChildVertexContent" &#124; "childDiscoveryClosed"; pendingChildHintIndices: readonly number[]; }&gt;[]</code> |

</details>

<a id="symbol-TreePhaseVisitorRegistrationRecord"></a>

### TreePhaseVisitorRegistrationRecord

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreePhaseVisitorRegistrationRecord<Phase extends string, InputVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes> = VisitorRecord<TreeVertexPhaseVisitorCallback<InputVertexTypes, RewrittenVertexTypes, Phase>>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `descendingExecutionPriorityWithinGroup` | <code>number</code> |
| `phaseRegistrationInsertionIndex` | <code>number</code> |
| `visitor` | <code>TreeVertexPhaseVisitorCallback&lt;InputVertexTypes, RewrittenVertexTypes, Phase&gt;</code> |
| `visitorCommandCommitTiming` | <code>VisitorCommandCommitTiming &#124; undefined</code> |
| `visitorGroup` | <code>Readonly&lt;{ groupIdentity: symbol; isExplicitlyDeclaredGroup: boolean; visitorCommandCommitTiming: VisitorCommandCommitTiming; }&gt; &#124; undefined</code> |

</details>

<a id="symbol-TreeTraversalEvent"></a>

### TreeTraversalEvent

Type-only; no runtime constructor/value. [Owning contract](reference.md#traversal-orders) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/traversable-object-iterable-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeTraversalEvent<Phase extends string, InputVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes> = {
    vertex: VertexView<InputVertexTypes | RewrittenVertexTypes>;
    vertexHandle: VertexHandle<InputVertexTypes | RewrittenVertexTypes>;
    eventKind: Phase;
    isTreeRoot: boolean;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `eventKind` | <code>Phase</code> |
| `isTreeRoot` | <code>boolean</code> |
| `vertex` | <code>VertexView&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;</code> |
| `vertexHandle` | <code>VertexHandle&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;</code> |

</details>

<a id="symbol-TreeVertexDiscoveryMetadata"></a>

### TreeVertexDiscoveryMetadata

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVertexDiscoveryMetadata<InputVertexTypes extends VertexDataAndChildHintTypes> = {
    childDiscoveryContext: InternalChildDiscoveryContext<InputVertexTypes> | null;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `childDiscoveryContext` | <code>InternalChildDiscoveryContext&lt;InputVertexTypes&gt; &#124; null</code> |

</details>

<a id="symbol-TreeVertexPhaseVisitorCallback"></a>

### TreeVertexPhaseVisitorCallback

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Executable snippet](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVertexPhaseVisitorCallback<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes, Phase extends string = string> = VisitorCommandsResult<RewrittenVertexTypes, Phase, 'tree', InputVertexTypes['ChildHint']> extends infer RESULT ? (vertex: VertexView<InputVertexTypes | RewrittenVertexTypes>, options: TreeVisitorContext<Phase, InputVertexTypes, RewrittenVertexTypes>) => RESULT | undefined | void : never;
```

<a id="symbol-TreeVertexResolution"></a>

### TreeVertexResolution

Type-only; no runtime constructor/value. [Owning contract](reference.md#abstract-trees) · [Related example](reference.md#abstract-trees)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVertexResolution<InputVertexTypes extends VertexDataAndChildHintTypes> = TreeVertexResolutionFound<InputVertexTypes> | TreeVertexResolutionOmitted;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `identity` | <code>undefined</code> |
| `kind` | <code>"vertexResolved" &#124; "vertexIntentionallyOmitted"</code> |
| `omittedVertexIdentity` | <code>undefined</code> |
| `satisfiesDependencies` | <code>undefined</code> |
| `satisfiesWorkAndSubgraphCompletionPrerequisites` | <code>undefined</code> |
| `vertexId` | <code>undefined</code> |
| `workWaitsForSubgraphCompletionOf` | <code>undefined</code> |
| `workWaitsForWorkOf` | <code>undefined</code> |

</details>

<a id="symbol-TreeVertexResolutionFound"></a>

### TreeVertexResolutionFound

Type-only; no runtime constructor/value. [Owning contract](reference.md#abstract-trees) · [Related example](reference.md#abstract-trees)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVertexResolutionFound<InputVertexTypes extends VertexDataAndChildHintTypes> = ForbiddenGraphMetadataOnTreeResolution & {
    kind: 'vertexResolved';
    resolvedVertexInput: ForbiddenGraphMetadataOnTreeResolution & {
        vertexContentInput: VertexContentInput<InputVertexTypes>;
    };
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `identity` | <code>undefined</code> |
| `kind` | <code>"vertexResolved"</code> |
| `omittedVertexIdentity` | <code>undefined</code> |
| `resolvedVertexInput` | <code>ForbiddenGraphMetadataOnTreeResolution &amp; { vertexContentInput: VertexContentInput&lt;InputVertexTypes&gt;; }</code> |
| `satisfiesDependencies` | <code>undefined</code> |
| `satisfiesWorkAndSubgraphCompletionPrerequisites` | <code>undefined</code> |
| `vertexId` | <code>undefined</code> |
| `workWaitsForSubgraphCompletionOf` | <code>undefined</code> |
| `workWaitsForWorkOf` | <code>undefined</code> |

</details>

<a id="symbol-TreeVertexResolutionOmitted"></a>

### TreeVertexResolutionOmitted

Type-only; no runtime constructor/value. [Owning contract](reference.md#abstract-trees) · [Related example](migration-uniform-api.md#source-resolution)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVertexResolutionOmitted = ForbiddenGraphMetadataOnTreeResolution & {
    kind: 'vertexIntentionallyOmitted';
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `identity` | <code>undefined</code> |
| `kind` | <code>"vertexIntentionallyOmitted"</code> |
| `omittedVertexIdentity` | <code>undefined</code> |
| `satisfiesDependencies` | <code>undefined</code> |
| `satisfiesWorkAndSubgraphCompletionPrerequisites` | <code>undefined</code> |
| `vertexId` | <code>undefined</code> |
| `workWaitsForSubgraphCompletionOf` | <code>undefined</code> |
| `workWaitsForWorkOf` | <code>undefined</code> |

</details>

<a id="symbol-TreeVertexTopologyRecordInput"></a>

### TreeVertexTopologyRecordInput

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVertexTopologyRecordInput<InputVertexTypes extends VertexDataAndChildHintTypes> = {
    metadata: TreeVertexDiscoveryMetadata<InputVertexTypes>;
    childReferences: MutableValueReference<Vertex<InputVertexTypes>>[];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `childReferences` | <code>MutableValueReference&lt;Vertex&lt;InputVertexTypes&gt;&gt;[]</code> |
| `metadata` | <code>TreeVertexDiscoveryMetadata&lt;InputVertexTypes&gt;</code> |

</details>

<a id="symbol-TreeVisitorContext"></a>

### TreeVisitorContext

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVisitorContext<Phase extends string, InputVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes> = {
    liveResolvedTreeView: LiveResolvedTreeView<InputVertexTypes | RewrittenVertexTypes>;
    preCommandDiscoveredTreeView: LiveResolvedTreeView<InputVertexTypes> | null;
    phaseVisitorChainIndex: number;
    visitorCallbackIndexInPhaseChain: number;
    previousCommittedVisitVertexHandleForSamePhase: VertexHandle<InputVertexTypes | RewrittenVertexTypes> | null;
    isTreeRoot: boolean;
    vertexHandle: VertexHandle<InputVertexTypes | RewrittenVertexTypes>;
    currentVertexPhaseChainState: unknown;
    visitorRegistrationMetadata: VisitorRegistrationMetadata;
    visitorPhase: Phase;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `currentVertexPhaseChainState` | <code>unknown</code> |
| `isTreeRoot` | <code>boolean</code> |
| `liveResolvedTreeView` | <code>LiveResolvedTreeView&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;</code> |
| `phaseVisitorChainIndex` | <code>number</code> |
| `preCommandDiscoveredTreeView` | <code>LiveResolvedTreeView&lt;InputVertexTypes&gt; &#124; null</code> |
| `previousCommittedVisitVertexHandleForSamePhase` | <code>VertexHandle&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt; &#124; null</code> |
| `vertexHandle` | <code>VertexHandle&lt;InputVertexTypes &#124; RewrittenVertexTypes&gt;</code> |
| `visitorCallbackIndexInPhaseChain` | <code>number</code> |
| `visitorPhase` | <code>Phase</code> |
| `visitorRegistrationMetadata` | <code>Readonly&lt;VisitorRegistrationOptions &amp; { phaseRegistrationInsertionIndex: number; visitorGroup?: Readonly&lt;{ groupIdentity: symbol; isExplicitlyDeclaredGroup: boolean; visitorCommandCommitTiming: VisitorCommandCommitTiming; }&gt; &#124; undefined; }&gt;</code> |

</details>

<a id="symbol-TreeVisitorVertexDataMutationToolsBinder"></a>

### TreeVisitorVertexDataMutationToolsBinder

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVisitorVertexDataMutationToolsBinder<Phase extends string, InputVertexTypes extends VertexDataAndChildHintTypes, OutputVertexTypes extends VertexDataAndChildHintTypes, ReplacementDataInput = OutputVertexTypes['VertexData']> = (...visitorArguments: Parameters<TreeVertexPhaseVisitorCallback<InputVertexTypes, OutputVertexTypes, Phase>>) => VertexDataMutationCommandTools<OutputVertexTypes, ReplacementDataInput, TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS>;
```

<a id="symbol-TreeVisitorVertexDataMutationToolsBinderFactory"></a>

### TreeVisitorVertexDataMutationToolsBinderFactory

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type TreeVisitorVertexDataMutationToolsBinderFactory<BinderOptions = unknown> = <Phase extends string, InputVertexTypes extends VertexDataAndChildHintTypes, OutputVertexTypes extends VertexDataAndChildHintTypes, ReplacementDataInput = OutputVertexTypes['VertexData']>(options?: BinderOptions) => TreeVisitorVertexDataMutationToolsBinder<Phase, InputVertexTypes, OutputVertexTypes, ReplacementDataInput>;
```

<a id="symbol-ValidatedDagTopologyAsyncRunnerOptions"></a>

### ValidatedDagTopologyAsyncRunnerOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type ValidatedDagTopologyAsyncRunnerOptions<Data, VertexId> = Pick<AsyncDagTraversalBuilderOptionsPatch<VertexDataAndChildHintTypes<Data, VertexId>, VertexDataAndChildHintTypes<Data, VertexId>, VertexId>, 'visitors' | 'acceptedCompletedWorkVertexIds' | 'workCompletionPolicy' | 'retainDiscoveredGraphBeforeVisitorCommands' | 'maxConcurrentCallbackInvocations'> & OwnedOptions;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `acceptedCompletedWorkVertexIds` | <code>ReadonlySet&lt;VertexId&gt; &#124; undefined</code> |
| `dagDiscoverySource` | <code>undefined</code> |
| `discoveryTiming` | <code>undefined</code> |
| `maxConcurrentCallbackInvocations` | <code>number &#124; undefined</code> |
| `retainDiscoveredGraphBeforeVisitorCommands` | <code>boolean &#124; undefined</code> |
| `rootWorkPrerequisitePolicy` | <code>undefined</code> |
| `sourceRootIsHiddenEntryHolder` | <code>undefined</code> |
| `transformChildHintsBeforeResolution` | <code>undefined</code> |
| `traversalRunnerInternalObjects` | <code>undefined</code> |
| `treeDiscoverySource` | <code>undefined</code> |
| `undeclaredWorkPrerequisitePolicy` | <code>undefined</code> |
| `visitors` | <code>VisitorDefinitionsByPhase&lt;AsyncDagTraversalVisitors&lt;VertexDataAndChildHintTypes&lt;Data, VertexId&gt;, VertexDataAndChildHintTypes&lt;Data, VertexId&gt;, VertexId&gt;&gt; &#124; undefined</code> |
| `workCompletionPolicy` | <code>"afterWorkReadyVisitorChain" &#124; "requireExternalWorkSettlement" &#124; undefined</code> |

</details>

<a id="symbol-ValidatedDagTopologyLiveVertexSummary"></a>

### ValidatedDagTopologyLiveVertexSummary

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type ValidatedDagTopologyLiveVertexSummary<Data, VertexId> = Readonly<{
    vertexId: VertexId;
    data: Data;
    liveStructuralChildVertexIds: readonly VertexId[];
    workWaitsForWorkOf: readonly VertexId[];
    workWaitsForSubgraphCompletionOf: readonly VertexId[];
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `data` | <code>Data</code> |
| `liveStructuralChildVertexIds` | <code>readonly VertexId[]</code> |
| `vertexId` | <code>VertexId</code> |
| `workWaitsForSubgraphCompletionOf` | <code>readonly VertexId[]</code> |
| `workWaitsForWorkOf` | <code>readonly VertexId[]</code> |

</details>

<a id="symbol-ValidatedDagTopologyRunnerOptions"></a>

### ValidatedDagTopologyRunnerOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export type ValidatedDagTopologyRunnerOptions<Data, VertexId> = Pick<DagTraversalBuilderOptionsPatch<VertexDataAndChildHintTypes<Data, VertexId>, VertexDataAndChildHintTypes<Data, VertexId>, VertexId>, 'visitors' | 'acceptedCompletedWorkVertexIds' | 'workCompletionPolicy' | 'retainDiscoveredGraphBeforeVisitorCommands'> & OwnedOptions;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `acceptedCompletedWorkVertexIds` | <code>ReadonlySet&lt;VertexId&gt; &#124; undefined</code> |
| `dagDiscoverySource` | <code>undefined</code> |
| `discoveryTiming` | <code>undefined</code> |
| `retainDiscoveredGraphBeforeVisitorCommands` | <code>boolean &#124; undefined</code> |
| `rootWorkPrerequisitePolicy` | <code>undefined</code> |
| `sourceRootIsHiddenEntryHolder` | <code>undefined</code> |
| `transformChildHintsBeforeResolution` | <code>undefined</code> |
| `traversalRunnerInternalObjects` | <code>undefined</code> |
| `treeDiscoverySource` | <code>undefined</code> |
| `undeclaredWorkPrerequisitePolicy` | <code>undefined</code> |
| `visitors` | <code>VisitorDefinitionsByPhase&lt;DagTraversalVisitors&lt;VertexDataAndChildHintTypes&lt;Data, VertexId&gt;, VertexDataAndChildHintTypes&lt;Data, VertexId&gt;, VertexId&gt;&gt; &#124; undefined</code> |
| `workCompletionPolicy` | <code>"afterWorkReadyVisitorChain" &#124; "requireExternalWorkSettlement" &#124; undefined</code> |

</details>

<a id="symbol-ValidatedReusableDagTopology"></a>

### ValidatedReusableDagTopology

Type-only; no runtime constructor/value. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export interface ValidatedReusableDagTopology<Data, VertexId = unknown> {
readonly liveVertexSummaries: readonly ValidatedDagTopologyLiveVertexSummary<Data, VertexId>[];
readonly definition: DagDefinition<Data, VertexId>;
createIndependentRunnerFromValidatedTopology(options?: ValidatedDagTopologyRunnerOptions<Data, VertexId>): DagTraversalRunner<VertexDataAndChildHintTypes<Data, VertexId>, VertexDataAndChildHintTypes<Data, VertexId>, VertexId>;
createIndependentAsyncRunnerFromValidatedTopology(options?: ValidatedDagTopologyAsyncRunnerOptions<Data, VertexId>): Promise<AsyncDagTraversalRunner<VertexDataAndChildHintTypes<Data, VertexId>, VertexDataAndChildHintTypes<Data, VertexId>, VertexId>>;
createExternalWorkSession(options?: DagExternalWorkSessionOptions<VertexId>): DagExternalWorkSession<VertexId>;
createAsyncExternalWorkSession(options?: AsyncDagExternalWorkSessionOptions<VertexId>): Promise<AsyncDagExternalWorkSession<VertexId>>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `createAsyncExternalWorkSession` | <code>(options?: AsyncDagExternalWorkSessionOptions&lt;VertexId&gt; &#124; undefined) =&gt; Promise&lt;AsyncDagExternalWorkSession&lt;VertexId&gt;&gt;</code> |
| `createExternalWorkSession` | <code>(options?: DagExternalWorkSessionOptions&lt;VertexId&gt; &#124; undefined) =&gt; DagExternalWorkSession&lt;VertexId&gt;</code> |
| `createIndependentAsyncRunnerFromValidatedTopology` | <code>(options?: ValidatedDagTopologyAsyncRunnerOptions&lt;Data, VertexId&gt; &#124; undefined) =&gt; Promise&lt;AsyncDagTraversalRunner&lt;VertexDataAndChildHintTypes&lt;Data, VertexId&gt;, VertexDataAndChildHintTypes&lt;Data, VertexId&gt;, VertexId&gt;&gt;</code> |
| `createIndependentRunnerFromValidatedTopology` | <code>(options?: ValidatedDagTopologyRunnerOptions&lt;Data, VertexId&gt; &#124; undefined) =&gt; DagTraversalRunner&lt;VertexDataAndChildHintTypes&lt;Data, VertexId&gt;, VertexDataAndChildHintTypes&lt;Data, VertexId&gt;, VertexId&gt;</code> |
| `definition` | <code>DagDefinition&lt;Data, VertexId&gt;</code> |
| `liveVertexSummaries` | <code>readonly Readonly&lt;{ vertexId: VertexId; data: Data; liveStructuralChildVertexIds: readonly VertexId[]; workWaitsForWorkOf: readonly VertexId[]; workWaitsForSubgraphCompletionOf: readonly VertexId[]; }&gt;[]</code> |

</details>

<a id="symbol-Vertex"></a>

### Vertex

Runtime value and public type surface. [Owning contract](reference.md#views-handles-identity-and-paths) · [Executable snippet](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export declare class Vertex<InputVertexTypes extends VertexDataAndChildHintTypes> implements VertexContent<InputVertexTypes> {
readonly $vertexData: InputVertexTypes['VertexData'];
readonly $childDiscoveryHints: InputVertexTypes['ChildHint'][];
constructor(vertexContent: VertexContentInput<InputVertexTypes>);
getVertexData(): InputVertexTypes['VertexData'];
getMutableChildDiscoveryHints(): InputVertexTypes['ChildHint'][];
getDetachedChildDiscoveryHints(): readonly InputVertexTypes['ChildHint'][];
hasChildDiscoveryHints(): boolean;
createEditableShallowCloneWithContentOverrides(content?: VertexContentOverridesForShallowClone<InputVertexTypes>): Vertex<InputVertexTypes>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `$childDiscoveryHints` | <code>InputVertexTypes["ChildHint"][]</code> |
| `$vertexData` | <code>InputVertexTypes["VertexData"]</code> |
| `createEditableShallowCloneWithContentOverrides` | <code>(content?: Partial&lt;VertexContentInput&lt;InputVertexTypes&gt;&gt; &#124; undefined) =&gt; Vertex&lt;InputVertexTypes&gt;</code> |
| `getDetachedChildDiscoveryHints` | <code>() =&gt; readonly InputVertexTypes["ChildHint"][]</code> |
| `getMutableChildDiscoveryHints` | <code>() =&gt; InputVertexTypes["ChildHint"][]</code> |
| `getVertexData` | <code>() =&gt; InputVertexTypes["VertexData"]</code> |
| `hasChildDiscoveryHints` | <code>() =&gt; boolean</code> |

</details>

<a id="symbol-VertexContent"></a>

### VertexContent

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexContent<InputVertexTypes extends VertexDataAndChildHintTypes> = {
    $vertexData: InputVertexTypes['VertexData'];
    $childDiscoveryHints: InputVertexTypes['ChildHint'][];
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `$childDiscoveryHints` | <code>InputVertexTypes["ChildHint"][]</code> |
| `$vertexData` | <code>InputVertexTypes["VertexData"]</code> |

</details>

<a id="symbol-VertexContentInput"></a>

### VertexContentInput

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexContentInput<InputVertexTypes extends VertexDataAndChildHintTypes> = {
    $vertexData: InputVertexTypes['VertexData'];
    $childDiscoveryHints: readonly InputVertexTypes['ChildHint'][];
    $d?: never;
    $c?: never;
    $data?: never;
    $childHints?: never;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `$c` | <code>undefined</code> |
| `$childDiscoveryHints` | <code>readonly InputVertexTypes["ChildHint"][]</code> |
| `$childHints` | <code>undefined</code> |
| `$d` | <code>undefined</code> |
| `$data` | <code>undefined</code> |
| `$vertexData` | <code>InputVertexTypes["VertexData"]</code> |

</details>

<a id="symbol-VertexContentOverridesForShallowClone"></a>

### VertexContentOverridesForShallowClone

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexContentOverridesForShallowClone<InputVertexTypes extends VertexDataAndChildHintTypes> = Partial<VertexContentInput<InputVertexTypes>>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `$c` | <code>undefined</code> |
| `$childDiscoveryHints` | <code>readonly InputVertexTypes["ChildHint"][] &#124; undefined</code> |
| `$childHints` | <code>undefined</code> |
| `$d` | <code>undefined</code> |
| `$data` | <code>undefined</code> |
| `$vertexData` | <code>InputVertexTypes["VertexData"] &#124; undefined</code> |

</details>

<a id="symbol-VertexDataAndChildHintTypes"></a>

### VertexDataAndChildHintTypes

Type-only; no runtime constructor/value. [Owning contract](reference.md#source-callback-contexts) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/async-adapter-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexDataAndChildHintTypes<VertexData = unknown, ChildHint = unknown> = {
    VertexData: VertexData;
    ChildHint: ChildHint;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `ChildHint` | <code>ChildHint</code> |
| `VertexData` | <code>VertexData</code> |

</details>

<a id="symbol-VertexDataMutationCommandBuilder"></a>

### VertexDataMutationCommandBuilder

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexDataMutationCommandBuilder<OutputVertexTypes extends VertexDataAndChildHintTypes, ReplacementDataInput = OutputVertexTypes['VertexData'], Delete extends TreeOrDagDeletionCommandName = TreeOrDagDeletionCommandName> = (request?: VertexDataReplacementOrDeletionRequest<ReplacementDataInput>) => VertexDataReplacementOrDeletionCommand<OutputVertexTypes, Delete>;
```

<a id="symbol-VertexDataMutationCommandTools"></a>

### VertexDataMutationCommandTools

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexDataMutationCommandTools<OutputVertexTypes extends VertexDataAndChildHintTypes, ReplacementDataInput = OutputVertexTypes['VertexData'], Delete extends TreeOrDagDeletionCommandName = TreeOrDagDeletionCommandName> = {
    makeVertexDataMutationCommand: VertexDataMutationCommandBuilder<OutputVertexTypes, ReplacementDataInput, Delete>;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `makeVertexDataMutationCommand` | <code>VertexDataMutationCommandBuilder&lt;OutputVertexTypes, ReplacementDataInput, Delete&gt;</code> |

</details>

<a id="symbol-VertexDataReplacementOrDeletionCommand"></a>

### VertexDataReplacementOrDeletionCommand

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexDataReplacementOrDeletionCommand<InputVertexTypes extends VertexDataAndChildHintTypes, Delete extends TreeOrDagDeletionCommandName = TreeOrDagDeletionCommandName> = TraversalVisitorCommand<InputVertexTypes, Delete | TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA | TraversalVisitorCommandName.NO_OPERATION>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `commandArguments` | <code>{ replacementVertexData: InputVertexTypes["VertexData"]; } &#124; TraversalVisitorCommandArguments&lt;InputVertexTypes, InputVertexTypes["ChildHint"]&gt;[Delete] &#124; undefined</code> |
| `commandName` | <code>TraversalVisitorCommandName.NO_OPERATION &#124; TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA &#124; Delete</code> |

</details>

<a id="symbol-VertexDataReplacementOrDeletionRequest"></a>

### VertexDataReplacementOrDeletionRequest

Type-only; no runtime constructor/value. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexDataReplacementOrDeletionRequest<ReplacementDataInput> = {
    kind: 'replaceData';
    replacementData: ReplacementDataInput;
    patch?: never;
} | {
    kind: 'delete';
    replacementData?: never;
    patch?: never;
} | {
    kind: 'keep';
    replacementData?: never;
    patch?: never;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `kind` | <code>"replaceData" &#124; "delete" &#124; "keep"</code> |
| `patch` | <code>undefined</code> |
| `replacementData` | <code>ReplacementDataInput &#124; undefined</code> |

</details>

<a id="symbol-VertexHandle"></a>

### VertexHandle

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface VertexHandle<InputVertexTypes extends VertexDataAndChildHintTypes> {
getCurrentVertexView(): VertexView<InputVertexTypes>;
getReferenceIdentity(): string;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `getCurrentVertexView` | <code>() =&gt; VertexView&lt;InputVertexTypes&gt;</code> |
| `getReferenceIdentity` | <code>() =&gt; string</code> |

</details>

<a id="symbol-VertexId"></a>

### VertexId

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexId = unknown;
```

<a id="symbol-VertexView"></a>

### VertexView

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export interface VertexView<InputVertexTypes extends VertexDataAndChildHintTypes> {
readonly $vertexData: InputVertexTypes['VertexData'];
readonly $childDiscoveryHints: readonly InputVertexTypes['ChildHint'][];
getVertexData(): InputVertexTypes['VertexData'];
getDetachedChildDiscoveryHints(): readonly InputVertexTypes['ChildHint'][];
hasChildDiscoveryHints(): boolean;
createEditableShallowCloneWithContentOverrides(content?: VertexContentOverridesForShallowClone<InputVertexTypes>): Vertex<InputVertexTypes>;
}
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `$childDiscoveryHints` | <code>readonly InputVertexTypes["ChildHint"][]</code> |
| `$vertexData` | <code>InputVertexTypes["VertexData"]</code> |
| `createEditableShallowCloneWithContentOverrides` | <code>(content?: Partial&lt;VertexContentInput&lt;InputVertexTypes&gt;&gt; &#124; undefined) =&gt; Vertex&lt;InputVertexTypes&gt;</code> |
| `getDetachedChildDiscoveryHints` | <code>() =&gt; readonly InputVertexTypes["ChildHint"][]</code> |
| `getVertexData` | <code>() =&gt; InputVertexTypes["VertexData"]</code> |
| `hasChildDiscoveryHints` | <code>() =&gt; boolean</code> |

</details>

<a id="symbol-VertexVisitSchedulingStage"></a>

### VertexVisitSchedulingStage

Type-only; no runtime constructor/value. [Owning contract](reference.md#views-handles-identity-and-paths) · [Related example](reference.md#views-handles-identity-and-paths)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VertexVisitSchedulingStage = 'DISCOVERED' | 'INITIAL_VISIT_ELIGIBLE' | 'INITIAL_VISIT_STARTED' | 'INITIAL_VISIT_COMMITTED' | 'COMPLETION_VISIT_ELIGIBLE' | 'COMPLETION_VISIT_COMMITTED';
```

<a id="symbol-VisitorCallbackPhaseSelection"></a>

### VisitorCallbackPhaseSelection

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/event-delivery-selection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorCallbackPhaseSelection<VisitorPhase extends string> = 'all' | {
    include: readonly VisitorPhase[];
    exclude?: never;
} | {
    exclude: readonly VisitorPhase[];
    include?: never;
};
```

<a id="symbol-VisitorCommandCommitTiming"></a>

### VisitorCommandCommitTiming

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorCommandCommitTiming = 'afterEachVisitorCallback' | 'afterContiguousVisitorBatch';
```

<a id="symbol-VisitorCommandsResult"></a>

### VisitorCommandsResult

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorCommandsResult<RewrittenVertexTypes extends VertexDataAndChildHintTypes, Phase extends string = string, Family extends 'tree' | 'dag' = 'tree' | 'dag', SourceHint = RewrittenVertexTypes['ChildHint']> = {
    commands?: TraversalVisitorCommand<RewrittenVertexTypes, CommonNonHintNonDeletionNonDeferralCommandName | (Family extends 'tree' ? TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS : TraversalVisitorCommandName.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS) | ([Phase] extends [
        'BEFORE_CHILD_EXPANSION' | 'AT_LEVEL_ORDER_VERTEX' | 'ON_WORK_READY'
    ] ? ChildHintReplacementCommandName : never), SourceHint>[];
} | ([Phase] extends ['ON_WORK_READY'] ? {
    commands: [
        TraversalVisitorCommand<RewrittenVertexTypes, TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION, SourceHint>
    ];
} : never);
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `commands` | <code>TraversalVisitorCommand&lt;RewrittenVertexTypes, CommonNonHintNonDeletionNonDeferralCommandName &#124; (Family extends "tree" ? TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS : TraversalVisitorCommandName.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS) &#124; ([Phase] extends ["ON_WORK_READY" &#124; "BEFORE_CHILD_EXPANSION" &#124; "AT_LEVEL_ORDER_VERTEX"] ? TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_CHILD_HINTS : never), SourceHint&gt;[] &#124; [{ commandName: TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION; } &amp; { commandArguments?: undefined; }] &#124; undefined</code> |

</details>

<a id="symbol-VisitorDefinitionsForPhase"></a>

### VisitorDefinitionsForPhase

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Executable snippet](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorDefinitionsForPhase<VisitorCallback> = VisitorRegistrationDefinition<VisitorCallback> | readonly VisitorRegistrationDefinition<VisitorCallback>[] | {
    groups: readonly VisitorGroupDefinition<VisitorCallback>[];
};
```

<a id="symbol-VisitorGroupDefinition"></a>

### VisitorGroupDefinition

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorGroupDefinition<VisitorCallback> = {
    visitors: readonly VisitorGroupMember<VisitorCallback>[];
    visitorCommandCommitTiming?: VisitorCommandCommitTiming;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `visitorCommandCommitTiming` | <code>VisitorCommandCommitTiming &#124; undefined</code> |
| `visitors` | <code>readonly VisitorGroupMember&lt;VisitorCallback&gt;[]</code> |

</details>

<a id="symbol-VisitorGroupMember"></a>

### VisitorGroupMember

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorGroupMember<VisitorCallback> = VisitorCallback | {
    visitor: VisitorCallback;
    descendingExecutionPriorityWithinGroup?: number;
    visitorCommandCommitTiming?: never;
    resolutionStyle?: never;
};
```

<a id="symbol-VisitorGroupMetadata"></a>

### VisitorGroupMetadata

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorGroupMetadata = Readonly<{
    groupIdentity: symbol;
    isExplicitlyDeclaredGroup: boolean;
    visitorCommandCommitTiming: VisitorCommandCommitTiming;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `groupIdentity` | <code>symbol</code> |
| `isExplicitlyDeclaredGroup` | <code>boolean</code> |
| `visitorCommandCommitTiming` | <code>VisitorCommandCommitTiming</code> |

</details>

<a id="symbol-VisitorRegistrationDefinition"></a>

### VisitorRegistrationDefinition

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorRegistrationDefinition<VisitorCallback> = VisitorCallback | ({
    visitor: VisitorCallback;
} & Partial<VisitorRegistrationOptions>);
```

<a id="symbol-VisitorRegistrationMetadata"></a>

### VisitorRegistrationMetadata

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorRegistrationMetadata = Readonly<VisitorRegistrationOptions & {
    phaseRegistrationInsertionIndex: number;
    visitorGroup?: VisitorGroupMetadata | undefined;
}>;
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `descendingExecutionPriorityWithinGroup` | <code>number</code> |
| `phaseRegistrationInsertionIndex` | <code>number</code> |
| `visitorCommandCommitTiming` | <code>VisitorCommandCommitTiming &#124; undefined</code> |
| `visitorGroup` | <code>Readonly&lt;{ groupIdentity: symbol; isExplicitlyDeclaredGroup: boolean; visitorCommandCommitTiming: VisitorCommandCommitTiming; }&gt; &#124; undefined</code> |

</details>

<a id="symbol-VisitorRegistrationOptions"></a>

### VisitorRegistrationOptions

Type-only; no runtime constructor/value. [Owning contract](reference.md#visitors-and-commands) · [Related example](reference.md#visitors-and-commands)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/core`.

```ts
export type VisitorRegistrationOptions = {
    descendingExecutionPriorityWithinGroup: number;
    visitorCommandCommitTiming?: VisitorCommandCommitTiming | undefined;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `descendingExecutionPriorityWithinGroup` | <code>number</code> |
| `visitorCommandCommitTiming` | <code>VisitorCommandCommitTiming &#124; undefined</code> |

</details>

<a id="symbol-ZeroBasedOrEndRelativeChildIndexSelection"></a>

### ZeroBasedOrEndRelativeChildIndexSelection

Type-only; no runtime constructor/value. [Owning contract](reference.md#options-and-defaults) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/configuration-patches-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export type ZeroBasedOrEndRelativeChildIndexSelection = {
    readonly indices: readonly number[];
    readonly ranges?: never;
} | {
    readonly ranges: readonly {
        readonly fromInclusive: number;
        readonly throughInclusive: number;
    }[];
    readonly indices?: never;
};
```

<details>
<summary>Resolved public members (including inherited/mapped fields)</summary>

| Member | Type |
| --- | --- |
| `indices` | <code>readonly number[] &#124; undefined</code> |
| `ranges` | <code>readonly { readonly fromInclusive: number; readonly throughInclusive: number; }[] &#124; undefined</code> |

</details>

<a id="symbol-applyDagDefinitionRevisionBatch"></a>

### applyDagDefinitionRevisionBatch

Runtime value and public type surface. [Owning contract](reference.md#validated-dag-revisions) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function applyDagDefinitionRevisionBatch<Data, VertexId = unknown>(prepared: ValidatedReusableDagTopology<Data, VertexId>, operations: readonly DagRevisionOperation<RevisionDomain<Data>, RevisionDomain<VertexId>>[]): DagRevisionResult<Data, VertexId>;
```

<a id="symbol-bindAsyncDagExternalWorkSession"></a>

### bindAsyncDagExternalWorkSession

Runtime value and public type surface. [Owning contract](reference.md#ticket-coordination) · [Related example](reference.md#bind-an-existing-runner-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function bindAsyncDagExternalWorkSession<SourceVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes, VertexId>(runner: AsyncDagTraversalRunner<SourceVertexTypes, RewrittenVertexTypes, VertexId>): AsyncDagExternalWorkSession<VertexId>;
```

<a id="symbol-bindDagExternalWorkSession"></a>

### bindDagExternalWorkSession

Runtime value and public type surface. [Owning contract](reference.md#ticket-coordination) · [Executable snippet](reference.md#bind-an-existing-runner-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function bindDagExternalWorkSession<SourceVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes, VertexId>(runner: DagTraversalRunner<SourceVertexTypes, RewrittenVertexTypes, VertexId>): DagExternalWorkSession<VertexId>;
```

<a id="symbol-breadthFirstTreeTraversal"></a>

### breadthFirstTreeTraversal

Runtime value and public type surface. [Owning contract](reference.md#api-compatibility) · [Related example](reference.md#api-compatibility)

Supported imports: `configurable-tree-traversal`.

Namespace for `configurable-tree-traversal/traversals/breadth-first-traversal`: [AsyncBreadthFirstTreeRunner](#symbol-AsyncBreadthFirstTreeRunner), [AsyncBreadthFirstTreeTraversalBuilder](#symbol-AsyncBreadthFirstTreeTraversalBuilder), [AsyncBreadthFirstTreeTraversalBuilderOptions](#symbol-AsyncBreadthFirstTreeTraversalBuilderOptions), [AsyncBreadthFirstTreeTraversalBuilderOptionsPatch](#symbol-AsyncBreadthFirstTreeTraversalBuilderOptionsPatch), [BreadthFirstTreeRunner](#symbol-BreadthFirstTreeRunner), [BreadthFirstTreeTraversalBuilder](#symbol-BreadthFirstTreeTraversalBuilder), [BreadthFirstTreeTraversalBuilderOptions](#symbol-BreadthFirstTreeTraversalBuilderOptions), [BreadthFirstTreeTraversalBuilderOptionsPatch](#symbol-BreadthFirstTreeTraversalBuilderOptionsPatch), [BreadthFirstTreeVisitPhase](#symbol-BreadthFirstTreeVisitPhase), [runTreeBreadthFirstUntilSuspendedOrTerminal](#symbol-runTreeBreadthFirstUntilSuspendedOrTerminal), [runTreeBreadthFirstUntilSuspendedOrTerminalAsync](#symbol-runTreeBreadthFirstUntilSuspendedOrTerminalAsync).

<a id="symbol-captureDagMilestoneSnapshot"></a>

### captureDagMilestoneSnapshot

Runtime value and public type surface. [Owning contract](reference.md#dag-dependency-queries-and-explanations) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function captureDagMilestoneSnapshot<SourceVertexTypes extends VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes, VertexId>(runner: DagTraversalRunner<SourceVertexTypes, RewrittenVertexTypes, VertexId> | AsyncDagTraversalRunner<SourceVertexTypes, RewrittenVertexTypes, VertexId>): DagMilestoneSnapshot<VertexId>;
```

<a id="symbol-composeAndValidateDagFragments"></a>

### composeAndValidateDagFragments

Runtime value and public type surface. [Owning contract](reference.md#dag-fragments-and-composition) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function composeAndValidateDagFragments<Data, VertexId>(instances: readonly DagFragment<Data, VertexId>[], options?: DagCompositionOptions<InferredDagId<VertexId>>): DagTopologyValidationResult<Data, VertexId>;
```

<a id="symbol-copyAndNormalizeDagDefinition"></a>

### copyAndNormalizeDagDefinition

Runtime value and public type surface. [Owning contract](reference.md#materialized-dag-definitions) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function copyAndNormalizeDagDefinition<Data, VertexId = unknown>(input: DagDefinition<Data, VertexId>): DagDefinition<Data, VertexId>;
```

<a id="symbol-core"></a>

### core

Runtime value and public type surface. [Owning contract](reference.md#api-compatibility) · [Executable snippet](reference.md#api-compatibility)

Supported imports: `configurable-tree-traversal`.

Namespace for `configurable-tree-traversal/core`: [AsyncChildHintsListTransformer](#symbol-AsyncChildHintsListTransformer), [AsyncDagDiscoverySource](#symbol-AsyncDagDiscoverySource), [AsyncTraversalExecution](#symbol-AsyncTraversalExecution), [AsyncTreeDiscoverySource](#symbol-AsyncTreeDiscoverySource), [AsyncTreeVertexPhaseVisitorCallback](#symbol-AsyncTreeVertexPhaseVisitorCallback), [ChildDiscoveryContext](#symbol-ChildDiscoveryContext), [ChildDiscoverySlot](#symbol-ChildDiscoverySlot), [ChildHintVertexIdentity](#symbol-ChildHintVertexIdentity), [ChildHintsListTransformer](#symbol-ChildHintsListTransformer), [DagChildResolutionContext](#symbol-DagChildResolutionContext), [DagDiscoverySource](#symbol-DagDiscoverySource), [DagMilestone](#symbol-DagMilestone), [DagMilestoneConstraint](#symbol-DagMilestoneConstraint), [DagPrerequisiteLookupMissing](#symbol-DagPrerequisiteLookupMissing), [DagPrerequisiteLookupResult](#symbol-DagPrerequisiteLookupResult), [DagSourceVertexResolution](#symbol-DagSourceVertexResolution), [DagStructuralDiscoveryCycleError](#symbol-DagStructuralDiscoveryCycleError), [DagTraversalStallDiagnostics](#symbol-DagTraversalStallDiagnostics), [DagTraversalStallError](#symbol-DagTraversalStallError), [FoundDagSourceVertex](#symbol-FoundDagSourceVertex), [LiveResolvedGraphView](#symbol-LiveResolvedGraphView), [LiveResolvedTreeView](#symbol-LiveResolvedTreeView), [MaybePromise](#symbol-MaybePromise), [MutableResolvedTreeStore](#symbol-MutableResolvedTreeStore), [MutableTreeVertexRecordMap](#symbol-MutableTreeVertexRecordMap), [MutableTreeVertexTopologyRecord](#symbol-MutableTreeVertexTopologyRecord), [MutableValueReference](#symbol-MutableValueReference), [OmittedDagSourceVertex](#symbol-OmittedDagSourceVertex), [PreCommandDiscoveredGraphView](#symbol-PreCommandDiscoveredGraphView), [ResolvedGraphVertexSnapshot](#symbol-ResolvedGraphVertexSnapshot), [StoredTreeReferenceVertexTypes](#symbol-StoredTreeReferenceVertexTypes), [StructuralAncestorPathOptions](#symbol-StructuralAncestorPathOptions), [StructuralChildEdge](#symbol-StructuralChildEdge), [SyncTraversalExecution](#symbol-SyncTraversalExecution), [TraversalEventKindForVisitorPhase](#symbol-TraversalEventKindForVisitorPhase), [TraversalEventNarrowedToSelectedKinds](#symbol-TraversalEventNarrowedToSelectedKinds), [TraversalExecutionSelectionPatch](#symbol-TraversalExecutionSelectionPatch), [TraversalExecutionSelections](#symbol-TraversalExecutionSelections), [TraversalExecutionSnapshot](#symbol-TraversalExecutionSnapshot), [TraversalExecutionState](#symbol-TraversalExecutionState), [TraversalRunnerStatus](#symbol-TraversalRunnerStatus), [TraversalStopReason](#symbol-TraversalStopReason), [TraversalVisitorCommand](#symbol-TraversalVisitorCommand), [TraversalVisitorCommandArguments](#symbol-TraversalVisitorCommandArguments), [TraversalVisitorCommandName](#symbol-TraversalVisitorCommandName), [TreeChildResolverContext](#symbol-TreeChildResolverContext), [TreeDiscoverySource](#symbol-TreeDiscoverySource), [TreeOrDagCallbackOperation](#symbol-TreeOrDagCallbackOperation), [TreeOrDagExecutionSnapshot](#symbol-TreeOrDagExecutionSnapshot), [TreePhaseVisitorRegistrationRecord](#symbol-TreePhaseVisitorRegistrationRecord), [TreeTraversalEvent](#symbol-TreeTraversalEvent), [TreeVertexDiscoveryMetadata](#symbol-TreeVertexDiscoveryMetadata), [TreeVertexPhaseVisitorCallback](#symbol-TreeVertexPhaseVisitorCallback), [TreeVertexResolution](#symbol-TreeVertexResolution), [TreeVertexResolutionFound](#symbol-TreeVertexResolutionFound), [TreeVertexResolutionOmitted](#symbol-TreeVertexResolutionOmitted), [TreeVertexTopologyRecordInput](#symbol-TreeVertexTopologyRecordInput), [TreeVisitorContext](#symbol-TreeVisitorContext), [TreeVisitorVertexDataMutationToolsBinder](#symbol-TreeVisitorVertexDataMutationToolsBinder), [TreeVisitorVertexDataMutationToolsBinderFactory](#symbol-TreeVisitorVertexDataMutationToolsBinderFactory), [Vertex](#symbol-Vertex), [VertexContent](#symbol-VertexContent), [VertexContentInput](#symbol-VertexContentInput), [VertexContentOverridesForShallowClone](#symbol-VertexContentOverridesForShallowClone), [VertexDataAndChildHintTypes](#symbol-VertexDataAndChildHintTypes), [VertexDataMutationCommandBuilder](#symbol-VertexDataMutationCommandBuilder), [VertexDataMutationCommandTools](#symbol-VertexDataMutationCommandTools), [VertexDataReplacementOrDeletionCommand](#symbol-VertexDataReplacementOrDeletionCommand), [VertexDataReplacementOrDeletionRequest](#symbol-VertexDataReplacementOrDeletionRequest), [VertexHandle](#symbol-VertexHandle), [VertexId](#symbol-VertexId), [VertexView](#symbol-VertexView), [VertexVisitSchedulingStage](#symbol-VertexVisitSchedulingStage), [VisitorCallbackPhaseSelection](#symbol-VisitorCallbackPhaseSelection), [VisitorCommandCommitTiming](#symbol-VisitorCommandCommitTiming), [VisitorCommandsResult](#symbol-VisitorCommandsResult), [VisitorDefinitionsForPhase](#symbol-VisitorDefinitionsForPhase), [VisitorGroupDefinition](#symbol-VisitorGroupDefinition), [VisitorGroupMember](#symbol-VisitorGroupMember), [VisitorGroupMetadata](#symbol-VisitorGroupMetadata), [VisitorRegistrationDefinition](#symbol-VisitorRegistrationDefinition), [VisitorRegistrationMetadata](#symbol-VisitorRegistrationMetadata), [VisitorRegistrationOptions](#symbol-VisitorRegistrationOptions).

<a id="symbol-createAndRunGraphWalkUntilSuspendedOrTerminal"></a>

### createAndRunGraphWalkUntilSuspendedOrTerminal

Runtime value and public type surface. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare function createAndRunGraphWalkUntilSuspendedOrTerminal<VertexData, EdgeData, VertexId>(options: GraphWalkBuilderOptions<VertexData, EdgeData, VertexId>): GraphWalkRunner<VertexData, EdgeData, VertexId>;
```

<a id="symbol-createAndRunGraphWalkUntilSuspendedOrTerminalAsync"></a>

### createAndRunGraphWalkUntilSuspendedOrTerminalAsync

Runtime value and public type surface. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare function createAndRunGraphWalkUntilSuspendedOrTerminalAsync<VertexData, EdgeData, VertexId>(options: AsyncGraphWalkBuilderOptions<VertexData, EdgeData, VertexId>): Promise<AsyncGraphWalkRunner<VertexData, EdgeData, VertexId>>;
```

<a id="symbol-createConditionalAsyncDagDataVisitor"></a>

### createConditionalAsyncDagDataVisitor

Runtime value and public type surface. [Owning contract](reference.md#filtered-dag-visitors) · [Executable snippet](reference.md#filtered-visitor-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function createConditionalAsyncDagDataVisitor<Data, NarrowedData extends Data, SourceVertexTypes extends VertexDataAndChildHintTypes<Data> = VertexDataAndChildHintTypes<Data>, RewrittenVertexTypes extends VertexDataAndChildHintTypes<Data> = SourceVertexTypes, Phase extends DagVisitorPhase = DagVisitorPhase, VertexId = unknown>(predicate: (data: Data) => data is NarrowedData, visitor: AsyncFilteredVisitor<NarrowedData, SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>): AsyncDagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>;
export declare function createConditionalAsyncDagDataVisitor<Data, SourceVertexTypes extends VertexDataAndChildHintTypes<Data> = VertexDataAndChildHintTypes<Data>, RewrittenVertexTypes extends VertexDataAndChildHintTypes<Data> = SourceVertexTypes, Phase extends DagVisitorPhase = DagVisitorPhase, VertexId = unknown>(predicate: (data: Data) => boolean, visitor: AsyncFilteredVisitor<Data, SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>): AsyncDagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>;
```

<a id="symbol-createConditionalDagDataVisitor"></a>

### createConditionalDagDataVisitor

Runtime value and public type surface. [Owning contract](reference.md#filtered-dag-visitors) · [Executable snippet](reference.md#filtered-visitor-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function createConditionalDagDataVisitor<Data, NarrowedData extends Data, SourceVertexTypes extends VertexDataAndChildHintTypes<Data> = VertexDataAndChildHintTypes<Data>, RewrittenVertexTypes extends VertexDataAndChildHintTypes<Data> = SourceVertexTypes, Phase extends DagVisitorPhase = DagVisitorPhase, VertexId = unknown>(predicate: (data: Data) => data is NarrowedData, visitor: FilteredVisitor<NarrowedData, SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>): DagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>;
export declare function createConditionalDagDataVisitor<Data, SourceVertexTypes extends VertexDataAndChildHintTypes<Data> = VertexDataAndChildHintTypes<Data>, RewrittenVertexTypes extends VertexDataAndChildHintTypes<Data> = SourceVertexTypes, Phase extends DagVisitorPhase = DagVisitorPhase, VertexId = unknown>(predicate: (data: Data) => boolean, visitor: FilteredVisitor<Data, SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>): DagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>;
```

<a id="symbol-createObjectPropertyMutationHelperBinder"></a>

### createObjectPropertyMutationHelperBinder

Runtime value and public type surface. [Owning contract](reference.md#rewrite-objects) · [Executable snippet](reference.md#rewrite-objects)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`.

```ts
createObjectPropertyMutationHelperBinder: ObjectPropertyMutationHelperBinderFactory
```

<a id="symbol-dagTraversal"></a>

### dagTraversal

Runtime value and public type surface. [Owning contract](reference.md#api-compatibility) · [Related example](reference.md#api-compatibility)

Supported imports: `configurable-tree-traversal`.

Namespace for `configurable-tree-traversal/traversals/dag-traversal`: [AsyncDagExternalWorkSession](#symbol-AsyncDagExternalWorkSession), [AsyncDagExternalWorkSessionOptions](#symbol-AsyncDagExternalWorkSessionOptions), [AsyncDagTopologyDiscoveryInput](#symbol-AsyncDagTopologyDiscoveryInput), [AsyncDagTraversalBuilder](#symbol-AsyncDagTraversalBuilder), [AsyncDagTraversalBuilderOptions](#symbol-AsyncDagTraversalBuilderOptions), [AsyncDagTraversalBuilderOptionsPatch](#symbol-AsyncDagTraversalBuilderOptionsPatch), [AsyncDagTraversalRunner](#symbol-AsyncDagTraversalRunner), [AsyncDagVisitor](#symbol-AsyncDagVisitor), [DagCommittedMilestoneEvent](#symbol-DagCommittedMilestoneEvent), [DagCompositionOptions](#symbol-DagCompositionOptions), [DagDefinition](#symbol-DagDefinition), [DagDefinitionChangeAspect](#symbol-DagDefinitionChangeAspect), [DagDefinitionDiff](#symbol-DagDefinitionDiff), [DagDefinitionIssue](#symbol-DagDefinitionIssue), [DagDefinitionVertex](#symbol-DagDefinitionVertex), [DagDefinitionVertexChange](#symbol-DagDefinitionVertexChange), [DagExternalWorkRunBoundary](#symbol-DagExternalWorkRunBoundary), [DagExternalWorkSession](#symbol-DagExternalWorkSession), [DagExternalWorkSessionControl](#symbol-DagExternalWorkSessionControl), [DagExternalWorkSessionOptions](#symbol-DagExternalWorkSessionOptions), [DagFragment](#symbol-DagFragment), [DagFragmentValidationError](#symbol-DagFragmentValidationError), [DagMilestone](#symbol-DagMilestone), [DagMilestoneBlocker](#symbol-DagMilestoneBlocker), [DagMilestoneConstraint](#symbol-DagMilestoneConstraint), [DagMilestoneExplanation](#symbol-DagMilestoneExplanation), [DagMilestoneQueryOptions](#symbol-DagMilestoneQueryOptions), [DagMilestoneQueryResult](#symbol-DagMilestoneQueryResult), [DagMilestoneSnapshot](#symbol-DagMilestoneSnapshot), [DagMilestoneStatus](#symbol-DagMilestoneStatus), [DagProgressSnapshot](#symbol-DagProgressSnapshot), [DagRevisionOperation](#symbol-DagRevisionOperation), [DagRevisionResult](#symbol-DagRevisionResult), [DagSchedulingOptions](#symbol-DagSchedulingOptions), [DagSettlementOutcome](#symbol-DagSettlementOutcome), [DagSettlementReceipt](#symbol-DagSettlementReceipt), [DagStructuralDiscoveryCycleError](#symbol-DagStructuralDiscoveryCycleError), [DagStructuralDiscoverySlot](#symbol-DagStructuralDiscoverySlot), [DagTopologyDiscoveryInput](#symbol-DagTopologyDiscoveryInput), [DagTopologyDiscoveryOptions](#symbol-DagTopologyDiscoveryOptions), [DagTopologyValidationResult](#symbol-DagTopologyValidationResult), [DagTraversalBuilder](#symbol-DagTraversalBuilder), [DagTraversalBuilderOptions](#symbol-DagTraversalBuilderOptions), [DagTraversalBuilderOptionsPatch](#symbol-DagTraversalBuilderOptionsPatch), [DagTraversalRunner](#symbol-DagTraversalRunner), [DagTraversalStallDiagnostics](#symbol-DagTraversalStallDiagnostics), [DagTraversalStallError](#symbol-DagTraversalStallError), [DagVertexProgress](#symbol-DagVertexProgress), [DagVisitor](#symbol-DagVisitor), [DagVisitorContext](#symbol-DagVisitorContext), [DagVisitorPhase](#symbol-DagVisitorPhase), [DagWorkAwaitingSettlement](#symbol-DagWorkAwaitingSettlement), [DagWorkSettlementTicket](#symbol-DagWorkSettlementTicket), [DagWorkSettlementToken](#symbol-DagWorkSettlementToken), [DagWorkState](#symbol-DagWorkState), [ValidatedDagTopologyAsyncRunnerOptions](#symbol-ValidatedDagTopologyAsyncRunnerOptions), [ValidatedDagTopologyLiveVertexSummary](#symbol-ValidatedDagTopologyLiveVertexSummary), [ValidatedDagTopologyRunnerOptions](#symbol-ValidatedDagTopologyRunnerOptions), [ValidatedReusableDagTopology](#symbol-ValidatedReusableDagTopology), [applyDagDefinitionRevisionBatch](#symbol-applyDagDefinitionRevisionBatch), [bindAsyncDagExternalWorkSession](#symbol-bindAsyncDagExternalWorkSession), [bindDagExternalWorkSession](#symbol-bindDagExternalWorkSession), [captureDagMilestoneSnapshot](#symbol-captureDagMilestoneSnapshot), [composeAndValidateDagFragments](#symbol-composeAndValidateDagFragments), [copyAndNormalizeDagDefinition](#symbol-copyAndNormalizeDagDefinition), [createConditionalAsyncDagDataVisitor](#symbol-createConditionalAsyncDagDataVisitor), [createConditionalDagDataVisitor](#symbol-createConditionalDagDataVisitor), [diffDagDefinitionDeclarationsShallowly](#symbol-diffDagDefinitionDeclarationsShallowly), [discoverValidateAndCaptureDag](#symbol-discoverValidateAndCaptureDag), [discoverValidateAndCaptureDagAsync](#symbol-discoverValidateAndCaptureDagAsync), [hasExactlyOneResolvedStructuralLeaf](#symbol-hasExactlyOneResolvedStructuralLeaf), [mapDagFragmentIds](#symbol-mapDagFragmentIds), [traverseDag](#symbol-traverseDag), [traverseDagAsync](#symbol-traverseDagAsync), [validateAndCreateDagFragment](#symbol-validateAndCreateDagFragment), [validateAndPrepareDagDefinition](#symbol-validateAndPrepareDagDefinition).

<a id="symbol-depthFirstTreeTraversal"></a>

### depthFirstTreeTraversal

Runtime value and public type surface. [Owning contract](reference.md#api-compatibility) · [Related example](reference.md#api-compatibility)

Supported imports: `configurable-tree-traversal`.

Namespace for `configurable-tree-traversal/traversals/depth-first-traversal`: [AsyncDepthFirstTreeRunner](#symbol-AsyncDepthFirstTreeRunner), [AsyncDepthFirstTreeTraversalBuilder](#symbol-AsyncDepthFirstTreeTraversalBuilder), [AsyncDepthFirstTreeTraversalBuilderOptions](#symbol-AsyncDepthFirstTreeTraversalBuilderOptions), [AsyncDepthFirstTreeTraversalBuilderOptionsPatch](#symbol-AsyncDepthFirstTreeTraversalBuilderOptionsPatch), [DepthFirstChildBoundaryVisitOptions](#symbol-DepthFirstChildBoundaryVisitOptions), [DepthFirstTreeRunner](#symbol-DepthFirstTreeRunner), [DepthFirstTreeTraversalBuilder](#symbol-DepthFirstTreeTraversalBuilder), [DepthFirstTreeTraversalBuilderOptions](#symbol-DepthFirstTreeTraversalBuilderOptions), [DepthFirstTreeTraversalBuilderOptionsPatch](#symbol-DepthFirstTreeTraversalBuilderOptionsPatch), [DepthFirstTreeVisitPhase](#symbol-DepthFirstTreeVisitPhase), [ZeroBasedOrEndRelativeChildIndexSelection](#symbol-ZeroBasedOrEndRelativeChildIndexSelection), [runTreeDepthFirstUntilSuspendedOrTerminal](#symbol-runTreeDepthFirstUntilSuspendedOrTerminal), [runTreeDepthFirstUntilSuspendedOrTerminalAsync](#symbol-runTreeDepthFirstUntilSuspendedOrTerminalAsync).

<a id="symbol-diffDagDefinitionDeclarationsShallowly"></a>

### diffDagDefinitionDeclarationsShallowly

Runtime value and public type surface. [Owning contract](reference.md#validated-dag-revisions) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function diffDagDefinitionDeclarationsShallowly<BeforeData, AfterData, VertexId = unknown>(before: DagDefinition<BeforeData, VertexId>, after: DagDefinition<AfterData, VertexId>): DagDefinitionDiff<VertexId>;
```

<a id="symbol-discoverValidateAndCaptureDag"></a>

### discoverValidateAndCaptureDag

Runtime value and public type surface. [Owning contract](reference.md#reusable-prepared-dags) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function discoverValidateAndCaptureDag<SourceVertexTypes extends VertexDataAndChildHintTypes, VertexId = unknown>(input: DagTopologyDiscoveryInput<SourceVertexTypes, VertexId>): DagTopologyValidationResult<SourceVertexTypes['VertexData'], VertexId>;
```

<a id="symbol-discoverValidateAndCaptureDagAsync"></a>

### discoverValidateAndCaptureDagAsync

Runtime value and public type surface. [Owning contract](reference.md#reusable-prepared-dags) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function discoverValidateAndCaptureDagAsync<SourceVertexTypes extends VertexDataAndChildHintTypes, VertexId = unknown>(input: DagTopologyDiscoveryInput<SourceVertexTypes, VertexId> & {
    maxConcurrentCallbackInvocations?: number;
}): Promise<DagTopologyValidationResult<SourceVertexTypes['VertexData'], VertexId>>;
export declare function discoverValidateAndCaptureDagAsync<SourceVertexTypes extends VertexDataAndChildHintTypes, VertexId = unknown>(input: AsyncDagTopologyDiscoveryInput<SourceVertexTypes, VertexId>): Promise<DagTopologyValidationResult<SourceVertexTypes['VertexData'], VertexId>>;
```

<a id="symbol-graphWalk"></a>

### graphWalk

Runtime value and public type surface. [Owning contract](reference.md#api-compatibility) · [Related example](reference.md#api-compatibility)

Supported imports: `configurable-tree-traversal`.

Namespace for `configurable-tree-traversal/traversals/graph-walk`: [AsyncGraphWalkBuilder](#symbol-AsyncGraphWalkBuilder), [AsyncGraphWalkBuilderOptions](#symbol-AsyncGraphWalkBuilderOptions), [AsyncGraphWalkBuilderOptionsPatch](#symbol-AsyncGraphWalkBuilderOptionsPatch), [AsyncGraphWalkDiscoverySource](#symbol-AsyncGraphWalkDiscoverySource), [AsyncGraphWalkLinkTargetAdmissionPredicate](#symbol-AsyncGraphWalkLinkTargetAdmissionPredicate), [AsyncGraphWalkRecordMaterializationOptions](#symbol-AsyncGraphWalkRecordMaterializationOptions), [AsyncGraphWalkRunner](#symbol-AsyncGraphWalkRunner), [AsyncGraphWalkVertexOccurrenceExpansionPredicate](#symbol-AsyncGraphWalkVertexOccurrenceExpansionPredicate), [AsyncGraphWalkVisitor](#symbol-AsyncGraphWalkVisitor), [GraphWalkBuilder](#symbol-GraphWalkBuilder), [GraphWalkBuilderOptions](#symbol-GraphWalkBuilderOptions), [GraphWalkBuilderOptionsPatch](#symbol-GraphWalkBuilderOptionsPatch), [GraphWalkCatalogOutgoingLinkToVertexId](#symbol-GraphWalkCatalogOutgoingLinkToVertexId), [GraphWalkDagDeclarationRelation](#symbol-GraphWalkDagDeclarationRelation), [GraphWalkDiscoverySource](#symbol-GraphWalkDiscoverySource), [GraphWalkEdge](#symbol-GraphWalkEdge), [GraphWalkEvent](#symbol-GraphWalkEvent), [GraphWalkEventForObservationKind](#symbol-GraphWalkEventForObservationKind), [GraphWalkExpansionOrder](#symbol-GraphWalkExpansionOrder), [GraphWalkExplorationLimits](#symbol-GraphWalkExplorationLimits), [GraphWalkInspection](#symbol-GraphWalkInspection), [GraphWalkLinkTargetAdmissionContext](#symbol-GraphWalkLinkTargetAdmissionContext), [GraphWalkLinkTargetAdmissionPredicate](#symbol-GraphWalkLinkTargetAdmissionPredicate), [GraphWalkObservationKind](#symbol-GraphWalkObservationKind), [GraphWalkOutgoingLink](#symbol-GraphWalkOutgoingLink), [GraphWalkPendingInvocationOperation](#symbol-GraphWalkPendingInvocationOperation), [GraphWalkProgressCounts](#symbol-GraphWalkProgressCounts), [GraphWalkProgressSnapshot](#symbol-GraphWalkProgressSnapshot), [GraphWalkRecordMaterializationOptions](#symbol-GraphWalkRecordMaterializationOptions), [GraphWalkResolvedVertex](#symbol-GraphWalkResolvedVertex), [GraphWalkRouteEnumerationAndRequiredBounds](#symbol-GraphWalkRouteEnumerationAndRequiredBounds), [GraphWalkRouteEnumerationContext](#symbol-GraphWalkRouteEnumerationContext), [GraphWalkRouteEnumerationPolicy](#symbol-GraphWalkRouteEnumerationPolicy), [GraphWalkRoutePrefixEvent](#symbol-GraphWalkRoutePrefixEvent), [GraphWalkRunner](#symbol-GraphWalkRunner), [GraphWalkTerminalOutcome](#symbol-GraphWalkTerminalOutcome), [GraphWalkVertexOccurrenceExpansionContext](#symbol-GraphWalkVertexOccurrenceExpansionContext), [GraphWalkVertexOccurrenceExpansionPredicate](#symbol-GraphWalkVertexOccurrenceExpansionPredicate), [GraphWalkVertexResolutionMode](#symbol-GraphWalkVertexResolutionMode), [GraphWalkVertexResolutionResult](#symbol-GraphWalkVertexResolutionResult), [GraphWalkVertexResolutionTarget](#symbol-GraphWalkVertexResolutionTarget), [GraphWalkVisitor](#symbol-GraphWalkVisitor), [GraphWalkVisitorContext](#symbol-GraphWalkVisitorContext), [GraphWalkVisitorResult](#symbol-GraphWalkVisitorResult), [createAndRunGraphWalkUntilSuspendedOrTerminal](#symbol-createAndRunGraphWalkUntilSuspendedOrTerminal), [createAndRunGraphWalkUntilSuspendedOrTerminalAsync](#symbol-createAndRunGraphWalkUntilSuspendedOrTerminalAsync), [materializeGraphWalkSourceFromDagDeclarationRelations](#symbol-materializeGraphWalkSourceFromDagDeclarationRelations), [materializeGraphWalkSourceFromVertexRecords](#symbol-materializeGraphWalkSourceFromVertexRecords), [materializeSynchronousGraphWalkSourceFromAsyncRecords](#symbol-materializeSynchronousGraphWalkSourceFromAsyncRecords).

<a id="symbol-hasExactlyOneResolvedStructuralLeaf"></a>

### hasExactlyOneResolvedStructuralLeaf

Runtime value and public type surface. [Owning contract](reference.md#dag-traversal) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-workflow-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function hasExactlyOneResolvedStructuralLeaf<SourceVertexTypes extends VertexDataAndChildHintTypes>(graph: PreCommandDiscoveredGraphView<SourceVertexTypes>): boolean;
```

<a id="symbol-mapDagFragmentIds"></a>

### mapDagFragmentIds

Runtime value and public type surface. [Owning contract](reference.md#dag-fragments-and-composition) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function mapDagFragmentIds<Data, VertexId, PortName extends string, MappedVertexId>(fragment: DagFragment<Data, VertexId, PortName>, options: {
    mapId: (vertexId: VertexId) => MappedVertexId;
}): DagFragment<Data, MappedVertexId, PortName>;
```

<a id="symbol-materializeDagInputFromRootRecords"></a>

### materializeDagInputFromRootRecords

Runtime value and public type surface. [Owning contract](reference.md#collection-and-forest-sources) · [Executable snippet](reference.md#roots-materialization-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/dag-input-materialization`.

```ts
export declare function materializeDagInputFromRootRecords<Item, VertexId>(roots: Iterable<Item>, selectors: DagRootRecordSelectors<Item, VertexId>): MaterializedDagTraversalInput<Item, VertexId>;
```

<a id="symbol-materializeDagInputFromRootRecordsAsync"></a>

### materializeDagInputFromRootRecordsAsync

Runtime value and public type surface. [Owning contract](reference.md#collection-and-forest-sources) · [Executable snippet](reference.md#roots-materialization-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/dag-input-materialization`.

```ts
export declare function materializeDagInputFromRootRecordsAsync<Item, VertexId>(roots: SyncOrAsyncIterable<Item>, selectors: AsyncDagRootRecordSelectors<Item, VertexId>): Promise<MaterializedDagTraversalInput<Item, VertexId>>;
```

<a id="symbol-materializeGraphWalkSourceFromDagDeclarationRelations"></a>

### materializeGraphWalkSourceFromDagDeclarationRelations

Runtime value and public type surface. [Owning contract](reference.md#walking-adapters-and-inspection) · [Executable snippet](reference.md#definition-walk-example)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare function materializeGraphWalkSourceFromDagDeclarationRelations<VertexData, VertexId>(definition: DagDefinition<VertexData, VertexId>, options: {
    includeDeclarationRelations: readonly [
        DagDeclarationRelationSelection,
        ...DagDeclarationRelationSelection[]
    ];
}): Extract<GraphWalkDiscoverySource<VertexData, GraphWalkDagDeclarationRelation, VertexId>, {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution';
}>;
```

<a id="symbol-materializeGraphWalkSourceFromVertexRecords"></a>

### materializeGraphWalkSourceFromVertexRecords

Runtime value and public type surface. [Owning contract](reference.md#general-graph-walking) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-paths-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare function materializeGraphWalkSourceFromVertexRecords<VertexData, EdgeData, VertexId>(vertexRecords: Iterable<VertexData>, options: GraphWalkRecordMaterializationOptions<VertexData, EdgeData, VertexId>): Extract<GraphWalkDiscoverySource<VertexData, EdgeData, VertexId>, {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution';
}>;
```

<a id="symbol-materializeMultiEntryDagInputFromRecordCatalog"></a>

### materializeMultiEntryDagInputFromRecordCatalog

Runtime value and public type surface. [Owning contract](reference.md#collection-and-forest-sources) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/quickstart-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/dag-input-materialization`.

```ts
export declare function materializeMultiEntryDagInputFromRecordCatalog<Item, VertexId>(items: Iterable<Item>, selectors: DagRecordSelectors<Item, VertexId>): MaterializedDagTraversalInput<Item, VertexId>;
```

<a id="symbol-materializeMultiEntryDagInputFromRecordCatalogAsync"></a>

### materializeMultiEntryDagInputFromRecordCatalogAsync

Runtime value and public type surface. [Owning contract](reference.md#collection-and-forest-sources) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/quickstart-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/dag-input-materialization`.

```ts
export declare function materializeMultiEntryDagInputFromRecordCatalogAsync<Item, VertexId>(items: SyncOrAsyncIterable<Item>, selectors: AsyncDagRecordSelectors<Item, VertexId>): Promise<MaterializedDagTraversalInput<Item, VertexId>>;
```

<a id="symbol-materializeSynchronousGraphWalkSourceFromAsyncRecords"></a>

### materializeSynchronousGraphWalkSourceFromAsyncRecords

Runtime value and public type surface. [Owning contract](reference.md#general-graph-walking) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/graph-walk`.

```ts
export declare function materializeSynchronousGraphWalkSourceFromAsyncRecords<VertexData, EdgeData, VertexId>(vertexRecords: Iterable<VertexData> | AsyncIterable<VertexData>, options: AsyncGraphWalkRecordMaterializationOptions<VertexData, EdgeData, VertexId>): Promise<Extract<GraphWalkDiscoverySource<VertexData, EdgeData, VertexId>, {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution';
}>>;
```

<a id="symbol-objectPropertyTree"></a>

### objectPropertyTree

Runtime value and public type surface. [Owning contract](reference.md#api-compatibility) · [Related example](reference.md#api-compatibility)

Supported imports: `configurable-tree-traversal`.

Namespace for `configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree`: [BoundObjectPropertyMutationHelpers](#symbol-BoundObjectPropertyMutationHelpers), [LiveObjectPropertyVertexTypes](#symbol-LiveObjectPropertyVertexTypes), [NestedObjectOrArray](#symbol-NestedObjectOrArray), [ObjectChildPropertyResolutionOverrideResult](#symbol-ObjectChildPropertyResolutionOverrideResult), [ObjectMutationOptions](#symbol-ObjectMutationOptions), [ObjectPropertyAssemblyCache](#symbol-ObjectPropertyAssemblyCache), [ObjectPropertyAssemblyClassification](#symbol-ObjectPropertyAssemblyClassification), [ObjectPropertyKey](#symbol-ObjectPropertyKey), [ObjectPropertyKeyValuePatch](#symbol-ObjectPropertyKeyValuePatch), [ObjectPropertyMutationHelperBinder](#symbol-ObjectPropertyMutationHelperBinder), [ObjectPropertyMutationHelperBinderFactory](#symbol-ObjectPropertyMutationHelperBinderFactory), [ObjectPropertyRecord](#symbol-ObjectPropertyRecord), [ObjectPropertyRewriteRequest](#symbol-ObjectPropertyRewriteRequest), [ObjectPropertyTreeAdapters](#symbol-ObjectPropertyTreeAdapters), [ObjectPropertyTreeSource](#symbol-ObjectPropertyTreeSource), [ObjectPropertyTreeSourceOptions](#symbol-ObjectPropertyTreeSourceOptions), [ObjectPropertyTreeVertexTypes](#symbol-ObjectPropertyTreeVertexTypes), [createObjectPropertyMutationHelperBinder](#symbol-createObjectPropertyMutationHelperBinder).

<a id="symbol-objectRewrite"></a>

### objectRewrite

Runtime value and public type surface. [Owning contract](reference.md#api-compatibility) · [Related example](reference.md#api-compatibility)

Supported imports: `configurable-tree-traversal`.

Namespace for `configurable-tree-traversal/tools/rewrite-object`: [ObjectPropertyPostOrderRewriteCallback](#symbol-ObjectPropertyPostOrderRewriteCallback), [ObjectPropertyRewriteContext](#symbol-ObjectPropertyRewriteContext), [ObjectPropertyRewriteInput](#symbol-ObjectPropertyRewriteInput), [ObjectPropertyRewriteOptions](#symbol-ObjectPropertyRewriteOptions), [ObjectPropertyRewriteResult](#symbol-ObjectPropertyRewriteResult), [ObjectRewriteOutputResult](#symbol-ObjectRewriteOutputResult), [PresentRootOutputConverter](#symbol-PresentRootOutputConverter), [rewriteObject](#symbol-rewriteObject), [rewriteObjectWithAssertedOutputType](#symbol-rewriteObjectWithAssertedOutputType).

<a id="symbol-rewriteObject"></a>

### rewriteObject

Runtime value and public type surface. [Owning contract](reference.md#rewrite-objects) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export declare function rewriteObject<InputValue = NestedObjectOrArray<ObjectPropertyKey, unknown>, InputPropertyKey extends ObjectPropertyKey = ObjectPropertyKey, InputPropertyValue = unknown, OutputValue = unknown, RewrittenPropertyKey extends ObjectPropertyKey = InputPropertyKey, RewrittenPropertyValue = InputPropertyValue>(object: InputValue, ...args: Record<never, never> extends ObjectPropertyRewriteOptions<InputValue, InputPropertyKey, InputPropertyValue, OutputValue, RewrittenPropertyKey, RewrittenPropertyValue> ? [
    options?: ObjectPropertyRewriteOptions<InputValue, InputPropertyKey, InputPropertyValue, OutputValue, RewrittenPropertyKey, RewrittenPropertyValue>
] : [
    options: ObjectPropertyRewriteOptions<InputValue, InputPropertyKey, InputPropertyValue, OutputValue, RewrittenPropertyKey, RewrittenPropertyValue>
]): ObjectPropertyRewriteResult<InputPropertyKey, InputPropertyValue, OutputValue, RewrittenPropertyKey, RewrittenPropertyValue>;
```

<a id="symbol-rewriteObjectWithAssertedOutputType"></a>

### rewriteObjectWithAssertedOutputType

Runtime value and public type surface. [Owning contract](reference.md#rewrite-objects) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/tools/rewrite-object`.

```ts
export declare function rewriteObjectWithAssertedOutputType<OutputValue>(object: unknown, options?: ObjectPropertyRewriteOptions<unknown, ObjectPropertyKey, unknown, unknown, ObjectPropertyKey, unknown>): ObjectPropertyRewriteResult<ObjectPropertyKey, unknown, OutputValue, ObjectPropertyKey, unknown>;
```

<a id="symbol-runTreeBreadthFirstUntilSuspendedOrTerminal"></a>

### runTreeBreadthFirstUntilSuspendedOrTerminal

Runtime value and public type surface. [Owning contract](reference.md#breadth-first-traversal) · [Executable snippet](reference.md#breadth-first-traversal)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export declare function runTreeBreadthFirstUntilSuspendedOrTerminal<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes>(options: BreadthFirstTreeTraversalBuilderOptions<InputVertexTypes, RewrittenVertexTypes>): BreadthFirstTreeRunner<InputVertexTypes, RewrittenVertexTypes>;
```

<a id="symbol-runTreeBreadthFirstUntilSuspendedOrTerminalAsync"></a>

### runTreeBreadthFirstUntilSuspendedOrTerminalAsync

Runtime value and public type surface. [Owning contract](reference.md#breadth-first-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/breadth-first-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/breadth-first-traversal`.

```ts
export declare function runTreeBreadthFirstUntilSuspendedOrTerminalAsync<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes>(options: AsyncBreadthFirstTreeTraversalBuilderOptions<InputVertexTypes, RewrittenVertexTypes>): Promise<AsyncBreadthFirstTreeRunner<InputVertexTypes, RewrittenVertexTypes>>;
```

<a id="symbol-runTreeDepthFirstUntilSuspendedOrTerminal"></a>

### runTreeDepthFirstUntilSuspendedOrTerminal

Runtime value and public type surface. [Owning contract](reference.md#traversal-orders) · [Executable snippet](reference.md#ordered-visitor-groups)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export declare function runTreeDepthFirstUntilSuspendedOrTerminal<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes>(options: DepthFirstTreeTraversalBuilderOptions<InputVertexTypes, RewrittenVertexTypes>): DepthFirstTreeRunner<InputVertexTypes, RewrittenVertexTypes>;
```

<a id="symbol-runTreeDepthFirstUntilSuspendedOrTerminalAsync"></a>

### runTreeDepthFirstUntilSuspendedOrTerminalAsync

Runtime value and public type surface. [Owning contract](reference.md#traversal-orders) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/async-adapter-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/depth-first-traversal`.

```ts
export declare function runTreeDepthFirstUntilSuspendedOrTerminalAsync<InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes>(options: AsyncDepthFirstTreeTraversalBuilderOptions<InputVertexTypes, RewrittenVertexTypes>): Promise<AsyncDepthFirstTreeRunner<InputVertexTypes, RewrittenVertexTypes>>;
```

<a id="symbol-traverseDag"></a>

### traverseDag

Runtime value and public type surface. [Owning contract](reference.md#dag-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-workflow-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function traverseDag<SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, VertexId = unknown>(options: DagTraversalBuilderOptions<SourceVertexTypes, RewrittenVertexTypes, VertexId>): DagTraversalRunner<SourceVertexTypes, RewrittenVertexTypes, VertexId>;
```

<a id="symbol-traverseDagAsync"></a>

### traverseDagAsync

Runtime value and public type surface. [Owning contract](reference.md#dag-traversal) · [Related example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-prerequisite-resolution-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function traverseDagAsync<SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes, RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes, VertexId = unknown>(options: AsyncDagTraversalBuilderOptions<SourceVertexTypes, RewrittenVertexTypes, VertexId>): Promise<AsyncDagTraversalRunner<SourceVertexTypes, RewrittenVertexTypes, VertexId>>;
```

<a id="symbol-validateAndCreateDagFragment"></a>

### validateAndCreateDagFragment

Runtime value and public type surface. [Owning contract](reference.md#dag-fragments-and-composition) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function validateAndCreateDagFragment<Data, VertexId, PortName extends string>(definition: DagDefinition<Data, VertexId>, vertexIdsByPortName: Readonly<Record<PortName, InferredDagId<VertexId>>>): DagFragment<Data, VertexId, PortName>;
```

<a id="symbol-validateAndPrepareDagDefinition"></a>

### validateAndPrepareDagDefinition

Runtime value and public type surface. [Owning contract](reference.md#materialized-dag-definitions) · [Runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts)

Supported imports: `configurable-tree-traversal`, `configurable-tree-traversal/traversals/dag-traversal`.

```ts
export declare function validateAndPrepareDagDefinition<Data, VertexId = unknown>(input: DagDefinition<Data, VertexId>): DagTopologyValidationResult<Data, VertexId>;
```

