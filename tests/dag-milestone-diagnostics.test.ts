import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagTraversalStallError,
  type VertexDataAndChildHintTypes,
  type DagMilestoneConstraint,
} from '../src';

type G = VertexDataAndChildHintTypes<string, string>;
function edge(
  waitingMilestone: unknown,
  fromPhase: 'workCompletion' | 'subgraphCompletion',
  prerequisite: unknown,
  toPhase: 'workCompletion' | 'subgraphCompletion',
  reason: DagMilestoneConstraint['reason'],
) {
  return {
    waitingMilestone: { vertexId: waitingMilestone, milestone: fromPhase },
    prerequisiteMilestone: { vertexId: prerequisite, milestone: toPhase },
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

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  for (const operation of [
    'runUntilSuspendedOrTerminal',
    'discoverValidateAndFreezeTopology',
  ] as const) {
    for (const seeded of [false, true]) {
      test(`${Constructor.name} ${operation} preserves original milestone reasons with seeds=${seeded}`, async () => {
        for (const completion of [false, true]) {
          const runner = new Constructor<G>({
            discoveryTiming: 'completeBeforeAnyVisitor',
            ...(seeded
              ? { acceptedCompletedWorkVertexIds: new Set(['root', 'child']) }
              : {}),
            dagDiscoverySource: {
              resolveRootVertex: () => ({
                kind: 'vertexResolved' as const,
                resolvedVertexInput: {
                  vertexId: 'root',
                  workWaitsForWorkOf: completion ? [] : ['child'],
                  vertexContentInput: {
                    $vertexData: 'root',
                    $childDiscoveryHints: ['child'],
                  },
                },
              }),
              resolveChildVertexFromHint: () => ({
                kind: 'vertexResolved' as const,
                resolvedVertexInput: {
                  vertexId: 'child',
                  ...(completion
                    ? { workWaitsForSubgraphCompletionOf: ['root'] }
                    : { workWaitsForWorkOf: ['root'] }),
                  vertexContentInput: {
                    $vertexData: 'child',
                    $childDiscoveryHints: [],
                  },
                },
              }),
            },
          }).createIndependentRunnerFromCurrentOptions();
          const error = await failure(() => runner[operation]());
          const expected = [
            ...(completion
              ? []
              : [
                  edge(
                    'root',
                    'workCompletion',
                    'child',
                    'workCompletion',
                    'workDependency',
                  ),
                ]),
            edge(
              'root',
              'subgraphCompletion',
              'root',
              'workCompletion',
              'ownWork',
            ),
            edge(
              'root',
              'subgraphCompletion',
              'child',
              'subgraphCompletion',
              'structuralChild',
            ),
            edge(
              'child',
              'workCompletion',
              'root',
              completion ? 'subgraphCompletion' : 'workCompletion',
              completion ? 'subgraphCompletionDependency' : 'workDependency',
            ),
            edge(
              'child',
              'subgraphCompletion',
              'child',
              'workCompletion',
              'ownWork',
            ),
          ];
          expect(error.diagnostics).toMatchObject({
            milestoneCycleVertexIdComponents: [['root', 'child']],
            originalMilestoneConstraints: expected,
          });
          const first =
            runner.captureProgressSnapshot()
              .invalidDependencyTopologyDiagnostics!;
          const second =
            runner.captureProgressSnapshot()
              .invalidDependencyTopologyDiagnostics!;
          expect(first).toMatchObject({
            originalMilestoneConstraints: expected,
          });
          expect(second).toMatchObject({
            originalMilestoneConstraints: expected,
          });
        }
      });
    }
  }

  test(`${Constructor.name} retains missing endpoints, self loops and disconnected SCC declaration order`, async () => {
    const runner = new Constructor<G>({
      discoveryTiming: 'completeBeforeAnyVisitor',
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['missing-work'],
            workWaitsForSubgraphCompletionOf: ['missing-completion'],
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['a', 'b', 'c'],
            },
          },
        }),
        resolveChildVertexFromHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf:
              id === 'a' ? ['b', 'b'] : id === 'b' ? ['a'] : [],
            workWaitsForSubgraphCompletionOf: id === 'c' ? ['c'] : [],
            vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
          },
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    const error = await failure(() => runner.runUntilSuspendedOrTerminal());
    expect(error.diagnostics).toMatchObject({
      unresolvedPrerequisiteVertexIds: ['missing-work', 'missing-completion'],
      milestoneCycleVertexIdComponents: [['a', 'b'], ['c']],
      originalMilestoneConstraints: [
        edge(
          'root',
          'workCompletion',
          'missing-work',
          'workCompletion',
          'workDependency',
        ),
        edge(
          'root',
          'workCompletion',
          'missing-completion',
          'subgraphCompletion',
          'subgraphCompletionDependency',
        ),
        edge('root', 'subgraphCompletion', 'root', 'workCompletion', 'ownWork'),
        edge(
          'root',
          'subgraphCompletion',
          'a',
          'subgraphCompletion',
          'structuralChild',
        ),
        edge(
          'root',
          'subgraphCompletion',
          'b',
          'subgraphCompletion',
          'structuralChild',
        ),
        edge(
          'root',
          'subgraphCompletion',
          'c',
          'subgraphCompletion',
          'structuralChild',
        ),
        edge('a', 'workCompletion', 'b', 'workCompletion', 'workDependency'),
        edge('a', 'subgraphCompletion', 'a', 'workCompletion', 'ownWork'),
        edge('b', 'workCompletion', 'a', 'workCompletion', 'workDependency'),
        edge('b', 'subgraphCompletion', 'b', 'workCompletion', 'ownWork'),
        edge(
          'c',
          'workCompletion',
          'c',
          'subgraphCompletion',
          'subgraphCompletionDependency',
        ),
        edge('c', 'subgraphCompletion', 'c', 'workCompletion', 'ownWork'),
      ],
    });
  });

  test(`${Constructor.name} excludes synthetic holder edges from errors and summaries`, async () => {
    const runner = new Constructor<G>({
      sourceRootIsHiddenEntryHolder: true,
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'holder',
              $childDiscoveryHints: ['a', 'b'],
            },
          },
        }),
        resolveChildVertexFromHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf: [id === 'a' ? 'b' : 'a'],
            vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
          },
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    const error = await failure(() =>
      runner.discoverValidateAndFreezeTopology(),
    );
    const originalMilestoneConstraints = [
      edge('a', 'workCompletion', 'b', 'workCompletion', 'workDependency'),
      edge('a', 'subgraphCompletion', 'a', 'workCompletion', 'ownWork'),
      edge('b', 'workCompletion', 'a', 'workCompletion', 'workDependency'),
      edge('b', 'subgraphCompletion', 'b', 'workCompletion', 'ownWork'),
    ];
    expect(error.diagnostics).toMatchObject({ originalMilestoneConstraints });
    expect(
      runner.captureProgressSnapshot().invalidDependencyTopologyDiagnostics,
    ).toMatchObject({ originalMilestoneConstraints });
    expect(
      runner.captureProgressSnapshot().invalidDependencyTopologyDiagnostics,
    ).toMatchObject({ originalMilestoneConstraints });
  });
}

