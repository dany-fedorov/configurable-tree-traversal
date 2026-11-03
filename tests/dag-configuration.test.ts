import { createVertexHandleFacet } from '../src/core/observationFacets';
import { MutableValueReference } from '../src/core/CTTRef';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { DagDiscoverySource } from '../src/core/TraversableGraph';
import type { TreeDiscoverySource } from '../src/core/TraversableTree';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { Vertex } from '../src/core/Vertex';
import { DagTraversalBuilder } from '../src/traversals/dag-traversal/DagTraversal';
import { DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG } from '../src/traversals/dag-traversal/lib/DagTraversalInstanceConfig';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { DAG_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerIterableConfig';
import { DagTraversalRunnerState } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerState';
import {
  createInternalDagTraversal,
  createInternalDagTraversalRunner,
  runnerInternals,
  traversalInternals,
} from './internal-runner-fixtures';

type TestGraph = VertexDataAndChildHintTypes<string, string>;

function source(): DagDiscoverySource<TestGraph> {
  return {
    resolveRootVertex: () => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
        vertexId: 'root',
      },
    }),
    resolveChildHint: () => ({
      omittedVertexIdentity: null,
      kind: 'vertexIntentionallyOmitted' as const,
      satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
    }),
  };
}

function treeSource(): TreeDiscoverySource<TestGraph> {
  return {
    resolveRootVertex: () => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
      },
    }),
    resolveChildVertexFromHint: () => ({
      kind: 'vertexIntentionallyOmitted' as const,
    }),
  };
}

test('requires exactly one source at runtime', () => {
  expect(
    () =>
      new DagTraversalBuilder(
        {} as ConstructorParameters<typeof DagTraversalBuilder>[0],
      ),
  ).toThrow(/exactly one/i);
  expect(
    () =>
      new DagTraversalBuilder({
        dagDiscoverySource: source(),
        treeDiscoverySource: source(),
      } as unknown as ConstructorParameters<typeof DagTraversalBuilder>[0]),
  ).toThrow(/exactly one/i);
});

function assertSourceUnionTypes(): void {
  // @ts-expect-error A DAG traversal requires a source.
  new DagTraversalBuilder<TestGraph>({});
  // @ts-expect-error A DAG traversal source is exclusive.
  new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: source(),
    treeDiscoverySource: treeSource(),
  });
}
void assertSourceUnionTypes;

test('fixes source mode while allowing adapter replacement', () => {
  const traversal = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: source(),
  });
  traversal.patchOptionsForFutureRunners({ dagDiscoverySource: source() });
  expect(() =>
    traversal.patchOptionsForFutureRunners({
      treeDiscoverySource: source(),
    } as unknown as Parameters<typeof traversal.patchOptionsForFutureRunners>[0]),
  ).toThrow(/source mode/i);

  const treeTraversal = new DagTraversalBuilder<TestGraph>({
    treeDiscoverySource: treeSource(),
  });
  expect(() =>
    treeTraversal.patchOptionsForFutureRunners({
      dagDiscoverySource: source(),
    } as unknown as Parameters<typeof treeTraversal.patchOptionsForFutureRunners>[0]),
  ).toThrow(/source mode/i);
});

test('rejects concurrency at sync construction and configuration', () => {
  expect(
    () =>
      new DagTraversalBuilder({
        dagDiscoverySource: source(),
        maxConcurrentCallbackInvocations: 2,
      } as unknown as ConstructorParameters<typeof DagTraversalBuilder>[0]),
  ).toThrow(/concurrency/i);
  const traversal = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: source(),
  });
  expect(() =>
    traversal.patchOptionsForFutureRunners({
      maxConcurrentCallbackInvocations: 2,
    } as unknown as Parameters<
      typeof traversal.patchOptionsForFutureRunners
    >[0]),
  ).toThrow(/concurrency/i);
});

