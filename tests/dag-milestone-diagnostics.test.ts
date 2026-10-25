import {
  AsyncDagTraversal,
  DagTraversal,
  DagTraversalStallError,
  type TreeTypeParameters,
  type DagDependencyEdge,
} from '../src';

type G = TreeTypeParameters<string, string>;
function edge(
  from: unknown,
  fromPhase: 'work' | 'completion',
  to: unknown,
  toPhase: 'work' | 'completion',
  reason: DagDependencyEdge['reason'],
) {
  return {
    from: { vertexId: from, milestone: fromPhase },
    to: { vertexId: to, milestone: toPhase },
    reason,
  };
}
async function failure(operation: () => unknown) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof DagTraversalStallError) return error;
    throw error;
  }
  throw new Error('expected a public DAG stall');
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  for (const operation of ['run', 'prepare'] as const) {
    for (const seeded of [false, true]) {
      test(`${Constructor.name} ${operation} preserves original milestone reasons with seeds=${seeded}`, async () => {
        for (const completion of [false, true]) {
          const runner = new Constructor<G>({
            discovery: 'eager',
            ...(seeded ? { completedWork: new Set(['root', 'child']) } : {}),
            traversableGraph: {
              makeRoot: () => ({
                vertexId: 'root',
                dependsOn: completion ? [] : ['child'],
                vertexContent: { $data: 'root', $childHints: ['child'] },
              }),
              makeVertex: () => ({
                vertexId: 'child',
                ...(completion
                  ? { dependsOnComplete: ['root'] }
                  : { dependsOn: ['root'] }),
                vertexContent: { $data: 'child', $childHints: [] },
              }),
            },
          }).makeRunner();
          const error = await failure(() => runner[operation]());
          const expected = [
            ...(completion
              ? []
              : [edge('root', 'work', 'child', 'work', 'workDependency')]),
            edge('root', 'completion', 'root', 'work', 'ownWork'),
            edge(
              'root',
              'completion',
              'child',
              'completion',
              'structuralChild',
            ),
            edge(
              'child',
              'work',
              'root',
              completion ? 'completion' : 'work',
              completion ? 'completionDependency' : 'workDependency',
            ),
            edge('child', 'completion', 'child', 'work', 'ownWork'),
          ];
          expect(error.diagnostics).toMatchObject({
            dependencyCycles: [['root', 'child']],
            dependencyEdges: expected,
          });
          const first = runner.summary().diagnostics!;
          const second = runner.summary().diagnostics!;
          expect(first).toMatchObject({ dependencyEdges: expected });
          expect(second).toMatchObject({ dependencyEdges: expected });
        }
      });
    }
  }

  test(`${Constructor.name} retains missing endpoints, self loops and disconnected SCC declaration order`, async () => {
    const runner = new Constructor<G>({
      discovery: 'eager',
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          dependsOn: ['missing-work'],
          dependsOnComplete: ['missing-completion'],
          vertexContent: { $data: 'root', $childHints: ['a', 'b', 'c'] },
        }),
        makeVertex: (id) => ({
          vertexId: id,
          dependsOn: id === 'a' ? ['b', 'b'] : id === 'b' ? ['a'] : [],
          dependsOnComplete: id === 'c' ? ['c'] : [],
          vertexContent: { $data: id, $childHints: [] },
        }),
      },
    }).makeRunner();
    const error = await failure(() => runner.run());
    expect(error.diagnostics).toMatchObject({
      unknownPrerequisiteIds: ['missing-work', 'missing-completion'],
      dependencyCycles: [['a', 'b'], ['c']],
      dependencyEdges: [
        edge('root', 'work', 'missing-work', 'work', 'workDependency'),
        edge(
          'root',
          'work',
          'missing-completion',
          'completion',
          'completionDependency',
        ),
        edge('root', 'completion', 'root', 'work', 'ownWork'),
        edge('root', 'completion', 'a', 'completion', 'structuralChild'),
        edge('root', 'completion', 'b', 'completion', 'structuralChild'),
        edge('root', 'completion', 'c', 'completion', 'structuralChild'),
        edge('a', 'work', 'b', 'work', 'workDependency'),
        edge('a', 'completion', 'a', 'work', 'ownWork'),
        edge('b', 'work', 'a', 'work', 'workDependency'),
        edge('b', 'completion', 'b', 'work', 'ownWork'),
        edge('c', 'work', 'c', 'completion', 'completionDependency'),
        edge('c', 'completion', 'c', 'work', 'ownWork'),
      ],
    });
  });

  test(`${Constructor.name} excludes synthetic holder edges from errors and summaries`, async () => {
    const runner = new Constructor<G>({
      syntheticRoot: true,
      traversableGraph: {
        makeRoot: () => ({
          vertexContent: { $data: 'holder', $childHints: ['a', 'b'] },
        }),
        makeVertex: (id) => ({
          vertexId: id,
          dependsOn: [id === 'a' ? 'b' : 'a'],
          vertexContent: { $data: id, $childHints: [] },
        }),
      },
    }).makeRunner();
    const error = await failure(() => runner.prepare());
    const dependencyEdges = [
      edge('a', 'work', 'b', 'work', 'workDependency'),
      edge('a', 'completion', 'a', 'work', 'ownWork'),
      edge('b', 'work', 'a', 'work', 'workDependency'),
      edge('b', 'completion', 'b', 'work', 'ownWork'),
    ];
    expect(error.diagnostics).toMatchObject({ dependencyEdges });
    expect(runner.summary().diagnostics).toMatchObject({ dependencyEdges });
    expect(runner.summary().diagnostics).toMatchObject({ dependencyEdges });
  });
}

