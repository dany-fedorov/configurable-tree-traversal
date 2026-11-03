import {
  BreadthFirstTreeVisitPhase,
  DepthFirstTreeVisitPhase,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  runTreeBreadthFirstUntilSuspendedOrTerminalAsync,
} from '../src';
import { runTreeDepthFirstUntilSuspendedOrTerminalAsync } from '../src/traversals/depth-first-traversal';
import type { AsyncTreeDiscoverySource } from '../src/core/AsyncTraversableTree';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';

type TestTree = VertexDataAndChildHintTypes<string, string>;

function tree(root: string): AsyncTreeDiscoverySource<TestTree> {
  return {
    resolveRootVertex: async () => ({
      kind: "vertexResolved" as const,
      resolvedVertexInput: { vertexContentInput: { $vertexData: root, $childDiscoveryHints: [] } },
    }),
    resolveChildVertexFromHint: async () => ({ kind: "vertexIntentionallyOmitted" as const }),
  };
}

test('async tree helpers run with omitted visitors and configured source options', async () => {
  const depthRunner = await runTreeDepthFirstUntilSuspendedOrTerminalAsync({
    ...{
      treeDiscoverySource: tree('config'),
    },
  });

  expect(depthRunner.getTraversalLifecycleStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(
    depthRunner.getLiveResolvedGraphView().getDesignatedRootHandleOrNull()?.getCurrentVertexView().getVertexData(),
  ).toBe('config');

  const breadthRunner = await runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
    treeDiscoverySource: tree('root'),
  });
  expect(breadthRunner.getTraversalLifecycleStatus()).toBe(TraversalRunnerStatus.FINISHED);
});

test('async breadth-first helper registers its visitor and returns a halted runner', async () => {
  const visits: string[] = [];
  const runner = await runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
    treeDiscoverySource: tree('root'),
    visitors: {
      AT_LEVEL_ORDER_VERTEX: async (vertex) => {
        visits.push(vertex.getVertexData());
        return {
          commands: [
            { commandName: TraversalVisitorCommandName.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
          ],
        };
      },
    },
  });

  expect(visits).toEqual(['root']);
  expect(runner.getTraversalLifecycleStatus()).toBe(TraversalRunnerStatus.SUSPENDED);
  expect(runner.captureExecutionSnapshot().traversalAlgorithm).toBe('breadth-first');
  expect(BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX).toBe('AT_LEVEL_ORDER_VERTEX');
});

test('async depth-first helper registers each named visitor', async () => {
  const orders: DepthFirstTreeVisitPhase[] = [];
  const runner = await runTreeDepthFirstUntilSuspendedOrTerminalAsync({
    treeDiscoverySource: tree('root'),
    visitors: {
      BEFORE_CHILD_EXPANSION: async (_vertex, options) => {
        orders.push(options.visitorPhase);
      },
      AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES: async (_vertex, options) => {
        orders.push(options.visitorPhase);
      },
      AFTER_CHILD_SUBTREES: async (_vertex, options) => {
        orders.push(options.visitorPhase);
      },
    },
  });

  expect(orders).toEqual([
    DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
    DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
  ]);
  expect(runner.getTraversalLifecycleStatus()).toBe(TraversalRunnerStatus.FINISHED);
});
