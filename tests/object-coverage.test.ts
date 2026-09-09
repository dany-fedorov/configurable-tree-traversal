import {
  CTTRef,
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
  ResolvedTree,
  TraversalVisitorCommandName,
  TraversalVisitorFunctionResolutionStyle,
  Vertex,
  VertexResolved,
  TraversableObjectTree,
  rewriteObject as rewriteObjectApi,
  type TraversableObjectTTP,
  type TraversalVisitorInputOptions,
} from '../src';

const { rewriteObject } = rewriteObjectApi;

type ObjectTree = TraversableObjectTTP<PropertyKey, unknown>;

describe('rewrite object option integration', () => {
  test('stores assembled composites and exposes the rewritten leaf path', () => {
    const assembled = new Map();
    const leafPaths: PropertyKey[][] = [];

    const { outputObject } = rewriteObject(
      { nested: [1] },
      {
        assembledMap: assembled,
        assembleCompositesBeforeRewrite: true,
        rewrite: ({ value }, { getKeyPath }) => {
          if (value === 1) {
            leafPaths.push(getKeyPath({ noRoot: true }));
            return { rewrite: { value: 2 } };
          }
          return undefined;
        },
      },
    );

    expect(outputObject).toEqual({ nested: [2] });
    expect(leafPaths).toEqual([['nested', 0]]);
    expect([...assembled.values()]).toEqual([[2], { nested: [2] }]);
  });

  test('custom isArray classification reconstructs a numeric-key object as an array', () => {
    const input = { 0: 1, 1: 2 };

    const { outputObject } = rewriteObject(input, {
      isArray: ({ value }) => value === input,
    });

    expect(Array.isArray(outputObject)).toBe(true);
    expect(outputObject).toEqual([1, 2]);
    expect(Array.isArray(input)).toBe(false);
  });

  test('forwards in-order positions to configured visitors', () => {
    const inOrder: PropertyKey[] = [];

    rewriteObject(
      { a: 1, b: 2, c: 3 },
      {
        inOrderTraversalConfig: { visitParentAfterChildren: 2 },
        visitors: {
          [DepthFirstTraversalOrder.IN_ORDER]: [
            {
              addedIndex: 0,
              priority: 100,
              resolutionStyle:
                TraversalVisitorFunctionResolutionStyle.SEQUENTIAL,
              visitor: (vertex, { isTreeRoot }) => {
                inOrder.push(isTreeRoot ? 'root' : vertex.getData().key);
              },
            },
          ],
        },
      },
    );

    expect(inOrder).toEqual(['a', 'b', 'c', 'root']);
  });

  test('uses and advances an injected empty runner state', () => {
    const injectedState = new DepthFirstTraversal({
      traversableTree: new TraversableObjectTree({ value: 1 }),
    }).makeRunner().state;
    injectedState.visitorsState[
      DepthFirstTraversalOrder.POST_ORDER
    ].vertexVisitIndex = 40;
    const seenIndices: number[] = [];

    rewriteObject(
      { value: 1 },
      {
        traversalRunnerInternalObjects: { state: injectedState },
        rewrite: (_property, { vertexVisitIndex }) => {
          seenIndices.push(vertexVisitIndex);
          return undefined;
        },
      },
    );

    expect(seenIndices).toEqual([40, 41]);
    expect(
      injectedState.visitorsState[DepthFirstTraversalOrder.POST_ORDER]
        .vertexVisitIndex,
    ).toBe(42);
  });
});

