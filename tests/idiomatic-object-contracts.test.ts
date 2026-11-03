import { outputValue } from './helpers/rewriteOutput';
import {
  createObjectPropertyMutationHelperBinder,
  DepthFirstTreeVisitPhase,
  rewriteObject,
  TraversalVisitorCommandName,
  runTreeDepthFirstUntilSuspendedOrTerminal,
  type VertexDataAndChildHintTypes,
  type ObjectPropertyTreeVertexTypes,
  type LiveObjectPropertyVertexTypes,
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
      retainDiscoveredTreeBeforeVisitorCommands: true,
      mapInputToRootProperty: (propertyValue) => ({
        propertyKey: 'input',
        propertyValue: propertyValue,
      }),
      enumerateChildPropertyHints: () => [],
      visitors: {
        [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: () => ({
          commands: [
            {
              commandName:
                TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: {
                replacementVertexData: {
                  propertyKey: outputKey,
                  propertyValue: 'changed',
                },
              },
            },
          ],
        }),
      },
      rewritePropertyAfterChildTraversal(prop, context) {
        seen.push(
          prop,
          context.vertex.getVertexData(),
          context.vertexHandle.getCurrentVertexView().getVertexData(),
          context.liveResolvedTreeView
            .getRootVertexHandleOrNull()!
            .getCurrentVertexView()
            .getVertexData(),
        );
        expect(context.requirePropertyKeyPathFromRoot()).toEqual([outputKey]);
        expect(
          context
            .preCommandDiscoveredTreeView!.getRootVertexHandleOrNull()!
            .getCurrentVertexView()
            .getVertexData(),
        ).toEqual({ propertyKey: 'input', propertyValue: 1 });
        return undefined;
      },
    });
    expect(seen).toEqual(
      Array(4).fill({ propertyKey: outputKey, propertyValue: 'changed' }),
    );
    expect(outputValue(result)).toBe('changed');
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
        mapInputToRootProperty: (propertyValue) => ({
          propertyKey: 'root',
          propertyValue: propertyValue,
        }),
        enumerateChildPropertyHints: () => [],
        visitors: {
          [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: (vertex) => ({
            commands: [
              {
                commandName:
                  TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
                commandArguments: {
                  replacementVertexData: {
                    propertyKey: vertex.getVertexData().propertyKey,
                    propertyValue: 'changed',
                  },
                },
              },
            ],
          }),
        },
        matchesArrayAssemblyPredicate: (prop) => {
          seen.push(prop.propertyValue);
          return kind === 'array';
        },
        matchesObjectAssemblyPredicate: (prop) => {
          seen.push(prop.propertyValue);
          return kind === 'object';
        },
        assembleArrayValueFromChildProperties: (_children, prop) => {
          seen.push(prop.propertyValue);
          return 'assembled array';
        },
        assembleObjectValueFromChildProperties: (_children, prop) => {
          seen.push(prop.propertyValue);
          return 'assembled object';
        },
      });
      expect(seen).toEqual(['changed', 'changed', 'changed']);
      expect(outputValue(result)).toBe(`assembled ${kind}`);
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
        mapInputToRootProperty: (propertyValue) => ({
          propertyKey: 'root',
          propertyValue: propertyValue,
        }),
        enumerateChildPropertyHints: (prop) =>
          prop.propertyKey === 'root'
            ? [{ propertyKey: 'child', propertyValue: 1 }]
            : [],
        matchesArrayAssemblyPredicate: (prop) =>
          prop.propertyKey === 'root' && kind === 'array',
        matchesObjectAssemblyPredicate: (prop) =>
          prop.propertyKey === 'root' && kind === 'object',
        assembleArrayValueFromChildProperties: (children) => {
          childrenSeen.push(children);
          return 'assembled';
        },
        assembleObjectValueFromChildProperties: (children) => {
          childrenSeen.push(children);
          return 'assembled';
        },
        rewritePropertyAfterChildTraversal: () => undefined,
      });
      expect(childrenSeen).toEqual([
        [{ propertyKey: 'child', propertyValue: 1 }],
      ]);
      expect(outputValue(result)).toBe('assembled');
    },
  );

  test('preserves extended payload metadata when applying key/value patches', () => {
    const metadataKey = Symbol('metadata');
    const metadata = { retained: true };
    type Prop = {
      propertyKey: PropertyKey;
      propertyValue: unknown;
      note: object;
      [metadataKey]: object;
    };
    type Types = VertexDataAndChildHintTypes<Prop, Prop>;
    const bind = createObjectPropertyMutationHelperBinder<Types, Types>();
    const newKey = Symbol('renamed');
    const runner = runTreeDepthFirstUntilSuspendedOrTerminal<Types>({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: {
                propertyKey: 'root',
                propertyValue: 1,
                note: metadata,
                [metadataKey]: metadata,
              },
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted',
        }),
      },
      visitors: {
        [DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES]: (vertex, context) => ({
          commands: [
            bind(vertex, context).createObjectPropertyMutationCommand({
              kind: 'patchPropertyKeyOrValue',
              propertyPatch: { propertyKey: newKey, propertyValue: undefined },
            }),
          ],
        }),
      },
    });
    const prop = runner
      .getLiveResolvedTreeView()
      .getRootVertexHandleOrNull()!
      .getCurrentVertexView()
      .getVertexData();
    expect(prop).toEqual({
      propertyKey: newKey,
      propertyValue: undefined,
      note: metadata,
      [metadataKey]: metadata,
    });
    expect(Object.prototype.hasOwnProperty.call(prop, 'propertyValue')).toBe(
      true,
    );
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
      type Prop = { propertyKey: string; propertyValue: number; note: string };
      type Types = VertexDataAndChildHintTypes<Prop, Prop>;
      const bind = createObjectPropertyMutationHelperBinder<Types, Types>();
      let current: unknown;
      expect(() =>
        runTreeDepthFirstUntilSuspendedOrTerminal<Types>({
          treeDiscoverySource: {
            resolveRootVertex: () => ({
              kind: 'vertexResolved',
              resolvedVertexInput: {
                vertexContentInput: {
                  $vertexData: {
                    propertyKey: 'root',
                    propertyValue: 1,
                    note: 'old',
                  },
                  $childDiscoveryHints: [],
                },
              },
            }),
            resolveChildVertexFromHint: () => ({
              kind: 'vertexIntentionallyOmitted',
            }),
          },
          visitors: {
            [DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES]: (
              vertex,
              context,
            ) => {
              current = vertex.getVertexData();
              const command = Reflect.apply(
                bind(vertex, context).createObjectPropertyMutationCommand,
                undefined,
                [
                  {
                    kind: 'patchPropertyKeyOrValue',
                    propertyPatch: Object.defineProperty({}, field, {
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
      expect(current).toEqual({
        propertyKey: 'root',
        propertyValue: 1,
        note: 'old',
      });
    },
  );
});

describe('independent key/value patch domains', () => {
  test.each([
    {
      propertyPatch: { propertyValue: 'changed' },
      expected: { propertyKey: 'input', propertyValue: 'changed' },
    },
    {
      propertyPatch: { propertyKey: 'output' as const },
      expected: { propertyKey: 'output', propertyValue: 1 },
    },
  ])(
    'retains mixed records after patch $patch across classifiers and live callback paths',
    ({ propertyPatch, expected }) => {
      type Input = ObjectPropertyTreeVertexTypes<'input', number>;
      type Output = ObjectPropertyTreeVertexTypes<'output', string>;
      const bind = createObjectPropertyMutationHelperBinder<Input, Output>();
      const observed: unknown[] = [];
      const result = rewriteObject<
        number,
        'input',
        number,
        unknown,
        'output',
        string
      >(1, {
        retainDiscoveredTreeBeforeVisitorCommands: true,
        mapInputToRootProperty: (propertyValue) => ({
          propertyKey: 'input',
          propertyValue: propertyValue,
        }),
        enumerateChildPropertyHints: () => [],
        visitors: {
          [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: (
            vertex,
            context,
          ) => ({
            commands: [
              bind(vertex, context).createObjectPropertyMutationCommand({
                kind: 'patchPropertyKeyOrValue',
                propertyPatch: propertyPatch,
              }),
            ],
          }),
        },
        matchesArrayAssemblyPredicate: (prop) => {
          observed.push(prop);
          return false;
        },
        matchesObjectAssemblyPredicate: (prop) => {
          observed.push(prop);
          return false;
        },
        rewritePropertyAfterChildTraversal(prop, context) {
          observed.push(
            prop,
            context.vertex.getVertexData(),
            context.vertexHandle.getCurrentVertexView().getVertexData(),
            context.liveResolvedTreeView
              .getRootVertexHandleOrNull()!
              .getCurrentVertexView()
              .getVertexData(),
          );
          expect(
            context
              .preCommandDiscoveredTreeView!.getRootVertexHandleOrNull()!
              .getCurrentVertexView()
              .getVertexData(),
          ).toEqual({ propertyKey: 'input', propertyValue: 1 });
          return undefined;
        },
      });
      expect(observed).toEqual(Array(6).fill(expected));
      expect(
        result.traversalRunner
          .getLiveResolvedTreeView()
          .getRootVertexHandleOrNull()!
          .getCurrentVertexView()
          .getVertexData(),
      ).toEqual(expected);
      expect(outputValue(result)).toBe(expected.propertyValue);
    },
  );
});

test.each(['propertyValue', 'propertyKey'] as const)(
  'supplies mixed %s-patched children and previous refs to postorder assembly',
  (field) => {
    type Input = ObjectPropertyTreeVertexTypes<'input', number>;
    type Output = ObjectPropertyTreeVertexTypes<'output', string>;
    const bind = createObjectPropertyMutationHelperBinder<Input, Output>();
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
      mapInputToRootProperty: (propertyValue) => ({
        propertyKey: 'input',
        propertyValue: propertyValue,
      }),
      enumerateChildPropertyHints: (prop) =>
        prop.propertyValue === 0
          ? [
              { propertyKey: 'input', propertyValue: 1 },
              { propertyKey: 'input', propertyValue: 2 },
            ]
          : [],
      visitors: {
        [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: (vertex, context) =>
          vertex.getVertexData().propertyValue === 0
            ? undefined
            : {
                commands: [
                  bind(vertex, context).createObjectPropertyMutationCommand({
                    kind: 'patchPropertyKeyOrValue',
                    propertyPatch:
                      field === 'propertyValue'
                        ? { propertyValue: 'changed' }
                        : { propertyKey: 'output' },
                  }),
                ],
              },
      },
      matchesObjectAssemblyPredicate: (prop) => prop.propertyValue === 0,
      assembleObjectValueFromChildProperties(children) {
        assembledChildren.push(children);
        return 'assembled';
      },
      rewritePropertyAfterChildTraversal(prop, context) {
        if (
          prop.propertyValue !== 0 &&
          context.previousCommittedVisitVertexHandleForSamePhase !== null
        ) {
          previous.push(
            context.previousCommittedVisitVertexHandleForSamePhase
              .getCurrentVertexView()
              .getVertexData(),
          );
        }
        return undefined;
      },
    });
    if (field === 'propertyValue') {
      expect(previous).toEqual([
        { propertyKey: 'input', propertyValue: 'changed' },
      ]);
      expect(assembledChildren).toEqual([
        [
          { propertyKey: 'input', propertyValue: 'changed' },
          { propertyKey: 'input', propertyValue: 'changed' },
        ],
      ]);
    } else {
      expect(previous).toEqual([{ propertyKey: 'output', propertyValue: 1 }]);
      expect(assembledChildren).toEqual([
        [
          { propertyKey: 'output', propertyValue: 1 },
          { propertyKey: 'output', propertyValue: 2 },
        ],
      ]);
    }
    expect(outputValue(result)).toBe('assembled');
  },
);

test('retains input metadata after a partial output patch through a generic traversal', () => {
  type InputProp = {
    propertyKey: 'input';
    propertyValue: number;
    tag: 'input';
    note: object;
  };
  type OutputProp = {
    propertyKey: 'output';
    propertyValue: string;
    tag: 'output';
    otherNote: object;
  };
  type Input = VertexDataAndChildHintTypes<InputProp, InputProp>;
  type Output = VertexDataAndChildHintTypes<OutputProp, OutputProp>;
  type Current = LiveObjectPropertyVertexTypes<Input, Output>;
  const note = { retained: true };
  const seen: unknown[] = [];
  const bind = createObjectPropertyMutationHelperBinder<Input, Output>({
    matchesArrayAssemblyPredicate: (prop) => {
      seen.push(prop);
      return false;
    },
  });
  const runner = runTreeDepthFirstUntilSuspendedOrTerminal<Input, Current>({
    retainDiscoveredTreeBeforeVisitorCommands: true,
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: {
              propertyKey: 'input',
              propertyValue: 1,
              tag: 'input',
              note,
            },
            $childDiscoveryHints: [],
          },
        },
      }),
      resolveChildVertexFromHint: () => ({
        kind: 'vertexIntentionallyOmitted',
      }),
    },
    visitors: {
      [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: (vertex, context) => ({
        commands: [
          bind(vertex, context).createObjectPropertyMutationCommand({
            kind: 'patchPropertyKeyOrValue',
            propertyPatch: { propertyValue: 'changed' },
          }),
        ],
      }),
      [DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES]: (vertex, context) => {
        bind(vertex, context);
        expect(
          context
            .preCommandDiscoveredTreeView!.getRootVertexHandleOrNull()!
            .getCurrentVertexView()
            .getVertexData(),
        ).toEqual({
          propertyKey: 'input',
          propertyValue: 1,
          tag: 'input',
          note,
        });
      },
    },
  });
  expect(seen).toEqual([
    { propertyKey: 'input', propertyValue: 1, tag: 'input', note },
    { propertyKey: 'input', propertyValue: 'changed', tag: 'input', note },
  ]);
  const data = runner
    .getLiveResolvedTreeView()
    .getRootVertexHandleOrNull()!
    .getCurrentVertexView()
    .getVertexData();
  expect(data).toEqual({
    propertyKey: 'input',
    propertyValue: 'changed',
    tag: 'input',
    note,
  });
  if (data.tag !== 'input') throw new Error('Expected retained input metadata');
  expect(data.note).toBe(note);
});
