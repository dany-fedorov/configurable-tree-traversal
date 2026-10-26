import {
  DagTraversalOrder as Order,
  TraversalVisitorCommandName as Command,
} from '../src';
import { DagTraversalStallError as CTTStallError } from '../src';
import { AsyncDagTraversal, DagTraversal, graphFrom, inspectDag } from '../src';
import { TraversalKernel } from '../src/core/TraversalKernel';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import type { CallSpec } from '../src/core/effects/types';
import { GraphStore } from '../src/core/graph/GraphStore';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { GraphScheduling } from '../src/core/scheduling/GraphScheduling';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} reports exact W waits when the same seeded ID still blocks C`, async () => {
    const records = [
      { id: 'bundle', children: ['child'], work: [], complete: [] },
      { id: 'child', children: [], work: [], complete: [] },
      { id: 'review', children: [], work: ['bundle'], complete: ['bundle'] },
    ];
    const runner = new Constructor({
      ...graphFrom(records, {
        id: (item) => item.id,
        children: (item) => item.children,
        dependsOn: (item) => item.work,
        dependsOnComplete: (item) => item.complete,
      }),
      completedWork: new Set(['bundle']),
      workCompletion: 'externalSettlement',
    }).makeRunner();
    await runner.run();
    expect(runner.summary().vertices.get('review')).toMatchObject({
      unmetWorkPrerequisiteIds: [],
      unmetCompletePrerequisiteIds: ['bundle'],
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
      ...graphFrom(records, {
        id: (item) => item.id,
        dependsOn: (item) => item.work,
        dependsOnComplete: (item) => item.complete,
      }),
      workCompletion: 'externalSettlement',
    }).makeRunner();
    await runner.run();
    const first = runner.summary().vertices.get('review')!;
    expect(first).toMatchObject({
      unmetWorkPrerequisiteIds: ['work'],
      unmetCompletePrerequisiteIds: ['complete'],
      unmetPrerequisiteIds: ['work', 'complete'],
    });
    (first.unmetWorkPrerequisiteIds as string[]).push('changed');
    expect(first.unmetPrerequisiteIds).toEqual(['work', 'complete']);
    expect(first.unmetCompletePrerequisiteIds).toEqual(['complete']);
    expect(
      runner.summary().vertices.get('review')!.unmetWorkPrerequisiteIds,
    ).toEqual(['work']);
  });
}

type G = TreeTypeParameters<string, string>;

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
    hasSorter: false,
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
  const ticket = kernel.summary().deferredFrontier[0]!;
  kernel.settle(ticket.vertexId, { kind: 'workCompleted' }, ticket.generation);
  kernel.resume();
  expect(kernel.poll('drive').kind).toBe('FINISHED');
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
    container.resolvedGraph.getStatusOf(
      container.resolvedGraph.getVertexRefById('root')!,
    ),
  ).toBe('COMPLETE');
});

test('kernel observations preserve an omitted root with its own undefined identity', () => {
  const { kernel, container } = makeKernel();
  const root = nextCall(kernel);
  kernel.submit({
    requestId: root.requestId,
    kind: 'MAKE_ROOT',
    outcome: { ok: true, value: { vertexId: undefined, vertexContent: null } },
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
        vertexContent: { $data: 'forest', $childHints: ['child'] },
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
      ...graphFrom(records, {
        id: (item) => item.id,
        children: (item) => item.children,
        dependsOn: (item) => item.work,
        dependsOnComplete: (item) => item.complete,
      }),
      workCompletion: 'externalSettlement',
    }).makeRunner();
    await runner.prepare();
    await runner.run();
    const inspection = inspectDag(runner);
    expect(
      inspection.prerequisitesOf({ vertexId: 'review', milestone: 'work' }),
    ).toEqual({
      milestones: [
        { vertexId: 'bundle', milestone: 'work' },
        { vertexId: 'bundle', milestone: 'completion' },
      ],
      edges: [
        {
          from: { vertexId: 'review', milestone: 'work' },
          to: { vertexId: 'bundle', milestone: 'work' },
          reason: 'workDependency',
        },
        {
          from: { vertexId: 'review', milestone: 'work' },
          to: { vertexId: 'bundle', milestone: 'completion' },
          reason: 'completionDependency',
        },
      ],
      discoveryComplete: true,
    });
    expect(
      inspection.dependentsOf({ vertexId: 'bundle', milestone: 'completion' }),
    ).toEqual({
      milestones: [{ vertexId: 'review', milestone: 'work' }],
      edges: [
        {
          from: { vertexId: 'review', milestone: 'work' },
          to: { vertexId: 'bundle', milestone: 'completion' },
          reason: 'completionDependency',
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
        { vertexId: 'bundle', milestone: 'completion' },
        { vertexId: 'child', milestone: 'completion' },
        { vertexId: 'child', milestone: 'work' },
        { vertexId: 'source', milestone: 'work' },
      ],
      edges: [
        {
          from: { vertexId: 'review', milestone: 'work' },
          to: { vertexId: 'bundle', milestone: 'work' },
          reason: 'workDependency',
        },
        {
          from: { vertexId: 'review', milestone: 'work' },
          to: { vertexId: 'bundle', milestone: 'completion' },
          reason: 'completionDependency',
        },
        {
          from: { vertexId: 'bundle', milestone: 'completion' },
          to: { vertexId: 'bundle', milestone: 'work' },
          reason: 'ownWork',
        },
        {
          from: { vertexId: 'bundle', milestone: 'completion' },
          to: { vertexId: 'child', milestone: 'completion' },
          reason: 'structuralChild',
        },
        {
          from: { vertexId: 'child', milestone: 'completion' },
          to: { vertexId: 'child', milestone: 'work' },
          reason: 'ownWork',
        },
        {
          from: { vertexId: 'child', milestone: 'work' },
          to: { vertexId: 'source', milestone: 'work' },
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
      ...graphFrom(records, {
        id: (item) => item.id,
        dependsOn: (item) => item.work,
      }),
      workCompletion: 'externalSettlement',
    }).makeRunner();
    await runner.prepare();
    const inspection = inspectDag(runner);
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
      { vertexId: -0, milestone: 'completion' },
    ]);
    expect(
      inspection.dependentsOf({ vertexId: Number('NaN'), milestone: 'work' })
        .milestones,
    ).toEqual([
      { vertexId: first, milestone: 'work' },
      { vertexId: NaN, milestone: 'completion' },
    ]);
    result.milestones[0]!.vertexId = 'changed';
    result.edges[0]!.from.vertexId = 'changed';
    result.edges[0]!.to.milestone = 'completion';
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
      from: { vertexId: first, milestone: 'work' },
      to: { vertexId: second, milestone: 'work' },
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
      graphFrom(
        [
          { id: 'a', work: ['b'] },
          { id: 'b', work: ['a'] },
        ],
        { id: (item) => item.id, dependsOn: (item) => item.work },
      ),
    ).makeRunner();
    await expect((async () => runner.prepare())()).rejects.toBeInstanceOf(
      CTTStallError,
    );
    const inspection = inspectDag(runner);
    expect(
      inspection.prerequisitesOf(
        { vertexId: 'a', milestone: 'work' },
        { transitive: true },
      ),
    ).toEqual({
      milestones: [{ vertexId: 'b', milestone: 'work' }],
      edges: [
        {
          from: { vertexId: 'a', milestone: 'work' },
          to: { vertexId: 'b', milestone: 'work' },
          reason: 'workDependency',
        },
        {
          from: { vertexId: 'b', milestone: 'work' },
          to: { vertexId: 'a', milestone: 'work' },
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
      { vertexId: 'a', milestone: 'completion' },
      { vertexId: 'b', milestone: 'work' },
      { vertexId: 'b', milestone: 'completion' },
    ]);
  });

  test(`${Constructor.name} distinguishes known omissions from unresolved edge endpoints`, async () => {
    let calls = 0;
    const runner = new Constructor<G>({
      traversableGraph: {
        makeRoot: () => {
          calls++;
          return {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: [] },
            dependsOn: [undefined, 'missing'],
          };
        },
        makeVertex: () => {
          calls++;
          return { vertexContent: null };
        },
        resolvePrerequisite: (id) => {
          calls++;
          return id === undefined
            ? {
                kind: 'omitted',
                vertexId: undefined,
                satisfiesDependencies: true,
              }
            : { kind: 'missing' };
        },
      },
    }).makeRunner();
    await expect((async () => runner.prepare())()).rejects.toBeInstanceOf(
      CTTStallError,
    );
    const before = calls;
    const inspection = inspectDag(runner);
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
        milestone: 'completion',
      }),
    ).toEqual({ milestones: [], edges: [], discoveryComplete: true });
    expect(calls).toBe(before);
  });

  test(`${Constructor.name} captures lazy topology without adapter calls and retains it after settlement`, async () => {
    let calls = 0;
    const traversal = new Constructor<G>({
      traversableGraph: {
        makeRoot: () => {
          calls++;
          return {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['child'] },
          };
        },
        makeVertex: (hint) => {
          calls++;
          return {
            vertexId: hint,
            vertexContent: { $data: hint, $childHints: [] },
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
    traversal.addVisitorFor(Order.ON_READY, () => {
      if (paused) return undefined;
      paused = true;
      return { commands: [{ commandName: Command.HALT_TRAVERSAL }] };
    });
    const runner = traversal.makeRunner();
    const initial = inspectDag(runner);
    expect(
      initial.prerequisitesOf({ vertexId: 'root', milestone: 'completion' }),
    ).toEqual({ milestones: [], edges: [], discoveryComplete: false });
    expect(calls).toBe(0);
    await runner.run();
    const before = calls;
    const partial = inspectDag(runner);
    const target = { vertexId: 'root', milestone: 'completion' as const };
    const original = partial.prerequisitesOf(target);
    expect(original).toEqual({
      milestones: [{ vertexId: 'root', milestone: 'work' }],
      edges: [
        {
          from: target,
          to: { vertexId: 'root', milestone: 'work' },
          reason: 'ownWork',
        },
      ],
      discoveryComplete: false,
    });
    target.vertexId = 'changed';
    expect(calls).toBe(before);
    await runner.run();
    const root = runner.summary().deferredFrontier[0]!;
    runner.settle(root.vertexId, { kind: 'workCompleted' }, root.generation);
    await runner.run();
    const child = runner.summary().deferredFrontier[0]!;
    runner.settle(child.vertexId, { kind: 'workCompleted' }, child.generation);
    await runner.run();
    expect(
      partial.prerequisitesOf({ vertexId: 'root', milestone: 'completion' }),
    ).toEqual(original);
    expect(
      initial.dependentsOf({ vertexId: 'child', milestone: 'work' }),
    ).toEqual({ milestones: [], edges: [], discoveryComplete: false });
    expect(
      inspectDag(runner).prerequisitesOf({
        vertexId: 'root',
        milestone: 'completion',
      }).milestones,
    ).toEqual([
      { vertexId: 'root', milestone: 'work' },
      { vertexId: 'child', milestone: 'completion' },
    ]);
    const after = calls;
    partial.dependentsOf(
      { vertexId: 'root', milestone: 'work' },
      { transitive: true },
    );
    inspectDag(runner).prerequisitesOf({
      vertexId: 'child',
      milestone: 'work',
    });
    expect(calls).toBe(after);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} retains old constraints after deletion and hides forest holders`, async () => {
    const traversal = new Constructor(
      graphFrom([{ id: 'deleted' }], { id: (item) => item.id }),
    );
    traversal.addVisitorFor(Order.ON_READY, () => ({
      commands: [{ commandName: Command.DELETE_VERTEX }],
    }));
    const runner = traversal.makeRunner();
    await runner.prepare();
    const inspection = inspectDag(runner);
    const before = inspection.prerequisitesOf({
      vertexId: 'deleted',
      milestone: 'completion',
    });
    expect(before.milestones).toEqual([
      { vertexId: 'deleted', milestone: 'work' },
    ]);
    expect(
      inspection.dependentsOf({ vertexId: 'deleted', milestone: 'completion' })
        .milestones,
    ).toEqual([]);
    await runner.run();
    expect(
      inspection.prerequisitesOf({
        vertexId: 'deleted',
        milestone: 'completion',
      }),
    ).toEqual(before);
    expect(
      inspectDag(runner).prerequisitesOf({
        vertexId: 'deleted',
        milestone: 'completion',
      }),
    ).toEqual({ milestones: [], edges: [], discoveryComplete: true });
  });

  test(`${Constructor.name} queries tree-source identities while an iterator owns the runner`, async () => {
    let calls = 0;
    const runner = new Constructor<G>({
      traversableTree: {
        makeRoot: () => {
          calls++;
          return { vertexContent: { $data: 'root', $childHints: ['child'] } };
        },
        makeVertex: (hint) => {
          calls++;
          return { vertexContent: { $data: hint, $childHints: [] } };
        },
      },
    }).makeRunner();
    const iterator = runner.getIterable({ iterateOver: [Order.ON_READY] });
    const first = await iterator.next();
    expect(first.done).toBe(false);
    if (first.done) throw new Error('Expected root event');
    const rootId = runner.getResolvedGraph().getVertexId(first.value.vertexRef);
    const before = calls;
    const inspection = inspectDag(runner);
    expect(
      inspection.explain({ vertexId: rootId, milestone: 'completion' }),
    ).toMatchObject({ kind: 'known', satisfied: false });
    expect(
      inspection.prerequisitesOf({ vertexId: rootId, milestone: 'completion' })
        .milestones,
    ).toEqual([{ vertexId: rootId, milestone: 'work' }]);
    expect(calls).toBe(before);
    const second = await iterator.next();
    expect(second.done).toBe(false);
    if (second.done) throw new Error('Expected child event');
    expect(second.value.vertexRef.unref().getData()).toBe('child');
    expect((await iterator.next()).done).toBe(true);
    expect(
      inspection.prerequisitesOf({ vertexId: rootId, milestone: 'completion' })
        .milestones,
    ).toEqual([{ vertexId: rootId, milestone: 'work' }]);
  });

  test(`${Constructor.name} handles a known omitted root without inventing constraints`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: {
        makeRoot: () => ({
          kind: 'omitted',
          vertexId: undefined,
          satisfiesDependencies: true,
        }),
        makeVertex: () => {
          throw new Error('Unexpected child resolution');
        },
      },
    }).makeRunner();
    await runner.run();
    expect(
      inspectDag(runner).prerequisitesOf({
        vertexId: undefined,
        milestone: 'completion',
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
      makeRoot: async () => {
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
      makeVertex: async () => {
        throw new Error('Unexpected child resolution');
      },
    },
  }).makeRunner();
  const pending = runner.run();
  const inspection = inspectDag(runner);
  expect(
    inspection.explain({ vertexId: 'root', milestone: 'work' }),
  ).toMatchObject({ kind: 'unknown', discoveryComplete: false });
  expect(
    inspection.prerequisitesOf({ vertexId: 'root', milestone: 'completion' }),
  ).toEqual({ milestones: [], edges: [], discoveryComplete: false });
  expect(calls).toBe(1);
  release();
  await pending;
  expect(
    inspection.prerequisitesOf({ vertexId: 'root', milestone: 'completion' })
      .milestones,
  ).toEqual([]);
  expect(
    inspectDag(runner).prerequisitesOf({
      vertexId: 'root',
      milestone: 'completion',
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
    ...graphFrom(records, {
      id: (item) => item.id,
      dependsOn: (item) => item.work,
    }),
    completedWork: new Set(records.map(({ id }) => id)),
  }).makeRunner();
  runner.prepare();
  const inspection = inspectDag(runner);
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
        makeRoot: () => ({
          kind: 'omitted',
          vertexId: 'catalog',
          satisfiesDependencies: true,
        }),
        makeVertex: () => ({ kind: 'omitted', satisfiesDependencies: true }),
      },
    }).makeRunner();
    await runner.run();
    expect(runner.inspectDagState()).toEqual({
      identityStates: [],
      schedulingStates: [],
      discoveryComplete: true,
    });
    expect(
      inspectDag(runner).explain({ vertexId: 'catalog', milestone: 'work' })
        .kind,
    ).toBe('unknown');
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} inspects a deleted synthetic holder without dereferencing its removed vertex`, () => {
    const runner = new Constructor<G>({
      syntheticRoot: true,
      traversableGraph: {
        makeRoot: () => ({
          vertexContent: { $data: 'forest', $childHints: [] },
        }),
        makeVertex: () => ({ kind: 'omitted', satisfiesDependencies: true }),
      },
    }).makeRunner();
    // Exercise raw bookkeeping deletion independently of runner callback scheduling.
    const container = runner.resolvedGraphsContainer;
    const scheduling = new GraphScheduling(container);
    const ref = scheduling.acceptRoot({
      vertexContent: { $data: 'forest', $childHints: [] },
    })!;
    const callerId = Symbol('caller omission');
    container.store.markOmitted(callerId);
    scheduling.deleteVertex(ref);
    expect(runner.inspectDagState().identityStates).toEqual([
      { vertexId: callerId, kind: 'omitted' },
    ]);
    expect(
      inspectDag(runner).explain({ vertexId: callerId, milestone: 'work' }),
    ).toMatchObject({ kind: 'known', satisfied: true });
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} runner inspection observes initial, active and finished execution without driving it`, async () => {
    let sources = 0;
    let visitors = 0;
    const traversal = new Constructor<G, G, string>({
      traversableGraph: {
        makeRoot: () => {
          sources++;
          return {
            kind: 'found',
            vertex: {
              vertexId: 'root',
              vertexContent: { $data: 'root', $childHints: [] },
            },
          };
        },
        makeVertex: () => {
          throw new Error('Unexpected child resolution');
        },
      },
    });
    traversal.addVisitorFor(Order.ON_READY, () => {
      visitors++;
    });
    const runner = traversal.makeRunner();
    const target = { vertexId: 'root', milestone: 'work' as const };
    const before = runner.inspectDag();
    expect(before.explain(target)).toEqual({
      kind: 'unknown',
      target,
      discoveryComplete: false,
    });
    expect({ sources, visitors }).toEqual({ sources: 0, visitors: 0 });
    const iterator = runner.getIterable();
    expect((await iterator.next()).done).toBe(false);
    const active = runner.inspectDag();
    const calls = { sources, visitors };
    expect(active.explain(target)).toEqual(inspectDag(runner).explain(target));
    expect(active.explain(target)).toMatchObject({
      kind: 'known',
      satisfied: true,
    });
    expect(active.dependentsOf(target)).toEqual(
      inspectDag(runner).dependentsOf(target),
    );
    const completion = { vertexId: 'root', milestone: 'completion' as const };
    expect(active.prerequisitesOf(completion)).toEqual({
      milestones: [target],
      edges: [{ from: completion, to: target, reason: 'ownWork' }],
      discoveryComplete: false,
    });
    expect({ sources, visitors }).toEqual(calls);
    for await (const _event of iterator) {
      /* Drain the owner retained during inspection. */
    }
    expect(runner.inspectDag().explain(completion)).toMatchObject({
      kind: 'known',
      satisfied: true,
    });
    expect(runner.inspectDag().explain(completion)).toEqual(
      inspectDag(runner).explain(completion),
    );
    expect({ sources, visitors }).toEqual({ sources: 1, visitors: 1 });
    expect(before.explain(target)).toMatchObject({
      kind: 'unknown',
      discoveryComplete: false,
    });
    expect(active.explain(completion)).toMatchObject({
      kind: 'known',
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
      makeRoot: async () => {
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
      makeVertex: () => {
        throw new Error('Unexpected child resolution');
      },
    },
  }).makeRunner();
  const pending = runner.run();
  try {
    const snapshot = runner.inspectDag();
    const target = { vertexId: 'root', milestone: 'work' as const };
    expect(snapshot.explain(target)).toEqual({
      kind: 'unknown',
      target,
      discoveryComplete: false,
    });
    expect(snapshot.explain(target)).toEqual(
      inspectDag(runner).explain(target),
    );
    expect(sources).toBe(1);
  } finally {
    release();
    await pending;
  }
});
