import {
  GraphWalk,
  GraphWalkPhase as Phase,
  TraversalRunnerStatus as Status,
} from '../src';
import type { GraphWalkSource, GraphWalkOptions } from '../src';
import { contextFixture, idGraph } from './helpers/graph-walk-fixtures';

it('filters before inline hydration and target lookup, keeping link indices', () => {
  const { source, calls } = contextFixture();
  const followed: string[] = [];
  const runner = new GraphWalk({
    source,
    shouldFollowEdge(edge, context) {
      expect(context.revisit).toBe('once');
      expect(context.source.vertexId).toBe(edge.from);
      expect(context.depth).toBeGreaterThan(0);
      followed.push(`${edge.from}:${edge.outgoingIndex}`);
      return edge.to !== 'B';
    },
  })
    .createRunner()
    .run({ emitEvents: [] });
  expect(calls).not.toContain('resolve:B');
  expect(followed).toEqual(['A:0', 'A:1', 'A:2', 'C:0', 'D:0']);
  expect(runner.summary().counts).toMatchObject({
    admittedTargets: 5,
    discoveredLinks: 5,
    uniqueFoundVertices: 4,
    processedObservations: { vertex: 4, edge: 3, path: 4 },
  });
  const poison = {
    get kind() {
      throw new Error('Must not hydrate');
    },
  };
  const inline = new GraphWalk({
    source: {
      hydration: 'inlineOrCached' as const,
      roots: () => [
        {
          kind: 'inline' as const,
          vertexId: 'A',
          resolution: { kind: 'found' as const, data: 'A' },
        },
      ],
      outgoing: () => [
        {
          target: {
            kind: 'inline' as const,
            vertexId: 'B',
            resolution: poison,
          },
          data: undefined,
        },
      ],
    } as unknown as GraphWalkSource<string, undefined, string>,
    shouldFollowEdge: () => false,
  })
    .createRunner()
    .run();
  expect(inline.summary().outcome).toEqual({ kind: 'exhausted' });
});

it('emits pruned occurrences before expansion and retains the first pruning decision', () => {
  const { source, calls } = contextFixture();
  const expanded: string[] = [];
  const runner = new GraphWalk({
    source,
    shouldExpandVertex(vertex, context) {
      expanded.push(vertex.vertexId);
      expect(context.revisit).toBe('once');
      expect(
        context.via === null
          ? context.depth === 0
          : context.via.to === vertex.vertexId,
      ).toBe(true);
      return vertex.vertexId !== 'B';
    },
  }).createRunner();
  const iterator = runner.iterateEvents({ emitEvents: [Phase.VERTEX] });
  expect(iterator.next().value).toMatchObject({ vertex: { vertexId: 'A' } });
  expect(expanded).toEqual([]);
  expect([...iterator].map((e) => e.vertex.vertexId)).toEqual([
    'E',
    'B',
    'C',
    'D',
  ]);
  expect(expanded).toEqual(['A', 'E', 'B', 'C', 'D']);
  expect(calls).not.toContain('outgoing:B');
  expect(runner.summary().outcome).toEqual({ kind: 'exhausted' });
});

it.each(['shouldFollowEdge', 'shouldExpandVertex'] as const)(
  '%s rejects nonbooleans and synchronous thenables',
  (key) => {
    for (const result of [
      undefined,
      null,
      1,
      'yes',
      {},
      Promise.resolve(true),
    ]) {
      const options = {
        source: idGraph(['A'], [['A', ['A']]]),
        [key]: () => result,
      } as unknown as GraphWalkOptions<string, undefined, string>;
      const runner = new GraphWalk(options).createRunner();
      expect(() => runner.run()).toThrow(TypeError);
      expect(runner.getStatus()).toBe(Status.FAILED);
      const outcome = runner.summary().outcome;
      expect(outcome).toMatchObject({ kind: 'failed' });
      if (outcome?.kind !== 'failed') throw new Error('Expected failure');
      expect(() => runner.run()).toThrow(outcome.error as Error);
    }
  },
);

it.each(['shouldFollowEdge', 'shouldExpandVertex'] as const)(
  '%s retains arbitrary thrown values',
  (key) => {
    for (const error of [undefined, null, Symbol('error')]) {
      const runner = new GraphWalk({
        source: idGraph(['A'], [['A', ['A']]]),
        [key]: () => {
          throw error;
        },
      }).createRunner();
      for (let index = 0; index < 2; index++) {
        let caught = false;
        try {
          runner.run();
        } catch (value) {
          caught = true;
          expect(value).toBe(error);
        }
        expect(caught).toBe(true);
      }
      expect(runner.summary().outcome).toEqual({ kind: 'failed', error });
    }
  },
);

it('detaches predicate wrappers from subsequent observations and expansion', () => {
  const source = idGraph(
    ['A'],
    [
      ['A', ['B']],
      ['B', []],
    ],
  );
  const runner = new GraphWalk({
    source,
    shouldFollowEdge(edge, context) {
      (edge as { to: string }).to = 'bad';
      (context.source as { vertexId: string }).vertexId = 'bad';
      return true;
    },
    shouldExpandVertex(vertex, context) {
      (vertex as { vertexId: string }).vertexId = 'bad';
      if (context.via !== null) (context.via as { to: string }).to = 'bad';
      return true;
    },
  }).createRunner();
  expect([...runner.iterateEvents({ emitEvents: [Phase.EDGE] })]).toMatchObject(
    [
      {
        edge: { from: 'A', to: 'B' },
        source: { vertexId: 'A' },
        target: { vertex: { vertexId: 'B' } },
      },
    ],
  );
  expect(runner.summary().outcome).toEqual({ kind: 'exhausted' });
});
