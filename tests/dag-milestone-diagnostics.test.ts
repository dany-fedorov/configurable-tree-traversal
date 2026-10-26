import {
  AsyncDagTraversal,
  DagTraversal,
  DagTraversalStallError,
  type VertexTypes,
  type DagWaitEdge,
} from '../src';

type G = VertexTypes<string, string>;
function edge(
  waiter: unknown,
  fromPhase: 'work' | 'subgraphCompletion',
  prerequisite: unknown,
  toPhase: 'work' | 'subgraphCompletion',
  reason: DagWaitEdge['reason'],
) {
  return {
    waiter: { vertexId: waiter, milestone: fromPhase },
    prerequisite: { vertexId: prerequisite, milestone: toPhase },
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
              resolveRoot: () => ({
                vertexId: 'root',
                dependsOnWork: completion ? [] : ['child'],
                vertexContent: { $data: 'root', $childHints: ['child'] },
              }),
              resolveChild: () => ({
                vertexId: 'child',
                ...(completion
                  ? { dependsOnSubgraphCompletion: ['root'] }
                  : { dependsOnWork: ['root'] }),
                vertexContent: { $data: 'child', $childHints: [] },
              }),
            },
          }).createRunner();
          const error = await failure(() => runner[operation]());
          const expected = [
            ...(completion
              ? []
              : [edge('root', 'work', 'child', 'work', 'workDependency')]),
            edge('root', 'subgraphCompletion', 'root', 'work', 'ownWork'),
            edge(
              'root',
              'subgraphCompletion',
              'child',
              'subgraphCompletion',
              'structuralChild',
            ),
            edge(
              'child',
              'work',
              'root',
              completion ? 'subgraphCompletion' : 'work',
              completion ? 'subgraphCompletionDependency' : 'workDependency',
            ),
            edge('child', 'subgraphCompletion', 'child', 'work', 'ownWork'),
          ];
          expect(error.diagnostics).toMatchObject({
            dependencyCycleComponents: [['root', 'child']],
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
        resolveRoot: () => ({
          vertexId: 'root',
          dependsOnWork: ['missing-work'],
          dependsOnSubgraphCompletion: ['missing-completion'],
          vertexContent: { $data: 'root', $childHints: ['a', 'b', 'c'] },
        }),
        resolveChild: (id) => ({
          vertexId: id,
          dependsOnWork: id === 'a' ? ['b', 'b'] : id === 'b' ? ['a'] : [],
          dependsOnSubgraphCompletion: id === 'c' ? ['c'] : [],
          vertexContent: { $data: id, $childHints: [] },
        }),
      },
    }).createRunner();
    const error = await failure(() => runner.run());
    expect(error.diagnostics).toMatchObject({
      unknownPrerequisiteIds: ['missing-work', 'missing-completion'],
      dependencyCycleComponents: [['a', 'b'], ['c']],
      dependencyEdges: [
        edge('root', 'work', 'missing-work', 'work', 'workDependency'),
        edge(
          'root',
          'work',
          'missing-completion',
          'subgraphCompletion',
          'subgraphCompletionDependency',
        ),
        edge('root', 'subgraphCompletion', 'root', 'work', 'ownWork'),
        edge('root', 'subgraphCompletion', 'a', 'subgraphCompletion', 'structuralChild'),
        edge('root', 'subgraphCompletion', 'b', 'subgraphCompletion', 'structuralChild'),
        edge('root', 'subgraphCompletion', 'c', 'subgraphCompletion', 'structuralChild'),
        edge('a', 'work', 'b', 'work', 'workDependency'),
        edge('a', 'subgraphCompletion', 'a', 'work', 'ownWork'),
        edge('b', 'work', 'a', 'work', 'workDependency'),
        edge('b', 'subgraphCompletion', 'b', 'work', 'ownWork'),
        edge('c', 'work', 'c', 'subgraphCompletion', 'subgraphCompletionDependency'),
        edge('c', 'subgraphCompletion', 'c', 'work', 'ownWork'),
      ],
    });
  });

  test(`${Constructor.name} excludes synthetic holder edges from errors and summaries`, async () => {
    const runner = new Constructor<G>({
      syntheticRoot: true,
      traversableGraph: {
        resolveRoot: () => ({
          vertexContent: { $data: 'holder', $childHints: ['a', 'b'] },
        }),
        resolveChild: (id) => ({
          vertexId: id,
          dependsOnWork: [id === 'a' ? 'b' : 'a'],
          vertexContent: { $data: id, $childHints: [] },
        }),
      },
    }).createRunner();
    const error = await failure(() => runner.prepare());
    const dependencyEdges = [
      edge('a', 'work', 'b', 'work', 'workDependency'),
      edge('a', 'subgraphCompletion', 'a', 'work', 'ownWork'),
      edge('b', 'work', 'a', 'work', 'workDependency'),
      edge('b', 'subgraphCompletion', 'b', 'work', 'ownWork'),
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
    dependencyCycleComponents: [],
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
    const runner = new Constructor<VertexTypes<unknown, unknown>>({
      discovery: 'eager',
      traversableGraph: {
        resolveRoot: () => ({
          vertexId: root,
          dependsOnWork: [root],
          vertexContent: { $data: '', $childHints: ids },
        }),
        resolveChild: (id) => ({
          vertexId: id,
          dependsOnWork: [id, id],
          vertexContent: { $data: '', $childHints: [] },
        }),
      },
    }).createRunner();
    const error = await failure(() => runner.run());
    const expected = [
      edge(root, 'work', root, 'work', 'workDependency'),
      edge(root, 'subgraphCompletion', root, 'work', 'ownWork'),
      ...ids.map((id) =>
        edge(root, 'subgraphCompletion', id, 'subgraphCompletion', 'structuralChild'),
      ),
      ...ids.flatMap((id) => [
        edge(id, 'work', id, 'work', 'workDependency'),
        edge(id, 'subgraphCompletion', id, 'work', 'ownWork'),
      ]),
    ];
    expect(error.diagnostics).toMatchObject({
      dependencyEdges: expected,
      dependencyCycleComponents: [[root], [twin], [symbol], [undefined], [NaN], [0]],
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
      expect(item.waiter).not.toBe(secondEdges[index]!.waiter);
      expect(item.prerequisite).not.toBe(secondEdges[index]!.prerequisite);
      expect(item.waiter).not.toBe(item.prerequisite);
    });
    expect(firstEdges[0]!.waiter.vertexId).toBe(root);
    expect(firstEdges[0]!.prerequisite.vertexId).toBe(root);
    expect(firstEdges[2]!.prerequisite.vertexId).toBe(twin);
    errorEdges[0]!.waiter.vertexId = 'changed error';
    errorEdges[0]!.prerequisite.milestone = 'subgraphCompletion';
    errorEdges.length = 0;
    firstEdges[0]!.waiter.vertexId = 'changed summary';
    firstEdges[0]!.prerequisite.milestone = 'subgraphCompletion';
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
    expect(secondEdges[0]!.waiter.vertexId).toBe(root);
  });
}

