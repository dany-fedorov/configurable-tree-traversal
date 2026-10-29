import {
  rewriteObject,
  ObjectTreeSource,
  AsyncDepthFirstTreeTraversal,
  DepthFirstPhase,
  type ObjectTreeVertexTypes,
} from '../src';

type Options = NonNullable<Parameters<typeof rewriteObject>[1]>;
const run = (input: unknown, options: object = {}) =>
  rewriteObject(input, options as Options).getOutput();

describe('explicit object mutation and reconstruction policies', () => {
  test('rejects duplicate rewritten object keys by default', () => {
    expect(() =>
      run(
        { a: 1, b: 2 },
        {
          rewrite: (p: { key: PropertyKey }) =>
            p.key === 'b'
              ? { kind: 'rewrite', patch: { key: 'a' } }
              : undefined,
        },
      ),
    ).toThrow(TypeError);
  });

  test.each(['firstWins', 'lastWins'] as const)(
    'normalizes number/string keys for %s',
    (propertyCollision) => {
      expect(
        run(
          { a: 1, b: 2 },
          {
            propertyCollision,
            rewrite: (p: { key: PropertyKey }) =>
              p.key === 'a'
                ? { kind: 'rewrite', patch: { key: 1 } }
                : p.key === 'b'
                ? { kind: 'rewrite', patch: { key: '1' } }
                : undefined,
          },
        ),
      ).toEqual({ 1: propertyCollision === 'firstWins' ? 1 : 2 });
    },
  );

  test('preserves distinct symbol identity and opaque payload identity', () => {
    const a = Symbol('same');
    const b = Symbol('same');
    const value = () => 1;
    expect(run({ [a]: value, [b]: 2 })).toEqual({ [a]: value, [b]: 2 });
  });

  test('preserves shifted numeric positions and holes on request', () => {
    const output = run([10, 20], {
      arrayIndexPolicy: 'preserveNumericKeys',
      rewrite: (p: { key: PropertyKey }) =>
        typeof p.key === 'number'
          ? { kind: 'rewrite', patch: { key: p.key + 2 } }
          : undefined,
    });
    expect(output).toEqual([, , 10, 20]);
    expect(Object.prototype.hasOwnProperty.call(output, '0')).toBe(false);
  });

  test('preserves intrinsic length and trailing holes in sparse arrays', () => {
    const input = new Array(4);
    input[1] = 10;
    const output = run(input, {
      arrayIndexPolicy: 'preserveNumericKeys',
    }) as unknown[];
    expect(output.length).toBe(4);
    expect(Object.keys(output)).toEqual(['1']);
    expect(output[1]).toBe(10);
  });

  test('preserves deletion-created trailing holes', () => {
    const output = run([10, 20], {
      arrayIndexPolicy: 'preserveNumericKeys',
      rewrite: (p: { key: PropertyKey }) =>
        p.key === 1 ? { kind: 'delete' } : undefined,
    }) as unknown[];
    expect(output.length).toBe(2);
    expect(Object.keys(output)).toEqual(['0']);
    expect(output[0]).toBe(10);
  });

  test('derives length from indices for non-arrays classified as arrays', () => {
    const output = run(0, {
      arrayIndexPolicy: 'preserveNumericKeys',
      isArray: (p: { value: unknown }) => p.value === 0,
      getChildrenOfProperty: (p: { value: unknown }) =>
        p.value === 0 ? [{ key: 2, value: 10 }] : [],
    }) as unknown[];
    expect(output).toEqual([, , 10]);
  });

  test('applies keep/delete and preserved holes through an async tree visitor', async () => {
    type T = ObjectTreeVertexTypes<PropertyKey, unknown>;
    const bind = ObjectTreeSource.createObjectMutationBinder<T, T>({
      arrayIndexPolicy: 'preserveNumericKeys',
    });
    const traversal = new AsyncDepthFirstTreeTraversal({
      traversableTree: new ObjectTreeSource([10, 20]),
    });
    traversal.addVisitorFor(
      DepthFirstPhase.POST_ORDER,
      async (vertex, context) => ({
        commands: [
          bind(vertex, context).makeMutationCommand(
            vertex.getData().key === 1 ? { kind: 'delete' } : { kind: 'keep' },
          ),
        ],
      }),
    );
    const runner = await traversal.createRunner().run();
    const output = runner.getResolvedTreeView().getRoot()!.getValue().getData()
      .value as unknown[];
    expect(output.length).toBe(2);
    expect(Object.keys(output)).toEqual(['0']);
    expect(output[0]).toBe(10);
  });

  test('compacts retained numeric values in traversal order by default', () => {
    expect(
      run([10, 20, 30], {
        rewrite: (p: { key: PropertyKey }) =>
          p.key === 1 ? { kind: 'delete' } : { kind: 'keep' },
      }),
    ).toEqual([10, 30]);
  });

  test.each([-1, 0.5, NaN, Infinity, 4294967295])(
    'rejects invalid preserved numeric position %p',
    (key) => {
      expect(() =>
        run([1], {
          arrayIndexPolicy: 'preserveNumericKeys',
          rewrite: (p: { key: PropertyKey }) =>
            typeof p.key === 'number'
              ? { kind: 'rewrite', patch: { key } }
              : undefined,
        }),
      ).toThrow(TypeError);
    },
  );

  test('custom assemblers own placement and collision behavior', () => {
    const assembled = { owned: true };
    expect(
      run([1, 2], {
        arrayIndexPolicy: 'preserveNumericKeys',
        assembleArray: () => assembled,
        rewrite: (p: { key: PropertyKey }) =>
          typeof p.key === 'number'
            ? { kind: 'rewrite', patch: { key: -1 } }
            : undefined,
      }),
    ).toBe(assembled);
    expect(
      run(
        { a: 1, b: 2 },
        {
          assembleObject: () => assembled,
          rewrite: (p: { key: PropertyKey }) =>
            p.key === 'b'
              ? { kind: 'rewrite', patch: { key: 'a' } }
              : undefined,
        },
      ),
    ).toBe(assembled);
  });

  test.each([
    null,
    false,
    {},
    { rewrite: { value: 1 } },
    { delete: true },
    { kind: 'rewrite' },
    { kind: 'rewrite', value: 1 },
    { kind: 'rewrite', patch: {}, delete: true },
    { kind: 'keep', patch: {} },
    { kind: 'delete', value: 1 },
    { kind: 'other' },
    [],
    { kind: 'rewrite', patch: [] },
    { kind: 'keep', [Symbol('extra')]: 1 },
  ])('rejects malformed operation %p', (operation) => {
    expect(() => run({ a: 1 }, { rewrite: () => operation })).toThrow(
      TypeError,
    );
  });

  test.each([
    { arrayIndexPolicy: 'legacy' },
    { propertyCollision: 'legacy' },
    { resolveVertexHook: undefined },
  ])('rejects retired or malformed options before callbacks', (options) => {
    let callbacks = 0;
    expect(() =>
      run(
        {},
        {
          ...options,
          rewrite: () => {
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
      run(1, {
        rewrite: () => ({
          get kind() {
            reads++;
            return reads === 1 ? 'rewrite' : 'delete';
          },
          patch: { value: 2 },
        }),
      }),
    ).toBe(2);
    expect(reads).toBe(1);
  });

  test.each([{ arrayIndexPolicy: null }, { propertyCollision: null }])(
    'rejects defined null policies %p',
    (options) => {
      expect(() => run([], options)).toThrow(TypeError);
    },
  );

  test.each(['error', 'firstWins', 'lastWins'] as const)(
    'applies %s to normalized preserved numeric/named collisions',
    (propertyCollision) => {
      const options = {
        arrayIndexPolicy: 'preserveNumericKeys',
        propertyCollision,
        rewrite: (p: { key: PropertyKey }) =>
          p.key === 1 ? { kind: 'rewrite', patch: { key: '0' } } : undefined,
      };
      if (propertyCollision === 'error') {
        expect(() => run([10, 20], options)).toThrow(TypeError);
      } else {
        expect(run([10, 20], options)).toEqual([
          propertyCollision === 'firstWins' ? 10 : 20,
          ,
        ]);
      }
    },
  );

  test('rejects duplicate symbols but retains the maximum numeric index', () => {
    const key = Symbol('duplicate');
    expect(() =>
      run(
        { a: 1, b: 2 },
        {
          rewrite: (p: { key: PropertyKey }) =>
            p.key === 'a' || p.key === 'b'
              ? { kind: 'rewrite', patch: { key } }
              : undefined,
        },
      ),
    ).toThrow(TypeError);
    const output = run([10], {
      arrayIndexPolicy: 'preserveNumericKeys',
      rewrite: (p: { key: PropertyKey }) =>
        p.key === 0
          ? { kind: 'rewrite', patch: { key: 4294967294 } }
          : undefined,
    }) as unknown[];
    expect(output.length).toBe(4294967295);
    expect(output[4294967294]).toBe(10);
  });

  test('child hook excludes the root and root mapping stays separate', () => {
    const seen: PropertyKey[] = [];
    expect(
      run(
        { a: 1 },
        {
          resolveChildHook: (p: { key: PropertyKey }) => {
            seen.push(p.key);
            return { kind: 'useDefault' };
          },
        },
      ),
    ).toEqual({ a: 1 });
    expect(seen).toEqual(['a']);
    expect(
      () => new ObjectTreeSource({}, { resolveVertexHook: undefined } as never),
    ).toThrow(TypeError);
  });
});
