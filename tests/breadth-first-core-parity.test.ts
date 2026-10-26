import {
  BreadthFirstPhase,
  BreadthFirstTreeTraversal,
  TraversalRunnerStatus,
} from '../src';
import { BreadthFirstTraversalRunnerState } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerState';
import type { TestGraph } from './helpers/graph-fixtures';
import {
  createInternalBreadthFirstTreeRunner,
  createInternalBreadthFirstTreeTraversal,
  runnerInternals,
} from './internal-runner-fixtures';

test('BFS shared core resolves one queued child per event advancement', () => {
  const calls: string[] = [];
  const traversal = new BreadthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => {
        calls.push('root');
        return { vertexContent: { $d: 'root', $c: ['A', 'B'] } };
      },
      resolveChild: (hint) => {
        calls.push(`resolve:${hint}`);
        return { vertexContent: { $d: hint, $c: [] } };
      },
    },
  });
  traversal.addVisitorFor(BreadthFirstPhase.LEVEL_ORDER, (vertex) => {
    if (vertex.getData() !== 'root') calls.push(`visit:${vertex.getData()}`);
  });

  const runner = traversal.createRunner();
  expect(runner.inspect()).toMatchObject({
    status: TraversalRunnerStatus.INITIAL,
    kind: 'breadth-first',
    execution: 'sync',
    sourceMode: 'tree',
    bufferedEventCount: 0,
    inFlightCallbackCount: 0,
  });
  expect(calls).toEqual([]);

  const iterator = runner.iterateEvents();
  expect(iterator.next().value?.vertex.getData()).toBe('root');
  expect(iterator.next().value?.vertex.getData()).toBe('A');
  expect(calls).toEqual(['root', 'resolve:A', 'visit:A']);
  expect(
    runner
      .getResolvedGraph()
      .getVertexRefs()
      .map((ref) => ref.getValue().getData()),
  ).toEqual(['root', 'A']);
  expect(runnerInternals(runner).state.queue).toHaveLength(2);
  expect(runnerInternals(runner).state.queueIndex).toBe(1);

  const inspection = runner.inspect();
  expect(inspection.pendingEventBoundaryCount).toBe(1);
  expect(calls).toEqual(['root', 'resolve:A', 'visit:A']);
  expect(runnerInternals(runner).state.queueIndex).toBe(1);
  expect(
    runner
      .getResolvedGraph()
      .getVertexRefs()
      .map((ref) => ref.getValue().getData()),
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
  expect(runnerInternals(runner).state.queue).toEqual([]);
  expect(runnerInternals(runner).state.queueIndex).toBe(0);
  expect(runner.inspect()).toMatchObject({
    status: TraversalRunnerStatus.FINISHED,
    frames: [],
    chains: [],
    pendingRequests: [],
  });
});

test('BFS can traverse a completed injected resolved-tree container again', () => {
  const adapter = {
    resolveRoot: () => ({
      vertexContent: { $d: 'root', $c: ['missing', 'child'] },
    }),
    resolveChild: (hint: string) => ({
      vertexContent:
        hint === 'missing' ? null : { $d: hint, $c: [] as string[] },
    }),
  };
  const first = new BreadthFirstTreeTraversal<TestGraph>({
    traversableTree: adapter,
  }).createRunner();
  first.run();
  const root = first.getResolvedTreeStore().getRoot();
  if (root === null) throw new Error('Expected a resolved root');
  const rootRecord = first.getResolvedTreeStore().get(root);
  const originalChildren = first
    .getResolvedTreeStore()
    .get(root)
    ?.getChildren();
  const originalChild = originalChildren?.[0];
  if (originalChild === undefined) throw new Error('Expected a resolved child');
  const childRecord = first.getResolvedTreeStore().get(originalChild);

  const second = createInternalBreadthFirstTreeRunner<TestGraph>({
    traversableTree: {
      resolveRoot: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChild: adapter.resolveChild,
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: runnerInternals(first).resolvedTreesContainer,
    },
  });

  const events = Array.from(second.iterateEvents());
  expect(events.map((event) => event.vertex.getData())).toEqual([
    'root',
    'child',
  ]);
  expect(events[1]?.vertexRef).toBe(originalChild);
  expect(second.getResolvedTreeStore().getRoot()).toBe(root);
  expect(second.getResolvedTreeStore().get(root)).toBe(rootRecord);
  expect(second.getResolvedTreeStore().get(root)?.getChildren()).toBe(
    originalChildren,
  );
  expect(second.getResolvedTreeStore().getChildrenOf(root)).not.toBe(
    originalChildren,
  );
  expect(second.getResolvedTreeStore().getChildrenOf(root)).toEqual([
    originalChild,
  ]);
  expect(second.getResolvedTreeStore().get(originalChild)).toBe(childRecord);
  expect(second.getResolvedGraph().getVertexRefs()).toEqual([
    root,
    originalChild,
  ]);
});

