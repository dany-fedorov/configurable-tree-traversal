import { createVertexHandleFacet } from '../src/core/observationFacets';
import type { MutableTreeChildDiscoveryContext as ChildDiscoveryContext } from '../src/core/ResolvedTree';
import { MutableValueReference } from '../src/core/CTTRef';
import { GraphStore } from '../src/core/graph/GraphStore';
import { createVertexIdLabeler } from '../src/core/graph/identity';
import { StructuralGraphSnapshot } from '../src/core/graph/snapshot';
import { Vertex } from '../src/core/Vertex';
import { BreadthFirstPolicy } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstPolicy';
import { DepthFirstTreeTraversalBuilder } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';
import { shouldYieldForOrder } from '../src/traversals/depth-first-traversal/iterable-helpers/shouldYieldForOrder';
import { DepthFirstPolicy } from '../src/traversals/depth-first-traversal/lib/DepthFirstPolicy';
import { DepthFirstTreeVisitPhase } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { TestGraph } from './helpers/graph-fixtures';
import { runnerInternals } from './internal-runner-fixtures';

function ref(data: string, hints: string[] = []) {
  return new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: data, $childDiscoveryHints: hints }),
  );
}

function context(
  parentVertexHandle: ReturnType<typeof ref>,
  hintIndex = 0,
): ChildDiscoveryContext<TestGraph> {
  return {
    discoveryDepthInEdges: 1,
    parentVertexAtChildResolution: parentVertexHandle.getReferencedValue(),
    parentVertexReference: parentVertexHandle,
    parentChildHintIndex: hintIndex,
    childDiscoveryHint: `child-${hintIndex}`,
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
  expect(snapshot.graph.getVertexRefById('A')).toBe(stagedA.snapshotRef);
  expect(snapshot.graph.requireVertexId(stagedA.snapshotRef)).toBe('A');

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
  expect(snapshot.graph.requirePathsTo(stagedA.snapshotRef)).toEqual([
    [stagedRoot.snapshotRef, stagedA.snapshotRef],
  ]);
  expect(
    snapshot.graph.requirePathsTo(stagedA.snapshotRef, {
      includeDesignatedRoot: false,
      includeTargetVertex: false,
    }),
  ).toEqual([[]]);

  const unknown = ref('unknown');
  expect(snapshot.graph.has(unknown)).toBe(false);
  expect(snapshot.graph.getVertexRefById('unknown')).toBeNull();
  expect(snapshot.graph.getParentsOf(unknown)).toBeNull();
  expect(snapshot.graph.getChildrenOf(unknown)).toBeNull();
  expect(() => snapshot.graph.requireVertexId(unknown)).toThrow(/unknown/i);
  expect(() => snapshot.graph.requirePathsTo(unknown)).toThrow(/unknown/i);
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
  const staged = [left, right, join].map((vertexHandle) =>
    snapshot.stageVertex(
      vertexHandle,
      vertexHandle.getReferencedValue().getVertexData(),
    ),
  );
  staged.forEach((vertex) => snapshot.commitVertex(vertex));
  snapshot.commitEdge(snapshot.stageEdge(right, 0, join));
  snapshot.commitEdge(snapshot.stageEdge(left, 0, join));
  expect(snapshot.graph.requirePathsTo(staged[2]!.snapshotRef)).toEqual([
    [staged[0]!.snapshotRef, staged[2]!.snapshotRef],
    [staged[1]!.snapshotRef, staged[2]!.snapshotRef],
  ]);
});

test('graph traversal slots retain the unprepared/prepared distinction', () => {
  const store = new GraphStore<TestGraph>('dag');
  const root = ref('root');
  store.insertVertex({
    ref: root,
    id: 'root',
    workWaitsForWorkOf: [],
    depth: 0,
  });
  expect(store.getTraversalSlots(root)).toBeNull();
  store.prepareSlots(root, []);
  expect(store.getTraversalSlots(root)).toEqual([]);
  expect(() => store.resetTraversal(root)).toThrow(/tree mode/i);
  expect(() => store.markDeleted('root')).toThrow(/already indexed/i);
});

test('small vertex and identity helpers report their remaining cases', () => {
  expect(!ref('leaf').getReferencedValue().hasChildDiscoveryHints()).toBe(true);
  expect(
    !ref('branch', ['leaf']).getReferencedValue().hasChildDiscoveryHints(),
  ).toBe(false);
  expect(createVertexIdLabeler()(1n)).toBe('1n');
  expect(
    shouldYieldForOrder(
      {
        iterateOver: [DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES],
        enableVisitorFunctionsFor: null,
        disableVisitorFunctionsFor: null,
      },
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    ),
  ).toBe(false);
});

