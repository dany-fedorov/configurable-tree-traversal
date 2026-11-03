import type { AsyncGraphWalkDiscoverySource } from '../src';
import {
  AsyncGraphWalkBuilder,
  GraphWalkBuilder,
  GraphWalkObservationKind as Phase,
  TraversalRunnerStatus as Status,
} from '../src';
import { InternalAsyncGraphWalkRunner as AsyncGraphWalkRunner } from '../src/traversals/graph-walk/AsyncGraphWalkRunner';
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
    const runner = new AsyncGraphWalkBuilder({
      expansionOrder: strategy,
      graphWalkDiscoverySource: {
        vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
        async *enumerateRootTargets() {
          yield* source.enumerateRootTargets();
        },
        async resolveVertexDataById(id: string) {
          return source.resolveVertexDataById!(id);
        },
        async *enumerateOutgoingLinks(
          vertex: Parameters<typeof source.enumerateOutgoingLinks>[0],
        ) {
          yield* source.enumerateOutgoingLinks(vertex);
        },
      },
      deliveredEventKinds: [
        Phase.VERTEX_OCCURRENCE,
        Phase.ADMITTED_EDGE_OCCURRENCE,
        Phase.ROUTE_PREFIX,
      ],
      shouldExpandVertexOccurrence: async () => true,
      shouldAdmitOutgoingLinkTarget: async () => true,
    }).createIndependentRunnerFromCurrentOptions();
    const expected = new GraphWalkBuilder({
      graphWalkDiscoverySource: sync.source,
      expansionOrder: strategy,
      deliveredEventKinds: [
        Phase.VERTEX_OCCURRENCE,
        Phase.ADMITTED_EDGE_OCCURRENCE,
        Phase.ROUTE_PREFIX,
      ],
    }).createIndependentRunnerFromCurrentOptions();
    expect(
      await collect(
        runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
      ),
    ).toEqual([
      ...expected.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ]);
    expect(runner.captureProgressSnapshot()).toEqual(
      expected.captureProgressSnapshot(),
    );
    expect(fixture.calls).toEqual(sync.calls);
    expect(runner.captureProgressSnapshot().counts).toMatchObject({
      resolvedFoundVertexIdCount: 5,
      freshSourceOutgoingLinkCount: 6,
      admittedRootOrLinkTargetOccurrences: 8,
    });
    expect(runner).toBeInstanceOf(AsyncGraphWalkRunner);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    expect(runner.captureExecutionSnapshot()).toMatchObject({
      callbackExecutionMode: 'async',
      concurrency: 1,
      inFlightInvocationCount: 0,
    });
  },
);

it.each([false, true])(
  'caches shared hydrated targets with optional fallback %p',
  async (fallback) => {
    const opened: string[] = [];
    const resolved: string[] = [];
    const source: AsyncGraphWalkDiscoverySource<string, undefined, string> =
      fallback
        ? {
            vertexResolutionMode: 'resolverWithOptionalInlineResolution',
            enumerateRootTargets: async () => [
              {
                vertexId: 'A',
                resolutionIfNotPreviouslyAdmitted: {
                  kind: 'found',
                  vertexData: 'A',
                },
              },
            ],
            resolveVertexDataById: async (id) => {
              resolved.push(id);
              return { kind: 'found', vertexData: id };
            },
            async *enumerateOutgoingLinks({ vertexId }) {
              opened.push(vertexId);
              if (vertexId === 'A') {
                yield {
                  targetToResolveOnAdmission: { vertexId: 'B' },
                  edgeData: undefined,
                };
                yield {
                  targetToResolveOnAdmission: {
                    vertexId: 'B',
                    resolutionIfNotPreviouslyAdmitted: {
                      kind: 'found',
                      vertexData: 'ignored',
                    },
                  },
                  edgeData: undefined,
                };
              }
            },
          }
        : {
            vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
            enumerateRootTargets: async () => [
              {
                kind: 'inlineResolution',
                vertexId: 'A',
                resolutionIfNotPreviouslyAdmitted: {
                  kind: 'found',
                  vertexData: 'A',
                },
              },
            ],
            async *enumerateOutgoingLinks({ vertexId }) {
              opened.push(vertexId);
              if (vertexId === 'A') {
                yield {
                  targetToResolveOnAdmission: {
                    kind: 'inlineResolution',
                    vertexId: 'B',
                    resolutionIfNotPreviouslyAdmitted: {
                      kind: 'found',
                      vertexData: 'B',
                    },
                  },
                  edgeData: undefined,
                };
                yield {
                  targetToResolveOnAdmission: {
                    kind: 'inlineResolution',
                    vertexId: 'B',
                    resolutionIfNotPreviouslyAdmitted: {
                      kind: 'found',
                      vertexData: 'ignored',
                    },
                  },
                  edgeData: undefined,
                };
              }
            },
          };
    const runner = new AsyncGraphWalkBuilder({
      graphWalkDiscoverySource: source,
    }).createIndependentRunnerFromCurrentOptions();
    const events = await collect(
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    );
    expect(events).toMatchObject([
      { vertex: { vertexData: 'A' } },
      { vertex: { vertexData: 'B' } },
    ]);
    expect(opened).toEqual(['A', 'B']);
    expect(resolved).toEqual(fallback ? ['B'] : []);
    expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
      kind: 'sourceRoutesExhausted',
    });
  },
);

