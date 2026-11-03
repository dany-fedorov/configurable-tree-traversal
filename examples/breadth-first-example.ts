import {
  ObjectPropertyTreeSource,
  BreadthFirstTreeTraversalBuilder,
  BreadthFirstTreeVisitPhase,
} from '../src';

const input = {
  first: { firstChild: 1 },
  second: { secondChild: 2 },
};

const traversal = new BreadthFirstTreeTraversalBuilder({
  treeDiscoverySource: new ObjectPropertyTreeSource(input),
});

traversal.registerVisitorCallbackForPhase(
  BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  (vertex) => console.log(vertex.getVertexData()),
);

traversal
  .createIndependentRunnerFromCurrentOptions()
  .runUntilSuspendedOrTerminal();
