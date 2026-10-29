import { vertexHandle } from '../src/core/observationFacets';
import type { InternalVertexResolutionContext as VertexResolutionContext } from '../src/core/ResolvedTree';
import { MutableRef } from '../src/core/CTTRef';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { Vertex } from '../src/core/Vertex';
import { DepthFirstTreeTraversal } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';
import { runnerInternals } from './internal-runner-fixtures';

type GraphTTP = VertexTypes<
  { label: string; nested: { count: number } },
  string
>;

function ref(label: string, hints: string[] = []) {
  return new MutableRef(
    new Vertex<GraphTTP>({
      $data: { label, nested: { count: 1 } },
      $childHints: hints,
    }),
  );
}

function context(
  parentVertexRef: MutableRef<Vertex<GraphTTP>>,
  hintIndex: number,
): VertexResolutionContext<GraphTTP> {
  return {
    depth: 1,
    parentVertex: parentVertexRef.getValue(),
    parentVertexRef,
    hintIndex,
    vertexHint: parentVertexRef.getValue().getChildrenHints()[hintIndex]!,
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
  const originalSharedData = shared.getValue().getData();

  container.acceptRoot(root, 'root');
  container.acceptVertex(left, 'left', [], context(root, 0));
  container.acceptVertex(right, 'right', [], context(root, 1));
  container.acceptVertex(shared, 'shared', [], context(left, 0));
  container.store.prepareSlots(root, root.getValue().getChildrenHints());
  container.store.prepareSlots(left, left.getValue().getChildrenHints());
  container.store.prepareSlots(right, right.getValue().getChildrenHints());
  container.acceptEdge(root, 0, left);
  container.acceptEdge(root, 1, right);
  container.acceptEdge(left, 0, shared);
  container.acceptEdge(right, 0, shared);

  const snapshot = container.originalGraphView!;
  const refs = new Map(
    [...container.originalGraphRefsMap!].map(([active, saved]) => [
      active,
      vertexHandle(saved),
    ]),
  );
  const savedRoot = refs.get(root)!;
  const savedLeft = refs.get(left)!;
  const savedRight = refs.get(right)!;
  const savedShared = refs.get(shared)!;
  shared.setValue(
    shared.getValue().clone({
      $data: { label: 'rewritten', nested: { count: 2 } },
      $childHints: ['active-only'],
    }),
  );
  container.deleteVertices(new Set([shared]));

  expect(container.resolvedGraphView.has(shared)).toBe(false);
  expect(savedShared).not.toBe(shared);
  expect(savedShared.getValue()).not.toBe(shared.getValue());
  expect(savedShared.getValue().getData()).toBe(originalSharedData);
  expect(savedShared.getValue().getChildrenHints()).toEqual([]);
  expect(snapshot.getPathsTo(savedShared)).toEqual([
    [savedRoot, savedLeft, savedShared],
    [savedRoot, savedRight, savedShared],
  ]);
  expect(snapshot.getParentsOf(savedShared)).toEqual([savedLeft, savedRight]);
  expect(
    (snapshot as unknown as { getVisitStageOf?: unknown }).getVisitStageOf,
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

  const snapshot = container.originalGraphView!;
  const refs = new Map(
    [...container.originalGraphRefsMap!].map(([active, saved]) => [
      active,
      vertexHandle(saved),
    ]),
  );
  expect(snapshot.getChildrenOf(refs.get(child)!)).toEqual([]);
  expect(snapshot.getPathsTo(refs.get(child)!)).toEqual([
    [refs.get(root)!, refs.get(child)!],
  ]);
});

test('tree acceptance uses supplied graph ids and dependencies', () => {
  const treeContainer = runnerInternals(
    new DepthFirstTreeTraversal<GraphTTP>({
      traversableTree: {
        resolveRoot: () => ({ kind: 'omitted' as const }),
        resolveChild: () => ({ kind: 'omitted' as const }),
      },
    }).createRunner(),
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

  const snapshot = container.originalGraphView!;
  const savedRoot = vertexHandle(container.originalGraphRefsMap!.get(root)!);
  const savedChild = vertexHandle(container.originalGraphRefsMap!.get(child)!);
  expect(container.resolvedGraphView.getVertexId(root)).toBe('accepted-root');
  expect(container.resolvedGraphView.getVertexRefById('accepted-root')).toBe(
    root,
  );
  expect(container.resolvedGraphView.getVertexId(child)).toBe('accepted-child');
  expect(container.resolvedGraphView.getVertexRefById('accepted-child')).toBe(
    child,
  );
  expect(container.resolvedGraphView.get(child)?.dependsOnWork).toEqual([
    'accepted-root',
  ]);
  expect(snapshot.getVertexId(savedRoot)).toBe('accepted-root');
  expect(snapshot.getVertexRefById('accepted-root')).toBe(savedRoot);
  expect(snapshot.getVertexId(savedChild)).toBe('accepted-child');
  expect(snapshot.getVertexRefById('accepted-child')).toBe(savedChild);
});

test('tree acceptance validates saved parent mappings before graph insertion', () => {
  const treeContainer = runnerInternals(
    new DepthFirstTreeTraversal<GraphTTP>({
      traversableTree: {
        resolveRoot: () => ({ kind: 'omitted' as const }),
        resolveChild: () => ({ kind: 'omitted' as const }),
      },
      retainOriginalTreeStructure: true,
    }).createRunner(),
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
  expect(container.resolvedGraphView.has(child)).toBe(false);
  expect(container.resolvedGraphView.getVertexRefById('child')).toBeNull();
  expect(treeContainer.resolvedTree.get(child)).toBeNull();
  expect(container.originalGraphRefsMap!.has(child)).toBe(false);
  expect(container.originalGraphView!.getVertexRefById('child')).toBeNull();

  savedRefs.set(root, savedRoot);
  container.acceptVertex(child, 'child', ['root'], context(root, 0));

  expect(container.resolvedGraphView.getVertexRefById('child')).toBe(child);
  expect(treeContainer.resolvedTree.get(child)).not.toBeNull();
  expect(container.originalGraphRefsMap!.has(child)).toBe(true);
});

function treeEdgeContainer() {
  const treeContainer = runnerInternals(
    new DepthFirstTreeTraversal<GraphTTP>({
      traversableTree: {
        resolveRoot: () => ({ kind: 'omitted' as const }),
        resolveChild: () => ({ kind: 'omitted' as const }),
      },
      retainOriginalTreeStructure: true,
    }).createRunner(),
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
      treeContainer.originalTreeView!.deleteSubtree(savedRoot);
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
      fixture.container.resolvedGraphView.getChildrenOf(fixture.root),
    ).toEqual([]);
  },
);

test('tree edge acknowledgment does not append saved topology twice', () => {
  const { child, container, root, treeContainer } = treeEdgeContainer();
  container.acceptEdge(root, 0, child);
  container.acceptEdge(root, 0, child);
  const savedRoot = treeContainer.originalTreeRefsMap!.get(root)!;
  expect(treeContainer.originalTreeView!.getChildrenOf(savedRoot)).toHaveLength(
    1,
  );
});