test('sorts duplicate priorities stably and isolates builders and runners', () => {
  const calls: string[] = [];
  const traversal = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: source(),
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    () => void calls.push('low'),
    {
      descendingExecutionPriorityWithinGroup: 1,
    },
  );
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    () => void calls.push('first'),
    {
      descendingExecutionPriorityWithinGroup: 2,
    },
  );
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    () => void calls.push('second'),
    {
      descendingExecutionPriorityWithinGroup: 2,
    },
  );
  const listed = traversal.getDetachedVisitorRegistrationRecordsForPhase(
    Order.ON_WORK_READY,
  );
  expect(
    listed.map(
      ({ descendingExecutionPriorityWithinGroup }) =>
        descendingExecutionPriorityWithinGroup,
    ),
  ).toEqual([2, 2, 1]);

  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  traversal.replaceVisitorDefinitionsForPhase(Order.ON_WORK_READY, []);
  listed.length = 0;
  runner.runUntilSuspendedOrTerminal();
  expect(calls).toEqual(['first', 'second', 'low']);
});

test('configure copies visitor arrays and preserves existing registrations', () => {
  const calls: string[] = [];
  const traversal = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: source(),
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    () => void calls.push('existing'),
  );
  const visitors = [
    {
      phaseRegistrationInsertionIndex: 0,
      descendingExecutionPriorityWithinGroup: 1,
      visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
      visitor: () => void calls.push('complete'),
    },
  ];
  traversal.patchOptionsForFutureRunners({
    visitors: { [Order.ON_SUBGRAPH_COMPLETION_READY]: visitors },
  });
  visitors.length = 0;
  traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(calls).toEqual(['existing', 'complete']);
});

test('filters visitor execution independently from event iteration', () => {
  const calls: string[] = [];
  const traversal = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: source(),
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    () => void calls.push('ready'),
  );
  traversal.registerVisitorCallbackForPhase(
    Order.ON_SUBGRAPH_COMPLETION_READY,
    () => void calls.push('complete'),
  );
  const events = [
    ...traversal
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: ['subgraphCompletionCommitted'],
        admittedVisitorCallbackPhases: { include: [Order.ON_WORK_READY] },
      }),
  ];

  expect(calls).toEqual(['ready']);
  expect(events.map(({ eventKind }) => eventKind)).toEqual([
    'subgraphCompletionCommitted',
  ]);
});

test('exports recursively frozen defaults without sharing effective arrays', () => {
  expect(Object.isFrozen(DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG)).toBe(true);
  expect(Object.isFrozen(DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.visitors)).toBe(
    true,
  );
  expect(Object.isFrozen(DAG_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT)).toBe(
    true,
  );
  expect(
    Object.isFrozen(DAG_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT.iterateOver),
  ).toBe(true);

  const first = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: source(),
  });
  traversalInternals(first).icfg.visitors[Order.ON_WORK_READY].push({
    phaseRegistrationInsertionIndex: 0,
    descendingExecutionPriorityWithinGroup: 1,
    visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
    visitor: () => undefined,
  });
  expect(
    new DagTraversalBuilder<TestGraph>({
      dagDiscoverySource: source(),
    }).getDetachedVisitorRegistrationRecordsForPhase(Order.ON_WORK_READY),
  ).toEqual([]);
});

test('accepts an initial or empty quiescent halted injected state', () => {
  for (const status of [Status.NOT_STARTED, Status.SUSPENDED]) {
    const state = new DagTraversalRunnerState<TestGraph>({ status });
    const container = new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    });
    const runner = createInternalDagTraversalRunner<TestGraph>({
      dagDiscoverySource: source(),
      traversalRunnerInternalObjects: {
        state,
        resolvedGraphsContainer: container,
      },
    });

    expect(runnerInternals(runner).state).toBe(state);
    expect(runnerInternals(runner).resolvedGraphsContainer).toBe(container);
    expect(state.traversalRootVertexRef).toBeNull();
    runner.runUntilSuspendedOrTerminal();
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
  }
});

