import {
  AsyncGraphWalkBuilder,
  GraphWalkObservationKind as Phase,
  TraversalVisitorCommandName as C,
} from '../src';
import type {
  AsyncGraphWalkDiscoverySource,
  GraphWalkVertexResolutionResult,
} from '../src';
import { idGraph } from './helpers/graph-walk-fixtures';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

it('return immediately pauses a pending resolver, retains its vertex, and drains queued demand as done', async () => {
  const started = deferred<void>();
  const resolution = deferred<GraphWalkVertexResolutionResult<string>>();
  let lookups = 0;
  const source: AsyncGraphWalkDiscoverySource<string, undefined, string> = {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
    enumerateRootTargets: () => [{ vertexId: 'A' }],
    resolveVertexDataById: () => {
      lookups++;
      started.resolve();
      return resolution.promise;
    },
    enumerateOutgoingLinks: () => [],
  };
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const pending = iterator.next();
  const queued = iterator.next();
  await started.promise;
  const closing = iterator.return(undefined);
  const closingAgain = iterator.return(undefined);
  const afterClose = iterator.next();
  expect(runner.captureExecutionSnapshot()).toMatchObject({
    pauseRequested: true,
    inFlightInvocationCount: 1,
    pendingInvocationRequests: [{ operation: 'resolveVertexDataById' }],
  });
  resolution.resolve({ kind: 'found', vertexData: 'A' });
  for (const result of await Promise.all([
    pending,
    queued,
    closing,
    closingAgain,
    afterClose,
  ]))
    expect(result).toEqual({ done: true, value: undefined });
  expect(runner.isSuspended()).toBe(true);
  const resumed = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    {
      deliveredEventKinds: [Phase.VERTEX_OCCURRENCE],
    },
  );
  expect((await resumed.next()).value).toMatchObject({
    eventKind: 'vertexOccurrence',
  });
  await resumed.return(undefined);
  expect(lookups).toBe(1);
});

it('does not expand after delivery and rejects owners without changing their selectors', async () => {
  const calls: string[] = [];
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
    shouldExpandVertexOccurrence: async () => {
      calls.push('expand');
      return true;
    },
  }).createIndependentRunnerFromCurrentOptions();
  const owner = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  expect((await owner.next()).value).toMatchObject({
    eventKind: 'vertexOccurrence',
  });
  await Promise.resolve();
  expect(calls).toEqual([]);
  await expect(
    runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] }),
  ).rejects.toThrow('execution owner');
  await expect(
    runner
      .runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [],
      })
      .next(),
  ).rejects.toThrow('execution owner');
  expect(
    runner.captureExecutionSnapshot().executionOptions.deliveredEventKinds,
  ).toEqual([Phase.VERTEX_OCCURRENCE]);
  await owner.return(undefined);
  expect(calls).toEqual([]);
  expect(await runner.runUntilSuspendedOrTerminal()).toBe(runner);
  expect(calls).toEqual(['expand']);
});

it('return drains a serial visitor chain while preserving its undelivered observation', async () => {
  const started = deferred<void>();
  const finish = deferred<void>();
  const trace: string[] = [];
  const walk = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  });
  walk.addVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, async () => {
    trace.push('first');
    started.resolve();
    await finish.promise;
    trace.push('settled');
  });
  walk.addVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, async () => {
    trace.push('second');
  });
  const runner = walk.createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const pending = iterator.next();
  await started.promise;
  const closing = iterator.return(undefined);
  expect(trace).toEqual(['first']);
  finish.resolve();
  expect(await pending).toEqual({ done: true, value: undefined });
  await closing;
  expect(trace).toEqual(['first', 'settled', 'second']);
  expect(runner.isSuspended()).toBe(true);
  expect(
    runner.captureProgressSnapshot().counts.acknowledgedObservationCountsByKind
      .vertexOccurrence,
  ).toBe(0);
  const resumed = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    {
      admittedVisitorCallbackPhases: { include: [] },
    },
  );
  expect((await resumed.next()).value).toMatchObject({
    eventKind: 'vertexOccurrence',
  });
  await resumed.return(undefined);
  expect(trace).toEqual(['first', 'settled', 'second']);
});

