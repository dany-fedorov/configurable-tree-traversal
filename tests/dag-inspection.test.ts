import { inspectInternalDagState } from './internal-runner-fixtures';
import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagTraversalStallError as CTTStallError,
  DagVisitorPhase as Order,
  captureDagMilestoneSnapshot,
  materializeMultiEntryDagInputFromRecordCatalog,
  TraversalVisitorCommandName as Command,
} from '../src';
import type { CallSpec } from '../src/core/effects/types';
import { GraphStore } from '../src/core/graph/GraphStore';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { GraphScheduling } from '../src/core/scheduling/GraphScheduling';
import { TraversalKernel } from '../src/core/TraversalKernel';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { runnerInternals } from './internal-runner-fixtures';

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} reports exact W waits when the same seeded ID still blocks C`, async () => {
    const records = [
      { id: 'bundle', children: ['child'], work: [], complete: [] },
      { id: 'child', children: [], work: [], complete: [] },
      { id: 'review', children: [], work: ['bundle'], complete: ['bundle'] },
    ];
    const runner = new Constructor({
      ...materializeMultiEntryDagInputFromRecordCatalog(records, {
        selectVertexId: (item) => item.id,
        selectStructuralChildVertexIds: (item) => item.children,
        selectWorkPrerequisiteVertexIds: (item) => item.work,
        selectSubgraphCompletionPrerequisiteVertexIds: (item) => item.complete,
      }),
      acceptedCompletedWorkVertexIds: new Set(['bundle']),
      workCompletionPolicy: 'requireExternalWorkSettlement',
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('review'),
    ).toMatchObject({
      unmetWorkMilestoneVertexIds: [],
      unmetSubgraphCompletionMilestoneVertexIds: ['bundle'],
      unmetPrerequisiteVertexIds: ['bundle'],
    });
  });

  test(`${Constructor.name} owns exact nonempty W waits independently of union and C waits`, async () => {
    const records = [
      { id: 'review', work: ['work'], complete: ['complete'] },
      { id: 'work', work: [], complete: [] },
      { id: 'complete', work: [], complete: [] },
    ];
    const runner = new Constructor({
      ...materializeMultiEntryDagInputFromRecordCatalog(records, {
        selectVertexId: (item) => item.id,
        selectWorkPrerequisiteVertexIds: (item) => item.work,
        selectSubgraphCompletionPrerequisiteVertexIds: (item) => item.complete,
      }),
      workCompletionPolicy: 'requireExternalWorkSettlement',
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    const first = runner
      .captureProgressSnapshot()
      .progressByVertexId.get('review')!;
    expect(first).toMatchObject({
      unmetWorkMilestoneVertexIds: ['work'],
      unmetSubgraphCompletionMilestoneVertexIds: ['complete'],
      unmetPrerequisiteVertexIds: ['work', 'complete'],
    });
    (first.unmetWorkMilestoneVertexIds as string[]).push('changed');
    expect(first.unmetPrerequisiteVertexIds).toEqual(['work', 'complete']);
    expect(first.unmetSubgraphCompletionMilestoneVertexIds).toEqual([
      'complete',
    ]);
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('review')!
        .unmetWorkMilestoneVertexIds,
    ).toEqual(['work']);
  });
}

type G = VertexDataAndChildHintTypes<string, string>;

function makeKernel(
  options: { sourceRootIsHiddenEntryHolder?: boolean; seeded?: boolean } = {},
) {
  const container = new ResolvedGraphsContainer<G>({
    sourceMode: 'graph',
    syntheticRoot: options.sourceRootIsHiddenEntryHolder ?? false,
    saveOriginal: false,
  });
  const kernel = new TraversalKernel<G>({
    kind: 'dag',
    execution: 'async',
    sourceMode: 'graph',
    container,
    stateBridge: {
      status: TraversalRunnerStatus.NOT_STARTED,
      traversalRootVertexRef: null,
      subtreeTraversalDisabledRefs: new Set(),
      visitorsState: {},
    },
    visitorMetadata: {},
    iterableConfig: {
      iterateOver: [],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: null,
    hasChildHintsListTransformer: false,
    hasChildHintVertexIdResolver: false,
    maxConcurrentCallbackInvocations: 2,
    workCompletionPolicy: 'requireExternalWorkSettlement',
    ...(options.seeded
      ? { acceptedCompletedWorkVertexIds: new Set(['root']) }
      : {}),
  });
  return { kernel, container };
}

function nextCall(kernel: TraversalKernel<G>): CallSpec<G> {
  const action = kernel.poll('drive');
  if (action.kind !== 'CALL')
    throw new Error(`Expected call, got ${action.kind}`);
  return action.call;
}

test('identity observations distinguish known omitted and deleted IDs from unknown IDs', () => {
  const store = new GraphStore<G>('dag');
  const objectId = { label: 'omitted' };
  store.markOmitted(undefined);
  store.markOmitted(objectId);
  store.markDeleted(NaN);
  const snapshot = store.inspectIdentityStates();
  expect(snapshot).toEqual([
    { vertexId: undefined, kind: 'omitted' },
    { vertexId: objectId, kind: 'omitted' },
    { vertexId: NaN, kind: 'deleted' },
  ]);
  expect(snapshot[1]!.vertexId).toBe(objectId);
  (snapshot[0] as { kind: string }).kind = 'deleted';
  (snapshot as unknown[]).pop();
  store.markDeleted('later');
  expect(store.getIdState(undefined)).toEqual({ kind: 'omitted' });
  expect(store.getIdState('unknown')).toBeUndefined();
  expect(snapshot).toHaveLength(2);
  expect(Object.isFrozen(objectId)).toBe(false);
});

test('scheduling observations retain per-vertex expansion and uncommitted completion facts', () => {
  const container = new ResolvedGraphsContainer<G>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const scheduling = new GraphScheduling(container);
  const root = scheduling.acceptRoot({
    vertexId: undefined,
    vertexContent: { $vertexData: 'root', $childDiscoveryHints: [] },
  })!;
  scheduling.markPreVisited(root);
  scheduling.prepareSlots(root, []);
  scheduling.closeExpansion(root);
  const snapshot = scheduling.inspectSchedulingState();
  expect(snapshot).toEqual([
    {
      vertexId: undefined,
      expansion: 'closed',
      initialCommitted: true,
      completionCommitted: false,
      remainingChildren: 0,
    },
  ]);
  scheduling.markComplete(root);
  expect(snapshot[0]!.completionCommitted).toBe(false);
  (snapshot[0] as { remainingChildren: number }).remainingChildren = 42;
  expect(scheduling.inspectWork()[0]!.remainingChildren).toBe(0);
});

test('kernel observations retain partial expansion and remain stable after settlement', () => {
  const { kernel, container } = makeKernel({ seeded: true });
  const initial = kernel.inspectDagState();
  expect(initial).toEqual({
    identityStates: [],
    schedulingStates: [],
    discoveryComplete: false,
  });
  const root = nextCall(kernel);
  kernel.submit({
    requestId: root.requestId,
    kind: 'MAKE_ROOT',
    outcome: {
      ok: true,
      value: {
        vertexId: 'root',
        vertexContent: { $vertexData: 'root', $childDiscoveryHints: ['child'] },
      },
    },
  });
  const child = nextCall(kernel);
  const partial = kernel.inspectDagState();
  expect(partial).toEqual({
    identityStates: [{ vertexId: 'root', kind: 'live' }],
    schedulingStates: [
      {
        vertexId: 'root',
        expansion: 'open',
        initialCommitted: true,
        completionCommitted: false,
        remainingChildren: 0,
      },
    ],
    discoveryComplete: false,
  });
  expect(child.kind).toBe('MAKE_VERTEX');
  kernel.submit({
    requestId: child.requestId,
    kind: 'MAKE_VERTEX',
    outcome: {
      ok: true,
      value: {
        vertexId: 'child',
        vertexContent: { $vertexData: 'child', $childDiscoveryHints: [] },
      },
    },
  });
  expect(kernel.poll('drive').kind).toBe('SUSPENDED');
  const deferred = kernel.inspectDagState();
  expect(deferred).toEqual({
    identityStates: [
      { vertexId: 'root', kind: 'live' },
      { vertexId: 'child', kind: 'live' },
    ],
    schedulingStates: [
      {
        vertexId: 'root',
        expansion: 'closed',
        initialCommitted: true,
        completionCommitted: false,
        remainingChildren: 1,
      },
      {
        vertexId: 'child',
        expansion: 'closed',
        initialCommitted: false,
        completionCommitted: false,
        remainingChildren: 0,
      },
    ],
    discoveryComplete: true,
  });
  const ticket = kernel.captureProgressSnapshot().workAwaitingSettlement[0]!;
  kernel.settle(
    ticket.vertexId,
    { kind: 'workCompleted' },
    ticket.settlementToken,
  );
  kernel.resume();
  // Recorded observations still require acknowledgement when delivery is hidden.
  // The seeded root never synthesizes a work observation.
  const observations: string[] = [];
  let action = kernel.poll('drive');
  while (action.kind === 'EVENT') {
    expect(kernel.shouldEmit(action.event.order)).toBe(false);
    observations.push(
      `${action.event.vertex.getVertexData()}:${action.event.order}`,
    );
    kernel.acknowledgeEvent(action.boundaryId);
    action = kernel.poll('drive');
  }
  expect(observations).toEqual([
    'child:ON_WORK_READY',
    'child:ON_SUBGRAPH_COMPLETION_READY',
    'root:ON_SUBGRAPH_COMPLETION_READY',
  ]);
  expect(action.kind).toBe('FINISHED');
  expect(partial).toEqual({
    identityStates: [{ vertexId: 'root', kind: 'live' }],
    schedulingStates: [
      {
        vertexId: 'root',
        expansion: 'open',
        initialCommitted: true,
        completionCommitted: false,
        remainingChildren: 0,
      },
    ],
    discoveryComplete: false,
  });
  expect(
    container.liveResolvedGraphView.getVertexVisitSchedulingStageOrNull(
      container.liveResolvedGraphView.getVertexRefById('root')!,
    ),
  ).toBe('COMPLETION_VISIT_COMMITTED');
});

test('kernel observations preserve an omitted root with its own undefined identity', () => {
  const { kernel, container } = makeKernel();
  const root = nextCall(kernel);
  kernel.submit({
    requestId: root.requestId,
    kind: 'MAKE_ROOT',
    outcome: { ok: true, value: { vertexContent: null, vertexId: undefined } },
  });
  expect(kernel.poll('drive').kind).toBe('FINISHED');
  container.store.markDeleted('deleted');
  expect(kernel.inspectDagState()).toEqual({
    identityStates: [
      { vertexId: undefined, kind: 'omitted' },
      { vertexId: 'deleted', kind: 'deleted' },
    ],
    schedulingStates: [],
    discoveryComplete: true,
  });
});

test('kernel observations hide the synthetic holder while preserving caller symbol IDs', () => {
  const { kernel } = makeKernel({ sourceRootIsHiddenEntryHolder: true });
  const root = nextCall(kernel);
  kernel.submit({
    requestId: root.requestId,
    kind: 'MAKE_ROOT',
    outcome: {
      ok: true,
      value: {
        vertexContent: {
          $vertexData: 'roots',
          $childDiscoveryHints: ['child'],
        },
      },
    },
  });
  const child = nextCall(kernel);
  expect(kernel.inspectDagState()).toEqual({
    identityStates: [],
    schedulingStates: [],
    discoveryComplete: false,
  });
  const id = Symbol('caller');
  kernel.submit({
    requestId: child.requestId,
    kind: 'MAKE_VERTEX',
    outcome: {
      ok: true,
      value: {
        vertexId: id,
        vertexContent: { $vertexData: 'child', $childDiscoveryHints: [] },
      },
    },
  });
  expect(kernel.poll('drive').kind).toBe('SUSPENDED');
  expect(kernel.inspectDagState()).toEqual({
    identityStates: [{ vertexId: id, kind: 'live' }],
    schedulingStates: [
      {
        vertexId: id,
        expansion: 'closed',
        initialCommitted: false,
        completionCommitted: false,
        remainingChildren: 0,
      },
    ],
    discoveryComplete: true,
  });
});

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} navigates original W/C and structural constraints in both directions`, async () => {
    const records = [
      { id: 'bundle', children: ['child'], work: [], complete: [] },
      { id: 'child', children: [], work: ['source'], complete: [] },
      { id: 'review', children: [], work: ['bundle'], complete: ['bundle'] },
      { id: 'source', children: [], work: [], complete: [] },
    ];
    const runner = new Constructor({
      ...materializeMultiEntryDagInputFromRecordCatalog(records, {
        selectVertexId: (item) => item.id,
        selectStructuralChildVertexIds: (item) => item.children,
        selectWorkPrerequisiteVertexIds: (item) => item.work,
        selectSubgraphCompletionPrerequisiteVertexIds: (item) => item.complete,
      }),
      workCompletionPolicy: 'requireExternalWorkSettlement',
    }).createIndependentRunnerFromCurrentOptions();
    await runner.discoverValidateAndFreezeTopology();
    await runner.runUntilSuspendedOrTerminal();
    const inspection = captureDagMilestoneSnapshot(runner);
    expect(
      inspection.queryOriginalPrerequisiteMilestonesOf({
        vertexId: 'review',
        milestone: 'workCompletion',
      }),
    ).toEqual({
      reachedMilestones: [
        { vertexId: 'bundle', milestone: 'workCompletion' },
        { vertexId: 'bundle', milestone: 'subgraphCompletion' },
      ],
      originalMilestoneConstraints: [
        {
          waitingMilestone: { vertexId: 'review', milestone: 'workCompletion' },
          prerequisiteMilestone: {
            vertexId: 'bundle',
            milestone: 'workCompletion',
          },
          reason: 'workDependency',
        },
        {
          waitingMilestone: { vertexId: 'review', milestone: 'workCompletion' },
          prerequisiteMilestone: {
            vertexId: 'bundle',
            milestone: 'subgraphCompletion',
          },
          reason: 'subgraphCompletionDependency',
        },
      ],
      discoveryComplete: true,
    });
    expect(
      inspection.queryOriginalDependentMilestonesOf({
        vertexId: 'bundle',
        milestone: 'subgraphCompletion',
      }),
    ).toEqual({
      reachedMilestones: [{ vertexId: 'review', milestone: 'workCompletion' }],
      originalMilestoneConstraints: [
        {
          waitingMilestone: { vertexId: 'review', milestone: 'workCompletion' },
          prerequisiteMilestone: {
            vertexId: 'bundle',
            milestone: 'subgraphCompletion',
          },
          reason: 'subgraphCompletionDependency',
        },
      ],
      discoveryComplete: true,
    });
    expect(
      inspection.queryOriginalPrerequisiteMilestonesOf(
        { vertexId: 'review', milestone: 'workCompletion' },
        { includeTransitiveMilestones: true },
      ),
    ).toEqual({
      reachedMilestones: [
        { vertexId: 'bundle', milestone: 'workCompletion' },
        { vertexId: 'bundle', milestone: 'subgraphCompletion' },
        { vertexId: 'child', milestone: 'subgraphCompletion' },
        { vertexId: 'child', milestone: 'workCompletion' },
        { vertexId: 'source', milestone: 'workCompletion' },
      ],
      originalMilestoneConstraints: [
        {
          waitingMilestone: { vertexId: 'review', milestone: 'workCompletion' },
          prerequisiteMilestone: {
            vertexId: 'bundle',
            milestone: 'workCompletion',
          },
          reason: 'workDependency',
        },
        {
          waitingMilestone: { vertexId: 'review', milestone: 'workCompletion' },
          prerequisiteMilestone: {
            vertexId: 'bundle',
            milestone: 'subgraphCompletion',
          },
          reason: 'subgraphCompletionDependency',
        },
        {
          waitingMilestone: {
            vertexId: 'bundle',
            milestone: 'subgraphCompletion',
          },
          prerequisiteMilestone: {
            vertexId: 'bundle',
            milestone: 'workCompletion',
          },
          reason: 'ownWork',
        },
        {
          waitingMilestone: {
            vertexId: 'bundle',
            milestone: 'subgraphCompletion',
          },
          prerequisiteMilestone: {
            vertexId: 'child',
            milestone: 'subgraphCompletion',
          },
          reason: 'structuralChild',
        },
        {
          waitingMilestone: {
            vertexId: 'child',
            milestone: 'subgraphCompletion',
          },
          prerequisiteMilestone: {
            vertexId: 'child',
            milestone: 'workCompletion',
          },
          reason: 'ownWork',
        },
        {
          waitingMilestone: { vertexId: 'child', milestone: 'workCompletion' },
          prerequisiteMilestone: {
            vertexId: 'source',
            milestone: 'workCompletion',
          },
          reason: 'workDependency',
        },
      ],
      discoveryComplete: true,
    });
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} preserves SameValueZero milestone identities and result ownership`, async () => {
    const first = { label: 'same' };
    const second = { label: 'same' };
    const symbol = Symbol('id');
    const ids: unknown[] = [
      first,
      second,
      symbol,
      undefined,
      null,
      NaN,
      -0,
      '0',
    ];
    const records = ids.map((id) => ({ id, work: [] as unknown[] }));
    records[0]!.work = [second, symbol, undefined, null, NaN, -0, '0'];
    const runner = new Constructor({
      ...materializeMultiEntryDagInputFromRecordCatalog(records, {
        selectVertexId: (item) => item.id,
        selectWorkPrerequisiteVertexIds: (item) => item.work,
      }),
      workCompletionPolicy: 'requireExternalWorkSettlement',
    }).createIndependentRunnerFromCurrentOptions();
    await runner.discoverValidateAndFreezeTopology();
    const inspection = captureDagMilestoneSnapshot(runner);
    const result = inspection.queryOriginalPrerequisiteMilestonesOf({
      vertexId: first,
      milestone: 'workCompletion',
    });
    expect(result.reachedMilestones.map(({ vertexId }) => vertexId)).toEqual([
      second,
      symbol,
      undefined,
      null,
      NaN,
      -0,
      '0',
    ]);
    expect(result.reachedMilestones[0]!.vertexId).toBe(second);
    expect(
      inspection.queryOriginalDependentMilestonesOf({
        vertexId: +0,
        milestone: 'workCompletion',
      }).reachedMilestones,
    ).toEqual([
      { vertexId: first, milestone: 'workCompletion' },
      { vertexId: -0, milestone: 'subgraphCompletion' },
    ]);
    expect(
      inspection.queryOriginalDependentMilestonesOf({
        vertexId: Number('NaN'),
        milestone: 'workCompletion',
      }).reachedMilestones,
    ).toEqual([
      { vertexId: first, milestone: 'workCompletion' },
      { vertexId: NaN, milestone: 'subgraphCompletion' },
    ]);
    result.reachedMilestones[0]!.vertexId = 'changed';
    result.originalMilestoneConstraints[0]!.waitingMilestone.vertexId =
      'changed';
    result.originalMilestoneConstraints[0]!.prerequisiteMilestone.milestone =
      'subgraphCompletion';
    (result.originalMilestoneConstraints as unknown[]).pop();
    (result.reachedMilestones as unknown[]).pop();
    expect(
      inspection
        .queryOriginalPrerequisiteMilestonesOf({
          vertexId: first,
          milestone: 'workCompletion',
        })
        .reachedMilestones.map(({ vertexId }) => vertexId),
    ).toEqual([second, symbol, undefined, null, NaN, -0, '0']);
    expect(
      inspection.queryOriginalPrerequisiteMilestonesOf({
        vertexId: first,
        milestone: 'workCompletion',
      }).originalMilestoneConstraints[0],
    ).toEqual({
      waitingMilestone: { vertexId: first, milestone: 'workCompletion' },
      prerequisiteMilestone: { vertexId: second, milestone: 'workCompletion' },
      reason: 'workDependency',
    });
    expect(Object.isFrozen(first)).toBe(false);
    expect(Object.isFrozen(second)).toBe(false);
    first.label = 'mutable';
    expect(
      inspection.queryOriginalDependentMilestonesOf({
        vertexId: second,
        milestone: 'workCompletion',
      }).reachedMilestones[0]!.vertexId,
    ).toBe(first);
  });

  test(`${Constructor.name} terminates cyclic forward and reverse queries without returning the start`, async () => {
    const runner = new Constructor(
      materializeMultiEntryDagInputFromRecordCatalog(
        [
          { id: 'a', work: ['b'] },
          { id: 'b', work: ['a'] },
        ],
        {
          selectVertexId: (item) => item.id,
          selectWorkPrerequisiteVertexIds: (item) => item.work,
        },
      ),
    ).createIndependentRunnerFromCurrentOptions();
    await expect(
      (async () => runner.discoverValidateAndFreezeTopology())(),
    ).rejects.toBeInstanceOf(CTTStallError);
    const inspection = captureDagMilestoneSnapshot(runner);
    expect(
      inspection.queryOriginalPrerequisiteMilestonesOf(
        { vertexId: 'a', milestone: 'workCompletion' },
        { includeTransitiveMilestones: true },
      ),
    ).toEqual({
      reachedMilestones: [{ vertexId: 'b', milestone: 'workCompletion' }],
      originalMilestoneConstraints: [
        {
          waitingMilestone: { vertexId: 'a', milestone: 'workCompletion' },
          prerequisiteMilestone: { vertexId: 'b', milestone: 'workCompletion' },
          reason: 'workDependency',
        },
        {
          waitingMilestone: { vertexId: 'b', milestone: 'workCompletion' },
          prerequisiteMilestone: { vertexId: 'a', milestone: 'workCompletion' },
          reason: 'workDependency',
        },
      ],
      discoveryComplete: true,
    });
    expect(
      inspection.queryOriginalDependentMilestonesOf(
        { vertexId: 'a', milestone: 'workCompletion' },
        { includeTransitiveMilestones: true },
      ).reachedMilestones,
    ).toEqual([
      { vertexId: 'a', milestone: 'subgraphCompletion' },
      { vertexId: 'b', milestone: 'workCompletion' },
      { vertexId: 'b', milestone: 'subgraphCompletion' },
    ]);
  });

  test(`${Constructor.name} distinguishes known omissions from unresolved edge endpoints`, async () => {
    let calls = 0;
    const runner = new Constructor<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => {
          calls++;
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'root',
              vertexContentInput: {
                $vertexData: 'root',
                $childDiscoveryHints: [],
              },
              workWaitsForWorkOf: [undefined, 'missing'],
            },
          };
        },
        resolveChildVertexFromHint: () => {
          calls++;
          return {
            omittedVertexIdentity: null,
            kind: 'vertexIntentionallyOmitted' as const,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          };
        },
        resolvePrerequisiteByVertexId: (id) => {
          calls++;
          return id === undefined
            ? {
                kind: 'vertexIntentionallyOmitted',
                omittedVertexIdentity: { vertexId: undefined },
                satisfiesWorkAndSubgraphCompletionPrerequisites: true,
              }
            : { kind: 'missing' };
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    await expect(
      (async () => runner.discoverValidateAndFreezeTopology())(),
    ).rejects.toBeInstanceOf(CTTStallError);
    const before = calls;
    const inspection = captureDagMilestoneSnapshot(runner);
    expect(
      inspection.queryOriginalPrerequisiteMilestonesOf({
        vertexId: 'root',
        milestone: 'workCompletion',
      }).reachedMilestones,
    ).toEqual([
      { vertexId: undefined, milestone: 'workCompletion' },
      { vertexId: 'missing', milestone: 'workCompletion' },
    ]);
    expect(
      inspection.queryOriginalDependentMilestonesOf({
        vertexId: undefined,
        milestone: 'workCompletion',
      }).reachedMilestones,
    ).toEqual([{ vertexId: 'root', milestone: 'workCompletion' }]);
    expect(
      inspection.queryOriginalDependentMilestonesOf({
        vertexId: 'missing',
        milestone: 'workCompletion',
      }),
    ).toEqual({
      reachedMilestones: [],
      originalMilestoneConstraints: [],
      discoveryComplete: true,
    });
    expect(
      inspection.queryOriginalPrerequisiteMilestonesOf({
        vertexId: 'unknown',
        milestone: 'subgraphCompletion',
      }),
    ).toEqual({
      reachedMilestones: [],
      originalMilestoneConstraints: [],
      discoveryComplete: true,
    });
    expect(calls).toBe(before);
  });

  test(`${Constructor.name} captures lazy topology without adapter calls and retains it after settlement`, async () => {
    let calls = 0;
    const traversal = new Constructor<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => {
          calls++;
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'root',
              vertexContentInput: {
                $vertexData: 'root',
                $childDiscoveryHints: ['child'],
              },
            },
          };
        },
        resolveChildVertexFromHint: (hint) => {
          calls++;
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: hint,
              vertexContentInput: {
                $vertexData: hint,
                $childDiscoveryHints: [],
              },
            },
          };
        },
        tryGetVertexIdentityFromHint: (hint) => {
          calls++;
          return { vertexId: hint };
        },
      },
      workCompletionPolicy: 'requireExternalWorkSettlement',
    });
    let paused = false;
    traversal.registerVisitorForPhase(Order.ON_WORK_READY, () => {
      if (paused) return undefined;
      paused = true;
      return {
        commands: [
          { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
        ],
      };
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    const initial = captureDagMilestoneSnapshot(runner);
    expect(
      initial.queryOriginalPrerequisiteMilestonesOf({
        vertexId: 'root',
        milestone: 'subgraphCompletion',
      }),
    ).toEqual({
      reachedMilestones: [],
      originalMilestoneConstraints: [],
      discoveryComplete: false,
    });
    expect(calls).toBe(0);
    await runner.runUntilSuspendedOrTerminal();
    const before = calls;
    const partial = captureDagMilestoneSnapshot(runner);
    const targetMilestone = {
      vertexId: 'root',
      milestone: 'subgraphCompletion' as const,
    };
    const original =
      partial.queryOriginalPrerequisiteMilestonesOf(targetMilestone);
    expect(original).toEqual({
      reachedMilestones: [{ vertexId: 'root', milestone: 'workCompletion' }],
      originalMilestoneConstraints: [
        {
          waitingMilestone: targetMilestone,
          prerequisiteMilestone: {
            vertexId: 'root',
            milestone: 'workCompletion',
          },
          reason: 'ownWork',
        },
      ],
      discoveryComplete: false,
    });
    targetMilestone.vertexId = 'changed';
    expect(calls).toBe(before);
    await runner.runUntilSuspendedOrTerminal();
    const root = runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
    runner.settleDeferredWork(
      root.vertexId,
      { kind: 'workCompleted' },
      root.settlementToken,
    );
    await runner.runUntilSuspendedOrTerminal();
    const child = runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
    runner.settleDeferredWork(
      child.vertexId,
      { kind: 'workCompleted' },
      child.settlementToken,
    );
    await runner.runUntilSuspendedOrTerminal();
    expect(
      partial.queryOriginalPrerequisiteMilestonesOf({
        vertexId: 'root',
        milestone: 'subgraphCompletion',
      }),
    ).toEqual(original);
    expect(
      initial.queryOriginalDependentMilestonesOf({
        vertexId: 'child',
        milestone: 'workCompletion',
      }),
    ).toEqual({
      reachedMilestones: [],
      originalMilestoneConstraints: [],
      discoveryComplete: false,
    });
    expect(
      captureDagMilestoneSnapshot(runner).queryOriginalPrerequisiteMilestonesOf(
        {
          vertexId: 'root',
          milestone: 'subgraphCompletion',
        },
      ).reachedMilestones,
    ).toEqual([
      { vertexId: 'root', milestone: 'workCompletion' },
      { vertexId: 'child', milestone: 'subgraphCompletion' },
    ]);
    const after = calls;
    partial.queryOriginalDependentMilestonesOf(
      { vertexId: 'root', milestone: 'workCompletion' },
      { includeTransitiveMilestones: true },
    );
    captureDagMilestoneSnapshot(runner).queryOriginalPrerequisiteMilestonesOf({
      vertexId: 'child',
      milestone: 'workCompletion',
    });
    expect(calls).toBe(after);
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} retains old constraints after deletion and hides forest holders`, async () => {
    const traversal = new Constructor(
      materializeMultiEntryDagInputFromRecordCatalog([{ id: 'deleted' }], {
        selectVertexId: (item) => item.id,
      }),
    );
    traversal.registerVisitorForPhase(Order.ON_WORK_READY, () => ({
      commands: [
        {
          commandName:
            Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
        },
      ],
    }));
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.discoverValidateAndFreezeTopology();
    const inspection = captureDagMilestoneSnapshot(runner);
    const before = inspection.queryOriginalPrerequisiteMilestonesOf({
      vertexId: 'deleted',
      milestone: 'subgraphCompletion',
    });
    expect(before.reachedMilestones).toEqual([
      { vertexId: 'deleted', milestone: 'workCompletion' },
    ]);
    expect(
      inspection.queryOriginalDependentMilestonesOf({
        vertexId: 'deleted',
        milestone: 'subgraphCompletion',
      }).reachedMilestones,
    ).toEqual([]);
    await runner.runUntilSuspendedOrTerminal();
    expect(
      inspection.queryOriginalPrerequisiteMilestonesOf({
        vertexId: 'deleted',
        milestone: 'subgraphCompletion',
      }),
    ).toEqual(before);
    expect(
      captureDagMilestoneSnapshot(runner).queryOriginalPrerequisiteMilestonesOf(
        {
          vertexId: 'deleted',
          milestone: 'subgraphCompletion',
        },
      ),
    ).toEqual({
      reachedMilestones: [],
      originalMilestoneConstraints: [],
      discoveryComplete: true,
    });
  });

  test(`${Constructor.name} queries tree-source identities while an iterator owns the runner`, async () => {
    let calls = 0;
    const runner = new Constructor<G>({
      treeDiscoverySource: {
        resolveRootVertex: () => {
          calls++;
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: 'root',
                $childDiscoveryHints: ['child'],
              },
            },
          };
        },
        resolveChildVertexFromHint: (hint) => {
          calls++;
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: hint,
                $childDiscoveryHints: [],
              },
            },
          };
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    const iterator =
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: ['workCompletionCommitted'],
      });
    const first = await iterator.next();
    expect(first.done).toBe(false);
    if (first.done) throw new Error('Expected root event');
    const rootId = runner
      .getLiveResolvedGraphView()
      .requireVertexId(first.value.vertexHandle);
    const before = calls;
    const inspection = captureDagMilestoneSnapshot(runner);
    expect(
      inspection.explainMilestone({
        vertexId: rootId,
        milestone: 'subgraphCompletion',
      }),
    ).toMatchObject({ kind: 'live', milestoneSatisfied: false });
    expect(
      inspection.queryOriginalPrerequisiteMilestonesOf({
        vertexId: rootId,
        milestone: 'subgraphCompletion',
      }).reachedMilestones,
    ).toEqual([{ vertexId: rootId, milestone: 'workCompletion' }]);
    expect(calls).toBe(before);
    const second = await iterator.next();
    expect(second.done).toBe(false);
    if (second.done) throw new Error('Expected child event');
    expect(
      second.value.vertexHandle.getCurrentVertexView().getVertexData(),
    ).toBe('child');
    expect((await iterator.next()).done).toBe(true);
    expect(
      inspection.queryOriginalPrerequisiteMilestonesOf({
        vertexId: rootId,
        milestone: 'subgraphCompletion',
      }).reachedMilestones,
    ).toEqual([{ vertexId: rootId, milestone: 'workCompletion' }]);
  });

  test(`${Constructor.name} handles a known omitted root without inventing constraints`, async () => {
    const runner = new Constructor<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted',
          omittedVertexIdentity: { vertexId: undefined },
          satisfiesWorkAndSubgraphCompletionPrerequisites: true,
        }),
        resolveChildVertexFromHint: () => {
          throw new Error('Unexpected child resolution');
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(
      captureDagMilestoneSnapshot(runner).queryOriginalPrerequisiteMilestonesOf(
        {
          vertexId: undefined,
          milestone: 'subgraphCompletion',
        },
      ),
    ).toEqual({
      reachedMilestones: [],
      originalMilestoneConstraints: [],
      discoveryComplete: true,
    });
  });
}