test('rejects a stale traversal root for an empty halted seed atomically', () => {
  const staleRoot = new MutableValueReference(
    new Vertex<TestGraph>({
      $vertexData: 'stale-root',
      $childDiscoveryHints: [],
    }),
  );
  const state = new DagTraversalRunnerState<TestGraph>({
    status: Status.SUSPENDED,
    traversalRootVertexRef: staleRoot,
  });
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const resolveRootVertex = jest.fn(source().resolveRootVertex);
  const traversal = createInternalDagTraversal<TestGraph>({
    dagDiscoverySource: { ...source(), resolveRootVertex },
    traversalRunnerInternalObjects: {
      state,
      resolvedGraphsContainer: container,
    },
  });
  const beforeRefs = container.liveResolvedGraphView.getVertexRefs();
  const beforeReadyVisits = [...state.dependencyEligiblePhaseVisits];
  const beforeExpansionQueue = [...state.expansionQueue];

  expect(() => traversal.createIndependentRunnerFromCurrentOptions()).toThrow(
    /traversal root mismatch/i,
  );
  expect(resolveRootVertex).not.toHaveBeenCalled();
  expect(container.liveResolvedGraphView.getVertexRefs()).toEqual(beforeRefs);
  expect(container.liveResolvedGraphView.getRoot()).toBeNull();
  expect(state.status).toBe(Status.SUSPENDED);
  expect(state.traversalRootVertexRef).toBe(staleRoot);
  expect(state.dependencyEligiblePhaseVisits).toEqual(beforeReadyVisits);
  expect(state.expansionQueue).toEqual(beforeExpansionQueue);
});

function haltedSeed() {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const root = new MutableValueReference(
    new Vertex<TestGraph>({
      $vertexData: 'root',
      $childDiscoveryHints: ['A', 'B'],
    }),
  );
  const a = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: 'A', $childDiscoveryHints: ['C'] }),
  );
  const b = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: 'B', $childDiscoveryHints: [] }),
  );
  container.acceptRoot(root, 'root');
  container.store.prepareSlots(root, ['A', 'B']);
  container.acceptVertex(a, 'A', ['root'], {
    discoveryDepthInEdges: 1,
    parentVertexAtChildResolution: root.getReferencedValue(),
    parentVertexHandle: root,
    parentChildHintIndex: 0,
    childDiscoveryHint: 'A',
  });
  container.acceptEdge(root, 0, a);
  container.acceptVertex(b, 'B', ['root'], {
    discoveryDepthInEdges: 1,
    parentVertexAtChildResolution: root.getReferencedValue(),
    parentVertexHandle: root,
    parentChildHintIndex: 1,
    childDiscoveryHint: 'B',
  });
  container.acceptEdge(root, 1, b);
  container.store.setVisitStage(root, 'INITIAL_VISIT_COMMITTED');
  container.store.setVisitStage(a, 'INITIAL_VISIT_COMMITTED');
  container.store.setVisitStage(b, 'INITIAL_VISIT_ELIGIBLE');
  const state = new DagTraversalRunnerState<TestGraph>({
    status: Status.SUSPENDED,
    traversalRootVertexRef: root,
    dependencyEligiblePhaseVisits: [
      { vertexHandle: b, order: Order.ON_WORK_READY },
    ],
    expansionQueue: [a],
    visitorsState: {
      [Order.ON_WORK_READY]: {
        phaseVisitorChainIndex: 2,
        visitorCallbackIndexInPhaseChain: 1,
        previousCommittedVisitVertexHandleForSamePhase: a,
      },
      [Order.ON_SUBGRAPH_COMPLETION_READY]: {
        phaseVisitorChainIndex: 0,
        visitorCallbackIndexInPhaseChain: 0,
        previousCommittedVisitVertexHandleForSamePhase: null,
      },
    },
  });
  return { a, b, container, root, state };
}

function acceptDetached(
  seed: ReturnType<typeof haltedSeed>,
  id: string,
  workWaitsForWorkOf: string[],
) {
  const vertexHandle = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: id, $childDiscoveryHints: [] }),
  );
  seed.container.acceptVertex(vertexHandle, id, workWaitsForWorkOf, {
    discoveryDepthInEdges: 1,
    parentVertexAtChildResolution: seed.root.getReferencedValue(),
    parentVertexHandle: seed.root,
    parentChildHintIndex: 0,
    childDiscoveryHint: id,
  });
  return vertexHandle;
}

