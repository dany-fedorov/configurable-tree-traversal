import {
  AsyncBreadthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase,
  TraversalRunnerStatus,
} from '../src';
import type {
  TreeOrDagExecutionSnapshot,
  VertexDataAndChildHintTypes,
} from '../src';
import { deferred } from './helpers/graph-fixtures';

type G = VertexDataAndChildHintTypes<string, string>;
const root = {
  kind: 'vertexResolved' as const,
  resolvedVertexInput: {
    vertexId: undefined,
    vertexContentInput: {
      $vertexData: 'root',
      $childDiscoveryHints: [] as string[],
    },
  },
};

test('DAG inspection names pending public operations without source IO or engine keys', () => {
  const snapshots: TreeOrDagExecutionSnapshot[] = [];
  const observe = () => {
    snapshots.push(runner.captureExecutionSnapshot());
    expect(runner.captureExecutionSnapshot()).toEqual(
      snapshots[snapshots.length - 1],
    );
  };
  const runner = new DagTraversalBuilder<G>({
    dagDiscoverySource: {
      resolveRootVertex: () => {
        observe();
        return {
          ...root,
          resolvedVertexInput: {
            ...root.resolvedVertexInput,
            workWaitsForWorkOf: ['external'],
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['child'],
            },
          },
        };
      },
      resolvePrerequisiteByVertexId: () => {
        observe();
        return {
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'external',
              $childDiscoveryHints: [],
            },
          },
        };
      },
      tryGetVertexIdentityFromHint: (hint) => {
        observe();
        return { vertexId: hint };
      },
      resolveChildHint: (hint) => {
        observe();
        return {
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexId: hint,
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        };
      },
    },
    transformChildHintsBeforeResolution: (hints) => {
      observe();
      return hints;
    },
    visitors: {
      ON_WORK_READY: () => {
        observe();
      },
    },
  }).createIndependentRunnerFromCurrentOptions();
  runner.runUntilSuspendedOrTerminal();
  expect(
    snapshots.flatMap((snapshot) => snapshot.pendingCallbackRequests),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        operation: 'resolveRootVertex',
        owner: {
          ownerKind: 'rootResolution',
          runnerLocalOwnerId: 1,
          validityGeneration: 0,
        },
        ownerStillValid: true,
      }),
      expect.objectContaining({
        operation: 'resolveChildHint',
        owner: expect.objectContaining({ ownerKind: 'vertexTraversalFrame' }),
        ownerStillValid: true,
      }),
      expect.objectContaining({
        operation: 'resolvePrerequisiteByVertexId',
        owner: expect.objectContaining({ ownerKind: 'prerequisiteResolution' }),
        ownerStillValid: true,
      }),
      expect.objectContaining({
        operation: 'transformChildHintsBeforeResolution',
        ownerStillValid: true,
      }),
      expect.objectContaining({
        operation: 'tryGetVertexIdentityFromHint',
        ownerStillValid: true,
      }),
      expect.objectContaining({
        operation: 'invokeVisitorCallback',
        owner: expect.objectContaining({
          ownerKind: 'vertexPhaseVisitorChain',
        }),
        ownerStillValid: true,
      }),
    ]),
  );
  for (const snapshot of snapshots) {
    for (const request of snapshot.pendingCallbackRequests)
      expect(request).not.toHaveProperty('kind');
  }
  const count = snapshots.length;
  expect(runner.captureExecutionSnapshot()).toMatchObject({
    traversalLifecycleStatus: TraversalRunnerStatus.FINISHED,
    pendingCallbackRequests: [],
    inFlightInvocationCount: 0,
  });
  expect(snapshots).toHaveLength(count);
});

