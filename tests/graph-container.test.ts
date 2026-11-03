import { createVertexHandleFacet } from '../src/core/observationFacets';
import type { InternalChildDiscoveryContext as ChildDiscoveryContext } from '../src/core/ResolvedTree';
import { MutableValueReference } from '../src/core/CTTRef';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { Vertex } from '../src/core/Vertex';
import { DepthFirstTreeTraversalBuilder } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';
import { runnerInternals } from './internal-runner-fixtures';

type GraphTTP = VertexDataAndChildHintTypes<
  { label: string; nested: { count: number } },
  string
>;

function ref(label: string, hints: string[] = []) {
  return new MutableValueReference(
    new Vertex<GraphTTP>({
      $vertexData: { label, nested: { count: 1 } },
      $childDiscoveryHints: hints,
    }),
  );
}

function context(
  parentVertexRef: MutableValueReference<Vertex<GraphTTP>>,
  hintIndex: number,
): ChildDiscoveryContext<GraphTTP> {
  return {
    discoveryDepthInEdges: 1,
    parentVertexAtChildResolution: parentVertexRef.getReferencedValue(),
    parentVertexHandle: parentVertexRef,
    parentChildHintIndex: hintIndex,
    childDiscoveryHint: parentVertexRef
      .getReferencedValue()
      .getMutableChildDiscoveryHints()[hintIndex]!,
  };
}

test('the original graph retains first-accepted content and shared topology', () => {
  const container = new ResolvedGraphsContainer<GraphTTP>({
    sourceMode: 'graph',
    saveOriginal: true,
  });
  const root = ref('root', ['left', 'right']);
  const left = ref('left', ['shared']);
  const right = ref('right', ['shared']);
  const shared = ref('shared');
  const originalSharedData = shared.getReferencedValue().getVertexData();

  container.acceptRoot(root, 'root');
  container.acceptVertex(left, 'left', [], context(root, 0));
  container.acceptVertex(right, 'right', [], context(root, 1));
  container.acceptVertex(shared, 'shared', [], context(left, 0));
  container.store.prepareSlots(
    root,
    root.getReferencedValue().getMutableChildDiscoveryHints(),
  );
  container.store.prepareSlots(
    left,
    left.getReferencedValue().getMutableChildDiscoveryHints(),
  );
  container.store.prepareSlots(
    right,
    right.getReferencedValue().getMutableChildDiscoveryHints(),
  );
  container.acceptEdge(root, 0, left);
  container.acceptEdge(root, 1, right);
  container.acceptEdge(left, 0, shared);
  container.acceptEdge(right, 0, shared);

  const snapshot = container.preCommandDiscoveredGraphView!;
  const refs = new Map(
    [...container.originalGraphRefsMap!].map(([active, saved]) => [
      active,
      createVertexHandleFacet(saved),
    ]),
  );
  const savedRoot = refs.get(root)!;
  const savedLeft = refs.get(left)!;
  const savedRight = refs.get(right)!;
  const savedShared = refs.get(shared)!;
  shared.replaceReferencedValue(
    shared.getReferencedValue().createEditableShallowCloneWithContentOverrides({
      $vertexData: { label: 'rewritten', nested: { count: 2 } },
      $childDiscoveryHints: ['active-only'],
    }),
  );
  container.deleteVertices(new Set([shared]));

  expect(container.liveResolvedGraphView.has(shared)).toBe(false);
  expect(savedShared).not.toBe(shared);
  expect(savedShared.getCurrentVertexView()).not.toBe(
    shared.getReferencedValue(),
  );
  expect(savedShared.getCurrentVertexView().getVertexData()).toBe(
    originalSharedData,
  );
  expect(
    savedShared.getCurrentVertexView().getDetachedChildDiscoveryHints(),
  ).toEqual([]);
  expect(snapshot.requireAllStructuralAncestorPathsTo(savedShared)).toEqual([
    [savedRoot, savedLeft, savedShared],
    [savedRoot, savedRight, savedShared],
  ]);
  expect(
    snapshot.getDistinctStructuralParentHandlesOrNull(savedShared),
  ).toEqual([savedLeft, savedRight]);
  expect(
    (snapshot as unknown as { getVertexVisitSchedulingStageOrNull?: unknown })
      .getVertexVisitSchedulingStageOrNull,
  ).toBeUndefined();
});

test('a rejected active edge does not mutate the original snapshot', () => {
  const container = new ResolvedGraphsContainer<GraphTTP>({
    sourceMode: 'graph',
    saveOriginal: true,
  });
  const root = ref('root', ['child']);
  const child = ref('child', ['root']);
  container.acceptRoot(root, 'root');
  container.acceptVertex(child, 'child', [], context(root, 0));
  container.store.prepareSlots(root, ['child']);
  container.store.prepareSlots(child, ['root']);
  container.acceptEdge(root, 0, child);

  expect(() => container.acceptEdge(child, 0, root)).toThrow(/cycle/i);

  const snapshot = container.preCommandDiscoveredGraphView!;
  const refs = new Map(
    [...container.originalGraphRefsMap!].map(([active, saved]) => [
      active,
      createVertexHandleFacet(saved),
    ]),
  );
  expect(
    snapshot.getStructuralChildHandlesInSlotOrderOrNull(refs.get(child)!),
  ).toEqual([]);
  expect(
    snapshot.requireAllStructuralAncestorPathsTo(refs.get(child)!),
  ).toEqual([[refs.get(root)!, refs.get(child)!]]);
});

