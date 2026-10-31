import { vertexHandle } from '../src/core/observationFacets';
import { internalTreeStore } from './internal-runner-fixtures';
import { treeResolution } from './source-result-fixtures';
import { getTreeGraphStore } from '../src/core/graph/treeStoreCapabilities';
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
        return {
          kind: 'found' as const,
          vertex: { vertexContent: { $data: 'root', $childHints: ['A', 'B'] } },
        };
      },
      resolveChild: (hint) => {
        calls.push(`resolve:${hint}`);
        return {
          kind: 'found' as const,
          vertex: { vertexContent: { $data: hint, $childHints: [] } },
        };
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
      .getResolvedGraphView()
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
      .getResolvedGraphView()
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
      kind: 'found' as const,
      vertex: {
        vertexContent: { $data: 'root', $childHints: ['missing', 'child'] },
      },
    }),
    resolveChild: (hint: string) =>
      treeResolution(
        hint === 'missing'
          ? null
          : { $data: hint, $childHints: [] as string[] },
      ),
  };
  const first = new BreadthFirstTreeTraversal<TestGraph>({
    traversableTree: adapter,
  }).createRunner();
  first.run();
  const root = internalTreeStore(first).getRoot();
  if (root === null) throw new Error('Expected a resolved root');
  const rootRecord = internalTreeStore(first).get(root);
  const originalChildren = internalTreeStore(first).get(root)?.getChildren();
  const originalChild = originalChildren?.[0];
  if (originalChild === undefined) throw new Error('Expected a resolved child');
  const childRecord = internalTreeStore(first).get(originalChild);

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
  expect(events[1]?.vertexRef).toBe(vertexHandle(originalChild));
  expect(internalTreeStore(second).getRoot()).toBe(root);
  expect(internalTreeStore(second).get(root)).toBe(rootRecord);
  expect(internalTreeStore(second).get(root)?.getChildren()).toBe(
    originalChildren,
  );
  expect(internalTreeStore(second).getChildrenOf(root)).not.toBe(
    originalChildren,
  );
  expect(internalTreeStore(second).getChildrenOf(root)).toEqual([
    originalChild,
  ]);
  expect(internalTreeStore(second).get(originalChild)).toBe(childRecord);
  expect(second.getResolvedGraphView().getVertexRefs()).toEqual([
    vertexHandle(root),
    vertexHandle(originalChild),
  ]);
});

test('BFS resumes a valid injected queue context from a nonzero cursor once', () => {
  const seed = new BreadthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: 'root', $childHints: ['parent'] } },
      }),
      resolveChild: (hint) => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: hint, $childHints: [] } },
      }),
    },
  }).createRunner();
  seed.run();
  const root = internalTreeStore(seed).getRoot();
  if (root === null) throw new Error('Expected seeded root');
  const parent = internalTreeStore(seed).getChildrenOf(root)?.[0];
  if (parent == null) throw new Error('Expected seeded parent');
  root.setValue(root.getValue().clone({ $childHints: [] }));
  parent.setValue(parent.getValue().clone({ $childHints: ['child'] }));
  const store = getTreeGraphStore(internalTreeStore(seed));
  store.resetTraversal(parent);
  store.prepareSlots(parent, ['child']);
  store.setVisitStage(parent, 'COMPLETE');
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
        return {
          kind: 'found' as const,
          vertex: { vertexContent: { $data: hint, $childHints: [] } },
        };
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
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: 'root', $childHints: ['A', 'B'] } },
      }),
      resolveChild: (hint) => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: hint, $childHints: [] } },
      }),
    },
  }).createRunner();
  const firstIterator = first.iterateEvents();
  expect(firstIterator.next().value?.vertex.getData()).toBe('root');
  expect(firstIterator.next().value?.vertex.getData()).toBe('A');
  firstIterator.return(undefined);

  const root = internalTreeStore(first).getRoot();
  if (root === null) throw new Error('Expected a resolved root');
  const consumedChild = internalTreeStore(first).getChildrenOf(root)?.[0];
  if (consumedChild === undefined) throw new Error('Expected consumed child');
  const queue = runnerInternals(first).state.queue;
  expect(queue.map((context) => context.vertexHint)).toEqual(['A', 'B']);
  expect(runnerInternals(first).state.queueIndex).toBe(1);
  expect(root.getValue().getChildHints()).toEqual(['A', 'B']);

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
        return {
          kind: 'found' as const,
          vertex: { vertexContent: { $data: hint, $childHints: [] } },
        };
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
  const children = internalTreeStore(runner).getChildrenOf(root);
  expect(children).toHaveLength(2);
  expect(children?.[0]).toBe(consumedChild);
  expect(children?.[1]?.getValue().getData()).toBe('B');
  expect(
    runner
      .getResolvedGraphView()
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
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: 'root', $childHints: ['child'] } },
      }),
      resolveChild: (hint) => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: hint, $childHints: [] } },
      }),
    },
  }).createRunner();
  runner.run();
  const root = internalTreeStore(runner).getRoot();
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
      resolveChild: () => ({ kind: 'omitted' as const }),
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
        kind: 'found' as const,
        vertex: {
          vertexContent: {
            $data: 'root',
            $childHints: Array.from({ length: width }, (_, index) =>
              String(index),
            ),
          },
        },
      }),
      resolveChild: (hint) => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: hint, $childHints: [] } },
      }),
    },
  }).createRunner();
  const lookup = jest.spyOn(
    internalTreeStore(runner),
    'getResolutionContextOf',
  );

  runner.run({ emitEvents: [] });

  expect(runner.getResolvedGraphView().getVertexRefs()).toHaveLength(width + 1);
  expect(lookup).not.toHaveBeenCalled();
});
