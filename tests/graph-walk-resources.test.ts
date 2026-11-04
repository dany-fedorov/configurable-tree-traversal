import {
  GraphWalkBuilder,
  AsyncGraphWalkBuilder,
  TraversalRunnerStatus as Status,
} from '../src';
import type { GraphWalkDiscoverySource } from '../src';

function manual<T>(
  name: string,
  returns: string[],
  next: () => IteratorResult<T>,
  cleanup?: () => void,
): Iterable<T> {
  return {
    [Symbol.iterator]() {
      return {
        next,
        return() {
          returns.push(name);
          cleanup?.();
          return { done: true, value: undefined };
        },
      };
    },
  };
}
function failingResourceSource(
  returns: string[],
  primary: unknown,
  cleanup: unknown,
): GraphWalkDiscoverySource<string, undefined, string> {
  return {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
    enumerateRootTargets: () =>
      manual('roots', returns, () => ({
        done: false,
        value: {
          kind: 'inlineResolution' as const,
          vertexId: 'A',
          resolutionIfNotPreviouslyAdmitted: { kind: 'found', vertexData: 'A' },
        },
      })),
    enumerateOutgoingLinks: () =>
      manual(
        'edges:A',
        returns,
        () => {
          throw primary;
        },
        () => {
          throw cleanup;
        },
      ),
  };
}

it.each([null, undefined, false, 0, { reason: 'source' }])(
  'preserves exact primary failure %p while attempting every reverse-order cleanup',
  (primary) => {
    const returns: string[] = [];
    const runner = new GraphWalkBuilder({
      expansionOrder: 'depthFirst',
      graphWalkDiscoverySource: failingResourceSource(returns, primary, {
        reason: 'cleanup',
      }),
    }).createIndependentRunnerFromCurrentOptions();
    let caught = false;
    try {
      runner.runUntilSuspendedOrTerminal();
    } catch (error) {
      caught = true;
      expect(error).toBe(primary);
    }
    expect(caught).toBe(true);
    expect(returns).toEqual(['edges:A', 'roots']);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
    expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
      kind: 'failed',
      error: primary,
    });
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
  },
);

it('cleans an acquired iterator even when its next getter fails before first next', () => {
  const returns: string[] = [];
  const primary = { reason: 'next getter' };
  const source: GraphWalkDiscoverySource<string, undefined, string> = {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
    enumerateRootTargets: () =>
      manual('roots', returns, () => ({
        done: false,
        value: {
          kind: 'inlineResolution' as const,
          vertexId: 'A',
          resolutionIfNotPreviouslyAdmitted: { kind: 'found', vertexData: 'A' },
        },
      })),
    enumerateOutgoingLinks: () => ({
      [Symbol.iterator]() {
        return {
          get next(): () => IteratorResult<never> {
            throw primary;
          },
          return() {
            returns.push('edges:A');
            return { done: true as const, value: undefined };
          },
        };
      },
    }),
  };
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
    expansionOrder: 'depthFirst',
  }).createIndependentRunnerFromCurrentOptions();
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow();
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'failed',
    error: primary,
  });
  expect(returns).toEqual(['edges:A', 'roots']);
});

it('async failure awaits reverse cleanup and retains arbitrary primary errors', async () => {
  const returns: string[] = [];
  const runner = new AsyncGraphWalkBuilder({
    expansionOrder: 'depthFirst',
    graphWalkDiscoverySource: failingResourceSource(returns, undefined, null),
  }).createIndependentRunnerFromCurrentOptions();
  let caught = false;
  try {
    await runner.runUntilSuspendedOrTerminal();
  } catch (error) {
    caught = true;
    expect(error).toBeUndefined();
  }
  expect(caught).toBe(true);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
  expect(returns).toEqual(['edges:A', 'roots']);
  expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
});
it('public iterator return retains sources, terminal close releases them once and prevents resumption', () => {
  const returns: string[] = [];
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: failingResourceSource(
      returns,
      'unused',
      'unused',
    ),
  }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  iterator.next();
  expect(() => runner.closePermanentlyAndDisposeSourceIterators()).toThrow(
    'owner',
  );
  iterator.return();
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  expect(returns).toEqual([]);
  runner.closePermanentlyAndDisposeSourceIterators();
  runner.closePermanentlyAndDisposeSourceIterators();
  expect(returns).toEqual(['roots']);
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'permanentlyClosedByCaller',
  });
  expect([
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toEqual([]);
  expect(runner.captureExecutionSnapshot().openSourceIteratorCount).toBe(0);
});

