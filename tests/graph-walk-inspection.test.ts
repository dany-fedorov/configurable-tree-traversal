import {
  AsyncGraphWalkBuilder,
  GraphWalkBuilder,
  GraphWalkObservationKind as Phase,
  TraversalRunnerStatus as Status,
} from '../src';

it('captures passive frozen detached mechanical state while a visitor is pending', async () => {
  const id = { secret: 'caller id' };
  const data = { secret: 'caller data' };
  let release!: () => void;
  let entered!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let calls = 0;
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets: () => [
        {
          kind: 'inlineResolution' as const,
          vertexId: id,
          resolutionIfNotPreviouslyAdmitted: {
            kind: 'found',
            vertexData: data,
          },
        },
      ],
      enumerateOutgoingLinks: () => {
        calls++;
        return [];
      },
    },
    visitorsByObservationKind: {
      [Phase.VERTEX_OCCURRENCE]: async () => {
        entered();
        await pending;
      },
    },
  }).createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  await started;
  const snapshot = runner.captureExecutionSnapshot();
  expect(snapshot).toMatchObject({
    traversalAlgorithm: 'graph-walk',
    sourceMode: 'graph',
    concurrency: 1,
    traversalLifecycleStatus: Status.RUNNING,
    callbackExecutionMode: 'async',
    inFlightInvocationCount: 1,
    bufferedDeliveryEventCount: 2,
    pendingRouteExpansionFrameCount: 0,
    openSourceIteratorCount: 1,
    pendingObservationKinds: [Phase.VERTEX_OCCURRENCE, Phase.ROUTE_PREFIX],
    visitorChainPosition: {
      observationKind: Phase.VERTEX_OCCURRENCE,
      visitorIndexInObservationChain: 0,
    },
    pendingInvocationRequests: [{ operation: 'invokeVisitorCallback' }],
  });
  const token =
    snapshot.pendingInvocationRequests[0]!.runnerLocalVertexIdentityToken;
  expect(typeof token).toBe('symbol');
  expect(
    runner.captureExecutionSnapshot().pendingInvocationRequests[0]!
      .runnerLocalVertexIdentityToken,
  ).toBe(token);
  function check(value: unknown) {
    expect(value).not.toBe(id);
    expect(value).not.toBe(data);
    expect(typeof value).not.toBe('function');
    expect(value).not.toBeInstanceOf(Promise);
    if (value !== null && typeof value === 'object') {
      expect(Object.isFrozen(value)).toBe(true);
      for (const child of Object.values(value)) check(child);
    }
  }
  check(snapshot);
  expect(() =>
    Object.assign(snapshot.counts, {
      rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 900,
    }),
  ).toThrow();
  expect(runner.captureExecutionSnapshot()).toEqual(snapshot);
  expect(runner.captureExecutionSnapshot()).not.toBe(snapshot);
  expect(calls).toBe(0);
  expect(Object.isFrozen(id)).toBe(false);
  expect(Object.isFrozen(data)).toBe(false);
  expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
  expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
  release();
  await running;
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  expect(runner.captureExecutionSnapshot().inFlightInvocationCount).toBe(0);
  expect(runner.captureExecutionSnapshot().bufferedDeliveryEventCount).toBe(1);
  await runner.closePermanentlyAndDisposeSourceIterators();
  expect(runner.captureExecutionSnapshot()).toMatchObject({
    traversalLifecycleStatus: Status.FINISHED,
    bufferedDeliveryEventCount: 0,
    pendingRouteExpansionFrameCount: 0,
    openSourceIteratorCount: 0,
    visitorChainPosition: null,
    pendingInvocationRequests: [],
  });
});

it('freezes owned summary records without freezing arbitrary failure objects', () => {
  const error = { reason: 'caller error' };
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets() {
        throw error;
      },
      enumerateOutgoingLinks: () => [],
    },
  }).createIndependentRunnerFromCurrentOptions();
  try {
    runner.runUntilSuspendedOrTerminal();
  } catch (observed) {
    expect(observed).toBe(error);
  }
  const captureProgressSnapshot = runner.captureProgressSnapshot();
  expect(Object.isFrozen(captureProgressSnapshot)).toBe(true);
  expect(Object.isFrozen(captureProgressSnapshot.counts)).toBe(true);
  expect(
    Object.isFrozen(
      captureProgressSnapshot.counts.acknowledgedObservationCountsByKind,
    ),
  ).toBe(true);
  expect(Object.isFrozen(captureProgressSnapshot.terminalOutcome)).toBe(true);
  expect(Object.isFrozen(error)).toBe(false);
  expect(runner.captureProgressSnapshot()).not.toBe(captureProgressSnapshot);
  expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
});

