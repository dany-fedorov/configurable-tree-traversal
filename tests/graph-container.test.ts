import { CTTRef } from '../src/core/CTTRef';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import { Vertex } from '../src/core/Vertex';
import type { VertexResolutionContext } from '../src/core/ResolvedTree';

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
