import { CTTRef } from '../src/core/CTTRef';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import { Vertex } from '../src/core/Vertex';
import type { VertexResolutionContext } from '../src/core/ResolvedTree';
import { DepthFirstTraversal } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';

type GraphTTP = TreeTypeParameters<
  { label: string; nested: { count: number } },
  string
>;

function ref(label: string, hints: string[] = []) {
  return new CTTRef(
    new Vertex<GraphTTP>({
      $d: { label, nested: { count: 1 } },
      $c: hints,
    }),
  );
}

function context(
  parentVertexRef: CTTRef<Vertex<GraphTTP>>,
  hintIndex: number,
): VertexResolutionContext<GraphTTP> {
  return {
    depth: 1,
    parentVertex: parentVertexRef.unref(),
    parentVertexRef,
    hintIndex,
    vertexHint: parentVertexRef.unref().getChildrenHints()[hintIndex]!,
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
  const originalSharedData = shared.unref().getData();

  container.acceptRoot(root, 'root');
  container.acceptVertex(left, 'left', [], context(root, 0));
  container.acceptVertex(right, 'right', [], context(root, 1));
  container.acceptVertex(shared, 'shared', [], context(left, 0));
  container.store.prepareSlots(root, root.unref().getChildrenHints());
  container.store.prepareSlots(left, left.unref().getChildrenHints());
  container.store.prepareSlots(right, right.unref().getChildrenHints());
  container.acceptEdge(root, 0, left);
  container.acceptEdge(root, 1, right);
  container.acceptEdge(left, 0, shared);
  container.acceptEdge(right, 0, shared);

  const snapshot = container.notMutatedResolvedGraph!;
  const refs = container.notMutatedResolvedGraphRefsMap!;
  const savedRoot = refs.get(root)!;
  const savedLeft = refs.get(left)!;
  const savedRight = refs.get(right)!;
  const savedShared = refs.get(shared)!;
  shared.setPointsTo(
    shared.unref().clone({
      $d: { label: 'rewritten', nested: { count: 2 } },
      $c: ['active-only'],
    }),
  );
  container.deleteVertices(new Set([shared]));

  expect(container.resolvedGraph.has(shared)).toBe(false);
  expect(savedShared).not.toBe(shared);
  expect(savedShared.unref()).not.toBe(shared.unref());
  expect(savedShared.unref().getData()).toBe(originalSharedData);
  expect(savedShared.unref().getChildrenHints()).toEqual([]);
  expect(snapshot.getPathsTo(savedShared)).toEqual([
    [savedRoot, savedLeft, savedShared],
    [savedRoot, savedRight, savedShared],
  ]);
  expect(snapshot.getParentsOf(savedShared)).toEqual([savedLeft, savedRight]);
  expect(
    (snapshot as unknown as { getStatusOf?: unknown }).getStatusOf,
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

  const snapshot = container.notMutatedResolvedGraph!;
  const refs = container.notMutatedResolvedGraphRefsMap!;
  expect(snapshot.getChildrenOf(refs.get(child)!)).toEqual([]);
  expect(snapshot.getPathsTo(refs.get(child)!)).toEqual([
    [refs.get(root)!, refs.get(child)!],
  ]);
});

test('tree acceptance uses supplied graph ids and dependencies', () => {
  const treeContainer = new DepthFirstTraversal<GraphTTP>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: null }),
      makeVertex: () => ({ vertexContent: null }),
    },
  }).makeRunner().resolvedTreesContainer;
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

  const snapshot = container.notMutatedResolvedGraph!;
  const savedRoot = container.notMutatedResolvedGraphRefsMap!.get(root)!;
  const savedChild = container.notMutatedResolvedGraphRefsMap!.get(child)!;
  expect(container.resolvedGraph.getIdOf(root)).toBe('accepted-root');
  expect(container.resolvedGraph.getVertexById('accepted-root')).toBe(root);
  expect(container.resolvedGraph.getIdOf(child)).toBe('accepted-child');
  expect(container.resolvedGraph.getVertexById('accepted-child')).toBe(child);
  expect(container.resolvedGraph.get(child)?.dependsOn).toEqual([
    'accepted-root',
  ]);
  expect(snapshot.getIdOf(savedRoot)).toBe('accepted-root');
  expect(snapshot.getVertexById('accepted-root')).toBe(savedRoot);
  expect(snapshot.getIdOf(savedChild)).toBe('accepted-child');
  expect(snapshot.getVertexById('accepted-child')).toBe(savedChild);
});

test('tree acceptance validates saved parent mappings before graph insertion', () => {
  const treeContainer = new DepthFirstTraversal<GraphTTP>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: null }),
      makeVertex: () => ({ vertexContent: null }),
    },
    saveNotMutatedResolvedTree: true,
  }).makeRunner().resolvedTreesContainer;
  const container = new ResolvedGraphsContainer({
    sourceMode: 'tree',
    saveOriginal: true,
    treeContainer,
  });
  const root = ref('root', ['child']);
  const child = ref('child');
  container.acceptRoot(root, 'root');
  const savedRefs = treeContainer.notMutatedResolvedTreeRefsMap!;
  const savedRoot = savedRefs.get(root)!;
  savedRefs.delete(root);

  expect(() =>
    container.acceptVertex(child, 'child', ['root'], context(root, 0)),
  ).toThrow(/not mutated parent ref/i);
  expect(container.resolvedGraph.has(child)).toBe(false);
  expect(container.resolvedGraph.getVertexById('child')).toBeNull();
  expect(treeContainer.resolvedTree.get(child)).toBeNull();
  expect(container.notMutatedResolvedGraphRefsMap!.has(child)).toBe(false);
  expect(container.notMutatedResolvedGraph!.getVertexById('child')).toBeNull();

  savedRefs.set(root, savedRoot);
  container.acceptVertex(child, 'child', ['root'], context(root, 0));

  expect(container.resolvedGraph.getVertexById('child')).toBe(child);
  expect(treeContainer.resolvedTree.get(child)).not.toBeNull();
  expect(container.notMutatedResolvedGraphRefsMap!.has(child)).toBe(true);
});