it.each([null, undefined, false, 0, { reason: 'cleanup' }])(
  'retains the first cleanup-only error %p and keeps trying returns',
  async (first) => {
    for (const factory of [GraphWalkBuilder, AsyncGraphWalkBuilder]) {
      const returns: string[] = [];
      const source: GraphWalkDiscoverySource<string, undefined, string> = {
        vertexResolutionMode:
          'inlineResolutionOrPreviouslyAdmittedVertex' as const,
        enumerateRootTargets: () =>
          manual(
            'roots',
            returns,
            () => ({
              done: false,
              value: {
                kind: 'inlineResolution' as const,
                vertexId: 'A',
                resolutionIfNotPreviouslyAdmitted: {
                  kind: 'found',
                  vertexData: 'A',
                },
              },
            }),
            () => {
              throw 'later root cleanup';
            },
          ),
        enumerateOutgoingLinks: () =>
          manual(
            'edges:A',
            returns,
            () => ({
              done: false,
              value: {
                targetToResolveOnAdmission: {
                  kind: 'inlineResolution' as const,
                  vertexId: 'B',
                  resolutionIfNotPreviouslyAdmitted: {
                    kind: 'found',
                    vertexData: 'B',
                  },
                },
                edgeData: undefined,
              },
            }),
            () => {
              throw first;
            },
          ),
      };
      const runner = new factory({
        graphWalkDiscoverySource: source,
        expansionOrder: 'depthFirst',
        limits: { maxAdmittedRootOrLinkTargetOccurrences: 2 },
      }).createIndependentRunnerFromCurrentOptions();
      let caught = false;
      try {
        await runner.runUntilSuspendedOrTerminal();
      } catch (error) {
        caught = true;
        expect(error).toBe(first);
      }
      expect(caught).toBe(true);
      expect(returns).toEqual(['edges:A', 'roots']);
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
      expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
        kind: 'failed',
        error: first,
      });
      for (let attempt = 0; attempt < 2; attempt++) {
        caught = false;
        try {
          await runner.closePermanentlyAndDisposeSourceIterators();
        } catch (error) {
          caught = true;
          expect(error).toBe(first);
        }
        expect(caught).toBe(true);
      }
      expect(returns).toEqual(['edges:A', 'roots']);
      expect(runner.captureExecutionSnapshot().openSourceIteratorCount).toBe(0);
    }
  },
);

it('releases nested DFS iterators in reverse order on a global bound without opening more', () => {
  const returns: string[] = [];
  const opens: string[] = [];
  const source: GraphWalkDiscoverySource<string, undefined, string> = {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
    enumerateRootTargets: () =>
      manual('roots', returns, () => ({
        done: false,
        value: { vertexId: 'A' },
      })),
    resolveVertexDataById: (vertexId) => ({
      kind: 'found',
      vertexData: vertexId,
    }),
    enumerateOutgoingLinks: ({ vertexId }) => {
      opens.push(vertexId);
      return manual(`edges:${vertexId}`, returns, () => ({
        done: false,
        value: {
          targetToResolveOnAdmission: {
            vertexId: vertexId === 'A' ? 'B' : 'C',
          },
          edgeData: undefined,
        },
      }));
    },
  };
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
    expansionOrder: 'depthFirst',
    limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 3 },
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(opens).toEqual(['A', 'B']);
  expect(returns).toEqual(['edges:B', 'edges:A', 'roots']);
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'traversalLimitsReached',
    reachedLimits: ['maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay'],
  });
  expect(
    Object.isFrozen(runner.captureProgressSnapshot().terminalOutcome),
  ).toBe(true);
  const terminalOutcome = runner.captureProgressSnapshot().terminalOutcome;
  if (terminalOutcome?.kind !== 'traversalLimitsReached')
    throw new Error('Expected limit');
  expect(Object.isFrozen(terminalOutcome.reachedLimits)).toBe(true);
  runner.closePermanentlyAndDisposeSourceIterators();
  expect(returns).toEqual(['edges:B', 'edges:A', 'roots']);
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual(
    terminalOutcome,
  );
});

