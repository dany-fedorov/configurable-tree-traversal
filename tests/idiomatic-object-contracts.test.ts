import {
  createObjectMutationBinder,
  DepthFirstPhase,
  rewriteObject,
  TraversalVisitorCommandName,
  traverseTreeDepthFirst,
  type VertexTypes,
  type ObjectTreeVertexTypes,
  type ObjectCurrentVertexTypes,
} from '../src';

describe('object callback and patch contracts', () => {
  test('observes preorder rewrites through current properties, refs, paths and tree while retaining original input', () => {
    const outputKey = Symbol('output');
    const seen: unknown[] = [];
    const result = rewriteObject<
      number,
      string,
      number,
      unknown,
      symbol,
      string
    >(1, {
      retainOriginalTreeStructure: true,
      getRootPropertyFromInputObject: (value) => ({ key: 'input', value }),
      getChildrenOfProperty: () => [],
      visitors: {
        [DepthFirstPhase.PRE_ORDER]: () => ({
          commands: [
            {
              commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
              commandArguments: {
                newData: { key: outputKey, value: 'changed' },
              },
            },
          ],
        }),
      },
      rewrite(prop, context) {
        seen.push(
          prop,
          context.vertex.getData(),
          context.vertexRef.getValue().getData(),
          context.resolvedTree.getRoot()!.getValue().getData(),
        );
        expect(context.getKeyPath()).toEqual([outputKey]);
        expect(
          context.originalTreeView!.getRoot()!.getValue().getData(),
        ).toEqual({ key: 'input', value: 1 });
        return undefined;
      },
    });
    expect(seen).toEqual(Array(4).fill({ key: outputKey, value: 'changed' }));
    expect(result.getOutput()).toBe('changed');
  });

  test.each(['array', 'object'] as const)(
    'supplies rewritten values to custom %s classification and assembly',
    (kind) => {
      const seen: unknown[] = [];
      const result = rewriteObject<
        number,
        PropertyKey,
        number,
        unknown,
        PropertyKey,
        string
      >(1, {
        getRootPropertyFromInputObject: (value) => ({ key: 'root', value }),
        getChildrenOfProperty: () => [],
        visitors: {
          [DepthFirstPhase.PRE_ORDER]: (vertex) => ({
            commands: [
              {
                commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
                commandArguments: {
                  newData: { key: vertex.getData().key, value: 'changed' },
                },
              },
            ],
          }),
        },
        isArray: (prop) => {
          seen.push(prop.value);
          return kind === 'array';
        },
        isObject: (prop) => {
          seen.push(prop.value);
          return kind === 'object';
        },
        assembleArray: (_children, prop) => {
          seen.push(prop.value);
          return 'assembled array';
        },
        assembleObject: (_children, prop) => {
          seen.push(prop.value);
          return 'assembled object';
        },
      });
      expect(seen).toEqual(['changed', 'changed', 'changed']);
      expect(result.getOutput()).toBe(`assembled ${kind}`);
    },
  );

  test.each(['array', 'object'] as const)(
    'passes unchanged numeric children to custom %s assemblers',
    (kind) => {
      const childrenSeen: unknown[] = [];
      const result = rewriteObject<
        number,
        string,
        number,
        unknown,
        string,
        string
      >(0, {
        getRootPropertyFromInputObject: (value) => ({ key: 'root', value }),
        getChildrenOfProperty: (prop) =>
          prop.key === 'root' ? [{ key: 'child', value: 1 }] : [],
        isArray: (prop) => prop.key === 'root' && kind === 'array',
        isObject: (prop) => prop.key === 'root' && kind === 'object',
        assembleArray: (children) => {
          childrenSeen.push(children);
          return 'assembled';
        },
        assembleObject: (children) => {
          childrenSeen.push(children);
          return 'assembled';
        },
        rewrite: () => undefined,
      });
      expect(childrenSeen).toEqual([[{ key: 'child', value: 1 }]]);
      expect(result.getOutput()).toBe('assembled');
    },
  );

  test('preserves extended payload metadata when applying key/value patches', () => {
    const metadataKey = Symbol('metadata');
    const metadata = { retained: true };
    type Prop = {
      key: PropertyKey;
      value: unknown;
      note: object;
      [metadataKey]: object;
    };
    type Types = VertexTypes<Prop, Prop>;
    const bind = createObjectMutationBinder<Types, Types>();
    const newKey = Symbol('renamed');
    const runner = traverseTreeDepthFirst<Types>({
      traversableTree: {
        resolveRoot: () => ({
          kind: 'found',
          vertex: {
            vertexContent: {
              $data: {
                key: 'root',
                value: 1,
                note: metadata,
                [metadataKey]: metadata,
              },
              $childHints: [],
            },
          },
        }),
        resolveChild: () => ({ kind: 'omitted' }),
      },
      visitors: {
        [DepthFirstPhase.POST_ORDER]: (vertex, context) => ({
          commands: [
            bind(vertex, context).makeMutationCommand({
              rewrite: { key: newKey, value: undefined },
            }),
          ],
        }),
      },
    });
    const prop = runner.getResolvedTreeView().getRoot()!.getValue().getData();
    expect(prop).toEqual({
      key: newKey,
      value: undefined,
      note: metadata,
      [metadataKey]: metadata,
    });
    expect(Object.prototype.hasOwnProperty.call(prop, 'value')).toBe(true);
    expect(prop.note).toBe(metadata);
    expect(prop[metadataKey]).toBe(metadata);
  });

  test.each([
    { field: 'note', enumerable: true },
    { field: Symbol('note'), enumerable: true },
    { field: 'hidden', enumerable: false },
    { field: Symbol('hidden'), enumerable: false },
  ])(
    'rejects unknown own patch field $field (enumerable=$enumerable) before returning a command',
    ({ field, enumerable }) => {
      type Prop = { key: string; value: number; note: string };
      type Types = VertexTypes<Prop, Prop>;
      const bind = createObjectMutationBinder<Types, Types>();
      let current: unknown;
      expect(() =>
        traverseTreeDepthFirst<Types>({
          traversableTree: {
            resolveRoot: () => ({
              kind: 'found',
              vertex: {
                vertexContent: {
                  $data: { key: 'root', value: 1, note: 'old' },
                  $childHints: [],
                },
              },
            }),
            resolveChild: () => ({ kind: 'omitted' }),
          },
          visitors: {
            [DepthFirstPhase.POST_ORDER]: (vertex, context) => {
              current = vertex.getData();
              const command = Reflect.apply(
                bind(vertex, context).makeMutationCommand,
                undefined,
                [
                  {
                    rewrite: Object.defineProperty({}, field, {
                      value: 'new',
                      enumerable,
                    }),
                  },
                ],
              );
              return { commands: [command] };
            },
          },
        }),
      ).toThrow(TypeError);
      expect(current).toEqual({ key: 'root', value: 1, note: 'old' });
    },
  );
});