it('captures source callbacks and receiver while retaining shared caller data and arbitrary IDs', async () => {
  const id = { key: 'A' };
  const data = { title: 'first' };
  let rootsReads = 0;
  const source: AsyncGraphWalkDiscoverySource<
    typeof data,
    undefined,
    typeof id
  > = {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
    get enumerateRootTargets() {
      rootsReads++;
      return async function (this: typeof source) {
        expect(this).toBe(source);
        return [
          {
            kind: 'inlineResolution' as const,
            vertexId: id,
            resolutionIfNotPreviouslyAdmitted: {
              kind: 'found' as const,
              vertexData: data,
            },
          },
        ];
      };
    },
    async enumerateOutgoingLinks() {
      expect(this).toBe(source);
      return [];
    },
  };
  const walk = new AsyncGraphWalkBuilder({ graphWalkDiscoverySource: source });
  const runner = walk.createIndependentRunnerFromCurrentOptions();
  expect(rootsReads).toBe(1);
  source.enumerateOutgoingLinks = () => {
    throw new Error('mutated callback');
  };
  data.title = 'shared';
  const events = await collect(
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  );
  expect(events).toMatchObject([
    { vertex: { vertexData: { title: 'shared' } } },
  ]);
  const first = events[0]!;
  expect(first.eventKind === 'vertexOccurrence' && first.vertex.vertexId).toBe(
    id,
  );
  expect(
    first.eventKind === 'vertexOccurrence' && first.vertex.vertexData,
  ).toBe(data);
});

