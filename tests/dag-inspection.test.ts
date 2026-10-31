import { inspectInternalDagState } from './internal-runner-fixtures';
import {
  AsyncDagTraversal,
  DagTraversal,
  DagTraversalStallError as CTTStallError,
  DagVisitorPhase as Order,
  inspectDagMilestones,
  materializeDagInputFromRecords,
  TraversalVisitorCommandName as Command,
} from '../src';
import type { CallSpec } from '../src/core/effects/types';
import { GraphStore } from '../src/core/graph/GraphStore';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { GraphScheduling } from '../src/core/scheduling/GraphScheduling';
import { TraversalKernel } from '../src/core/TraversalKernel';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { runnerInternals } from './internal-runner-fixtures';

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} reports exact W waits when the same seeded ID still blocks C`, async () => {
    const records = [
      { id: 'bundle', children: ['child'], work: [], complete: [] },
      { id: 'child', children: [], work: [], complete: [] },
      { id: 'review', children: [], work: ['bundle'], complete: ['bundle'] },
    ];
    const runner = new Constructor({
      ...materializeDagInputFromRecords(records, {
        id: (item) => item.id,
        children: (item) => item.children,
        dependsOnWork: (item) => item.work,
        dependsOnSubgraphCompletion: (item) => item.complete,
      }),
      completedWork: new Set(['bundle']),
      workCompletion: 'externalSettlement',
    }).createRunner();
    await runner.run();
    expect(runner.summary().vertices.get('review')).toMatchObject({
      unmetWorkPrerequisiteIds: [],
      unmetSubgraphPrerequisiteIds: ['bundle'],
      unmetPrerequisiteIds: ['bundle'],
    });
  });

  test(`${Constructor.name} owns exact nonempty W waits independently of union and C waits`, async () => {
    const records = [
      { id: 'review', work: ['work'], complete: ['complete'] },
      { id: 'work', work: [], complete: [] },
      { id: 'complete', work: [], complete: [] },
    ];
    const runner = new Constructor({
      ...materializeDagInputFromRecords(records, {
        id: (item) => item.id,
        dependsOnWork: (item) => item.work,
        dependsOnSubgraphCompletion: (item) => item.complete,
      }),
      workCompletion: 'externalSettlement',
    }).createRunner();
    await runner.run();
    const first = runner.summary().vertices.get('review')!;
    expect(first).toMatchObject({
      unmetWorkPrerequisiteIds: ['work'],
      unmetSubgraphPrerequisiteIds: ['complete'],
      unmetPrerequisiteIds: ['work', 'complete'],
    });
    (first.unmetWorkPrerequisiteIds as string[]).push('changed');
    expect(first.unmetPrerequisiteIds).toEqual(['work', 'complete']);
    expect(first.unmetSubgraphPrerequisiteIds).toEqual(['complete']);
    expect(
      runner.summary().vertices.get('review')!.unmetWorkPrerequisiteIds,
    ).toEqual(['work']);
  });
}

type G = VertexTypes<string, string>;

function makeKernel(
  options: { syntheticRoot?: boolean; seeded?: boolean } = {},
) {
  const container = new ResolvedGraphsContainer<G>({
    sourceMode: 'graph',
    syntheticRoot: options.syntheticRoot ?? false,
    saveOriginal: false,
  });
  const kernel = new TraversalKernel<G>({
    kind: 'dag',
    execution: 'async',
    sourceMode: 'graph',
    container,
    stateBridge: {
      status: TraversalRunnerStatus.INITIAL,
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
    hasHintTransformer: false,
    hasHintIds: false,
    concurrency: 2,
    workCompletion: 'externalSettlement',
    ...(options.seeded ? { completedWork: new Set(['root']) } : {}),
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
    vertexContent: { $data: 'root', $childHints: [] },
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
        vertexContent: { $data: 'root', $childHints: ['child'] },
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
        vertexContent: { $data: 'child', $childHints: [] },
      },
    },
  });
  expect(kernel.poll('drive').kind).toBe('HALTED');
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
  const ticket = kernel.summary().awaitingSettlement[0]!;
  kernel.settle(ticket.vertexId, { kind: 'workCompleted' }, ticket.generation);
  kernel.resume();
  // Recorded observations still require acknowledgement when delivery is hidden.
  // The seeded root never synthesizes a work observation.
  const observations: string[] = [];
  let action = kernel.poll('drive');
  while (action.kind === 'EVENT') {
    expect(kernel.shouldEmit(action.event.order)).toBe(false);
    observations.push(`${action.event.vertex.getData()}:${action.event.order}`);
    kernel.acknowledgeEvent(action.boundaryId);
    action = kernel.poll('drive');
  }
  expect(observations).toEqual([
    'child:ON_WORK_READY',
    'child:ON_SUBGRAPH_READY',
    'root:ON_SUBGRAPH_READY',
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
    container.resolvedGraphView.getVisitStageOf(
      container.resolvedGraphView.getVertexRefById('root')!,
    ),
  ).toBe('COMPLETE');
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
  const { kernel } = makeKernel({ syntheticRoot: true });
  const root = nextCall(kernel);
  kernel.submit({
    requestId: root.requestId,
    kind: 'MAKE_ROOT',
    outcome: {
      ok: true,
      value: {
        vertexContent: { $data: 'roots', $childHints: ['child'] },
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
        vertexContent: { $data: 'child', $childHints: [] },
      },
    },
  });
  expect(kernel.poll('drive').kind).toBe('HALTED');
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

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} navigates original W/C and structural constraints in both directions`, async () => {
    const records = [
      { id: 'bundle', children: ['child'], work: [], complete: [] },
      { id: 'child', children: [], work: ['source'], complete: [] },
      { id: 'review', children: [], work: ['bundle'], complete: ['bundle'] },
      { id: 'source', children: [], work: [], complete: [] },
    ];
    const runner = new Constructor({
      ...materializeDagInputFromRecords(records, {
        id: (item) => item.id,
        children: (item) => item.children,
        dependsOnWork: (item) => item.work,
        dependsOnSubgraphCompletion: (item) => item.complete,
      }),
      workCompletion: 'externalSettlement',
    }).createRunner();
    await runner.prepare();
    await runner.run();
    const inspection = inspectDagMilestones(runner);
    expect(
      inspection.prerequisitesOf({ vertexId: 'review', milestone: 'work' }),
    ).toEqual({
      milestones: [
        { vertexId: 'bundle', milestone: 'work' },
        { vertexId: 'bundle', milestone: 'subgraphCompletion' },
      ],
      edges: [
        {
          waiter: { vertexId: 'review', milestone: 'work' },
          prerequisite: { vertexId: 'bundle', milestone: 'work' },
          reason: 'workDependency',
        },
        {
          waiter: { vertexId: 'review', milestone: 'work' },
          prerequisite: { vertexId: 'bundle', milestone: 'subgraphCompletion' },
          reason: 'subgraphCompletionDependency',
        },
      ],
      discoveryComplete: true,
    });
    expect(
      inspection.dependentsOf({
        vertexId: 'bundle',
        milestone: 'subgraphCompletion',
      }),
    ).toEqual({
      milestones: [{ vertexId: 'review', milestone: 'work' }],
      edges: [
        {
          waiter: { vertexId: 'review', milestone: 'work' },
          prerequisite: { vertexId: 'bundle', milestone: 'subgraphCompletion' },
          reason: 'subgraphCompletionDependency',
        },
      ],
      discoveryComplete: true,
    });
    expect(
      inspection.prerequisitesOf(
        { vertexId: 'review', milestone: 'work' },
        { transitive: true },
      ),
    ).toEqual({
      milestones: [
        { vertexId: 'bundle', milestone: 'work' },
        { vertexId: 'bundle', milestone: 'subgraphCompletion' },
        { vertexId: 'child', milestone: 'subgraphCompletion' },
        { vertexId: 'child', milestone: 'work' },
        { vertexId: 'source', milestone: 'work' },
      ],
      edges: [
        {
          waiter: { vertexId: 'review', milestone: 'work' },
          prerequisite: { vertexId: 'bundle', milestone: 'work' },
          reason: 'workDependency',
        },
        {
          waiter: { vertexId: 'review', milestone: 'work' },
          prerequisite: { vertexId: 'bundle', milestone: 'subgraphCompletion' },
          reason: 'subgraphCompletionDependency',
        },
        {
          waiter: { vertexId: 'bundle', milestone: 'subgraphCompletion' },
          prerequisite: { vertexId: 'bundle', milestone: 'work' },
          reason: 'ownWork',
        },
        {
          waiter: { vertexId: 'bundle', milestone: 'subgraphCompletion' },
          prerequisite: { vertexId: 'child', milestone: 'subgraphCompletion' },
          reason: 'structuralChild',
        },
        {
          waiter: { vertexId: 'child', milestone: 'subgraphCompletion' },
          prerequisite: { vertexId: 'child', milestone: 'work' },
          reason: 'ownWork',
        },
        {
          waiter: { vertexId: 'child', milestone: 'work' },
          prerequisite: { vertexId: 'source', milestone: 'work' },
          reason: 'workDependency',
        },
      ],
      discoveryComplete: true,
    });
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
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
      ...materializeDagInputFromRecords(records, {
        id: (item) => item.id,
        dependsOnWork: (item) => item.work,
      }),
      workCompletion: 'externalSettlement',
    }).createRunner();
    await runner.prepare();
    const inspection = inspectDagMilestones(runner);
    const result = inspection.prerequisitesOf({
      vertexId: first,
      milestone: 'work',
    });
    expect(result.milestones.map(({ vertexId }) => vertexId)).toEqual([
      second,
      symbol,
      undefined,
      null,
      NaN,
      -0,
      '0',
    ]);
    expect(result.milestones[0]!.vertexId).toBe(second);
    expect(
      inspection.dependentsOf({ vertexId: +0, milestone: 'work' }).milestones,
    ).toEqual([
      { vertexId: first, milestone: 'work' },
      { vertexId: -0, milestone: 'subgraphCompletion' },
    ]);
    expect(
      inspection.dependentsOf({ vertexId: Number('NaN'), milestone: 'work' })
        .milestones,
    ).toEqual([
      { vertexId: first, milestone: 'work' },
      { vertexId: NaN, milestone: 'subgraphCompletion' },
    ]);
    result.milestones[0]!.vertexId = 'changed';
    result.edges[0]!.waiter.vertexId = 'changed';
    result.edges[0]!.prerequisite.milestone = 'subgraphCompletion';
    (result.edges as unknown[]).pop();
    (result.milestones as unknown[]).pop();
    expect(
      inspection
        .prerequisitesOf({ vertexId: first, milestone: 'work' })
        .milestones.map(({ vertexId }) => vertexId),
    ).toEqual([second, symbol, undefined, null, NaN, -0, '0']);
    expect(
      inspection.prerequisitesOf({ vertexId: first, milestone: 'work' })
        .edges[0],
    ).toEqual({
      waiter: { vertexId: first, milestone: 'work' },
      prerequisite: { vertexId: second, milestone: 'work' },
      reason: 'workDependency',
    });
    expect(Object.isFrozen(first)).toBe(false);
    expect(Object.isFrozen(second)).toBe(false);
    first.label = 'mutable';
    expect(
      inspection.dependentsOf({ vertexId: second, milestone: 'work' })
        .milestones[0]!.vertexId,
    ).toBe(first);
  });

  test(`${Constructor.name} terminates cyclic forward and reverse queries without returning the start`, async () => {
    const runner = new Constructor(
      materializeDagInputFromRecords(
        [
          { id: 'a', work: ['b'] },
          { id: 'b', work: ['a'] },
        ],
        { id: (item) => item.id, dependsOnWork: (item) => item.work },
      ),
    ).createRunner();
    await expect((async () => runner.prepare())()).rejects.toBeInstanceOf(
      CTTStallError,
    );
    const inspection = inspectDagMilestones(runner);
    expect(
      inspection.prerequisitesOf(
        { vertexId: 'a', milestone: 'work' },
        { transitive: true },
      ),
    ).toEqual({
      milestones: [{ vertexId: 'b', milestone: 'work' }],
      edges: [
        {
          waiter: { vertexId: 'a', milestone: 'work' },
          prerequisite: { vertexId: 'b', milestone: 'work' },
          reason: 'workDependency',
        },
        {
          waiter: { vertexId: 'b', milestone: 'work' },
          prerequisite: { vertexId: 'a', milestone: 'work' },
          reason: 'workDependency',
        },
      ],
      discoveryComplete: true,
    });
    expect(
      inspection.dependentsOf(
        { vertexId: 'a', milestone: 'work' },
        { transitive: true },
      ).milestones,
    ).toEqual([
      { vertexId: 'a', milestone: 'subgraphCompletion' },
      { vertexId: 'b', milestone: 'work' },
      { vertexId: 'b', milestone: 'subgraphCompletion' },
    ]);
  });

  test(`${Constructor.name} distinguishes known omissions from unresolved edge endpoints`, async () => {
    let calls = 0;
    const runner = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => {
          calls++;
          return {
            kind: 'found' as const,
            vertex: {
              vertexId: 'root',
              vertexContent: { $data: 'root', $childHints: [] },
              dependsOnWork: [undefined, 'missing'],
            },
          };
        },
        resolveChild: () => {
          calls++;
          return {
            identity: null,
            kind: 'omitted' as const,
            satisfiesDependencies: true as const,
          };
        },
        resolvePrerequisite: (id) => {
          calls++;
          return id === undefined
            ? {
                kind: 'omitted',
                identity: { vertexId: undefined },
                satisfiesDependencies: true,
              }
            : { kind: 'missing' };
        },
      },
    }).createRunner();
    await expect((async () => runner.prepare())()).rejects.toBeInstanceOf(
      CTTStallError,
    );
    const before = calls;
    const inspection = inspectDagMilestones(runner);
    expect(
      inspection.prerequisitesOf({ vertexId: 'root', milestone: 'work' })
        .milestones,
    ).toEqual([
      { vertexId: undefined, milestone: 'work' },
      { vertexId: 'missing', milestone: 'work' },
    ]);
    expect(
      inspection.dependentsOf({ vertexId: undefined, milestone: 'work' })
        .milestones,
    ).toEqual([{ vertexId: 'root', milestone: 'work' }]);
    expect(
      inspection.dependentsOf({ vertexId: 'missing', milestone: 'work' }),
    ).toEqual({ milestones: [], edges: [], discoveryComplete: true });
    expect(
      inspection.prerequisitesOf({
        vertexId: 'unknown',
        milestone: 'subgraphCompletion',
      }),
    ).toEqual({ milestones: [], edges: [], discoveryComplete: true });
    expect(calls).toBe(before);
  });

  test(`${Constructor.name} captures lazy topology without adapter calls and retains it after settlement`, async () => {
    let calls = 0;
    const traversal = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => {
          calls++;
          return {
            kind: 'found' as const,
            vertex: {
              vertexId: 'root',
              vertexContent: { $data: 'root', $childHints: ['child'] },
            },
          };
        },
        resolveChild: (hint) => {
          calls++;
          return {
            kind: 'found' as const,
            vertex: {
              vertexId: hint,
              vertexContent: { $data: hint, $childHints: [] },
            },
          };
        },
        getVertexIdFromHint: (hint) => {
          calls++;
          return { vertexId: hint };
        },
      },
      workCompletion: 'externalSettlement',
    });
    let paused = false;
    traversal.addVisitorFor(Order.ON_WORK_READY, () => {
      if (paused) return undefined;
      paused = true;
      return { commands: [{ commandName: Command.PAUSE_TRAVERSAL }] };
    });
    const runner = traversal.createRunner();
    const initial = inspectDagMilestones(runner);
    expect(
      initial.prerequisitesOf({
        vertexId: 'root',
        milestone: 'subgraphCompletion',
      }),
    ).toEqual({ milestones: [], edges: [], discoveryComplete: false });
    expect(calls).toBe(0);
    await runner.run();
    const before = calls;
    const partial = inspectDagMilestones(runner);
    const target = {
      vertexId: 'root',
      milestone: 'subgraphCompletion' as const,
    };
    const original = partial.prerequisitesOf(target);
    expect(original).toEqual({
      milestones: [{ vertexId: 'root', milestone: 'work' }],
      edges: [
        {
          waiter: target,
          prerequisite: { vertexId: 'root', milestone: 'work' },
          reason: 'ownWork',
        },
      ],
      discoveryComplete: false,
    });
    target.vertexId = 'changed';
    expect(calls).toBe(before);
    await runner.run();
    const root = runner.summary().awaitingSettlement[0]!;
    runner.settle(root.vertexId, { kind: 'workCompleted' }, root.generation);
    await runner.run();
    const child = runner.summary().awaitingSettlement[0]!;
    runner.settle(child.vertexId, { kind: 'workCompleted' }, child.generation);
    await runner.run();
    expect(
      partial.prerequisitesOf({
        vertexId: 'root',
        milestone: 'subgraphCompletion',
      }),
    ).toEqual(original);
    expect(
      initial.dependentsOf({ vertexId: 'child', milestone: 'work' }),
    ).toEqual({ milestones: [], edges: [], discoveryComplete: false });
    expect(
      inspectDagMilestones(runner).prerequisitesOf({
        vertexId: 'root',
        milestone: 'subgraphCompletion',
      }).milestones,
    ).toEqual([
      { vertexId: 'root', milestone: 'work' },
      { vertexId: 'child', milestone: 'subgraphCompletion' },
    ]);
    const after = calls;
    partial.dependentsOf(
      { vertexId: 'root', milestone: 'work' },
      { transitive: true },
    );
    inspectDagMilestones(runner).prerequisitesOf({
      vertexId: 'child',
      milestone: 'work',
    });
    expect(calls).toBe(after);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} retains old constraints after deletion and hides forest holders`, async () => {
    const traversal = new Constructor(
      materializeDagInputFromRecords([{ id: 'deleted' }], {
        id: (item) => item.id,
      }),
    );
    traversal.addVisitorFor(Order.ON_WORK_READY, () => ({
      commands: [{ commandName: Command.DELETE_DAG_VERTEX_CASCADE }],
    }));
    const runner = traversal.createRunner();
    await runner.prepare();
    const inspection = inspectDagMilestones(runner);
    const before = inspection.prerequisitesOf({
      vertexId: 'deleted',
      milestone: 'subgraphCompletion',
    });
    expect(before.milestones).toEqual([
      { vertexId: 'deleted', milestone: 'work' },
    ]);
    expect(
      inspection.dependentsOf({
        vertexId: 'deleted',
        milestone: 'subgraphCompletion',
      }).milestones,
    ).toEqual([]);
    await runner.run();
    expect(
      inspection.prerequisitesOf({
        vertexId: 'deleted',
        milestone: 'subgraphCompletion',
      }),
    ).toEqual(before);
    expect(
      inspectDagMilestones(runner).prerequisitesOf({
        vertexId: 'deleted',
        milestone: 'subgraphCompletion',
      }),
    ).toEqual({ milestones: [], edges: [], discoveryComplete: true });
  });

  test(`${Constructor.name} queries tree-source identities while an iterator owns the runner`, async () => {
    let calls = 0;
    const runner = new Constructor<G>({
      traversableTree: {
        resolveRoot: () => {
          calls++;
          return {
            kind: 'found' as const,
            vertex: {
              vertexContent: { $data: 'root', $childHints: ['child'] },
            },
          };
        },
        resolveChild: (hint) => {
          calls++;
          return {
            kind: 'found' as const,
            vertex: { vertexContent: { $data: hint, $childHints: [] } },
          };
        },
      },
    }).createRunner();
    const iterator = runner.iterateEvents({
      emitEvents: ['workCompleted'],
    });
    const first = await iterator.next();
    expect(first.done).toBe(false);
    if (first.done) throw new Error('Expected root event');
    const rootId = runner
      .getResolvedGraphView()
      .requireVertexId(first.value.vertexRef);
    const before = calls;
    const inspection = inspectDagMilestones(runner);
    expect(
      inspection.explain({ vertexId: rootId, milestone: 'subgraphCompletion' }),
    ).toMatchObject({ kind: 'live', satisfied: false });
    expect(
      inspection.prerequisitesOf({
        vertexId: rootId,
        milestone: 'subgraphCompletion',
      }).milestones,
    ).toEqual([{ vertexId: rootId, milestone: 'work' }]);
    expect(calls).toBe(before);
    const second = await iterator.next();
    expect(second.done).toBe(false);
    if (second.done) throw new Error('Expected child event');
    expect(second.value.vertexRef.getValue().getData()).toBe('child');
    expect((await iterator.next()).done).toBe(true);
    expect(
      inspection.prerequisitesOf({
        vertexId: rootId,
        milestone: 'subgraphCompletion',
      }).milestones,
    ).toEqual([{ vertexId: rootId, milestone: 'work' }]);
  });

  test(`${Constructor.name} handles a known omitted root without inventing constraints`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'omitted',
          identity: { vertexId: undefined },
          satisfiesDependencies: true,
        }),
        resolveChild: () => {
          throw new Error('Unexpected child resolution');
        },
      },
    }).createRunner();
    await runner.run();
    expect(
      inspectDagMilestones(runner).prerequisitesOf({
        vertexId: undefined,
        milestone: 'subgraphCompletion',
      }),
    ).toEqual({ milestones: [], edges: [], discoveryComplete: true });
  });
}

test('inspection of a native async source does not interfere with a pending source call', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const runner = new AsyncDagTraversal<G, G, 'root'>({
    traversableGraph: {
      resolveRoot: async () => {
        calls++;
        await gate;
        return {
          kind: 'found',
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: [] },
          },
        };
      },
      resolveChild: async () => {
        throw new Error('Unexpected child resolution');
      },
    },
  }).createRunner();
  const pending = runner.run();
  const inspection = inspectDagMilestones(runner);
  expect(
    inspection.explain({ vertexId: 'root', milestone: 'work' }),
  ).toMatchObject({ kind: 'unresolved', discoveryComplete: false });
  expect(
    inspection.prerequisitesOf({
      vertexId: 'root',
      milestone: 'subgraphCompletion',
    }),
  ).toEqual({ milestones: [], edges: [], discoveryComplete: false });
  expect(calls).toBe(1);
  release();
  await pending;
  expect(
    inspection.prerequisitesOf({
      vertexId: 'root',
      milestone: 'subgraphCompletion',
    }).milestones,
  ).toEqual([]);
  expect(
    inspectDagMilestones(runner).prerequisitesOf({
      vertexId: 'root',
      milestone: 'subgraphCompletion',
    }).milestones,
  ).toEqual([{ vertexId: 'root', milestone: 'work' }]);
  expect(calls).toBe(1);
});

test('transitive navigation uses an iterative walk on deep prerequisite chains', () => {
  const records = Array.from({ length: 12000 }, (_, id) => ({
    id,
    work: id === 11999 ? [] : [id + 1],
  }));
  const runner = new DagTraversal({
    ...materializeDagInputFromRecords(records, {
      id: (item) => item.id,
      dependsOnWork: (item) => item.work,
    }),
    completedWork: new Set(records.map(({ id }) => id)),
  }).createRunner();
  runner.prepare();
  const inspection = inspectDagMilestones(runner);
  const forward = inspection.prerequisitesOf(
    { vertexId: 0, milestone: 'work' },
    { transitive: true },
  );
  expect(forward.milestones).toHaveLength(11999);
  expect(forward.milestones[0]).toEqual({ vertexId: 1, milestone: 'work' });
  expect(forward.milestones[11998]).toEqual({
    vertexId: 11999,
    milestone: 'work',
  });
  expect(forward.edges).toHaveLength(11999);
  expect(
    inspection.dependentsOf(
      { vertexId: 11999, milestone: 'work' },
      { transitive: true },
    ).milestones,
  ).toHaveLength(23999);
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} hides an omitted synthetic root from the typed inspection bridge`, async () => {
    const runner = new Constructor({
      syntheticRoot: true,
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'omitted',
          identity: { vertexId: 'catalog' },
          satisfiesDependencies: true,
        }),
        resolveChild: () => ({
          identity: null,
          kind: 'omitted',
          satisfiesDependencies: true,
        }),
      },
    }).createRunner();
    await runner.run();
    expect(inspectInternalDagState(runner)).toEqual({
      identityStates: [],
      schedulingStates: [],
      discoveryComplete: true,
    });
    expect(
      inspectDagMilestones(runner).explain({
        vertexId: 'catalog',
        milestone: 'work',
      }).kind,
    ).toBe('unresolved');
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} inspects a deleted synthetic holder without dereferencing its removed vertex`, () => {
    const runner = new Constructor<G>({
      syntheticRoot: true,
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexContent: { $data: 'roots', $childHints: [] },
          },
        }),
        resolveChild: () => ({
          identity: null,
          satisfiesDependencies: true as const,
          kind: 'omitted',
        }),
      },
    }).createRunner();
    // Exercise raw bookkeeping deletion independently of runner callback scheduling.
    const container = runnerInternals(runner).resolvedGraphsContainer;
    const scheduling = new GraphScheduling(container);
    const ref = scheduling.acceptRoot({
      vertexContent: { $data: 'roots', $childHints: [] },
    })!;
    const callerId = Symbol('caller omission');
    container.store.markOmitted(callerId);
    scheduling.deleteVertex(ref);
    expect(inspectInternalDagState(runner).identityStates).toEqual([
      { vertexId: callerId, kind: 'omitted' },
    ]);
    expect(
      inspectDagMilestones(runner).explain({
        vertexId: callerId,
        milestone: 'work',
      }),
    ).toMatchObject({ kind: 'omitted', satisfied: true });
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} runner inspection observes initial, active and finished execution without driving it`, async () => {
    let sources = 0;
    let visitors = 0;
    const traversal = new Constructor<G, G, string>({
      traversableGraph: {
        resolveRoot: () => {
          sources++;
          return {
            kind: 'found',
            vertex: {
              vertexId: 'root',
              vertexContent: { $data: 'root', $childHints: [] },
            },
          };
        },
        resolveChild: () => {
          throw new Error('Unexpected child resolution');
        },
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, () => {
      visitors++;
    });
    const runner = traversal.createRunner();
    const target = { vertexId: 'root', milestone: 'work' as const };
    const before = runner.inspectMilestones();
    expect(before.explain(target)).toEqual({
      kind: 'unresolved',
      target,
      discoveryComplete: false,
    });
    expect({ sources, visitors }).toEqual({ sources: 0, visitors: 0 });
    const iterator = runner.iterateEvents();
    expect((await iterator.next()).done).toBe(false);
    const active = runner.inspectMilestones();
    const calls = { sources, visitors };
    expect(active.explain(target)).toEqual(
      inspectDagMilestones(runner).explain(target),
    );
    expect(active.explain(target)).toMatchObject({
      kind: 'live',
      satisfied: true,
    });
    expect(active.dependentsOf(target)).toEqual(
      inspectDagMilestones(runner).dependentsOf(target),
    );
    const completion = {
      vertexId: 'root',
      milestone: 'subgraphCompletion' as const,
    };
    expect(active.prerequisitesOf(completion)).toEqual({
      milestones: [target],
      edges: [{ waiter: completion, prerequisite: target, reason: 'ownWork' }],
      discoveryComplete: false,
    });
    expect({ sources, visitors }).toEqual(calls);
    for await (const _event of iterator) {
      /* Drain the owner retained during inspection. */
    }
    expect(runner.inspectMilestones().explain(completion)).toMatchObject({
      kind: 'live',
      satisfied: true,
    });
    expect(runner.inspectMilestones().explain(completion)).toEqual(
      inspectDagMilestones(runner).explain(completion),
    );
    expect({ sources, visitors }).toEqual({ sources: 1, visitors: 1 });
    expect(before.explain(target)).toMatchObject({
      kind: 'unresolved',
      discoveryComplete: false,
    });
    expect(active.explain(completion)).toMatchObject({
      kind: 'live',
      satisfied: false,
    });
  });
}

test('async runner inspection stays synchronous while a source callback is pending', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let sources = 0;
  const runner = new AsyncDagTraversal<G, G, string>({
    traversableGraph: {
      resolveRoot: async () => {
        sources++;
        await gate;
        return {
          kind: 'found',
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: [] },
          },
        };
      },
      resolveChild: () => {
        throw new Error('Unexpected child resolution');
      },
    },
  }).createRunner();
  const pending = runner.run();
  try {
    const snapshot = runner.inspectMilestones();
    const target = { vertexId: 'root', milestone: 'work' as const };
    expect(snapshot.explain(target)).toEqual({
      kind: 'unresolved',
      target,
      discoveryComplete: false,
    });
    expect(snapshot.explain(target)).toEqual(
      inspectDagMilestones(runner).explain(target),
    );
    expect(sources).toBe(1);
  } finally {
    release();
    await pending;
  }
});