it('removes exhausted iterators without reading their return and preserves exhaustion on close', async () => {
  for (const factory of [GraphWalkBuilder, AsyncGraphWalkBuilder]) {
    const roots: Iterable<{ vertexId: string }> = {
      [Symbol.iterator]() {
        return {
          next: () => ({ done: true, value: undefined }),
          get return(): () => IteratorResult<never> {
            throw new Error('Exhausted return must not be read');
          },
        };
      },
    };
    const runner = new factory({
      graphWalkDiscoverySource: {
        vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
        resolveVertexDataById: () => ({ kind: 'omitted' }),
        enumerateRootTargets: () => roots,
        enumerateOutgoingLinks: () => [],
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    await runner.closePermanentlyAndDisposeSourceIterators();
    expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
      kind: 'explorationExhausted',
    });
    expect(runner.captureExecutionSnapshot().openSourceIteratorCount).toBe(0);
  }
});

it('does not close exhausted outgoing iterators when a later branch fails', () => {
  const returns: string[] = [];
  let rootIndex = 0;
  const source: GraphWalkDiscoverySource<string, undefined, string> = {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
    enumerateRootTargets: () =>
      manual('roots', returns, () => ({
        done: false,
        value: {
          kind: 'inlineResolution' as const,
          vertexId: ['A', 'B'][rootIndex++]!,
          resolutionIfNotPreviouslyAdmitted: {
            kind: 'found',
            vertexData: 'data',
          },
        },
      })),
    enumerateOutgoingLinks: ({ vertexId }) =>
      manual<never>(`edges:${vertexId}`, returns, () => {
        if (vertexId === 'B') throw 'failure';
        return { done: true, value: undefined };
      }),
  };
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
    expansionOrder: 'depthFirst',
  }).createIndependentRunnerFromCurrentOptions();
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow();
  expect(returns).toEqual(['edges:B', 'roots']);
});

