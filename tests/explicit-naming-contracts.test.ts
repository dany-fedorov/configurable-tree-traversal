import {
  DepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase,
  ObjectPropertyTreeSource,
  Vertex,
  createObjectPropertyMutationHelperBinder,
  rewriteObject,
  type ObjectPropertyTreeVertexTypes,
} from '../src';

test('positive path selections include endpoints by default and exclude either endpoint explicitly', () => {
  const runner = new DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: new ObjectPropertyTreeSource({ child: 1 }),
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  const view = runner.getLiveResolvedTreeView();
  const root = view.getRootVertexHandleOrNull()!;
  const child = view.getChildVertexHandlesOrNull(root)![0]!;

  expect(view.requireStructuralAncestorPathTo(child)).toEqual([root, child]);
  expect(
    view.requireStructuralAncestorPathTo(child, {
      includeDesignatedRoot: false,
    }),
  ).toEqual([child]);
  expect(
    view.requireStructuralAncestorPathTo(child, {
      includeTargetVertex: false,
    }),
  ).toEqual([root]);
});

test('positive hint membership reports children rather than the empty-list complement', () => {
  const empty = new Vertex({ $vertexData: 1, $childDiscoveryHints: [] });
  const parent = new Vertex({ $vertexData: 1, $childDiscoveryHints: [2] });
  expect(empty.hasChildDiscoveryHints()).toBe(false);
  expect(parent.hasChildDiscoveryHints()).toBe(true);
});

test('explicit assembly cache preserves cached undefined values by checking membership separately', () => {
  const calls: string[] = [];
  const options = {
    assemblyCache: {
      hasAssembledValueForVertex: () => true,
      getAssembledValueForVertex: () => undefined,
      setAssembledValueForVertex: () => undefined,
    },
    assembleObjectValueFromChildProperties: () => {
      calls.push('assemble');
      return { unexpected: true };
    },
  };
  const result = rewriteObject({ child: 1 }, options);
  expect(result.getFinalOutputResult()).toEqual({
    kind: 'present',
    value: undefined,
  });
  expect(calls).toEqual([]);
});

test('explicit preserved-index assembly policy retains sparse array length and trailing holes', () => {
  const input = new Array(4);
  input[1] = 10;
  const result = rewriteObject(input, {
    arrayAssemblyIndexPolicy: 'preserveNumericIndicesAndArrayLength',
  });
  const output = result.getFinalOutputResult();

  expect(output).toEqual({
    kind: 'present',
    value: [, 10, , ,],
  });
  if (output.kind !== 'present' || !Array.isArray(output.value))
    throw new Error('Expected a reconstructed array');
  expect(output.value.length).toBe(4);
});

test('assembling current children can suppress cache writes without suppressing assembly', () => {
  type Types = ObjectPropertyTreeVertexTypes<PropertyKey, unknown>;
  const assembledValues: unknown[] = [];
  let assemblies = 0;
  const bind = createObjectPropertyMutationHelperBinder<Types, Types>({
    assemblyCache: {
      hasAssembledValueForVertex: () => false,
      getAssembledValueForVertex: () => undefined,
      setAssembledValueForVertex: (_vertexHandle, value) =>
        assembledValues.push(value),
    },
    assembleObjectValueFromChildProperties: () => ({ assembly: ++assemblies }),
  });
  new DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: new ObjectPropertyTreeSource({}),
  })
    .registerVisitorCallbackForPhase(
      DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
      (vertex, context) => {
        const helpers = bind(vertex, context);
        expect(
          helpers.assembleCompositeFromCurrentChildren({ cacheResult: false }),
        ).toEqual({ assembly: 1 });
        expect(assembledValues).toEqual([]);
        expect(helpers.assembleCompositeFromCurrentChildren()).toEqual({
          assembly: 2,
        });
      },
    )
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(assembledValues).toEqual([{ assembly: 2 }]);
});

test.each([
  false,
  null,
  { cacheResult: null },
  { cacheResult: 1 },
  { unknown: undefined },
  { [Symbol('unknown')]: true },
])(
  'rejects malformed assembly options %p before invoking the assembler or cache',
  (options) => {
    type Types = ObjectPropertyTreeVertexTypes<PropertyKey, unknown>;
    const effects: string[] = [];
    const bind = createObjectPropertyMutationHelperBinder<Types, Types>({
      assembleObjectValueFromChildProperties: () => effects.push('assemble'),
      assemblyCache: {
        hasAssembledValueForVertex: () => false,
        getAssembledValueForVertex: () => undefined,
        setAssembledValueForVertex: () => effects.push('cache'),
      },
    });
    new DepthFirstTreeTraversalBuilder({
      treeDiscoverySource: new ObjectPropertyTreeSource({}),
    })
      .registerVisitorCallbackForPhase(
        DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
        (vertex, context) => {
          expect(() =>
            bind(vertex, context).assembleCompositeFromCurrentChildren(
              options as never,
            ),
          ).toThrow(TypeError);
        },
      )
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(effects).toEqual([]);
  },
);

test.each([null, new Map(), { hasAssembledValueForVertex: () => true }])(
  'rejects incomplete assembly cache protocols %p before reconstruction',
  (assemblyCache) => {
    let assemblies = 0;
    expect(() =>
      rewriteObject(
        {},
        {
          assemblyCache: assemblyCache as never,
          assembleObjectValueFromChildProperties: () => ++assemblies,
        },
      ),
    ).toThrow(TypeError);
    expect(assemblies).toBe(0);
  },
);
