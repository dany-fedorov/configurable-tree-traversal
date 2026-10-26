import {
  GraphWalk,
  GraphWalkPhase as Phase,
  DepthFirstTraversalOrder,
} from '../src';
import { contextFixture } from './helpers/graph-walk-fixtures';

it('selects observations independently of exploration and committed logical counts', () => {
  const left = contextFixture();
  const right = contextFixture();
  const first = new GraphWalk({ source: left.source }).makeRunner();
  const second = new GraphWalk({ source: right.source }).makeRunner();
  first.run({ emitPhases: [], visitorPhases: { include: [] } });
  second.run({ emitPhases: [Phase.VERTEX, Phase.EDGE] });
  expect(first.summary().counts).toEqual(second.summary().counts);
  expect(first.summary().counts.occurrences).toBe(8);
  expect(left.calls).toEqual(right.calls);
  expect(first.summary().counts).toMatchObject({
    foundVertices: 5,
    omittedVertices: 0,
    observedLinks: 6,
  });
});

it('enforces explicit delivery selectors on buffered observations across a pause', () => {
  const runner = new GraphWalk({
    source: contextFixture().source,
  }).makeRunner();
  const first = runner.getIterable({ emitPhases: [Phase.EDGE] });
  expect(first.next().value).toMatchObject({ kind: 'edge' });
  first.return();
  const second = runner.getIterable({ emitPhases: [Phase.PATH] });
  expect(second.next().value).toMatchObject({ kind: 'path', depth: 1 });
  second.return();
  expect([...runner.getIterable({ emitPhases: [] })]).toEqual([]);
  expect(runner.summary().counts.observations).toEqual({
    vertex: 5,
    edge: 6,
    path: 5,
  });
});

it('validates and detaches selector patches before activation without changing prior state', () => {
  const runner = new GraphWalk({
    source: contextFixture().source,
    emitPhases: [Phase.EDGE],
  }).makeRunner();
  const original = runner.inspect().iterableConfig;
  expect(() =>
    runner.getIterable({
      emitPhases: [DepthFirstTraversalOrder.PRE_ORDER as unknown as Phase],
    }),
  ).toThrow(TypeError);
  expect(() =>
    runner.getIterable({
      emitPhases: [Phase.VERTEX],
      iterateOver: [Phase.PATH],
    } as never),
  ).toThrow(TypeError);
  expect(runner.inspect().iterableConfig).toEqual(original);
  const emitPhases = [Phase.VERTEX];
  const iterator = runner.getIterable({ emitPhases });
  emitPhases[0] = Phase.EDGE;
  expect(iterator.next().value).toMatchObject({ kind: 'vertex' });
  iterator.return();
  expect([...runner.getIterable({})].every((e) => e.kind === 'vertex')).toBe(
    true,
  );
});

it('preserves legacy alias behavior through field-wise patches', () => {
  const runner = new GraphWalk({
    source: contextFixture().source,
  }).makeRunner();
  const iterator = runner.getIterable({ iterateOver: [Phase.EDGE] });
  expect(iterator.next().value).toMatchObject({ kind: 'edge' });
  iterator.return();
  expect(
    [
      ...runner.getIterable({ visitorPhases: { exclude: [Phase.VERTEX] } }),
    ].every((e) => e.kind === 'edge'),
  ).toBe(true);
});
