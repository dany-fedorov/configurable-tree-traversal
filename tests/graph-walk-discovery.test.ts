import {
  GraphWalk,
  GraphWalkPhase as Phase,
  TraversalRunnerStatus as Status,
} from '../src';
import type { GraphWalkSource } from '../src';
import { idGraph } from './helpers/graph-walk-fixtures';

it('deduplicates arbitrary IDs by SameValueZero without coercion', () => {
  const object = { vertexId: 'not the ID', resolution: 'not hydration' };
  const other = {};
  const symbol = Symbol('id');
  const ids = [object, other, symbol, undefined, NaN, -0];
  const resolutions: unknown[] = [];
  const openings: unknown[] = [];
  const source: GraphWalkSource<unknown, undefined, unknown> = {
    roots: () => [...ids, ...ids, 0].map((vertexId) => ({ vertexId })),
    resolveVertex(vertexId) {
      resolutions.push(vertexId);
      return { kind: 'found', data: undefined };
    },
    outgoing(vertex) {
      openings.push(vertex.vertexId);
      return [{ target: { vertexId: vertex.vertexId }, data: undefined }];
    },
  };
  const runner = new GraphWalk({ source }).createRunner();
  const events = [
    ...runner.getIterable({ emitPhases: [Phase.VERTEX, Phase.EDGE] }),
  ];
  expect(
    events.flatMap((event) =>
      event.kind === 'vertex' ? [event.vertex.vertexId] : [],
    ),
  ).toEqual(ids);
  expect(resolutions).toEqual(ids);
  expect(openings).toEqual(ids);
  expect(runner.summary().counts).toMatchObject({
    foundVertices: 6,
    omittedVertices: 0,
    occurrences: 12,
    observedLinks: 6,
    steps: 26,
  });
});

it('caches first accepted inline hydration and omission, copying wrappers but sharing caller data', () => {
  const data = { label: 'A' };
  const root = { vertexId: 'A', resolution: { kind: 'found' as const, data } };
  const link = {
    target: { vertexId: 'B', resolution: { kind: 'omitted' as const } },
    data: { relation: true },
  };
  const source: GraphWalkSource<typeof data, typeof link.data, string> = {
    roots: () => [
      root,
      { vertexId: 'missing', resolution: { kind: 'omitted' } },
    ],
    outgoing: (vertex) =>
      vertex.vertexId !== 'A'
        ? []
        : [
            link,
            link,
            {
              target: { vertexId: 'B', resolution: { kind: 'found', data } },
              data: link.data,
            },
            { target: root, data: link.data },
          ],
  };
  const runner = new GraphWalk({ source }).createRunner();
  const iterator = runner.getIterable({
    emitPhases: [Phase.VERTEX, Phase.EDGE],
  });
  const first = iterator.next().value!;
  expect(first).toMatchObject({
    kind: 'vertex',
    vertex: { vertexId: 'A', data },
  });
  if (first.kind !== 'vertex') throw new Error('Expected vertex');
  expect(first.vertex).not.toBe(root);
  expect(first.vertex.data).toBe(data);
  root.vertexId = 'changed';
  const edges = [...iterator];
  expect(
    edges.flatMap((event) =>
      event.kind === 'edge'
        ? [
            [
              event.edge.from,
              event.edge.to,
              event.edge.index,
              event.target.kind,
            ],
          ]
        : [],
    ),
  ).toEqual([
    ['A', 'B', 0, 'omitted'],
    ['A', 'B', 1, 'omitted'],
    ['A', 'B', 2, 'omitted'],
    ['A', 'changed', 3, 'found'],
  ]);
  expect(runner.summary().counts).toMatchObject({
    foundVertices: 2,
    omittedVertices: 2,
  });
  expect(Object.isFrozen(data)).toBe(false);
});

it.each(['breadthFirst', 'depthFirst'] as const)(
  'walks a 20,000-vertex chain iteratively with %s',
  (strategy) => {
    const source: GraphWalkSource<number, undefined, number> = {
      roots: () => [{ vertexId: 0 }],
      resolveVertex: (id) => ({ kind: 'found', data: id }),
      outgoing: (vertex) =>
        vertex.vertexId === 19999
          ? []
          : [{ target: { vertexId: vertex.vertexId + 1 }, data: undefined }],
    };
    const runner = new GraphWalk({ source, strategy, emitPhases: [] })
      .createRunner()
      .run();
    expect(runner.summary().counts).toMatchObject({
      foundVertices: 20000,
      observedLinks: 19999,
      occurrences: 20000,
      steps: 40001,
    });
  },
);

