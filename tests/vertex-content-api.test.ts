import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  DagTraversal,
  DepthFirstTreeTraversal,
  ObjectTreeSource,
  Vertex,
  type TreeSource,
  type VertexContentInput,
  type VertexTypes,
} from '../src';

type T = VertexTypes<string | undefined, string>;

const source: TreeSource<T> = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: {
      vertexContent: { $data: 'root', $childHints: ['child'] },
    },
  }),
  resolveChild: (hint) => ({
    kind: 'found' as const,
    vertex: {
      vertexContent: { $data: hint, $childHints: [] },
    },
  }),
};

describe('canonical vertex content', () => {
  test('retains opaque data and hints and has only canonical accessors', () => {
    const data = { $d: 'opaque', $childHints: 'also opaque' };
    const hint = { marker: Symbol('hint') };
    const hints = [hint];
    const vertex = new Vertex<VertexTypes<typeof data, typeof hint>>({
      $data: data,
      $childHints: hints,
    });

    expect(vertex.getData()).toBe(data);
    expect(vertex.$data).toBe(data);
    expect('$d' in vertex).toBe(false);
    expect(vertex.getChildrenHints()).toBe(hints);
    expect(vertex.$childHints).toBe(hints);
    expect('$c' in vertex).toBe(false);
    expect(vertex.hasNoChildHints()).toBe(false);
  });

  test('copies canonical construction and copies an existing Vertex', () => {
    const legacy = new Vertex<T>({ $data: 'legacy', $childHints: ['child'] });
    const copied = new Vertex<T>(legacy);
    expect(copied.$data).toBe('legacy');
    expect(copied.$childHints).toEqual(['child']);
    expect(copied.getChildrenHints()).toBe(legacy.$childHints);
  });

  test.each(['replacement', undefined])(
    'clones an existing Vertex with replacement data %s and unchanged hint identity',
    (data) => {
      const original = new Vertex<T>({
        $data: 'original',
        $childHints: ['original-child'],
      });
      const hints = ['replacement-child'];
      const replacement = new Vertex<T>({ $data: data, $childHints: hints });
      const clone = original.clone(replacement);

      expect(clone.getData()).toBe(data);
      expect(clone.getChildrenHints()).toBe(hints);
      expect(clone).not.toBe(original);
      expect(clone).not.toBe(replacement);
      expect(original.getData()).toBe('original');
      expect(original.getChildrenHints()).toEqual(['original-child']);
    },
  );

  test('clones canonical fields with explicitly undefined data', () => {
    const vertex = new Vertex<T>({ $data: 'root', $childHints: ['child'] });
    expect(vertex.clone({ $data: undefined }).getData()).toBeUndefined();
    expect(vertex.clone({ $data: undefined }).getChildrenHints()).toEqual([
      'child',
    ]);
    expect(vertex.clone({ $childHints: [] }).hasNoChildHints()).toBe(true);
    expect(vertex.clone({}).getData()).toBe('root');
    expect(vertex.clone().getChildrenHints()).toBe(vertex.$childHints);
    expect(vertex.getData()).toBe('root');
  });

  test('keeps canonical clone updates including explicitly undefined data', () => {
    const vertex = new Vertex<T>({ $data: 'root', $childHints: ['child'] });
    expect(vertex.clone({ $data: undefined }).getData()).toBeUndefined();
    expect(vertex.clone({ $childHints: [] }).hasNoChildHints()).toBe(true);
    expect(vertex.clone({ $data: 'new', $childHints: ['next'] }).$data).toBe(
      'new',
    );
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
    const vertex = new Vertex<T>({ $data: 'root', $childHints: ['child'] });
    expect(() => vertex.clone(content as never)).toThrow(
      /canonical.*legacy|legacy.*canonical/i,
    );
    expect(vertex.getData()).toBe('root');
    expect(vertex.getChildrenHints()).toEqual(['child']);
  });

  test.each([
    ['DFS', DepthFirstTreeTraversal<T>],
    ['BFS', BreadthFirstTreeTraversal<T>],
    ['DAG tree source', DagTraversal<T>],
  ] as const)('follows canonical hints through %s', (_name, TreeTraversal) => {
    const runner = new TreeTraversal({
      traversableTree: source,
    }).createRunner();
    const data = [...runner.iterateEvents()].map(({ vertex }) =>
      vertex.getData(),
    );
    expect(data).toContain('root');
    expect(data).toContain('child');
    const tree = runner.getResolvedGraph();
    const root = tree.getRoot()!;
    const child = tree.getChildrenOf(root)![0]!;
    expect(child.getValue().getData()).toBe('child');
    expect(tree.getParentsOf(child)).toEqual([root]);
    // Resolved metadata stores child refs, whereas vertices retain source hints.
    if ('getResolvedTreeStore' in runner) {
      expect(runner.getResolvedTreeStore().get(root)!.children).toEqual([
        child,
      ]);
    }
    expect(root.getValue().$childHints).toEqual(['child']);
  });

  test.each([
    ['async DFS', AsyncDepthFirstTreeTraversal<T>],
    ['async BFS', AsyncBreadthFirstTreeTraversal<T>],
    ['async DAG tree source', AsyncDagTraversal<T>],
  ] as const)(
    'follows canonical hints through %s',
    async (_name, TreeTraversal) => {
      const runner = new TreeTraversal({
        traversableTree: source,
      }).createRunner();
      const data: Array<string | undefined> = [];
      for await (const { vertex } of runner.iterateEvents())
        data.push(vertex.getData());
      expect(data).toContain('root');
      expect(data).toContain('child');
    },
  );

  test.each([DagTraversal<T>, AsyncDagTraversal<T>])(
    'preserves arbitrary graph IDs through canonical content',
    async (TreeTraversal) => {
      const rootId = {};
      const childId = Symbol('child');
      const runner = new TreeTraversal({
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found' as const,
            vertex: {
              vertexId: rootId,
              vertexContent: { $data: 'root', $childHints: ['child'] },
            },
          }),
          resolveChild: (hint) => ({
            kind: 'found' as const,
            vertex: {
              vertexId: childId,
              vertexContent: { $data: hint, $childHints: [] },
            },
          }),
        },
      }).createRunner();
      await runner.run();
      const graph = runner.getResolvedGraph();
      expect(graph.getVertexRefById(rootId)?.getValue().getData()).toBe('root');
      expect(graph.getVertexRefById(childId)?.getValue().getData()).toBe(
        'child',
      );
    },
  );

  test('accepts canonical object-tree hook content without skipping cycle checks', () => {
    const cycle: { child?: unknown } = {};
    cycle.child = cycle;
    const tree = new ObjectTreeSource(cycle, {
      resolveVertexHook: (hint) => ({
        kind: 'found',
        vertex: { vertexContent: { $data: hint, $childHints: [] } },
      }),
    });
    expect(() =>
      new DepthFirstTreeTraversal({ traversableTree: tree })
        .createRunner()
        .run(),
    ).toThrow(/object identity cycle/i);
  });
});