test('manual historical diagnostics default to an empty detached edge list', () => {
  const error = new DagTraversalStallError({
    blockedVertexPrerequisiteReports: [],
    unresolvedPrerequisiteVertexIds: [],
    milestoneCycleVertexIdComponents: [],
    nonCyclePrerequisiteBlockedVertexIds: [],
    incompleteVertexIdsWithoutUnmetPrerequisites: [],
  });
  expect(error.diagnostics).toMatchObject({ originalMilestoneConstraints: [] });
});

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
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
    const runner = new Constructor<
      VertexDataAndChildHintTypes<unknown, unknown>
    >({
      discoveryTiming: 'completeBeforeAnyVisitor',
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: root,
            workWaitsForWorkOf: [root],
            vertexContentInput: { $vertexData: '', $childDiscoveryHints: ids },
          },
        }),
        resolveChildVertexFromHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf: [id, id],
            vertexContentInput: { $vertexData: '', $childDiscoveryHints: [] },
          },
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    const error = await failure(() => runner.runUntilSuspendedOrTerminal());
    const expected = [
      edge(root, 'workCompletion', root, 'workCompletion', 'workDependency'),
      edge(root, 'subgraphCompletion', root, 'workCompletion', 'ownWork'),
      ...ids.map((id) =>
        edge(
          root,
          'subgraphCompletion',
          id,
          'subgraphCompletion',
          'structuralChild',
        ),
      ),
      ...ids.flatMap((id) => [
        edge(id, 'workCompletion', id, 'workCompletion', 'workDependency'),
        edge(id, 'subgraphCompletion', id, 'workCompletion', 'ownWork'),
      ]),
    ];
    expect(error.diagnostics).toMatchObject({
      originalMilestoneConstraints: expected,
      milestoneCycleVertexIdComponents: [
        [root],
        [twin],
        [symbol],
        [undefined],
        [NaN],
        [0],
      ],
    });
    const first =
      runner.captureProgressSnapshot().invalidDependencyTopologyDiagnostics!;
    const second =
      runner.captureProgressSnapshot().invalidDependencyTopologyDiagnostics!;
    const errorEdges = error.diagnostics.originalMilestoneConstraints;
    const firstEdges = first.originalMilestoneConstraints;
    const secondEdges = second.originalMilestoneConstraints;
    expect(firstEdges).toEqual(expected);
    expect(firstEdges).not.toBe(secondEdges);
    firstEdges.forEach((item, index) => {
      expect(item).not.toBe(secondEdges[index]);
      expect(item.waitingMilestone).not.toBe(
        secondEdges[index]!.waitingMilestone,
      );
      expect(item.prerequisiteMilestone).not.toBe(
        secondEdges[index]!.prerequisiteMilestone,
      );
      expect(item.waitingMilestone).not.toBe(item.prerequisiteMilestone);
    });
    expect(firstEdges[0]!.waitingMilestone.vertexId).toBe(root);
    expect(firstEdges[0]!.prerequisiteMilestone.vertexId).toBe(root);
    expect(firstEdges[2]!.prerequisiteMilestone.vertexId).toBe(twin);
    errorEdges[0]!.waitingMilestone.vertexId = 'changed error';
    errorEdges[0]!.prerequisiteMilestone.milestone = 'subgraphCompletion';
    errorEdges.length = 0;
    firstEdges[0]!.waitingMilestone.vertexId = 'changed summary';
    firstEdges[0]!.prerequisiteMilestone.milestone = 'subgraphCompletion';
    firstEdges.push(
      edge(
        'injected',
        'workCompletion',
        'injected',
        'workCompletion',
        'workDependency',
      ),
    );
    expect(secondEdges).toEqual(expected);
    expect(
      runner.captureProgressSnapshot().invalidDependencyTopologyDiagnostics,
    ).toMatchObject({
      originalMilestoneConstraints: expected,
    });
    expect(Object.isFrozen(root)).toBe(false);
    expect(Object.isFrozen(twin)).toBe(false);
    root.value = 2;
    expect(secondEdges[0]!.waitingMilestone.vertexId).toBe(root);
  });
}