test('inspection of a native async source does not interfere with a pending source call', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const runner = new AsyncDagTraversalBuilder<G, G, 'root'>({
    dagDiscoverySource: {
      resolveRootVertex: async () => {
        calls++;
        await gate;
        return {
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: [],
            },
          },
        };
      },
      resolveChildVertexFromHint: async () => {
        throw new Error('Unexpected child resolution');
      },
    },
  }).createIndependentRunnerFromCurrentOptions();
  const pending = runner.runUntilSuspendedOrTerminal();
  const inspection = captureDagMilestoneSnapshot(runner);
  expect(
    inspection.explainMilestone({
      vertexId: 'root',
      milestone: 'workCompletion',
    }),
  ).toMatchObject({ kind: 'unresolved', discoveryComplete: false });
  expect(
    inspection.queryOriginalPrerequisiteMilestonesOf({
      vertexId: 'root',
      milestone: 'subgraphCompletion',
    }),
  ).toEqual({
    reachedMilestones: [],
    originalMilestoneConstraints: [],
    discoveryComplete: false,
  });
  expect(calls).toBe(1);
  release();
  await pending;
  expect(
    inspection.queryOriginalPrerequisiteMilestonesOf({
      vertexId: 'root',
      milestone: 'subgraphCompletion',
    }).reachedMilestones,
  ).toEqual([]);
  expect(
    captureDagMilestoneSnapshot(runner).queryOriginalPrerequisiteMilestonesOf({
      vertexId: 'root',
      milestone: 'subgraphCompletion',
    }).reachedMilestones,
  ).toEqual([{ vertexId: 'root', milestone: 'workCompletion' }]);
  expect(calls).toBe(1);
});