test('manual historical diagnostics default to an empty detached edge list', () => {
  const error = new DagTraversalStallError({
    dependencies: [],
    unknownPrerequisiteIds: [],
    dependencyCycles: [],
    dependencyBlockedIds: [],
    structurallyIncompleteIds: [],
  });
  expect(error.diagnostics).toMatchObject({ dependencyEdges: [] });
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} detaches every edge wrapper while preserving opaque SameValueZero IDs`, async () => {
    const root = {
      value: 1,
      toString: () => {
        throw new Error('opaque ID');
      },
      toJSON: () => {
        throw new Error('opaque ID');
      },
    };
    const twin = { value: 1 };
    const symbol = Symbol('child');
    const ids = [twin, symbol, undefined, NaN, -0];
    const runner = new Constructor<TreeTypeParameters<unknown, unknown>>({
      discovery: 'eager',
      traversableGraph: {
        makeRoot: () => ({
          vertexId: root,
          dependsOn: [root],
          vertexContent: { $data: '', $childHints: ids },
        }),
        makeVertex: (id) => ({
          vertexId: id,
          dependsOn: [id, id],
          vertexContent: { $data: '', $childHints: [] },
        }),
      },
    }).makeRunner();
    const error = await failure(() => runner.run());
    const expected = [
      edge(root, 'work', root, 'work', 'workDependency'),
      edge(root, 'completion', root, 'work', 'ownWork'),
      ...ids.map((id) =>
        edge(root, 'completion', id, 'completion', 'structuralChild'),
      ),
      ...ids.flatMap((id) => [
        edge(id, 'work', id, 'work', 'workDependency'),
        edge(id, 'completion', id, 'work', 'ownWork'),
      ]),
    ];
    expect(error.diagnostics).toMatchObject({
      dependencyEdges: expected,
      dependencyCycles: [[root], [twin], [symbol], [undefined], [NaN], [0]],
    });
    const first = runner.summary().diagnostics!;
    const second = runner.summary().diagnostics!;
    const errorEdges = error.diagnostics.dependencyEdges;
    const firstEdges = first.dependencyEdges;
    const secondEdges = second.dependencyEdges;
    expect(firstEdges).toEqual(expected);
    expect(firstEdges).not.toBe(secondEdges);
    firstEdges.forEach((item, index) => {
      expect(item).not.toBe(secondEdges[index]);
      expect(item.from).not.toBe(secondEdges[index]!.from);
      expect(item.to).not.toBe(secondEdges[index]!.to);
      expect(item.from).not.toBe(item.to);
    });
    expect(firstEdges[0]!.from.vertexId).toBe(root);
    expect(firstEdges[0]!.to.vertexId).toBe(root);
    expect(firstEdges[2]!.to.vertexId).toBe(twin);
    errorEdges[0]!.from.vertexId = 'changed error';
    errorEdges[0]!.to.milestone = 'completion';
    errorEdges.length = 0;
    firstEdges[0]!.from.vertexId = 'changed summary';
    firstEdges[0]!.to.milestone = 'completion';
    firstEdges.push(
      edge('injected', 'work', 'injected', 'work', 'workDependency'),
    );
    expect(secondEdges).toEqual(expected);
    expect(runner.summary().diagnostics).toMatchObject({
      dependencyEdges: expected,
    });
    expect(Object.isFrozen(root)).toBe(false);
    expect(Object.isFrozen(twin)).toBe(false);
    root.value = 2;
    expect(secondEdges[0]!.from.vertexId).toBe(root);
  });
}

test('manual labelled diagnostics copy arrays, edges and both milestone records', () => {
  const vertexId = {};
  const input = {
    dependencies: [],
    unknownPrerequisiteIds: [],
    dependencyCycles: [],
    dependencyBlockedIds: [],
    structurallyIncompleteIds: [],
    dependencyEdges: [
      edge(vertexId, 'work', vertexId, 'work', 'workDependency'),
    ],
  };
  const error = new DagTraversalStallError(input);
  expect(error.diagnostics).toMatchObject({
    dependencyEdges: input.dependencyEdges,
  });
  const edges = error.diagnostics.dependencyEdges;
  expect(edges).not.toBe(input.dependencyEdges);
  expect(edges[0]).not.toBe(input.dependencyEdges[0]);
  expect(edges[0]!.from).not.toBe(input.dependencyEdges[0]!.from);
  expect(edges[0]!.to).not.toBe(input.dependencyEdges[0]!.to);
  input.dependencyEdges[0]!.from.vertexId = 'changed';
  input.dependencyEdges[0]!.to.milestone = 'completion';
  input.dependencyEdges.length = 0;
  expect(edges).toEqual([
    edge(vertexId, 'work', vertexId, 'work', 'workDependency'),
  ]);
  expect(edges[0]!.from.vertexId).toBe(vertexId);
  expect(Object.isFrozen(vertexId)).toBe(false);
});

test('public preparation diagnoses a 10k-node dependency chain without recursion', async () => {
  type Numeric = TreeTypeParameters<number, number>;
  const runner = new DagTraversal<Numeric, Numeric, number>({
    traversableGraph: {
      makeRoot: () => ({
        vertexId: 0,
        dependsOn: [1],
        vertexContent: { $data: 0, $childHints: [1] },
      }),
      makeVertex: (id) => ({
        vertexId: id,
        dependsOn: [id + 1],
        vertexContent: { $data: id, $childHints: id < 9999 ? [id + 1] : [] },
      }),
    },
  }).makeRunner();
  const error = await failure(() => runner.prepare());
  expect(error.diagnostics).toMatchObject({
    dependencyCycles: [],
    unknownPrerequisiteIds: [10000],
    dependencyEdges: expect.any(Array),
  });
  const edges = error.diagnostics.dependencyEdges;
  expect(edges).toHaveLength(29999);
  expect(edges.slice(0, 3)).toEqual([
    edge(0, 'work', 1, 'work', 'workDependency'),
    edge(0, 'completion', 0, 'work', 'ownWork'),
    edge(0, 'completion', 1, 'completion', 'structuralChild'),
  ]);
  expect(edges.slice(-2)).toEqual([
    edge(9999, 'work', 10000, 'work', 'workDependency'),
    edge(9999, 'completion', 9999, 'work', 'ownWork'),
  ]);
});