describe('independent key/value patch domains', () => {
  test.each([
    {
      patch: { value: 'changed' },
      expected: { key: 'input', value: 'changed' },
    },
    {
      patch: { key: 'output' as const },
      expected: { key: 'output', value: 1 },
    },
  ])(
    'retains mixed records after patch $patch across classifiers and live callback paths',
    ({ patch, expected }) => {
      type Input = ObjectTreeVertexTypes<'input', number>;
      type Output = ObjectTreeVertexTypes<'output', string>;
      const bind = createObjectMutationBinder<Input, Output>();
      const observed: unknown[] = [];
      const result = rewriteObject<
        number,
        'input',
        number,
        unknown,
        'output',
        string
      >(1, {
        retainOriginalTreeStructure: true,
        getRootPropertyFromInputObject: (value) => ({ key: 'input', value }),
        getChildrenOfProperty: () => [],
        visitors: {
          [DepthFirstPhase.PRE_ORDER]: (vertex, context) => ({
            commands: [
              bind(vertex, context).makeMutationCommand({ rewrite: patch }),
            ],
          }),
        },
        isArray: (prop) => {
          observed.push(prop);
          return false;
        },
        isObject: (prop) => {
          observed.push(prop);
          return false;
        },
        rewrite(prop, context) {
          observed.push(
            prop,
            context.vertex.getData(),
            context.vertexRef.getValue().getData(),
            context.resolvedTree.getRoot()!.getValue().getData(),
          );
          expect(
            context.originalTreeView!.getRoot()!.getValue().getData(),
          ).toEqual({ key: 'input', value: 1 });
          return undefined;
        },
      });
      expect(observed).toEqual(Array(6).fill(expected));
      expect(
        result.traversalRunner
          .getResolvedTreeView()
          .getRoot()!
          .getValue()
          .getData(),
      ).toEqual(expected);
      expect(result.getOutput()).toBe(expected.value);
    },
  );
});

