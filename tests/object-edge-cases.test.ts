import { capturedOutputValue } from './helpers/rewriteOutput';
import {
  DepthFirstPhase,
  DepthFirstTreeTraversal,
  objectRewrite as rewriteObjectApi,
  ObjectTreeSource,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
} from '../src';

const { rewriteObject, rewriteObjectAs } = rewriteObjectApi;

describe('object traversal and rewriting edge cases', () => {
  test('custom assemblers receive renamed children before assembling their parent', () => {
    const assembled: Array<{
      key: PropertyKey;
      children: Array<{ key: PropertyKey; value: unknown }>;
    }> = [];
    let branchCompositeSeenByRewrite: unknown;

    const outputAtReturn = capturedOutputValue(
      rewriteObject(
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
              return { kind: 'rewrite', patch: { key: 'renamed', value: 10 } };
            }
            if (key === 'branch') {
              branchCompositeSeenByRewrite = assembledComposite;
            }
            return typeof value === 'number'
              ? { kind: 'rewrite', patch: { value: value * 10 } }
              : undefined;
          },
        },
      ),
    );

    expect(branchCompositeSeenByRewrite).toEqual({ renamed: 10, keep: 20 });
    expect(outputAtReturn).toEqual({ branch: { renamed: 10, keep: 20 } });
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

    const outputAtReturn = capturedOutputValue(
      rewriteObjectAs<number[] & { name: string; [tag]: string }>(input, {
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
          if (value === 2) return { kind: 'delete' };
          if (key === 'label')
            return { kind: 'rewrite', patch: { key: 'name' } };
          return undefined;
        },
      }),
    );

    expect(assemblyInputs).toEqual([
      [
        { key: 0, value: 1 },
        { key: 2, value: 3 },
        { key: 'name', value: 'numbers' },
        { key: tag, value: 'metadata' },
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
      rewriteObjectAs<typeof input>(input, {
        getChildrenOfProperty: (property) =>
          property.value instanceof Box
            ? Object.entries(property.value.entries).map(([key, value]) => ({
                key,
                value,
              }))
            : ObjectTreeSource.getChildrenOfPropertyDefault(property),
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
            ? { kind: 'rewrite', patch: { value: value * 10 } }
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
          resolveChildHook: (hint) => {
            if (hint.key === 'prune') return { kind: 'omitted' };
            if (hint.key === 'replace') {
              return {
                kind: 'found',
                vertex: {
                  vertexContent: {
                    $data: { key: 'replacement', value: { visible: 4 } },
                    $childHints: [{ key: 'visible', value: 4 }],
                  },
                },
              };
            }
            return { kind: 'useDefault' };
          },
          rewrite: ({ key }, { isTreeRoot }) => {
            if (!isTreeRoot) visited.push(key);
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
          retainOriginalTreeStructure: true,
          rewrite: ({ key }, options) => {
            if (key === 'change')
              return { kind: 'rewrite', patch: { value: 10 } };
            if (key === 'remove') return { kind: 'delete' };
            if (options.isTreeRoot) {
              const originalTree = options.originalTreeView!;
              const originalRoot = originalTree.getRoot()!;
              const currentRoot = options.resolvedTreeView.getRoot()!;
              const originalChildren =
                originalTree.getChildrenOf(originalRoot)!;
              snapshot = {
                rootIsIndependent: originalRoot !== currentRoot,
                childKeys: originalChildren.map(
                  (ref) => ref.getValue().getData().key,
                ),
                childValues: originalChildren.map(
                  (ref) => ref.getValue().getData().value,
                ),
                parentsPointToSnapshotRoot: originalChildren.every(
                  (ref) => originalTree.getParentOf(ref) === originalRoot,
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
    const input = { value: 1 };
    let haltedAtRoot = false;

    const result = rewriteObject(input, {
      visitors: {
        [DepthFirstPhase.POST_ORDER]: [
          {
            priority: 200,
            commandCommitMode: 'afterEachVisitor' as const,
            visitor: (_vertex, { isTreeRoot }) => {
              if (!isTreeRoot || haltedAtRoot) return undefined;
              haltedAtRoot = true;
              return {
                commands: [
                  {
                    commandName: TraversalVisitorCommandName.PAUSE_TRAVERSAL,
                  },
                ],
              };
            },
          },
        ],
      },
      rewrite: ({ value }) =>
        typeof value === 'number'
          ? { kind: 'rewrite', patch: { value: value + 1 } }
          : undefined,
    });

    expect(result.traversalRunner.getStatus()).toBe(
      TraversalRunnerStatus.HALTED,
    );
    expect(capturedOutputValue(result)).toBe(input);
    expect(capturedOutputValue(result)).toEqual({ value: 1 });

    result.traversalRunner.run();
    const finalRoot = result.traversalRunner.getResolvedTreeView().getRoot()!;

    expect(result.traversalRunner.getStatus()).toBe(
      TraversalRunnerStatus.FINISHED,
    );
    expect(finalRoot.getValue().getData().value).toEqual({ value: 2 });
    expect(capturedOutputValue(result)).toBe(input);
    expect(capturedOutputValue(result)).toEqual({ value: 1 });
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
          rewrite: ({ value }) => {
            if (value === 3)
              return { kind: 'rewrite', patch: { value: undefined } };
            if (value === 4) return { kind: 'rewrite', patch: { value: null } };
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
        rewrite: ({ value }) =>
          typeof value === 'number'
            ? { kind: 'rewrite', patch: { value: value * 10 } }
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
        rewrite: ({ key, value }) =>
          key === 'leaf' && value === 1
            ? { kind: 'rewrite', patch: { value: 2 } }
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
    const tree = new ObjectTreeSource<typeof input>(input, {
      resolveChildHook: (hint) =>
        hint.key === 'child'
          ? {
              kind: 'found',
              vertex: {
                vertexContent: {
                  $data: { key: hint.key, value: input },
                  $childHints: [{ key: 'again', value: input }],
                },
              },
            }
          : { kind: 'useDefault' },
    });
    const traversal = new DepthFirstTreeTraversal({ traversableTree: tree });

    expect(() => traversal.createRunner().run()).toThrow(
      /cycle.*\$\.child.*ancestor at \$/i,
    );
  });

  test('repeated object identities remain valid across interleaved runners', () => {
    const shared = { leaf: 1 };
    const tree = new ObjectTreeSource({ left: shared, right: shared });
    const makeTraversal = () => {
      const keys: PropertyKey[] = [];
      const traversal = new DepthFirstTreeTraversal({ traversableTree: tree });
      traversal.addVisitorFor(
        DepthFirstPhase.PRE_ORDER,
        (vertex, { isTreeRoot }) => {
          if (!isTreeRoot) keys.push(vertex.getData().key);
        },
      );
      return { keys, iterator: traversal.createRunner().iterateEvents() };
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
