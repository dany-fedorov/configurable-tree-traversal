import {
  BreadthFirstTraversal,
  BreadthFirstTraversalOrder,
  TraversalRunnerStatus,
} from '../src';
import type { TestGraph } from './helpers/graph-fixtures';

test('BFS shared core resolves one queued child per event advancement', () => {
  const calls: string[] = [];
  const traversal = new BreadthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => {
        calls.push('root');
        return { vertexContent: { $d: 'root', $c: ['A', 'B'] } };
      },
      makeVertex: (hint) => {
        calls.push(`resolve:${hint}`);
        return { vertexContent: { $d: hint, $c: [] } };
      },
    },
  });
  traversal.addVisitorFor(BreadthFirstTraversalOrder.LEVEL_ORDER, (vertex) => {
    if (vertex.getData() !== 'root') calls.push(`visit:${vertex.getData()}`);
  });

  const runner = traversal.makeRunner();
  expect(runner.inspect()).toMatchObject({
    status: TraversalRunnerStatus.INITIAL,
    kind: 'breadth-first',
    execution: 'sync',
    sourceMode: 'tree',
    bufferedEventCount: 0,
    inFlightCallbackCount: 0,
  });
  expect(calls).toEqual([]);

  const iterator = runner.getIterable();
  expect(iterator.next().value?.vertex.getData()).toBe('root');
  expect(iterator.next().value?.vertex.getData()).toBe('A');
  expect(calls).toEqual(['root', 'resolve:A', 'visit:A']);
  expect(
    runner
      .getResolvedGraph()
      .getVertexRefs()
      .map((ref) => ref.unref().getData()),
  ).toEqual(['root', 'A']);
  expect(runner.state.queue).toHaveLength(2);
  expect(runner.state.queueIndex).toBe(1);

  const inspection = runner.inspect();
  expect(inspection.pendingEventBoundaryCount).toBe(1);
  expect(calls).toEqual(['root', 'resolve:A', 'visit:A']);
  expect(runner.state.queueIndex).toBe(1);
  expect(
    runner
      .getResolvedGraph()
      .getVertexRefs()
      .map((ref) => ref.unref().getData()),
  ).toEqual(['root', 'A']);

  expect(iterator.next().value?.vertex.getData()).toBe('B');
  expect(calls).toEqual([
    'root',
    'resolve:A',
    'visit:A',
    'resolve:B',
    'visit:B',
  ]);
  expect(iterator.next()).toEqual({ done: true, value: undefined });
  expect(runner.state.queue).toEqual([]);
  expect(runner.state.queueIndex).toBe(0);
  expect(runner.inspect()).toMatchObject({
    status: TraversalRunnerStatus.FINISHED,
    frames: [],
    chains: [],
    pendingRequests: [],
  });
});

test('BFS can traverse a completed injected resolved-tree container again', () => {
  const adapter = {
    makeRoot: () => ({
      vertexContent: { $d: 'root', $c: ['missing', 'child'] },
    }),
    makeVertex: (hint: string) => ({
      vertexContent:
        hint === 'missing' ? null : { $d: hint, $c: [] as string[] },
    }),
  };
  const first = new BreadthFirstTraversal<TestGraph>({
    traversableTree: adapter,
  }).makeRunner();
  first.run();
  const root = first.getResolvedTree().getRoot();
  if (root === null) throw new Error('Expected a resolved root');
  const rootRecord = first.getResolvedTree().get(root);
  const originalChildren = first.getResolvedTree().getChildrenOf(root);
  const originalChild = originalChildren?.[0];
  if (originalChild === undefined) throw new Error('Expected a resolved child');
  const childRecord = first.getResolvedTree().get(originalChild);

  const second = new BreadthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => {
        throw new Error('Existing root must be reused');
      },
      makeVertex: adapter.makeVertex,
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: first.resolvedTreesContainer,
    },
  }).makeRunner();

  const events = Array.from(second.getIterable());
  expect(events.map((event) => event.vertex.getData())).toEqual([
    'root',
    'child',
  ]);
  expect(events[1]?.vertexRef).toBe(originalChild);
  expect(second.getResolvedTree().getRoot()).toBe(root);
  expect(second.getResolvedTree().get(root)).toBe(rootRecord);
  expect(second.getResolvedTree().getChildrenOf(root)).toBe(originalChildren);
  expect(second.getResolvedTree().getChildrenOf(root)).toEqual([originalChild]);
  expect(second.getResolvedTree().get(originalChild)).toBe(childRecord);
  expect(second.getResolvedGraph().getVertexRefs()).toEqual([
    root,
    originalChild,
  ]);
});
