import { AsyncGraphWalk, GraphWalk, GraphWalkPhase as Phase } from '../src';
import type { GraphWalkLimits } from '../src';
import { contextFixture, idGraph } from './helpers/graph-walk-fixtures';

it.each([
  { maxCandidateReadAttempts: 0 },
  { maxAdmittedTargets: 0 },
  { maxCandidateReadAttempts: 0, maxAdmittedTargets: 0 },
])('zero global cap %o performs no source calls', (limits) => {
  const { source, calls } = contextFixture();
  const runner = new GraphWalk({ source, limits }).createRunner().run();
  expect(calls).toEqual([]);
  expect(runner.summary().counts).toMatchObject({
    candidateReadAttempts: 0,
    admittedTargets: 0,
  });
  expect(runner.summary().outcome).toEqual({
    kind: 'limited',
    reasons: Object.keys(limits).sort(),
  });
});

it('zero depth permits roots and never opens adjacency', () => {
  const { source, calls } = contextFixture();
  const runner = new GraphWalk({ source, limits: { maxDepth: 0 } })
    .createRunner()
    .run();
  expect(calls).toEqual(['roots', 'resolve:A', 'resolve:E']);
  expect(runner.summary().counts).toMatchObject({
    candidateReadAttempts: 3,
    admittedTargets: 2,
  });
  expect(runner.summary().outcome).toEqual({
    kind: 'limited',
    reasons: ['maxDepth'],
  });
});

it('does not treat returning edge depth as a new vertex cutoff', () => {
  const self = new GraphWalk({
    source: idGraph(['A'], [['A', ['A']]]),
    limits: { maxDepth: 1 },
  })
    .createRunner()
    .run();
  expect(self.summary().outcome).toEqual({ kind: 'exhausted' });
  const boundary = new GraphWalk({
    source: idGraph(
      ['A'],
      [
        ['A', ['B']],
        ['B', []],
      ],
    ),
    limits: { maxDepth: 1 },
  })
    .createRunner()
    .run();
  expect(boundary.summary().outcome).toEqual({
    kind: 'limited',
    reasons: ['maxDepth'],
  });
});

it('runs expansion predicate before depth and lets host pruning exhaust', () => {
  const runner = new GraphWalk({
    source: idGraph(['A'], [['A', []]]),
    limits: { maxDepth: 0 },
    shouldExpandVertex: () => false,
  })
    .createRunner()
    .run();
  expect(runner.summary().outcome).toEqual({ kind: 'exhausted' });
});

it.each([
  {
    limits: { maxCandidateReadAttempts: 1 },
    candidateReadAttempts: 1,
    admittedTargets: 1,
  },
  {
    limits: { maxAdmittedTargets: 1 },
    candidateReadAttempts: 1,
    admittedTargets: 1,
  },
  {
    limits: { maxCandidateReadAttempts: 1, maxAdmittedTargets: 1 },
    candidateReadAttempts: 1,
    admittedTargets: 1,
  },
])(
  'drains admitted observations without probing at exact cap $limits',
  ({ limits, candidateReadAttempts, admittedTargets }) => {
    const { source, calls } = contextFixture();
    const runner = new GraphWalk({ source, limits }).createRunner();
    expect([
      ...runner.iterateEvents({ emitEvents: [Phase.VERTEX, Phase.PATH] }),
    ]).toHaveLength(2);
    expect(calls).toEqual(['roots', 'resolve:A']);
    expect(runner.summary().counts).toMatchObject({
      candidateReadAttempts,
      admittedTargets,
      processedObservations: { vertex: 1, edge: 0, path: 1 },
    });
    expect(runner.summary().outcome).toEqual({
      kind: 'limited',
      reasons: Object.keys(limits).sort(),
    });
  },
);

it.each([
  { roots: [], adjacency: [], maxCandidateReadAttempts: 1, admittedTargets: 0 },
  {
    roots: ['A'],
    adjacency: [['A', []]],
    maxCandidateReadAttempts: 3,
    admittedTargets: 1,
  },
] as { roots: string[]; adjacency: [string, string[]][]; maxCandidateReadAttempts: number; admittedTargets: number }[])(
  'already proven exhaustion wins at step cap $maxCandidateReadAttempts',
  ({ roots, adjacency, maxCandidateReadAttempts, admittedTargets }) => {
    const runner = new GraphWalk({
      source: idGraph(roots, adjacency),
      limits: { maxCandidateReadAttempts },
    })
      .createRunner()
      .run();
    expect(runner.summary().outcome).toEqual({ kind: 'exhausted' });
    expect(runner.summary().counts).toMatchObject({
      candidateReadAttempts: maxCandidateReadAttempts,
      admittedTargets,
    });
  },
);

it('does not open new adjacency after a root-done step reaches the global cap', () => {
  const { source, calls } = contextFixture();
  const runner = new GraphWalk({
    source,
    limits: { maxCandidateReadAttempts: 3 },
  })
    .createRunner()
    .run();
  expect(calls).toEqual(['roots', 'resolve:A', 'resolve:E']);
  expect(runner.summary().outcome).toEqual({
    kind: 'limited',
    reasons: ['maxCandidateReadAttempts'],
  });
});

