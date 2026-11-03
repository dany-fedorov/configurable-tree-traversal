import { MutableValueReference } from '../src/core/CTTRef';
import { Vertex } from '../src/core/Vertex';
import { GraphStore } from '../src/core/graph/GraphStore';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { GraphScheduling } from '../src/core/scheduling/GraphScheduling';
import { dependencyMilestoneCycles } from '../src/core/scheduling/dependencyMilestones';
import type {
  InternalVertexRef,
  VertexVisitSchedulingStage,
} from '../src/core/graph/types';
import type { MakeVertexResult } from '../src/core/TraversableTree';
import type { TestGraph } from './helpers/graph-fixtures';

function setup() {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: true,
  });
  const scheduling = new GraphScheduling(container);
  const root = scheduling.acceptRoot({
    vertexId: 'root',
    vertexContent: {
      $vertexData: 'root',
      $childDiscoveryHints: ['join', 'gate', 'later', 'duplicate'],
    },
  })!;
  scheduling.takeReady();
  scheduling.markPreVisited(root);
  scheduling.prepareSlots(
    root,
    root.getReferencedValue().getMutableChildDiscoveryHints(),
  );
  const accept = (index: number, result: MakeVertexResult<TestGraph>) =>
    scheduling.acceptVertex(
      {
        parentVertexHandle: root,
        parentVertexAtChildResolution: root.getReferencedValue(),
        discoveryDepthInEdges: 1,
        parentChildHintIndex: index,
        childDiscoveryHint: root
          .getReferencedValue()
          .getMutableChildDiscoveryHints()[index]!,
      },
      result,
    );
  const finish = (ref: InternalVertexRef<TestGraph>) => {
    scheduling.markPreVisited(ref);
    scheduling.prepareSlots(ref, []);
    scheduling.closeExpansion(ref);
    scheduling.markComplete(ref);
  };
  return { container, scheduling, root, accept, finish };
}
const result = (
  id: unknown,
  complete: readonly unknown[] = [],
): MakeVertexResult<TestGraph> => ({
  vertexId: id,
  workWaitsForWorkOf: [],
  workWaitsForSubgraphCompletionOf: complete,
  vertexContent: { $vertexData: String(id), $childDiscoveryHints: [] },
});

test('omission releases W and C while a later omitted gate is immediately satisfied', () => {
  const { accept, scheduling } = setup();
  const join = accept(0, {
    ...result('join', ['gate']),
    workWaitsForWorkOf: ['gate'],
  });
  expect(scheduling.takeReady()).toBeNull();
  accept(1, { vertexContent: null, vertexId: 'gate' });
  expect(scheduling.takeReady()).toBe(join);
  const later = accept(2, result('later', ['gate']));
  expect(scheduling.takeReady()).toBe(later);
  accept(3, { vertexContent: null, vertexId: 'gate' });
  expect(scheduling.takeReady()).toBeNull();
});

test.each([
  'INITIAL_VISIT_COMMITTED',
  'COMPLETION_VISIT_ELIGIBLE',
  'COMPLETION_VISIT_COMMITTED',
] as const)(
  'a late C gate only accepts committed COMPLETE, not %s',
  (status) => {
    const { container, accept, scheduling } = setup();
    const gate = accept(1, result('gate'))!;
    scheduling.takeReady();
    container.store.setVisitStage(gate, status);
    const join = accept(0, result('join', ['gate']));
    expect(scheduling.takeReady()).toBe(
      status === 'COMPLETION_VISIT_COMMITTED' ? join : null,
    );
  },
);

test('deleting a prerequisite cascades C dependents and tombstones later arrivals', () => {
  const { container, accept, scheduling, root, finish } = setup();
  const gate = accept(1, result('gate'))!;
  const join = accept(0, result('join', ['gate']))!;
  const later = accept(2, result('later', ['future']))!;
  finish(gate);
  finish(join);
  expect(scheduling.deleteVertex(gate)).toEqual(new Set([gate, join]));
  expect(container.liveResolvedGraphView.has(join)).toBe(false);
  expect(accept(3, result('future', ['gate']))).toBeNull();
  expect(container.liveResolvedGraphView.has(later)).toBe(false);
  expect(container.store.getIdState('future')).toEqual({ kind: 'deleted' });
  expect(container.liveResolvedGraphView.getChildrenOf(root)).toEqual([]);
  expect(
    container.preCommandDiscoveredGraphView!.getVertexHandleByIdOrNull('join'),
  ).not.toBeNull();
});

