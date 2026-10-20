import { CTTRef } from '../src/core/CTTRef';
import { GraphStore } from '../src/core/graph/GraphStore';
import { VertexResolved } from '../src/core/ResolvedTree';
import { Vertex } from '../src/core/Vertex';
import type { TestGraph } from './helpers/graph-fixtures';

function ref(data: string, hints: string[] = []) {
  return new CTTRef(new Vertex<TestGraph>({ $d: data, $c: hints }));
}

test('rejects a back-edge without damaging accepted topology', () => {
  const store = new GraphStore<TestGraph>('dag');
  const a = new CTTRef(new Vertex<TestGraph>({ $d: 'A', $c: ['B'] }));
  const b = new CTTRef(new Vertex<TestGraph>({ $d: 'B', $c: ['A'] }));
  store.insertVertex({ ref: a, id: 'A', dependsOn: [], depth: 0 });
  store.insertVertex({ ref: b, id: 'B', dependsOn: ['A'], depth: 1 });
  store.setRoot(a);
  store.prepareSlots(a, ['B']);
  store.prepareSlots(b, ['A']);
  store.linkSlot(a, 0, b);

  expect(() => store.linkSlot(b, 0, a)).toThrow(/cycle/i);
  expect(store.graph.getChildrenOf(b)).toEqual([]);
  expect(store.graph.getPathsTo(b)).toEqual([[a, b]]);
});