test('transitive navigation uses an iterative walk on deep prerequisite chains', () => {
  const records = Array.from({ length: 12000 }, (_, id) => ({
    id,
    work: id === 11999 ? [] : [id + 1],
  }));
  const runner = new DagTraversalBuilder({
    ...materializeMultiEntryDagInputFromRecordCatalog(records, {
      selectVertexId: (item) => item.id,
      selectWorkPrerequisiteVertexIds: (item) => item.work,
    }),
    acceptedCompletedWorkVertexIds: new Set(records.map(({ id }) => id)),
  }).createIndependentRunnerFromCurrentOptions();
  runner.discoverValidateAndFreezeTopology();
  const inspection = captureDagMilestoneSnapshot(runner);
  const forward = inspection.queryOriginalPrerequisiteMilestonesOf(
    { vertexId: 0, milestone: 'workCompletion' },
    { includeTransitiveMilestones: true },
  );
  expect(forward.reachedMilestones).toHaveLength(11999);
  expect(forward.reachedMilestones[0]).toEqual({
    vertexId: 1,
    milestone: 'workCompletion',
  });
  expect(forward.reachedMilestones[11998]).toEqual({
    vertexId: 11999,
    milestone: 'workCompletion',
  });
  expect(forward.originalMilestoneConstraints).toHaveLength(11999);
  expect(
    inspection.queryOriginalDependentMilestonesOf(
      { vertexId: 11999, milestone: 'workCompletion' },
      { includeTransitiveMilestones: true },
    ).reachedMilestones,
  ).toHaveLength(23999);
});

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} hides an omitted synthetic root from the typed inspection bridge`, async () => {
    const runner = new Constructor({
      sourceRootIsHiddenEntryHolder: true,
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted',
          omittedVertexIdentity: { vertexId: 'catalog' },
          satisfiesWorkAndSubgraphCompletionPrerequisites: true,
        }),
        resolveChildVertexFromHint: () => ({
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted',
          satisfiesWorkAndSubgraphCompletionPrerequisites: true,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(inspectInternalDagState(runner)).toEqual({
      identityStates: [],
      schedulingStates: [],
      discoveryComplete: true,
    });
    expect(
      captureDagMilestoneSnapshot(runner).explainMilestone({
        vertexId: 'catalog',
        milestone: 'workCompletion',
      }).kind,
    ).toBe('unresolved');
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} inspects a deleted synthetic holder without dereferencing its removed vertex`, () => {
    const runner = new Constructor<G>({
      sourceRootIsHiddenEntryHolder: true,
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'roots',
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted',
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    // Exercise raw bookkeeping deletion independently of runner callback scheduling.
    const container = runnerInternals(runner).resolvedGraphsContainer;
    const scheduling = new GraphScheduling(container);
    const ref = scheduling.acceptRoot({
      vertexContent: { $vertexData: 'roots', $childDiscoveryHints: [] },
    })!;
    const callerId = Symbol('caller omission');
    container.store.markOmitted(callerId);
    scheduling.deleteVertex(ref);
    expect(inspectInternalDagState(runner).identityStates).toEqual([
      { vertexId: callerId, kind: 'omitted' },
    ]);
    expect(
      captureDagMilestoneSnapshot(runner).explainMilestone({
        vertexId: callerId,
        milestone: 'workCompletion',
      }),
    ).toMatchObject({ kind: 'omitted', milestoneSatisfied: true });
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} runner inspection observes initial, active and finished execution without driving it`, async () => {
    let sources = 0;
    let visitors = 0;
    const traversal = new Constructor<G, G, string>({
      dagDiscoverySource: {
        resolveRootVertex: () => {
          sources++;
          return {
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexId: 'root',
              vertexContentInput: {
                $vertexData: 'root',
                $childDiscoveryHints: [],
              },
            },
          };
        },
        resolveChildVertexFromHint: () => {
          throw new Error('Unexpected child resolution');
        },
      },
    });
    traversal.registerVisitorForPhase(Order.ON_WORK_READY, () => {
      visitors++;
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    const targetMilestone = {
      vertexId: 'root',
      milestone: 'workCompletion' as const,
    };
    const before = runner.captureMilestoneSnapshot();
    expect(before.explainMilestone(targetMilestone)).toEqual({
      kind: 'unresolved',
      targetMilestone,
      discoveryComplete: false,
    });
    expect({ sources, visitors }).toEqual({ sources: 0, visitors: 0 });
    const iterator =
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
    expect((await iterator.next()).done).toBe(false);
    const active = runner.captureMilestoneSnapshot();
    const calls = { sources, visitors };
    expect(active.explainMilestone(targetMilestone)).toEqual(
      captureDagMilestoneSnapshot(runner).explainMilestone(targetMilestone),
    );
    expect(active.explainMilestone(targetMilestone)).toMatchObject({
      kind: 'live',
      milestoneSatisfied: true,
    });
    expect(active.queryOriginalDependentMilestonesOf(targetMilestone)).toEqual(
      captureDagMilestoneSnapshot(runner).queryOriginalDependentMilestonesOf(
        targetMilestone,
      ),
    );
    const completion = {
      vertexId: 'root',
      milestone: 'subgraphCompletion' as const,
    };
    expect(active.queryOriginalPrerequisiteMilestonesOf(completion)).toEqual({
      reachedMilestones: [targetMilestone],
      originalMilestoneConstraints: [
        {
          waitingMilestone: completion,
          prerequisiteMilestone: targetMilestone,
          reason: 'ownWork',
        },
      ],
      discoveryComplete: false,
    });
    expect({ sources, visitors }).toEqual(calls);
    for await (const _event of iterator) {
      /* Drain the owner retained during inspection. */
    }
    expect(
      runner.captureMilestoneSnapshot().explainMilestone(completion),
    ).toMatchObject({
      kind: 'live',
      milestoneSatisfied: true,
    });
    expect(
      runner.captureMilestoneSnapshot().explainMilestone(completion),
    ).toEqual(captureDagMilestoneSnapshot(runner).explainMilestone(completion));
    expect({ sources, visitors }).toEqual({ sources: 1, visitors: 1 });
    expect(before.explainMilestone(targetMilestone)).toMatchObject({
      kind: 'unresolved',
      discoveryComplete: false,
    });
    expect(active.explainMilestone(completion)).toMatchObject({
      kind: 'live',
      milestoneSatisfied: false,
    });
  });
}

test('async runner inspection stays synchronous while a source callback is pending', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let sources = 0;
  const runner = new AsyncDagTraversalBuilder<G, G, string>({
    dagDiscoverySource: {
      resolveRootVertex: async () => {
        sources++;
        await gate;
        return {
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: [],
            },
          },
        };
      },
      resolveChildVertexFromHint: () => {
        throw new Error('Unexpected child resolution');
      },
    },
  }).createIndependentRunnerFromCurrentOptions();
  const pending = runner.runUntilSuspendedOrTerminal();
  try {
    const snapshot = runner.captureMilestoneSnapshot();
    const targetMilestone = {
      vertexId: 'root',
      milestone: 'workCompletion' as const,
    };
    expect(snapshot.explainMilestone(targetMilestone)).toEqual({
      kind: 'unresolved',
      targetMilestone,
      discoveryComplete: false,
    });
    expect(snapshot.explainMilestone(targetMilestone)).toEqual(
      captureDagMilestoneSnapshot(runner).explainMilestone(targetMilestone),
    );
    expect(sources).toBe(1);
  } finally {
    release();
    await pending;
  }
});
