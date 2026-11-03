import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  ObjectPropertyTreeSource,
  Vertex,
  type TreeDiscoverySource,
  type VertexContentInput,
  type VertexDataAndChildHintTypes,
} from '../src';

type T = VertexDataAndChildHintTypes<string | undefined, string>;

const source: TreeDiscoverySource<T> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: {
        $vertexData: 'root',
        $childDiscoveryHints: ['child'],
      },
    },
  }),
  resolveChildVertexFromHint: (hint) => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
    },
  }),
};

describe('canonical vertex content', () => {
  test('retains opaque data and hint elements with owned hint membership', () => {
    const data = { $d: 'opaque', $childDiscoveryHints: 'also opaque' };
    const hint = { marker: Symbol('hint') };
    const hints = [hint];
    const vertex = new Vertex<
      VertexDataAndChildHintTypes<typeof data, typeof hint>
    >({
      $vertexData: data,
      $childDiscoveryHints: hints,
    });

    expect(vertex.getVertexData()).toBe(data);
    expect(vertex.$vertexData).toBe(data);
    expect('$d' in vertex).toBe(false);
    expect(vertex.getMutableChildDiscoveryHints()).not.toBe(hints);
    expect(vertex.getMutableChildDiscoveryHints()[0]).toBe(hint);
    expect(vertex.$childDiscoveryHints).toEqual(hints);
    expect('$c' in vertex).toBe(false);
    expect(vertex.hasChildDiscoveryHints()).toBe(true);
  });

  test('copies canonical construction and copies an existing Vertex', () => {
    const legacy = new Vertex<T>({
      $vertexData: 'legacy',
      $childDiscoveryHints: ['child'],
    });
    const copied = new Vertex<T>(legacy);
    expect(copied.$vertexData).toBe('legacy');
    expect(copied.$childDiscoveryHints).toEqual(['child']);
    expect(copied.getMutableChildDiscoveryHints()).not.toBe(
      legacy.$childDiscoveryHints,
    );
  });

  test.each(['replacement', undefined])(
    'clones an existing Vertex with replacement data %s and independently copied hints',
    (data) => {
      const original = new Vertex<T>({
        $vertexData: 'original',
        $childDiscoveryHints: ['original-child'],
      });
      const hints = ['replacement-child'];
      const replacement = new Vertex<T>({
        $vertexData: data,
        $childDiscoveryHints: hints,
      });
      const clone =
        original.createEditableShallowCloneWithContentOverrides(replacement);

      expect(clone.getVertexData()).toBe(data);
      expect(clone.getMutableChildDiscoveryHints()).toEqual(hints);
      expect(clone.getMutableChildDiscoveryHints()).not.toBe(
        replacement.$childDiscoveryHints,
      );
      expect(clone).not.toBe(original);
      expect(clone).not.toBe(replacement);
      expect(original.getVertexData()).toBe('original');
      expect(original.getMutableChildDiscoveryHints()).toEqual([
        'original-child',
      ]);
    },
  );

  test('clones canonical fields with explicitly undefined data', () => {
    const vertex = new Vertex<T>({
      $vertexData: 'root',
      $childDiscoveryHints: ['child'],
    });
    expect(
      vertex
        .createEditableShallowCloneWithContentOverrides({
          $vertexData: undefined,
        })
        .getVertexData(),
    ).toBeUndefined();
    expect(
      vertex
        .createEditableShallowCloneWithContentOverrides({
          $vertexData: undefined,
        })
        .getMutableChildDiscoveryHints(),
    ).toEqual(['child']);
    expect(
      vertex
        .createEditableShallowCloneWithContentOverrides({
          $childDiscoveryHints: [],
        })
        .hasChildDiscoveryHints(),
    ).toBe(false);
    expect(
      vertex.createEditableShallowCloneWithContentOverrides({}).getVertexData(),
    ).toBe('root');
    expect(
      vertex
        .createEditableShallowCloneWithContentOverrides()
        .getMutableChildDiscoveryHints(),
    ).toEqual(vertex.$childDiscoveryHints);
    expect(
      vertex
        .createEditableShallowCloneWithContentOverrides()
        .getMutableChildDiscoveryHints(),
    ).not.toBe(vertex.$childDiscoveryHints);
    expect(vertex.getVertexData()).toBe('root');
  });

  test('keeps canonical clone updates including explicitly undefined data', () => {
    const vertex = new Vertex<T>({
      $vertexData: 'root',
      $childDiscoveryHints: ['child'],
    });
    expect(
      vertex
        .createEditableShallowCloneWithContentOverrides({
          $vertexData: undefined,
        })
        .getVertexData(),
    ).toBeUndefined();
    expect(
      vertex
        .createEditableShallowCloneWithContentOverrides({
          $childDiscoveryHints: [],
        })
        .hasChildDiscoveryHints(),
    ).toBe(false);
    expect(
      vertex.createEditableShallowCloneWithContentOverrides({
        $vertexData: 'new',
        $childDiscoveryHints: ['next'],
      }).$vertexData,
    ).toBe('new');
  });

  test.each([
    { $vertexData: 'root', $childDiscoveryHints: [], $d: 'root' },
    { $vertexData: 'root', $childDiscoveryHints: [], $c: [] },
    { $d: 'root', $c: [], $vertexData: undefined },
    { $d: 'root', $c: [], $childDiscoveryHints: [] },
    { $vertexData: 'root', $c: [] },
    { $d: 'root', $childDiscoveryHints: [] },
  ])('rejects mixed construction shapes %#', (content) => {
    expect(
      () => new Vertex<T>(content as unknown as VertexContentInput<T>),
    ).toThrow(/canonical.*legacy|legacy.*canonical/i);
  });

  test.each([
    { $vertexData: undefined, $d: undefined },
    { $vertexData: 'new', $c: [] },
    { $childDiscoveryHints: [], $d: 'new' },
    { $childDiscoveryHints: [], $c: [] },
  ])('rejects mixed clone shapes %#', (content) => {
    const vertex = new Vertex<T>({
      $vertexData: 'root',
      $childDiscoveryHints: ['child'],
    });
    expect(() =>
      vertex.createEditableShallowCloneWithContentOverrides(content as never),
    ).toThrow(/canonical.*legacy|legacy.*canonical/i);
    expect(vertex.getVertexData()).toBe('root');
    expect(vertex.getMutableChildDiscoveryHints()).toEqual(['child']);
  });

  test.each([
    ['DFS', DepthFirstTreeTraversalBuilder<T>],
    ['BFS', BreadthFirstTreeTraversalBuilder<T>],
    ['DAG tree source', DagTraversalBuilder<T>],
  ] as const)('follows canonical hints through %s', (_name, TreeTraversal) => {
    const runner = new TreeTraversal({
      treeDiscoverySource: source,
    }).createIndependentRunnerFromCurrentOptions();
    const data = [
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ].map(({ vertex }) => vertex.getVertexData());
    expect(data).toContain('root');
    expect(data).toContain('child');
    const tree = runner.getLiveResolvedGraphView();
    const root = tree.getDesignatedRootHandleOrNull()!;
    const child = tree.getStructuralChildHandlesInSlotOrderOrNull(root)![0]!;
    expect(child.getCurrentVertexView().getVertexData()).toBe('child');
    expect(tree.getDistinctStructuralParentHandlesOrNull(child)).toEqual([
      root,
    ]);
    // Resolved metadata stores child refs, whereas vertices retain source hints.
    if ('getLiveResolvedTreeView' in runner) {
      expect(
        runner.getLiveResolvedTreeView()!.getChildVertexHandlesOrNull(root),
      ).toEqual([child]);
    }
    expect(root.getCurrentVertexView().$childDiscoveryHints).toEqual(['child']);
  });

  test.each([
    ['async DFS', AsyncDepthFirstTreeTraversalBuilder<T>],
    ['async BFS', AsyncBreadthFirstTreeTraversalBuilder<T>],
    ['async DAG tree source', AsyncDagTraversalBuilder<T>],
  ] as const)(
    'follows canonical hints through %s',
    async (_name, TreeTraversal) => {
      const runner = new TreeTraversal({
        treeDiscoverySource: source,
      }).createIndependentRunnerFromCurrentOptions();
      const data: Array<string | undefined> = [];
      for await (const {
        vertex,
      } of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
        data.push(vertex.getVertexData());
      expect(data).toContain('root');
      expect(data).toContain('child');
    },
  );

  test.each([DagTraversalBuilder<T>, AsyncDagTraversalBuilder<T>])(
    'preserves arbitrary graph IDs through canonical content',
    async (TreeTraversal) => {
      const rootId = {};
      const childId = Symbol('child');
      const runner = new TreeTraversal({
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: rootId,
              vertexContentInput: {
                $vertexData: 'root',
                $childDiscoveryHints: ['child'],
              },
            },
          }),
          resolveChildHint: (hint) => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: childId,
              vertexContentInput: {
                $vertexData: hint,
                $childDiscoveryHints: [],
              },
            },
          }),
        },
      }).createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      const graph = runner.getLiveResolvedGraphView();
      expect(
        graph
          .getVertexHandleByIdOrNull(rootId)
          ?.getCurrentVertexView()
          .getVertexData(),
      ).toBe('root');
      expect(
        graph
          .getVertexHandleByIdOrNull(childId)
          ?.getCurrentVertexView()
          .getVertexData(),
      ).toBe('child');
    },
  );

  test('accepts canonical object-tree hook content without skipping cycle checks', () => {
    const cycle: { child?: unknown } = {};
    cycle.child = cycle;
    const tree = new ObjectPropertyTreeSource(cycle, {
      resolveChildPropertyOrUseDefault: (hint) => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
        },
      }),
    });
    expect(() =>
      new DepthFirstTreeTraversalBuilder({ treeDiscoverySource: tree })
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    ).toThrow(/object identity cycle/i);
  });
});