it.each([
  'enumerateRootTargets',
  'readNextRootTarget',
  'enumerateOutgoingLinks',
  'readNextOutgoingLinkOrCachedReplay',
  'shouldAdmitOutgoingLinkTarget',
  'shouldExpandVertexOccurrence',
] as const)(
  'return pauses pending %s without pulling another item or losing continuation',
  async (operation) => {
    const started = deferred<void>();
    const finish = deferred<void>();
    const calls: string[] = [];
    let gated = false;
    const step = async <T>(name: string, value: T): Promise<T> => {
      calls.push(name);
      if (name === operation && !gated) {
        gated = true;
        started.resolve();
        await finish.promise;
      }
      return value;
    };
    const source: AsyncGraphWalkDiscoverySource<string, undefined, string> = {
      vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
      enumerateRootTargets: () =>
        step('enumerateRootTargets', {
          [Symbol.asyncIterator]() {
            let index = 0;
            return {
              next: () =>
                step(
                  'readNextRootTarget',
                  index++ === 0
                    ? { done: false, value: { vertexId: 'A' } }
                    : { done: true, value: undefined },
                ),
            };
          },
        }),
      resolveVertexDataById: (id) =>
        step(`resolve:${id}`, { kind: 'found' as const, vertexData: id }),
      enumerateOutgoingLinks: ({ vertexId }) =>
        step('enumerateOutgoingLinks', {
          [Symbol.asyncIterator]() {
            let index = 0;
            return {
              next: () =>
                step(
                  'readNextOutgoingLinkOrCachedReplay',
                  vertexId === 'A' && index++ === 0
                    ? {
                        done: false,
                        value: {
                          targetToResolveOnAdmission: { vertexId: 'B' },
                          edgeData: undefined,
                        },
                      }
                    : { done: true, value: undefined },
                ),
            };
          },
        }),
    };
    const runner = new AsyncGraphWalkBuilder({
      graphWalkDiscoverySource: source,
      deliveredEventKinds: [],
      shouldAdmitOutgoingLinkTarget: () =>
        step('shouldAdmitOutgoingLinkTarget', true),
      shouldExpandVertexOccurrence: () =>
        step('shouldExpandVertexOccurrence', true),
    }).createIndependentRunnerFromCurrentOptions();
    const iterator =
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
    const pending = iterator.next();
    await started.promise;
    const before = [...calls];
    expect(
      runner.captureExecutionSnapshot().pendingInvocationRequests,
    ).toMatchObject([{ operation }]);
    const closing = iterator.return(undefined);
    finish.resolve();
    expect(await pending).toEqual({ done: true, value: undefined });
    await closing;
    expect(calls).toEqual(before);
    expect(runner.isSuspended()).toBe(true);
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.captureProgressSnapshot().counts).toMatchObject({
      resolvedFoundVertexIdCount: 2,
      freshSourceOutgoingLinkCount: 1,
    });
    expect(calls.filter((call) => call === 'resolve:A')).toHaveLength(1);
    expect(calls.filter((call) => call === 'resolve:B')).toHaveLength(1);
    expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
      kind: 'sourceRoutesExhausted',
    });
  },
);

it.each([undefined, null, false, 0, '', Symbol('error')])(
  'retains exact async rejection %p on every execution attempt',
  async (error) => {
    const runner = new AsyncGraphWalkBuilder({
      graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
      visitorsByObservationKind: {
        vertexOccurrence: () => Promise.reject(error),
      },
    }).createIndependentRunnerFromCurrentOptions();
    for (let attempt = 0; attempt < 2; attempt++) {
      let caught = false;
      try {
        await runner.runUntilSuspendedOrTerminal();
      } catch (value) {
        caught = true;
        expect(value).toBe(error);
      }
      expect(caught).toBe(true);
      expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
        kind: 'failed',
        error,
      });
      expect(runner.getTraversalStopReason()).toBe('failed');
    }
  },
);