test('C prerequisite arrays and inspected work detach from caller and snapshots', () => {
  const { accept, container, scheduling } = setup();
  const declared = ['gate'];
  const join = accept(0, result('join', declared))!;
  declared.length = 0;
  const inspection = scheduling.inspectWork();
  inspection.find(({ ref }) => ref === join)!.unmetComplete.clear();
  container.store.getDeclaredCompleteDependencies(join).length = 0;
  expect(
    scheduling.inspectWork().find(({ ref }) => ref === join)!.unmetComplete,
  ).toEqual(new Set(['gate']));
  expect(
    container.liveResolvedGraphView.get(join)!.workWaitsForSubgraphCompletionOf,
  ).toEqual(['gate']);
});

test('GraphStore copies completion inputs and keeps empty public vertex shapes unchanged', () => {
  const store = new GraphStore<TestGraph>('dag');
  const ref = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: '', $childDiscoveryHints: [] }),
  );
  const declared = ['gate'];
  store.insertVertex({
    ref,
    id: 'join',
    workWaitsForWorkOf: [],
    workWaitsForSubgraphCompletionOf: declared,
    depth: 0,
  });
  declared.length = 0;
  expect(store.graph.get(ref)!.workWaitsForSubgraphCompletionOf).toEqual([
    'gate',
  ]);
  const empty = new MutableValueReference(ref.getReferencedValue());
  store.insertVertex({
    ref: empty,
    id: 'empty',
    workWaitsForWorkOf: [],
    workWaitsForSubgraphCompletionOf: [],
    depth: 0,
  });
  expect(store.graph.get(empty)).not.toHaveProperty(
    'workWaitsForSubgraphCompletionOf',
  );
});

test.each([
  'DISCOVERED',
  'INITIAL_VISIT_ELIGIBLE',
  'INITIAL_VISIT_COMMITTED',
  'COMPLETION_VISIT_ELIGIBLE',
  'COMPLETION_VISIT_COMMITTED',
] as const)(
  'continuation validates %s against unsatisfied C gates',
  (status: VertexVisitSchedulingStage) => {
    const { container, scheduling, accept, root } = setup();
    const join = accept(0, result('join', ['gate']))!;
    const gate = accept(1, result('gate'))!;
    scheduling.closeSlot(root, 2, 'disabled');
    scheduling.closeSlot(root, 3, 'disabled');
    scheduling.closeExpansion(root);
    container.store.setVisitStage(join, status);
    if (
      status === 'INITIAL_VISIT_COMMITTED' ||
      status === 'COMPLETION_VISIT_ELIGIBLE' ||
      status === 'COMPLETION_VISIT_COMMITTED'
    )
      container.store.prepareSlots(join, []);
    const visits = [
      { ref: gate, order: 'ON_WORK_READY' as const },
      ...(status === 'INITIAL_VISIT_ELIGIBLE'
        ? [{ ref: join, order: 'ON_WORK_READY' as const }]
        : status === 'COMPLETION_VISIT_ELIGIBLE'
        ? [{ ref: join, order: 'ON_SUBGRAPH_COMPLETION_READY' as const }]
        : []),
    ];
    const restored = new GraphScheduling(container);
    if (status !== 'DISCOVERED') {
      expect(() => restored.restoreDagSeed(visits)).toThrow(
        `Invalid injected DAG seed: ${status} vertex is inconsistent`,
      );
    } else {
      restored.restoreDagSeed(visits);
      expect(restored.takeReady()).toBe(gate);
      restored.markPreVisited(gate);
      restored.prepareSlots(gate, []);
      restored.closeExpansion(gate);
      expect(restored.takeCompleting()).toBe(gate);
      expect(restored.takeReady()).toBeNull();
      restored.markComplete(gate);
      restored.markComplete(gate);
      expect(restored.takeReady()).toBe(join);
      expect(restored.takeReady()).toBeNull();
    }
  },
);

test('milestone projections deduplicate equivalent W and C cycles without coercing IDs', () => {
  const a = {};
  const b = undefined;
  expect(
    dependencyMilestoneCycles([
      { id: a, work: [b], complete: [], children: [b] },
      { id: b, work: [a], complete: [], children: [a] },
    ]),
  ).toEqual([[a, b]]);
});

test('an ordinary root gated on a deleted prerequisite is tombstoned before admission', () => {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: true,
  });
  const scheduling = new GraphScheduling(container);
  container.store.markDeleted('gate');
  expect(scheduling.acceptRoot(result('root', ['gate']))).toBeNull();
  expect(scheduling.takeReady()).toBeNull();
  expect(container.store.getIdState('root')).toEqual({ kind: 'deleted' });
  expect(container.liveResolvedGraphView.getRoot()).toBeNull();
  expect(container.preCommandDiscoveredGraphView!.getVertexHandles()).toEqual(
    [],
  );
});