describe('object identity bookkeeping', () => {
  const makeObjectVertex = (key: PropertyKey, value: unknown) =>
    new Vertex<ObjectTree>({ $d: { key, value }, $c: [] });

  test('keeps the original non-root identity after pre-order data rewriting', () => {
    const branch: { self?: unknown } = {};
    branch.self = branch;
    const traversal = new DepthFirstTraversal({
      traversableTree: new TraversableObjectTree({ branch }),
    });
    traversal.addVisitorFor(
      DepthFirstTraversalOrder.PRE_ORDER,
      (vertex, { isTreeRoot }) => {
        if (!isTreeRoot && vertex.getData().key === 'branch') {
          return {
            commands: [
              {
                commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
                commandArguments: {
                  newData: {
                    key: 'branch',
                    value: { replacement: true },
                  },
                },
              },
            ],
          };
        }
        return undefined;
      },
    );

    expect(() => traversal.makeRunner().run()).toThrow(
      /cycle.*\$\.branch\.self.*ancestor at \$\.branch/i,
    );
  });

  test('a rewritten root keeps its original child hints after data rewriting', () => {
    const visited: PropertyKey[] = [];
    const traversal = new DepthFirstTraversal({
      traversableTree: new TraversableObjectTree({ child: 1 }),
    });
    traversal.addVisitorFor(
      DepthFirstTraversalOrder.PRE_ORDER,
      (vertex, { isTreeRoot }) => {
        if (isTreeRoot) {
          return {
            commands: [
              {
                commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
                commandArguments: {
                  newData: { key: 'root', value: { replacement: true } },
                },
              },
            ],
          };
        }
        visited.push(vertex.getData().key);
        return undefined;
      },
    );

    traversal.makeRunner().run();

    expect(visited).toEqual(['child']);
  });

  test('hook-supplied primitive parents with explicit children do not create false cycles', () => {
    const visited: PropertyKey[] = [];
    const traversal = new DepthFirstTraversal({
      traversableTree: new TraversableObjectTree(
        { custom: { ignored: true } },
        {
          makeVertexHook: (hint) =>
            hint.key === 'custom'
              ? {
                  returnMe: {
                    $d: { key: 'custom', value: 0 },
                    $c: [
                      { key: 'first', value: 1 },
                      { key: 'second', value: 2 },
                    ],
                  },
                }
              : {},
        },
      ),
    });
    traversal.addVisitorFor(
      DepthFirstTraversalOrder.PRE_ORDER,
      (vertex, { isTreeRoot }) => {
        if (!isTreeRoot) visited.push(vertex.getData().key);
      },
    );

    expect(() => traversal.makeRunner().run()).not.toThrow();
    expect(visited).toEqual(['custom', 'first', 'second']);
  });

  test('uses a pre-populated resolution context to retain the parent identity', () => {
    const originalBranch: Record<string, unknown> = {};
    originalBranch['self'] = originalBranch;
    const rootVertex = makeObjectVertex('global', { branch: originalBranch });
    const rootRef = new CTTRef(rootVertex);
    const parentVertex = makeObjectVertex('branch', { replacement: true });
    const parentRef = new CTTRef(parentVertex);
    const resolvedTree = new ResolvedTree<ObjectTree>();
    resolvedTree.setRoot(rootRef);
    resolvedTree.set(
      rootRef,
      new VertexResolved({
        $d: { resolutionContext: null },
        $c: [parentRef],
      }),
    );
    const parentContext = {
      depth: 1,
      hintIndex: 0,
      parentVertex: rootVertex,
      parentVertexRef: rootRef,
      vertexHint: { key: 'branch', value: originalBranch },
    };
    resolvedTree.set(
      parentRef,
      new VertexResolved({
        $d: { resolutionContext: parentContext },
        $c: [],
      }),
    );
    const childHint = { key: 'self', value: originalBranch };
    const adapter = new TraversableObjectTree<
      Record<PropertyKey, unknown>,
      PropertyKey,
      unknown
    >({});

    expect(() =>
      adapter.makeVertex(childHint, {
        resolvedTree,
        notMutatedResolvedTree: null,
        resolutionContext: {
          depth: 2,
          hintIndex: 0,
          parentVertex,
          parentVertexRef: parentRef,
          vertexHint: childHint,
        },
      }),
    ).toThrow(/cycle.*\$\.branch\.self.*ancestor at \$\.branch/i);
  });

  test('formats a detached null-context traversal root from its vertex data', () => {
    const globalRoot = makeObjectVertex('global', {});
    const globalRootRef = new CTTRef(globalRoot);
    const detachedValue = {};
    const detachedVertex = makeObjectVertex('detached', detachedValue);
    const detachedRef = new CTTRef(detachedVertex);
    const resolvedTree = new ResolvedTree<ObjectTree>();
    resolvedTree.setRoot(globalRootRef);
    resolvedTree.set(
      globalRootRef,
      new VertexResolved({
        $d: { resolutionContext: null },
        $c: [],
      }),
    );
    resolvedTree.set(
      detachedRef,
      new VertexResolved({
        $d: { resolutionContext: null },
        $c: [],
      }),
    );
    const childHint = { key: 'child', value: detachedValue };
    const adapter = new TraversableObjectTree<
      Record<PropertyKey, unknown>,
      PropertyKey,
      unknown
    >({});

    expect(() =>
      adapter.makeVertex(childHint, {
        resolvedTree,
        notMutatedResolvedTree: null,
        resolutionContext: {
          depth: 1,
          hintIndex: 0,
          parentVertex: detachedVertex,
          parentVertexRef: detachedRef,
          vertexHint: childHint,
        },
      }),
    ).toThrow(/cycle.*\$\.detached\.child.*ancestor at \$\.detached/i);
  });

  test.each([
    [
      'numeric array-index',
      () => {
        const value: unknown[] = [];
        value.push(value);
        return value;
      },
      /\$\[0\]/,
    ],
    [
      'symbol',
      () => {
        const key = Symbol('loop');
        const value: Record<PropertyKey, unknown> = {};
        value[key] = value;
        return value;
      },
      /\$\[Symbol\(loop\)\]/,
    ],
    [
      'non-identifier string',
      () => {
        const value: Record<string, unknown> = {};
        value['not valid'] = value;
        return value;
      },
      /\$\["not valid"\]/,
    ],
  ] as const)(
    'formats a cycle path containing a %s key',
    (_name, make, path) => {
      expect(() => rewriteObject(make())).toThrow(path);
    },
  );
});

