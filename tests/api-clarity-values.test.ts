import {
  MutableRef,
  AsyncDepthFirstTreeTraversal,
  AsyncBreadthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  DepthFirstTreeTraversal,
  DepthFirstPhase,
  BreadthFirstPhase,
  type ResolvedTreeView,
  type TreeVisitorContext,
  type Vertex,
  type VertexTypes,
  AsyncDagTraversal,
  DagTraversal,
  DagVisitorPhase,
  TreeVertexRecord,
  Vertex as VertexValue,
  type OriginalGraphView,
} from '../src';

test('mutable handles preserve reference identity when their value changes', () => {
  const ref = new MutableRef({ value: 1 });
  const id = ref.getRefId();
  ref.setValue({ value: 2 });
  expect(ref.getValue()).toEqual({ value: 2 });
  expect(ref.getRefId()).toBe(id);
});

type RetainedTree = VertexTypes<{ count: number }, string>;
for (const Constructor of [
  DepthFirstTreeTraversal<RetainedTree>,
  AsyncDepthFirstTreeTraversal<RetainedTree>,
  BreadthFirstTreeTraversal<RetainedTree>,
  AsyncBreadthFirstTreeTraversal<RetainedTree>,
]) {
  test(`${Constructor.name} exposes progressive original structure with shared payloads`, async () => {
    const data = { count: 1 };
    let retained: ResolvedTreeView<RetainedTree> | null = null;
    const sizes: number[] = [];
    const visit = (
      _vertex: Vertex<RetainedTree>,
      context: TreeVisitorContext<string, RetainedTree, RetainedTree>,
    ) => {
      retained = context.originalTreeView;
      expect(retained).not.toHaveProperty('set');
      const root = retained!.getRoot()!;
      expect(root.getValue().getData()).toBe(data);
      sizes.push(retained!.getChildrenOf(root)!.length);
      const children = retained!.getChildrenOf(root)!;
      (children as unknown[]).length = 0;
    };
    const visitors = {
      [DepthFirstPhase.PRE_ORDER]: visit,
      [BreadthFirstPhase.LEVEL_ORDER]: visit,
    };
    const runner = new Constructor({
      traversableTree: {
        resolveRoot: () => ({
          vertexContent: { $data: data, $childHints: ['child'] },
        }),
        resolveChild: (_hint, context) => {
          expect(context.originalTreeView).toBe(retained);
          expect(context.originalTreeView).not.toHaveProperty('set');
          return { vertexContent: { $data: { count: 2 }, $childHints: [] } };
        },
      },
      retainOriginalTreeStructure: true,
      visitors,
    }).createRunner();
    await runner.run();
    expect(sizes).toEqual([0, 1]);
    const view = retained! as ResolvedTreeView<RetainedTree>;
    expect(view.getChildrenOf(view.getRoot()!)).toHaveLength(1);
    data.count = 9;
    expect(view.getRoot()!.getValue().getData().count).toBe(9);
  });
}

test('tree records own metadata and children independently of Vertex content aliases', () => {
  const metadata = { resolutionContext: null };
  const children: MutableRef<Vertex<RetainedTree>>[] = [];
  const record = new TreeVertexRecord<RetainedTree>({ metadata, children });
  expect(Object.keys(record)).toEqual(['metadata', 'children']);
  expect(record.metadata).toBe(metadata);
  expect(record.children).toBe(children);
  const child = new MutableRef(
    new VertexValue<RetainedTree>({ $d: { count: 2 }, $c: [] }),
  );
  record.pushChildren([child]);
  expect(record.getChildren()).toEqual([child]);
  const clone = record.clone();
  expect(clone.metadata).not.toBe(metadata);
  expect(clone.children).not.toBe(children);
  expect(clone.children[0]).toBe(child);
});

for (const Constructor of [
  DagTraversal<RetainedTree>,
  AsyncDagTraversal<RetainedTree>,
]) {
  test(`${Constructor.name} retains progressively discovered original graph structure`, async () => {
    const data = { count: 1 };
    let retained: OriginalGraphView<RetainedTree> | null = null;
    const sizes: number[] = [];
    const runner = new Constructor({
      traversableGraph: {
        resolveRoot: () => ({
          vertexId: 'root',
          vertexContent: { $data: data, $childHints: ['child'] },
        }),
        resolveChild: (_hint, context) => {
          expect(context.originalGraphView).toBe(retained);
          expect(retained!.getVertexRefs()).toHaveLength(1);
          return {
            vertexId: 'child',
            vertexContent: { $data: { count: 2 }, $childHints: [] },
          };
        },
      },
      retainOriginalGraphStructure: true,
      visitors: {
        [DagVisitorPhase.ON_WORK_READY]: (_vertex, context) => {
          retained = context.originalGraphView;
          sizes.push(retained!.getVertexRefs().length);
          expect(retained!.getVertexRefById('root')!.getValue().getData()).toBe(
            data,
          );
          retained!.getVertexRefs().length = 0;
        },
      },
    }).createRunner();
    await runner.run();
    expect(sizes).toEqual([1, 2]);
    const view = retained! as OriginalGraphView<RetainedTree>;
    const root = view.getVertexRefById('root')!;
    expect(view.getChildrenOf(root)).toHaveLength(1);
    view.getChildrenOf(root)!.length = 0;
    expect(view.getChildrenOf(root)).toHaveLength(1);
    data.count = 9;
    expect(root.getValue().getData().count).toBe(9);
  });
}
