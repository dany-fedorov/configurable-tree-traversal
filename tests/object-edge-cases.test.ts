import {
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  TraversalVisitorFunctionResolutionStyle,
  TraversableObjectTree,
  rewriteObject as rewriteObjectApi,
} from '../src';

const { rewriteObject } = rewriteObjectApi;

describe('object traversal and rewriting edge cases', () => {
  test('custom assemblers receive renamed children before assembling their parent', () => {
    const assembled: Array<{
      key: PropertyKey;
      children: Array<{ key: PropertyKey; value: unknown }>;
    }> = [];
    let branchCompositeSeenByRewrite: unknown;

    const { outputObject } = rewriteObject(
      { branch: { old: 1, keep: 2 } },
      {
        assembleCompositesBeforeRewrite: true,
        assembleObject: (children, vertexData) => {
          if (vertexData.key === 'branch') {
            assembled.push({ key: vertexData.key, children: [...children] });
          }
          return Object.fromEntries(
            children.map(({ key, value }) => [key, value]),
          );
        },
        rewrite: ({ key, value, assembledComposite }) => {
          if (key === 'old') {
            return { rewrite: { key: 'renamed', value: 10 } };
          }
          if (key === 'branch') {
            branchCompositeSeenByRewrite = assembledComposite;
          }
          return typeof value === 'number'
            ? { rewrite: { value: value * 10 } }
            : undefined;
        },
      },
    );

    expect(branchCompositeSeenByRewrite).toEqual({ renamed: 10, keep: 20 });
    expect(outputObject).toEqual({ branch: { renamed: 10, keep: 20 } });
    expect(assembled).toEqual([
      {
        key: 'branch',
        children: [
          { key: 'renamed', value: 10 },
          { key: 'keep', value: 20 },
        ],
      },
    ]);
  });

  test('custom array assembly sees retained properties after numeric elements compact', () => {
    const tag = Symbol('tag');
    const input: Array<number> & { label?: string; [tag]?: string } = [1, 2, 3];
    input.label = 'numbers';
    input[tag] = 'metadata';
    const assemblyInputs: Array<Array<{ key: PropertyKey; value: unknown }>> =
      [];

    const { outputObject } = rewriteObject(input, {
      assembleArray: (children) => {
        assemblyInputs.push([...children]);
        const result = children
          .filter(({ key }) => typeof key === 'number')
          .map(({ value }) => value);
        for (const { key, value } of children) {
          if (typeof key !== 'number') {
            Object.defineProperty(result, key, {
              value,
              enumerable: true,
            });
          }
        }
        return result;
      },
      rewrite: ({ key, value }) => {
        if (value === 2) return { delete: true };
        if (key === 'label') return { rewrite: { key: 'name' } };
        return undefined;
      },
    });

    expect(assemblyInputs).toEqual([
      [
        { key: 0, value: 1 },
        { key: 2, value: 3 },
        { key: 'name', value: 'numbers' },
        { key: tag, value: 'metadata' },
      ],
    ]);
    expect(Array.from(outputObject!)).toEqual([1, 3]);
    expect((outputObject as unknown as { name: string }).name).toBe('numbers');
    expect(outputObject![tag]).toBe('metadata');
  });

  test('custom classification and assembly reconstruct a specialized composite type', () => {
    class Box {
      constructor(readonly entries: Record<string, unknown>) {}
    }
    const input = { boxed: new Box({ first: 1, second: 2 }) };

    const { outputObject } = rewriteObject(input, {
      getChildrenOfProperty: (property) =>
        property.value instanceof Box
          ? Object.entries(property.value.entries).map(([key, value]) => ({
              key,
              value,
            }))
          : TraversableObjectTree.getChildrenOfPropertyDefault(property),
      isObject: ({ value }) =>
        value !== null && typeof value === 'object' && !Array.isArray(value),
      assembleObject: (children, property) => {
        const entries = Object.fromEntries(
          children.map(({ key, value }) => [key, value]),
        );
        return property.value instanceof Box ? new Box(entries) : entries;
      },
      rewrite: ({ value }) =>
        typeof value === 'number'
          ? { rewrite: { value: value * 10 } }
          : undefined,
    });

    expect(outputObject).toEqual({
      boxed: new Box({ first: 10, second: 20 }),
    });
    expect(outputObject!.boxed).toBeInstanceOf(Box);
    expect(input.boxed.entries).toEqual({ first: 1, second: 2 });
  });

  test('makeVertexHook can prune one property and replace another subtree', () => {
    const visited: PropertyKey[] = [];

    const { outputObject } = rewriteObject(
      {
        keep: 1,
        prune: { hidden: 2 },
        replace: { ignored: 3 },
      },
      {
        makeVertexHook: (hint) => {
          if (hint.key === 'prune') return { returnMe: null };
          if (hint.key === 'replace') {
            return {
              returnMe: {
                $d: { key: 'replacement', value: { visible: 4 } },
                $c: [{ key: 'visible', value: 4 }],
              },
            };
          }
          return {};
        },
        rewrite: ({ key }, { isTreeRoot }) => {
          if (!isTreeRoot) visited.push(key);
          return undefined;
        },
      },
    );

    expect(outputObject).toEqual({ keep: 1, replacement: { visible: 4 } });
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

    const { outputObject } = rewriteObject(
      { change: 1, remove: 2 },
      {
        saveNotMutatedResolvedTree: true,
        rewrite: ({ key }, options) => {
          if (key === 'change') return { rewrite: { value: 10 } };
          if (key === 'remove') return { delete: true };
          if (options.isTreeRoot) {
            const originalTree = options.notMutatedResolvedTree!;
            const originalRoot = originalTree.getRoot()!;
            const currentRoot = options.resolvedTree.getRoot()!;
            const originalChildren = originalTree.getChildrenOf(originalRoot)!;
            snapshot = {
              rootIsIndependent: originalRoot !== currentRoot,
              childKeys: originalChildren.map(
                (ref) => ref.unref().getData().key,
              ),
              childValues: originalChildren.map(
                (ref) => ref.unref().getData().value,
              ),
              parentsPointToSnapshotRoot: originalChildren.every(
                (ref) => originalTree.getParentOf(ref) === originalRoot,
              ),
            };
          }
          return undefined;
        },
      },
    );

    expect(outputObject).toEqual({ change: 10 });
    expect(snapshot).toEqual({
      rootIsIndependent: true,
      childKeys: ['change', 'remove'],
      childValues: [1, 2],
      parentsPointToSnapshotRoot: true,
    });
  });

  test('outputObject remains the return-time snapshot when its halted runner resumes', () => {
    const input = { value: 1 };
    let haltedAtRoot = false;

    const result = rewriteObject(input, {
      visitors: {
        [DepthFirstTraversalOrder.POST_ORDER]: [
          {
            addedIndex: 0,
            priority: 200,
            resolutionStyle: TraversalVisitorFunctionResolutionStyle.SEQUENTIAL,
            visitor: (_vertex, { isTreeRoot }) => {
              if (!isTreeRoot || haltedAtRoot) return undefined;
              haltedAtRoot = true;
              return {
                commands: [
                  {
                    commandName: TraversalVisitorCommandName.HALT_TRAVERSAL,
                  },
                ],
              };
            },
          },
        ],
      },
      rewrite: ({ value }) =>
        typeof value === 'number'
          ? { rewrite: { value: value + 1 } }
          : undefined,
    });

    expect(result.traversalRunner.getStatus()).toBe(
      TraversalRunnerStatus.HALTED,
    );
    expect(result.outputObject).toBe(input);
    expect(result.outputObject).toEqual({ value: 1 });

    result.traversalRunner.run();
    const finalRoot = result.traversalRunner.getResolvedTree().getRoot()!;

    expect(result.traversalRunner.getStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
    expect(finalRoot.unref().getData().value).toEqual({ value: 2 });
    expect(result.outputObject).toBe(input);
    expect(result.outputObject).toEqual({ value: 1 });
  });

  test('retains nested null and undefined values and can explicitly rewrite to them', () => {
    const { outputObject } = rewriteObject(
      {
        nullValue: null,
        undefinedValue: undefined,
        nested: [null, undefined, 3, 4],
      },
      {
        rewrite: ({ value }) => {
          if (value === 3) return { rewrite: { value: undefined } };
          if (value === 4) return { rewrite: { value: null } };
          return undefined;
        },
      },
    );

    expect(outputObject).toEqual({
      nullValue: null,
      undefinedValue: undefined,
      nested: [null, undefined, undefined, null],
    });
    expect(Object.keys(outputObject!)).toEqual([
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

    const { outputObject } = rewriteObject(input, {
      rewrite: ({ value }) =>
        typeof value === 'number'
          ? { rewrite: { value: value * 10 } }
          : undefined,
    });

    expect(Object.getPrototypeOf(outputObject)).toBe(Object.prototype);
    expect(Reflect.ownKeys(outputObject!)).toEqual([
      '__proto__',
      'constructor',
      'prototype',
      symbolKey,
    ]);
    expect(outputObject).toEqual({
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

    const { outputObject } = rewriteObject(input);

    expect(outputObject).toEqual({ computed: 2 });
    expect(getterReads).toBe(1);
    expect(Object.getOwnPropertyDescriptor(outputObject, 'computed')).toEqual({
      configurable: true,
      enumerable: true,
      value: 2,
      writable: true,
    });
    expect(
      Object.prototype.hasOwnProperty.call(outputObject, 'inherited'),
    ).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(outputObject, 'hidden')).toBe(
      false,
    );
    expect(
      Object.prototype.hasOwnProperty.call(outputObject, inheritedSymbol),
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

    const { outputObject } = rewriteObject(cursor, {
      rewrite: ({ key, value }) =>
        key === 'leaf' && value === 1 ? { rewrite: { value: 2 } } : undefined,
    });

    let outputCursor: unknown = outputObject;
    for (let index = 0; index < depth; index += 1) {
      outputCursor = (outputCursor as { child: unknown }).child;
    }
    expect(outputCursor).toEqual({ leaf: 2 });
  });

  test('a hook that substitutes an ancestor identity is rejected as a cycle', () => {
    const input = { child: { leaf: 1 } };
    const tree = new TraversableObjectTree(input, {
      makeVertexHook: (hint) =>
        hint.key === 'child'
          ? {
              returnMe: {
                $d: { key: hint.key, value: input },
                $c: [{ key: 'again', value: input }],
              },
            }
          : {},
    });
    const traversal = new DepthFirstTraversal({ traversableTree: tree });

    expect(() => traversal.makeRunner().run()).toThrow(
      /cycle.*\$\.child.*ancestor at \$/i,
    );
  });

  test('repeated object identities remain valid across interleaved runners', () => {
    const shared = { leaf: 1 };
    const tree = new TraversableObjectTree({ left: shared, right: shared });
    const makeTraversal = () => {
      const keys: PropertyKey[] = [];
      const traversal = new DepthFirstTraversal({ traversableTree: tree });
      traversal.addVisitorFor(
        DepthFirstTraversalOrder.PRE_ORDER,
        (vertex, { isTreeRoot }) => {
          if (!isTreeRoot) keys.push(vertex.getData().key);
        },
      );
      return { keys, iterator: traversal.makeRunner().getIterable() };
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
