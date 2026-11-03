import { createVertexHandleFacet } from '../src/core/observationFacets';
import { internalTreeStore } from './internal-runner-fixtures';
import { treeResolution } from './source-result-fixtures';
import { getTreeGraphStore } from '../src/core/graph/treeStoreCapabilities';
import {
  BreadthFirstTreeVisitPhase,
  BreadthFirstTreeTraversalBuilder,
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
  const traversal = new BreadthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => {
        calls.push('root');
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['A', 'B'],
            },
          },
        };
      },
      resolveChildVertexFromHint: (hint) => {
        calls.push(`resolve:${hint}`);
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        };
      },
    },
  });
  traversal.registerVisitorCallbackForPhase(
    BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
    (vertex) => {
      if (vertex.getVertexData() !== 'root')
        calls.push(`visit:${vertex.getVertexData()}`);
    },
  );

  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  expect(runner.captureExecutionSnapshot()).toMatchObject({
    traversalLifecycleStatus: TraversalRunnerStatus.NOT_STARTED,
    traversalAlgorithm: 'breadth-first',
    callbackExecutionMode: 'sync',
    sourceTopologyKind: 'tree',
    bufferedDeliveryEventCount: 0,
    inFlightInvocationCount: 0,
  });
  expect(calls).toEqual([]);

  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  expect(iterator.next().value?.vertex.getVertexData()).toBe('root');
  expect(iterator.next().value?.vertex.getVertexData()).toBe('A');
  expect(calls).toEqual(['root', 'resolve:A', 'visit:A']);
  expect(
    runner
      .getLiveResolvedGraphView()
      .getVertexHandles()
      .map((ref) => ref.getCurrentVertexView().getVertexData()),
  ).toEqual(['root', 'A']);
  expect(runnerInternals(runner).state.queue).toHaveLength(2);
  expect(runnerInternals(runner).state.queueIndex).toBe(1);

  const inspection = runner.captureExecutionSnapshot();
  expect(inspection.unacknowledgedCommittedEventBoundaryCount).toBe(1);
  expect(calls).toEqual(['root', 'resolve:A', 'visit:A']);
  expect(runnerInternals(runner).state.queueIndex).toBe(1);
  expect(
    runner
      .getLiveResolvedGraphView()
      .getVertexHandles()
      .map((ref) => ref.getCurrentVertexView().getVertexData()),
  ).toEqual(['root', 'A']);

  expect(iterator.next().value?.vertex.getVertexData()).toBe('B');
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
  expect(runner.captureExecutionSnapshot()).toMatchObject({
    traversalLifecycleStatus: TraversalRunnerStatus.FINISHED,
    vertexTraversalFrames: [],
    vertexPhaseVisitorChains: [],
    pendingCallbackRequests: [],
  });
});

test('BFS can traverse a completed injected resolved-tree container again', () => {
  const adapter = {
    resolveRootVertex: () => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexContentInput: {
          $vertexData: 'root',
          $childDiscoveryHints: ['missing', 'child'],
        },
      },
    }),
    resolveChildVertexFromHint: (hint: string) =>
      treeResolution(
        hint === 'missing'
          ? null
          : { $vertexData: hint, $childDiscoveryHints: [] as string[] },
      ),
  };
  const first = new BreadthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: adapter,
  }).createIndependentRunnerFromCurrentOptions();
  first.runUntilSuspendedOrTerminal();
  const root = internalTreeStore(first).getRootVertexReferenceOrNull();
  if (root === null) throw new Error('Expected a resolved root');
  const rootRecord =
    internalTreeStore(first).getMutableVertexRecordOrNull(root);
  const originalChildren = internalTreeStore(first)
    .getMutableVertexRecordOrNull(root)
    ?.getMutableChildReferenceList();
  const originalChild = originalChildren?.[0];
  if (originalChild === undefined) throw new Error('Expected a resolved child');
  const childRecord =
    internalTreeStore(first).getMutableVertexRecordOrNull(originalChild);

  const second = createInternalBreadthFirstTreeRunner<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChildVertexFromHint: adapter.resolveChildVertexFromHint,
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: runnerInternals(first).resolvedTreesContainer,
    },
  });

  const events = Array.from(
    second.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  );
  expect(events.map((event) => event.vertex.getVertexData())).toEqual([
    'root',
    'child',
  ]);
  expect(events[1]?.vertexHandle).toBe(createVertexHandleFacet(originalChild));
  expect(internalTreeStore(second).getRootVertexReferenceOrNull()).toBe(root);
  expect(internalTreeStore(second).getMutableVertexRecordOrNull(root)).toBe(
    rootRecord,
  );
  expect(
    internalTreeStore(second)
      .getMutableVertexRecordOrNull(root)
      ?.getMutableChildReferenceList(),
  ).toBe(originalChildren);
  expect(
    internalTreeStore(second).getDetachedChildReferenceListOrNull(root),
  ).not.toBe(originalChildren);
  expect(
    internalTreeStore(second).getDetachedChildReferenceListOrNull(root),
  ).toEqual([originalChild]);
  expect(
    internalTreeStore(second).getMutableVertexRecordOrNull(originalChild),
  ).toBe(childRecord);
  expect(second.getLiveResolvedGraphView().getVertexHandles()).toEqual([
    createVertexHandleFacet(root),
    createVertexHandleFacet(originalChild),
  ]);
});

