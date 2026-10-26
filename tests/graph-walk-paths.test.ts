import { GraphWalk, GraphWalkPhase as Phase } from '../src';
import type { GraphWalkSource } from '../src';
import { idGraph } from './helpers/graph-walk-fixtures';

const policies = ['simplePaths', 'walks'] as const;
const diamond = () =>
  idGraph(
    ['A'],
    [
      ['A', ['B', 'C']],
      ['B', ['D']],
      ['C', ['D']],
      ['D', ['A']],
    ],
  );

it.each(policies)(
  'enumerates bounded %s diamond prefixes with repeated observations',
  (revisit) => {
    const runner = new GraphWalk({
      source: diamond(),
      revisit,
      limits: { maxDepth: 3 },
    }).createRunner();
    const events = [
      ...runner.getIterable({
        emitPhases: [Phase.VERTEX, Phase.EDGE, Phase.PATH],
      }),
    ];
    const paths = events
      .filter((event) => event.kind === 'path')
      .map(
        (event) =>
          event.kind === 'path' &&
          event.vertices.map((v) => v.vertexId).join(''),
      );
    expect(paths).toEqual(
      revisit === 'simplePaths'
        ? ['A', 'AB', 'AC', 'ABD', 'ACD']
        : ['A', 'AB', 'AC', 'ABD', 'ACD', 'ABDA', 'ACDA'],
    );
    expect(events.map((event) => event.kind)).toEqual([
      'vertex',
      'path',
      ...Array.from({ length: paths.length - 1 }, () => [
        'edge',
        'vertex',
        'path',
      ]).flat(),
    ]);
    expect(runner.summary()).toMatchObject({
      counts: {
        foundVertices: 4,
        omittedVertices: 0,
        observedLinks: 5,
        steps: 13,
        occurrences: paths.length,
      },
      outcome:
        revisit === 'simplePaths'
          ? { kind: 'exhausted' }
          : { kind: 'limited', reasons: ['maxDepth'] },
    });
  },
);

it.each(policies)(
  'distinguishes parallel links and replays cached done steps under %s',
  (revisit) => {
    const source = idGraph(
      ['A'],
      [
        ['A', ['B', 'B']],
        ['B', []],
      ],
    );
    const runner = new GraphWalk({
      source,
      revisit,
      limits: { maxSteps: 7 },
    }).createRunner();
    const paths = [...runner.getIterable({ emitPhases: [Phase.PATH] })];
    expect(
      paths.map((path) => path.vertices.map((v) => v.vertexId).join('')),
    ).toEqual(['A', 'AB', 'AB']);
    expect(paths.map((path) => path.edges.map((edge) => edge.index))).toEqual([
      [],
      [0],
      [1],
    ]);
    expect(runner.summary()).toMatchObject({
      counts: { steps: 7, occurrences: 3, foundVertices: 2, observedLinks: 2 },
      outcome: { kind: 'exhausted' },
    });
  },
);

it.each(policies)(
  'replays a physical done only within the remaining step budget under %s',
  (revisit) => {
    const runner = new GraphWalk({
      source: idGraph(
        ['A'],
        [
          ['A', ['B', 'B']],
          ['B', []],
        ],
      ),
      revisit,
      limits: { maxSteps: 6 },
    })
      .createRunner()
      .run();
    expect(runner.summary()).toMatchObject({
      counts: { steps: 6, occurrences: 3, observedLinks: 2 },
      outcome: { kind: 'limited', reasons: ['maxSteps'] },
    });
  },
);

it.each(policies)(
  'adds a root reached earlier through another root, deduplicating declarations under %s',
  (revisit) => {
    const runner = new GraphWalk({
      source: idGraph(
        ['A', 'B', 'B'],
        [
          ['A', ['B']],
          ['B', []],
        ],
      ),
      strategy: 'depthFirst',
      revisit,
      limits: { maxDepth: 2 },
    }).createRunner();
    expect(
      [...runner.getIterable({ emitPhases: [Phase.PATH] })].map((path) =>
        path.vertices.map((v) => v.vertexId).join(''),
      ),
    ).toEqual(['A', 'AB', 'B']);
    expect(runner.summary()).toMatchObject({
      counts: { steps: 8, occurrences: 3, foundVertices: 2, observedLinks: 1 },
      outcome: { kind: 'exhausted' },
    });
  },
);

