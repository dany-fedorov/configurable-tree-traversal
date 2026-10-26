import { GraphWalk, GraphWalkPhase as Phase } from '../src';
import type { GraphWalkLimits } from '../src';
import { contextFixture, idGraph } from './helpers/graph-walk-fixtures';

it.each([
  { maxSteps: 0 },
  { maxOccurrences: 0 },
  { maxSteps: 0, maxOccurrences: 0 },
])('zero global cap %o performs no source calls', (limits) => {
  const { source, calls } = contextFixture();
  const runner = new GraphWalk({ source, limits }).createRunner().run();
  expect(calls).toEqual([]);
  expect(runner.summary().counts).toMatchObject({ steps: 0, occurrences: 0 });
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
  expect(runner.summary().counts).toMatchObject({ steps: 3, occurrences: 2 });
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
    expandVertex: () => false,
  })
    .createRunner()
    .run();
  expect(runner.summary().outcome).toEqual({ kind: 'exhausted' });
});

it.each([
  { limits: { maxSteps: 1 }, steps: 1, occurrences: 1 },
  { limits: { maxOccurrences: 1 }, steps: 1, occurrences: 1 },
  { limits: { maxSteps: 1, maxOccurrences: 1 }, steps: 1, occurrences: 1 },
])(
  'drains admitted observations without probing at exact cap $limits',
  ({ limits, steps, occurrences }) => {
    const { source, calls } = contextFixture();
    const runner = new GraphWalk({ source, limits }).createRunner();
    expect([
      ...runner.getIterable({ emitPhases: [Phase.VERTEX, Phase.PATH] }),
    ]).toHaveLength(2);
    expect(calls).toEqual(['roots', 'resolve:A']);
    expect(runner.summary().counts).toMatchObject({
      steps,
      occurrences,
      observations: { vertex: 1, edge: 0, path: 1 },
    });
    expect(runner.summary().outcome).toEqual({
      kind: 'limited',
      reasons: Object.keys(limits).sort(),
    });
  },
);

it.each([
  { roots: [], adjacency: [], maxSteps: 1, occurrences: 0 },
  { roots: ['A'], adjacency: [['A', []]], maxSteps: 3, occurrences: 1 },
] as { roots: string[]; adjacency: [string, string[]][]; maxSteps: number; occurrences: number }[])(
  'already proven exhaustion wins at step cap $maxSteps',
  ({ roots, adjacency, maxSteps, occurrences }) => {
    const runner = new GraphWalk({
      source: idGraph(roots, adjacency),
      limits: { maxSteps },
    })
      .createRunner()
      .run();
    expect(runner.summary().outcome).toEqual({ kind: 'exhausted' });
    expect(runner.summary().counts).toMatchObject({
      steps: maxSteps,
      occurrences,
    });
  },
);

it('does not open new adjacency after a root-done step reaches the global cap', () => {
  const { source, calls } = contextFixture();
  const runner = new GraphWalk({ source, limits: { maxSteps: 3 } })
    .createRunner()
    .run();
  expect(calls).toEqual(['roots', 'resolve:A', 'resolve:E']);
  expect(runner.summary().outcome).toEqual({
    kind: 'limited',
    reasons: ['maxSteps'],
  });
});

it('counts duplicate and rejected candidates only as steps', () => {
  const runner = new GraphWalk({
    source: idGraph(
      ['A', 'A'],
      [
        ['A', ['B', 'B']],
        ['B', []],
      ],
    ),
    limits: { maxSteps: 5 },
    followEdge: () => false,
  })
    .createRunner()
    .run();
  expect(runner.summary().counts).toMatchObject({
    steps: 5,
    occurrences: 1,
    observedLinks: 2,
  });
  expect(runner.summary().outcome).toEqual({
    kind: 'limited',
    reasons: ['maxSteps'],
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
  const runner = new GraphWalk({ source, limits: { maxOccurrences: 3 } })
    .createRunner()
    .run();
  expect(runner.summary().counts).toMatchObject({
    steps: 4,
    occurrences: 3,
    foundVertices: 1,
    omittedVertices: 1,
    observedLinks: 2,
    observations: { vertex: 1, edge: 2, path: 1 },
  });
  expect(runner.summary().outcome).toEqual({
    kind: 'limited',
    reasons: ['maxOccurrences'],
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
    limits: { maxDepth: 0, maxOccurrences: 1, maxSteps: 1 },
  })
    .createRunner()
    .run();
  expect(runner.summary().outcome).toEqual({
    kind: 'limited',
    reasons: ['maxDepth', 'maxOccurrences', 'maxSteps'],
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
      ...runner.getIterable({ emitPhases: [Phase.VERTEX] }),
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
    limits: { maxDepth: 0, maxSteps: 0 },
  });
  factory.configure({ limits: { maxSteps: 3 } });
  const snapshot = factory.createRunner();
  expect(() => factory.configure({ limits: { maxSteps: -1 } })).toThrow(
    TypeError,
  );
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
