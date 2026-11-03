import { createVertexHandleFacet } from '../src/core/observationFacets';
import { capturedOutputValue } from './helpers/rewriteOutput';
import {
  DepthFirstTreeVisitPhase,
  DepthFirstTreeTraversalBuilder,
  MutableValueReference,
  objectRewrite as rewriteObjectApi,
  ObjectPropertyTreeSource,
  MutableResolvedTreeStore,
  TraversalVisitorCommandName,
  MutableTreeVertexTopologyRecord,
  Vertex,
  type ObjectPropertyTreeVertexTypes,
  type TreeVisitorContext,
} from '../src';

const { rewriteObject } = rewriteObjectApi;

function assemblyCacheForMap<Key>(values: Map<Key, unknown>) {
  return {
    hasAssembledValueForVertex: (vertexHandle: Key) => values.has(vertexHandle),
    getAssembledValueForVertex: (vertexHandle: Key) => values.get(vertexHandle),
    setAssembledValueForVertex: (vertexHandle: Key, assembledValue: unknown) =>
      values.set(vertexHandle, assembledValue),
  };
}

type ObjectTree = ObjectPropertyTreeVertexTypes<PropertyKey, unknown>;

describe('rewrite object option integration', () => {
  test('stores assembled composites and exposes the rewritten leaf path', () => {
    const assembled = new Map();
    const leafPaths: PropertyKey[][] = [];

    const outputAtReturn = capturedOutputValue(
      rewriteObject(
        { nested: [1] },
        {
          assemblyCache: assemblyCacheForMap(assembled),
          includeAssembledValueInRewriteInput: true,
          rewritePropertyAfterChildTraversal: (
            { propertyValue: propertyValue },
            { requirePropertyKeyPathFromRoot },
          ) => {
            if (propertyValue === 1) {
              leafPaths.push(
                requirePropertyKeyPathFromRoot({
                  includeDesignatedRoot: false,
                }),
              );
              return {
                kind: 'patchPropertyKeyOrValue',
                propertyPatch: { propertyValue: 2 },
              };
            }
            return undefined;
          },
        },
      ),
    );

    expect(outputAtReturn).toEqual({ nested: [2] });
    expect(leafPaths).toEqual([['nested', 0]]);
    expect([...assembled.values()]).toEqual([[2], { nested: [2] }]);
  });

  test('custom isArray classification reconstructs a numeric-key object as an array', () => {
    const input = { 0: 1, 1: 2 };

    const outputAtReturn = capturedOutputValue(
      rewriteObject(input, {
        matchesArrayAssemblyPredicate: ({ propertyValue: propertyValue }) =>
          propertyValue === input,
      }),
    );

    expect(Array.isArray(outputAtReturn)).toBe(true);
    expect(outputAtReturn).toEqual([1, 2]);
    expect(Array.isArray(input)).toBe(false);
  });

  test('forwards in-order positions to configured visitors', () => {
    const inOrder: PropertyKey[] = [];

    rewriteObject(
      { a: 1, b: 2, c: 3 },
      {
        childBoundaryVisits: { visitAfterChildIndices: { indices: [2] } },
        visitors: {
          [DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES]: [
            {
              descendingExecutionPriorityWithinGroup: 100,
              visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
              visitor: (vertex, { isTreeRoot }) => {
                inOrder.push(
                  isTreeRoot ? 'root' : vertex.getVertexData().propertyKey,
                );
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
      { propertyValue: 1 },
      {
        rewritePropertyAfterChildTraversal: (
          _property,
          { phaseVisitorChainIndex },
        ) => {
          seenIndices.push(phaseVisitorChainIndex);
          return undefined;
        },
      },
    );
    expect(seenIndices).toEqual([0, 1]);
  });
});

describe('object identity bookkeeping', () => {
  const makeObjectVertex = (propertyKey: PropertyKey, propertyValue: unknown) =>
    new Vertex<ObjectTree>({
      $vertexData: { propertyKey: propertyKey, propertyValue: propertyValue },
      $childDiscoveryHints: [],
    });

  test('keeps the original non-root identity after pre-order data rewriting', () => {
    const branch: { self?: unknown } = {};
    branch.self = branch;
    const traversal = new DepthFirstTreeTraversalBuilder({
      treeDiscoverySource: new ObjectPropertyTreeSource({ branch }),
    });
    traversal.registerVisitorCallbackForPhase(
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
      (vertex, { isTreeRoot }) => {
        if (!isTreeRoot && vertex.getVertexData().propertyKey === 'branch') {
          return {
            commands: [
              {
                commandName:
                  TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
                commandArguments: {
                  replacementVertexData: {
                    propertyKey: 'branch',
                    propertyValue: { replacement: true },
                  },
                },
              },
            ],
          };
        }
        return undefined;
      },
    );

    expect(() =>
      traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    ).toThrow(/cycle.*\$\.branch\.self.*ancestor at \$\.branch/i);
  });

  test('retains hook-substituted ancestor identity after data rewriting', () => {
    const branch: { self?: unknown } = {};
    branch.self = branch;
    const traversal = new DepthFirstTreeTraversalBuilder({
      treeDiscoverySource: new ObjectPropertyTreeSource<{ branch: number }>(
        { branch: 0 },
        {
          resolveChildPropertyOrUseDefault: (hint) =>
            hint.propertyKey === 'branch'
              ? {
                  kind: 'vertexResolved',
                  resolvedVertexInput: {
                    vertexContentInput: {
                      $vertexData: {
                        propertyKey: 'branch',
                        propertyValue: branch,
                      },
                      $childDiscoveryHints: [
                        { propertyKey: 'self', propertyValue: branch },
                      ],
                    },
                  },
                }
              : { kind: 'useDefaultChildPropertyResolution' },
        },
      ),
    });
    traversal.registerVisitorCallbackForPhase(
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
      (vertex) => {
        if (vertex.getVertexData().propertyKey === 'branch') {
          return {
            commands: [
              {
                commandName:
                  TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
                commandArguments: {
                  replacementVertexData: {
                    propertyKey: 'branch',
                    propertyValue: {},
                  },
                },
              },
            ],
          };
        }
        return undefined;
      },
    );
    expect(() =>
      traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    ).toThrow(
      'Object identity cycle detected at $.branch.self; value repeats ancestor at $.branch',
    );
  });

  test('a rewritten root keeps its original child hints after data rewriting', () => {
    const visited: PropertyKey[] = [];
    const traversal = new DepthFirstTreeTraversalBuilder({
      treeDiscoverySource: new ObjectPropertyTreeSource({ child: 1 }),
    });
    traversal.registerVisitorCallbackForPhase(
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
      (vertex, { isTreeRoot }) => {
        if (isTreeRoot) {
          return {
            commands: [
              {
                commandName:
                  TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
                commandArguments: {
                  replacementVertexData: {
                    propertyKey: 'root',
                    propertyValue: { replacement: true },
                  },
                },
              },
            ],
          };
        }
        visited.push(vertex.getVertexData().propertyKey);
        return undefined;
      },
    );

    traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();

    expect(visited).toEqual(['child']);
  });

  test('hook-supplied primitive parents with explicit children do not create false cycles', () => {
    const visited: PropertyKey[] = [];
    const traversal = new DepthFirstTreeTraversalBuilder({
      treeDiscoverySource: new ObjectPropertyTreeSource<{
        custom: { ignored: boolean };
      }>(
        { custom: { ignored: true } },
        {
          resolveChildPropertyOrUseDefault: (hint) =>
            hint.propertyKey === 'custom'
              ? {
                  kind: 'vertexResolved',
                  resolvedVertexInput: {
                    vertexContentInput: {
                      $vertexData: { propertyKey: 'custom', propertyValue: 0 },
                      $childDiscoveryHints: [
                        { propertyKey: 'first', propertyValue: 1 },
                        { propertyKey: 'second', propertyValue: 2 },
                      ],
                    },
                  },
                }
              : { kind: 'useDefaultChildPropertyResolution' },
        },
      ),
    });
    traversal.registerVisitorCallbackForPhase(
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
      (vertex, { isTreeRoot }) => {
        if (!isTreeRoot) visited.push(vertex.getVertexData().propertyKey);
      },
    );

    expect(() =>
      traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    ).not.toThrow();
    expect(visited).toEqual(['custom', 'first', 'second']);
  });

  test('uses a pre-populated resolution context to retain the parent identity', () => {
    const originalBranch: Record<string, unknown> = {};
    originalBranch['self'] = originalBranch;
    const rootVertex = makeObjectVertex('global', { branch: originalBranch });
    const rootRef = new MutableValueReference(rootVertex);
    const parentVertex = makeObjectVertex('branch', { replacement: true });
    const parentRef = new MutableValueReference(parentVertex);
    const resolvedTree = new MutableResolvedTreeStore<ObjectTree>();
    resolvedTree.setRootVertexReference(rootRef);
    resolvedTree.setVertexRecord(
      rootRef,
      new MutableTreeVertexTopologyRecord({
        metadata: { childDiscoveryContext: null },
        childReferences: [parentRef],
      }),
    );
    const parentContext = {
      discoveryDepthInEdges: 1,
      parentChildHintIndex: 0,
      parentVertexAtChildResolution: rootVertex,
      parentVertexHandle: rootRef,
      childDiscoveryHint: {
        propertyKey: 'branch',
        propertyValue: originalBranch,
      },
    };
    resolvedTree.setVertexRecord(
      parentRef,
      new MutableTreeVertexTopologyRecord({
        metadata: { childDiscoveryContext: parentContext },
        childReferences: [],
      }),
    );
    const childHint = { propertyKey: 'self', propertyValue: originalBranch };
    const adapter = new ObjectPropertyTreeSource<
      Record<PropertyKey, unknown>,
      PropertyKey,
      unknown
    >({});

    expect(() =>
      adapter.resolveChildVertexFromHint(childHint, {
        liveResolvedTreeView: resolvedTree.getLiveReadOnlyTreeView(),
        preCommandDiscoveredTreeView: null,
        childDiscoveryContext: {
          discoveryDepthInEdges: 2,
          parentChildHintIndex: 0,
          parentVertexAtChildResolution: parentVertex,
          parentVertexHandle: createVertexHandleFacet(parentRef),
          childDiscoveryHint: childHint,
        },
      }),
    ).toThrow(/cycle.*\$\.branch\.self.*ancestor at \$\.branch/i);
  });

  test('formats a detached null-context traversal root from its vertex data', () => {
    const globalRoot = makeObjectVertex('global', {});
    const globalRootRef = new MutableValueReference(globalRoot);
    const detachedValue = {};
    const detachedVertex = makeObjectVertex('detached', detachedValue);
    const detachedRef = new MutableValueReference(detachedVertex);
    const resolvedTree = new MutableResolvedTreeStore<ObjectTree>();
    resolvedTree.setRootVertexReference(globalRootRef);
    resolvedTree.setVertexRecord(
      globalRootRef,
      new MutableTreeVertexTopologyRecord({
        metadata: { childDiscoveryContext: null },
        childReferences: [],
      }),
    );
    resolvedTree.setVertexRecord(
      detachedRef,
      new MutableTreeVertexTopologyRecord({
        metadata: { childDiscoveryContext: null },
        childReferences: [],
      }),
    );
    const childHint = { propertyKey: 'child', propertyValue: detachedValue };
    const adapter = new ObjectPropertyTreeSource<
      Record<PropertyKey, unknown>,
      PropertyKey,
      unknown
    >({});

    expect(() =>
      adapter.resolveChildVertexFromHint(childHint, {
        liveResolvedTreeView: resolvedTree.getLiveReadOnlyTreeView(),
        preCommandDiscoveredTreeView: null,
        childDiscoveryContext: {
          discoveryDepthInEdges: 1,
          parentChildHintIndex: 0,
          parentVertexAtChildResolution: detachedVertex,
          parentVertexHandle: createVertexHandleFacet(detachedRef),
          childDiscoveryHint: childHint,
        },
      }),
    ).toThrow(/cycle.*\$\.detached\.child.*ancestor at \$\.detached/i);
  });

  test.each([
    [
      'numeric array-index',
      () => {
        const propertyValue: unknown[] = [];
        propertyValue.push(propertyValue);
        return propertyValue;
      },
      /\$\[0\]/,
    ],
    [
      'symbol',
      () => {
        const propertyKey = Symbol('loop');
        const propertyValue: Record<PropertyKey, unknown> = {};
        propertyValue[propertyKey] = propertyValue;
        return propertyValue;
      },
      /\$\[Symbol\(loop\)\]/,
    ],
    [
      'non-identifier string',
      () => {
        const propertyValue: Record<string, unknown> = {};
        propertyValue['not valid'] = propertyValue;
        return propertyValue;
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
  const makeArguments = (propertyValue: unknown) => {
    const vertex = new Vertex<ObjectTree>({
      $vertexData: { propertyKey: 'root', propertyValue: propertyValue },
      $childDiscoveryHints: [],
    });
    const vertexHandle = new MutableValueReference(vertex);
    const resolvedTree = new MutableResolvedTreeStore<ObjectTree>();
    const registration = {
      phaseRegistrationInsertionIndex: 0,
      descendingExecutionPriorityWithinGroup: 100,
      visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
      visitor: () => undefined,
    };
    const options: TreeVisitorContext<
      DepthFirstTreeVisitPhase,
      ObjectTree,
      ObjectTree
    > = {
      liveResolvedTreeView: resolvedTree.getLiveReadOnlyTreeView(),
      preCommandDiscoveredTreeView: null,
      phaseVisitorChainIndex: 0,
      visitorCallbackIndexInPhaseChain: 0,
      previousCommittedVisitVertexHandleForSamePhase: null,
      isTreeRoot: true,

      vertexHandle: createVertexHandleFacet(vertexHandle),
      currentVertexPhaseChainState: null,
      visitorRegistrationMetadata: registration,
      visitorPhase: DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
    };
    return { vertex, options };
  };

  test.each([null, undefined, 3, 'invalid', true, Symbol('patch')])(
    'rejects malformed rewrite patch %p before assembly or mutation',
    (rewritePropertyAfterChildTraversal) => {
      const { vertex, options } = makeArguments({ child: 1 });
      const assemblyCache = new Map();
      let assemblyCount = 0;
      const mutation =
        ObjectPropertyTreeSource.createObjectPropertyMutationHelperBinder<
          ObjectTree,
          ObjectTree
        >({
          assemblyCache: assemblyCacheForMap(assemblyCache),
          assembleObjectValueFromChildProperties: () => {
            assemblyCount += 1;
            return {};
          },
        })(vertex, options);
      const before = vertex.getVertexData();
      const input = {
        kind: 'patchPropertyKeyOrValue',
        propertyPatch: rewritePropertyAfterChildTraversal,
      } as unknown as Parameters<
        typeof mutation.createObjectPropertyMutationCommand
      >[0];

      expect(() => mutation.createObjectPropertyMutationCommand(input)).toThrow(
        TypeError,
      );
      expect(() => mutation.createObjectPropertyMutationCommand(input)).toThrow(
        /rewrite.*non-null object.*patch/i,
      );
      expect(vertex.getVertexData()).toBe(before);
      expect(assemblyCache.size).toBe(0);
      expect(assemblyCount).toBe(0);
    },
  );

  test.each([null, undefined, 3, 'invalid', true, Symbol('patch')])(
    'rejects an invalid first accessor patch %p without consuming later values',
    (firstPatch) => {
      const { vertex, options } = makeArguments({ child: 1 });
      const before = vertex.getVertexData();
      const assemblyCache = new Map();
      let assemblyCount = 0;
      let reads = 0;
      const {
        createObjectPropertyMutationCommand: makeVertexDataMutationCommand,
      } = ObjectPropertyTreeSource.createObjectPropertyMutationHelperBinder<
        ObjectTree,
        ObjectTree
      >({
        assemblyCache: assemblyCacheForMap(assemblyCache),
        assembleObjectValueFromChildProperties: () => {
          assemblyCount += 1;
          return {};
        },
      })(vertex, options);
      const input = {
        kind: 'patchPropertyKeyOrValue',
        get propertyPatch() {
          return ++reads === 1 ? firstPatch : {};
        },
      } as unknown as Parameters<typeof makeVertexDataMutationCommand>[0];

      expect(() => makeVertexDataMutationCommand(input)).toThrow(
        /rewrite.*non-null object.*patch/i,
      );
      expect(reads).toBe(1);
      expect(assemblyCount).toBe(0);
      expect(assemblyCache.size).toBe(0);
      expect(vertex.getVertexData()).toBe(before);
    },
  );

  test.each([
    {
      propertyPatch: {},
      replacementVertexData: {
        propertyKey: 'root',
        propertyValue: { assembled: true },
      },
      assemblies: 1,
    },
    {
      propertyPatch: { propertyKey: 'captured' },
      replacementVertexData: {
        propertyKey: 'captured',
        propertyValue: { assembled: true },
      },
      assemblies: 1,
    },
    {
      propertyPatch: { propertyValue: undefined },
      replacementVertexData: { propertyKey: 'root', propertyValue: undefined },
      assemblies: 0,
    },
    {
      propertyPatch: { propertyKey: 'captured', propertyValue: 4 },
      replacementVertexData: { propertyKey: 'captured', propertyValue: 4 },
      assemblies: 0,
    },
  ])(
    'reads a valid accessor patch once and consumes only $patch',
    ({ propertyPatch, replacementVertexData, assemblies }) => {
      const { vertex, options } = makeArguments({ child: 1 });
      const before = vertex.getVertexData();
      const assemblyCache = new Map();
      let assemblyCount = 0;
      let reads = 0;
      const {
        createObjectPropertyMutationCommand: makeVertexDataMutationCommand,
      } = ObjectPropertyTreeSource.createObjectPropertyMutationHelperBinder<
        ObjectTree,
        ObjectTree
      >({
        assemblyCache: assemblyCacheForMap(assemblyCache),
        assembleObjectValueFromChildProperties: () => {
          assemblyCount += 1;
          return { assembled: true };
        },
      })(vertex, options);
      const input = {
        kind: 'patchPropertyKeyOrValue',
        get propertyPatch() {
          return ++reads <= 2 ? propertyPatch : 3;
        },
      } as unknown as Parameters<typeof makeVertexDataMutationCommand>[0];

      expect(makeVertexDataMutationCommand(input)).toEqual({
        commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
        commandArguments: { replacementVertexData },
      });
      expect(reads).toBe(1);
      expect(assemblyCount).toBe(assemblies);
      expect(assemblyCache.size).toBe(0);
      expect(vertex.getVertexData()).toBe(before);
    },
  );

  test.each([undefined, { getterFailure: true }])(
    'preserves exact accessor error %p before assembly or mutation',
    (error) => {
      const { vertex, options } = makeArguments({ child: 1 });
      const before = vertex.getVertexData();
      const assemblyCache = new Map();
      let assemblyCount = 0;
      let reads = 0;
      const {
        createObjectPropertyMutationCommand: makeVertexDataMutationCommand,
      } = ObjectPropertyTreeSource.createObjectPropertyMutationHelperBinder<
        ObjectTree,
        ObjectTree
      >({
        assemblyCache: assemblyCacheForMap(assemblyCache),
        assembleObjectValueFromChildProperties: () => {
          assemblyCount += 1;
          return {};
        },
      })(vertex, options);
      let didThrow = false;
      try {
        makeVertexDataMutationCommand({
          kind: 'patchPropertyKeyOrValue',
          get propertyPatch(): never {
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
      expect(assemblyCache.size).toBe(0);
      expect(vertex.getVertexData()).toBe(before);
    },
  );

  test('honors own undefined values and key-only patches on primitives', () => {
    const { vertex, options } = makeArguments(1);
    const {
      createObjectPropertyMutationCommand: makeVertexDataMutationCommand,
    } = ObjectPropertyTreeSource.createObjectPropertyMutationHelperBinder<
      ObjectTree,
      ObjectTree
    >()(vertex, options);
    expect(
      makeVertexDataMutationCommand({
        kind: 'patchPropertyKeyOrValue',
        propertyPatch: { propertyValue: undefined },
      }),
    ).toEqual({
      commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
      commandArguments: {
        replacementVertexData: {
          propertyKey: 'root',
          propertyValue: undefined,
        },
      },
    });
    expect(
      makeVertexDataMutationCommand({
        kind: 'patchPropertyKeyOrValue',
        propertyPatch: { propertyKey: 'renamed' },
      }),
    ).toEqual({
      commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
      commandArguments: {
        replacementVertexData: { propertyKey: 'renamed', propertyValue: 1 },
      },
    });
    expect(
      makeVertexDataMutationCommand({ kind: 'deletePropertySubtree' }),
    ).toEqual({
      commandName:
        TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
    });
    expect(vertex.getVertexData()).toEqual({
      propertyKey: 'root',
      propertyValue: 1,
    });
  });

  test.each([[], {}])(
    'preserves exact user assembler errors for %p',
    (propertyValue) => {
      const error = { assemblerFailure: true };
      const { vertex, options } = makeArguments(propertyValue);
      const failAssembly = (): never => {
        throw error;
      };
      const {
        createObjectPropertyMutationCommand: makeVertexDataMutationCommand,
      } = ObjectPropertyTreeSource.createObjectPropertyMutationHelperBinder<
        ObjectTree,
        ObjectTree
      >({
        assembleArrayValueFromChildProperties: failAssembly,
        assembleObjectValueFromChildProperties: failAssembly,
      })(vertex, options);
      try {
        makeVertexDataMutationCommand();
        throw new Error('Expected assembler to throw');
      } catch (thrown) {
        expect(thrown).toBe(error);
      }
    },
  );

  test('default array assembly handles a ref with no resolved child entry', () => {
    const makeVertexDataMutationCommand =
      ObjectPropertyTreeSource.createObjectPropertyMutationHelperBinder<
        ObjectTree,
        ObjectTree
      >();
    const { vertex, options } = makeArguments([]);
    const mutation = makeVertexDataMutationCommand(vertex, options);

    expect(mutation.assembleCompositeFromCurrentChildren()).toEqual([]);
    expect(mutation.createObjectPropertyMutationCommand()).toEqual({
      commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
      commandArguments: {
        replacementVertexData: { propertyKey: 'root', propertyValue: [] },
      },
    });
  });

  test('assembling a primitive reports that it is not a composite', () => {
    const makeVertexDataMutationCommand =
      ObjectPropertyTreeSource.createObjectPropertyMutationHelperBinder<
        ObjectTree,
        ObjectTree
      >();
    const { vertex, options } = makeArguments(1);
    const mutation = makeVertexDataMutationCommand(vertex, options);

    expect(mutation).toMatchObject({
      matchesArrayAssemblyPredicate: false,
      matchesObjectAssemblyPredicate: false,
      matchesAnyCompositeAssemblyPredicate: false,
    });
    expect(() => mutation.assembleCompositeFromCurrentChildren()).toThrow(
      /not recognized by isArray or by isObject/,
    );
  });
});