it.each(policies)(
  'evaluates follow and expansion for each %s prefix and caches omissions',
  (revisit) => {
    const expanded: string[] = [];
    const followed: string[] = [];
    const resolved: string[] = [];
    const source = idGraph(
      ['A'],
      [
        ['A', ['B', 'C']],
        ['B', ['D', 'X']],
        ['C', ['D', 'X']],
        ['D', []],
      ],
    );
    const runner = new GraphWalk({
      source: {
        ...source,
        resolveVertex(id) {
          resolved.push(id);
          return id === 'X' ? { kind: 'omitted' } : source.resolveVertex!(id);
        },
      },
      revisit,
      limits: { maxDepth: 3 },
      followEdge(edge, context) {
        if (context.revisit === 'once')
          throw new Error('Missing route context');
        const path = context.path.vertices.map((v) => v.vertexId).join('');
        expect(context.source.vertexId).toBe(edge.from);
        expect(context.depth).toBe(context.path.depth + 1);
        followed.push(path + edge.to);
        return path !== 'AB' || edge.to !== 'D';
      },
      expandVertex(vertex, context) {
        if (context.revisit === 'once')
          throw new Error('Missing route context');
        expect(context.depth).toBe(context.path.depth);
        expect(context.path.vertices.at(-1)!.vertexId).toBe(vertex.vertexId);
        expect(context.via).toEqual(context.path.edges.at(-1) ?? null);
        expanded.push(context.path.vertices.map((v) => v.vertexId).join(''));
        return true;
      },
    }).createRunner();
    const events = [
      ...runner.getIterable({ emitPhases: [Phase.EDGE, Phase.PATH] }),
    ];
    expect(expanded).toEqual(['A', 'AB', 'AC', 'ACD']);
    expect(followed).toEqual(['AB', 'AC', 'ABD', 'ABX', 'ACD', 'ACX']);
    expect(resolved).toEqual(['A', 'B', 'C', 'X', 'D']);
    expect(
      events.filter(
        (event) => event.kind === 'edge' && event.target.kind === 'omitted',
      ),
    ).toHaveLength(2);
    expect(runner.summary().counts).toMatchObject({
      occurrences: 6,
      foundVertices: 4,
      omittedVertices: 1,
      observedLinks: 6,
    });
  },
);

it.each(policies)(
  'can prune just one expansion of a shared target under %s',
  (revisit) => {
    const opened: string[] = [];
    const source = idGraph(
      ['A'],
      [
        ['A', ['B', 'C']],
        ['B', ['D']],
        ['C', ['D']],
        ['D', ['E']],
        ['E', []],
      ],
    );
    const runner = new GraphWalk({
      source: {
        ...source,
        outgoing(vertex) {
          opened.push(vertex.vertexId);
          return source.outgoing(vertex);
        },
      },
      revisit,
      limits: { maxDepth: 4 },
      expandVertex: (_vertex, context) =>
        context.revisit !== 'once' &&
        context.path.vertices.map((v) => v.vertexId).join('') !== 'ABD',
    }).createRunner();
    expect(
      [...runner.getIterable({ emitPhases: [Phase.PATH] })].map((path) =>
        path.vertices.map((v) => v.vertexId).join(''),
      ),
    ).toEqual(['A', 'AB', 'AC', 'ABD', 'ACD', 'ACDE']);
    expect(opened).toEqual(['A', 'B', 'C', 'D', 'E']);
  },
);

it.each([0, 1])(
  'handles self-links at depth %i with eligibility before follow',
  (maxDepth) => {
    for (const revisit of policies) {
      const followed: string[] = [];
      const runner = new GraphWalk({
        source: idGraph(['A'], [['A', ['A']]]),
        revisit,
        limits: { maxDepth },
        followEdge(edge) {
          followed.push(edge.to);
          return true;
        },
      }).createRunner();
      const paths = [...runner.getIterable({ emitPhases: [Phase.PATH] })];
      const repeats = revisit === 'walks' && maxDepth === 1;
      expect(
        paths.map((path) => path.vertices.map((v) => v.vertexId).join('')),
      ).toEqual(repeats ? ['A', 'AA'] : ['A']);
      expect(followed).toEqual(repeats ? ['A'] : []);
      expect(runner.summary().outcome).toEqual(
        maxDepth === 1 && revisit === 'simplePaths'
          ? { kind: 'exhausted' }
          : { kind: 'limited', reasons: ['maxDepth'] },
      );
    }
  },
);