test('manual labelled diagnostics copy arrays, edges and both milestone records', () => {
  const vertexId = {};
  const input = {
    blockedVertexPrerequisiteReports: [],
    unresolvedPrerequisiteVertexIds: [],
    milestoneCycleVertexIdComponents: [],
    nonCyclePrerequisiteBlockedVertexIds: [],
    incompleteVertexIdsWithoutUnmetPrerequisites: [],
    originalMilestoneConstraints: [
      edge(
        vertexId,
        'workCompletion',
        vertexId,
        'workCompletion',
        'workDependency',
      ),
    ],
  };
  const error = new DagTraversalStallError(input);
  expect(error.diagnostics).toMatchObject({
    originalMilestoneConstraints: input.originalMilestoneConstraints,
  });
  const edges = error.diagnostics.originalMilestoneConstraints;
  expect(edges).not.toBe(input.originalMilestoneConstraints);
  expect(edges[0]).not.toBe(input.originalMilestoneConstraints[0]);
  expect(edges[0]!.waitingMilestone).not.toBe(
    input.originalMilestoneConstraints[0]!.waitingMilestone,
  );
  expect(edges[0]!.prerequisiteMilestone).not.toBe(
    input.originalMilestoneConstraints[0]!.prerequisiteMilestone,
  );
  input.originalMilestoneConstraints[0]!.waitingMilestone.vertexId = 'changed';
  input.originalMilestoneConstraints[0]!.prerequisiteMilestone.milestone =
    'subgraphCompletion';
  input.originalMilestoneConstraints.length = 0;
  expect(edges).toEqual([
    edge(
      vertexId,
      'workCompletion',
      vertexId,
      'workCompletion',
      'workDependency',
    ),
  ]);
  expect(edges[0]!.waitingMilestone.vertexId).toBe(vertexId);
  expect(Object.isFrozen(vertexId)).toBe(false);
});

test('public preparation diagnoses a 10k-node dependency chain without recursion', async () => {
  type Numeric = VertexDataAndChildHintTypes<number, number>;
  const runner = new DagTraversalBuilder<Numeric, Numeric, number>({
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 0,
          workWaitsForWorkOf: [1],
          vertexContentInput: { $vertexData: 0, $childDiscoveryHints: [1] },
        },
      }),
      resolveChildVertexFromHint: (id) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: id,
          workWaitsForWorkOf: [id + 1],
          vertexContentInput: {
            $vertexData: id,
            $childDiscoveryHints: id < 9999 ? [id + 1] : [],
          },
        },
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  const error = await failure(() => runner.discoverValidateAndFreezeTopology());
  expect(error.diagnostics).toMatchObject({
    milestoneCycleVertexIdComponents: [],
    unresolvedPrerequisiteVertexIds: [10000],
    originalMilestoneConstraints: expect.any(Array),
  });
  const edges = error.diagnostics.originalMilestoneConstraints;
  expect(edges).toHaveLength(29999);
  expect(edges.slice(0, 3)).toEqual([
    edge(0, 'workCompletion', 1, 'workCompletion', 'workDependency'),
    edge(0, 'subgraphCompletion', 0, 'workCompletion', 'ownWork'),
    edge(0, 'subgraphCompletion', 1, 'subgraphCompletion', 'structuralChild'),
  ]);
  expect(edges.slice(-2)).toEqual([
    edge(9999, 'workCompletion', 10000, 'workCompletion', 'workDependency'),
    edge(9999, 'subgraphCompletion', 9999, 'workCompletion', 'ownWork'),
  ]);
});
