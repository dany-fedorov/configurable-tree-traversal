import {
  AsyncBreadthFirstTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTraversal,
  BreadthFirstTraversal,
  DagTraversal,
  DepthFirstTraversal,
  TraversableObjectTree,
  Vertex,
  type TraversableTree,
  type TreeTypeParameters,
  type VertexContentInput,
} from '../src';

type T = TreeTypeParameters<string | undefined, string>;

const source: TraversableTree<T> = {
  makeRoot: () => ({
    vertexContent: { $data: 'root', $childHints: ['child'] },
  }),
  makeVertex: (hint) => ({
    vertexContent: { $data: hint, $childHints: [] },
  }),
};

describe('canonical vertex content', () => {
  test('retains opaque data and hints while exposing legacy access aliases', () => {
    const data = { $d: 'opaque', $childHints: 'also opaque' };
    const hint = { marker: Symbol('hint') };
    const hints = [hint];
    const vertex = new Vertex<TreeTypeParameters<typeof data, typeof hint>>({
      $data: data,
      $childHints: hints,
    });

    expect(vertex.getData()).toBe(data);
    expect(vertex.$data).toBe(data);
    expect(vertex.$d).toBe(data);
    expect(vertex.getChildrenHints()).toBe(hints);
    expect(vertex.$childHints).toBe(hints);
    expect(vertex.$c).toBe(hints);
    expect(vertex.isLeafVertex()).toBe(false);
  });

  test('normalizes legacy construction and copies an existing Vertex', () => {
    const legacy = new Vertex<T>({ $d: 'legacy', $c: ['child'] });
    const copied = new Vertex<T>(legacy);
    expect(copied.$data).toBe('legacy');
    expect(copied.$childHints).toEqual(['child']);
    expect(copied.getChildrenHints()).toBe(legacy.$c);
  });

  test('clones canonical fields with explicitly undefined data', () => {
    const vertex = new Vertex<T>({ $data: 'root', $childHints: ['child'] });
    expect(vertex.clone({ $data: undefined }).getData()).toBeUndefined();
    expect(vertex.clone({ $data: undefined }).getChildrenHints()).toEqual([
      'child',
    ]);
    expect(vertex.clone({ $childHints: [] }).isLeafVertex()).toBe(true);
    expect(vertex.clone({}).getData()).toBe('root');
    expect(vertex.clone().getChildrenHints()).toBe(vertex.$childHints);
    expect(vertex.getData()).toBe('root');
  });

  test('keeps legacy clone updates including explicitly undefined data', () => {
    const vertex = new Vertex<T>({ $d: 'root', $c: ['child'] });
    expect(vertex.clone({ $d: undefined }).getData()).toBeUndefined();
    expect(vertex.clone({ $c: [] }).isLeafVertex()).toBe(true);
    expect(vertex.clone({ $d: 'new', $c: ['next'] }).$data).toBe('new');
  });

  test.each([
    { $data: 'root', $childHints: [], $d: 'root' },
    { $data: 'root', $childHints: [], $c: [] },
    { $d: 'root', $c: [], $data: undefined },
    { $d: 'root', $c: [], $childHints: [] },
    { $data: 'root', $c: [] },
    { $d: 'root', $childHints: [] },
  ])('rejects mixed construction shapes %#', (content) => {
    expect(
      () => new Vertex<T>(content as unknown as VertexContentInput<T>),
    ).toThrow(/canonical.*legacy|legacy.*canonical/i);
  });

  test.each([
    { $data: undefined, $d: undefined },
    { $data: 'new', $c: [] },
    { $childHints: [], $d: 'new' },
    { $childHints: [], $c: [] },
  ])('rejects mixed clone shapes %#', (content) => {
    const vertex = new Vertex<T>({ $d: 'root', $c: ['child'] });
    expect(() => vertex.clone(content as never)).toThrow(
      /canonical.*legacy|legacy.*canonical/i,
    );
    expect(vertex.getData()).toBe('root');
    expect(vertex.getChildrenHints()).toEqual(['child']);
  });

  test.each([
    ['DFS', DepthFirstTraversal],
    ['BFS', BreadthFirstTraversal],
    ['DAG tree source', DagTraversal],
  ] as const)('follows canonical hints through %s', (_name, Traversal) => {
    const runner = new Traversal<T>({ traversableTree: source }).makeRunner();
    const data = [...runner.getIterable()].map(({ vertex }) =>
      vertex.getData(),
    );
    expect(data).toContain('root');
    expect(data).toContain('child');
    const tree = runner.getResolvedGraph();
    const root = tree.getRoot()!;
    const child = tree.getChildrenOf(root)![0]!;
    expect(child.unref().getData()).toBe('child');
    expect(tree.getParentsOf(child)).toEqual([root]);
    // Resolved metadata stores child refs, whereas vertices retain source hints.
    if ('getResolvedTree' in runner) {
      expect(runner.getResolvedTree().get(root)!.$c).toEqual([child]);
    }
    expect(root.unref().$childHints).toEqual(['child']);
  });

  test.each([
    ['async DFS', AsyncDepthFirstTraversal],
    ['async BFS', AsyncBreadthFirstTraversal],
    ['async DAG tree source', AsyncDagTraversal],
  ] as const)(
    'follows canonical hints through %s',
    async (_name, Traversal) => {
      const runner = new Traversal<T>({ traversableTree: source }).makeRunner();
      const data: Array<string | undefined> = [];
      for await (const { vertex } of runner.getIterable())
        data.push(vertex.getData());
      expect(data).toContain('root');
      expect(data).toContain('child');
    },
  );

  test.each([DagTraversal, AsyncDagTraversal])(
    'preserves arbitrary graph IDs through canonical content',
    async (Traversal) => {
      const rootId = {};
      const childId = Symbol('child');
      const runner = new Traversal<T>({
        traversableGraph: {
          makeRoot: () => ({ vertexId: rootId, ...source.makeRoot() }),
          makeVertex: (hint) => ({
            vertexId: childId,
            vertexContent: { $data: hint, $childHints: [] },
          }),
        },
      }).makeRunner();
      await runner.run();
      const graph = runner.getResolvedGraph();
      expect(graph.getVertexById(rootId)?.unref().getData()).toBe('root');
      expect(graph.getVertexById(childId)?.unref().getData()).toBe('child');
    },
  );

  test('accepts canonical object-tree hook content without skipping cycle checks', () => {
    const cycle: { child?: unknown } = {};
    cycle.child = cycle;
    const tree = new TraversableObjectTree(cycle, {
      makeVertexHook: (hint) => ({
        returnMe: { $data: hint, $childHints: [] },
      }),
    });
    expect(() =>
      new DepthFirstTraversal({ traversableTree: tree }).makeRunner().run(),
    ).toThrow(/object identity cycle/i);
  });
});
