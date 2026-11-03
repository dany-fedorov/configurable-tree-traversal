import { createVertexHandleFacet } from '../src/core/observationFacets';
import { getTreeGraphStore } from '../src/core/graph/treeStoreCapabilities';
import {
  DepthFirstTreeTraversalBuilder,
  MutableValueReference,
  MutableResolvedTreeStore,
  MutableTreeVertexTopologyRecord,
  Vertex,
  type VertexDataAndChildHintTypes,
} from '../src';
import {
  createInternalDepthFirstTreeTraversal,
  runnerInternals,
} from './internal-runner-fixtures';

type TestGraph = VertexDataAndChildHintTypes<string, string>;

test('the advanced tree API retains supplied mutable records with detached child queries', () => {
  const tree = new MutableResolvedTreeStore<TestGraph>();
  const ref = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: 'root', $childDiscoveryHints: [] }),
  );
  const record = new MutableTreeVertexTopologyRecord<TestGraph>({
    metadata: { childDiscoveryContext: null },
    childReferences: [],
  });
  tree.setVertexRecord(ref, record);
  expect(tree.getMutableVertexRecordOrNull(ref)).toBe(record);
  expect(tree.getDetachedChildReferenceListOrNull(ref)).toEqual(
    record.getMutableChildReferenceList(),
  );
  expect(tree.getDetachedChildReferenceListOrNull(ref)).not.toBe(
    record.getMutableChildReferenceList(),
  );
  const child = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: 'child', $childDiscoveryHints: [] }),
  );
  record.getMutableChildReferenceList().push(child);
  expect(tree.getDetachedChildReferenceListOrNull(ref)).toEqual([child]);
  expect(
    tree
      .getLiveResolvedGraphView()
      .getVertexHandleByIdOrNull(ref.getReferenceIdentity()),
  ).toBe(createVertexHandleFacet(ref));
});

test('deleting an unresolved root clears the legacy root', () => {
  const tree = new MutableResolvedTreeStore<TestGraph>();
  const ref = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: 'root', $childDiscoveryHints: [] }),
  );
  tree.setRootVertexReference(ref);

  tree.deleteSubtree(ref);

  expect(tree.getRootVertexReferenceOrNull()).toBeNull();
});

test('legacy deletion detaches by clone and permits manually re-setting a ref', () => {
  const tree = new MutableResolvedTreeStore<TestGraph>();
  const rootRef = new MutableValueReference(
    new Vertex<TestGraph>({
      $vertexData: 'root',
      $childDiscoveryHints: ['child', 'child'],
    }),
  );
  const childRef = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: 'child', $childDiscoveryHints: [] }),
  );
  const rootRecord = new MutableTreeVertexTopologyRecord<TestGraph>({
    metadata: { childDiscoveryContext: null },
    childReferences: [childRef, childRef],
  });
  const childRecord = new MutableTreeVertexTopologyRecord<TestGraph>({
    metadata: {
      childDiscoveryContext: {
        discoveryDepthInEdges: 1,
        parentVertexAtChildResolution: rootRef.getReferencedValue(),
        parentVertexHandle: rootRef,
        parentChildHintIndex: 0,
        childDiscoveryHint: 'child',
      },
    },
    childReferences: [],
  });
  tree.setRootVertexReference(rootRef);
  tree.setVertexRecord(rootRef, rootRecord);
  tree.setVertexRecord(childRef, childRecord);

  tree.deleteSubtree(childRef);

  expect(tree.getMutableVertexRecordOrNull(rootRef)).not.toBe(rootRecord);
  expect(tree.getDetachedChildReferenceListOrNull(rootRef)).toEqual([]);
  expect(rootRecord.getMutableChildReferenceList()).toEqual([
    childRef,
    childRef,
  ]);
  expect(
    tree
      .getLiveResolvedGraphView()
      .getVertexHandleByIdOrNull(childRef.getReferenceIdentity()),
  ).toBeNull();

  tree.setVertexRecord(childRef, childRecord);
  expect(tree.getMutableVertexRecordOrNull(childRef)).toBe(childRecord);
  expect(
    tree
      .getLiveResolvedGraphView()
      .getVertexHandleByIdOrNull(childRef.getReferenceIdentity()),
  ).toBe(createVertexHandleFacet(childRef));
});

test('an injected tree container retains its graph facade and store', () => {
  const treeDiscoverySource = {
    resolveRootVertex: () => ({ kind: 'vertexIntentionallyOmitted' as const }),
    resolveChildVertexFromHint: () => ({
      kind: 'vertexIntentionallyOmitted' as const,
    }),
  };
  const source = runnerInternals(
    new DepthFirstTreeTraversalBuilder<TestGraph>({
      treeDiscoverySource,
    }).createIndependentRunnerFromCurrentOptions(),
  ).resolvedTreesContainer;
  const injected = runnerInternals(
    createInternalDepthFirstTreeTraversal<TestGraph>({
      treeDiscoverySource,
      traversalRunnerInternalObjects: { resolvedTreesContainer: source },
    }).createIndependentRunnerFromCurrentOptions(),
  ).resolvedTreesContainer;

  expect(injected.resolvedTree).toBe(source.resolvedTree);
  expect(injected.resolvedTree.getLiveResolvedGraphView()).toBe(
    source.resolvedTree.getLiveResolvedGraphView(),
  );
  expect(getTreeGraphStore(injected.resolvedTree)).toBe(
    getTreeGraphStore(source.resolvedTree),
  );
});

test('the public tree store does not expose its graph engine capability', () => {
  const tree = new MutableResolvedTreeStore<TestGraph>();
  expect('getGraphStore' in tree).toBe(false);
});