test('BFS resumes a valid injected queue context from a nonzero cursor once', () => {
  const seed = new BreadthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['parent'],
          },
        },
      }),
      resolveChildVertexFromHint: (hint) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
        },
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  seed.runUntilSuspendedOrTerminal();
  const root = internalTreeStore(seed).getRootVertexReferenceOrNull();
  if (root === null) throw new Error('Expected seeded root');
  const parent =
    internalTreeStore(seed).getDetachedChildReferenceListOrNull(root)?.[0];
  if (parent == null) throw new Error('Expected seeded parent');
  root.replaceReferencedValue(
    root.getReferencedValue().createEditableShallowCloneWithContentOverrides({
      $childDiscoveryHints: [],
    }),
  );
  parent.replaceReferencedValue(
    parent.getReferencedValue().createEditableShallowCloneWithContentOverrides({
      $childDiscoveryHints: ['child'],
    }),
  );
  const store = getTreeGraphStore(internalTreeStore(seed));
  store.resetTraversal(parent);
  store.prepareSlots(parent, ['child']);
  store.setVisitStage(parent, 'COMPLETION_VISIT_COMMITTED');
  const validContext = {
    discoveryDepthInEdges: 2,
    parentVertexAtChildResolution: parent.getReferencedValue(),
    parentVertexHandle: parent,
    parentChildHintIndex: 0,
    childDiscoveryHint: 'child',
  };
  const queue = [
    { ...validContext, childDiscoveryHint: 'already-skipped' },
    validContext,
  ];
  const state = new BreadthFirstTraversalRunnerState<TestGraph, TestGraph>({
    queue,
    queueIndex: 1,
  });
  const calls: string[] = [];
  const traversal = createInternalBreadthFirstTreeTraversal<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChildVertexFromHint: (hint) => {
        calls.push(`resolve:${hint}`);
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        };
      },
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: runnerInternals(seed).resolvedTreesContainer,
      state,
    },
  });
  traversal.registerVisitorCallbackForPhase(
    BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
    (vertex) => {
      calls.push(`visit:${vertex.getVertexData()}`);
    },
  );

  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  expect(runnerInternals(runner).state.queue).toBe(queue);
  expect(
    Array.from(
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ).map((event) => event.vertex.getVertexData()),
  ).toEqual(['root', 'child']);
  expect(calls).toEqual(['visit:root', 'resolve:child', 'visit:child']);
  expect(runnerInternals(runner).state.queue).toBe(queue);
  expect(queue).toEqual([]);
  expect(runnerInternals(runner).state.queueIndex).toBe(0);
});

