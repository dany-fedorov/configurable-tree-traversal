import {
  DepthFirstTreeTraversalBuilder,
  ObjectPropertyTreeSource,
  DepthFirstTreeVisitPhase,
} from '../src';

const traversal = new DepthFirstTreeTraversalBuilder({
  treeDiscoverySource: new ObjectPropertyTreeSource(['a', 'b', 'c', 'd']),
  childBoundaryVisits: { visitAfterChildIndices: { indices: [0, 2] } },
});
traversal.patchOptionsForFutureRunners({
  treeDiscoverySource: undefined,
  childBoundaryVisits: {
    visitAfterChildIndices: undefined,
    visitAfterChildIndicesWhenPrimarySelectionIsEmpty: { indices: [-1] },
  },
  visitors: { AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES: undefined },
});
const boundaries = [
  ...traversal
    .createIndependentRunnerFromCurrentOptions()
    .runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [
        DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
      ],
    }),
];
console.log(
  boundaries.map((event) => event.vertex.getVertexData().propertyKey),
);
