import { outputValue } from './helpers/rewriteOutput';
import {
  rewriteObject,
  ObjectPropertyTreeSource,
  AsyncDepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase,
  type ObjectPropertyTreeVertexTypes,
} from '../src';

type Options = NonNullable<Parameters<typeof rewriteObject>[1]>;
const runUntilSuspendedOrTerminal = (input: unknown, options: object = {}) =>
  outputValue(rewriteObject(input, options as Options));

describe('explicit object mutation and reconstruction policies', () => {
  test('rejects duplicate rewritten object keys by default', () => {
    expect(() =>
      runUntilSuspendedOrTerminal(
        { a: 1, b: 2 },
        {
          rewritePropertyAfterChildTraversal: (p: {
            propertyKey: PropertyKey;
          }) =>
            p.propertyKey === 'b'
              ? {
                  kind: 'patchPropertyKeyOrValue',
                  propertyPatch: { propertyKey: 'a' },
                }
              : undefined,
        },
      ),
    ).toThrow(TypeError);
  });

  test.each(['keepFirstProperty', 'keepLastProperty'] as const)(
    'normalizes number/string keys for %s',
    (assembledPropertyKeyCollisionPolicy) => {
      expect(
        runUntilSuspendedOrTerminal(
          { a: 1, b: 2 },
          {
            assembledPropertyKeyCollisionPolicy,
            rewritePropertyAfterChildTraversal: (p: {
              propertyKey: PropertyKey;
            }) =>
              p.propertyKey === 'a'
                ? {
                    kind: 'patchPropertyKeyOrValue',
                    propertyPatch: { propertyKey: 1 },
                  }
                : p.propertyKey === 'b'
                ? {
                    kind: 'patchPropertyKeyOrValue',
                    propertyPatch: { propertyKey: '1' },
                  }
                : undefined,
          },
        ),
      ).toEqual({
        1: assembledPropertyKeyCollisionPolicy === 'keepFirstProperty' ? 1 : 2,
      });
    },
  );

  test('preserves distinct symbol identity and opaque payload identity', () => {
    const a = Symbol('same');
    const b = Symbol('same');
    const propertyValue = () => 1;
    expect(runUntilSuspendedOrTerminal({ [a]: propertyValue, [b]: 2 })).toEqual(
      { [a]: propertyValue, [b]: 2 },
    );
  });

  test('preserves shifted numeric positions and holes on request', () => {
    const output = runUntilSuspendedOrTerminal([10, 20], {
      arrayAssemblyIndexPolicy: 'preserveNumericIndicesAndArrayLength',
      rewritePropertyAfterChildTraversal: (p: { propertyKey: PropertyKey }) =>
        typeof p.propertyKey === 'number'
          ? {
              kind: 'patchPropertyKeyOrValue',
              propertyPatch: { propertyKey: p.propertyKey + 2 },
            }
          : undefined,
    });
    expect(output).toEqual([, , 10, 20]);
    expect(Object.prototype.hasOwnProperty.call(output, '0')).toBe(false);
  });

  test('preserves intrinsic length and trailing holes in sparse arrays', () => {
    const input = new Array(4);
    input[1] = 10;
    const output = runUntilSuspendedOrTerminal(input, {
      arrayAssemblyIndexPolicy: 'preserveNumericIndicesAndArrayLength',
    }) as unknown[];
    expect(output.length).toBe(4);
    expect(Object.keys(output)).toEqual(['1']);
    expect(output[1]).toBe(10);
  });

  test('preserves deletion-created trailing holes', () => {
    const output = runUntilSuspendedOrTerminal([10, 20], {
      arrayAssemblyIndexPolicy: 'preserveNumericIndicesAndArrayLength',
      rewritePropertyAfterChildTraversal: (p: { propertyKey: PropertyKey }) =>
        p.propertyKey === 1 ? { kind: 'deletePropertySubtree' } : undefined,
    }) as unknown[];
    expect(output.length).toBe(2);
    expect(Object.keys(output)).toEqual(['0']);
    expect(output[0]).toBe(10);
  });

  test('derives length from indices for non-arrays classified as arrays', () => {
    const output = runUntilSuspendedOrTerminal(0, {
      arrayAssemblyIndexPolicy: 'preserveNumericIndicesAndArrayLength',
      matchesArrayAssemblyPredicate: (p: { propertyValue: unknown }) =>
        p.propertyValue === 0,
      enumerateChildPropertyHints: (p: { propertyValue: unknown }) =>
        p.propertyValue === 0 ? [{ propertyKey: 2, propertyValue: 10 }] : [],
    }) as unknown[];
    expect(output).toEqual([, , 10]);
  });

  test('applies keep/delete and preserved holes through an async tree visitor', async () => {
    type T = ObjectPropertyTreeVertexTypes<PropertyKey, unknown>;
    const bind =
      ObjectPropertyTreeSource.createObjectPropertyMutationHelperBinder<T, T>({
        arrayAssemblyIndexPolicy: 'preserveNumericIndicesAndArrayLength',
      });
    const traversal = new AsyncDepthFirstTreeTraversalBuilder({
      treeDiscoverySource: new ObjectPropertyTreeSource([10, 20]),
    });
    traversal.registerVisitorForPhase(
      DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
      async (vertex, context) => ({
        commands: [
          bind(vertex, context).createObjectPropertyMutationCommand(
            vertex.getVertexData().propertyKey === 1
              ? { kind: 'deletePropertySubtree' }
              : { kind: 'keepPropertyAndAssembleCurrentChildren' },
          ),
        ],
      }),
    );
    const runner = await traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    const output = runner
      .getLiveResolvedTreeView()
      .getRootVertexHandleOrNull()!
      .getCurrentVertexView()
      .getVertexData().propertyValue as unknown[];
    expect(output.length).toBe(2);
    expect(Object.keys(output)).toEqual(['0']);
    expect(output[0]).toBe(10);
  });

  test('compacts retained numeric values in traversal order by default', () => {
    expect(
      runUntilSuspendedOrTerminal([10, 20, 30], {
        rewritePropertyAfterChildTraversal: (p: { propertyKey: PropertyKey }) =>
          p.propertyKey === 1
            ? { kind: 'deletePropertySubtree' }
            : { kind: 'keepPropertyAndAssembleCurrentChildren' },
      }),
    ).toEqual([10, 30]);
  });

  test.each([-1, 0.5, NaN, Infinity, 4294967295])(
    'rejects invalid preserved numeric position %p',
    (propertyKey) => {
      expect(() =>
        runUntilSuspendedOrTerminal([1], {
          arrayAssemblyIndexPolicy: 'preserveNumericIndicesAndArrayLength',
          rewritePropertyAfterChildTraversal: (p: {
            propertyKey: PropertyKey;
          }) =>
            typeof p.propertyKey === 'number'
              ? {
                  kind: 'patchPropertyKeyOrValue',
                  propertyPatch: { propertyKey },
                }
              : undefined,
        }),
      ).toThrow(TypeError);
    },
  );

  test('custom assemblers own placement and collision behavior', () => {
    const assembled = { owned: true };
    expect(
      runUntilSuspendedOrTerminal([1, 2], {
        arrayAssemblyIndexPolicy: 'preserveNumericIndicesAndArrayLength',
        assembleArrayValueFromChildProperties: () => assembled,
        rewritePropertyAfterChildTraversal: (p: { propertyKey: PropertyKey }) =>
          typeof p.propertyKey === 'number'
            ? {
                kind: 'patchPropertyKeyOrValue',
                propertyPatch: { propertyKey: -1 },
              }
            : undefined,
      }),
    ).toBe(assembled);
    expect(
      runUntilSuspendedOrTerminal(
        { a: 1, b: 2 },
        {
          assembleObjectValueFromChildProperties: () => assembled,
          rewritePropertyAfterChildTraversal: (p: {
            propertyKey: PropertyKey;
          }) =>
            p.propertyKey === 'b'
              ? {
                  kind: 'patchPropertyKeyOrValue',
                  propertyPatch: { propertyKey: 'a' },
                }
              : undefined,
        },
      ),
    ).toBe(assembled);
  });

  test.each([
    null,
    false,
    {},
    { rewritePropertyAfterChildTraversal: { propertyValue: 1 } },
    { delete: true },
    { kind: 'patchPropertyKeyOrValue' },
    { kind: 'patchPropertyKeyOrValue', propertyValue: 1 },
    { kind: 'patchPropertyKeyOrValue', propertyPatch: {}, delete: true },
    { kind: 'keepPropertyAndAssembleCurrentChildren', propertyPatch: {} },
    { kind: 'deletePropertySubtree', propertyValue: 1 },
    { kind: 'other' },
    [],
    { kind: 'patchPropertyKeyOrValue', propertyPatch: [] },
    { kind: 'keepPropertyAndAssembleCurrentChildren', [Symbol('extra')]: 1 },
  ])('rejects malformed operation %p', (operation) => {
    expect(() =>
      runUntilSuspendedOrTerminal(
        { a: 1 },
        { rewritePropertyAfterChildTraversal: () => operation },
      ),
    ).toThrow(TypeError);
  });

  test.each([
    { arrayAssemblyIndexPolicy: 'legacy' },
    { assembledPropertyKeyCollisionPolicy: 'legacy' },
    { resolveVertexHook: undefined },
  ])('rejects retired or malformed options before callbacks', (options) => {
    let callbacks = 0;
    expect(() =>
      runUntilSuspendedOrTerminal(
        {},
        {
          ...options,
          rewritePropertyAfterChildTraversal: () => {
            callbacks++;
          },
        },
      ),
    ).toThrow(TypeError);
    expect(callbacks).toBe(0);
  });

  test('reads an operation discriminant once before applying its patch', () => {
    let reads = 0;
    expect(
      runUntilSuspendedOrTerminal(1, {
        rewritePropertyAfterChildTraversal: () => ({
          get kind() {
            reads++;
            return reads === 1
              ? 'patchPropertyKeyOrValue'
              : 'deletePropertySubtree';
          },
          propertyPatch: { propertyValue: 2 },
        }),
      }),
    ).toBe(2);
    expect(reads).toBe(1);
  });

  test.each([
    { arrayAssemblyIndexPolicy: null },
    { assembledPropertyKeyCollisionPolicy: null },
  ])('rejects defined null policies %p', (options) => {
    expect(() => runUntilSuspendedOrTerminal([], options)).toThrow(TypeError);
  });

  test.each([
    'throwOnDuplicateKey',
    'keepFirstProperty',
    'keepLastProperty',
  ] as const)(
    'applies %s to normalized preserved numeric/named collisions',
    (assembledPropertyKeyCollisionPolicy) => {
      const options = {
        arrayAssemblyIndexPolicy: 'preserveNumericIndicesAndArrayLength',
        assembledPropertyKeyCollisionPolicy,
        rewritePropertyAfterChildTraversal: (p: { propertyKey: PropertyKey }) =>
          p.propertyKey === 1
            ? {
                kind: 'patchPropertyKeyOrValue',
                propertyPatch: { propertyKey: '0' },
              }
            : undefined,
      };
      if (assembledPropertyKeyCollisionPolicy === 'throwOnDuplicateKey') {
        expect(() => runUntilSuspendedOrTerminal([10, 20], options)).toThrow(
          TypeError,
        );
      } else {
        expect(runUntilSuspendedOrTerminal([10, 20], options)).toEqual([
          assembledPropertyKeyCollisionPolicy === 'keepFirstProperty' ? 10 : 20,
          ,
        ]);
      }
    },
  );

  test('rejects duplicate symbols but retains the maximum numeric index', () => {
    const propertyKey = Symbol('duplicate');
    expect(() =>
      runUntilSuspendedOrTerminal(
        { a: 1, b: 2 },
        {
          rewritePropertyAfterChildTraversal: (p: {
            propertyKey: PropertyKey;
          }) =>
            p.propertyKey === 'a' || p.propertyKey === 'b'
              ? {
                  kind: 'patchPropertyKeyOrValue',
                  propertyPatch: { propertyKey },
                }
              : undefined,
        },
      ),
    ).toThrow(TypeError);
    const output = runUntilSuspendedOrTerminal([10], {
      arrayAssemblyIndexPolicy: 'preserveNumericIndicesAndArrayLength',
      rewritePropertyAfterChildTraversal: (p: { propertyKey: PropertyKey }) =>
        p.propertyKey === 0
          ? {
              kind: 'patchPropertyKeyOrValue',
              propertyPatch: { propertyKey: 4294967294 },
            }
          : undefined,
    }) as unknown[];
    expect(output.length).toBe(4294967295);
    expect(output[4294967294]).toBe(10);
  });

  test('child hook excludes the root and root mapping stays separate', () => {
    const seen: PropertyKey[] = [];
    expect(
      runUntilSuspendedOrTerminal(
        { a: 1 },
        {
          resolveChildPropertyOrUseDefault: (p: {
            propertyKey: PropertyKey;
          }) => {
            seen.push(p.propertyKey);
            return { kind: 'useDefaultChildPropertyResolution' };
          },
        },
      ),
    ).toEqual({ a: 1 });
    expect(seen).toEqual(['a']);
    expect(
      () =>
        new ObjectPropertyTreeSource({}, {
          resolveVertexHook: undefined,
        } as never),
    ).toThrow(TypeError);
  });
});
