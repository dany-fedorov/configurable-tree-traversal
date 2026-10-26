import {
  AsyncGraphWalk,
  AsyncGraphWalkRunner,
  TraversalRunnerStatus as Status,
  GraphWalk,
  GraphWalkPhase as Phase,
} from '../src';
import type { AsyncGraphWalkSource } from '../src';
import { contextFixture } from './helpers/graph-walk-fixtures';

async function collect<T>(values: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const value of values) result.push(value);
  return result;
}

it.each(['breadthFirst', 'depthFirst'] as const)(
  'shares %s mixed-observation semantics, counts and source order with sync walking',
  async (strategy) => {
    const sync = contextFixture();
    const fixture = contextFixture();
    const source = fixture.source;
    const runner = new AsyncGraphWalk({
      strategy,
      source: {
        async *roots() {
          yield* source.roots();
        },
        async resolveVertex(id: string) {
          return source.resolveVertex!(id);
        },
        async *outgoing(vertex: Parameters<typeof source.outgoing>[0]) {
          yield* source.outgoing(vertex);
        },
      },
      emitEvents: [Phase.VERTEX, Phase.EDGE, Phase.PATH],
      shouldExpandVertex: async () => true,
      shouldFollowEdge: async () => true,
    }).createRunner();
    const expected = new GraphWalk({
      source: sync.source,
      strategy,
      emitEvents: [Phase.VERTEX, Phase.EDGE, Phase.PATH],
    }).createRunner();
    expect(await collect(runner.iterateEvents())).toEqual([
      ...expected.iterateEvents(),
    ]);
    expect(runner.summary()).toEqual(expected.summary());
    expect(fixture.calls).toEqual(sync.calls);
    expect(runner.summary().counts).toMatchObject({
      uniqueFoundVertices: 5,
      discoveredLinks: 6,
      admittedTargets: 8,
    });
    expect(runner).toBeInstanceOf(AsyncGraphWalkRunner);
    expect(runner.getStatus()).toBe(Status.FINISHED);
    expect(runner.inspect()).toMatchObject({
      execution: 'async',
      concurrency: 1,
      inFlightCallbackCount: 0,
    });
  },
);

it.each([false, true])(
  'caches shared hydrated targets with optional fallback %p',
  async (fallback) => {
    const opened: string[] = [];
    const resolved: string[] = [];
    const source: AsyncGraphWalkSource<string, undefined, string> = {
      roots: async () => [
        { vertexId: 'A', resolution: { kind: 'found', data: 'A' } },
      ],
      async *outgoing({ vertexId }) {
        opened.push(vertexId);
        if (vertexId === 'A') {
          yield {
            target: {
              vertexId: 'B',
              ...(fallback
                ? {}
                : { resolution: { kind: 'found' as const, data: 'B' } }),
            },
            data: undefined,
          };
          yield {
            target: {
              vertexId: 'B',
              resolution: { kind: 'found', data: 'ignored' },
            },
            data: undefined,
          };
        }
      },
      ...(fallback
        ? {
            resolveVertex: async (id: string) => {
              resolved.push(id);
              return { kind: 'found' as const, data: id };
            },
          }
        : {}),
    };
    const runner = new AsyncGraphWalk({ source }).createRunner();
    const events = await collect(runner.iterateEvents());
    expect(events).toMatchObject([
      { vertex: { data: 'A' } },
      { vertex: { data: 'B' } },
    ]);
    expect(opened).toEqual(['A', 'B']);
    expect(resolved).toEqual(fallback ? ['B'] : []);
    expect(runner.summary().outcome).toEqual({ kind: 'exhausted' });
  },
);

