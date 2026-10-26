import { GraphWalk, GraphWalkPhase, TraversalRunnerStatus } from '../src';
import { contextFixture, idGraph } from './helpers/graph-walk-fixtures';

it('observes vertices and every parallel/returning relationship in one pass', () => {
  const { source, calls } = contextFixture();
  const walker = new GraphWalk({ source });
  const runner = walker.createRunner();
  expect(calls).toEqual([]);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.INITIAL);
  const events = [
    ...runner.getIterable({
      emitPhases: [GraphWalkPhase.VERTEX, GraphWalkPhase.EDGE],
    }),
  ];
  expect(
    events.map((event) =>
      event.kind === 'vertex'
        ? `v:${event.vertex.vertexId}`
        : `e:${event.edge.from}:${event.edge.to}:${event.edge.data.kind}`,
    ),
  ).toEqual([
    'v:A',
    'v:E',
    'e:A:B:imports',
    'v:B',
    'e:A:B:references',
    'e:A:C:cites',
    'v:C',
    'e:B:D:definedIn',
    'v:D',
    'e:C:D:cites',
    'e:D:A:cites',
  ]);
  expect(runner.summary()).toEqual({
    status: TraversalRunnerStatus.FINISHED,
    outcome: { kind: 'exhausted' },
    counts: {
      steps: 14,
      occurrences: 8,
      foundVertices: 5,
      omittedVertices: 0,
      observedLinks: 6,
      observations: { vertex: 5, edge: 6, path: 5 },
    },
  });
  expect(calls.filter((call) => call.startsWith('resolve:'))).toEqual([
    'resolve:A',
    'resolve:E',
    'resolve:B',
    'resolve:C',
    'resolve:D',
  ]);
  expect(calls.filter((call) => call.startsWith('outgoing:'))).toEqual([
    'outgoing:A',
    'outgoing:E',
    'outgoing:B',
    'outgoing:C',
    'outgoing:D',
  ]);
});

it('discovers depth first in source order without pulling the next root early', () => {
  const { source, calls } = contextFixture();
  const runner = new GraphWalk({ source, strategy: 'depthFirst' }).createRunner();
  const iterator = runner.getIterable({ emitPhases: [GraphWalkPhase.VERTEX] });
  expect(iterator.next().value).toMatchObject({
    kind: 'vertex',
    vertex: { vertexId: 'A' },
  });
  expect(calls).toEqual(['roots', 'resolve:A']);
  expect([...iterator].map((event) => event.vertex.vertexId)).toEqual([
    'B',
    'D',
    'C',
    'E',
  ]);
});

it('projects first-discovery prefix paths including isolated roots', () => {
  const source = idGraph(
    ['A', 'E'],
    [
      ['A', ['B']],
      ['B', ['A']],
      ['E', []],
    ],
  );
  const events = [
    ...new GraphWalk({ source })
      .createRunner()
      .getIterable({ emitPhases: [GraphWalkPhase.PATH] }),
  ];
  expect(
    events.map((event) => ({
      ids: event.vertices.map((vertex) => vertex.vertexId),
      edges: event.edges.map((edge) => [edge.from, edge.index, edge.to]),
      depth: event.depth,
    })),
  ).toEqual([
    { ids: ['A'], edges: [], depth: 0 },
    { ids: ['E'], edges: [], depth: 0 },
    { ids: ['A', 'B'], edges: [['A', 0, 'B']], depth: 1 },
  ]);
});

it('selects edges independently and runs to exhaustion without selecting any records', () => {
  const { source } = contextFixture();
  const runner = new GraphWalk({ source }).createRunner();
  expect([
    ...runner.getIterable({ emitPhases: [GraphWalkPhase.EDGE] }),
  ]).toHaveLength(6);
  const hidden = new GraphWalk({ source, emitPhases: [] }).createRunner();
  expect(hidden.run()).toBe(hidden);
  expect(hidden.summary()).toEqual(runner.summary());
  expect([...runner.getIterable()]).toEqual([]);
});