it('keeps independent runner caches and captured callback receivers', () => {
  const source = {
    label: 'old',
    roots() {
      return [{ vertexId: this.label }];
    },
    resolveVertex(id: string) {
      return { kind: 'found' as const, data: id };
    },
    outgoing() {
      return [];
    },
  };
  const factory = new GraphWalk({ source });
  const first = factory.createRunner();
  source.roots = () => {
    throw new Error('re-read callback');
  };
  source.label = 'new';
  const second = factory.createRunner();
  expect([...first.getIterable()]).toEqual([...second.getIterable()]);
  expect(first.summary().counts.foundVertices).toBe(1);
  expect(second.summary().counts.foundVertices).toBe(1);
});

it('exhausts empty roots and skips omitted roots without opening adjacency', () => {
  expect(
    new GraphWalk({ source: idGraph([], []) }).createRunner().run().summary()
      .counts.steps,
  ).toBe(1);
  const runner = new GraphWalk({
    source: {
      roots: () => [{ vertexId: 0 }, { vertexId: 0 }],
      resolveVertex: () => ({ kind: 'omitted' as const }),
      outgoing: () => {
        throw new Error('omitted');
      },
    },
  }).createRunner();
  expect([...runner.getIterable()]).toEqual([]);
  expect(runner.summary().counts).toMatchObject({
    occurrences: 1,
    omittedVertices: 1,
    foundVertices: 0,
    steps: 3,
  });
});

it.each([undefined, null, false, 0, 'failure', { error: true }])(
  'retains exact thrown source values: %p',
  (error) => {
    const source = {
      roots() {
        throw error;
      },
      outgoing: () => [],
    };
    const runner = new GraphWalk({ source }).createRunner();
    let caught: unknown = 'not thrown';
    try {
      runner.run();
    } catch (value) {
      caught = value;
    }
    expect(caught).toBe(error);
    expect(runner.getStatus()).toBe(Status.FAILED);
    expect(runner.getStopReason()).toBe('failed');
    expect(runner.summary().outcome).toEqual({ kind: 'failed', error });
    caught = 'not thrown';
    try {
      runner.run();
    } catch (value) {
      caught = value;
    }
    expect(caught).toBe(error);
  },
);

it('fails only when an admitted unresolved ID actually needs a fallback resolver', () => {
  const runner = new GraphWalk({
    source: { roots: () => [{ vertexId: 'A' }], outgoing: () => [] },
  }).createRunner();
  expect(() => runner.run()).toThrow(TypeError);
  expect(runner.summary().counts.occurrences).toBe(1);
});

it.each([
  { roots: () => null },
  { roots: () => ({ [Symbol.iterator]: () => null }) },
  { roots: () => ({ [Symbol.iterator]: () => ({ next: 1 }) }) },
  { roots: () => ({ [Symbol.iterator]: () => ({ next: () => null }) }) },
  { roots: () => [null] },
  { roots: () => [{}] },
  { resolveVertex: () => ({ kind: 'missing' }) },
  { resolveVertex: () => ({ kind: 'found' }) },
  { outgoing: () => [null] },
  { outgoing: () => [{}] },
  { roots: () => Promise.resolve([]) },
  { resolveVertex: () => Promise.resolve({ kind: 'found', data: 1 }) },
  { outgoing: () => Promise.resolve([]) },
])('rejects malformed sync source protocols %#', (patch) => {
  const source = {
    roots: () => [{ vertexId: 'A' }],
    resolveVertex: () => ({ kind: 'found', data: 1 }),
    outgoing: () => [],
    ...patch,
  } as unknown as GraphWalkSource<number, undefined, string>;
  const runner = new GraphWalk({ source }).createRunner();
  expect(() => runner.run()).toThrow(TypeError);
  expect(runner.getStatus()).toBe(Status.FAILED);
});

it('counts a candidate before rejecting malformed inline hydration', () => {
  const source = {
    roots: () => [{ vertexId: 'A', resolution: { kind: 'missing' } }],
    outgoing: () => [],
  } as unknown as GraphWalkSource<string, undefined, string>;
  const runner = new GraphWalk({ source }).createRunner();
  expect(() => runner.run()).toThrow(TypeError);
  expect(runner.summary().counts).toMatchObject({
    occurrences: 1,
    foundVertices: 0,
    omittedVertices: 0,
  });
});

it.each([false, {}, { [Symbol.iterator]: 1 }])(
  'rejects noniterable source values: %p',
  (value) => {
    const source = {
      roots: () => value,
      outgoing: () => [],
    } as unknown as GraphWalkSource<unknown, unknown, unknown>;
    expect(() => new GraphWalk({ source }).createRunner().run()).toThrow(
      TypeError,
    );
  },
);