test.each(['value', 'key'] as const)(
  'supplies mixed %s-patched children and previous refs to postorder assembly',
  (field) => {
    type Input = ObjectTreeVertexTypes<'input', number>;
    type Output = ObjectTreeVertexTypes<'output', string>;
    const bind = createObjectMutationBinder<Input, Output>();
    const previous: unknown[] = [];
    const assembledChildren: unknown[] = [];
    const result = rewriteObject<
      number,
      'input',
      number,
      unknown,
      'output',
      string
    >(0, {
      getRootPropertyFromInputObject: (value) => ({ key: 'input', value }),
      getChildrenOfProperty: (prop) =>
        prop.value === 0
          ? [
              { key: 'input', value: 1 },
              { key: 'input', value: 2 },
            ]
          : [],
      visitors: {
        [DepthFirstPhase.PRE_ORDER]: (vertex, context) =>
          vertex.getData().value === 0
            ? undefined
            : {
                commands: [
                  bind(vertex, context).makeMutationCommand({
                    rewrite:
                      field === 'value'
                        ? { value: 'changed' }
                        : { key: 'output' },
                  }),
                ],
              },
      },
      isObject: (prop) => prop.value === 0,
      assembleObject(children) {
        assembledChildren.push(children);
        return 'assembled';
      },
      rewrite(prop, context) {
        if (prop.value !== 0 && context.previousPhaseVertexRef !== null) {
          previous.push(context.previousPhaseVertexRef.getValue().getData());
        }
        return undefined;
      },
    });
    if (field === 'value') {
      expect(previous).toEqual([{ key: 'input', value: 'changed' }]);
      expect(assembledChildren).toEqual([
        [
          { key: 'input', value: 'changed' },
          { key: 'input', value: 'changed' },
        ],
      ]);
    } else {
      expect(previous).toEqual([{ key: 'output', value: 1 }]);
      expect(assembledChildren).toEqual([
        [
          { key: 'output', value: 1 },
          { key: 'output', value: 2 },
        ],
      ]);
    }
    expect(result.getOutput()).toBe('assembled');
  },
);

test('retains input metadata after a partial output patch through a generic traversal', () => {
  type InputProp = { key: 'input'; value: number; tag: 'input'; note: object };
  type OutputProp = {
    key: 'output';
    value: string;
    tag: 'output';
    otherNote: object;
  };
  type Input = VertexTypes<InputProp, InputProp>;
  type Output = VertexTypes<OutputProp, OutputProp>;
  type Current = ObjectCurrentVertexTypes<Input, Output>;
  const note = { retained: true };
  const seen: unknown[] = [];
  const bind = createObjectMutationBinder<Input, Output>({
    isArray: (prop) => {
      seen.push(prop);
      return false;
    },
  });
  const runner = traverseTreeDepthFirst<Input, Current>({
    retainOriginalTreeStructure: true,
    traversableTree: {
      resolveRoot: () => ({
        kind: 'found',
        vertex: {
          vertexContent: {
            $data: { key: 'input', value: 1, tag: 'input', note },
            $childHints: [],
          },
        },
      }),
      resolveChild: () => ({ kind: 'omitted' }),
    },
    visitors: {
      [DepthFirstPhase.PRE_ORDER]: (vertex, context) => ({
        commands: [
          bind(vertex, context).makeMutationCommand({
            rewrite: { value: 'changed' },
          }),
        ],
      }),
      [DepthFirstPhase.POST_ORDER]: (vertex, context) => {
        bind(vertex, context);
        expect(
          context.originalTreeView!.getRoot()!.getValue().getData(),
        ).toEqual({ key: 'input', value: 1, tag: 'input', note });
      },
    },
  });
  expect(seen).toEqual([
    { key: 'input', value: 1, tag: 'input', note },
    { key: 'input', value: 'changed', tag: 'input', note },
  ]);
  const data = runner.getResolvedTreeView().getRoot()!.getValue().getData();
  expect(data).toEqual({ key: 'input', value: 'changed', tag: 'input', note });
  if (data.tag !== 'input') throw new Error('Expected retained input metadata');
  expect(data.note).toBe(note);
});