it('close on INITIAL performs no source work and remains terminal', async () => {
  for (const factory of [GraphWalkBuilder, AsyncGraphWalkBuilder]) {
    const runner = new factory({
      graphWalkDiscoverySource: {
        vertexResolutionMode:
          'inlineResolutionOrPreviouslyAdmittedVertex' as const,
        enumerateRootTargets() {
          throw new Error('Must not open');
        },
        enumerateOutgoingLinks() {
          throw new Error('Must not open');
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.closePermanentlyAndDisposeSourceIterators();
    await runner.closePermanentlyAndDisposeSourceIterators();
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.captureProgressSnapshot()).toMatchObject({
      status: Status.FINISHED,
      terminalOutcome: { kind: 'permanentlyClosedByCaller' },
      counts: {
        rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 0,
        admittedRootOrLinkTargetOccurrences: 0,
      },
    });
  }
});

it('attempts cleanup after a throwing return getter and tolerates missing returns', () => {
  const cleanup = { error: 'getter' };
  const returns: string[] = [];
  const runner = new GraphWalkBuilder({
    expansionOrder: 'depthFirst',
    limits: { maxAdmittedRootOrLinkTargetOccurrences: 2 },
    graphWalkDiscoverySource: {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets: () =>
        manual('roots', returns, () => ({
          done: false,
          value: {
            kind: 'inlineResolution' as const,
            vertexId: 'A',
            resolutionIfNotPreviouslyAdmitted: { kind: 'found', vertexData: 1 },
          },
        })),
      enumerateOutgoingLinks: () => ({
        [Symbol.iterator]() {
          return {
            next: () => ({
              done: false,
              value: {
                targetToResolveOnAdmission: {
                  kind: 'inlineResolution' as const,
                  vertexId: 'B',
                  resolutionIfNotPreviouslyAdmitted: {
                    kind: 'found',
                    vertexData: 2,
                  },
                },
                edgeData: undefined,
              },
            }),
            get return(): () => IteratorResult<never> {
              throw cleanup;
            },
          };
        },
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow();
  expect(returns).toEqual(['roots']);
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'failed',
    error: cleanup,
  });
  const withoutReturn = new GraphWalkBuilder({
    limits: { maxAdmittedRootOrLinkTargetOccurrences: 1 },
    graphWalkDiscoverySource: {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets: () => ({
        [Symbol.iterator]() {
          return {
            next: () => ({
              done: false,
              value: {
                kind: 'inlineResolution' as const,
                vertexId: 1,
                resolutionIfNotPreviouslyAdmitted: {
                  kind: 'found',
                  vertexData: 1,
                },
              },
            }),
          };
        },
      }),
      enumerateOutgoingLinks: () => [],
    },
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(withoutReturn.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'traversalLimitsReached',
    reachedLimits: ['maxAdmittedRootOrLinkTargetOccurrences'],
  });
});

it('overlapping async terminal closes join, await cleanup, and exclude execution until disposal settles', async () => {
  let release!: () => void;
  let entered!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let returns = 0;
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets: () => ({
        [Symbol.asyncIterator]() {
          return {
            async next() {
              return {
                done: false,
                value: {
                  kind: 'inlineResolution' as const,
                  vertexId: 'A',
                  resolutionIfNotPreviouslyAdmitted: {
                    kind: 'found',
                    vertexData: 1,
                  },
                },
              };
            },
            async return() {
              returns++;
              entered();
              await pending;
              return { done: true, value: undefined };
            },
          };
        },
      }),
      enumerateOutgoingLinks: () => [],
    },
  }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await iterator.next();
  await expect(
    runner.closePermanentlyAndDisposeSourceIterators(),
  ).rejects.toThrow('owner');
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.RUNNING);
  await iterator.return();
  expect(returns).toBe(0);
  const closing = runner.closePermanentlyAndDisposeSourceIterators();
  expect(runner.closePermanentlyAndDisposeSourceIterators()).toBe(closing);
  await started;
  expect(runner.captureExecutionSnapshot()).toMatchObject({
    inFlightInvocationCount: 1,
    openSourceIteratorCount: 1,
    pendingInvocationRequests: [
      { operation: 'returnSourceIteratorForDisposal' },
    ],
    bufferedDeliveryEventCount: 0,
  });
  await expect(runner.runUntilSuspendedOrTerminal()).rejects.toThrow('owner');
  release();
  await closing;
  expect(runner.closePermanentlyAndDisposeSourceIterators()).toBe(closing);
  expect(returns).toBe(1);
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'permanentlyClosedByCaller',
  });
  await runner.runUntilSuspendedOrTerminal();
  expect(runner.captureExecutionSnapshot().openSourceIteratorCount).toBe(0);
});

it.each([null, undefined])(
  'async explicit cleanup failure %p is awaited and retained by the shared close promise',
  async (failure) => {
    const returns: string[] = [];
    const runner = new AsyncGraphWalkBuilder({
      graphWalkDiscoverySource: {
        vertexResolutionMode:
          'inlineResolutionOrPreviouslyAdmittedVertex' as const,
        enumerateRootTargets: () =>
          manual(
            'roots',
            returns,
            () => ({
              done: false,
              value: {
                kind: 'inlineResolution' as const,
                vertexId: 1,
                resolutionIfNotPreviouslyAdmitted: {
                  kind: 'found',
                  vertexData: 1,
                },
              },
            }),
            () => {
              throw failure;
            },
          ),
        enumerateOutgoingLinks: () => [],
      },
    }).createIndependentRunnerFromCurrentOptions();
    const iterator =
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
    await iterator.next();
    await iterator.return();
    const closing = runner.closePermanentlyAndDisposeSourceIterators();
    expect(runner.closePermanentlyAndDisposeSourceIterators()).toBe(closing);
    let caught = false;
    try {
      await closing;
    } catch (error) {
      caught = true;
      expect(error).toBe(failure);
    }
    expect(caught).toBe(true);
    expect(runner.closePermanentlyAndDisposeSourceIterators()).toBe(closing);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
    expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
      kind: 'failed',
      error: failure,
    });
    expect(returns).toEqual(['roots']);
  },
);

