import {
  GraphWalk,
  GraphWalkPhase as Phase,
  TraversalVisitorCommandName as C,
  TraversalRunnerStatus as Status,
} from '../src';
import type { GraphWalkSource } from '../src';
import { contextFixture, idGraph } from './helpers/graph-walk-fixtures';

it.each([null, undefined, false, 0, '', Symbol('failure')])(
  'retains and rethrows exact visitor failure %p',
  (error) => {
    const runner = new GraphWalk({
      source: idGraph(['A'], [['A', []]]),
      visitors: {
        vertex: () => {
          throw error;
        },
      },
    }).createRunner();
    for (let attempt = 0; attempt < 2; attempt++) {
      let caught = false;
      try {
        runner.run();
      } catch (value) {
        caught = true;
        expect(value).toBe(error);
      }
      expect(caught).toBe(true);
      expect(runner.getStatus()).toBe(Status.FAILED);
      expect(runner.summary().outcome).toEqual({ kind: 'failed', error });
    }
  },
);

it('drains the admitted visitor chain on cooperative pause with emissions disabled', () => {
  const seen: string[] = [];
  const fixture = contextFixture();
  const t = new GraphWalk({ source: fixture.source, emitEvents: [] });
  t.addVisitorFor(Phase.VERTEX, (event) => {
    seen.push(`first:${event.vertex.vertexId}`);
    expect(runner.requestPause()).toBe(true);
    expect(runner.requestPause()).toBe(false);
  });
  t.addVisitorFor(Phase.VERTEX, (event) => {
    seen.push(`second:${event.vertex.vertexId}`);
  });
  const runner = t.createRunner();
  expect(runner.requestPause()).toBe(false);
  runner.run();
  expect(seen).toEqual(['first:A', 'second:A']);
  expect(runner.isHalted()).toBe(true);
  expect(fixture.calls).toEqual(['roots', 'resolve:A']);
  runner.run({ visitorPhases: { include: [] } });
  expect(runner.getStatus()).toBe(Status.FINISHED);
  expect(seen).toEqual(['first:A', 'second:A']);
});

it('keeps the admitted chain selection while applying a new delivery selector', () => {
  const seen: string[] = [];
  const t = new GraphWalk({ source: idGraph(['A'], [['A', []]]) });
  t.addVisitorFor(Phase.VERTEX, () => {
    seen.push('halt');
    return { commands: [{ commandName: C.PAUSE_TRAVERSAL }] };
  });
  t.addVisitorFor(Phase.VERTEX, () => {
    seen.push('remaining');
  });
  t.addVisitorFor(Phase.PATH, () => {
    seen.push('path');
  });
  const runner = t.createRunner().run();
  expect(seen).toEqual(['halt']);
  const resumed = [
    ...runner.iterateEvents({
      emitEvents: [Phase.PATH],
      visitorPhases: { include: [] },
    }),
  ];
  expect(seen).toEqual(['halt', 'remaining']);
  expect(resumed).toMatchObject([{ kind: 'path' }]);
  expect(resumed.every((e) => e.kind === 'path')).toBe(true);
  expect(runner.summary().counts.processedObservations).toEqual({
    vertex: 1,
    edge: 0,
    path: 1,
  });
});

it('pauses between edge/vertex/path without replay and never expands on iterator return', () => {
  const fixture = contextFixture();
  const runner = new GraphWalk({ source: fixture.source }).createRunner();
  const edges = runner.iterateEvents({ emitEvents: [Phase.EDGE] });
  expect(edges.next().value).toMatchObject({
    kind: 'edge',
    edge: { from: 'A', to: 'B', outgoingIndex: 0 },
  });
  edges.return();
  const atEdge = [...fixture.calls];
  const vertices = runner.iterateEvents({ emitEvents: [Phase.VERTEX] });
  expect(vertices.next().value).toMatchObject({
    kind: 'vertex',
    vertex: { vertexId: 'B' },
  });
  vertices.return();
  expect(fixture.calls).toEqual(atEdge);
  const paths = runner.iterateEvents({ emitEvents: [Phase.PATH] });
  expect(paths.next().value).toMatchObject({ kind: 'path', depth: 1 });
  paths.return();
  expect(fixture.calls).toEqual(atEdge);
  expect(runner.summary().counts.processedObservations).toEqual({
    vertex: 3,
    edge: 1,
    path: 3,
  });
  expect([...runner.iterateEvents({ emitEvents: [] })]).toEqual([]);
  expect(runner.summary().counts.processedObservations).toEqual({
    vertex: 5,
    edge: 6,
    path: 5,
  });
});