it('tests simple path ancestry with SameValueZero and preserves object and symbol identities', () => {
  const object = {};
  const symbol = Symbol('vertex');
  const ids = [NaN, -0, undefined, object, symbol];
  const links = new Map<unknown, unknown[]>([
    [NaN, [0]],
    [0, [undefined]],
    [undefined, [object]],
    [object, [symbol]],
    [symbol, [NaN]],
  ]);
  const followed: unknown[] = [];
  const source: GraphWalkSource<unknown, undefined, unknown> = {
    roots: () => [{ vertexId: NaN }],
    resolveVertex: (id) => ({ kind: 'found', data: id }),
    outgoing: (vertex) =>
      links
        .get(vertex.vertexId)!
        .map((vertexId) => ({ target: { vertexId }, data: undefined })),
  };
  const runner = new GraphWalk({
    source,
    revisit: 'simplePaths',
    limits: { maxSteps: 20 },
    followEdge(edge) {
      followed.push(edge.to);
      return true;
    },
  }).createRunner();
  const paths = [...runner.getIterable({ emitPhases: [Phase.PATH] })];
  expect(paths).toHaveLength(5);
  expect(paths[4]!.vertices.map((v) => v.vertexId)).toEqual([
    NaN,
    0,
    undefined,
    object,
    symbol,
  ]);
  expect(followed).toEqual(
    ids.slice(1).map((id) => (Object.is(id, -0) ? 0 : id)),
  );
  expect(runner.summary().outcome).toEqual({ kind: 'exhausted' });
});

it.each(policies)(
  'keeps counters and source access independent of mixed %s selectors',
  (revisit) => {
    const results = [
      [],
      [Phase.PATH],
      [Phase.VERTEX, Phase.EDGE],
      [Phase.EDGE, Phase.PATH],
    ].map((emitPhases) => {
      const calls: string[] = [];
      const source = diamond();
      const runner = new GraphWalk({
        source: {
          ...source,
          resolveVertex(id) {
            calls.push('resolve:' + id);
            return source.resolveVertex!(id);
          },
          outgoing(vertex) {
            calls.push('open:' + vertex.vertexId);
            return source.outgoing(vertex);
          },
        },
        revisit,
        limits: { maxDepth: 3 },
        visitorPhases: { include: [] },
      }).createRunner();
      [...runner.getIterable({ emitPhases })];
      return { counts: runner.summary().counts, calls };
    });
    for (const result of results) expect(result).toEqual(results[0]);
    expect(results[0]!.calls).toEqual([
      'resolve:A',
      'open:A',
      'resolve:B',
      'resolve:C',
      'open:B',
      'resolve:D',
      'open:C',
      'open:D',
    ]);
  },
);

it.each(policies)(
  'makes no source calls with zero global %s limits',
  (revisit) => {
    for (const limits of [
      { maxSteps: 0 },
      { maxDepth: 2, maxOccurrences: 0 },
    ]) {
      const calls: string[] = [];
      const runner = new GraphWalk({
        source: {
          roots() {
            calls.push('roots');
            return [];
          },
          outgoing: () => [],
        },
        revisit,
        limits,
      })
        .createRunner()
        .run();
      expect(calls).toEqual([]);
      expect(runner.summary().counts.steps).toBe(0);
    }
  },
);

it.each(policies)(
  'bounds filtered %s candidates and closes the partial physical stream',
  (revisit) => {
    const calls: string[] = [];
    const runner = new GraphWalk({
      source: {
        roots: () => [
          { vertexId: 'A', resolution: { kind: 'found' as const, data: 'A' } },
        ],
        outgoing: function* () {
          try {
            for (const vertexId of ['B', 'C', 'D']) {
              calls.push(vertexId);
              yield { target: { vertexId }, data: undefined };
            }
          } finally {
            calls.push('closed');
          }
        },
      },
      revisit,
      limits: { maxSteps: 4 },
      followEdge: () => false,
    })
      .createRunner()
      .run();
    expect(calls).toEqual(['B', 'C', 'closed']);
    expect(runner.summary()).toMatchObject({
      counts: { steps: 4, occurrences: 1, foundVertices: 1, observedLinks: 2 },
      outcome: { kind: 'limited', reasons: ['maxSteps'] },
    });
    expect(runner.inspect().openSourceIteratorCount).toBe(0);
  },
);

it.each(policies)(
  'keeps deep %s routes iterative without materializing hidden path prefixes',
  (revisit) => {
    const runner = new GraphWalk({
      source: {
        roots: () => [{ vertexId: 0 }],
        resolveVertex: (id: number) => ({ kind: 'found' as const, data: id }),
        outgoing: (vertex) => [
          { target: { vertexId: vertex.vertexId + 1 }, data: undefined },
        ],
      },
      strategy: 'depthFirst',
      revisit,
      limits: { maxSteps: 12000 },
      emitPhases: [],
    })
      .createRunner()
      .run();
    expect(runner.summary()).toMatchObject({
      counts: { steps: 12000, occurrences: 12000 },
      outcome: { kind: 'limited', reasons: ['maxSteps'] },
    });
  },
);