test('BFS resumes a valid injected queue context from a nonzero cursor once', () => {
  const seed = new BreadthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => ({ vertexContent: { $d: 'root', $c: ['parent'] } }),
      resolveChild: (hint) => ({ vertexContent: { $d: hint, $c: [] } }),
    },
  }).createRunner();
  seed.run();
  const root = seed.getResolvedTreeStore().getRoot();
  if (root === null) throw new Error('Expected seeded root');
  const parent = seed.getResolvedTreeStore().getChildrenOf(root)?.[0];
  if (parent == null) throw new Error('Expected seeded parent');
  root.setValue(root.getValue().clone({ $c: [] }));
  parent.setValue(parent.getValue().clone({ $c: ['child'] }));
  const store = seed.getResolvedTreeStore().getGraphStore();
  store.resetTraversal(parent);
  store.prepareSlots(parent, ['child']);
  store.setStatus(parent, 'COMPLETE');
  const validContext = {
    depth: 2,
    parentVertex: parent.getValue(),
    parentVertexRef: parent,
    hintIndex: 0,
    vertexHint: 'child',
  };
  const queue = [
    { ...validContext, vertexHint: 'already-skipped' },
    validContext,
  ];
  const state = new BreadthFirstTraversalRunnerState<TestGraph, TestGraph>({
    queue,
    queueIndex: 1,
  });
  const calls: string[] = [];
  const traversal = createInternalBreadthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChild: (hint) => {
        calls.push(`resolve:${hint}`);
        return { vertexContent: { $d: hint, $c: [] } };
      },
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: runnerInternals(seed).resolvedTreesContainer,
      state,
    },
  });
  traversal.addVisitorFor(BreadthFirstPhase.LEVEL_ORDER, (vertex) => {
    calls.push(`visit:${vertex.getData()}`);
  });

  const runner = traversal.createRunner();
  expect(runnerInternals(runner).state.queue).toBe(queue);
  expect(
    Array.from(runner.iterateEvents()).map((event) => event.vertex.getData()),
  ).toEqual(['root', 'child']);
  expect(calls).toEqual(['visit:root', 'resolve:child', 'visit:child']);
  expect(runnerInternals(runner).state.queue).toBe(queue);
  expect(queue).toEqual([]);
  expect(runnerInternals(runner).state.queueIndex).toBe(0);
});

