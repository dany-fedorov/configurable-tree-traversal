import { AsyncDagTraversal, DagTraversal, graphFrom } from '../src';
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
        dependencies: (item) => item.work,
        completionDependencies: (item) => item.complete,
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
        dependencies: (item) => item.work,
        completionDependencies: (item) => item.complete,
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
