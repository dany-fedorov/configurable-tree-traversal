import { CTTRef } from '../src/core/CTTRef';
import { Vertex } from '../src/core/Vertex';
import { GraphStore } from '../src/core/graph/GraphStore';
import { StructuralGraphSnapshot } from '../src/core/graph/snapshot';
import { BreadthFirstPolicy } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstPolicy';
import { DepthFirstPolicy } from '../src/traversals/depth-first-traversal/lib/DepthFirstPolicy';
import { shouldYieldForOrder } from '../src/traversals/depth-first-traversal/iterable-helpers/shouldYieldForOrder';
import { DepthFirstTraversalOrder } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalOrder';
import { createVertexIdLabeler } from '../src/core/graph/identity';
import { DepthFirstTraversal } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';
import type { VertexResolutionContext } from '../src/core/ResolvedTree';
import type { TestGraph } from './helpers/graph-fixtures';

function ref(data: string, hints: string[] = []) {
  return new CTTRef(new Vertex<TestGraph>({ $d: data, $c: hints }));
}

function context(
  parentVertexRef: ReturnType<typeof ref>,
  hintIndex = 0,
): VertexResolutionContext<TestGraph> {
  return {
    depth: 1,
    parentVertex: parentVertexRef.unref(),
    parentVertexRef,
    hintIndex,
    vertexHint: `child-${hintIndex}`,
  };
}

test('structural graph snapshots validate staging and expose detached topology', () => {
  const snapshot = new StructuralGraphSnapshot<TestGraph>();
  const root = ref('root', ['A', 'B']);
  const a = ref('A');
  const b = ref('B');
  const stagedRoot = snapshot.stageVertex(root, 'root');
  const stagedA = snapshot.stageVertex(a, 'A');
  const stagedB = snapshot.stageVertex(b, 'B');
  snapshot.commitVertex(stagedRoot);
  snapshot.commitVertex(stagedA);
  snapshot.commitVertex(stagedB);
  snapshot.setRoot(root);

  expect(snapshot.graph.has(stagedRoot.snapshotRef)).toBe(true);
  expect(snapshot.graph.getRoot()).toBe(stagedRoot.snapshotRef);
  expect(snapshot.graph.getVertexRefs()).toEqual([
    stagedRoot.snapshotRef,
    stagedA.snapshotRef,
    stagedB.snapshotRef,
  ]);
  expect(snapshot.graph.getVertexById('A')).toBe(stagedA.snapshotRef);
  expect(snapshot.graph.getIdOf(stagedA.snapshotRef)).toBe('A');

  const edgeB = snapshot.stageEdge(root, 1, b);
  const edgeA = snapshot.stageEdge(root, 0, a);
  snapshot.commitEdge(edgeB);
  snapshot.commitEdge(edgeA);
  snapshot.commitEdge(snapshot.stageEdge(root, 0, a));
  expect(snapshot.graph.getChildrenOf(stagedRoot.snapshotRef)).toEqual([
    stagedA.snapshotRef,
    stagedB.snapshotRef,
  ]);
  expect(snapshot.graph.getParentsOf(stagedA.snapshotRef)).toEqual([
    stagedRoot.snapshotRef,
  ]);
  expect(snapshot.graph.getPathsTo(stagedA.snapshotRef)).toEqual([
    [stagedRoot.snapshotRef, stagedA.snapshotRef],
  ]);
  expect(
    snapshot.graph.getPathsTo(stagedA.snapshotRef, {
      noRoot: true,
      noSelf: true,
    }),
  ).toEqual([[]]);

  const unknown = ref('unknown');
  expect(snapshot.graph.has(unknown)).toBe(false);
  expect(snapshot.graph.getVertexById('unknown')).toBeNull();
  expect(snapshot.graph.getParentsOf(unknown)).toBeNull();
  expect(snapshot.graph.getChildrenOf(unknown)).toBeNull();
  expect(() => snapshot.graph.getIdOf(unknown)).toThrow(/unknown/i);
  expect(() => snapshot.graph.getPathsTo(unknown)).toThrow(/unknown/i);
  expect(() => snapshot.stageVertex(root, 'other')).toThrow(/reference/i);
  expect(() => snapshot.stageVertex(unknown, 'A')).toThrow(/id/i);
  expect(() => snapshot.setRoot(unknown)).toThrow(/root reference/i);
  expect(() => snapshot.stageEdge(root, -1, a)).toThrow(/slot/i);
  expect(() => snapshot.stageEdge(unknown, 0, a)).toThrow(/parent/i);
  expect(() => snapshot.stageEdge(root, 0, unknown)).toThrow(/child/i);
  expect(() => snapshot.stageEdge(root, 0, b)).toThrow(/another vertex/i);
});