test('BFS resumes an injected reachable parent without regenerating its frontier', () => {
  const first = new BreadthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => ({ vertexContent: { $d: 'root', $c: ['A', 'B'] } }),
      resolveChild: (hint) => ({ vertexContent: { $d: hint, $c: [] } }),
    },
  }).createRunner();
  const firstIterator = first.iterateEvents();
  expect(firstIterator.next().value?.vertex.getData()).toBe('root');
  expect(firstIterator.next().value?.vertex.getData()).toBe('A');
  firstIterator.return(undefined);

  const root = first.getResolvedTreeStore().getRoot();
  if (root === null) throw new Error('Expected a resolved root');
  const consumedChild = first.getResolvedTreeStore().getChildrenOf(root)?.[0];
  if (consumedChild === undefined) throw new Error('Expected consumed child');
  const queue = runnerInternals(first).state.queue;
  expect(queue.map((context) => context.vertexHint)).toEqual(['A', 'B']);
  expect(runnerInternals(first).state.queueIndex).toBe(1);
  expect(root.getValue().getChildrenHints()).toEqual(['A', 'B']);

  const calls: string[] = [];
  let queueAtResolution: string[] = [];
  const visits: Array<[string, number, string | undefined]> = [];
  const traversal = createInternalBreadthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChild: (hint) => {
        calls.push(hint);
        queueAtResolution = queue.map((context) => context.vertexHint);
        return { vertexContent: { $d: hint, $c: [] } };
      },
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: runnerInternals(first).resolvedTreesContainer,
      state: runnerInternals(first).state,
    },
  });
  traversal.addVisitorFor(BreadthFirstPhase.LEVEL_ORDER, (vertex, options) => {
    visits.push([
      vertex.getData(),
      options.phaseVisitIndex,
      options.previousPhaseVertexRef?.getValue().getData(),
    ]);
  });

  const runner = traversal.createRunner();
  expect(runnerInternals(runner).state.queue).toBe(queue);
  expect(
    Array.from(runner.iterateEvents()).map((event) => event.vertex.getData()),
  ).toEqual(['root', 'B']);
  expect(calls).toEqual(['B']);
  expect(queueAtResolution).toEqual(['A', 'B']);
  expect(visits).toEqual([
    ['root', 2, 'A'],
    ['B', 3, 'root'],
  ]);
  const children = runner.getResolvedTreeStore().getChildrenOf(root);
  expect(children).toHaveLength(2);
  expect(children?.[0]).toBe(consumedChild);
  expect(children?.[1]?.getValue().getData()).toBe('B');
  expect(
    runner
      .getResolvedGraph()
      .get(root)
      ?.slots.map((slot) => slot.kind),
  ).toEqual(['linked', 'linked']);
  expect(runnerInternals(runner).state.queue).toBe(queue);
  expect(queue).toEqual([]);
  expect(runnerInternals(runner).state.queueIndex).toBe(0);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
});

function completedParentSeed() {
  const runner = new BreadthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => ({ vertexContent: { $d: 'root', $c: ['child'] } }),
      resolveChild: (hint) => ({ vertexContent: { $d: hint, $c: [] } }),
    },
  }).createRunner();
  runner.run();
  const root = runner.getResolvedTreeStore().getRoot();
  if (root === null) throw new Error('Expected root');
  return { root, runner };
}

test('BFS closes an injected frontier whose contexts were all consumed', () => {
  const seed = completedParentSeed();
  const context = {
    depth: 1,
    parentVertex: seed.root.getValue(),
    parentVertexRef: seed.root,
    hintIndex: 0,
    vertexHint: 'child',
  };
  const state = new BreadthFirstTraversalRunnerState<TestGraph, TestGraph>({
    queue: [context],
    queueIndex: 1,
  });
  const runner = createInternalBreadthFirstTreeRunner<TestGraph>({
    traversableTree: {
      resolveRoot: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChild: () => {
        throw new Error('Consumed child must be reused');
      },
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: runnerInternals(seed.runner)
        .resolvedTreesContainer,
      state,
    },
  });
  expect(
    [...runner.iterateEvents()].map((event) => event.vertex.getData()),
  ).toEqual(['root']);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
});

test('BFS rejects an injected frontier with non-contiguous hint indices', () => {
  const seed = completedParentSeed();
  const state = new BreadthFirstTraversalRunnerState<TestGraph, TestGraph>({
    queue: [
      {
        depth: 1,
        parentVertex: seed.root.getValue(),
        parentVertexRef: seed.root,
        hintIndex: 1,
        vertexHint: 'child',
      },
    ],
  });
  const runner = createInternalBreadthFirstTreeRunner<TestGraph>({
    traversableTree: {
      resolveRoot: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChild: () => ({ vertexContent: null }),
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: runnerInternals(seed.runner)
        .resolvedTreesContainer,
      state,
    },
  });
  expect(() => runner.run()).toThrow(
    /invalid injected breadth-first frontier/i,
  );
});

test('BFS does not search newly appended children for legacy reuse', () => {
  const width = 1_000;
  const runner = new BreadthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => ({
        vertexContent: {
          $d: 'root',
          $c: Array.from({ length: width }, (_, index) => String(index)),
        },
      }),
      resolveChild: (hint) => ({ vertexContent: { $d: hint, $c: [] } }),
    },
  }).createRunner();
  const lookup = jest.spyOn(
    runner.getResolvedTreeStore(),
    'getResolutionContextOf',
  );

  runner.run({ emitEvents: [] });

  expect(runner.getResolvedGraph().getVertexRefs()).toHaveLength(width + 1);
  expect(lookup).not.toHaveBeenCalled();
});
