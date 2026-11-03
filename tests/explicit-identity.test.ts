import { createVertexHandleFacet } from '../src/core/observationFacets';
import {
  MutableValueReference,
  core,
  MutableResolvedTreeStore,
  Vertex,
  MutableTreeVertexTopologyRecord,
  type VertexDataAndChildHintTypes,
} from '../src';
import { MutableValueReference as CoreRef } from '../src/core';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';

type T = VertexDataAndChildHintTypes<string, string>;
const makeRef = (data: string) =>
  new MutableValueReference(
    new Vertex<T>({ $vertexData: data, $childDiscoveryHints: [] }),
  );

test('reference UUID names share the public constructor and remain stable after retargeting', () => {
  expect(MutableValueReference).toBe(core.MutableValueReference);
  expect(MutableValueReference).toBe(CoreRef);
  const ref = makeRef('before');
  const id = ref.getReferenceIdentity();
  ref.replaceReferencedValue(
    new Vertex<T>({ $vertexData: 'after', $childDiscoveryHints: [] }),
  );
  expect(ref.getReferenceIdentity()).toBe(id);
  expect(ref.getReferenceIdentity()).toBe(id);
  expect(makeRef('other').getReferenceIdentity()).not.toBe(id);
});

test('tree-generated vertex identities equal their reference UUIDs', () => {
  const tree = new MutableResolvedTreeStore<T>();
  const root = makeRef('root');
  tree.setVertexRecord(
    root,
    new MutableTreeVertexTopologyRecord<T>({
      metadata: { childDiscoveryContext: null },
      childReferences: [],
    }),
  );
  const graph = tree.getLiveResolvedGraphView();
  expect(graph.requireVertexId(createVertexHandleFacet(root))).toBe(
    root.getReferenceIdentity(),
  );
  expect(graph.requireVertexId(createVertexHandleFacet(root))).toBe(
    root.getReferenceIdentity(),
  );
  expect(graph.getVertexHandleByIdOrNull(root.getReferenceIdentity())).toBe(
    createVertexHandleFacet(root),
  );
  expect(graph.getVertexHandleByIdOrNull(root.getReferenceIdentity())).toBe(
    createVertexHandleFacet(root),
  );
});

for (const syntheticRoot of [false, true]) {
  test.each(['host-id', undefined, {}, Symbol('host-id')])(
    `identity aliases preserve arbitrary IDs in active/saved graph facades (syntheticRoot=${syntheticRoot}, %p)`,
    (id) => {
      const container = new ResolvedGraphsContainer<T>({
        sourceMode: 'graph',
        syntheticRoot,
        saveOriginal: true,
      });
      const root = makeRef('root');
      const child = makeRef('child');
      const hiddenId = Symbol('root');
      container.acceptRoot(root, hiddenId);
      container.acceptVertex(child, id, [], {
        parentVertexHandle: root,
        parentVertexAtChildResolution: root.getReferencedValue(),
        discoveryDepthInEdges: 1,
        parentChildHintIndex: 0,
        childDiscoveryHint: 'child',
      });
      const saved = container.preCommandDiscoveredGraphView!;
      const savedChild = container.originalGraphRefsMap!.get(child)!;
      for (const [graph, expectedRef] of [
        [container.publicResolvedGraph, createVertexHandleFacet(child)],
        [saved, createVertexHandleFacet(savedChild)],
      ] as const) {
        expect(graph.getVertexHandleByIdOrNull(id)).toBe(expectedRef);
        expect(graph.getVertexHandleByIdOrNull(id)).toBe(expectedRef);
        expect(graph.requireVertexId(expectedRef)).toBe(id);
        expect(graph.requireVertexId(expectedRef)).toBe(id);
        expect(graph.requireVertexId(expectedRef)).not.toBe(
          expectedRef.getReferenceIdentity(),
        );
        expect(graph.getVertexHandleByIdOrNull({})).toBeNull();
        expect(graph.getVertexHandleByIdOrNull({})).toBeNull();
        const unknown = makeRef('unknown');
        expect(() =>
          graph.requireVertexId(createVertexHandleFacet(unknown)),
        ).toThrow('Unknown vertex reference');
        expect(() =>
          graph.requireVertexId(createVertexHandleFacet(unknown)),
        ).toThrow('Unknown vertex reference');
      }
      if (syntheticRoot) {
        expect(
          container.publicResolvedGraph.getVertexHandleByIdOrNull(hiddenId),
        ).toBeNull();
        expect(
          container.publicResolvedGraph.getVertexHandleByIdOrNull(hiddenId),
        ).toBeNull();
        expect(() =>
          container.publicResolvedGraph.requireVertexId(
            createVertexHandleFacet(root),
          ),
        ).toThrow('Unknown vertex reference');
        expect(() =>
          container.publicResolvedGraph.requireVertexId(
            createVertexHandleFacet(root),
          ),
        ).toThrow('Unknown vertex reference');
      }
    },
  );
}
