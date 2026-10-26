import { DepthFirstPhase, GraphWalk, GraphWalkPhase as Phase } from '../src';
import { contextFixture } from './helpers/graph-walk-fixtures';

it('selects observations independently of exploration and committed logical counts', () => {
  const left = contextFixture();
  const right = contextFixture();
  const first = new GraphWalk({ source: left.source }).createRunner();
  const second = new GraphWalk({ source: right.source }).createRunner();
  first.run({ emitEvents: [], visitorPhases: { include: [] } });
  second.run({ emitEvents: [Phase.VERTEX, Phase.EDGE] });
  expect(first.summary().counts).toEqual(second.summary().counts);
  expect(first.summary().counts.admittedTargets).toBe(8);
  expect(left.calls).toEqual(right.calls);
  expect(first.summary().counts).toMatchObject({
    uniqueFoundVertices: 5,
    uniqueOmittedVertices: 0,
    discoveredLinks: 6,
  });
});

it('enforces explicit delivery selectors on buffered observations across a pause', () => {
  const runner = new GraphWalk({
    source: contextFixture().source,
  }).createRunner();
  const first = runner.iterateEvents({ emitEvents: ['edge'] });
  expect(first.next().value).toMatchObject({ kind: 'edge' });
  first.return();
  const second = runner.iterateEvents({ emitEvents: ['path'] });
  expect(second.next().value).toMatchObject({ kind: 'path', depth: 1 });
  second.return();
  expect([...runner.iterateEvents({ emitEvents: [] })]).toEqual([]);
  expect(runner.summary().counts.processedObservations).toEqual({
    vertex: 5,
    edge: 6,
    path: 5,
  });
});

it('validates and detaches selector patches before activation without changing prior state', () => {
  const runner = new GraphWalk({
    source: contextFixture().source,
    emitEvents: ['edge'],
  }).createRunner();
  const original = runner.inspect().executionOptions;
  expect(() =>
    runner.iterateEvents({
      emitEvents: [DepthFirstPhase.PRE_ORDER as unknown as Phase],
    }),
  ).toThrow(TypeError);
  expect(() =>
    runner.iterateEvents({
      emitEvents: [Phase.VERTEX],
      iterateOver: [Phase.PATH],
    } as never),
  ).toThrow(TypeError);
  expect(runner.inspect().executionOptions).toEqual(original);
  const emitEvents = [Phase.VERTEX];
  const iterator = runner.iterateEvents({ emitEvents });
  emitEvents[0] = Phase.EDGE;
  expect(iterator.next().value).toMatchObject({ kind: 'vertex' });
  iterator.return();
  expect([...runner.iterateEvents({})].every((e) => e.kind === 'vertex')).toBe(
    true,
  );
});

it('preserves legacy alias behavior through field-wise patches', () => {
  const runner = new GraphWalk({
    source: contextFixture().source,
  }).createRunner();
  const iterator = runner.iterateEvents({ emitEvents: [Phase.EDGE] });
  expect(iterator.next().value).toMatchObject({ kind: 'edge' });
  iterator.return();
  expect(
    [
      ...runner.iterateEvents({ visitorPhases: { exclude: [Phase.VERTEX] } }),
    ].every((e) => e.kind === 'edge'),
  ).toBe(true);
});
