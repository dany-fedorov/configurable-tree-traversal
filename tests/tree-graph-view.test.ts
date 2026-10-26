import { getTreeGraphStore } from '../src/core/graph/treeStoreCapabilities';
import {
  DepthFirstTreeTraversal,
  MutableRef,
  ResolvedTreeStore,
  TreeVertexRecord,
  Vertex,
  type VertexTypes,
} from '../src';
import {
  createInternalDepthFirstTreeTraversal,
  runnerInternals,
} from './internal-runner-fixtures';

type TestGraph = VertexTypes<string, string>;

test('the advanced tree API retains supplied mutable records with detached child queries', () => {
  const tree = new ResolvedTreeStore<TestGraph>();
  const ref = new MutableRef(new Vertex<TestGraph>({ $d: 'root', $c: [] }));
  const record = new TreeVertexRecord<TestGraph>({
    metadata: { resolutionContext: null },
    children: [],
  });
  tree.set(ref, record);
  expect(tree.get(ref)).toBe(record);
  expect(tree.getChildrenOf(ref)).toEqual(record.getChildren());
  expect(tree.getChildrenOf(ref)).not.toBe(record.getChildren());
  const child = new MutableRef(
    new Vertex<TestGraph>({ $data: 'child', $childHints: [] }),
  );
  record.getChildren().push(child);
  expect(tree.getChildrenOf(ref)).toEqual([child]);
  expect(tree.getResolvedGraph().getVertexById(ref.getId())).toBe(ref);
});

test('deleting an unresolved root clears the legacy root', () => {
  const tree = new ResolvedTreeStore<TestGraph>();
  const ref = new MutableRef(new Vertex<TestGraph>({ $d: 'root', $c: [] }));
  tree.setRoot(ref);

  tree.delete(ref);

  expect(tree.getRoot()).toBeNull();
});

test('legacy deletion detaches by clone and permits manually re-setting a ref', () => {
  const tree = new ResolvedTreeStore<TestGraph>();
  const rootRef = new MutableRef(
    new Vertex<TestGraph>({ $d: 'root', $c: ['child', 'child'] }),
  );
  const childRef = new MutableRef(
    new Vertex<TestGraph>({ $d: 'child', $c: [] }),
  );
  const rootRecord = new TreeVertexRecord<TestGraph>({
    metadata: { resolutionContext: null },
    children: [childRef, childRef],
  });
  const childRecord = new TreeVertexRecord<TestGraph>({
    metadata: {
      resolutionContext: {
        depth: 1,
        parentVertex: rootRef.getValue(),
        parentVertexRef: rootRef,
        hintIndex: 0,
        vertexHint: 'child',
      },
    },
    children: [],
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
  expect(tree.getResolvedGraph().getVertexById(childRef.getId())).toBe(
    childRef,
  );
});

test('an injected tree container retains its graph facade and store', () => {
  const traversableTree = {
    resolveRoot: () => ({ vertexContent: null }),
    resolveChild: () => ({ vertexContent: null }),
  };
  const source = runnerInternals(
    new DepthFirstTreeTraversal<TestGraph>({
      traversableTree,
    }).createRunner(),
  ).resolvedTreesContainer;
  const injected = runnerInternals(
    createInternalDepthFirstTreeTraversal<TestGraph>({
      traversableTree,
      traversalRunnerInternalObjects: { resolvedTreesContainer: source },
    }).createRunner(),
  ).resolvedTreesContainer;

  expect(injected.resolvedTree).toBe(source.resolvedTree);
  expect(injected.resolvedTree.getResolvedGraph()).toBe(
    source.resolvedTree.getResolvedGraph(),
  );
  expect(getTreeGraphStore(injected.resolvedTree)).toBe(
    getTreeGraphStore(source.resolvedTree),
  );
});

test('the public tree store does not expose its graph engine capability', () => {
  const tree = new ResolvedTreeStore<TestGraph>();
  expect('getGraphStore' in tree).toBe(false);
});
