import {
  GraphWalk,
  AsyncGraphWalk,
  TraversalRunnerStatus as Status,
} from '../src';
import type { GraphWalkSource } from '../src';

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
): GraphWalkSource<string, undefined, string> {
  return {
    roots: () =>
      manual('roots', returns, () => ({
        done: false,
        value: { vertexId: 'A', resolution: { kind: 'found', data: 'A' } },
      })),
    outgoing: () =>
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
    const runner = new GraphWalk({
      strategy: 'depthFirst',
      source: failingResourceSource(returns, primary, { reason: 'cleanup' }),
    }).createRunner();
    let caught = false;
    try {
      runner.run();
    } catch (error) {
      caught = true;
      expect(error).toBe(primary);
    }
    expect(caught).toBe(true);
    expect(returns).toEqual(['edges:A', 'roots']);
    expect(runner.getStatus()).toBe(Status.FAILED);
    expect(runner.summary().outcome).toEqual({
      kind: 'failed',
      error: primary,
    });
    expect(runner.requestPause()).toBe(false);
  },
);

it('cleans an acquired iterator even when its next getter fails before first next', () => {
  const returns: string[] = [];
  const primary = { reason: 'next getter' };
  const source: GraphWalkSource<string, undefined, string> = {
    roots: () =>
      manual('roots', returns, () => ({
        done: false,
        value: { vertexId: 'A', resolution: { kind: 'found', data: 'A' } },
      })),
    outgoing: () => ({
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
  const runner = new GraphWalk({ source, strategy: 'depthFirst' }).createRunner();
  expect(() => runner.run()).toThrow();
  expect(runner.summary().outcome).toEqual({ kind: 'failed', error: primary });
  expect(returns).toEqual(['edges:A', 'roots']);
});

it('async failure awaits reverse cleanup and retains arbitrary primary errors', async () => {
  const returns: string[] = [];
  const runner = new AsyncGraphWalk({
    strategy: 'depthFirst',
    source: failingResourceSource(returns, undefined, null),
  }).createRunner();
  let caught = false;
  try {
    await runner.run();
  } catch (error) {
    caught = true;
    expect(error).toBeUndefined();
  }
  expect(caught).toBe(true);
  expect(runner.getStatus()).toBe(Status.FAILED);
  expect(returns).toEqual(['edges:A', 'roots']);
  expect(runner.requestPause()).toBe(false);
});
it('public iterator return retains sources, terminal close releases them once and prevents resumption', () => {
  const returns: string[] = [];
  const runner = new GraphWalk({
    source: failingResourceSource(returns, 'unused', 'unused'),
  }).createRunner();
  const iterator = runner.iterateEvents();
  iterator.next();
  expect(() => runner.close()).toThrow('owner');
  iterator.return();
  expect(runner.getStatus()).toBe(Status.HALTED);
  expect(returns).toEqual([]);
  runner.close();
  runner.close();
  expect(returns).toEqual(['roots']);
  expect(runner.summary().outcome).toEqual({ kind: 'closed' });
  expect([...runner.iterateEvents()]).toEqual([]);
  expect(runner.inspect().openSourceIteratorCount).toBe(0);
});

it.each([null, undefined, false, 0, { reason: 'cleanup' }])(
  'retains the first cleanup-only error %p and keeps trying returns',
  async (first) => {
    for (const factory of [GraphWalk, AsyncGraphWalk]) {
      const returns: string[] = [];
      const source: GraphWalkSource<string, undefined, string> = {
        roots: () =>
          manual(
            'roots',
            returns,
            () => ({
              done: false,
              value: {
                vertexId: 'A',
                resolution: { kind: 'found', data: 'A' },
              },
            }),
            () => {
              throw 'later root cleanup';
            },
          ),
        outgoing: () =>
          manual(
            'edges:A',
            returns,
            () => ({
              done: false,
              value: {
                target: {
                  vertexId: 'B',
                  resolution: { kind: 'found', data: 'B' },
                },
                data: undefined,
              },
            }),
            () => {
              throw first;
            },
          ),
      };
      const runner = new factory({
        source,
        strategy: 'depthFirst',
        limits: { maxAdmittedTargets: 2 },
      }).createRunner();
      let caught = false;
      try {
        await runner.run();
      } catch (error) {
        caught = true;
        expect(error).toBe(first);
      }
      expect(caught).toBe(true);
      expect(returns).toEqual(['edges:A', 'roots']);
      expect(runner.getStatus()).toBe(Status.FAILED);
      expect(runner.summary().outcome).toEqual({
        kind: 'failed',
        error: first,
      });
      for (let attempt = 0; attempt < 2; attempt++) {
        caught = false;
        try {
          await runner.close();
        } catch (error) {
          caught = true;
          expect(error).toBe(first);
        }
        expect(caught).toBe(true);
      }
      expect(returns).toEqual(['edges:A', 'roots']);
      expect(runner.inspect().openSourceIteratorCount).toBe(0);
    }
  },
);

it('releases nested DFS iterators in reverse order on a global bound without opening more', () => {
  const returns: string[] = [];
  const opens: string[] = [];
  const source: GraphWalkSource<string, undefined, string> = {
    roots: () =>
      manual('roots', returns, () => ({
        done: false,
        value: { vertexId: 'A' },
      })),
    resolveVertex: (vertexId) => ({ kind: 'found', data: vertexId }),
    outgoing: ({ vertexId }) => {
      opens.push(vertexId);
      return manual(`edges:${vertexId}`, returns, () => ({
        done: false,
        value: {
          target: { vertexId: vertexId === 'A' ? 'B' : 'C' },
          data: undefined,
        },
      }));
    },
  };
  const runner = new GraphWalk({
    source,
    strategy: 'depthFirst',
    limits: { maxCandidateReadAttempts: 3 },
  })
    .createRunner()
    .run();
  expect(opens).toEqual(['A', 'B']);
  expect(returns).toEqual(['edges:B', 'edges:A', 'roots']);
  expect(runner.summary().outcome).toEqual({
    kind: 'limited',
    reasons: ['maxCandidateReadAttempts'],
  });
  expect(Object.isFrozen(runner.summary().outcome)).toBe(true);
  const outcome = runner.summary().outcome;
  if (outcome?.kind !== 'limited') throw new Error('Expected limit');
  expect(Object.isFrozen(outcome.reasons)).toBe(true);
  runner.close();
  expect(returns).toEqual(['edges:B', 'edges:A', 'roots']);
  expect(runner.summary().outcome).toEqual(outcome);
});

it('removes exhausted iterators without reading their return and preserves exhaustion on close', async () => {
  for (const factory of [GraphWalk, AsyncGraphWalk]) {
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
      source: { roots: () => roots, outgoing: () => [] },
    }).createRunner();
    await runner.run();
    await runner.close();
    expect(runner.summary().outcome).toEqual({ kind: 'exhausted' });
    expect(runner.inspect().openSourceIteratorCount).toBe(0);
  }
});

it('does not close exhausted outgoing iterators when a later branch fails', () => {
  const returns: string[] = [];
  let rootIndex = 0;
  const source: GraphWalkSource<string, undefined, string> = {
    roots: () =>
      manual('roots', returns, () => ({
        done: false,
        value: {
          vertexId: ['A', 'B'][rootIndex++]!,
          resolution: { kind: 'found', data: 'data' },
        },
      })),
    outgoing: ({ vertexId }) =>
      manual<never>(`edges:${vertexId}`, returns, () => {
        if (vertexId === 'B') throw 'failure';
        return { done: true, value: undefined };
      }),
  };
  const runner = new GraphWalk({ source, strategy: 'depthFirst' }).createRunner();
  expect(() => runner.run()).toThrow();
  expect(returns).toEqual(['edges:B', 'roots']);
});

it('close on INITIAL performs no source work and remains terminal', async () => {
  for (const factory of [GraphWalk, AsyncGraphWalk]) {
    const runner = new factory({
      source: {
        roots() {
          throw new Error('Must not open');
        },
        outgoing() {
          throw new Error('Must not open');
        },
      },
    }).createRunner();
    await runner.close();
    await runner.close();
    await runner.run();
    expect(runner.summary()).toMatchObject({
      status: Status.FINISHED,
      outcome: { kind: 'closed' },
      counts: { candidateReadAttempts: 0, admittedTargets: 0 },
    });
  }
});

it('attempts cleanup after a throwing return getter and tolerates missing returns', () => {
  const cleanup = { error: 'getter' };
  const returns: string[] = [];
  const runner = new GraphWalk({
    strategy: 'depthFirst',
    limits: { maxAdmittedTargets: 2 },
    source: {
      roots: () =>
        manual('roots', returns, () => ({
          done: false,
          value: { vertexId: 'A', resolution: { kind: 'found', data: 1 } },
        })),
      outgoing: () => ({
        [Symbol.iterator]() {
          return {
            next: () => ({
              done: false,
              value: {
                target: {
                  vertexId: 'B',
                  resolution: { kind: 'found', data: 2 },
                },
                data: undefined,
              },
            }),
            get return(): () => IteratorResult<never> {
              throw cleanup;
            },
          };
        },
      }),
    },
  }).createRunner();
  expect(() => runner.run()).toThrow();
  expect(returns).toEqual(['roots']);
  expect(runner.summary().outcome).toEqual({ kind: 'failed', error: cleanup });
  const withoutReturn = new GraphWalk({
    limits: { maxAdmittedTargets: 1 },
    source: {
      roots: () => ({
        [Symbol.iterator]() {
          return {
            next: () => ({
              done: false,
              value: { vertexId: 1, resolution: { kind: 'found', data: 1 } },
            }),
          };
        },
      }),
      outgoing: () => [],
    },
  })
    .createRunner()
    .run();
  expect(withoutReturn.summary().outcome).toEqual({
    kind: 'limited',
    reasons: ['maxAdmittedTargets'],
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
  const runner = new AsyncGraphWalk({
    source: {
      roots: () => ({
        [Symbol.asyncIterator]() {
          return {
            async next() {
              return {
                done: false,
                value: {
                  vertexId: 'A',
                  resolution: { kind: 'found', data: 1 },
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
      outgoing: () => [],
    },
  }).createRunner();
  const iterator = runner.iterateEvents();
  await iterator.next();
  await expect(runner.close()).rejects.toThrow('owner');
  expect(runner.getStatus()).toBe(Status.RUNNING);
  await iterator.return();
  expect(returns).toBe(0);
  const closing = runner.close();
  expect(runner.close()).toBe(closing);
  await started;
  expect(runner.inspect()).toMatchObject({
    inFlightCallbackCount: 1,
    openSourceIteratorCount: 1,
    pendingRequests: [{ operation: 'iteratorReturn' }],
    bufferedEventCount: 0,
  });
  await expect(runner.run()).rejects.toThrow('owner');
  release();
  await closing;
  expect(runner.close()).toBe(closing);
  expect(returns).toBe(1);
  expect(runner.summary().outcome).toEqual({ kind: 'closed' });
  await runner.run();
  expect(runner.inspect().openSourceIteratorCount).toBe(0);
});

it.each([null, undefined])(
  'async explicit cleanup failure %p is awaited and retained by the shared close promise',
  async (failure) => {
    const returns: string[] = [];
    const runner = new AsyncGraphWalk({
      source: {
        roots: () =>
          manual(
            'roots',
            returns,
            () => ({
              done: false,
              value: { vertexId: 1, resolution: { kind: 'found', data: 1 } },
            }),
            () => {
              throw failure;
            },
          ),
        outgoing: () => [],
      },
    }).createRunner();
    const iterator = runner.iterateEvents();
    await iterator.next();
    await iterator.return();
    const closing = runner.close();
    expect(runner.close()).toBe(closing);
    let caught = false;
    try {
      await closing;
    } catch (error) {
      caught = true;
      expect(error).toBe(failure);
    }
    expect(caught).toBe(true);
    expect(runner.close()).toBe(closing);
    expect(runner.getStatus()).toBe(Status.FAILED);
    expect(runner.summary().outcome).toEqual({
      kind: 'failed',
      error: failure,
    });
    expect(returns).toEqual(['roots']);
  },
);

it('terminal close does not acquire a returned iterable that has never been opened', async () => {
  for (const factory of [GraphWalk, AsyncGraphWalk]) {
    const returns: string[] = [];
    const runner = new factory({
      strategy: 'depthFirst',
      source: {
        roots: () =>
          manual('roots', returns, () => ({
            done: false,
            value: { vertexId: 'A', resolution: { kind: 'found', data: 'A' } },
          })),
        outgoing() {
          runner.requestPause();
          return {
            [Symbol.iterator](): Iterator<never> {
              throw new Error('Never open an iterable to clean it');
            },
          };
        },
      },
    }).createRunner();
    await runner.run();
    expect(runner.getStatus()).toBe(Status.HALTED);
    expect(runner.inspect().openSourceIteratorCount).toBe(1);
    await runner.close();
    expect(returns).toEqual(['roots']);
    expect(runner.summary().outcome).toEqual({ kind: 'closed' });
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
    const runner = new AsyncGraphWalk({
      strategy: 'depthFirst',
      source: {
        roots: () =>
          manual(
            'roots',
            returns,
            () => ({
              done: false,
              value: {
                vertexId: 'A',
                resolution: { kind: 'found', data: 'A' },
              },
            }),
            () => {
              throw 'second cleanup failure';
            },
          ),
        outgoing: () => ({
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
    }).createRunner();
    let caught = false;
    const running = runner.run().catch((error) => {
      caught = true;
      expect(error).toBe(primary);
    });
    await started;
    expect(caught).toBe(false);
    expect(returns).toEqual(['edges:A']);
    expect(runner.inspect()).toMatchObject({
      status: Status.FAILED,
      inFlightCallbackCount: 1,
      openSourceIteratorCount: 2,
      pendingRequests: [{ operation: 'iteratorReturn' }],
    });
    expect(typeof runner.inspect().pendingRequests[0]!.vertexToken).toBe(
      'symbol',
    );
    await expect(runner.close()).rejects.toThrow('owner');
    release();
    await running;
    expect(caught).toBe(true);
    expect(returns).toEqual(['edges:A', 'roots']);
    expect(runner.requestPause()).toBe(false);
    const closing = runner.close();
    caught = false;
    try {
      await closing;
    } catch (error) {
      caught = true;
      expect(error).toBe(primary);
    }
    expect(caught).toBe(true);
    expect(runner.close()).toBe(closing);
    expect(returns).toEqual(['edges:A', 'roots']);
  },
);

it.each([GraphWalk, AsyncGraphWalk])(
  '%p releases acquired iterators when their then getter throws before the first next',
  async (factory) => {
    for (const primary of [
      null,
      undefined,
      { reason: 'iterator then getter' },
    ]) {
      for (const location of ['roots', 'outgoing']) {
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
                openedAtValidation = runner.inspect().openSourceIteratorCount;
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
        const source: GraphWalkSource<string, undefined, string> = {
          roots: () =>
            location === 'roots'
              ? acquired
              : manual(
                  'roots',
                  returns,
                  () => ({
                    done: false,
                    value: {
                      vertexId: 'A',
                      resolution: { kind: 'found', data: 'A' },
                    },
                  }),
                  () => {
                    throw cleanup;
                  },
                ),
          outgoing: () => acquired,
        };
        const runner = new factory({
          source,
          strategy: 'depthFirst',
        }).createRunner();
        let caught = false;
        try {
          await runner.run();
        } catch (error) {
          caught = true;
          expect(error).toBe(primary);
        }
        expect(caught).toBe(true);
        expect(nextCalls).toBe(0);
        expect(returns).toEqual(
          location === 'roots' ? ['roots'] : ['outgoing', 'roots'],
        );
        expect(openedAtValidation).toBe(location === 'roots' ? 1 : 2);
        expect(runner.getStatus()).toBe(Status.FAILED);
        expect(runner.summary().outcome).toEqual({
          kind: 'failed',
          error: primary,
        });
        caught = false;
        try {
          await runner.close();
        } catch (error) {
          caught = true;
          expect(error).toBe(primary);
        }
        expect(caught).toBe(true);
        expect(returns).toEqual(
          location === 'roots' ? ['roots'] : ['outgoing', 'roots'],
        );
        expect(runner.inspect().openSourceIteratorCount).toBe(0);
      }
    }
  },
);

it.each([GraphWalk, AsyncGraphWalk])(
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
        roots: () => ({ [Symbol.iterator]: () => value }),
        outgoing: () => [],
      } as unknown as GraphWalkSource<never, never, never>;
      const runner = new factory({ source }).createRunner();
      let caught = false;
      try {
        await runner.run();
      } catch (error) {
        caught = true;
        expect(error).toBeInstanceOf(TypeError);
      }
      expect(caught).toBe(true);
      expect(runner.getStatus()).toBe(Status.FAILED);
      expect(runner.inspect().openSourceIteratorCount).toBe(0);
    }
    await Promise.resolve();
    expect(observed).toEqual([rejection]);
  },
);
