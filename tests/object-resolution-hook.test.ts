import { capturedOutputValue } from './helpers/rewriteOutput';
import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DepthFirstTreeVisitPhase,
  DepthFirstTreeTraversalBuilder,
  ObjectPropertyTreeSource,
  type ObjectPropertyTreeVertexTypes,
} from '../src';
import {
  rewriteObject,
  type ObjectPropertyRewriteOptions,
} from '../src/tools/rewrite-object/rewriteObject';

type Options = ObjectPropertyRewriteOptions<
  unknown,
  PropertyKey,
  unknown,
  unknown,
  string,
  unknown
>;
function rewriteWithHook(
  input: unknown,
  resolveChildPropertyOrUseDefault: (hint: {
    propertyKey: PropertyKey;
    propertyValue: unknown;
  }) => unknown,
) {
  return capturedOutputValue(
    rewriteObject(input, { resolveChildPropertyOrUseDefault } as Options),
  );
}

test('canonical hook replaces and omits properties in reconstructed output and delegates defaults', () => {
  expect(
    rewriteWithHook({ keep: { leaf: 1 }, replace: 2, skip: 3 }, (hint) =>
      hint.propertyKey === 'skip'
        ? { kind: 'vertexIntentionallyOmitted' }
        : hint.propertyKey === 'replace'
        ? {
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: { propertyKey: 'replacement', propertyValue: 9 },
                $childDiscoveryHints: [],
              },
            },
          }
        : { kind: 'useDefaultChildPropertyResolution' },
    ),
  ).toEqual({ keep: { leaf: 1 }, replacement: 9 });
});

test('canonical found preserves exact data and child hint identity', () => {
  const hint = { propertyKey: 'nested', propertyValue: 2 };
  const data = { propertyKey: 'replacement', propertyValue: {} };
  const childHints = [hint];
  const tree = new ObjectPropertyTreeSource({ original: 1 }, {
    resolveChildPropertyOrUseDefault: (input: { propertyKey: PropertyKey }) =>
      input.propertyKey === 'original'
        ? {
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: data,
                $childDiscoveryHints: childHints,
              },
            },
          }
        : { kind: 'useDefaultChildPropertyResolution' },
  } as Options);
  const seen: unknown[] = [];
  new DepthFirstTreeTraversalBuilder({ treeDiscoverySource: tree })
    .registerVisitorCallbackForPhase(
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
      (vertex) => {
        seen.push(vertex.getVertexData());
        if (vertex.getVertexData() === data)
          expect(vertex.getDetachedChildDiscoveryHints()).toEqual(childHints);
      },
    )
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(seen.slice(1)).toEqual([data, hint]);
  expect(seen[1]).toBe(data);
  expect(seen[2]).toBe(hint);
});

test('canonical found still detects ancestor cycles and permits shared sibling objects', () => {
  const input = { child: 1 };
  expect(() =>
    rewriteWithHook(input, () => ({
      kind: 'vertexResolved',
      resolvedVertexInput: {
        vertexContentInput: {
          $vertexData: { propertyKey: 'back', propertyValue: input },
          $childDiscoveryHints: [],
        },
      },
    })),
  ).toThrow(/cycle/i);
  const shared = { leaf: 1 };
  expect(
    rewriteWithHook({ a: shared, b: shared }, () => ({
      kind: 'useDefaultChildPropertyResolution',
    })),
  ).toEqual({ a: { leaf: 1 }, b: { leaf: 1 } });
});

test.each([
  undefined,
  null,
  {},
  { kind: 'other' },
  { kind: 'vertexResolved', resolvedVertexInput: null },
  { kind: 'vertexResolved', resolvedVertexInput: { vertexContentInput: null } },
])('rejects malformed canonical result %p', (result) => {
  expect(() => rewriteWithHook({ a: 1 }, () => result)).toThrow(TypeError);
});

test.each([
  'vertexId',
  'workWaitsForWorkOf',
  'workWaitsForSubgraphCompletionOf',
  'satisfiesDependencies',
])('rejects hook %s before omission/default discards it', (field) => {
  for (const result of [
    { kind: 'useDefaultChildPropertyResolution', [field]: undefined },
    { kind: 'vertexIntentionallyOmitted', [field]: undefined },
    {
      kind: 'vertexResolved',
      resolvedVertexInput: {
        vertexContentInput: {
          $vertexData: { propertyKey: 'a', propertyValue: 2 },
          $childDiscoveryHints: [],
        },
        [field]: undefined,
      },
    },
  ])
    expect(() => rewriteWithHook({ a: 1 }, () => result)).toThrow(
      /graph metadata/i,
    );
});