it('throw pauses pending work, preserves source failure, and rejects close with the consumer error', async () => {
  const started = deferred<void>();
  const result = deferred<GraphWalkVertexResolutionResult<string>>();
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: {
      vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
      enumerateRootTargets: () => [{ vertexId: 'A' }],
      resolveVertexDataById: () => {
        started.resolve();
        return result.promise;
      },
      enumerateOutgoingLinks: () => [],
    },
  }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const pending = iterator.next();
  await started.promise;
  const throwing = iterator.throw(undefined);
  const closing = iterator.return(undefined);
  const assertions = Promise.all([
    expect(pending).rejects.toBe(null),
    expect(throwing).rejects.toBeUndefined(),
    expect(closing).rejects.toBe(null),
  ]);
  result.reject(null);
  await assertions;
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'failed',
    error: null,
  });
  await expect(runner.runUntilSuspendedOrTerminal()).rejects.toBe(null);
});

it('unopened and closed returns/throws never acquire ownership or change runner progress', async () => {
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  }).createIndependentRunnerFromCurrentOptions();
  const fresh = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await expect(fresh.throw(undefined)).rejects.toBeUndefined();
  expect(await fresh.next()).toEqual({ done: true, value: undefined });
  expect(runner.getTraversalStopReason()).toBe(null);
  expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
  const owner = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await owner.next();
  await runner
    .runAndIterateObservationEventsUntilSuspendedOrTerminal()
    .return(undefined);
  await expect(
    runner
      .runAndIterateObservationEventsUntilSuspendedOrTerminal()
      .throw('consumer'),
  ).rejects.toBe('consumer');
  expect(runner.isSuspended()).toBe(false);
  await owner.return(undefined);
  expect(await owner.return(undefined)).toEqual({
    done: true,
    value: undefined,
  });
  await expect(owner.throw(null)).rejects.toBe(null);
  expect(runner.isSuspended()).toBe(true);
  await runner.runUntilSuspendedOrTerminal();
  const captureProgressSnapshot = runner.captureProgressSnapshot();
  expect(await runner.runUntilSuspendedOrTerminal()).toBe(runner);
  expect(runner.captureProgressSnapshot()).toEqual(captureProgressSnapshot);
  expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
});

it('serves queued demand in order and lets independent runners progress while another callback is pending', async () => {
  const started = deferred<void>();
  const finish = deferred<void>();
  const walk = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(
      ['A', 'B'],
      [
        ['A', []],
        ['B', []],
      ],
    ),
  });
  const independent = walk.createIndependentRunnerFromCurrentOptions();
  walk.addVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, async (event) => {
    if (event.vertex.vertexId === 'A') {
      started.resolve();
      await finish.promise;
    }
  });
  const runner = walk.createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const first = iterator.next();
  const second = iterator.next();
  const final = iterator.next();
  await started.promise;
  await independent.runUntilSuspendedOrTerminal();
  expect(independent.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'sourceRoutesExhausted',
  });
  expect(runner.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);
  finish.resolve();
  expect((await first).value).toMatchObject({ vertex: { vertexId: 'A' } });
  expect((await second).value).toMatchObject({ vertex: { vertexId: 'B' } });
  expect(await final).toEqual({ done: true, value: undefined });
});

it('cooperative pause drains a selected chain and delivers its observation before halting', async () => {
  const calls: string[] = [];
  const walk = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  });
  walk.addVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, async () => {
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
    calls.push('first');
  });
  walk.addVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, async () => {
    calls.push('second');
  });
  const runner = walk.createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  expect((await iterator.next()).value).toMatchObject({
    eventKind: 'vertexOccurrence',
  });
  expect(await iterator.next()).toEqual({ done: true, value: undefined });
  expect(runner.isSuspended()).toBe(true);
  const paths = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [Phase.ROUTE_PREFIX],
    admittedVisitorCallbackPhases: { include: [] },
  });
  expect((await paths.next()).value).toMatchObject({
    eventKind: 'routePrefix',
  });
  await paths.return(undefined);
  expect(calls).toEqual(['first', 'second']);
});

