import {
  BreadthFirstTraversalOrder,
  DepthFirstTraversalOrder,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  traverseBreadthFirstAsync,
} from '../src';
import { traverseDepthFirstAsync } from '../src/traversals/depth-first-traversal';
import type { AsyncTraversableTree } from '../src/core/AsyncTraversableTree';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';

type TestTree = TreeTypeParameters<string, string>;

function tree(root: string): AsyncTraversableTree<TestTree> {
  return {
    makeRoot: async () => ({ vertexContent: { $d: root, $c: [] } }),
    makeVertex: async () => ({ vertexContent: null }),
  };
}

test('async tree helpers run nullable visitors and preserve tree source precedence', async () => {
  const depthRunner = await traverseDepthFirstAsync(tree('argument'), null, {
    traversableTree: tree('config'),
  });

  expect(depthRunner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(depthRunner.getResolvedGraph().getRoot()?.unref().getData()).toBe(
    'config',
  );

  const breadthRunner = await traverseBreadthFirstAsync(tree('root'), null);
  expect(breadthRunner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
});

test('async breadth-first helper registers its visitor and returns a halted runner', async () => {
  const visits: string[] = [];
  const runner = await traverseBreadthFirstAsync(
    tree('root'),
    async (vertex) => {
      visits.push(vertex.getData());
      return {
        commands: [{ commandName: TraversalVisitorCommandName.HALT_TRAVERSAL }],
      };
    },
  );

  expect(visits).toEqual(['root']);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.HALTED);
  expect(runner.inspect().kind).toBe('breadth-first');
  expect(BreadthFirstTraversalOrder.LEVEL_ORDER).toBe('LEVEL_ORDER');
});

test('async depth-first helper registers each named visitor', async () => {
  const orders: DepthFirstTraversalOrder[] = [];
  const runner = await traverseDepthFirstAsync(tree('root'), {
    preOrderVisitor: async (_vertex, options) => {
      orders.push(options.order);
    },
    inOrderVisitor: async (_vertex, options) => {
      orders.push(options.order);
    },
    postOrderVisitor: async (_vertex, options) => {
      orders.push(options.order);
    },
  });

  expect(orders).toEqual([
    DepthFirstTraversalOrder.PRE_ORDER,
    DepthFirstTraversalOrder.IN_ORDER,
    DepthFirstTraversalOrder.POST_ORDER,
  ]);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
});