describe('public mutation command factory', () => {
  const makeArguments = (value: unknown) => {
    const vertex = new Vertex<ObjectTree>({
      $d: { key: 'root', value },
      $c: [],
    });
    const vertexRef = new CTTRef(vertex);
    const resolvedTree = new ResolvedTree<ObjectTree>();
    const visitorRecord = {
      addedIndex: 0,
      priority: 100,
      resolutionStyle: TraversalVisitorFunctionResolutionStyle.SEQUENTIAL,
      visitor: () => undefined,
    };
    const options: TraversalVisitorInputOptions<
      DepthFirstTraversalOrder,
      ObjectTree,
      ObjectTree
    > = {
      resolvedTree,
      notMutatedResolvedTree: null,
      vertexVisitIndex: 0,
      curVertexVisitorVisitIndex: 0,
      previousVisitedVertexRef: null,
      isTreeRoot: true,
      isTraversalRoot: true,
      vertexRef,
      vertexVisitorsChainState: null,
      visitorRecord,
      order: DepthFirstTraversalOrder.POST_ORDER,
    };
    return { vertex, options };
  };

  test('default array assembly handles a ref with no resolved child entry', () => {
    const makeMutationCommand =
      TraversableObjectTree.makeMutationCommandFactory<
        ObjectTree,
        ObjectTree
      >();
    const { vertex, options } = makeArguments([]);
    const mutation = makeMutationCommand(vertex, options);

    expect(mutation.assembleComposite()).toEqual([]);
    expect(mutation.makeMutationCommand()).toEqual({
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: {
        newData: { key: 'root', value: [] },
      },
    });
  });

  test('assembling a primitive reports that it is not a composite', () => {
    const makeMutationCommand =
      TraversableObjectTree.makeMutationCommandFactory<
        ObjectTree,
        ObjectTree
      >();
    const { vertex, options } = makeArguments(1);
    const mutation = makeMutationCommand(vertex, options);

    expect(mutation).toMatchObject({
      isArray: false,
      isObject: false,
      isComposite: false,
    });
    expect(() => mutation.assembleComposite()).toThrow(
      /not recognized by isArray or by isObject/,
    );
  });
});