for (const family of ['depth-first', 'breadth-first', 'dag'] as const) {
  test(`${family} separates visit phase from chain state while pause drains a visitor`, async () => {
    const gate = deferred<void>();
    const entered = deferred<void>();
    let sourceCalls = 0;
    const visitor = async () => {
      entered.resolve();
      await gate.promise;
    };
    const tree = {
      resolveRootVertex: () => {
        sourceCalls++;
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: root.resolvedVertexInput.vertexContentInput,
          },
        };
      },
      resolveChildVertexFromHint: () => ({
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    };
    const runner =
      family === 'depth-first'
        ? new AsyncDepthFirstTreeTraversalBuilder<G>({
            treeDiscoverySource: tree,
            visitors: { BEFORE_CHILD_EXPANSION: visitor },
          }).createIndependentRunnerFromCurrentOptions()
        : family === 'breadth-first'
        ? new AsyncBreadthFirstTreeTraversalBuilder<G>({
            treeDiscoverySource: tree,
            visitors: { AT_LEVEL_ORDER_VERTEX: visitor },
          }).createIndependentRunnerFromCurrentOptions()
        : new AsyncDagTraversalBuilder<G>({
            dagDiscoverySource: {
              resolveRootVertex: () => {
                sourceCalls++;
                return root;
              },
              resolveChildHint: () => ({
                omittedVertexIdentity: null,
                kind: 'vertexIntentionallyOmitted',
                satisfiesWorkAndSubgraphCompletionPrerequisites: true,
              }),
            },
            visitors: { ON_WORK_READY: visitor },
          }).createIndependentRunnerFromCurrentOptions();
    const running = runner.runUntilSuspendedOrTerminal();
    await entered.promise;
    const phase =
      family === 'depth-first'
        ? 'BEFORE_CHILD_EXPANSION'
        : family === 'breadth-first'
        ? 'AT_LEVEL_ORDER_VERTEX'
        : 'ON_WORK_READY';
    const first = runner.captureExecutionSnapshot();
    expect(first).toMatchObject({
      inFlightInvocationCount: 1,
      vertexPhaseVisitorChains: [
        {
          visitorPhase: phase,
          state: 'active',
          visitorCallbackIndexInPhaseChain: 0,
          pendingCallbackOrCommandBatch: 'visitorCallbackResult',
          executionSelectionsAtAdmission: {
            admittedVisitorCallbackPhases: 'all',
          },
        },
      ],
      pendingCallbackRequests: [
        { operation: 'invokeVisitorCallback', ownerStillValid: true },
      ],
    });
    const chain = first.vertexPhaseVisitorChains[0]!;
    expect(first.pendingCallbackRequests[0]!.owner).toEqual(chain.owner);
    expect(Object.isFrozen(chain)).toBe(true);
    for (const key of ['order', 'group', 'position', 'config'])
      expect(chain).not.toHaveProperty(key);
    const graph = runner.getLiveResolvedGraphView();
    const ref = graph.getVertexHandles()[0]!;
    expect(graph.getVertexSnapshotOrNull(ref)).toMatchObject({
      schedulingVisitStage:
        family === 'dag' ? 'INITIAL_VISIT_STARTED' : 'INITIAL_VISIT_ELIGIBLE',
    });
    expect(graph.getVertexVisitSchedulingStageOrNull(ref)).toBe(
      family === 'dag' ? 'INITIAL_VISIT_STARTED' : 'INITIAL_VISIT_ELIGIBLE',
    );
    expect(graph.getVertexSnapshotOrNull(ref)).not.toHaveProperty('status');
    expect(graph).not.toHaveProperty('getStatusOf');
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
    const pausing = runner.captureExecutionSnapshot();
    expect(pausing).toMatchObject({
      pauseRequested: true,
      inFlightInvocationCount: 1,
      pendingCallbackRequests: [{ operation: 'invokeVisitorCallback' }],
    });
    expect(pausing.pendingCallbackRequests[0]!.owner).toEqual(chain.owner);
    expect(runner.captureExecutionSnapshot()).toEqual(pausing);
    expect(sourceCalls).toBe(1);
    gate.resolve();
    await running;
    expect(runner.captureExecutionSnapshot()).toMatchObject({
      traversalLifecycleStatus: TraversalRunnerStatus.SUSPENDED,
      traversalStopReason: 'paused',
      inFlightInvocationCount: 0,
      pendingCallbackRequests: [],
    });
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.getTraversalLifecycleStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
    expect(graph.getVertexSnapshotOrNull(ref)).toMatchObject({
      schedulingVisitStage: 'COMPLETION_VISIT_COMMITTED',
    });
  });
}