test('resumes ready and expansion work from a non-empty quiescent DAG seed', () => {
  const { container, state } = haltedSeed();
  const resolutions: string[] = [];
  const runner = createInternalDagTraversalRunner<TestGraph>({
    dagDiscoverySource: {
      resolveRootVertex: () => {
        throw new Error('must not resolve root');
      },
      resolveChildHint: (hint) => {
        resolutions.push(hint);
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
            vertexId: hint,
          },
        };
      },
    },
    traversalRunnerInternalObjects: {
      state,
      resolvedGraphsContainer: container,
    },
  });

  expect(
    runner.captureExecutionSnapshot().dependencyEligiblePhaseVisits,
  ).toEqual([
    {
      vertexReferenceIdentity:
        state.dependencyEligiblePhaseVisits[0]!.vertexHandle.getReferenceIdentity(),
      visitorPhase: Order.ON_WORK_READY,
    },
  ]);

  const events = [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ].map(({ eventKind, vertex }) => `${eventKind}:${vertex.getVertexData()}`);
  expect(events).toEqual([
    'workCompletionCommitted:B',
    'workCompletionCommitted:C',
    'subgraphCompletionCommitted:B',
    'subgraphCompletionCommitted:C',
    'subgraphCompletionCommitted:A',
    'subgraphCompletionCommitted:root',
  ]);
  expect(resolutions).toEqual(['C']);
  const graph = runner.getLiveResolvedGraphView();
  expect(
    graph
      .getStructuralChildHandlesInSlotOrderOrNull(
        graph.getVertexHandleByIdOrNull('root')!,
      )!
      .map((ref) => ref.getCurrentVertexView().getVertexData()),
  ).toEqual(['A', 'B']);
  expect(
    graph
      .getStructuralChildHandlesInSlotOrderOrNull(
        graph.getVertexHandleByIdOrNull('A')!,
      )!
      .map((ref) => ref.getCurrentVertexView().getVertexData()),
  ).toEqual(['C']);
});