it('closing a never-started iterator leaves source, status and current owner untouched', () => {
  const fixture = contextFixture();
  const runner = new GraphWalk({ source: fixture.source }).createRunner();
  runner.iterateEvents().return();
  expect(fixture.calls).toEqual([]);
  expect(runner.getStatus()).toBe(Status.INITIAL);
  const owner = runner.iterateEvents();
  owner.next();
  runner.iterateEvents().return();
  expect(runner.getStatus()).toBe(Status.RUNNING);
  expect(owner.next().value).toMatchObject({
    kind: 'vertex',
    vertex: { vertexId: 'E' },
  });
  owner.return();
});

it('rejects competing owners and reentrant run without corrupting the owning iterator', () => {
  const seen: string[] = [];
  const t = new GraphWalk({ source: idGraph(['A'], [['A', []]]) });
  const runner = t.createRunner();
  t.addVisitorFor(Phase.VERTEX, () => undefined);
  const owner = runner.iterateEvents();
  expect(owner.next().value).toMatchObject({ kind: 'vertex' });
  expect(() => runner.iterateEvents({ emitEvents: [] }).next()).toThrow(
    'execution owner',
  );
  expect(() => runner.run()).toThrow('execution owner');
  expect(runner.inspect().executionOptions.emitEvents).toEqual([Phase.VERTEX]);
  expect(owner.next().done).toBe(true);
  const reentrant = new GraphWalk({ source: idGraph(['A'], [['A', []]]) });
  reentrant.addVisitorFor(Phase.VERTEX, () => {
    expect(() => nested.run()).toThrow('execution owner');
    seen.push('continued');
  });
  const nested = reentrant.createRunner();
  nested.run();
  expect(seen).toEqual(['continued']);
  expect(nested.getStatus()).toBe(Status.FINISHED);
});

it('consumer errors and iterator throw pause a resumable runner with completed callbacks retained', () => {
  const seen: string[] = [];
  const runner = new GraphWalk({
    source: idGraph(
      ['A', 'B'],
      [
        ['A', []],
        ['B', []],
      ],
    ),
    visitors: {
      vertex: (event) => {
        seen.push(event.vertex.vertexId);
      },
    },
  }).createRunner();
  const error = Symbol('consumer');
  let caught = false;
  try {
    for (const _event of runner.iterateEvents()) throw error;
  } catch (value) {
    caught = true;
    expect(value).toBe(error);
  }
  expect(caught).toBe(true);
  expect(runner.getStatus()).toBe(Status.HALTED);
  const next = runner.iterateEvents();
  expect(next.next().value).toMatchObject({
    kind: 'vertex',
    vertex: { vertexId: 'B' },
  });
  expect(() => next.throw(new Error('consumer throw'))).toThrow(
    'consumer throw',
  );
  expect(runner.getStatus()).toBe(Status.HALTED);
  runner.run();
  expect(seen).toEqual(['A', 'B']);
  expect(runner.getStatus()).toBe(Status.FINISHED);
  const summary = runner.summary();
  expect(runner.run()).toBe(runner);
  expect([...runner.iterateEvents()]).toEqual([]);
  expect(runner.summary()).toEqual(summary);
  expect(runner.requestPause()).toBe(false);
});

it('retains exact result getter failures before any command batch applies', () => {
  const error = undefined;
  const value = {
    get commands(): never {
      throw error;
    },
  };
  const source: GraphWalkSource<string, undefined, string> = idGraph(
    ['A'],
    [['A', []]],
  );
  const runner = new GraphWalk({
    source,
    visitors: { vertex: () => value },
  }).createRunner();
  let caught = false;
  try {
    runner.run();
  } catch (failure) {
    caught = true;
    expect(failure).toBe(error);
  }
  expect(caught).toBe(true);
  expect(runner.getStatus()).toBe(Status.FAILED);
});

it('emits the drained observation before acknowledging cooperative pause and preserves its pending path', () => {
  const seen: string[] = [];
  const t = new GraphWalk({ source: idGraph(['A'], [['A', []]]) });
  t.addVisitorGroupFor(Phase.VERTEX, {
    commandCommitMode: 'afterGroup' as const,
    visitors: [
      () => {
        expect(runner.requestPause()).toBe(true);
        seen.push('first');
      },
      () => {
        seen.push('second');
        expect(runner.inspect()).toMatchObject({
          activeVisitor: { phase: Phase.VERTEX, visitorIndex: 1 },
          inFlightCallbackCount: 1,
          pendingRequests: [{ operation: 'visitor' }],
        });
      },
    ],
  });
  const runner = t.createRunner();
  expect([...runner.iterateEvents()]).toMatchObject([{ kind: 'vertex' }]);
  expect(seen).toEqual(['first', 'second']);
  expect(runner.getStatus()).toBe(Status.HALTED);
  expect([...runner.iterateEvents({ emitEvents: [Phase.PATH] })]).toMatchObject(
    [{ kind: 'path' }],
  );
  expect(seen).toEqual(['first', 'second']);
});