test('BFS resumes an injected reachable parent without regenerating its frontier', () => {
  const first = new BreadthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['A', 'B'],
          },
        },
      }),
      resolveChildVertexFromHint: (hint) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
        },
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  const firstIterator =
    first.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  expect(firstIterator.next().value?.vertex.getVertexData()).toBe('root');
  expect(firstIterator.next().value?.vertex.getVertexData()).toBe('A');
  firstIterator.return(undefined);

  const root = internalTreeStore(first).getRootVertexReferenceOrNull();
  if (root === null) throw new Error('Expected a resolved root');
  const consumedChild =
    internalTreeStore(first).getDetachedChildReferenceListOrNull(root)?.[0];
  if (consumedChild === undefined) throw new Error('Expected consumed child');
  const queue = runnerInternals(first).state.queue;
  expect(queue.map((context) => context.childDiscoveryHint)).toEqual([
    'A',
    'B',
  ]);
  expect(runnerInternals(first).state.queueIndex).toBe(1);
  expect(root.getReferencedValue().getMutableChildDiscoveryHints()).toEqual([
    'A',
    'B',
  ]);

  const calls: string[] = [];
  let queueAtResolution: string[] = [];
  const visits: Array<[string, number, string | undefined]> = [];
  const traversal = createInternalBreadthFirstTreeTraversal<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChildVertexFromHint: (hint) => {
        calls.push(hint);
        queueAtResolution = queue.map((context) => context.childDiscoveryHint);
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        };
      },
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: runnerInternals(first).resolvedTreesContainer,
      state: runnerInternals(first).state,
    },
  });
  traversal.registerVisitorCallbackForPhase(
    BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
    (vertex, options) => {
      visits.push([
        vertex.getVertexData(),
        options.phaseVisitorChainIndex,
        options.previousCommittedVisitVertexHandleForSamePhase
          ?.getCurrentVertexView()
          .getVertexData(),
      ]);
    },
  );

  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  expect(runnerInternals(runner).state.queue).toBe(queue);
  expect(
    Array.from(
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ).map((event) => event.vertex.getVertexData()),
  ).toEqual(['root', 'B']);
  expect(calls).toEqual(['B']);
  expect(queueAtResolution).toEqual(['A', 'B']);
  expect(visits).toEqual([
    ['root', 2, 'A'],
    ['B', 3, 'root'],
  ]);
  const children =
    internalTreeStore(runner).getDetachedChildReferenceListOrNull(root);
  expect(children).toHaveLength(2);
  expect(children?.[0]).toBe(consumedChild);
  expect(children?.[1]?.getReferencedValue().getVertexData()).toBe('B');
  expect(
    runner
      .getLiveResolvedGraphView()
      .getVertexSnapshotOrNull(createVertexHandleFacet(root))
      ?.orderedChildDiscoverySlots.map((slot) => slot.kind),
  ).toEqual(['linkedToVertex', 'linkedToVertex']);
  expect(runnerInternals(runner).state.queue).toBe(queue);
  expect(queue).toEqual([]);
  expect(runnerInternals(runner).state.queueIndex).toBe(0);
  expect(runner.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
});

function completedParentSeed() {
  const runner = new BreadthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['child'],
          },
        },
      }),
      resolveChildVertexFromHint: (hint) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
        },
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  runner.runUntilSuspendedOrTerminal();
  const root = internalTreeStore(runner).getRootVertexReferenceOrNull();
  if (root === null) throw new Error('Expected root');
  return { root, runner };
}

test('BFS closes an injected frontier whose contexts were all consumed', () => {
  const seed = completedParentSeed();
  const context = {
    discoveryDepthInEdges: 1,
    parentVertexAtChildResolution: seed.root.getReferencedValue(),
    parentVertexHandle: seed.root,
    parentChildHintIndex: 0,
    childDiscoveryHint: 'child',
  };
  const state = new BreadthFirstTraversalRunnerState<TestGraph, TestGraph>({
    queue: [context],
    queueIndex: 1,
  });
  const runner = createInternalBreadthFirstTreeRunner<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChildVertexFromHint: () => {
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
    [...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()].map(
      (event) => event.vertex.getVertexData(),
    ),
  ).toEqual(['root']);
  expect(runner.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
});

test('BFS rejects an injected frontier with non-contiguous hint indices', () => {
  const seed = completedParentSeed();
  const state = new BreadthFirstTraversalRunnerState<TestGraph, TestGraph>({
    queue: [
      {
        discoveryDepthInEdges: 1,
        parentVertexAtChildResolution: seed.root.getReferencedValue(),
        parentVertexHandle: seed.root,
        parentChildHintIndex: 1,
        childDiscoveryHint: 'child',
      },
    ],
  });
  const runner = createInternalBreadthFirstTreeRunner<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChildVertexFromHint: () => ({
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: runnerInternals(seed.runner)
        .resolvedTreesContainer,
      state,
    },
  });
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(
    /invalid injected breadth-first frontier/i,
  );
});

test('BFS does not search newly appended children for legacy reuse', () => {
  const width = 1_000;
  const runner = new BreadthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: Array.from({ length: width }, (_, index) =>
              String(index),
            ),
          },
        },
      }),
      resolveChildVertexFromHint: (hint) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
        },
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  const lookup = jest.spyOn(
    internalTreeStore(runner),
    'getDetachedChildDiscoveryContextOrNull',
  );

  runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });

  expect(runner.getLiveResolvedGraphView().getVertexHandles()).toHaveLength(
    width + 1,
  );
  expect(lookup).not.toHaveBeenCalled();
});
