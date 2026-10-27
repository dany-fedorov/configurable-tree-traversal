import {
  MutableRef,
  core,
  ResolvedTreeStore,
  Vertex,
  TreeVertexRecord,
  type VertexTypes,
} from '../src';
import { MutableRef as CoreRef } from '../src/core';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';

type T = VertexTypes<string, string>;
const makeRef = (data: string) =>
  new MutableRef(new Vertex<T>({ $data: data, $childHints: [] }));

test('reference UUID names share the public constructor and remain stable after retargeting', () => {
  expect(MutableRef).toBe(core.MutableRef);
  expect(MutableRef).toBe(CoreRef);
  const ref = makeRef('before');
  const id = ref.getRefId();
  ref.setValue(new Vertex<T>({ $data: 'after', $childHints: [] }));
  expect(ref.getRefId()).toBe(id);
  expect(ref.getRefId()).toBe(id);
  expect(makeRef('other').getRefId()).not.toBe(id);
});

test('tree-generated vertex identities equal their reference UUIDs', () => {
  const tree = new ResolvedTreeStore<T>();
  const root = makeRef('root');
  tree.set(
    root,
    new TreeVertexRecord<T>({
      metadata: { resolutionContext: null },
      children: [],
    }),
  );
  const graph = tree.getResolvedGraph();
  expect(graph.getVertexId(root)).toBe(root.getRefId());
  expect(graph.getVertexId(root)).toBe(root.getRefId());
  expect(graph.getVertexRefById(root.getRefId())).toBe(root);
  expect(graph.getVertexRefById(root.getRefId())).toBe(root);
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
        parentVertexRef: root,
        parentVertex: root.getValue(),
        depth: 1,
        hintIndex: 0,
        vertexHint: 'child',
      });
      const saved = container.originalGraphView!;
      const savedChild = container.originalGraphRefsMap!.get(child)!;
      for (const [graph, expectedRef] of [
        [container.resolvedGraph, child],
        [container.publicResolvedGraph, child],
        [saved, savedChild],
      ] as const) {
        expect(graph.getVertexRefById(id)).toBe(expectedRef);
        expect(graph.getVertexRefById(id)).toBe(expectedRef);
        expect(graph.getVertexId(expectedRef)).toBe(id);
        expect(graph.getVertexId(expectedRef)).toBe(id);
        expect(graph.getVertexId(expectedRef)).not.toBe(expectedRef.getRefId());
        expect(graph.getVertexRefById({})).toBeNull();
        expect(graph.getVertexRefById({})).toBeNull();
        const unknown = makeRef('unknown');
        expect(() => graph.getVertexId(unknown)).toThrow(
          'Unknown vertex reference',
        );
        expect(() => graph.getVertexId(unknown)).toThrow(
          'Unknown vertex reference',
        );
      }
      if (syntheticRoot) {
        expect(
          container.publicResolvedGraph.getVertexRefById(hiddenId),
        ).toBeNull();
        expect(
          container.publicResolvedGraph.getVertexRefById(hiddenId),
        ).toBeNull();
        expect(() => container.publicResolvedGraph.getVertexId(root)).toThrow(
          'Unknown vertex reference',
        );
        expect(() => container.publicResolvedGraph.getVertexId(root)).toThrow(
          'Unknown vertex reference',
        );
      }
    },
  );
}