test('depth runner leaf checks include explicit subtree disabling', () => {
  const runner = new DepthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexIntentionallyOmitted' as const,
      }),
      resolveChildVertexFromHint: () => ({
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  const leaf = ref('leaf');
  const branch = ref('branch', ['child']);
  expect(!leaf.getReferencedValue().hasChildDiscoveryHints()).toBe(true);
  expect(
    runner.isPendingChildDiscoveryDisabled(createVertexHandleFacet(branch)),
  ).toBe(false);
  runnerInternals(runner).state.subtreeTraversalDisabledRefs.add(branch);
  expect(
    runner.isPendingChildDiscoveryDisabled(createVertexHandleFacet(branch)),
  ).toBe(true);
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
  policy.enqueueExpansion(
    {
      ownerKind: 'vertexTraversalFrame' as const,
      runnerLocalOwnerId: 1,
      validityGeneration: 0,
    },
    missing,
    0,
  );
  policy.enqueueExpansion(
    {
      ownerKind: 'vertexTraversalFrame' as const,
      runnerLocalOwnerId: 2,
      validityGeneration: 0,
    },
    parent,
    0,
  );
  const sort = policy.next(
    (candidate) => candidate !== missing,
    () => false,
  );
  expect(sort?.kind).toBe('SORT_HINTS');
  expect(
    policy.next(
      () => true,
      () => false,
    ),
  ).toBeNull();
  if (sort?.kind !== 'SORT_HINTS') throw new Error('Expected sort work');
  expect(() =>
    policy.setHints(
      {
        ...sort.expansion,
        owner: {
          ownerKind: 'vertexTraversalFrame' as const,
          runnerLocalOwnerId: 99,
          validityGeneration: 0,
        },
      },
      [],
    ),
  ).toThrow(/unknown/i);
  expect(() =>
    policy.setSortedHints(
      {
        ownerKind: 'vertexTraversalFrame' as const,
        runnerLocalOwnerId: 99,
        validityGeneration: 0,
      },
      [],
    ),
  ).toThrow(/owner/i);
  expect(policy.setSortedHints(sort.expansion.owner, ['a'])).toEqual({
    vertexHandle: parent,
    empty: false,
  });

  const work = policy.next(
    () => true,
    () => false,
  );
  expect(work?.kind).toBe('MAKE_VERTEX');
  if (work?.kind !== 'MAKE_VERTEX') throw new Error('Expected resolution work');
  const owner = {
    ownerKind: 'vertexTraversalFrame' as const,
    runnerLocalOwnerId: 3,
    validityGeneration: 0,
  };
  policy.startResolution(owner, work.context);
  expect(
    policy.next(
      () => true,
      () => false,
    ),
  ).toBeNull();
  const frames = policy.getFrames();
  expect(frames[frames.length - 1]?.pendingIndices).toEqual([0]);
  expect(() => policy.startResolution(owner, work.context)).toThrow(/pending/i);
  expect(() =>
    policy.completeResolution({
      ownerKind: 'vertexTraversalFrame' as const,
      runnerLocalOwnerId: 4,
      validityGeneration: 0,
    }),
  ).toThrow(/unknown/i);
  expect(policy.completeResolution(owner)).toEqual({
    context: work.context,
    closeParent: true,
  });
  expect(
    policy.next(
      () => false,
      () => false,
    )?.kind,
  ).toBe('CLEAR_QUEUE');
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
  policy.enqueueExpansion(
    {
      ownerKind: 'vertexTraversalFrame' as const,
      runnerLocalOwnerId: 1,
      validityGeneration: 0,
    },
    parent,
    0,
  );
  const work = policy.next(
    () => true,
    () => true,
  );
  expect(work).toMatchObject({ kind: 'PREPARE_HINTS', hints: [] });
  if (work?.kind !== 'PREPARE_HINTS') throw new Error('Expected hints');
  expect(policy.setHints(work.expansion, [])).toBe(true);

  const unrelated = ref('unrelated');
  policy.startResolution(
    {
      ownerKind: 'vertexTraversalFrame' as const,
      runnerLocalOwnerId: 2,
      validityGeneration: 0,
    },
    context(unrelated),
  );
  expect(() =>
    policy.completeResolution({
      ownerKind: 'vertexTraversalFrame' as const,
      runnerLocalOwnerId: 2,
      validityGeneration: 0,
    }),
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
  breadth.enqueueExpansion(
    {
      ownerKind: 'vertexTraversalFrame' as const,
      runnerLocalOwnerId: 1,
      validityGeneration: 0,
    },
    parent,
    0,
  );
  expect(breadth.getFrames()[0]?.stage).toBe('resolve');

  const depth = new DepthFirstPolicy<TestGraph>(
    {
      visitAfterChildIndices: { indices: [0] },
      visitAfterChildIndicesWhenPrimarySelectionIsEmpty: { indices: [0] },
      alsoVisitAfterOnlyChild: true,
      allowBoundaryVisitsAfterOmittedChildSlots: true,
    },
    false,
  );
  depth.push(
    {
      ownerKind: 'vertexTraversalFrame' as const,
      runnerLocalOwnerId: 1,
      validityGeneration: 0,
    },
    parent,
    0,
  );
  const frame = depth.getFrames()[0]!;
  for (const stage of [
    'waitingForInitialVisitChain',
    'waitingForChildHintTransformation',
    'waitingForChildResolution',
    'waitingForChildBoundaryVisitChain',
    'waitingForCompletionVisitChain',
  ] as const) {
    frame.stage = stage;
    expect(
      depth.next(
        () => true,
        () => false,
      ),
    ).toBeNull();
  }
});