test('structural graph snapshots order independent roots and shared paths', () => {
  const snapshot = new StructuralGraphSnapshot<TestGraph>();
  const left = ref('left', ['join']);
  const right = ref('right', ['join']);
  const join = ref('join');
  const staged = [left, right, join].map((vertexRef) =>
    snapshot.stageVertex(vertexRef, vertexRef.unref().getData()),
  );
  staged.forEach((vertex) => snapshot.commitVertex(vertex));
  snapshot.commitEdge(snapshot.stageEdge(right, 0, join));
  snapshot.commitEdge(snapshot.stageEdge(left, 0, join));
  expect(snapshot.graph.getPathsTo(staged[2]!.snapshotRef)).toEqual([
    [staged[0]!.snapshotRef, staged[2]!.snapshotRef],
    [staged[1]!.snapshotRef, staged[2]!.snapshotRef],
  ]);
});

test('graph traversal slots retain the unprepared/prepared distinction', () => {
  const store = new GraphStore<TestGraph>('dag');
  const root = ref('root');
  store.insertVertex({ ref: root, id: 'root', dependsOn: [], depth: 0 });
  expect(store.getTraversalSlots(root)).toBeNull();
  store.prepareSlots(root, []);
  expect(store.getTraversalSlots(root)).toEqual([]);
  expect(() => store.resetTraversal(root)).toThrow(/tree mode/i);
  expect(() => store.markDeleted('root')).toThrow(/already indexed/i);
});

test('small vertex and identity helpers report their remaining cases', () => {
  expect(ref('leaf').unref().isLeafVertex()).toBe(true);
  expect(ref('branch', ['leaf']).unref().isLeafVertex()).toBe(false);
  expect(createVertexIdLabeler()(1n)).toBe('1n');
  expect(
    shouldYieldForOrder(
      {
        iterateOver: [DepthFirstTraversalOrder.POST_ORDER],
        enableVisitorFunctionsFor: null,
        disableVisitorFunctionsFor: null,
      },
      DepthFirstTraversalOrder.PRE_ORDER,
    ),
  ).toBe(false);
});

test('depth runner leaf checks include explicit subtree disabling', () => {
  const runner = new DepthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: null }),
      makeVertex: () => ({ vertexContent: null }),
    },
  }).makeRunner();
  const leaf = ref('leaf');
  const branch = ref('branch', ['child']);
  expect(runner.isLeafVertexRef(leaf)).toBe(true);
  expect(runner.isLeafVertexRef(branch)).toBe(false);
  runner.state.subtreeTraversalDisabledRefs.add(branch);
  expect(runner.isLeafVertexRef(branch)).toBe(true);
});

