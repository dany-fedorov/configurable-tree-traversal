import { capturedOutputValue } from './helpers/rewriteOutput';
import {
  DepthFirstTreeVisitPhase,
  DepthFirstTreeTraversalBuilder,
  objectRewrite as rewriteObjectApi,
  ObjectPropertyTreeSource,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
} from '../src';

const { rewriteObject, rewriteObjectWithAssertedOutputType } = rewriteObjectApi;

describe('object traversal and rewriting edge cases', () => {
  test('custom assemblers receive renamed children before assembling their parent', () => {
    const assembled: Array<{
      propertyKey: PropertyKey;
      children: Array<{ propertyKey: PropertyKey; propertyValue: unknown }>;
    }> = [];
    let branchCompositeSeenByRewrite: unknown;

    const outputAtReturn = capturedOutputValue(
      rewriteObject(
        { branch: { old: 1, keep: 2 } },
        {
          includeAssembledValueInRewriteInput: true,
          assembleObjectValueFromChildProperties: (children, vertexData) => {
            if (vertexData.propertyKey === 'branch') {
              assembled.push({
                propertyKey: vertexData.propertyKey,
                children: [...children],
              });
            }
            return Object.fromEntries(
              children.map(
                ({
                  propertyKey: propertyKey,
                  propertyValue: propertyValue,
                }) => [propertyKey, propertyValue],
              ),
            );
          },
          rewritePropertyAfterChildTraversal: ({
            propertyKey: propertyKey,
            propertyValue: propertyValue,
            assembledValueFromCurrentChildren,
          }) => {
            if (propertyKey === 'old') {
              return {
                kind: 'patchPropertyKeyOrValue',
                propertyPatch: { propertyKey: 'renamed', propertyValue: 10 },
              };
            }
            if (propertyKey === 'branch') {
              branchCompositeSeenByRewrite = assembledValueFromCurrentChildren;
            }
            return typeof propertyValue === 'number'
              ? {
                  kind: 'patchPropertyKeyOrValue',
                  propertyPatch: { propertyValue: propertyValue * 10 },
                }
              : undefined;
          },
        },
      ),
    );

    expect(branchCompositeSeenByRewrite).toEqual({ renamed: 10, keep: 20 });
    expect(outputAtReturn).toEqual({ branch: { renamed: 10, keep: 20 } });
    expect(assembled).toEqual([
      {
        propertyKey: 'branch',
        children: [
          { propertyKey: 'renamed', propertyValue: 10 },
          { propertyKey: 'keep', propertyValue: 20 },
        ],
      },
    ]);
  });

  test('custom array assembly sees retained properties after numeric elements compact', () => {
    const tag = Symbol('tag');
    const input: Array<number> & { label?: string; [tag]?: string } = [1, 2, 3];
    input.label = 'numbers';
    input[tag] = 'metadata';
    const assemblyInputs: Array<
      Array<{ propertyKey: PropertyKey; propertyValue: unknown }>
    > = [];

    const outputAtReturn = capturedOutputValue(
      rewriteObjectWithAssertedOutputType<
        number[] & { name: string; [tag]: string }
      >(input, {
        assembleArrayValueFromChildProperties: (children) => {
          assemblyInputs.push([...children]);
          const result = children
            .filter(
              ({ propertyKey: propertyKey }) => typeof propertyKey === 'number',
            )
            .map(({ propertyValue: propertyValue }) => propertyValue);
          for (const {
            propertyKey: propertyKey,
            propertyValue: propertyValue,
          } of children) {
            if (typeof propertyKey !== 'number') {
              Object.defineProperty(result, propertyKey, {
                value: propertyValue,
                enumerable: true,
              });
            }
          }
          return result;
        },
        rewritePropertyAfterChildTraversal: ({
          propertyKey: propertyKey,
          propertyValue: propertyValue,
        }) => {
          if (propertyValue === 2) return { kind: 'deletePropertySubtree' };
          if (propertyKey === 'label')
            return {
              kind: 'patchPropertyKeyOrValue',
              propertyPatch: { propertyKey: 'name' },
            };
          return undefined;
        },
      }),
    );

    expect(assemblyInputs).toEqual([
      [
        { propertyKey: 0, propertyValue: 1 },
        { propertyKey: 2, propertyValue: 3 },
        { propertyKey: 'name', propertyValue: 'numbers' },
        { propertyKey: tag, propertyValue: 'metadata' },
      ],
    ]);
    expect(Array.from(outputAtReturn!)).toEqual([1, 3]);
    expect(outputAtReturn!.name).toBe('numbers');
    expect(outputAtReturn![tag]).toBe('metadata');
  });

  test('custom classification and assembly reconstruct a specialized composite type', () => {
    class Box {
      constructor(readonly entries: Record<string, unknown>) {}
    }
    const input = { boxed: new Box({ first: 1, second: 2 }) };

    const outputAtReturn = capturedOutputValue(
      rewriteObjectWithAssertedOutputType<typeof input>(input, {
        enumerateChildPropertyHints: (property) =>
          property.propertyValue instanceof Box
            ? Object.entries(property.propertyValue.entries).map(
                ([propertyKey, propertyValue]) => ({
                  propertyKey,
                  propertyValue,
                }),
              )
            : ObjectPropertyTreeSource.enumerateOwnEnumerableChildProperties(
                property,
              ),
        matchesObjectAssemblyPredicate: ({ propertyValue: propertyValue }) =>
          propertyValue !== null &&
          typeof propertyValue === 'object' &&
          !Array.isArray(propertyValue),
        assembleObjectValueFromChildProperties: (children, property) => {
          const entries = Object.fromEntries(
            children.map(
              ({ propertyKey: propertyKey, propertyValue: propertyValue }) => [
                propertyKey,
                propertyValue,
              ],
            ),
          );
          return property.propertyValue instanceof Box
            ? new Box(entries)
            : entries;
        },
        rewritePropertyAfterChildTraversal: ({
          propertyValue: propertyValue,
        }) =>
          typeof propertyValue === 'number'
            ? {
                kind: 'patchPropertyKeyOrValue',
                propertyPatch: { propertyValue: propertyValue * 10 },
              }
            : undefined,
      }),
    );

    expect(outputAtReturn).toEqual({
      boxed: new Box({ first: 10, second: 20 }),
    });
    expect(outputAtReturn!.boxed).toBeInstanceOf(Box);
    expect(input.boxed.entries).toEqual({ first: 1, second: 2 });
  });

  test('resolveChildHook can prune one property and replace another subtree', () => {
    const visited: PropertyKey[] = [];

    const outputAtReturn = capturedOutputValue(
      rewriteObject<unknown>(
        {
          keep: 1,
          prune: { hidden: 2 },
          replace: { ignored: 3 },
        },
        {
          resolveChildPropertyOrUseDefault: (hint) => {
            if (hint.propertyKey === 'prune')
              return { kind: 'vertexIntentionallyOmitted' };
            if (hint.propertyKey === 'replace') {
              return {
                kind: 'vertexResolved',
                resolvedVertexInput: {
                  vertexContentInput: {
                    $vertexData: {
                      propertyKey: 'replacement',
                      propertyValue: { visible: 4 },
                    },
                    $childDiscoveryHints: [
                      { propertyKey: 'visible', propertyValue: 4 },
                    ],
                  },
                },
              };
            }
            return { kind: 'useDefaultChildPropertyResolution' };
          },
          rewritePropertyAfterChildTraversal: (
            { propertyKey: propertyKey },
            { isTreeRoot },
          ) => {
            if (!isTreeRoot) visited.push(propertyKey);
            return undefined;
          },
        },
      ),
    );

    expect(outputAtReturn).toEqual({ keep: 1, replacement: { visible: 4 } });
    expect(visited).toEqual(['keep', 'visible', 'replacement']);
  });

  test('saved original tree keeps independent refs, topology, and original vertex data', () => {
    let snapshot:
      | {
          rootIsIndependent: boolean;
          childKeys: PropertyKey[];
          childValues: unknown[];
          parentsPointToSnapshotRoot: boolean;
        }
      | undefined;

    const outputAtReturn = capturedOutputValue(
      rewriteObject(
        { change: 1, remove: 2 },
        {
          retainDiscoveredTreeBeforeVisitorCommands: true,
          rewritePropertyAfterChildTraversal: (
            { propertyKey: propertyKey },
            options,
          ) => {
            if (propertyKey === 'change')
              return {
                kind: 'patchPropertyKeyOrValue',
                propertyPatch: { propertyValue: 10 },
              };
            if (propertyKey === 'remove')
              return { kind: 'deletePropertySubtree' };
            if (options.isTreeRoot) {
              const originalTree = options.preCommandDiscoveredTreeView!;
              const originalRoot = originalTree.getRootVertexHandleOrNull()!;
              const currentRoot =
                options.liveResolvedTreeView.getRootVertexHandleOrNull()!;
              const originalChildren =
                originalTree.getChildVertexHandlesOrNull(originalRoot)!;
              snapshot = {
                rootIsIndependent: originalRoot !== currentRoot,
                childKeys: originalChildren.map(
                  (ref) =>
                    ref.getCurrentVertexView().getVertexData().propertyKey,
                ),
                childValues: originalChildren.map(
                  (ref) =>
                    ref.getCurrentVertexView().getVertexData().propertyValue,
                ),
                parentsPointToSnapshotRoot: originalChildren.every(
                  (ref) =>
                    originalTree.getParentVertexHandleOrNull(ref) ===
                    originalRoot,
                ),
              };
            }
            return undefined;
          },
        },
      ),
    );

    expect(outputAtReturn).toEqual({ change: 10 });
    expect(snapshot).toEqual({
      rootIsIndependent: true,
      childKeys: ['change', 'remove'],
      childValues: [1, 2],
      parentsPointToSnapshotRoot: true,
    });
  });

  test('outputAtReturn remains the return-time snapshot when its halted runner resumes', () => {
    const input = { propertyValue: 1 };
    let haltedAtRoot = false;

    const result = rewriteObject(input, {
      visitors: {
        [DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES]: [
          {
            descendingExecutionPriorityWithinGroup: 200,
            visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
            visitor: (_vertex, { isTreeRoot }) => {
              if (!isTreeRoot || haltedAtRoot) return undefined;
              haltedAtRoot = true;
              return {
                commands: [
                  {
                    commandName:
                      TraversalVisitorCommandName.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
                  },
                ],
              };
            },
          },
        ],
      },
      rewritePropertyAfterChildTraversal: ({ propertyValue: propertyValue }) =>
        typeof propertyValue === 'number'
          ? {
              kind: 'patchPropertyKeyOrValue',
              propertyPatch: { propertyValue: propertyValue + 1 },
            }
          : undefined,
    });

    expect(result.traversalRunner.getTraversalLifecycleStatus()).toBe(
      TraversalRunnerStatus.SUSPENDED,
    );
    expect(capturedOutputValue(result)).toBe(input);
    expect(capturedOutputValue(result)).toEqual({ propertyValue: 1 });

    result.traversalRunner.runUntilSuspendedOrTerminal();
    const finalRoot = result.traversalRunner
      .getLiveResolvedTreeView()
      .getRootVertexHandleOrNull()!;

    expect(result.traversalRunner.getTraversalLifecycleStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
    expect(
      finalRoot.getCurrentVertexView().getVertexData().propertyValue,
    ).toEqual({ propertyValue: 2 });
    expect(capturedOutputValue(result)).toBe(input);
    expect(capturedOutputValue(result)).toEqual({ propertyValue: 1 });
  });

  test('retains nested null and undefined values and can explicitly rewrite to them', () => {
    const outputAtReturn = capturedOutputValue(
      rewriteObject(
        {
          nullValue: null,
          undefinedValue: undefined,
          nested: [null, undefined, 3, 4],
        },
        {
          rewritePropertyAfterChildTraversal: ({
            propertyValue: propertyValue,
          }) => {
            if (propertyValue === 3)
              return {
                kind: 'patchPropertyKeyOrValue',
                propertyPatch: { propertyValue: undefined },
              };
            if (propertyValue === 4)
              return {
                kind: 'patchPropertyKeyOrValue',
                propertyPatch: { propertyValue: null },
              };
            return undefined;
          },
        },
      ),
    );

    expect(outputAtReturn).toEqual({
      nullValue: null,
      undefinedValue: undefined,
      nested: [null, undefined, undefined, null],
    });
    expect(Object.keys(outputAtReturn!)).toEqual([
      'nullValue',
      'undefinedValue',
      'nested',
    ]);
  });

  test('reconstructs symbols and prototype-like own keys as data properties', () => {
    const symbolKey = Symbol('secret');
    const input = Object.create(null) as Record<PropertyKey, number>;
    Object.defineProperty(input, '__proto__', {
      value: 1,
      enumerable: true,
    });
    Object.defineProperties(input, {
      constructor: { value: 2, enumerable: true },
      prototype: { value: 3, enumerable: true },
    });
    input[symbolKey] = 4;

    const outputAtReturn = capturedOutputValue(
      rewriteObject(input, {
        rewritePropertyAfterChildTraversal: ({
          propertyValue: propertyValue,
        }) =>
          typeof propertyValue === 'number'
            ? {
                kind: 'patchPropertyKeyOrValue',
                propertyPatch: { propertyValue: propertyValue * 10 },
              }
            : undefined,
      }),
    );

    expect(Object.getPrototypeOf(outputAtReturn)).toBe(Object.prototype);
    expect(Reflect.ownKeys(outputAtReturn!)).toEqual([
      '__proto__',
      'constructor',
      'prototype',
      symbolKey,
    ]);
    expect(outputAtReturn).toEqual({
      ['__proto__']: 10,
      constructor: 20,
      prototype: 30,
      [symbolKey]: 40,
    });
  });

  test('reads enumerable accessors once while excluding inherited and non-enumerable properties', () => {
    let getterReads = 0;
    const inheritedSymbol = Symbol('inherited');
    const prototype = { inherited: 1, [inheritedSymbol]: 4 };
    const input = Object.create(prototype) as {
      computed: number;
      hidden?: number;
      inherited: number;
    };
    Object.defineProperty(input, 'computed', {
      enumerable: true,
      get: () => {
        getterReads += 1;
        return 2;
      },
    });
    Object.defineProperty(input, 'hidden', {
      enumerable: false,
      value: 3,
    });

    const outputAtReturn = capturedOutputValue(rewriteObject(input));

    expect(outputAtReturn).toEqual({ computed: 2 });
    expect(getterReads).toBe(1);
    expect(Object.getOwnPropertyDescriptor(outputAtReturn, 'computed')).toEqual(
      {
        configurable: true,
        enumerable: true,
        value: 2,
        writable: true,
      },
    );
    expect(
      Object.prototype.hasOwnProperty.call(outputAtReturn, 'inherited'),
    ).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(outputAtReturn, 'hidden')).toBe(
      false,
    );
    expect(
      Object.prototype.hasOwnProperty.call(outputAtReturn, inheritedSymbol),
    ).toBe(false);
  });

  test('rewrites a deeply nested object without recursive call-stack growth', () => {
    const depth = 6000;
    const input: { child?: unknown; leaf?: number } = { leaf: 1 };
    let cursor = input;
    for (let index = 0; index < depth; index += 1) {
      const parent: { child: typeof cursor } = { child: cursor };
      cursor = parent;
    }

    const outputAtReturn = capturedOutputValue(
      rewriteObject(cursor, {
        rewritePropertyAfterChildTraversal: ({
          propertyKey: propertyKey,
          propertyValue: propertyValue,
        }) =>
          propertyKey === 'leaf' && propertyValue === 1
            ? {
                kind: 'patchPropertyKeyOrValue',
                propertyPatch: { propertyValue: 2 },
              }
            : undefined,
      }),
    );

    let outputCursor: unknown = outputAtReturn;
    for (let index = 0; index < depth; index += 1) {
      outputCursor = (outputCursor as { child: unknown }).child;
    }
    expect(outputCursor).toEqual({ leaf: 2 });
  });

  test('a hook that substitutes an ancestor identity is rejected as a cycle', () => {
    const input = { child: { leaf: 1 } };
    const tree = new ObjectPropertyTreeSource<typeof input>(input, {
      resolveChildPropertyOrUseDefault: (hint) =>
        hint.propertyKey === 'child'
          ? {
              kind: 'vertexResolved',
              resolvedVertexInput: {
                vertexContentInput: {
                  $vertexData: {
                    propertyKey: hint.propertyKey,
                    propertyValue: input,
                  },
                  $childDiscoveryHints: [
                    { propertyKey: 'again', propertyValue: input },
                  ],
                },
              },
            }
          : { kind: 'useDefaultChildPropertyResolution' },
    });
    const traversal = new DepthFirstTreeTraversalBuilder({
      treeDiscoverySource: tree,
    });

    expect(() =>
      traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    ).toThrow(/cycle.*\$\.child.*ancestor at \$/i);
  });

  test('repeated object identities remain valid across interleaved runners', () => {
    const shared = { leaf: 1 };
    const tree = new ObjectPropertyTreeSource({ left: shared, right: shared });
    const makeTraversal = () => {
      const keys: PropertyKey[] = [];
      const traversal = new DepthFirstTreeTraversalBuilder({
        treeDiscoverySource: tree,
      });
      traversal.registerVisitorCallbackForPhase(
        DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
        (vertex, { isTreeRoot }) => {
          if (!isTreeRoot) keys.push(vertex.getVertexData().propertyKey);
        },
      );
      return {
        keys,
        iterator: traversal
          .createIndependentRunnerFromCurrentOptions()
          .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
      };
    };
    const first = makeTraversal();
    const second = makeTraversal();

    expect(first.iterator.next().done).toBe(false);
    expect(second.iterator.next().done).toBe(false);
    expect(first.iterator.next().done).toBe(false);
    expect(second.iterator.next().done).toBe(false);
    while (!first.iterator.next().done) {
      // Drain after interleaving both runs.
    }
    while (!second.iterator.next().done) {
      // Drain after interleaving both runs.
    }

    expect(first.keys).toEqual(['left', 'leaf', 'right', 'leaf']);
    expect(second.keys).toEqual(first.keys);
  });
});