it('captures source callbacks and receiver while retaining shared caller data and arbitrary IDs', async () => {
  const id = { key: 'A' };
  const data = { title: 'first' };
  let rootsReads = 0;
  const source: AsyncGraphWalkSource<typeof data, undefined, typeof id> = {
    get roots() {
      rootsReads++;
      return async function (this: typeof source) {
        expect(this).toBe(source);
        return [{ vertexId: id, resolution: { kind: 'found' as const, data } }];
      };
    },
    async outgoing() {
      expect(this).toBe(source);
      return [];
    },
  };
  const walk = new AsyncGraphWalk({ source });
  const runner = walk.createRunner();
  expect(rootsReads).toBe(1);
  source.outgoing = () => {
    throw new Error('mutated callback');
  };
  data.title = 'shared';
  const events = await collect(runner.iterateEvents());
  expect(events).toMatchObject([{ vertex: { data: { title: 'shared' } } }]);
  const first = events[0]!;
  expect(first.kind === 'vertex' && first.vertex.vertexId).toBe(id);
  expect(first.kind === 'vertex' && first.vertex.data).toBe(data);
});

it('registration and configure changes snapshot async callbacks and detach listed records', async () => {
  const calls: string[] = [];
  const walk = new AsyncGraphWalk({
    source: contextFixture().source,
    limits: { maxAdmittedTargets: 1 },
  });
  const visit = async () => {
    calls.push('old');
  };
  expect(walk.addVisitorFor(Phase.VERTEX, visit, { priority: 5 })).toBe(walk);
  const old = walk.createRunner();
  const records = walk.listVisitorsFor(Phase.VERTEX);
  expect(records[0]!.visitor).toBe(visit);
  records.length = 0;
  expect(walk.listVisitorsFor(Phase.VERTEX)).toHaveLength(1);
  expect(walk.setVisitorsFor(Phase.VERTEX, [])).toBe(walk);
  expect(
    walk.addVisitorGroupFor(Phase.VERTEX, {
      commandCommitMode: 'afterGroup',
      visitors: [
        async () => {
          calls.push('group:first');
        },
        () => {
          calls.push('group:second');
        },
      ],
    }),
  ).toBe(walk);
  expect(walk.configure({ emitEvents: [] })).toBe(walk);
  await old.run();
  await walk.createRunner().run();
  expect(calls).toEqual(['old', 'group:first', 'group:second']);
  expect(() => walk.listVisitorsFor('invalid' as Phase)).toThrow(TypeError);
  expect(() => walk.configure({ revisit: 'walks' })).toThrow(TypeError);
  walk.configure({ limits: { maxDepth: 1 }, revisit: 'walks' });
  const bounded = await walk.createRunner().run();
  // Replacing maxAdmittedTargets admits A, E, AB, AB and AC at depth one.
  expect(bounded.summary().counts.admittedTargets).toBe(5);
  expect(calls.slice(3)).toEqual(
    Array.from({ length: 5 }, () => ['group:first', 'group:second']).flat(),
  );
});

it('accepts resolved thenables from async sources, predicates and visitors', async () => {
  // PromiseLike is the public contract; this exercises assimilation without a native Promise return.
  const thenable = <T>(value: T): PromiseLike<T> => ({
    then: (resolve) => Promise.resolve(resolve!(value)),
  });
  const seen: string[] = [];
  const runner = new AsyncGraphWalk({
    source: {
      roots: () => thenable([{ vertexId: 'A' }]),
      resolveVertex: () => thenable({ kind: 'found' as const, data: 'A' }),
      outgoing: () => thenable([]),
    },
    shouldExpandVertex: () => thenable(true),
    visitors: {
      vertex: (event) => {
        seen.push(event.vertex.data);
        return thenable(undefined);
      },
    },
  }).createRunner();
  await runner.run();
  expect(seen).toEqual(['A']);
  expect(runner.summary().outcome).toEqual({ kind: 'exhausted' });
});

