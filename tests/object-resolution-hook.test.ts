import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  DagTraversal,
  DepthFirstPhase,
  DepthFirstTreeTraversal,
  ObjectTreeSource,
  type ObjectTreeVertexTypes,
} from '../src';
import {
  rewriteObject,
  type RewriteObjectOptions,
} from '../src/tools/rewrite-object/rewriteObject';

type Options = RewriteObjectOptions<
  unknown,
  string,
  unknown,
  unknown,
  string,
  unknown
>;
function rewriteWithHook(
  input: unknown,
  resolveVertexHook: (hint: { key: string; value: unknown }) => unknown,
) {
  return rewriteObject(input, { resolveVertexHook } as Options).outputAtReturn;
}

test('canonical hook replaces and omits properties in reconstructed output and delegates defaults', () => {
  expect(
    rewriteWithHook({ keep: { leaf: 1 }, replace: 2, skip: 3 }, (hint) =>
      hint.key === 'skip'
        ? { kind: 'omitted' }
        : hint.key === 'replace'
        ? {
            kind: 'found',
            vertex: {
              vertexContent: {
                $data: { key: 'replacement', value: 9 },
                $childHints: [],
              },
            },
          }
        : { kind: 'useDefault' },
    ),
  ).toEqual({ keep: { leaf: 1 }, replacement: 9 });
});

test('canonical found preserves exact data and child hint identity', () => {
  const hint = { key: 'nested', value: 2 };
  const data = { key: 'replacement', value: {} };
  const childHints = [hint];
  const tree = new ObjectTreeSource({ original: 1 }, {
    resolveVertexHook: (input: { key: string }) =>
      input.key === 'original'
        ? {
            kind: 'found',
            vertex: { vertexContent: { $data: data, $childHints: childHints } },
          }
        : { kind: 'useDefault' },
  } as Options);
  const seen: unknown[] = [];
  new DepthFirstTreeTraversal({ traversableTree: tree })
    .addVisitorFor(DepthFirstPhase.PRE_ORDER, (vertex) => {
      seen.push(vertex.getData());
      if (vertex.getData() === data)
        expect(vertex.getChildrenHints()).toBe(childHints);
    })
    .createRunner()
    .run();
  expect(seen.slice(1)).toEqual([data, hint]);
  expect(seen[1]).toBe(data);
  expect(seen[2]).toBe(hint);
});

test('canonical found still detects ancestor cycles and permits shared sibling objects', () => {
  const input = { child: 1 };
  expect(() =>
    rewriteWithHook(input, () => ({
      kind: 'found',
      vertex: {
        vertexContent: {
          $data: { key: 'back', value: input },
          $childHints: [],
        },
      },
    })),
  ).toThrow(/cycle/i);
  const shared = { leaf: 1 };
  expect(
    rewriteWithHook({ a: shared, b: shared }, () => ({ kind: 'useDefault' })),
  ).toEqual({ a: { leaf: 1 }, b: { leaf: 1 } });
});

test.each([
  undefined,
  null,
  {},
  { kind: 'other' },
  { kind: 'found', vertex: null },
  { kind: 'found', vertex: { vertexContent: null } },
])('rejects malformed canonical result %p', (result) => {
  expect(() => rewriteWithHook({ a: 1 }, () => result)).toThrow(TypeError);
});

test.each([
  'vertexId',
  'dependsOnWork',
  'dependsOnSubgraphCompletion',
  'satisfiesDependencies',
])('rejects hook %s before omission/default discards it', (field) => {
  for (const result of [
    { kind: 'useDefault', [field]: undefined },
    { kind: 'omitted', [field]: undefined },
    {
      kind: 'found',
      vertex: {
        vertexContent: { $data: { key: 'a', value: 2 }, $childHints: [] },
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
        resolveVertexHook: () => ({ kind: 'useDefault' }),
        makeVertexHook,
      } as never),
    ).toThrow(TypeError);
  },
);

test('canonical found and omitted hook results reconstruct output', () => {
  const content = { $data: { key: 'changed', value: 4 }, $childHints: [] };
  expect(
    rewriteWithHook({ a: 1, skip: 2 }, (hint) =>
      hint.key === 'skip'
        ? { kind: 'omitted' }
        : { kind: 'found', vertex: { vertexContent: content } },
    ),
  ).toEqual({ changed: 4 });
});

test('rewriteObject captures the canonical hook configuration getter once', () => {
  let reads = 0;
  const options = Object.defineProperty({}, 'resolveVertexHook', {
    get() {
      reads++;
      if (reads > 1) throw new Error('configuration read twice');
      return () => ({ kind: 'omitted' });
    },
  });
  expect(rewriteObject({ a: 1 }, options).outputAtReturn).toEqual({});
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
  'dependsOnWork',
  'dependsOnSubgraphCompletion',
  'satisfiesDependencies',
])(
  'canonical hook cannot discard %s metadata before default/pruning',
  (field) => {
    for (const kind of ['useDefault', 'omitted']) {
      expect(() =>
        rewriteWithHook({ a: 1 }, () => ({ kind, [field]: undefined })),
      ).toThrow(/graph metadata/i);
    }
  },
);

test('rejects a nonfunction canonical hook before traversal', () => {
  expect(() =>
    rewriteObject({}, { resolveVertexHook: null } as unknown as Options),
  ).toThrow(TypeError);
});

type ObjectT = ObjectTreeVertexTypes<string | number | symbol, unknown>;
for (const Constructor of [
  DepthFirstTreeTraversal<ObjectT>,
  AsyncDepthFirstTreeTraversal<ObjectT>,
  BreadthFirstTreeTraversal<ObjectT>,
  AsyncBreadthFirstTreeTraversal<ObjectT>,
  DagTraversal<ObjectT>,
  AsyncDagTraversal<ObjectT>,
]) {
  test(`${Constructor.name} object hooks use plain omissions and preserve callback errors`, async () => {
    const tree: import('../src').TreeSource<ObjectT> = new ObjectTreeSource(
      { keep: 1, skip: 2 },
      {
        resolveVertexHook: (hint) =>
          hint.key === 'skip' ? { kind: 'omitted' } : { kind: 'useDefault' },
      },
    );
    const runner = new Constructor({ traversableTree: tree }).createRunner();
    const keys: unknown[] = [];
    for await (const event of runner.iterateEvents()) {
      if (event !== null && !keys.includes(event.vertex.getData().key))
        keys.push(event.vertex.getData().key);
    }
    expect(keys).toContain('keep');
    expect(keys).not.toContain('skip');
    for (const failure of [undefined, null, Symbol('object callback')]) {
      const failed = new Constructor({
        traversableTree: new ObjectTreeSource(
          { child: 1 },
          {
            resolveVertexHook: () => {
              throw failure;
            },
          },
        ),
      }).createRunner();
      let caught = false;
      try {
        await failed.run();
      } catch (error) {
        caught = true;
        expect(error).toBe(failure);
      }
      expect(caught).toBe(true);
    }
  });
}