it('uses consistent private tokens across source, predicate, observation, and cleanup requests', () => {
  const tokens: (symbol | undefined)[] = [];
  const operations: string[] = [];
  const id = {
    toString() {
      throw new Error('Must not stringify caller IDs');
    },
  };
  function snapshot() {
    const inspection = runner.captureExecutionSnapshot();
    expect(inspection.inFlightInvocationCount).toBe(1);
    operations.push(inspection.pendingInvocationRequests[0]!.operation);
    tokens.push(
      inspection.pendingInvocationRequests[0]!.runnerLocalVertexIdentityToken,
    );
  }
  const runner = new GraphWalkBuilder({
    expansionOrder: 'depthFirst',
    limits: { maxAdmittedRootOrLinkTargetOccurrences: 2 },
    graphWalkDiscoverySource: {
      vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
      enumerateRootTargets: () => [{ vertexId: id }],
      resolveVertexDataById: () => {
        snapshot();
        return { kind: 'found', vertexData: id };
      },
      enumerateOutgoingLinks: () => {
        snapshot();
        return {
          [Symbol.iterator]() {
            return {
              next() {
                snapshot();
                return {
                  done: false,
                  value: {
                    targetToResolveOnAdmission: { vertexId: id },
                    edgeData: id,
                  },
                };
              },
              return() {
                snapshot();
                return { done: true, value: undefined };
              },
            };
          },
        };
      },
    },
    shouldAdmitOutgoingLinkTarget: () => {
      snapshot();
      return true;
    },
    shouldExpandVertexOccurrence: () => {
      snapshot();
      return true;
    },
    visitorsByObservationKind: {
      [Phase.VERTEX_OCCURRENCE]: snapshot,
      [Phase.ADMITTED_EDGE_OCCURRENCE]: snapshot,
    },
  }).createIndependentRunnerFromCurrentOptions();
  runner.runUntilSuspendedOrTerminal();
  expect(operations).toEqual([
    'resolveVertexDataById',
    'invokeVisitorCallback',
    'shouldExpandVertexOccurrence',
    'enumerateOutgoingLinks',
    'readNextOutgoingLinkOrCachedReplay',
    'shouldAdmitOutgoingLinkTarget',
    'invokeVisitorCallback',
    'returnSourceIteratorForDisposal',
  ]);
  expect(typeof tokens[0]).toBe('symbol');
  expect(new Set(tokens).size).toBe(1);
  expect(Object.isFrozen(id)).toBe(false);
});

it('keeps tokens local to each runner, and terminal close discards an unissued resolver without invoking it', async () => {
  let release!: (value: IteratorResult<{ vertexId: number }>) => void;
  let entered!: () => void;
  let pending = new Promise<IteratorResult<{ vertexId: number }>>((resolve) => {
    release = resolve;
  });
  let started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let resolutions = 0;
  let returns = 0;
  const factory = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: {
      vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
      enumerateRootTargets: () => ({
        [Symbol.asyncIterator]() {
          return {
            next() {
              entered();
              return pending;
            },
            async return() {
              returns++;
              return { done: true, value: undefined };
            },
          };
        },
      }),
      resolveVertexDataById: () => {
        resolutions++;
        return { kind: 'found', vertexData: 1 };
      },
      enumerateOutgoingLinks: () => [],
    },
  });
  const runner = factory.createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const next = iterator.next();
  await started;
  const returned = iterator.return();
  release({ done: false, value: { vertexId: 1 } });
  await next;
  await returned;
  const paused = runner.captureExecutionSnapshot();
  expect(paused).toMatchObject({
    traversalLifecycleStatus: Status.SUSPENDED,
    inFlightInvocationCount: 0,
    pendingInvocationRequests: [{ operation: 'resolveVertexDataById' }],
  });
  pending = new Promise<IteratorResult<{ vertexId: number }>>((resolve) => {
    release = resolve;
  });
  started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const other = factory.createIndependentRunnerFromCurrentOptions();
  const otherIterator =
    other.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const otherNext = otherIterator.next();
  await started;
  const otherReturn = otherIterator.return();
  release({ done: false, value: { vertexId: 1 } });
  await otherNext;
  await otherReturn;
  expect(
    other.captureExecutionSnapshot().pendingInvocationRequests[0]!
      .runnerLocalVertexIdentityToken,
  ).not.toBe(
    paused.pendingInvocationRequests[0]!.runnerLocalVertexIdentityToken,
  );
  await runner.closePermanentlyAndDisposeSourceIterators();
  await other.closePermanentlyAndDisposeSourceIterators();
  expect(resolutions).toBe(0);
  expect(returns).toBe(2);
  expect(runner.captureExecutionSnapshot().pendingInvocationRequests).toEqual(
    [],
  );
});