it.each([
  'roots',
  'resolveVertex',
  'outgoing',
  'next',
  'iterator',
  'result',
  'tag',
  'predicate',
])(
  'retains exact failures from async %s admission or protocol getters',
  async (stage) => {
    const error = Symbol(stage);
    const fail = (): never => {
      throw error;
    };
    const source: AsyncGraphWalkSource<string, undefined, string> = {
      roots: () =>
        stage === 'roots'
          ? Promise.reject(error)
          : stage === 'iterator'
          ? {
              get [Symbol.asyncIterator](): never {
                return fail();
              },
            }
          : stage === 'next' || stage === 'result'
          ? {
              [Symbol.asyncIterator]() {
                return {
                  next: () =>
                    stage === 'next'
                      ? Promise.reject(error)
                      : Promise.resolve({
                          get done(): never {
                            return fail();
                          },
                          value: { vertexId: 'A' },
                        }),
                };
              },
            }
          : [{ vertexId: 'A' }],
      resolveVertex: () =>
        stage === 'resolveVertex'
          ? Promise.reject(error)
          : Promise.resolve(
              stage === 'tag'
                ? {
                    get kind(): never {
                      return fail();
                    },
                  }
                : { kind: 'found', data: 'A' },
            ),
      outgoing: () => (stage === 'outgoing' ? Promise.reject(error) : []),
    };
    const runner = new AsyncGraphWalk({
      source,
      shouldExpandVertex: () =>
        stage === 'predicate' ? Promise.reject(error) : true,
    }).createRunner();
    await expect(runner.run()).rejects.toBe(error);
    await expect(runner.run()).rejects.toBe(error);
    expect(runner.summary().outcome).toEqual({ kind: 'failed', error });
  },
);

it('prefers async iteration and falls back only for an absent async factory', async () => {
  const calls: string[] = [];
  const runner = new AsyncGraphWalk({
    source: {
      roots: () => ({
        async *[Symbol.asyncIterator]() {
          calls.push('async');
          yield {
            vertexId: 'A',
            resolution: { kind: 'found' as const, data: 'A' },
          };
        },
        get [Symbol.iterator](): never {
          throw new Error('sync getter read');
        },
      }),
      outgoing: () => [],
    },
  }).createRunner();
  expect(await collect(runner.iterateEvents())).toMatchObject([
    { vertex: { vertexId: 'A' } },
  ]);
  expect(calls).toEqual(['async']);
});

it.each([1, { then: () => undefined }])(
  'rejects malformed async factories without using sync fallback %p',
  async (factory) => {
    const source = {
      roots: () => ({
        [Symbol.asyncIterator]: factory,
        [Symbol.iterator]: function* () {
          throw new Error('fallback must not run');
        },
      }),
      outgoing: () => [],
    } as unknown as AsyncGraphWalkSource<string, undefined, string>;
    const runner = new AsyncGraphWalk({ source }).createRunner();
    await expect(runner.run()).rejects.toBeInstanceOf(TypeError);
    expect(runner.summary().counts.admittedTargets).toBe(0);
  },
);

it('observes an invalid async iterator factory rejected promise before retaining the protocol error', async () => {
  const error = Symbol('factory');
  const observed: unknown[] = [];
  const source = {
    roots: () => ({
      [Symbol.asyncIterator]() {
        const rejected = Promise.reject(error);
        Object.defineProperty(rejected, 'then', {
          value(
            onFulfilled: (value: unknown) => unknown,
            onRejected: (error: unknown) => unknown,
          ) {
            return Promise.prototype.then.call(
              rejected,
              onFulfilled,
              (value: unknown) => {
                observed.push(value);
                return onRejected(value);
              },
            );
          },
        });
        // Prevent an intentionally failing regression from leaking rejection; only the walker's handler records observed.
        Promise.prototype.then.call(rejected, undefined, () => undefined);
        return rejected;
      },
    }),
    outgoing: () => [],
  } as unknown as AsyncGraphWalkSource<string, undefined, string>;
  const runner = new AsyncGraphWalk({ source }).createRunner();
  await expect(runner.run()).rejects.toBeInstanceOf(TypeError);
  expect(observed).toEqual([error]);
});