test('tree acceptance uses supplied graph ids and dependencies', () => {
  const treeContainer = runnerInternals(
    new DepthFirstTreeTraversalBuilder<GraphTTP>({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions(),
  ).resolvedTreesContainer;
  const container = new ResolvedGraphsContainer({
    sourceMode: 'tree',
    saveOriginal: true,
    treeContainer,
  });
  const root = ref('root', ['child']);
  const child = ref('child');

  container.acceptRoot(root, 'accepted-root');
  container.acceptVertex(
    child,
    'accepted-child',
    ['accepted-root'],
    context(root, 0),
  );

  const snapshot = container.preCommandDiscoveredGraphView!;
  const savedRoot = createVertexHandleFacet(
    container.originalGraphRefsMap!.get(root)!,
  );
  const savedChild = createVertexHandleFacet(
    container.originalGraphRefsMap!.get(child)!,
  );
  expect(container.liveResolvedGraphView.requireVertexId(root)).toBe(
    'accepted-root',
  );
  expect(
    container.liveResolvedGraphView.getVertexRefById('accepted-root'),
  ).toBe(root);
  expect(container.liveResolvedGraphView.requireVertexId(child)).toBe(
    'accepted-child',
  );
  expect(
    container.liveResolvedGraphView.getVertexRefById('accepted-child'),
  ).toBe(child);
  expect(
    container.liveResolvedGraphView.get(child)?.workWaitsForWorkOf,
  ).toEqual(['accepted-root']);
  expect(snapshot.requireVertexId(savedRoot)).toBe('accepted-root');
  expect(snapshot.getVertexHandleByIdOrNull('accepted-root')).toBe(savedRoot);
  expect(snapshot.requireVertexId(savedChild)).toBe('accepted-child');
  expect(snapshot.getVertexHandleByIdOrNull('accepted-child')).toBe(savedChild);
});

test('tree acceptance validates saved parent mappings before graph insertion', () => {
  const treeContainer = runnerInternals(
    new DepthFirstTreeTraversalBuilder<GraphTTP>({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
      retainDiscoveredTreeBeforeVisitorCommands: true,
    }).createIndependentRunnerFromCurrentOptions(),
  ).resolvedTreesContainer;
  const container = new ResolvedGraphsContainer({
    sourceMode: 'tree',
    saveOriginal: true,
    treeContainer,
  });
  const root = ref('root', ['child']);
  const child = ref('child');
  container.acceptRoot(root, 'root');
  const savedRefs = treeContainer.originalTreeRefsMap!;
  const savedRoot = savedRefs.get(root)!;
  savedRefs.delete(root);

  expect(() =>
    container.acceptVertex(child, 'child', ['root'], context(root, 0)),
  ).toThrow(/not mutated parent ref/i);
  expect(container.liveResolvedGraphView.has(child)).toBe(false);
  expect(container.liveResolvedGraphView.getVertexRefById('child')).toBeNull();
  expect(
    treeContainer.resolvedTree.getMutableVertexRecordOrNull(child),
  ).toBeNull();
  expect(container.originalGraphRefsMap!.has(child)).toBe(false);
  expect(
    container.preCommandDiscoveredGraphView!.getVertexHandleByIdOrNull('child'),
  ).toBeNull();

  savedRefs.set(root, savedRoot);
  container.acceptVertex(child, 'child', ['root'], context(root, 0));

  expect(container.liveResolvedGraphView.getVertexRefById('child')).toBe(child);
  expect(
    treeContainer.resolvedTree.getMutableVertexRecordOrNull(child),
  ).not.toBeNull();
  expect(container.originalGraphRefsMap!.has(child)).toBe(true);
});

function treeEdgeContainer() {
  const treeContainer = runnerInternals(
    new DepthFirstTreeTraversalBuilder<GraphTTP>({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
      retainDiscoveredTreeBeforeVisitorCommands: true,
    }).createIndependentRunnerFromCurrentOptions(),
  ).resolvedTreesContainer;
  const container = new ResolvedGraphsContainer({
    sourceMode: 'tree',
    saveOriginal: false,
    treeContainer,
  });
  const root = ref('root', ['child']);
  const child = ref('child');
  container.acceptRoot(root, 'root');
  container.acceptVertex(child, 'child', [], context(root, 0));
  container.store.prepareSlots(root, ['child']);
  return { child, container, root, treeContainer };
}

test.each([
  [
    'parent ref',
    ({ root, treeContainer }: ReturnType<typeof treeEdgeContainer>) => {
      treeContainer.originalTreeRefsMap!.delete(root);
    },
  ],
  [
    'child ref',
    ({ child, treeContainer }: ReturnType<typeof treeEdgeContainer>) => {
      treeContainer.originalTreeRefsMap!.delete(child);
    },
  ],
  [
    'parent record',
    ({ root, treeContainer }: ReturnType<typeof treeEdgeContainer>) => {
      const savedRoot = treeContainer.originalTreeRefsMap!.get(root)!;
      treeContainer.preCommandDiscoveredTreeView!.deleteSubtree(savedRoot);
    },
  ],
] as const)(
  'tree edge acceptance rejects a missing saved %s atomically',
  (_name, corrupt) => {
    const fixture = treeEdgeContainer();
    corrupt(fixture);
    expect(() =>
      fixture.container.acceptEdge(fixture.root, 0, fixture.child),
    ).toThrow(/not mutated/i);
    expect(
      fixture.container.liveResolvedGraphView.getChildrenOf(fixture.root),
    ).toEqual([]);
  },
);

test('tree edge acknowledgment does not append saved topology twice', () => {
  const { child, container, root, treeContainer } = treeEdgeContainer();
  container.acceptEdge(root, 0, child);
  container.acceptEdge(root, 0, child);
  const savedRoot = treeContainer.originalTreeRefsMap!.get(root)!;
  expect(
    treeContainer.preCommandDiscoveredTreeView!.getDetachedChildReferenceListOrNull(
      savedRoot,
    ),
  ).toHaveLength(1);
});