test.each([undefined, null, () => ({})])(
  'rejects retired makeVertexHook by presence: %p',
  (makeVertexHook) => {
    expect(() =>
      rewriteObject({ a: 1 }, {
        resolveChildPropertyOrUseDefault: () => ({
          kind: 'useDefaultChildPropertyResolution',
        }),
        makeVertexHook,
      } as never),
    ).toThrow(TypeError);
  },
);

test('canonical found and omitted hook results reconstruct output', () => {
  const content = {
    $vertexData: { propertyKey: 'changed', propertyValue: 4 },
    $childDiscoveryHints: [],
  };
  expect(
    rewriteWithHook({ a: 1, skip: 2 }, (hint) =>
      hint.propertyKey === 'skip'
        ? { kind: 'vertexIntentionallyOmitted' }
        : {
            kind: 'vertexResolved',
            resolvedVertexInput: { vertexContentInput: content },
          },
    ),
  ).toEqual({ changed: 4 });
});

test('rewriteObject captures the canonical hook configuration getter once', () => {
  let reads = 0;
  const options = Object.defineProperty(
    {},
    'resolveChildPropertyOrUseDefault',
    {
      get() {
        reads++;
        if (reads > 1) throw new Error('configuration read twice');
        return () => ({ kind: 'vertexIntentionallyOmitted' });
      },
    },
  );
  expect(capturedOutputValue(rewriteObject({ a: 1 }, options))).toEqual({});
  expect(reads).toBe(1);
});

test.each([undefined, null, false, Symbol('hook failure')])(
  'preserves exact hook/result accessor failure %p',
  (failure) => {
    for (const hook of [
      () => {
        throw failure;
      },
      () =>
        Object.defineProperty({}, 'kind', {
          get() {
            throw failure;
          },
        }),
    ]) {
      let caught = false;
      try {
        rewriteWithHook({ a: 1 }, hook);
      } catch (error) {
        caught = true;
        expect(error).toBe(failure);
      }
      expect(caught).toBe(true);
    }
  },
);

test.each([
  'vertexId',
  'workWaitsForWorkOf',
  'workWaitsForSubgraphCompletionOf',
  'satisfiesDependencies',
])(
  'canonical hook cannot discard %s metadata before default/pruning',
  (field) => {
    for (const kind of [
      'useDefaultChildPropertyResolution',
      'vertexIntentionallyOmitted',
    ]) {
      expect(() =>
        rewriteWithHook({ a: 1 }, () => ({ kind, [field]: undefined })),
      ).toThrow(/graph metadata/i);
    }
  },
);

test('rejects a nonfunction canonical hook before traversal', () => {
  expect(() =>
    rewriteObject({}, {
      resolveChildPropertyOrUseDefault: null,
    } as unknown as Options),
  ).toThrow(TypeError);
});

type ObjectT = ObjectPropertyTreeVertexTypes<string | number | symbol, unknown>;
for (const Constructor of [
  DepthFirstTreeTraversalBuilder<ObjectT>,
  AsyncDepthFirstTreeTraversalBuilder<ObjectT>,
  BreadthFirstTreeTraversalBuilder<ObjectT>,
  AsyncBreadthFirstTreeTraversalBuilder<ObjectT>,
  DagTraversalBuilder<ObjectT>,
  AsyncDagTraversalBuilder<ObjectT>,
]) {
  test(`${Constructor.name} object hooks use plain omissions and preserve callback errors`, async () => {
    const tree: import('../src').TreeDiscoverySource<ObjectT> =
      new ObjectPropertyTreeSource(
        { keep: 1, skip: 2 },
        {
          resolveChildPropertyOrUseDefault: (hint) =>
            hint.propertyKey === 'skip'
              ? { kind: 'vertexIntentionallyOmitted' }
              : { kind: 'useDefaultChildPropertyResolution' },
        },
      );
    const runner = new Constructor({
      treeDiscoverySource: tree,
    }).createIndependentRunnerFromCurrentOptions();
    const keys: unknown[] = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
      if (
        event !== null &&
        !keys.includes(event.vertex.getVertexData().propertyKey)
      )
        keys.push(event.vertex.getVertexData().propertyKey);
    }
    expect(keys).toContain('keep');
    expect(keys).not.toContain('skip');
    for (const failure of [undefined, null, Symbol('object callback')]) {
      const failed = new Constructor({
        treeDiscoverySource: new ObjectPropertyTreeSource(
          { child: 1 },
          {
            resolveChildPropertyOrUseDefault: () => {
              throw failure;
            },
          },
        ),
      }).createIndependentRunnerFromCurrentOptions();
      let caught = false;
      try {
        await failed.runUntilSuspendedOrTerminal();
      } catch (error) {
        caught = true;
        expect(error).toBe(failure);
      }
      expect(caught).toBe(true);
    }
  });
}