test('breadth-first policy validates every owned transition', () => {
  const parent = ref('parent', ['a']);
  const queued = context(parent);
  const state = { queue: [queued], queueIndex: 0 };
  const injectedPolicy = new BreadthFirstPolicy<TestGraph>(state, true);
  expect(injectedPolicy.activateInjectedFrontier(parent)).toBe(false);
  expect(injectedPolicy.takeInjectedFrontier(parent)).not.toBeNull();
  expect(injectedPolicy.takeInjectedFrontier(parent)).toBeNull();

  const policy = new BreadthFirstPolicy<TestGraph>(
    { queue: [], queueIndex: 0 },
    true,
  );

  const missing = ref('missing');
  policy.enqueueExpansion({ kind: 'frame', id: 1, epoch: 0 }, missing, 0);
  policy.enqueueExpansion({ kind: 'frame', id: 2, epoch: 0 }, parent, 0);
  const sort = policy.next((candidate) => candidate !== missing, () => false);
  expect(sort?.kind).toBe('SORT_HINTS');
  expect(policy.next(() => true, () => false)).toBeNull();
  if (sort?.kind !== 'SORT_HINTS') throw new Error('Expected sort work');
  expect(() =>
    policy.setHints(
      { ...sort.expansion, owner: { kind: 'frame', id: 99, epoch: 0 } },
      [],
    ),
  ).toThrow(/unknown/i);
  expect(() =>
    policy.setSortedHints({ kind: 'frame', id: 99, epoch: 0 }, []),
  ).toThrow(/owner/i);
  expect(policy.setSortedHints(sort.expansion.owner, ['a'])).toEqual({
    vertexRef: parent,
    empty: false,
  });

  const work = policy.next(() => true, () => false);
  expect(work?.kind).toBe('MAKE_VERTEX');
  if (work?.kind !== 'MAKE_VERTEX') throw new Error('Expected resolution work');
  const owner = { kind: 'frame' as const, id: 3, epoch: 0 };
  policy.startResolution(owner, work.context);
  expect(policy.next(() => true, () => false)).toBeNull();
  const frames = policy.getFrames();
  expect(frames[frames.length - 1]?.pendingIndices).toEqual([0]);
  expect(() => policy.startResolution(owner, work.context)).toThrow(/pending/i);
  expect(() =>
    policy.completeResolution({ kind: 'frame', id: 4, epoch: 0 }),
  ).toThrow(/unknown/i);
  expect(policy.completeResolution(owner)).toEqual({
    context: work.context,
    closeParent: true,
  });
  expect(policy.next(() => false, () => false)?.kind).toBe('CLEAR_QUEUE');
  policy.clearQueue();
  expect(policy.isIdle()).toBe(true);
});

test('breadth-first policy handles disabled expansion and invalid progress', () => {
  const parent = ref('parent', ['a']);
  const policy = new BreadthFirstPolicy<TestGraph>(
    { queue: [], queueIndex: 0 },
    false,
  );
  expect(policy.activateInjectedFrontier(parent)).toBe(true);
  policy.enqueueExpansion({ kind: 'frame', id: 1, epoch: 0 }, parent, 0);
  const work = policy.next(() => true, () => true);
  expect(work).toMatchObject({ kind: 'PREPARE_HINTS', hints: [] });
  if (work?.kind !== 'PREPARE_HINTS') throw new Error('Expected hints');
  expect(policy.setHints(work.expansion, [])).toBe(true);

  const unrelated = ref('unrelated');
  policy.startResolution(
    { kind: 'frame', id: 2, epoch: 0 },
    context(unrelated),
  );
  expect(() =>
    policy.completeResolution({ kind: 'frame', id: 2, epoch: 0 }),
  ).toThrow(/parent expansion/i);
  policy.clear();
  expect(policy.getFrames()).toEqual([]);
});

test('policy inspections expose unresolved BFS and waiting DFS frames', () => {
  const parent = ref('parent');
  const breadth = new BreadthFirstPolicy<TestGraph>(
    { queue: [], queueIndex: 0 },
    false,
  );
  breadth.enqueueExpansion({ kind: 'frame', id: 1, epoch: 0 }, parent, 0);
  expect(breadth.getFrames()[0]?.stage).toBe('resolve');

  const depth = new DepthFirstPolicy<TestGraph>(
    {
      visitParentAfterChildren: 0,
      visitParentAfterChildrenAllRangesOutOfBoundsFallback: 0,
      visitUpOneChildParents: true,
      considerVisitAfterNullContentVertices: true,
    },
    false,
  );
  depth.push({ kind: 'frame', id: 1, epoch: 0 }, parent, 0);
  const frame = depth.getFrames()[0]!;
  for (const stage of [
    'pre-visit',
    'sort-wait',
    'child-wait',
    'in-visit',
    'post-visit',
  ] as const) {
    frame.stage = stage;
    expect(depth.next(() => true, () => false)).toBeNull();
  }
});