test.each([
  [
    'missing ready ref',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.state.dependencyEligiblePhaseVisits[0]!.vertexHandle =
        new MutableValueReference(
          new Vertex<TestGraph>({
            $vertexData: 'missing',
            $childDiscoveryHints: [],
          }),
        );
    },
  ],
  [
    'wrong ready status',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.container.store.setVisitStage(seed.b, 'INITIAL_VISIT_COMMITTED');
    },
  ],
  [
    'prepared expansion',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.container.store.prepareSlots(seed.a, ['C']);
    },
  ],
  [
    'duplicate ready visit',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.state.dependencyEligiblePhaseVisits.push(
        seed.state.dependencyEligiblePhaseVisits[0]!,
      );
    },
  ],
  [
    'invalid ready order',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.state.dependencyEligiblePhaseVisits[0]!.order = 'INVALID' as Order;
    },
  ],
  [
    'active visit',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.container.store.setVisitStage(seed.root, 'INITIAL_VISIT_STARTED');
    },
  ],
  [
    'partial expansion',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.container.store.prepareSlots(seed.b, ['pending']);
    },
  ],
  [
    'discovered work without dependencies',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.container.store.setVisitStage(seed.b, 'DISCOVERED');
      seed.state.dependencyEligiblePhaseVisits = [];
    },
  ],
  [
    'discovered work with prepared slots',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.container.store.setVisitStage(seed.b, 'DISCOVERED');
      seed.container.store.prepareSlots(seed.b, []);
      seed.state.dependencyEligiblePhaseVisits = [];
    },
  ],
  [
    'discovered work in the ready queue',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.container.store.setVisitStage(seed.b, 'DISCOVERED');
    },
  ],
  [
    'ready work with prepared slots',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.container.store.prepareSlots(seed.b, []);
    },
  ],
  [
    'ready work with an unmet dependency',
    (seed: ReturnType<typeof haltedSeed>) => {
      const vertexHandle = acceptDetached(seed, 'D', ['missing']);
      seed.container.store.setVisitStage(
        vertexHandle,
        'INITIAL_VISIT_ELIGIBLE',
      );
      seed.state.dependencyEligiblePhaseVisits.push({
        vertexHandle,
        order: Order.ON_WORK_READY,
      });
    },
  ],
  [
    'ready visit omitted',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.state.dependencyEligiblePhaseVisits = [];
    },
  ],
  [
    'ready visit attached to committed work',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.container.store.setVisitStage(seed.b, 'INITIAL_VISIT_COMMITTED');
      seed.state.expansionQueue.push(seed.b);
    },
  ],
  [
    'pre-visited work with an unmet dependency',
    (seed: ReturnType<typeof haltedSeed>) => {
      const vertexHandle = acceptDetached(seed, 'D', ['missing']);
      seed.container.store.setVisitStage(
        vertexHandle,
        'INITIAL_VISIT_COMMITTED',
      );
      seed.state.expansionQueue.push(vertexHandle);
    },
  ],
  [
    'completing work without prepared slots',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.container.store.setVisitStage(seed.b, 'COMPLETION_VISIT_ELIGIBLE');
      seed.state.dependencyEligiblePhaseVisits[0]!.order =
        Order.ON_SUBGRAPH_COMPLETION_READY;
    },
  ],
  [
    'completing work with remaining children',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.container.store.setVisitStage(
        seed.root,
        'COMPLETION_VISIT_ELIGIBLE',
      );
      seed.state.dependencyEligiblePhaseVisits = [
        { vertexHandle: seed.root, order: Order.ON_SUBGRAPH_COMPLETION_READY },
      ];
    },
  ],
  [
    'completing work with an unmet dependency',
    (seed: ReturnType<typeof haltedSeed>) => {
      const vertexHandle = acceptDetached(seed, 'D', ['missing']);
      seed.container.store.prepareSlots(vertexHandle, []);
      seed.container.store.setVisitStage(
        vertexHandle,
        'COMPLETION_VISIT_ELIGIBLE',
      );
      seed.state.dependencyEligiblePhaseVisits.push({
        vertexHandle,
        order: Order.ON_SUBGRAPH_COMPLETION_READY,
      });
    },
  ],
  [
    'completed work without prepared slots',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.container.store.setVisitStage(seed.b, 'COMPLETION_VISIT_COMMITTED');
      seed.state.dependencyEligiblePhaseVisits = [];
    },
  ],
  [
    'completed work with remaining children',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.container.store.setVisitStage(
        seed.root,
        'COMPLETION_VISIT_COMMITTED',
      );
      seed.state.dependencyEligiblePhaseVisits = [];
    },
  ],
  [
    'completed work in the ready queue',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.container.store.prepareSlots(seed.b, []);
      seed.container.store.setVisitStage(seed.b, 'COMPLETION_VISIT_COMMITTED');
    },
  ],
  [
    'completed work with an unmet dependency',
    (seed: ReturnType<typeof haltedSeed>) => {
      const vertexHandle = acceptDetached(seed, 'D', ['missing']);
      seed.container.store.prepareSlots(vertexHandle, []);
      seed.container.store.setVisitStage(
        vertexHandle,
        'COMPLETION_VISIT_COMMITTED',
      );
    },
  ],
  [
    'duplicate expansion',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.state.expansionQueue.push(seed.a);
    },
  ],
  [
    'unknown expansion',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.state.expansionQueue = [
        new MutableValueReference(
          new Vertex<TestGraph>({
            $vertexData: 'missing',
            $childDiscoveryHints: [],
          }),
        ),
      ];
    },
  ],
  [
    'missing expansion',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.state.expansionQueue = [];
    },
  ],
  [
    'wrong expansion status',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.state.expansionQueue.push(seed.b);
    },
  ],
  [
    'traversal root mismatch',
    (seed: ReturnType<typeof haltedSeed>) => {
      seed.state.traversalRootVertexRef = seed.a;
    },
  ],
] as const)('rejects an inconsistent halted seed with %s', (_name, corrupt) => {
  const seed = haltedSeed();
  corrupt(seed);
  const beforeRefs = seed.container.liveResolvedGraphView.getVertexRefs();
  const beforeRootStatus =
    seed.container.liveResolvedGraphView.getVertexVisitSchedulingStageOrNull(
      seed.root,
    );
  const beforeSlots = seed.container.liveResolvedGraphView.get(
    seed.root,
  )!.slots;

  expect(() =>
    createInternalDagTraversalRunner<TestGraph>({
      dagDiscoverySource: source(),
      traversalRunnerInternalObjects: {
        state: seed.state,
        resolvedGraphsContainer: seed.container,
      },
    }),
  ).toThrow(/injected DAG|seed/i);
  expect(seed.container.liveResolvedGraphView.getVertexRefs()).toEqual(
    beforeRefs,
  );
  expect(
    seed.container.liveResolvedGraphView.getVertexVisitSchedulingStageOrNull(
      seed.root,
    ),
  ).toBe(beforeRootStatus);
  expect(seed.container.liveResolvedGraphView.get(seed.root)!.slots).toEqual(
    beforeSlots,
  );
  expect(seed.state.status).toBe(Status.SUSPENDED);
});