it('counts duplicate and rejected candidates only as read attempts', () => {
  const runner = new GraphWalk({
    source: idGraph(
      ['A', 'A'],
      [
        ['A', ['B', 'B']],
        ['B', []],
      ],
    ),
    limits: { maxCandidateReadAttempts: 5 },
    shouldFollowEdge: () => false,
  })
    .createRunner()
    .run();
  expect(runner.summary().counts).toMatchObject({
    candidateReadAttempts: 5,
    admittedTargets: 1,
    discoveredLinks: 2,
  });
  expect(runner.summary().outcome).toEqual({
    kind: 'limited',
    reasons: ['maxCandidateReadAttempts'],
  });
});

it('counts omitted and returning targets toward the occurrence cap', () => {
  const source = {
    ...idGraph(['A'], [['A', ['B', 'A']]]),
    resolveVertex: (id: string) =>
      id === 'B'
        ? { kind: 'omitted' as const }
        : { kind: 'found' as const, data: id },
  };
  const runner = new GraphWalk({ source, limits: { maxAdmittedTargets: 3 } })
    .createRunner()
    .run();
  expect(runner.summary().counts).toMatchObject({
    candidateReadAttempts: 4,
    admittedTargets: 3,
    uniqueFoundVertices: 1,
    uniqueOmittedVertices: 1,
    discoveredLinks: 2,
    processedObservations: { vertex: 1, edge: 2, path: 1 },
  });
  expect(runner.summary().outcome).toEqual({
    kind: 'limited',
    reasons: ['maxAdmittedTargets'],
  });
});

it('retains earlier depth cutoffs when a later global cap ends exploration', () => {
  const runner = new GraphWalk({
    source: idGraph(
      ['A', 'B'],
      [
        ['A', []],
        ['B', []],
      ],
    ),
    limits: { maxDepth: 0, maxAdmittedTargets: 1, maxCandidateReadAttempts: 1 },
  })
    .createRunner()
    .run();
  expect(runner.summary().outcome).toEqual({
    kind: 'limited',
    reasons: ['maxDepth', 'maxAdmittedTargets', 'maxCandidateReadAttempts'],
  });
});

it.each(['breadthFirst', 'depthFirst'] as const)(
  '%s retains first-discovery depth and does not reexpand on shorter routes',
  (strategy) => {
    const source = idGraph(
      ['A'],
      [
        ['A', ['B', 'D']],
        ['B', ['D']],
        ['D', ['E']],
        ['E', []],
      ],
    );
    const runner = new GraphWalk({
      source,
      strategy,
      limits: { maxDepth: 2 },
    }).createRunner();
    const vertices = [
      ...runner.iterateEvents({ emitEvents: [Phase.VERTEX] }),
    ].map((e) => [e.vertex.vertexId, e.depth]);
    expect(vertices).toEqual(
      strategy === 'breadthFirst'
        ? [
            ['A', 0],
            ['B', 1],
            ['D', 1],
            ['E', 2],
          ]
        : [
            ['A', 0],
            ['B', 1],
            ['D', 2],
          ],
    );
    expect(runner.summary().outcome).toEqual({
      kind: 'limited',
      reasons: ['maxDepth'],
    });
  },
);

it('replaces supplied limits and atomically rejects invalid patches', () => {
  const factory = new GraphWalk({
    source: idGraph(['A'], [['A', []]]),
    limits: { maxDepth: 0, maxCandidateReadAttempts: 0 },
  });
  factory.configure({ limits: { maxCandidateReadAttempts: 3 } });
  const snapshot = factory.createRunner();
  expect(() =>
    factory.configure({ limits: { maxCandidateReadAttempts: -1 } }),
  ).toThrow(TypeError);
  expect(snapshot.run().summary().outcome).toEqual({ kind: 'exhausted' });
  expect(factory.createRunner().run().summary().outcome).toEqual({
    kind: 'exhausted',
  });
  const limits: GraphWalkLimits = { maxDepth: 0 };
  factory.configure({ limits });
  const bounded = factory.createRunner();
  limits.maxDepth = 8;
  expect(bounded.run().summary().outcome).toEqual({
    kind: 'limited',
    reasons: ['maxDepth'],
  });
});

it.each([GraphWalk, AsyncGraphWalk])(
  '%p charges rejected links without resolving their targets',
  async (Factory) => {
    const resolved: string[] = [];
    const source = {
      roots: () => [{ vertexId: 'A' }],
      resolveVertex(vertexId: string) {
        resolved.push(vertexId);
        if (vertexId !== 'A') throw new Error('Rejected target was resolved');
        return { kind: 'found' as const, data: vertexId };
      },
      outgoing: () => [{ target: { vertexId: 'rejected' }, data: undefined }],
    };
    const runner = new Factory({
      source,
      shouldFollowEdge: () => false,
    }).createRunner();
    await runner.run();
    expect(resolved).toEqual(['A']);
    const summary = runner.summary();
    expect(summary.counts.candidateReadAttempts).toBe(4);
    expect(summary.counts.discoveredLinks).toBe(1);
    expect(summary.counts.uniqueFoundVertices).toBe(1);
    expect(summary.counts.admittedTargets).toBe(1);
    expect(summary.counts.processedObservations).toEqual({
      vertex: 1,
      edge: 0,
      path: 1,
    });
    expect(summary.outcome).toEqual({ kind: 'exhausted' });
  },
);