it('pauses without expanding yielded occurrences and resumes pending phases with new selectors', () => {
  const { source, calls } = contextFixture();
  const runner = new GraphWalk({ source }).createRunner();
  expect(runner.requestPause()).toBe(false);
  expect(runner.getStopReason()).toBeNull();
  expect(runner.isHalted()).toBe(false);
  const idle = runner.inspect();
  expect(idle).toMatchObject({
    kind: 'graph-walk',
    execution: 'sync',
    openSourceIteratorCount: 0,
    frontierSize: 0,
  });
  const iterator = runner.getIterable({ emitPhases: [GraphWalkPhase.EDGE] });
  const edge = iterator.next().value!;
  expect(edge.kind).toBe('edge');
  expect(calls).not.toContain('outgoing:B');
  iterator.return();
  expect(runner.isHalted()).toBe(true);
  expect(runner.getStopReason()).toBe('paused');
  expect(runner.summary().outcome).toBeNull();
  const before = calls.slice();
  const inspection = runner.inspect();
  expect(calls).toEqual(before);
  expect(inspection.pendingObservationKinds).toEqual([
    GraphWalkPhase.VERTEX,
    GraphWalkPhase.PATH,
  ]);
  expect(inspection.openSourceIteratorCount).toBe(1);
  expect(Object.isFrozen(inspection)).toBe(true);
  expect(Object.isFrozen(inspection.counts.observations)).toBe(true);
  expect(Object.isFrozen(inspection.iterableConfig.emitPhases)).toBe(true);
  const vertices = [
    ...runner.getIterable({
      emitPhases: [GraphWalkPhase.VERTEX],
      visitorPhases: { include: [] },
    }),
  ];
  expect(vertices.map((event) => event.vertex.vertexId)).toEqual([
    'B',
    'C',
    'D',
  ]);
  expect(runner.inspect().iterableConfig.visitorPhases).toEqual({
    include: [],
  });
  expect(runner.inspect().openSourceIteratorCount).toBe(0);
  expect(idle.counts.occurrences).toBe(0);
  expect(inspection.counts.occurrences).toBe(3);
});

it('retains detached emitted wrappers across caller mutation', () => {
  const source = idGraph(
    ['A'],
    [
      ['A', ['B']],
      ['B', []],
    ],
  );
  const runner = new GraphWalk({ source }).createRunner();
  const iterator = runner.getIterable({
    emitPhases: [GraphWalkPhase.EDGE, GraphWalkPhase.PATH],
  });
  const root = iterator.next().value!;
  if (root.kind !== 'path') throw new Error('Expected path');
  (root.vertices[0] as { vertexId: string }).vertexId = 'bad';
  (root.edges as unknown[]).push('bad');
  const edge = iterator.next().value!;
  if (edge.kind !== 'edge') throw new Error('Expected edge');
  (edge.edge as { to: string }).to = 'bad';
  (edge.source as { vertexId: string }).vertexId = 'bad';
  expect(iterator.next().value).toMatchObject({
    kind: 'path',
    vertices: [{ vertexId: 'A' }, { vertexId: 'B' }],
    edges: [{ from: 'A', to: 'B' }],
  });
  expect(iterator.next().done).toBe(true);
});

it('protects execution ownership and validates selector patches atomically', () => {
  const runner = new GraphWalk({
    source: idGraph(['A'], [['A', []]]),
  }).createRunner();
  const iterator = runner.getIterable();
  iterator.next();
  expect(() => runner.run()).toThrow('execution owner');
  expect(() =>
    runner.getIterable({ emitPhases: ['wrong' as GraphWalkPhase] }),
  ).toThrow(TypeError);
  iterator.return();
  const factory = new GraphWalk({ source: idGraph([], []) });
  expect(
    factory.configure({
      emitPhases: [],
      visitorPhases: { exclude: [GraphWalkPhase.EDGE] },
    }),
  ).toBe(factory);
  const configured = factory.createRunner();
  expect(configured.inspect().iterableConfig.visitorPhases).toEqual({
    exclude: [GraphWalkPhase.EDGE],
  });
  expect(configured.run().getStopReason()).toBe('finished');
});

it('acknowledges an existing pause request when the iterator owner returns', () => {
  const { source, calls } = contextFixture();
  const runner = new GraphWalk({ source }).createRunner();
  const iterator = runner.getIterable();
  iterator.next();
  expect(runner.requestPause()).toBe(true);
  const before = calls.slice();
  iterator.return();
  expect(runner.isHalted()).toBe(true);
  expect(runner.getStopReason()).toBe('paused');
  expect(calls).toEqual(before);
  runner.run();
  expect(runner.summary().outcome).toEqual({ kind: 'exhausted' });
});