it('registration and configure changes snapshot async callbacks and detach listed records', async () => {
  const calls: string[] = [];
  const walk = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: contextFixture().source,
    limits: { maxAdmittedRootOrLinkTargetOccurrences: 1 },
  });
  const visit = async () => {
    calls.push('old');
  };
  expect(
    walk.addVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, visit, {
      descendingExecutionPriorityWithinGroup: 5,
    }),
  ).toBe(walk);
  const old = walk.createIndependentRunnerFromCurrentOptions();
  const records = walk.listVisitorRegistrationsForObservationKind(
    Phase.VERTEX_OCCURRENCE,
  );
  expect(records[0]!.visitor).toBe(visit);
  records.length = 0;
  expect(
    walk.listVisitorRegistrationsForObservationKind(Phase.VERTEX_OCCURRENCE),
  ).toHaveLength(1);
  expect(
    walk.replaceVisitorsForObservationKind(Phase.VERTEX_OCCURRENCE, []),
  ).toBe(walk);
  expect(
    walk.addVisitorGroupForObservationKind(Phase.VERTEX_OCCURRENCE, {
      visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
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
  expect(walk.patchOptionsForFutureRunners({ deliveredEventKinds: [] })).toBe(
    walk,
  );
  await old.runUntilSuspendedOrTerminal();
  await walk
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(calls).toEqual(['old', 'group:first', 'group:second']);
  expect(() =>
    walk.listVisitorRegistrationsForObservationKind('invalid' as Phase),
  ).toThrow(TypeError);
  expect(() =>
    walk.patchOptionsForFutureRunners({
      routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
    }),
  ).toThrow(TypeError);
  walk.patchOptionsForFutureRunners({
    replaceLimits: { maxRouteHopDepth: 1 },
    routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
  });
  const bounded = await walk
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  // Replacing maxAdmittedTargets admits A, E, AB, AB and AC at depth one.
  expect(
    bounded.captureProgressSnapshot().counts
      .admittedRootOrLinkTargetOccurrences,
  ).toBe(5);
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
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: {
      vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
      enumerateRootTargets: () => thenable([{ vertexId: 'A' }]),
      resolveVertexDataById: () =>
        thenable({ kind: 'found' as const, vertexData: 'A' }),
      enumerateOutgoingLinks: () => thenable([]),
    },
    shouldExpandVertexOccurrence: () => thenable(true),
    visitorsByObservationKind: {
      vertexOccurrence: (event) => {
        seen.push(event.vertex.vertexData);
        return thenable(undefined);
      },
    },
  }).createIndependentRunnerFromCurrentOptions();
  await runner.runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['A']);
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'sourceRoutesExhausted',
  });
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
    const source: AsyncGraphWalkDiscoverySource<string, undefined, string> = {
      vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
      enumerateRootTargets: () =>
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
      resolveVertexDataById: () =>
        stage === 'resolveVertex'
          ? Promise.reject(error)
          : Promise.resolve(
              stage === 'tag'
                ? {
                    get kind(): never {
                      return fail();
                    },
                  }
                : { kind: 'found', vertexData: 'A' },
            ),
      enumerateOutgoingLinks: () =>
        stage === 'outgoing' ? Promise.reject(error) : [],
    };
    const runner = new AsyncGraphWalkBuilder({
      graphWalkDiscoverySource: source,
      shouldExpandVertexOccurrence: () =>
        stage === 'predicate' ? Promise.reject(error) : true,
    }).createIndependentRunnerFromCurrentOptions();
    await expect(runner.runUntilSuspendedOrTerminal()).rejects.toBe(error);
    await expect(runner.runUntilSuspendedOrTerminal()).rejects.toBe(error);
    expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
      kind: 'failed',
      error,
    });
  },
);

it('prefers async iteration and falls back only for an absent async factory', async () => {
  const calls: string[] = [];
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets: () => ({
        async *[Symbol.asyncIterator]() {
          calls.push('async');
          yield {
            kind: 'inlineResolution' as const,
            vertexId: 'A',
            resolutionIfNotPreviouslyAdmitted: {
              kind: 'found' as const,
              vertexData: 'A',
            },
          };
        },
        get [Symbol.iterator](): never {
          throw new Error('sync getter read');
        },
      }),
      enumerateOutgoingLinks: () => [],
    },
  }).createIndependentRunnerFromCurrentOptions();
  expect(
    await collect(
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ),
  ).toMatchObject([{ vertex: { vertexId: 'A' } }]);
  expect(calls).toEqual(['async']);
});

it.each([1, { then: () => undefined }])(
  'rejects malformed async factories without using sync fallback %p',
  async (factory) => {
    const source = {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets: () => ({
        [Symbol.asyncIterator]: factory,
        [Symbol.iterator]: function* () {
          throw new Error('fallback must not run');
        },
      }),
      enumerateOutgoingLinks: () => [],
    } as unknown as AsyncGraphWalkDiscoverySource<string, undefined, string>;
    const runner = new AsyncGraphWalkBuilder({
      graphWalkDiscoverySource: source,
    }).createIndependentRunnerFromCurrentOptions();
    await expect(runner.runUntilSuspendedOrTerminal()).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(
      runner.captureProgressSnapshot().counts
        .admittedRootOrLinkTargetOccurrences,
    ).toBe(0);
  },
);

it('observes an invalid async iterator factory rejected promise before retaining the protocol error', async () => {
  const error = Symbol('factory');
  const observed: unknown[] = [];
  const source = {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
    enumerateRootTargets: () => ({
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
    enumerateOutgoingLinks: () => [],
  } as unknown as AsyncGraphWalkDiscoverySource<string, undefined, string>;
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  await expect(runner.runUntilSuspendedOrTerminal()).rejects.toBeInstanceOf(
    TypeError,
  );
  expect(observed).toEqual([error]);
});