test('reports a safe reconstructed cycle path for self and back edges', () => {
  const store = new GraphStore<TestGraph>('dag');
  const dangerous = {
    toString: () => {
      throw new Error('must not stringify an id');
    },
    toJSON: () => {
      throw new Error('must not serialize an id');
    },
  };
  const a = ref('A', ['B']);
  const b = ref('B', ['A']);
  store.insertVertex({ ref: a, id: dangerous, dependsOn: [], depth: 0 });
  store.insertVertex({ ref: b, id: 'B', dependsOn: [], depth: 1 });
  store.prepareSlots(a, ['B']);
  store.prepareSlots(b, ['A']);

  expect(() => store.linkSlot(a, 0, a)).toThrow(/reference#1 -> reference#1/);
  store.linkSlot(a, 0, b);
  expect(() => store.linkSlot(b, 0, a)).toThrow(/"B" -> reference#1 -> "B"/);
});

test('preserves parallel slots while deduplicating parents and paths', () => {
  const store = new GraphStore<TestGraph>('dag');
  const parent = ref('parent', ['child', 'child']);
  const child = ref('child');
  store.insertVertex({ ref: parent, id: 'parent', dependsOn: [], depth: 0 });
  store.insertVertex({ ref: child, id: 'child', dependsOn: [], depth: 1 });
  store.setRoot(parent);
  store.prepareSlots(parent, ['child', 'child']);

  store.linkSlot(parent, 0, child);
  store.linkSlot(parent, 1, child);

  expect(store.graph.getChildrenOf(parent)).toEqual([child, child]);
  expect(store.graph.getParentsOf(child)).toEqual([parent]);
  expect(store.graph.get(child)?.incoming).toHaveLength(2);
  expect(store.graph.getPathsTo(child)).toEqual([[parent, child]]);
});

test('same-slot acknowledgment is idempotent and conflicting links fail', () => {
  const store = new GraphStore<TestGraph>('dag');
  const parent = ref('parent', ['child']);
  const child = ref('child');
  const other = ref('other');
  for (const [vertexRef, id] of [
    [parent, 'parent'],
    [child, 'child'],
    [other, 'other'],
  ] as const) {
    store.insertVertex({ ref: vertexRef, id, dependsOn: [], depth: 0 });
  }
  store.prepareSlots(parent, ['child']);
  store.linkSlot(parent, 0, child);
  store.linkSlot(parent, 0, child);

  expect(store.graph.get(child)?.incoming).toHaveLength(1);
  expect(() => store.linkSlot(parent, 0, other)).toThrow(/already linked/i);
  expect(store.graph.getChildrenOf(parent)).toEqual([child]);
});

test('validates unknown references and slot operations before mutation', () => {
  const store = new GraphStore<TestGraph>('dag');
  const parent = ref('parent', ['child']);
  const child = ref('child');
  const unknown = ref('unknown');
  store.insertVertex({ ref: parent, id: 'parent', dependsOn: [], depth: 0 });
  store.insertVertex({ ref: child, id: 'child', dependsOn: [], depth: 1 });

  expect(() =>
    store.insertVertex({ ref: unknown, id: 'child', dependsOn: [], depth: 0 }),
  ).toThrow(/id/i);
  expect(() => store.prepareSlots(unknown, [])).toThrow(/reference/i);
  expect(() => store.linkSlot(parent, 0, child)).toThrow(/slot/i);
  store.prepareSlots(parent, ['child']);
  expect(() => store.prepareSlots(parent, ['child'])).toThrow(/slots/i);
  expect(() => store.linkSlot(parent, 1, child)).toThrow(/slot/i);
  expect(() => store.linkSlot(parent, 0, unknown)).toThrow(/reference/i);
  expect(() => store.closeSlot(parent, 1, 'omitted')).toThrow(/slot/i);

  expect(store.graph.get(unknown)).toBeNull();
  expect(store.graph.has(unknown)).toBe(false);
  expect(store.graph.getVertexById('missing')).toBeNull();
  expect(store.getIdState('missing')).toBeUndefined();
  expect(store.graph.getStatusOf(unknown)).toBeNull();
  expect(store.graph.getParentsOf(unknown)).toBeNull();
  expect(store.graph.getChildrenOf(unknown)).toBeNull();
  expect(() => store.graph.getIdOf(unknown)).toThrow(/reference/i);
  expect(() => store.graph.getPathsTo(unknown)).toThrow(/reference/i);
});

test('tracks omitted and deleted identity states and terminal slots', () => {
  const store = new GraphStore<TestGraph>('dag');
  const parent = ref('parent', ['omitted', 'deleted', 'disabled']);
  const child = ref('child');
  store.insertVertex({ ref: parent, id: undefined, dependsOn: [], depth: 0 });
  store.insertVertex({ ref: child, id: null, dependsOn: [], depth: 1 });
  store.prepareSlots(parent, ['omitted', 'deleted', 'disabled']);
  store.linkSlot(parent, 1, child);
  store.closeSlot(parent, 0, 'omitted');
  store.closeSlot(parent, 2, 'disabled');
  store.markOmitted(NaN);
  store.removeVertices(new Set([child]));

  expect(store.getIdState(undefined)).toEqual({ kind: 'live', ref: parent });
  expect(store.getIdState(NaN)).toEqual({ kind: 'omitted' });
  expect(store.getIdState(null)).toEqual({ kind: 'deleted' });
  expect(store.graph.getVertexById(undefined)).toBe(parent);
  expect(store.graph.getVertexById(NaN)).toBeNull();
  expect(store.graph.get(parent)?.slots.map((slot) => slot.kind)).toEqual([
    'omitted',
    'deleted',
    'disabled',
  ]);
  expect(store.graph.getChildrenOf(parent)).toEqual([]);
  expect(() => store.markOmitted(undefined)).toThrow(/id/i);
  expect(() => store.markOmitted(null)).toThrow(/id/i);
});

test('removes a precomputed vertex set and detaches all incident edges', () => {
  const store = new GraphStore<TestGraph>('dag');
  const root = ref('root', ['A', 'B']);
  const a = ref('A', ['B']);
  const b = ref('B');
  for (const [vertexRef, id] of [
    [root, 'root'],
    [a, 'A'],
    [b, 'B'],
  ] as const) {
    store.insertVertex({ ref: vertexRef, id, dependsOn: [], depth: 0 });
  }
  store.setRoot(root);
  store.prepareSlots(root, ['A', 'B']);
  store.prepareSlots(a, ['B']);
  store.linkSlot(root, 0, a);
  store.linkSlot(root, 1, b);
  store.linkSlot(a, 0, b);

  store.removeVertices(new Set([a, b]));

  expect(store.graph.getVertexRefs()).toEqual([root]);
  expect(store.graph.get(root)?.slots.map((slot) => slot.kind)).toEqual([
    'deleted',
    'deleted',
  ]);
  expect(store.graph.getChildrenOf(root)).toEqual([]);
  expect(store.getIdState('A')).toEqual({ kind: 'deleted' });
  expect(store.getIdState('B')).toEqual({ kind: 'deleted' });
});

test('returns shallow query snapshots and exposes no store mutations', () => {
  const store = new GraphStore<TestGraph>('dag');
  const root = ref('root', ['child']);
  const child = ref('child');
  store.insertVertex({ ref: root, id: 'root', dependsOn: [], depth: 0 });
  store.insertVertex({
    ref: child,
    id: 'child',
    dependsOn: ['root'],
    depth: 1,
  });
  store.setRoot(root);
  store.prepareSlots(root, ['child']);
  store.linkSlot(root, 0, child);
  store.setStatus(child, 'READY');

  const refs = store.graph.getVertexRefs();
  const children = store.graph.getChildrenOf(root)!;
  const parents = store.graph.getParentsOf(child)!;
  const paths = store.graph.getPathsTo(child);
  const vertex = store.graph.get(child)!;
  refs.length = 0;
  children.length = 0;
  parents.length = 0;
  paths[0]!.length = 0;
  (vertex.incoming as unknown[]).length = 0;
  (vertex.slots as unknown[]).length = 0;
  (vertex.dependsOn as unknown[]).length = 0;

  expect(store.graph.getVertexRefs()).toEqual([root, child]);
  expect(store.graph.getChildrenOf(root)).toEqual([child]);
  expect(store.graph.getParentsOf(child)).toEqual([root]);
  expect(store.graph.getPathsTo(child)).toEqual([[root, child]]);
  expect(store.graph.get(child)).toMatchObject({
    vertexRef: child,
    vertex: child.unref(),
    vertexId: 'child',
    discoveryDepth: 1,
    dependsOn: ['root'],
    status: 'READY',
  });
  expect(
    (store.graph as unknown as { linkSlot?: unknown }).linkSlot,
  ).toBeUndefined();
});

test('returns detached incoming edge and child slot records', () => {
  const store = new GraphStore<TestGraph>('dag');
  const root = ref('root', ['child']);
  const child = ref('child');
  store.insertVertex({ ref: root, id: 'root', dependsOn: [], depth: 0 });
  store.insertVertex({ ref: child, id: 'child', dependsOn: [], depth: 1 });
  store.prepareSlots(root, ['child']);
  store.linkSlot(root, 0, child);

  const edge = store.graph.get(child)!.incoming[0]!;
  const slot = store.graph.get(root)!.slots[0]!;
  (edge as { hintIndex: number }).hintIndex = 99;
  (slot as { hint: string }).hint = 'corrupted';

  expect(store.graph.get(child)!.incoming[0]).toMatchObject({
    parentRef: root,
    childRef: child,
    hintIndex: 0,
    hint: 'child',
  });
  expect(store.graph.get(root)!.slots[0]).toEqual({
    kind: 'linked',
    hint: 'child',
    childRef: child,
  });
});

test('supports empty roots and path filtering', () => {
  const store = new GraphStore<TestGraph>('dag');
  expect(store.graph.getRoot()).toBeNull();
  expect(store.graph.getVertexRefs()).toEqual([]);

  const root = ref('root', ['child']);
  const child = ref('child');
  store.insertVertex({ ref: root, id: 'root', dependsOn: [], depth: 0 });
  store.insertVertex({ ref: child, id: 'child', dependsOn: [], depth: 1 });
  store.setRoot(root);
  store.prepareSlots(root, ['child']);
  store.linkSlot(root, 0, child);

  expect(store.graph.getPathsTo(root, { noRoot: true })).toEqual([[]]);
  expect(store.graph.getPathsTo(root, { noSelf: true })).toEqual([[]]);
  expect(store.graph.getPathsTo(child, { noRoot: true })).toEqual([[child]]);
  expect(store.graph.getPathsTo(child, { noSelf: true })).toEqual([[root]]);
  store.setRoot(null);
  expect(store.graph.getRoot()).toBeNull();
});

test('uses authoritative tree records for compatibility graph queries', () => {
  const store = new GraphStore<TestGraph>('tree');
  const root = ref('root');
  const child = ref('child');
  const rootRecord = new VertexResolved<TestGraph>({
    $d: { resolutionContext: null },
    $c: [child, child],
  });
  const childRecord = new VertexResolved<TestGraph>({
    $d: {
      resolutionContext: {
        depth: 1,
        parentVertex: root.unref(),
        parentVertexRef: root,
        hintIndex: 0,
        vertexHint: 'child',
      },
    },
    $c: [],
  });
  store.insertVertex({ ref: root, id: 'root', dependsOn: [], depth: 0 });
  store.insertVertex({ ref: child, id: 'child', dependsOn: [], depth: 1 });
  store.setRoot(root);
  store.setTreeRecord(root, rootRecord);
  store.setTreeRecord(child, childRecord);

  expect(store.getTreeRecord(root)).toBe(rootRecord);
  expect(store.graph.getChildrenOf(root)).toEqual([child, child]);
  expect(store.graph.getParentsOf(child)).toEqual([root]);
  expect(store.graph.getPathsTo(child)).toEqual([[root, child]]);

  const replacement = rootRecord.clone({ $c: [] });
  store.setTreeRecord(root, replacement);
  expect(store.getTreeRecord(root)).toBe(replacement);
  expect(store.graph.getChildrenOf(root)).toEqual([]);

  const movedChildRecord = childRecord.clone();
  movedChildRecord.setResolutionContext({
    ...childRecord.getResolutionContext()!,
    depth: 3,
  });
  store.setTreeRecord(child, movedChildRecord);
  expect(store.graph.get(child)?.discoveryDepth).toBe(3);

  const manuallyAdded = ref('manual');
  store.setTreeRecord(manuallyAdded, rootRecord);
  expect(store.getTreeRecord(manuallyAdded)).toBe(rootRecord);
  expect(store.graph.getVertexById(manuallyAdded.getId())).toBe(manuallyAdded);
});

test('handles deep chains iteratively for cycle checks and paths', () => {
  const store = new GraphStore<TestGraph>('dag');
  const count = 12000;
  const refs = Array.from({ length: count }, (_, index) =>
    ref(String(index), index + 1 < count ? [String(index + 1)] : ['0']),
  );
  refs.forEach((vertexRef, index) => {
    store.insertVertex({
      ref: vertexRef,
      id: index,
      dependsOn: [],
      depth: index,
    });
    store.prepareSlots(vertexRef, vertexRef.unref().getChildrenHints());
    if (index > 0) store.linkSlot(refs[index - 1]!, 0, vertexRef);
  });
  store.setRoot(refs[0]!);

  expect(store.graph.getPathsTo(refs[count - 1]!)[0]).toHaveLength(count);
  expect(() => store.linkSlot(refs[count - 1]!, 0, refs[0]!)).toThrow(/cycle/i);
  expect(store.graph.getChildrenOf(refs[count - 1]!)).toEqual([]);
});

test('enforces remaining mode and reference invariants', () => {
  const dag = new GraphStore<TestGraph>('dag');
  const parent = ref('parent', ['child']);
  const child = ref('child');
  dag.insertVertex({ ref: parent, id: 'parent', dependsOn: [], depth: 0 });
  dag.insertVertex({ ref: child, id: 'child', dependsOn: [], depth: 1 });

  expect(() =>
    dag.insertVertex({
      ref: parent,
      id: 'another-id',
      dependsOn: [],
      depth: 0,
    }),
  ).toThrow(/reference/i);
  expect(() => dag.setRoot(ref('unknown'))).toThrow(/reference/i);
  expect(() => dag.setStatus(ref('unknown'), 'READY')).toThrow(/reference/i);
  expect(() =>
    dag.setTreeRecord(
      parent,
      new VertexResolved({
        $d: { resolutionContext: null },
        $c: [],
      }),
    ),
  ).toThrow(/tree mode/i);
  expect(dag.getTreeRecord(ref('unknown'))).toBeNull();

  dag.prepareSlots(parent, ['child']);
  expect(() => dag.linkSlot(parent, -1, child)).toThrow(/slot/i);
  expect(() => dag.linkSlot(parent, 0.5, child)).toThrow(/slot/i);
  dag.closeSlot(parent, 0, 'disabled');
  expect(() => dag.closeSlot(parent, 0, 'deleted')).toThrow(/resolved/i);
  expect(() => dag.linkSlot(parent, 0, child)).toThrow(/closed/i);
});

test('tree slot linking appends once and tree queries tolerate partial records', () => {
  const store = new GraphStore<TestGraph>('tree');
  const parent = ref('parent', ['child']);
  const child = ref('child');
  const parentRecord = new VertexResolved<TestGraph>({
    $d: { resolutionContext: null },
    $c: [],
  });
  store.setTreeRecord(parent, parentRecord);
  store.setTreeRecord(
    child,
    new VertexResolved<TestGraph>({
      $d: { resolutionContext: null },
      $c: [],
    }),
  );
  store.prepareSlots(parent, ['child']);
  store.linkSlot(parent, 0, child);
  store.linkSlot(parent, 0, child);

  expect(parentRecord.getChildren()).toEqual([child]);
  expect(store.graph.get(parent)?.slots).toEqual([
    { kind: 'linked', hint: 'child', childRef: child },
  ]);

  const recordless = ref('recordless');
  store.insertVertex({
    ref: recordless,
    id: 'recordless',
    dependsOn: [],
    depth: 0,
  });
  expect(store.graph.get(recordless)?.slots).toEqual([]);
  expect(store.graph.getChildrenOf(recordless)).toEqual([]);
});

test('removal detaches a deleted parent from surviving children and clears root', () => {
  const store = new GraphStore<TestGraph>('dag');
  const parent = ref('parent', ['child']);
  const child = ref('child');
  store.insertVertex({ ref: parent, id: 'parent', dependsOn: [], depth: 0 });
  store.insertVertex({ ref: child, id: 'child', dependsOn: [], depth: 1 });
  store.setRoot(parent);
  store.prepareSlots(parent, ['child']);
  store.linkSlot(parent, 0, child);

  store.removeVertices(new Set([parent, ref('unknown')]));

  expect(store.graph.getRoot()).toBeNull();
  expect(store.graph.getParentsOf(child)).toEqual([]);
  expect(store.graph.getPathsTo(child)).toEqual([[child]]);
});

test('tree records can reinstall tombstoned refs but reject auto-id conflicts', () => {
  const store = new GraphStore<TestGraph>('tree');
  const vertexRef = ref('vertex');
  const record = new VertexResolved<TestGraph>({
    $d: { resolutionContext: null },
    $c: [],
  });
  store.setTreeRecord(vertexRef, record);
  store.removeVertices(new Set([vertexRef]));
  store.setTreeRecord(vertexRef, record);
  expect(store.getIdState(vertexRef.getId())).toEqual({
    kind: 'live',
    ref: vertexRef,
  });

  const conflict = ref('conflict');
  conflict.getId = () => vertexRef.getId();
  expect(() => store.setTreeRecord(conflict, record)).toThrow(/id/i);
});

test('tree paths preserve a dangling legacy parent as their origin', () => {
  const store = new GraphStore<TestGraph>('tree');
  const danglingParent = ref('dangling');
  const child = ref('child');
  store.setTreeRecord(
    child,
    new VertexResolved<TestGraph>({
      $d: {
        resolutionContext: {
          depth: 1,
          parentVertex: danglingParent.unref(),
          parentVertexRef: danglingParent,
          hintIndex: 0,
          vertexHint: 'child',
        },
      },
      $c: [],
    }),
  );

  expect(store.graph.getPathsTo(child)).toEqual([[danglingParent, child]]);
});

test('orders paths by child slots rather than edge acceptance order', () => {
  const store = new GraphStore<TestGraph>('dag');
  const root = ref('root', ['A', 'B']);
  const a = ref('A', ['target']);
  const b = ref('B', ['target']);
  const target = ref('target');
  const x = ref('x', ['target']);
  const y = ref('y', ['target']);
  for (const [vertexRef, id] of [
    [root, 'root'],
    [a, 'A'],
    [b, 'B'],
    [target, 'target'],
    [x, 'x'],
    [y, 'y'],
  ] as const) {
    store.insertVertex({ ref: vertexRef, id, dependsOn: [], depth: 0 });
  }
  store.setRoot(root);
  store.prepareSlots(root, ['A', 'B']);
  store.prepareSlots(a, ['target']);
  store.prepareSlots(b, ['target']);
  store.prepareSlots(x, ['target']);
  store.prepareSlots(y, ['target']);
  store.linkSlot(root, 0, a);
  store.linkSlot(root, 1, b);
  store.linkSlot(b, 0, target);
  store.linkSlot(a, 0, target);
  store.linkSlot(y, 0, target);
  store.linkSlot(x, 0, target);

  expect(store.graph.getPathsTo(target)).toEqual([
    [root, a, target],
    [root, b, target],
    [x, target],
    [y, target],
  ]);
});