test('deferred work keeps the initial visit started after callbacks drain', () => {
  const runner = new DagTraversalBuilder<G>({
    workCompletionPolicy: 'requireExternalWorkSettlement',
    dagDiscoverySource: {
      resolveRootVertex: () => root,
      resolveChildHint: () => ({
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted',
        satisfiesWorkAndSubgraphCompletionPrerequisites: true,
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  runner.runUntilSuspendedOrTerminal();
  const graph = runner.getLiveResolvedGraphView();
  const ref = graph.getVertexHandleByIdOrNull(undefined)!;
  expect(graph.getVertexSnapshotOrNull(ref)).toMatchObject({
    vertexId: undefined,
    schedulingVisitStage: 'INITIAL_VISIT_STARTED',
  });
  expect(runner.captureExecutionSnapshot()).toMatchObject({
    traversalLifecycleStatus: TraversalRunnerStatus.SUSPENDED,
    traversalStopReason: 'awaitingSettlement',
    inFlightInvocationCount: 0,
    pendingCallbackRequests: [],
    vertexPhaseVisitorChains: [],
  });
  const frontier = runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
  expect(frontier.vertexId).toBeUndefined();
  expect(
    runner.settleDeferredWork(
      undefined,
      { kind: 'workCompleted' },
      frontier.settlementToken,
    ),
  ).toBe(true);
  runner.runUntilSuspendedOrTerminal();
  expect(graph.getVertexSnapshotOrNull(ref)).toMatchObject({
    schedulingVisitStage: 'COMPLETION_VISIT_COMMITTED',
  });
});

test('completion diagnostics describe eligibility at callback admission, independently of W/C progress', () => {
  const stages: unknown[] = [];
  const runner = new DagTraversalBuilder<G>({
    dagDiscoverySource: {
      resolveRootVertex: () => root,
      resolveChildHint: () => ({
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted',
        satisfiesWorkAndSubgraphCompletionPrerequisites: true,
      }),
    },
    visitors: {
      [DagVisitorPhase.ON_WORK_READY]: (_vertex, context) => {
        stages.push(
          context.liveResolvedGraphView.getVertexSnapshotOrNull(
            context.vertexHandle,
          ),
        );
      },
      [DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY]: (_vertex, context) => {
        stages.push(
          context.liveResolvedGraphView.getVertexSnapshotOrNull(
            context.vertexHandle,
          ),
        );
      },
    },
  }).createIndependentRunnerFromCurrentOptions();
  runner.runUntilSuspendedOrTerminal();
  expect(stages).toEqual([
    expect.objectContaining({ schedulingVisitStage: 'INITIAL_VISIT_STARTED' }),
    expect.objectContaining({
      schedulingVisitStage: 'COMPLETION_VISIT_ELIGIBLE',
    }),
  ]);
  expect(runner.captureProgressSnapshot().counts).toMatchObject({
    workCompletionCommittedVertices: 1,
    subgraphCompletionCommittedVertices: 1,
  });
});

type SorterInput = {
  treeDiscoverySource: import('../src').TreeDiscoverySource<G>;
  transformChildHintsBeforeResolution: (hints: string[]) => string[];
};
for (const [name, create] of [
  [
    'depth-first',
    (input: SorterInput) => new DepthFirstTreeTraversalBuilder<G>(input),
  ],
  [
    'breadth-first',
    (input: SorterInput) => new BreadthFirstTreeTraversalBuilder<G>(input),
  ],
  ['dag', (input: SorterInput) => new DagTraversalBuilder<G>(input)],
  [
    'async depth-first',
    (input: SorterInput) => new AsyncDepthFirstTreeTraversalBuilder<G>(input),
  ],
  [
    'async breadth-first',
    (input: SorterInput) => new AsyncBreadthFirstTreeTraversalBuilder<G>(input),
  ],
  ['async dag', (input: SorterInput) => new AsyncDagTraversalBuilder<G>(input)],
] as const) {
  test(`${name} reports transformChildHintsBeforeResolution while the sorter runs`, async () => {
    const observed: string[] = [];
    const runner = create({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted',
        }),
      },
      transformChildHintsBeforeResolution: (hints) => {
        observed.push(
          ...runner
            .captureExecutionSnapshot()
            .pendingCallbackRequests.map((request) => request.operation),
        );
        return hints;
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(observed).toEqual(['transformChildHintsBeforeResolution']);
  });
}
