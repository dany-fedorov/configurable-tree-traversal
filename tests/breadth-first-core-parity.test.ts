import {
  BreadthFirstTraversal,
  BreadthFirstTraversalOrder,
  TraversalRunnerStatus,
} from '../src';
import { BreadthFirstTraversalRunnerState } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerState';
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

test('BFS resumes a valid injected queue context from a nonzero cursor once', () => {
  const seed = new BreadthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: { $d: 'root', $c: ['parent'] } }),
      makeVertex: (hint) => ({ vertexContent: { $d: hint, $c: [] } }),
    },
  }).makeRunner();
  seed.run();
  const root = seed.getResolvedTree().getRoot();
  if (root === null) throw new Error('Expected seeded root');
  const parent = seed.getResolvedTree().getChildrenOf(root)?.[0];
  if (parent == null) throw new Error('Expected seeded parent');
  root.setPointsTo(root.unref().clone({ $c: [] }));
  parent.setPointsTo(parent.unref().clone({ $c: ['child'] }));
  const store = seed.getResolvedTree().getGraphStore();
  store.resetTraversal(parent);
  store.prepareSlots(parent, ['child']);
  store.setStatus(parent, 'COMPLETE');
  const validContext = {
    depth: 2,
    parentVertex: parent.unref(),
    parentVertexRef: parent,
    hintIndex: 0,
    vertexHint: 'child',
  };
  const queue = [{ ...validContext, vertexHint: 'already-skipped' }, validContext];
  const state = new BreadthFirstTraversalRunnerState<TestGraph, TestGraph>({
    queue,
    queueIndex: 1,
  });
  const calls: string[] = [];
  const traversal = new BreadthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => {
        throw new Error('Existing root must be reused');
      },
      makeVertex: (hint) => {
        calls.push(`resolve:${hint}`);
        return { vertexContent: { $d: hint, $c: [] } };
      },
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: seed.resolvedTreesContainer,
      state,
    },
  });
  traversal.addVisitorFor(BreadthFirstTraversalOrder.LEVEL_ORDER, (vertex) => {
    calls.push(`visit:${vertex.getData()}`);
  });

  const runner = traversal.makeRunner();
  expect(runner.state.queue).toBe(queue);
  expect(
    Array.from(runner.getIterable()).map((event) => event.vertex.getData()),
  ).toEqual(['root', 'child']);
  expect(calls).toEqual(['visit:root', 'resolve:child', 'visit:child']);
  expect(runner.state.queue).toBe(queue);
  expect(queue).toEqual([]);
  expect(runner.state.queueIndex).toBe(0);
});

test('BFS resumes an injected reachable parent without regenerating its frontier', () => {
  const first = new BreadthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: { $d: 'root', $c: ['A', 'B'] } }),
      makeVertex: (hint) => ({ vertexContent: { $d: hint, $c: [] } }),
    },
  }).makeRunner();
  const firstIterator = first.getIterable();
  expect(firstIterator.next().value?.vertex.getData()).toBe('root');
  expect(firstIterator.next().value?.vertex.getData()).toBe('A');
  firstIterator.return(undefined);

  const root = first.getResolvedTree().getRoot();
  if (root === null) throw new Error('Expected a resolved root');
  const consumedChild = first.getResolvedTree().getChildrenOf(root)?.[0];
  if (consumedChild === undefined) throw new Error('Expected consumed child');
  const queue = first.state.queue;
  expect(queue.map((context) => context.vertexHint)).toEqual(['A', 'B']);
  expect(first.state.queueIndex).toBe(1);
  expect(root.unref().getChildrenHints()).toEqual(['A', 'B']);

  const calls: string[] = [];
  let queueAtResolution: string[] = [];
  const visits: Array<[string, number, string | undefined]> = [];
  const traversal = new BreadthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => {
        throw new Error('Existing root must be reused');
      },
      makeVertex: (hint) => {
        calls.push(hint);
        queueAtResolution = queue.map((context) => context.vertexHint);
        return { vertexContent: { $d: hint, $c: [] } };
      },
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: first.resolvedTreesContainer,
      state: first.state,
    },
  });
  traversal.addVisitorFor(
    BreadthFirstTraversalOrder.LEVEL_ORDER,
    (vertex, options) => {
      visits.push([
        vertex.getData(),
        options.vertexVisitIndex,
        options.previousVisitedVertexRef?.unref().getData(),
      ]);
    },
  );

  const runner = traversal.makeRunner();
  expect(runner.state.queue).toBe(queue);
  expect(
    Array.from(runner.getIterable()).map((event) => event.vertex.getData()),
  ).toEqual(['root', 'B']);
  expect(calls).toEqual(['B']);
  expect(queueAtResolution).toEqual(['A', 'B']);
  expect(visits).toEqual([
    ['root', 2, 'A'],
    ['B', 3, 'root'],
  ]);
  const children = runner.getResolvedTree().getChildrenOf(root);
  expect(children).toHaveLength(2);
  expect(children?.[0]).toBe(consumedChild);
  expect(children?.[1]?.unref().getData()).toBe('B');
  expect(
    runner.getResolvedGraph().get(root)?.slots.map((slot) => slot.kind),
  ).toEqual(['linked', 'linked']);
  expect(runner.state.queue).toBe(queue);
  expect(queue).toEqual([]);
  expect(runner.state.queueIndex).toBe(0);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
});

test('BFS does not search newly appended children for legacy reuse', () => {
  const width = 1_000;
  const runner = new BreadthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => ({
        vertexContent: {
          $d: 'root',
          $c: Array.from({ length: width }, (_, index) => String(index)),
        },
      }),
      makeVertex: (hint) => ({ vertexContent: { $d: hint, $c: [] } }),
    },
  }).makeRunner();
  const lookup = jest.spyOn(
    runner.getResolvedTree(),
    'getResolutionContextOf',
  );

  runner.run({ iterateOver: [] });

  expect(runner.getResolvedGraph().getVertexRefs()).toHaveLength(width + 1);
  expect(lookup).not.toHaveBeenCalled();
});
