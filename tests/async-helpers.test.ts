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
    resolveRoot: async () => ({ vertexContent: { $d: root, $c: [] } }),
    resolveChild: async () => ({ vertexContent: null }),
  };
}

test('async tree helpers run nullable visitors and preserve tree source precedence', async () => {
  const depthRunner = await traverseTreeDepthFirstAsync(tree('argument'), null, {
    traversableTree: tree('config'),
  });

  expect(depthRunner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(depthRunner.getResolvedGraph().getRoot()?.unref().getData()).toBe(
    'config',
  );

  const breadthRunner = await traverseTreeBreadthFirstAsync(tree('root'), null);
  expect(breadthRunner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
});

test('async breadth-first helper registers its visitor and returns a halted runner', async () => {
  const visits: string[] = [];
  const runner = await traverseTreeBreadthFirstAsync(
    tree('root'),
    async (vertex) => {
      visits.push(vertex.getData());
      return {
        commands: [{ commandName: TraversalVisitorCommandName.PAUSE_TRAVERSAL }],
      };
    },
  );

  expect(visits).toEqual(['root']);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.HALTED);
  expect(runner.inspect().kind).toBe('breadth-first');
  expect(BreadthFirstPhase.LEVEL_ORDER).toBe('LEVEL_ORDER');
});

test('async depth-first helper registers each named visitor', async () => {
  const orders: DepthFirstPhase[] = [];
  const runner = await traverseTreeDepthFirstAsync(tree('root'), {
    preOrderVisitor: async (_vertex, options) => {
      orders.push(options.phase);
    },
    inOrderVisitor: async (_vertex, options) => {
      orders.push(options.phase);
    },
    postOrderVisitor: async (_vertex, options) => {
      orders.push(options.phase);
    },
  });

  expect(orders).toEqual([
    DepthFirstPhase.PRE_ORDER,
    DepthFirstPhase.IN_ORDER,
    DepthFirstPhase.POST_ORDER,
  ]);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
});