test('rejects injected work for an empty graph', () => {
  const state = new DagTraversalRunnerState<TestGraph>({
    status: Status.SUSPENDED,
    dependencyEligiblePhaseVisits: [
      {
        vertexHandle: new MutableValueReference(
          new Vertex<TestGraph>({ $vertexData: 'x', $childDiscoveryHints: [] }),
        ),
        order: Order.ON_WORK_READY,
      },
    ],
  });
  expect(() =>
    createInternalDagTraversalRunner<TestGraph>({
      dagDiscoverySource: source(),
      traversalRunnerInternalObjects: { state },
    }),
  ).toThrow(/empty graph/i);
});

test.each([
  ['COMPLETION_VISIT_ELIGIBLE', Order.ON_SUBGRAPH_COMPLETION_READY],
  ['COMPLETION_VISIT_COMMITTED', null],
] as const)('restores terminal-ready lifecycle status %s', (status, order) => {
  const seed = haltedSeed();
  seed.container.store.prepareSlots(seed.b, []);
  seed.container.store.setVisitStage(seed.b, status);
  seed.state.dependencyEligiblePhaseVisits =
    order === null ? [] : [{ vertexHandle: seed.b, order }];
  const runner = createInternalDagTraversalRunner<TestGraph>({
    dagDiscoverySource: {
      resolveRootVertex: () => {
        throw new Error('must not resolve root');
      },
      resolveChildHint: (hint) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: hint,
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
        },
      }),
    },
    traversalRunnerInternalObjects: {
      state: seed.state,
      resolvedGraphsContainer: seed.container,
    },
  });
  const events = [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ].map((event) => `${event.eventKind}:${event.vertex.getVertexData()}`);
  expect(events.filter((event) => event.endsWith(':B'))).toEqual(
    status === 'COMPLETION_VISIT_ELIGIBLE'
      ? ['subgraphCompletionCommitted:B']
      : [],
  );
  expect(
    runner
      .getLiveResolvedGraphView()
      .getVertexVisitSchedulingStageOrNull(createVertexHandleFacet(seed.root)),
  ).toBe('COMPLETION_VISIT_COMMITTED');
});

test('restores discovered work blocked by a missing dependency', () => {
  const seed = haltedSeed();
  const blocked = acceptDetached(seed, 'blocked', ['missing']);
  const runner = createInternalDagTraversalRunner<TestGraph>({
    dagDiscoverySource: {
      resolveRootVertex: () => {
        throw new Error('must not resolve root');
      },
      resolveChildHint: (hint) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: hint,
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
        },
      }),
    },
    traversalRunnerInternalObjects: {
      state: seed.state,
      resolvedGraphsContainer: seed.container,
    },
  });
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(
    /stalled.*blocked.*missing/i,
  );
  expect(
    runner
      .getLiveResolvedGraphView()
      .getVertexVisitSchedulingStageOrNull(createVertexHandleFacet(blocked)),
  ).toBe('DISCOVERED');
});

test.each(['omitted', 'completing', 'complete'] as const)(
  'restores a ready vertex whose dependency is %s',
  (dependencyStatus) => {
    const seed = haltedSeed();
    let dependencyId: string;
    if (dependencyStatus === 'omitted') {
      dependencyId = 'omitted-dependency';
      seed.container.store.markOmitted(dependencyId);
    } else {
      dependencyId = 'B';
      seed.container.store.prepareSlots(seed.b, []);
      seed.container.store.setVisitStage(
        seed.b,
        dependencyStatus === 'completing'
          ? 'COMPLETION_VISIT_ELIGIBLE'
          : 'COMPLETION_VISIT_COMMITTED',
      );
      seed.state.dependencyEligiblePhaseVisits =
        dependencyStatus === 'completing'
          ? [
              {
                vertexHandle: seed.b,
                order: Order.ON_SUBGRAPH_COMPLETION_READY,
              },
            ]
          : [];
    }
    const dependent = acceptDetached(seed, 'dependent', [dependencyId]);
    seed.container.store.setVisitStage(dependent, 'INITIAL_VISIT_ELIGIBLE');
    seed.state.dependencyEligiblePhaseVisits.push({
      vertexHandle: dependent,
      order: Order.ON_WORK_READY,
    });
    expect(() =>
      createInternalDagTraversalRunner<TestGraph>({
        dagDiscoverySource: source(),
        traversalRunnerInternalObjects: {
          state: seed.state,
          resolvedGraphsContainer: seed.container,
        },
      }),
    ).not.toThrow();
  },
);

