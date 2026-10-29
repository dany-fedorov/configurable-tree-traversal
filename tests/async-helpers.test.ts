import {
  BreadthFirstPhase,
  DepthFirstPhase,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  traverseTreeBreadthFirstAsync,
} from '../src';
import { traverseTreeDepthFirstAsync } from '../src/traversals/depth-first-traversal';
import type { AsyncTreeSource } from '../src/core/AsyncTraversableTree';
import type { VertexTypes } from '../src/core/TreeTypeParameters';

type TestTree = VertexTypes<string, string>;

function tree(root: string): AsyncTreeSource<TestTree> {
  return {
    resolveRoot: async () => ({
      kind: 'found' as const,
      vertex: { vertexContent: { $data: root, $childHints: [] } },
    }),
    resolveChild: async () => ({ kind: 'omitted' as const }),
  };
}

test('async tree helpers run with omitted visitors and configured source options', async () => {
  const depthRunner = await traverseTreeDepthFirstAsync({
    ...{
      traversableTree: tree('config'),
    },
  });

  expect(depthRunner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(
    depthRunner.getResolvedGraphView().getRoot()?.getValue().getData(),
  ).toBe('config');

  const breadthRunner = await traverseTreeBreadthFirstAsync({
    traversableTree: tree('root'),
  });
  expect(breadthRunner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
});

test('async breadth-first helper registers its visitor and returns a halted runner', async () => {
  const visits: string[] = [];
  const runner = await traverseTreeBreadthFirstAsync({
    traversableTree: tree('root'),
    visitors: {
      LEVEL_ORDER: async (vertex) => {
        visits.push(vertex.getData());
        return {
          commands: [
            { commandName: TraversalVisitorCommandName.PAUSE_TRAVERSAL },
          ],
        };
      },
    },
  });

  expect(visits).toEqual(['root']);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.HALTED);
  expect(runner.inspect().kind).toBe('breadth-first');
  expect(BreadthFirstPhase.LEVEL_ORDER).toBe('LEVEL_ORDER');
});

test('async depth-first helper registers each named visitor', async () => {
  const orders: DepthFirstPhase[] = [];
  const runner = await traverseTreeDepthFirstAsync({
    traversableTree: tree('root'),
    visitors: {
      PRE_ORDER: async (_vertex, options) => {
        orders.push(options.phase);
      },
      IN_ORDER: async (_vertex, options) => {
        orders.push(options.phase);
      },
      POST_ORDER: async (_vertex, options) => {
        orders.push(options.phase);
      },
    },
  });

  expect(orders).toEqual([
    DepthFirstPhase.PRE_ORDER,
    DepthFirstPhase.IN_ORDER,
    DepthFirstPhase.POST_ORDER,
  ]);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
});
