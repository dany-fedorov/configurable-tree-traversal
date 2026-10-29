import {
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  DagTraversal,
  DepthFirstTreeTraversal,
  DepthFirstPhase,
  MutableRef,
  ObjectTreeSource,
  ResolvedTreeStore,
  TreeVertexRecord,
  Vertex,
  type GetPathToOptions,
  type VertexTypes,
} from '../src';

type Query = (options?: GetPathToOptions) => unknown;
function verifyQuery(query: Query) {
  const defaultPath = query();
  expect(query({})).toEqual(defaultPath);
  expect(query({ noRoot: undefined, noSelf: undefined })).toEqual(defaultPath);
  for (const key of ['noRot', Symbol('noSelf')]) {
    expect(() =>
      query(Object.defineProperty({}, key, { value: true }) as never),
    ).toThrow(TypeError);
  }
  for (const value of [null, 1, 'yes'])
    expect(() => query({ noRoot: value } as never)).toThrow(TypeError);
  expect(() => query({ noSelf: null } as never)).toThrow(TypeError);
  expect(() => query(null as never)).toThrow(TypeError);
  let reads = 0;
  query({
    get noRoot() {
      reads++;
      return true;
    },
  });
  expect(reads).toBe(1);
}

for (const create of [
  () =>
    new DepthFirstTreeTraversal({
      traversableTree: new ObjectTreeSource({ a: 1 }),
      retainOriginalTreeStructure: true,
    }),
  () =>
    new AsyncDepthFirstTreeTraversal({
      traversableTree: new ObjectTreeSource({ a: 1 }),
      retainOriginalTreeStructure: true,
    }),
])
  test('tree live and original path option bags are strict and detached', async () => {
    const traversal = create();
    traversal.addVisitorFor(DepthFirstPhase.POST_ORDER, (_vertex, context) => {
      const view = context.originalTreeView!;
      verifyQuery((options) => view.getPathTo(view.getRoot()!, options));
    });
    const runner = traversal.createRunner();
    await runner.run();
    for (const view of [runner.getResolvedTreeView()]) {
      const root = view.getRoot()!;
      verifyQuery((options) => view.getPathTo(root, options));
      expect(view.getPathTo(root, { noRoot: true, noSelf: true })).toEqual([]);
    }
  });

const id = { opaque: true };
const graph = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: { vertexId: id, vertexContent: { $data: id, $childHints: [] } },
  }),
  resolveChild: () => ({
    kind: 'omitted' as const,
    satisfiesDependencies: true as const,
  }),
};
for (const create of [
  () =>
    new DagTraversal({
      traversableGraph: graph,
      retainOriginalGraphStructure: true,
    }).createRunner(),
  () =>
    new AsyncDagTraversal({
      traversableGraph: graph,
      retainOriginalGraphStructure: true,
    }).createRunner(),
])
  test('graph live and original path options reject unknown fields and retain opaque IDs', async () => {
    const runner = create();
    await runner.run();
    for (const view of [
      runner.getResolvedGraphView(),
      runner.originalGraphView!,
    ]) {
      const root = view.getRoot()!;
      verifyQuery((options) => view.getPathsTo(root, options));
      expect(view.getVertexId(root)).toBe(id);
      expect(view.getPathsTo(root, { noRoot: true, noSelf: true })).toEqual([
        [],
      ]);
    }
  });

test('explicit tree store and its graph route share strict path option semantics', () => {
  type T = VertexTypes<number, never>;
  const root = new MutableRef(new Vertex<T>({ $data: 1, $childHints: [] }));
  const store = new ResolvedTreeStore<T>();
  store.set(
    root,
    new TreeVertexRecord<T>({
      metadata: { resolutionContext: null },
      children: [],
    }),
  );
  store.setRoot(root);
  verifyQuery((options) => store.getPathTo(root, options));
  verifyQuery((options) =>
    store.getResolvedGraphView().getPathsTo(root, options),
  );
});

test('graph query controls read accessors once across multiple paths', () => {
  type T = VertexTypes<string, string>;
  const data: Record<string, string[]> = {
    root: ['left', 'right'],
    left: ['leaf'],
    right: ['leaf'],
    leaf: [],
  };
  const found = (vertexId: string) => ({
    kind: 'found' as const,
    vertex: {
      vertexId,
      vertexContent: { $data: vertexId, $childHints: data[vertexId]! },
    },
  });
  const runner = new DagTraversal<T, T, string>({
    retainOriginalGraphStructure: true,
    traversableGraph: {
      resolveRoot: () => found('root'),
      resolveChild: (hint) => found(hint),
      getVertexIdFromHint: (vertexId) => ({ vertexId }),
    },
  })
    .createRunner()
    .run();
  for (const view of [
    runner.getResolvedGraphView(),
    runner.originalGraphView!,
  ]) {
    const leaf = view.getVertexRefById('leaf')!;
    let rootReads = 0;
    let selfReads = 0;
    const paths = view.getPathsTo(leaf, {
      get noRoot() {
        rootReads++;
        return true;
      },
      get noSelf() {
        selfReads++;
        return true;
      },
    });
    expect(
      paths.map((path) => path.map((ref) => view.getVertexId(ref))),
    ).toEqual([['left'], ['right']]);
    expect([rootReads, selfReads]).toEqual([1, 1]);
  }
});