test('rejects incompatible and active injected objects', () => {
  const treeContainer = new ResolvedGraphsContainer<TestGraph, TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  expect(() =>
    createInternalDagTraversalRunner<TestGraph>({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
      traversalRunnerInternalObjects: {
        resolvedGraphsContainer: treeContainer,
      },
    }),
  ).toThrow(/source mode/i);

  const state = new DagTraversalRunnerState<TestGraph>({
    status: Status.RUNNING,
  });
  expect(() =>
    createInternalDagTraversalRunner<TestGraph>({
      dagDiscoverySource: source(),
      traversalRunnerInternalObjects: { state },
    }),
  ).toThrow(/quiescent|active|RUNNING/i);

  const failedWithoutError = new DagTraversalRunnerState<TestGraph>({
    status: Status.FAILED,
  });
  expect(() =>
    createInternalDagTraversalRunner<TestGraph>({
      dagDiscoverySource: source(),
      traversalRunnerInternalObjects: { state: failedWithoutError },
    }),
  ).toThrow(/tagged failure/i);
});

test('retains terminal injected state and validates snapshot compatibility', () => {
  const finished = new DagTraversalRunnerState<TestGraph>({
    status: Status.FINISHED,
  });
  const finishedRunner = createInternalDagTraversalRunner<TestGraph>({
    dagDiscoverySource: source(),
    traversalRunnerInternalObjects: { state: finished },
  });
  expect([
    ...finishedRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toEqual([]);

  const error = new Error('stored');
  const failed = new DagTraversalRunnerState<TestGraph>({
    status: Status.FAILED,
    failure: { error },
  });
  const failedRunner = createInternalDagTraversalRunner<TestGraph>({
    dagDiscoverySource: source(),
    traversalRunnerInternalObjects: { state: failed },
  });
  expect(() => failedRunner.runUntilSuspendedOrTerminal()).toThrow(error);

  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: true,
  });
  expect(() =>
    createInternalDagTraversalRunner<TestGraph>({
      dagDiscoverySource: source(),
      traversalRunnerInternalObjects: {
        resolvedGraphsContainer: container,
      },
    }),
  ).toThrow(/snapshot mode/i);
});

test('prevents another runner from claiming live DAG objects', () => {
  const state = new DagTraversalRunnerState<TestGraph>();
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const input = {
    dagDiscoverySource: source(),
    traversalRunnerInternalObjects: {
      state,
      resolvedGraphsContainer: container,
    },
  };
  const runner = createInternalDagTraversalRunner<TestGraph>(input);
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  iterator.next();

  expect(() =>
    createInternalDagTraversalRunner<TestGraph>({
      ...input,
      traversalRunnerInternalObjects: {
        state: new DagTraversalRunnerState<TestGraph>(),
        resolvedGraphsContainer: container,
      },
    }),
  ).toThrow(/active runner/i);
  iterator.return?.(undefined);
});

test('rejects a deferred competing claim for shared DAG objects', () => {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const make = () =>
    createInternalDagTraversalRunner<TestGraph>({
      dagDiscoverySource: source(),
      traversalRunnerInternalObjects: {
        state: new DagTraversalRunnerState<TestGraph>(),
        resolvedGraphsContainer: container,
      },
    });
  const first = make();
  const second = make();
  const iterator =
    first.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  iterator.next();

  const before = second.captureExecutionSnapshot().executionOptions;
  expect(() =>
    second
      .runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [],
      })
      .next(),
  ).toThrow(/another active runner/i);
  expect(second.captureExecutionSnapshot().executionOptions).toEqual(before);
  iterator.return?.(undefined);
});

test('inspection reports fixed synchronous DAG configuration', () => {
  const runner = new DagTraversalBuilder<TestGraph>({
    dagDiscoverySource: source(),
  }).createIndependentRunnerFromCurrentOptions();
  expect(runner.captureExecutionSnapshot()).toMatchObject({
    traversalLifecycleStatus: Status.NOT_STARTED,
    traversalAlgorithm: 'dag',
    callbackExecutionMode: 'sync',
    sourceTopologyKind: 'graph',
    maxConcurrentCallbackInvocations: 1,
    bufferedDeliveryEventCount: 0,
  });
});
