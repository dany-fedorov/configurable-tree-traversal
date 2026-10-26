import { CTTRef } from '../src/core/CTTRef';
import { Vertex } from '../src/core/Vertex';
import { GraphStore } from '../src/core/graph/GraphStore';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { GraphScheduling } from '../src/core/scheduling/GraphScheduling';
import { dependencyMilestoneCycles } from '../src/core/scheduling/dependencyMilestones';
import type { Ref, GraphVertexStatus } from '../src/core/graph/types';
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
    vertexContent: { $d: 'root', $c: ['join', 'gate', 'later', 'duplicate'] },
  })!;
  scheduling.takeReady();
  scheduling.markPreVisited(root);
  scheduling.prepareSlots(root, root.unref().getChildrenHints());
  const accept = (index: number, result: MakeVertexResult<TestGraph>) =>
    scheduling.acceptVertex(
      {
        parentVertexRef: root,
        parentVertex: root.unref(),
        depth: 1,
        hintIndex: index,
        vertexHint: root.unref().getChildrenHints()[index]!,
      },
      result,
    );
  const finish = (ref: Ref<TestGraph>) => {
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
  dependsOn: [],
  dependsOnComplete: complete,
  vertexContent: { $d: String(id), $c: [] },
});

test('omission releases W and C while a later omitted gate is immediately satisfied', () => {
  const { accept, scheduling } = setup();
  const join = accept(0, { ...result('join', ['gate']), dependsOn: ['gate'] });
  expect(scheduling.takeReady()).toBeNull();
  accept(1, { vertexId: 'gate', vertexContent: null });
  expect(scheduling.takeReady()).toBe(join);
  const later = accept(2, result('later', ['gate']));
  expect(scheduling.takeReady()).toBe(later);
  accept(3, { vertexId: 'gate', vertexContent: null });
  expect(scheduling.takeReady()).toBeNull();
});

test.each(['PRE_VISITED', 'COMPLETING', 'COMPLETE'] as const)(
  'a late C gate only accepts committed COMPLETE, not %s',
  (status) => {
    const { container, accept, scheduling } = setup();
    const gate = accept(1, result('gate'))!;
    scheduling.takeReady();
    container.store.setStatus(gate, status);
    const join = accept(0, result('join', ['gate']));
    expect(scheduling.takeReady()).toBe(status === 'COMPLETE' ? join : null);
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
  expect(container.resolvedGraph.has(join)).toBe(false);
  expect(accept(3, result('future', ['gate']))).toBeNull();
  expect(container.resolvedGraph.has(later)).toBe(false);
  expect(container.store.getIdState('future')).toEqual({ kind: 'deleted' });
  expect(container.resolvedGraph.getChildrenOf(root)).toEqual([]);
  expect(
    container.notMutatedResolvedGraph!.getVertexById('join'),
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
  expect(container.resolvedGraph.get(join)!.dependsOnComplete).toEqual([
    'gate',
  ]);
});

test('GraphStore copies completion inputs and keeps empty public vertex shapes unchanged', () => {
  const store = new GraphStore<TestGraph>('dag');
  const ref = new CTTRef(new Vertex<TestGraph>({ $d: '', $c: [] }));
  const declared = ['gate'];
  store.insertVertex({
    ref,
    id: 'join',
    dependsOn: [],
    dependsOnComplete: declared,
    depth: 0,
  });
  declared.length = 0;
  expect(store.graph.get(ref)!.dependsOnComplete).toEqual(['gate']);
  const empty = new CTTRef(ref.unref());
  store.insertVertex({
    ref: empty,
    id: 'empty',
    dependsOn: [],
    dependsOnComplete: [],
    depth: 0,
  });
  expect(store.graph.get(empty)).not.toHaveProperty('dependsOnComplete');
});

test.each([
  'DISCOVERED',
  'READY',
  'PRE_VISITED',
  'COMPLETING',
  'COMPLETE',
] as const)(
  'continuation validates %s against unsatisfied C gates',
  (status: GraphVertexStatus) => {
    const { container, scheduling, accept, root } = setup();
    const join = accept(0, result('join', ['gate']))!;
    const gate = accept(1, result('gate'))!;
    scheduling.closeSlot(root, 2, 'disabled');
    scheduling.closeSlot(root, 3, 'disabled');
    scheduling.closeExpansion(root);
    container.store.setStatus(join, status);
    if (
      status === 'PRE_VISITED' ||
      status === 'COMPLETING' ||
      status === 'COMPLETE'
    )
      container.store.prepareSlots(join, []);
    const visits = [
      { ref: gate, order: 'ON_WORK_READY' as const },
      ...(status === 'READY'
        ? [{ ref: join, order: 'ON_WORK_READY' as const }]
        : status === 'COMPLETING'
        ? [{ ref: join, order: 'ON_SUBGRAPH_READY' as const }]
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
  expect(container.resolvedGraph.getRoot()).toBeNull();
  expect(container.notMutatedResolvedGraph!.getVertexRefs()).toEqual([]);
});