it('acknowledges pause between deliveries without new demand or expansion', async () => {
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await iterator.next();
  expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
  await iterator.return(undefined);
  expect(runner.getTraversalStopReason()).toBe('paused');
  expect(
    runner.captureProgressSnapshot().counts.acknowledgedObservationCountsByKind,
  ).toEqual({
    vertexOccurrence: 1,
    admittedEdgeOccurrence: 0,
    routePrefix: 0,
  });
});

it('retains the admitted async chain across HALT and uses the new lease emission selector', async () => {
  const calls: string[] = [];
  const walk = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  });
  walk.addVisitorGroupForObservationKind(Phase.VERTEX_OCCURRENCE, {
    visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
    visitors: [
      async () => {
        calls.push('halt');
        return {
          commands: [
            { commandName: C.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
          ],
        };
      },
      async () => {
        calls.push('group-end');
      },
    ],
  });
  walk.addVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, async () => {
    calls.push('tail');
  });
  const runner = walk.createIndependentRunnerFromCurrentOptions();
  await runner.runUntilSuspendedOrTerminal();
  expect(runner.isSuspended()).toBe(true);
  expect(calls).toEqual(['halt', 'group-end']);
  const phases = [Phase.ROUTE_PREFIX];
  const resumed = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    {
      deliveredEventKinds: phases,
      admittedVisitorCallbackPhases: { include: [] },
    },
  );
  phases[0] = Phase.VERTEX_OCCURRENCE;
  expect((await resumed.next()).value).toMatchObject({
    eventKind: 'routePrefix',
  });
  expect(calls).toEqual(['halt', 'group-end', 'tail']);
  await resumed.return(undefined);
  await runner.runUntilSuspendedOrTerminal();
  expect(calls).toEqual(['halt', 'group-end', 'tail']);
});

it('consumer exceptions and successful pending throw pause without failing the runner', async () => {
  const error = Symbol('consumer');
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(
      ['A', 'B'],
      [
        ['A', []],
        ['B', []],
      ],
    ),
  }).createIndependentRunnerFromCurrentOptions();
  let caught = false;
  try {
    for await (const _event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      throw error;
  } catch (value) {
    caught = true;
    expect(value).toBe(error);
  }
  expect(caught).toBe(true);
  expect(runner.isSuspended()).toBe(true);
  const next = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  expect((await next.next()).value).toMatchObject({
    vertex: { vertexId: 'B' },
  });
  await expect(next.throw(error)).rejects.toBe(error);
  expect(runner.isSuspended()).toBe(true);
  expect(runner.captureProgressSnapshot().terminalOutcome).toBe(null);
  await runner.runUntilSuspendedOrTerminal();
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'sourceRoutesExhausted',
  });
});

it('invalid selectors fail before acquisition and immediate return admits no source work', async () => {
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets: () => {
        throw new Error('source must not be called');
      },
      enumerateOutgoingLinks: () => [],
    },
  }).createIndependentRunnerFromCurrentOptions();
  expect(() =>
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: ['invalid' as Phase],
    }),
  ).toThrow(TypeError);
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const pending = iterator.next();
  await iterator.return(undefined);
  expect(await pending).toEqual({ done: true, value: undefined });
  expect(runner.isSuspended()).toBe(true);
  expect(
    runner.captureProgressSnapshot().counts
      .rootOrLinkReadAttemptsIncludingDoneAndCacheReplay,
  ).toBe(0);
});

it('completion records cannot corrupt later iterator completion', async () => {
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: idGraph([], []),
  }).createIndependentRunnerFromCurrentOptions();
  const first = await runner
    .runAndIterateObservationEventsUntilSuspendedOrTerminal()
    .next();
  Reflect.set(first, 'done', false);
  expect(
    await runner
      .runAndIterateObservationEventsUntilSuspendedOrTerminal()
      .next(),
  ).toEqual({
    done: true,
    value: undefined,
  });
});