it.each(policies)(
  'keeps route bounds atomic across construction and merged configure for %s',
  (revisit) => {
    const source = idGraph(['A'], [['A', ['A']]]);
    // @ts-expect-error Runtime callers must also provide a route exploration bound.
    expect(() => new GraphWalk({ source, revisit })).toThrow(TypeError);
    const factory = new GraphWalk({ source });
    expect(() => factory.configure({ revisit })).toThrow(TypeError);
    expect(factory.createRunner().run().summary().outcome).toEqual({
      kind: 'exhausted',
    });
    factory.configure({ limits: { maxDepth: 1 } }).configure({ revisit });
    expect(() => factory.configure({ limits: { maxOccurrences: 5 } })).toThrow(
      TypeError,
    );
    const runner = factory.createRunner();
    expect([...runner.getIterable({ emitPhases: [Phase.PATH] })]).toHaveLength(
      revisit === 'walks' ? 2 : 1,
    );
  },
);

it('materializes a deep pending path iteratively after an emission selector change', () => {
  const runner = new GraphWalk({
    source: idGraph(['A'], [['A', ['A']]]),
    strategy: 'depthFirst',
    revisit: 'walks',
    limits: { maxSteps: 12000 },
  }).createRunner();
  const vertices = runner.getIterable({ emitPhases: [Phase.VERTEX] });
  for (let i = 0; i < 12000; i++) expect(vertices.next().done).toBe(false);
  vertices.return();
  const paths = [...runner.getIterable({ emitPhases: [Phase.PATH] })];
  expect(paths).toHaveLength(1);
  expect(paths[0]!.depth).toBe(11999);
  expect(paths[0]!.vertices).toHaveLength(12000);
  expect(paths[0]!.edges).toHaveLength(11999);
  expect(paths[0]!.edges[11998]).toEqual({
    from: 'A',
    to: 'A',
    index: 0,
    data: undefined,
  });
  expect(runner.summary().counts).toMatchObject({
    steps: 12000,
    occurrences: 12000,
    foundVertices: 1,
    observedLinks: 1,
  });
});

it('keeps once paths first-discovery only without a route bound', () => {
  const runner = new GraphWalk({ source: diamond() }).createRunner();
  expect(
    [...runner.getIterable({ emitPhases: [Phase.PATH] })].map((path) =>
      path.vertices.map((v) => v.vertexId).join(''),
    ),
  ).toEqual(['A', 'AB', 'AC', 'ABD']);
  expect(runner.summary().outcome).toEqual({ kind: 'exhausted' });
});

it.each(policies)(
  'can reject a cached link on one %s route and admit it on another',
  (revisit) => {
    const calls: string[] = [];
    const source = idGraph(
      ['A'],
      [
        ['A', ['B', 'C']],
        ['B', ['D']],
        ['C', ['D']],
        ['D', ['E']],
        ['E', []],
      ],
    );
    const runner = new GraphWalk({
      source: {
        ...source,
        resolveVertex(id) {
          calls.push('resolve:' + id);
          return source.resolveVertex!(id);
        },
        outgoing(vertex) {
          calls.push('open:' + vertex.vertexId);
          return source.outgoing(vertex);
        },
      },
      revisit,
      limits: { maxDepth: 4 },
      followEdge(_edge, context) {
        if (context.revisit === 'once') throw new Error('Expected route');
        const path = context.path.vertices.map((v) => v.vertexId).join('');
        // Mutating a projected wrapper cannot change ancestry or future contexts.
        Reflect.set(context.path.vertices[0]!, 'vertexId', 'mutated');
        return path !== 'ABD';
      },
    }).createRunner();
    expect(
      [...runner.getIterable({ emitPhases: [Phase.PATH] })].map((path) =>
        path.vertices.map((v) => v.vertexId).join(''),
      ),
    ).toEqual(['A', 'AB', 'AC', 'ABD', 'ACD', 'ACDE']);
    expect(calls).toEqual([
      'resolve:A',
      'open:A',
      'resolve:B',
      'resolve:C',
      'open:B',
      'resolve:D',
      'open:C',
      'open:D',
      'resolve:E',
      'open:E',
    ]);
    expect(runner.summary().counts).toMatchObject({
      occurrences: 6,
      foundVertices: 5,
      observedLinks: 5,
      steps: 14,
    });
  },
);

it.each([-0, 0])(
  'rejects a signed-zero simple-path self-link from %p before follow',
  (vertexId) => {
    const calls: number[] = [];
    const runner = new GraphWalk({
      source: {
        roots: () => [
          { vertexId, resolution: { kind: 'found' as const, data: vertexId } },
        ],
        outgoing: () => [{ target: { vertexId: -vertexId }, data: undefined }],
      },
      revisit: 'simplePaths',
      limits: { maxSteps: 10 },
      followEdge(edge) {
        calls.push(edge.to);
        return true;
      },
    })
      .createRunner()
      .run();
    expect(calls).toEqual([]);
    expect(runner.summary()).toMatchObject({
      counts: { occurrences: 1, observedLinks: 1 },
      outcome: { kind: 'exhausted' },
    });
  },
);
