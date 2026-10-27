import {
  DepthFirstPhase,
  DepthFirstTreeTraversal,
  MutableRef,
  objectRewrite as rewriteObjectApi,
  ObjectTreeSource,
  ResolvedTreeStore,
  TraversalVisitorCommandName,
  TreeVertexRecord,
  Vertex,
  type ObjectTreeVertexTypes,
  type TreeVisitorContext,
} from '../src';

const { rewriteObject } = rewriteObjectApi;

type ObjectTree = ObjectTreeVertexTypes<PropertyKey, unknown>;

describe('rewrite object option integration', () => {
  test('stores assembled composites and exposes the rewritten leaf path', () => {
    const assembled = new Map();
    const leafPaths: PropertyKey[][] = [];

    const { outputAtReturn } = rewriteObject(
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

    expect(outputAtReturn).toEqual({ nested: [2] });
    expect(leafPaths).toEqual([['nested', 0]]);
    expect([...assembled.values()]).toEqual([[2], { nested: [2] }]);
  });

  test('custom isArray classification reconstructs a numeric-key object as an array', () => {
    const input = { 0: 1, 1: 2 };

    const { outputAtReturn } = rewriteObject(input, {
      isArray: ({ value }) => value === input,
    });

    expect(Array.isArray(outputAtReturn)).toBe(true);
    expect(outputAtReturn).toEqual([1, 2]);
    expect(Array.isArray(input)).toBe(false);
  });

  test('forwards in-order positions to configured visitors', () => {
    const inOrder: PropertyKey[] = [];

    rewriteObject(
      { a: 1, b: 2, c: 3 },
      {
        inOrder: { afterChildIndices: 2 },
        visitors: {
          [DepthFirstPhase.IN_ORDER]: [
            {
              priority: 100,
              commandCommitMode: 'afterEachVisitor' as const,
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

  test('starts rewrite visitor coordinates in its own fresh runner state', () => {
    const seenIndices: number[] = [];
    rewriteObject(
      { value: 1 },
      {
        rewrite: (_property, { phaseVisitIndex }) => {
          seenIndices.push(phaseVisitIndex);
          return undefined;
        },
      },
    );
    expect(seenIndices).toEqual([0, 1]);
  });
});

describe('object identity bookkeeping', () => {
  const makeObjectVertex = (key: PropertyKey, value: unknown) =>
    new Vertex<ObjectTree>({ $data: { key, value }, $childHints: [] });

  test('keeps the original non-root identity after pre-order data rewriting', () => {
    const branch: { self?: unknown } = {};
    branch.self = branch;
    const traversal = new DepthFirstTreeTraversal({
      traversableTree: new ObjectTreeSource({ branch }),
    });
    traversal.addVisitorFor(
      DepthFirstPhase.PRE_ORDER,
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

    expect(() => traversal.createRunner().run()).toThrow(
      /cycle.*\$\.branch\.self.*ancestor at \$\.branch/i,
    );
  });

  test('retains hook-substituted ancestor identity after data rewriting', () => {
    const branch: { self?: unknown } = {};
    branch.self = branch;
    const traversal = new DepthFirstTreeTraversal({
      traversableTree: new ObjectTreeSource(
        { branch: 0 },
        {
          resolveVertexHook: (hint) =>
            hint.key === 'branch'
              ? {
                  kind: 'found',
                  vertex: {
                    vertexContent: {
                      $data: { key: 'branch', value: branch },
                      $childHints: [{ key: 'self', value: branch }],
                    },
                  },
                }
              : { kind: 'useDefault' },
        },
      ),
    });
    traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, (vertex) => {
      if (vertex.getData().key === 'branch') {
        return {
          commands: [
            {
              commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
              commandArguments: { newData: { key: 'branch', value: {} } },
            },
          ],
        };
      }
      return undefined;
    });
    expect(() => traversal.createRunner().run()).toThrow(
      'Object identity cycle detected at $.branch.self; value repeats ancestor at $.branch',
    );
  });

  test('a rewritten root keeps its original child hints after data rewriting', () => {
    const visited: PropertyKey[] = [];
    const traversal = new DepthFirstTreeTraversal({
      traversableTree: new ObjectTreeSource({ child: 1 }),
    });
    traversal.addVisitorFor(
      DepthFirstPhase.PRE_ORDER,
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

    traversal.createRunner().run();

    expect(visited).toEqual(['child']);
  });

  test('hook-supplied primitive parents with explicit children do not create false cycles', () => {
    const visited: PropertyKey[] = [];
    const traversal = new DepthFirstTreeTraversal({
      traversableTree: new ObjectTreeSource(
        { custom: { ignored: true } },
        {
          resolveVertexHook: (hint) =>
            hint.key === 'custom'
              ? {
                  kind: 'found',
                  vertex: {
                    vertexContent: {
                      $data: { key: 'custom', value: 0 },
                      $childHints: [
                        { key: 'first', value: 1 },
                        { key: 'second', value: 2 },
                      ],
                    },
                  },
                }
              : { kind: 'useDefault' },
        },
      ),
    });
    traversal.addVisitorFor(
      DepthFirstPhase.PRE_ORDER,
      (vertex, { isTreeRoot }) => {
        if (!isTreeRoot) visited.push(vertex.getData().key);
      },
    );

    expect(() => traversal.createRunner().run()).not.toThrow();
    expect(visited).toEqual(['custom', 'first', 'second']);
  });

  test('uses a pre-populated resolution context to retain the parent identity', () => {
    const originalBranch: Record<string, unknown> = {};
    originalBranch['self'] = originalBranch;
    const rootVertex = makeObjectVertex('global', { branch: originalBranch });
    const rootRef = new MutableRef(rootVertex);
    const parentVertex = makeObjectVertex('branch', { replacement: true });
    const parentRef = new MutableRef(parentVertex);
    const resolvedTree = new ResolvedTreeStore<ObjectTree>();
    resolvedTree.setRoot(rootRef);
    resolvedTree.set(
      rootRef,
      new TreeVertexRecord({
        metadata: { resolutionContext: null },
        children: [parentRef],
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
      new TreeVertexRecord({
        metadata: { resolutionContext: parentContext },
        children: [],
      }),
    );
    const childHint = { key: 'self', value: originalBranch };
    const adapter = new ObjectTreeSource<
      Record<PropertyKey, unknown>,
      PropertyKey,
      unknown
    >({});

    expect(() =>
      adapter.resolveChild(childHint, {
        resolvedTree,
        originalTreeView: null,
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
    const globalRootRef = new MutableRef(globalRoot);
    const detachedValue = {};
    const detachedVertex = makeObjectVertex('detached', detachedValue);
    const detachedRef = new MutableRef(detachedVertex);
    const resolvedTree = new ResolvedTreeStore<ObjectTree>();
    resolvedTree.setRoot(globalRootRef);
    resolvedTree.set(
      globalRootRef,
      new TreeVertexRecord({
        metadata: { resolutionContext: null },
        children: [],
      }),
    );
    resolvedTree.set(
      detachedRef,
      new TreeVertexRecord({
        metadata: { resolutionContext: null },
        children: [],
      }),
    );
    const childHint = { key: 'child', value: detachedValue };
    const adapter = new ObjectTreeSource<
      Record<PropertyKey, unknown>,
      PropertyKey,
      unknown
    >({});

    expect(() =>
      adapter.resolveChild(childHint, {
        resolvedTree,
        originalTreeView: null,
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
      $data: { key: 'root', value },
      $childHints: [],
    });
    const vertexRef = new MutableRef(vertex);
    const resolvedTree = new ResolvedTreeStore<ObjectTree>();
    const registration = {
      addedIndex: 0,
      priority: 100,
      commandCommitMode: 'afterEachVisitor' as const,
      visitor: () => undefined,
    };
    const options: TreeVisitorContext<DepthFirstPhase, ObjectTree, ObjectTree> =
      {
        resolvedTree,
        originalTreeView: null,
        phaseVisitIndex: 0,
        visitorIndex: 0,
        previousPhaseVertexRef: null,
        isTreeRoot: true,
        isTraversalRoot: true,
        vertexRef,
        visitorChainState: null,
        registration,
        phase: DepthFirstPhase.POST_ORDER,
      };
    return { vertex, options };
  };

  test.each([null, undefined, 3, 'invalid', true, Symbol('patch')])(
    'rejects malformed rewrite patch %p before assembly or mutation',
    (rewrite) => {
      const { vertex, options } = makeArguments({ child: 1 });
      const assembledMap = new Map();
      let assemblyCount = 0;
      const mutation = ObjectTreeSource.createObjectMutationBinder<
        ObjectTree,
        ObjectTree
      >({
        assembledMap,
        assembleObject: () => {
          assemblyCount += 1;
          return {};
        },
      })(vertex, options);
      const before = vertex.getData();
      const input = { rewrite } as unknown as Parameters<
        typeof mutation.makeMutationCommand
      >[0];

      expect(() => mutation.makeMutationCommand(input)).toThrow(TypeError);
      expect(() => mutation.makeMutationCommand(input)).toThrow(
        /rewrite.*non-null object.*patch/i,
      );
      expect(vertex.getData()).toBe(before);
      expect(assembledMap.size).toBe(0);
      expect(assemblyCount).toBe(0);
    },
  );

  test.each([null, undefined, 3, 'invalid', true, Symbol('patch')])(
    'rejects an invalid first accessor patch %p without consuming later values',
    (firstPatch) => {
      const { vertex, options } = makeArguments({ child: 1 });
      const before = vertex.getData();
      const assembledMap = new Map();
      let assemblyCount = 0;
      let reads = 0;
      const { makeMutationCommand } =
        ObjectTreeSource.createObjectMutationBinder<ObjectTree, ObjectTree>({
          assembledMap,
          assembleObject: () => {
            assemblyCount += 1;
            return {};
          },
        })(vertex, options);
      const input = {
        get rewrite() {
          return ++reads === 1 ? firstPatch : {};
        },
      } as unknown as Parameters<typeof makeMutationCommand>[0];

      expect(() => makeMutationCommand(input)).toThrow(
        /rewrite.*non-null object.*patch/i,
      );
      expect(reads).toBe(1);
      expect(assemblyCount).toBe(0);
      expect(assembledMap.size).toBe(0);
      expect(vertex.getData()).toBe(before);
    },
  );

  test.each([
    {
      patch: {},
      newData: { key: 'root', value: { assembled: true } },
      assemblies: 1,
    },
    {
      patch: { key: 'captured' },
      newData: { key: 'captured', value: { assembled: true } },
      assemblies: 1,
    },
    {
      patch: { value: undefined },
      newData: { key: 'root', value: undefined },
      assemblies: 0,
    },
    {
      patch: { key: 'captured', value: 4 },
      newData: { key: 'captured', value: 4 },
      assemblies: 0,
    },
  ])(
    'reads a valid accessor patch once and consumes only $patch',
    ({ patch, newData, assemblies }) => {
      const { vertex, options } = makeArguments({ child: 1 });
      const before = vertex.getData();
      const assembledMap = new Map();
      let assemblyCount = 0;
      let reads = 0;
      const { makeMutationCommand } =
        ObjectTreeSource.createObjectMutationBinder<ObjectTree, ObjectTree>({
          assembledMap,
          assembleObject: () => {
            assemblyCount += 1;
            return { assembled: true };
          },
        })(vertex, options);
      const input = {
        get rewrite() {
          return ++reads <= 2 ? patch : 3;
        },
      } as unknown as Parameters<typeof makeMutationCommand>[0];

      expect(makeMutationCommand(input)).toEqual({
        commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
        commandArguments: { newData },
      });
      expect(reads).toBe(1);
      expect(assemblyCount).toBe(assemblies);
      expect(assembledMap.size).toBe(0);
      expect(vertex.getData()).toBe(before);
    },
  );

  test.each([undefined, { getterFailure: true }])(
    'preserves exact accessor error %p before assembly or mutation',
    (error) => {
      const { vertex, options } = makeArguments({ child: 1 });
      const before = vertex.getData();
      const assembledMap = new Map();
      let assemblyCount = 0;
      let reads = 0;
      const { makeMutationCommand } =
        ObjectTreeSource.createObjectMutationBinder<ObjectTree, ObjectTree>({
          assembledMap,
          assembleObject: () => {
            assemblyCount += 1;
            return {};
          },
        })(vertex, options);
      let didThrow = false;
      try {
        makeMutationCommand({
          get rewrite(): never {
            reads += 1;
            throw error;
          },
        });
      } catch (thrown) {
        didThrow = true;
        expect(thrown).toBe(error);
      }
      expect(didThrow).toBe(true);
      expect(reads).toBe(1);
      expect(assemblyCount).toBe(0);
      expect(assembledMap.size).toBe(0);
      expect(vertex.getData()).toBe(before);
    },
  );

  test('honors own undefined values and key-only patches on primitives', () => {
    const { vertex, options } = makeArguments(1);
    const { makeMutationCommand } = ObjectTreeSource.createObjectMutationBinder<
      ObjectTree,
      ObjectTree
    >()(vertex, options);
    expect(makeMutationCommand({ rewrite: { value: undefined } })).toEqual({
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: { newData: { key: 'root', value: undefined } },
    });
    expect(makeMutationCommand({ rewrite: { key: 'renamed' } })).toEqual({
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: { newData: { key: 'renamed', value: 1 } },
    });
    expect(makeMutationCommand({ delete: true })).toEqual({
      commandName: TraversalVisitorCommandName.DELETE_VERTEX,
    });
    expect(vertex.getData()).toEqual({ key: 'root', value: 1 });
  });

  test.each([[], {}])(
    'preserves exact user assembler errors for %p',
    (value) => {
      const error = { assemblerFailure: true };
      const { vertex, options } = makeArguments(value);
      const failAssembly = (): never => {
        throw error;
      };
      const { makeMutationCommand } =
        ObjectTreeSource.createObjectMutationBinder<ObjectTree, ObjectTree>({
          assembleArray: failAssembly,
          assembleObject: failAssembly,
        })(vertex, options);
      try {
        makeMutationCommand();
        throw new Error('Expected assembler to throw');
      } catch (thrown) {
        expect(thrown).toBe(error);
      }
    },
  );

  test('default array assembly handles a ref with no resolved child entry', () => {
    const makeMutationCommand = ObjectTreeSource.createObjectMutationBinder<
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
    const makeMutationCommand = ObjectTreeSource.createObjectMutationBinder<
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