it('observes rejected thenables returned from callbacks and next methods', async () => {
  const error = new Error('rejection');
  const rejected = Promise.reject(error);
  const source = {
    roots: () => rejected,
    outgoing: () => [],
  } as unknown as GraphWalkSource<unknown, unknown, unknown>;
  expect(() => new GraphWalk({ source }).createRunner().run()).toThrow(TypeError);
  const iteratorSource = {
    roots: () => ({
      [Symbol.iterator]: () => ({ next: () => Promise.reject(error) }),
    }),
    outgoing: () => [],
  } as unknown as GraphWalkSource<unknown, unknown, unknown>;
  expect(() =>
    new GraphWalk({ source: iteratorSource }).createRunner().run(),
  ).toThrow(TypeError);
  await Promise.resolve();
});

it.each(['target', 'resolution', 'kind', 'data', 'done', 'then'] as const)(
  'retains exact errors from source-owned %s getters',
  (key) => {
    const error = { key };
    const bad = Object.defineProperty({}, key, {
      get() {
        throw error;
      },
    });
    const source = {
      roots: () =>
        key === 'then'
          ? bad
          : key === 'done'
          ? { [Symbol.iterator]: () => ({ next: () => bad }) }
          : [{ vertexId: 'A' }],
      resolveVertex: () =>
        key === 'kind'
          ? bad
          : key === 'data'
          ? Object.assign(bad, { kind: 'found' })
          : { kind: 'found', data: 1 },
      outgoing: () =>
        key === 'target'
          ? [bad]
          : key === 'resolution'
          ? [{ target: Object.assign(bad, { vertexId: 'B' }) }]
          : [],
    } as unknown as GraphWalkSource<unknown, unknown, unknown>;
    const runner = new GraphWalk({ source }).createRunner();
    let caught: unknown;
    try {
      runner.run();
    } catch (value) {
      caught = value;
    }
    expect(caught).toBe(error);
    expect(runner.summary().outcome).toEqual({ kind: 'failed', error });
  },
);

it('ignores later inline hydration without reading its getters', () => {
  const poisoned = {
    vertexId: 'A',
    get resolution(): never {
      throw new Error('cached inline value must not be read');
    },
  };
  const source: GraphWalkSource<string, undefined, string> = {
    roots: () => [
      { vertexId: 'A', resolution: { kind: 'found', data: 'first' } },
      poisoned,
    ],
    outgoing: () => [{ target: poisoned, data: undefined }],
  };
  const runner = new GraphWalk({ source }).createRunner();
  expect([...runner.getIterable({ emitPhases: [Phase.EDGE] })]).toMatchObject([
    { target: { kind: 'found', vertex: { vertexId: 'A', data: 'first' } } },
  ]);
  expect(runner.summary().counts).toMatchObject({
    foundVertices: 1,
    occurrences: 2,
    observedLinks: 1,
  });
});

it.each(['roots', 'outgoing'] as const)(
  'observes rejected promises from the %s iterator factory before retaining TypeError',
  async (location) => {
    const rejection = { location };
    const rejected = Promise.reject(rejection);
    const observed: unknown[] = [];
    // Use a real rejected promise. Record whether the walker installs and runs
    // its rejection handler, with a separate fallback solely to keep RED safe.
    Object.defineProperty(rejected, 'then', {
      value(
        onFulfilled: (value: unknown) => unknown,
        onRejected: (error: unknown) => unknown,
      ) {
        return Promise.prototype.then.call(
          rejected,
          onFulfilled,
          (error: unknown) => {
            observed.push(error);
            return onRejected(error);
          },
        );
      },
    });
    const malformed = { [Symbol.iterator]: () => rejected };
    const source = {
      roots: () =>
        location === 'roots'
          ? malformed
          : [{ vertexId: 'A', resolution: { kind: 'found', data: 'A' } }],
      outgoing: () => malformed,
    } as unknown as GraphWalkSource<string, undefined, string>;
    const runner = new GraphWalk({ source }).createRunner();
    let failure: unknown;
    try {
      runner.run();
    } catch (error) {
      failure = error;
    } finally {
      // Bypass the instrumented method: this fallback cannot satisfy observed.
      Promise.prototype.then.call(rejected, undefined, () => undefined);
    }
    expect(failure).toBeInstanceOf(TypeError);
    expect(runner.summary().outcome).toEqual({
      kind: 'failed',
      error: failure,
    });
    let repeated: unknown;
    try {
      runner.run();
    } catch (error) {
      repeated = error;
    }
    expect(repeated).toBe(failure);
    await Promise.resolve();
    expect(observed).toEqual([rejection]);
  },
);
