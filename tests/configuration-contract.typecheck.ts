import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  GraphWalkBuilder,
  type TreeDiscoverySource,
  type VertexDataAndChildHintTypes,
  type DepthFirstTreeTraversalBuilderOptionsPatch,
  type DepthFirstChildBoundaryVisitOptions,
} from '../src';
const tree: TreeDiscoverySource<VertexDataAndChildHintTypes> = {
  resolveRootVertex: () => ({ kind: 'vertexIntentionallyOmitted' }),
  resolveChildVertexFromHint: () => ({ kind: 'vertexIntentionallyOmitted' }),
};
const patch: DepthFirstTreeTraversalBuilderOptionsPatch = {
  treeDiscoverySource: undefined,
  transformChildHintsBeforeResolution: undefined,
  childBoundaryVisits: {
    visitAfterChildIndices: undefined,
    alsoVisitAfterOnlyChild: undefined,
  },
  visitors: { BEFORE_CHILD_EXPANSION: undefined },
};
new DepthFirstTreeTraversalBuilder({
  treeDiscoverySource: tree,
}).patchOptionsForFutureRunners(patch);
new AsyncDepthFirstTreeTraversalBuilder({
  treeDiscoverySource: tree,
}).patchOptionsForFutureRunners({
  ...patch,
  maxConcurrentCallbackInvocations: undefined,
});
new BreadthFirstTreeTraversalBuilder({
  treeDiscoverySource: tree,
}).patchOptionsForFutureRunners({
  treeDiscoverySource: undefined,
  visitors: { AT_LEVEL_ORDER_VERTEX: undefined },
});
new AsyncBreadthFirstTreeTraversalBuilder({
  treeDiscoverySource: tree,
}).patchOptionsForFutureRunners({
  maxConcurrentCallbackInvocations: undefined,
});
new DagTraversalBuilder({
  treeDiscoverySource: tree,
}).patchOptionsForFutureRunners({
  discoveryTiming: undefined,
  workCompletionPolicy: undefined,
  visitors: { ON_WORK_READY: undefined },
});
new AsyncDagTraversalBuilder({
  treeDiscoverySource: tree,
}).patchOptionsForFutureRunners({
  maxConcurrentCallbackInvocations: undefined,
  acceptedCompletedWorkVertexIds: undefined,
});
new GraphWalkBuilder({
  graphWalkDiscoverySource: {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
    enumerateRootTargets: () => [],
    enumerateOutgoingLinks: () => [],
  },
}).patchOptionsForFutureRunners({
  graphWalkDiscoverySource: undefined,
  expansionOrder: undefined,
  replaceLimits: undefined,
  routeEnumerationPolicy: undefined,
  visitorsByObservationKind: { vertexOccurrence: undefined },
});
const inOrder: Partial<DepthFirstChildBoundaryVisitOptions> = {
  visitAfterChildIndices: { indices: [0, 2] },
  visitAfterChildIndicesWhenPrimarySelectionIsEmpty: {
    ranges: [{ fromInclusive: -2, throughInclusive: -1 }],
  },
};
void inOrder;
const ambiguous: Partial<DepthFirstChildBoundaryVisitOptions> = {
  // @ts-expect-error ambiguous tuples are removed
  visitAfterChildIndices: [0, 2],
};
const conflicting: Partial<DepthFirstChildBoundaryVisitOptions> = {
  // @ts-expect-error a selection must choose one tag
  visitAfterChildIndices: { indices: [0], ranges: [] },
};
void ambiguous;
void conflicting;

const optionalPathOptions: import('../src').StructuralAncestorPathOptions = {
  includeDesignatedRoot: undefined,
  includeTargetVertex: undefined,
};
void optionalPathOptions;
