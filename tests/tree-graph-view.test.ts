import {
  CTTRef,
  DepthFirstTraversal,
  ResolvedTree,
  type TreeTypeParameters,
  Vertex,
  VertexResolved,
} from '../src';

type TestGraph = TreeTypeParameters<string, string>;

test('the tree facade retains supplied records and live child arrays', () => {
  const tree = new ResolvedTree<TestGraph>();
  const ref = new CTTRef(new Vertex<TestGraph>({ $d: 'root', $c: [] }));
  const record = new VertexResolved<TestGraph>({
    $d: { resolutionContext: null },
    $c: [],
  });
  tree.set(ref, record);
  expect(tree.get(ref)).toBe(record);
  expect(tree.getChildrenOf(ref)).toBe(record.getChildren());
  expect(tree.getResolvedGraph().getVertexById(ref.getId())).toBe(ref);
});

test('deleting an unresolved root clears the legacy root', () => {
  const tree = new ResolvedTree<TestGraph>();
  const ref = new CTTRef(new Vertex<TestGraph>({ $d: 'root', $c: [] }));
  tree.setRoot(ref);

  tree.delete(ref);

  expect(tree.getRoot()).toBeNull();
});

test('legacy deletion detaches by clone and permits manually re-setting a ref', () => {
  const tree = new ResolvedTree<TestGraph>();
  const rootRef = new CTTRef(
    new Vertex<TestGraph>({ $d: 'root', $c: ['child', 'child'] }),
  );
  const childRef = new CTTRef(
    new Vertex<TestGraph>({ $d: 'child', $c: [] }),
  );
  const rootRecord = new VertexResolved<TestGraph>({
    $d: { resolutionContext: null },
    $c: [childRef, childRef],
  });
  const childRecord = new VertexResolved<TestGraph>({
    $d: {
      resolutionContext: {
        depth: 1,
        parentVertex: rootRef.unref(),
        parentVertexRef: rootRef,
        hintIndex: 0,
        vertexHint: 'child',
      },
    },
    $c: [],
  });
  tree.setRoot(rootRef);
  tree.set(rootRef, rootRecord);
  tree.set(childRef, childRecord);

  tree.delete(childRef);

  expect(tree.get(rootRef)).not.toBe(rootRecord);
  expect(tree.getChildrenOf(rootRef)).toEqual([]);
  expect(rootRecord.getChildren()).toEqual([childRef, childRef]);
  expect(tree.getResolvedGraph().getVertexById(childRef.getId())).toBeNull();

  tree.set(childRef, childRecord);
  expect(tree.get(childRef)).toBe(childRecord);
  expect(tree.getResolvedGraph().getVertexById(childRef.getId())).toBe(childRef);
});

test('an injected tree container retains its graph facade and store', () => {
  const traversableTree = {
    makeRoot: () => ({ vertexContent: null }),
    makeVertex: () => ({ vertexContent: null }),
  };
  const source = new DepthFirstTraversal<TestGraph>({ traversableTree })
    .makeRunner().resolvedTreesContainer;
  const injected = new DepthFirstTraversal<TestGraph>({ traversableTree })
    .configure({
      traversalRunnerInternalObjects: { resolvedTreesContainer: source },
    })
    .makeRunner().resolvedTreesContainer;

  expect(injected.resolvedTree).toBe(source.resolvedTree);
  expect(injected.resolvedTree.getResolvedGraph()).toBe(
    source.resolvedTree.getResolvedGraph(),
  );
  expect(injected.resolvedTree.getGraphStore()).toBe(
    source.resolvedTree.getGraphStore(),
  );
});