test('manual labelled diagnostics copy arrays, edges and both milestone records', () => {
  const vertexId = {};
  const input = {
    dependencies: [],
    unknownPrerequisiteIds: [],
    dependencyCycleComponents: [],
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
  expect(edges[0]!.waiter).not.toBe(input.dependencyEdges[0]!.waiter);
  expect(edges[0]!.prerequisite).not.toBe(input.dependencyEdges[0]!.prerequisite);
  input.dependencyEdges[0]!.waiter.vertexId = 'changed';
  input.dependencyEdges[0]!.prerequisite.milestone = 'subgraphCompletion';
  input.dependencyEdges.length = 0;
  expect(edges).toEqual([
    edge(vertexId, 'work', vertexId, 'work', 'workDependency'),
  ]);
  expect(edges[0]!.waiter.vertexId).toBe(vertexId);
  expect(Object.isFrozen(vertexId)).toBe(false);
});

test('public preparation diagnoses a 10k-node dependency chain without recursion', async () => {
  type Numeric = VertexTypes<number, number>;
  const runner = new DagTraversal<Numeric, Numeric, number>({
    traversableGraph: {
      resolveRoot: () => ({
        vertexId: 0,
        dependsOnWork: [1],
        vertexContent: { $data: 0, $childHints: [1] },
      }),
      resolveChild: (id) => ({
        vertexId: id,
        dependsOnWork: [id + 1],
        vertexContent: { $data: id, $childHints: id < 9999 ? [id + 1] : [] },
      }),
    },
  }).createRunner();
  const error = await failure(() => runner.prepare());
  expect(error.diagnostics).toMatchObject({
    dependencyCycleComponents: [],
    unknownPrerequisiteIds: [10000],
    dependencyEdges: expect.any(Array),
  });
  const edges = error.diagnostics.dependencyEdges;
  expect(edges).toHaveLength(29999);
  expect(edges.slice(0, 3)).toEqual([
    edge(0, 'work', 1, 'work', 'workDependency'),
    edge(0, 'subgraphCompletion', 0, 'work', 'ownWork'),
    edge(0, 'subgraphCompletion', 1, 'subgraphCompletion', 'structuralChild'),
  ]);
  expect(edges.slice(-2)).toEqual([
    edge(9999, 'work', 10000, 'work', 'workDependency'),
    edge(9999, 'subgraphCompletion', 9999, 'work', 'ownWork'),
  ]);
});