it('terminal close does not acquire a returned iterable that has never been opened', async () => {
  for (const factory of [GraphWalkBuilder, AsyncGraphWalkBuilder]) {
    const returns: string[] = [];
    const runner = new factory({
      expansionOrder: 'depthFirst',
      graphWalkDiscoverySource: {
        vertexResolutionMode:
          'inlineResolutionOrPreviouslyAdmittedVertex' as const,
        enumerateRootTargets: () =>
          manual('roots', returns, () => ({
            done: false,
            value: {
              kind: 'inlineResolution' as const,
              vertexId: 'A',
              resolutionIfNotPreviouslyAdmitted: {
                kind: 'found',
                vertexData: 'A',
              },
            },
          })),
        enumerateOutgoingLinks() {
          runner.requestPauseAfterAdmittedCallbacksDrain();
          return {
            [Symbol.iterator](): Iterator<never> {
              throw new Error('Never open an iterable to clean it');
            },
          };
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
    expect(runner.captureExecutionSnapshot().openSourceIteratorCount).toBe(1);
    await runner.closePermanentlyAndDisposeSourceIterators();
    expect(returns).toEqual(['roots']);
    expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
      kind: 'permanentlyClosedByCaller',
    });
  }
});

it.each([null, undefined])(
  'serializes pending async cleanup while preserving the primary %p',
  async (primary) => {
    let release!: () => void;
    let entered!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const returns: string[] = [];
    const runner = new AsyncGraphWalkBuilder({
      expansionOrder: 'depthFirst',
      graphWalkDiscoverySource: {
        vertexResolutionMode:
          'inlineResolutionOrPreviouslyAdmittedVertex' as const,
        enumerateRootTargets: () =>
          manual(
            'roots',
            returns,
            () => ({
              done: false,
              value: {
                kind: 'inlineResolution' as const,
                vertexId: 'A',
                resolutionIfNotPreviouslyAdmitted: {
                  kind: 'found',
                  vertexData: 'A',
                },
              },
            }),
            () => {
              throw 'second cleanup failure';
            },
          ),
        enumerateOutgoingLinks: () => ({
          [Symbol.asyncIterator]() {
            return {
              async next(): Promise<IteratorResult<never>> {
                throw primary;
              },
              async return(): Promise<IteratorResult<never>> {
                returns.push('edges:A');
                entered();
                await pending;
                throw 'first cleanup failure';
              },
            };
          },
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    let caught = false;
    const running = runner.runUntilSuspendedOrTerminal().catch((error) => {
      caught = true;
      expect(error).toBe(primary);
    });
    await started;
    expect(caught).toBe(false);
    expect(returns).toEqual(['edges:A']);
    expect(runner.captureExecutionSnapshot()).toMatchObject({
      traversalLifecycleStatus: Status.FAILED,
      inFlightInvocationCount: 1,
      openSourceIteratorCount: 2,
      pendingInvocationRequests: [
        { operation: 'returnSourceIteratorForDisposal' },
      ],
    });
    expect(
      typeof runner.captureExecutionSnapshot().pendingInvocationRequests[0]!
        .runnerLocalVertexIdentityToken,
    ).toBe('symbol');
    await expect(
      runner.closePermanentlyAndDisposeSourceIterators(),
    ).rejects.toThrow('owner');
    release();
    await running;
    expect(caught).toBe(true);
    expect(returns).toEqual(['edges:A', 'roots']);
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
    const closing = runner.closePermanentlyAndDisposeSourceIterators();
    caught = false;
    try {
      await closing;
    } catch (error) {
      caught = true;
      expect(error).toBe(primary);
    }
    expect(caught).toBe(true);
    expect(runner.closePermanentlyAndDisposeSourceIterators()).toBe(closing);
    expect(returns).toEqual(['edges:A', 'roots']);
  },
);

it.each([GraphWalkBuilder, AsyncGraphWalkBuilder])(
  '%p releases acquired iterators when their then getter throws before the first next',
  async (factory) => {
    for (const primary of [
      null,
      undefined,
      { reason: 'iterator then getter' },
    ]) {
      for (const location of ['roots', 'enumerateOutgoingLinks']) {
        const returns: string[] = [];
        const cleanup = {
          reason: 'cleanup must not replace acquisition error',
        };
        let openedAtValidation = -1;
        let nextCalls = 0;
        const acquired = {
          [Symbol.iterator]() {
            return {
              get then(): never {
                openedAtValidation =
                  runner.captureExecutionSnapshot().openSourceIteratorCount;
                throw primary;
              },
              next(): IteratorResult<never> {
                nextCalls++;
                return { done: true, value: undefined };
              },
              return(): IteratorResult<never> {
                returns.push(location);
                throw cleanup;
              },
            };
          },
        };
        const source: GraphWalkDiscoverySource<string, undefined, string> = {
          vertexResolutionMode:
            'inlineResolutionOrPreviouslyAdmittedVertex' as const,
          enumerateRootTargets: () =>
            location === 'roots'
              ? acquired
              : manual(
                  'roots',
                  returns,
                  () => ({
                    done: false,
                    value: {
                      kind: 'inlineResolution' as const,
                      vertexId: 'A',
                      resolutionIfNotPreviouslyAdmitted: {
                        kind: 'found',
                        vertexData: 'A',
                      },
                    },
                  }),
                  () => {
                    throw cleanup;
                  },
                ),
          enumerateOutgoingLinks: () => acquired,
        };
        const runner = new factory({
          graphWalkDiscoverySource: source,
          expansionOrder: 'depthFirst',
        }).createIndependentRunnerFromCurrentOptions();
        let caught = false;
        try {
          await runner.runUntilSuspendedOrTerminal();
        } catch (error) {
          caught = true;
          expect(error).toBe(primary);
        }
        expect(caught).toBe(true);
        expect(nextCalls).toBe(0);
        expect(returns).toEqual(
          location === 'roots'
            ? ['roots']
            : ['enumerateOutgoingLinks', 'roots'],
        );
        expect(openedAtValidation).toBe(location === 'roots' ? 1 : 2);
        expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
        expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
          kind: 'failed',
          error: primary,
        });
        caught = false;
        try {
          await runner.closePermanentlyAndDisposeSourceIterators();
        } catch (error) {
          caught = true;
          expect(error).toBe(primary);
        }
        expect(caught).toBe(true);
        expect(returns).toEqual(
          location === 'roots'
            ? ['roots']
            : ['enumerateOutgoingLinks', 'roots'],
        );
        expect(runner.captureExecutionSnapshot().openSourceIteratorCount).toBe(
          0,
        );
      }
    }
  },
);

it.each([GraphWalkBuilder, AsyncGraphWalkBuilder])(
  '%p still observes invalid callable factory thenables and rejects primitive iterators',
  async (factory) => {
    const rejection = { reason: 'invalid factory thenable' };
    const rejected = Promise.reject(rejection);
    const observed: unknown[] = [];
    const callable = Object.assign(() => undefined, {
      then(
        onFulfilled: (value: unknown) => unknown,
        onRejected: (error: unknown) => unknown,
      ) {
        return rejected.then(onFulfilled, (error: unknown) => {
          observed.push(error);
          return onRejected(error);
        });
      },
    });
    // A fallback keeps an intentionally failing regression from leaking rejection.
    void rejected.catch(() => undefined);
    for (const value of [callable, 42]) {
      const source = {
        vertexResolutionMode:
          'inlineResolutionOrPreviouslyAdmittedVertex' as const,
        enumerateRootTargets: () => ({ [Symbol.iterator]: () => value }),
        enumerateOutgoingLinks: () => [],
      } as unknown as GraphWalkDiscoverySource<never, never, never>;
      const runner = new factory({
        graphWalkDiscoverySource: source,
      }).createIndependentRunnerFromCurrentOptions();
      let caught = false;
      try {
        await runner.runUntilSuspendedOrTerminal();
      } catch (error) {
        caught = true;
        expect(error).toBeInstanceOf(TypeError);
      }
      expect(caught).toBe(true);
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
      expect(runner.captureExecutionSnapshot().openSourceIteratorCount).toBe(0);
    }
    await Promise.resolve();
    expect(observed).toEqual([rejection]);
  },
);
