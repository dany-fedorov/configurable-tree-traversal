import type {
  CallbackBindings,
  CallSpec,
  KernelPort,
} from '../src/core/effects/types';
import { TraversalKernel } from '../src/core/TraversalKernel';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { createAsyncDriver } from '../src/core/drivers/runAsync';
import { AsyncRunnerSession } from '../src/core/drivers/AsyncRunnerSession';
import type { TestGraph } from './helpers/graph-fixtures';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';
import type { InternalVertexRef } from '../src/core/graph/types';

function makeKernel(
  iterateOver: Array<'BEFORE_CHILD_EXPANSION' | 'AFTER_CHILD_SUBTREES'> = [],
) {
  return new TraversalKernel<TestGraph>({
    kind: 'depth-first',
    execution: 'async',
    sourceMode: 'tree',
    container: new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    }),
    stateBridge: {
      status: TraversalRunnerStatus.NOT_STARTED,
      traversalRootVertexRef: null,
      subtreeTraversalDisabledRefs: new Set(),
      visitorsState: {},
    },
    visitorMetadata: {},
    iterableConfig: {
      iterateOver,
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: {
      visitAfterChildIndices: { indices: [0] },
      visitAfterChildIndicesWhenPrimarySelectionIsEmpty: { indices: [0] },
      alsoVisitAfterOnlyChild: true,
      allowBoundaryVisitsAfterOmittedChildSlots: true,
    },
    hasChildHintsListTransformer: false,
    hasChildHintVertexIdResolver: false,
    maxConcurrentCallbackInvocations: 2,
  });
}

test('closes while root resolution is pending and consumes it after resume', async () => {
  const root = deferred<{
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
  }>();
  const kernel = makeKernel(['BEFORE_CHILD_EXPANSION']);
  const bindings: CallbackBindings<TestGraph> = {
    invoke: (call) => {
      if (call.kind !== 'MAKE_ROOT') throw new Error('Unexpected callback');
      return { kind: call.kind, value: root.promise };
    },
  };
  const driver = createAsyncDriver(kernel, bindings, 1);
  const session = new AsyncRunnerSession(driver);
  const first =
    session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const pending = first.next();
  await eventLoopTurn();
  expect(driver.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);

  await expect(first.return(undefined)).resolves.toEqual({
    done: true,
    value: undefined,
  });
  await expect(pending).resolves.toEqual({ done: true, value: undefined });
  expect(kernel.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.SUSPENDED,
  );

  root.resolve({
    vertexContent: { $vertexData: 'root', $childDiscoveryHints: [] },
  });
  await eventLoopTurn();
  expect(driver.captureExecutionSnapshot().inFlightInvocationCount).toBe(0);
  expect(
    kernel.captureExecutionSnapshot().pendingCallbackRequests,
  ).toHaveLength(1);

  const resumed =
    session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await expect(resumed.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'root' }, order: 'BEFORE_CHILD_EXPANSION' },
  });
  await expect(resumed.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
});

test('validates callback result kinds and concurrency', async () => {
  const kernel = makeKernel();
  expect(() =>
    createAsyncDriver(kernel, {} as CallbackBindings<TestGraph>, 0),
  ).toThrow(/positive integer.*Infinity/i);
  const driver = createAsyncDriver(
    kernel,
    {
      invoke: () => ({ kind: 'VISIT', value: undefined }),
    } as CallbackBindings<TestGraph>,
    1,
  );
  const session = new AsyncRunnerSession(driver);
  await expect(session.runUntilSuspendedOrTerminal()).rejects.toThrow(
    /returned VISIT.*MAKE_ROOT/i,
  );
});

test('stores a root outcome submitted after halt until direct resume', async () => {
  const root = deferred<{ vertexContent: null }>();
  const kernel = makeKernel();
  const driver = createAsyncDriver(
    kernel,
    {
      invoke: (call) => {
        if (call.kind !== 'MAKE_ROOT') throw new Error('Unexpected callback');
        return { kind: call.kind, value: root.promise };
      },
    },
    1,
  );
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  driver.requestHalt();
  root.resolve({ vertexContent: null });
  await eventLoopTurn();
  expect(driver.advance('drain')).toEqual({ kind: 'SUSPENDED' });
  expect(
    kernel.captureExecutionSnapshot().pendingCallbackRequests,
  ).toHaveLength(1);

  driver.resume();
  expect(driver.advance('drive')).toEqual({ kind: 'FINISHED' });
  expect(
    kernel.captureExecutionSnapshot().pendingCallbackRequests,
  ).toHaveLength(0);
});

test('retains a stored root rejection and fails with the original value on resume', async () => {
  const root = deferred<{ vertexContent: null }>();
  const error = new Error('stored root failure');
  const kernel = makeKernel();
  const driver = createAsyncDriver(
    kernel,
    {
      invoke: (call) => {
        if (call.kind !== 'MAKE_ROOT') throw new Error('Unexpected callback');
        return { kind: call.kind, value: root.promise };
      },
    },
    1,
  );
  driver.advance('drive');
  driver.requestHalt();
  root.reject(error);
  await eventLoopTurn();
  expect(driver.advance('drain')).toEqual({ kind: 'SUSPENDED' });
  driver.resume();
  expect(driver.advance('drive')).toEqual({ kind: 'FAILED', error });
});

test('waitForProgress wakes for halt signaling', async () => {
  const driver = createAsyncDriver(
    makeKernel(),
    {} as CallbackBindings<TestGraph>,
    1,
  );
  const progress = driver.waitForProgress();
  driver.requestHalt();
  await expect(progress).resolves.toBeUndefined();
});

test('deletion cancels queued callbacks while an invalid running permit drains', async () => {
  const first = deferred<{ vertexContent: null }>();
  const started: string[] = [];
  const kernel = makeKernel(['BEFORE_CHILD_EXPANSION']);
  const driver = createAsyncDriver(
    kernel,
    {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['A', 'B', 'C'],
              },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          started.push(call.context.childDiscoveryHint);
          return { kind: call.kind, value: first.promise };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    1,
  );
  driver.advance('drive');
  await eventLoopTurn();
  const rootEvent = driver.advance('drive');
  if (rootEvent.kind !== 'EVENT') throw new Error('Expected root event');
  driver.acknowledgeEvent(rootEvent.boundaryId);
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  expect(started).toEqual(['A']);
  expect(driver.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);

  const internals = kernel as unknown as {
    scheduling: {
      deleteVertex(
        ref: InternalVertexRef<TestGraph>,
      ): Set<InternalVertexRef<TestGraph>>;
    };
    invalidateRefs(
      refs: ReadonlySet<InternalVertexRef<TestGraph>>,
      except: {
        ownerKind: 'vertexPhaseVisitorChain';
        runnerLocalOwnerId: number;
        validityGeneration: number;
      },
    ): void;
  };
  const removed = internals.scheduling.deleteVertex(
    rootEvent.event.vertexHandle,
  );
  internals.invalidateRefs(removed, {
    ownerKind: 'vertexPhaseVisitorChain',
    runnerLocalOwnerId: -1,
    validityGeneration: 0,
  });

  expect(driver.advance('settle')).toEqual({ kind: 'FINISHED' });
  expect(started).toEqual(['A']);
  expect(driver.captureExecutionSnapshot()).toMatchObject({
    traversalLifecycleStatus: TraversalRunnerStatus.FINISHED,
    inFlightInvocationCount: 1,
    pendingCallbackRequests: [{ ownerStillValid: false }],
  });

  first.reject(new Error('ignored late error'));
  await eventLoopTurn();
  expect(driver.advance('settle')).toEqual({ kind: 'FINISHED' });
  expect(driver.captureExecutionSnapshot()).toMatchObject({
    traversalLifecycleStatus: TraversalRunnerStatus.FINISHED,
    inFlightInvocationCount: 0,
    pendingCallbackRequests: [],
  });
  expect(kernel.getFailure()).toBeNull();
});

test('kernel refuses to discard unknown or still-live requests', () => {
  const kernel = makeKernel();
  const action = kernel.poll('drive');
  if (action.kind !== 'CALL') throw new Error('Expected root callback');
  expect(() => kernel.discardRequest(-1)).toThrow(/cannot discard live/i);
  expect(() => kernel.discardRequest(action.call.requestId)).toThrow(
    /cannot discard live/i,
  );
});

test('drops a stored root outcome whose owner is invalidated before resume', async () => {
  const root = deferred<{ vertexContent: null }>();
  const kernel = makeKernel();
  const driver = createAsyncDriver(
    kernel,
    {
      invoke: (call) => {
        if (call.kind !== 'MAKE_ROOT') throw new Error('Unexpected callback');
        return { kind: call.kind, value: root.promise };
      },
    },
    1,
  );
  driver.advance('drive');
  driver.requestHalt();
  root.resolve({ vertexContent: null });
  await eventLoopTurn();
  driver.advance('drain');
  const internals = kernel as unknown as {
    invalidateOwner(owner: {
      ownerKind: 'rootResolution';
      runnerLocalOwnerId: number;
      validityGeneration: number;
    }): void;
  };
  internals.invalidateOwner({
    ownerKind: 'rootResolution',
    runnerLocalOwnerId: 1,
    validityGeneration: 0,
  });
  driver.resume();
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  expect(kernel.captureExecutionSnapshot().pendingCallbackRequests).toEqual([]);
});

test('applies a settled invalidation before admitting a released permit', async () => {
  const first = deferred<{ vertexContent: null }>();
  const calls: CallSpec<TestGraph>[] = [
    {
      requestId: 1,
      kind: 'MAKE_ROOT',
      owner: {
        ownerKind: 'rootResolution',
        runnerLocalOwnerId: 1,
        validityGeneration: 0,
      },
    },
    {
      requestId: 2,
      kind: 'MAKE_ROOT',
      owner: {
        ownerKind: 'rootResolution',
        runnerLocalOwnerId: 2,
        validityGeneration: 0,
      },
    },
  ];
  const started: number[] = [];
  let submitted = false;
  let secondValid = true;
  const kernel = {
    poll() {
      if (submitted) secondValid = false;
      const call = calls.shift();
      return call === undefined
        ? { kind: 'WAIT' as const }
        : { kind: 'CALL' as const, call };
    },
    submit() {
      submitted = true;
    },
    discardRequest(requestId: number) {
      expect(requestId).toBe(2);
    },
    isRequestValid(requestId: number) {
      return requestId === 1 || secondValid;
    },
    isRequestEligible(requestId: number) {
      return requestId === 1 || secondValid;
    },
    isHaltRequested() {
      return false;
    },
  } as unknown as KernelPort<TestGraph>;
  const driver = createAsyncDriver(
    kernel,
    {
      invoke(call) {
        started.push(call.requestId);
        return {
          kind: 'MAKE_ROOT',
          value: call.requestId === 1 ? first.promise : { vertexContent: null },
        };
      },
    } as CallbackBindings<TestGraph>,
    1,
  );

  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  expect(started).toEqual([1]);
  first.resolve({ vertexContent: null });
  await eventLoopTurn();

  expect(driver.advance('settle')).toEqual({ kind: 'WAIT' });
  expect(started).toEqual([1]);
});

test('clears close-acknowledged boundary suppression on failure', () => {
  let failed = false;
  const acknowledgements: number[] = [];
  const kernel = {
    poll: () =>
      failed
        ? { kind: 'FAILED' as const, error: new Error('drain failed') }
        : { kind: 'EVENT' as const, event: {} as never, boundaryId: 1 },
    acknowledgeEvent(boundaryId: number) {
      acknowledgements.push(boundaryId);
    },
    requestHalt() {
      failed = true;
    },
    isHaltRequested: () => failed,
    isRequestValid: () => true,
    isRequestEligible: () => true,
  } as unknown as KernelPort<TestGraph>;
  const driver = createAsyncDriver(
    kernel,
    {} as CallbackBindings<TestGraph>,
    1,
  );

  expect(driver.advance('drive')).toMatchObject({
    kind: 'EVENT',
    boundaryId: 1,
  });
  driver.requestHalt();
  expect(driver.advance('drain')).toMatchObject({ kind: 'FAILED' });
  driver.acknowledgeEvent(1);

  expect(acknowledgements).toEqual([1, 1]);
});

test('clears close-boundary bookkeeping when draining throws', () => {
  let draining = false;
  const error = new Error('drain threw');
  const acknowledgements: number[] = [];
  const kernel = {
    poll() {
      if (draining) throw error;
      return { kind: 'EVENT' as const, event: {} as never, boundaryId: 2 };
    },
    acknowledgeEvent(boundaryId: number) {
      acknowledgements.push(boundaryId);
    },
    requestHalt() {
      draining = true;
    },
    isHaltRequested: () => draining,
    isRequestValid: () => true,
    isRequestEligible: () => true,
  } as unknown as KernelPort<TestGraph>;
  const driver = createAsyncDriver(
    kernel,
    {} as CallbackBindings<TestGraph>,
    1,
  );

  expect(driver.advance('drive')).toMatchObject({
    kind: 'EVENT',
    boundaryId: 2,
  });
  driver.requestHalt();
  expect(() => driver.advance('drain')).toThrow(error);
  driver.acknowledgeEvent(2);

  expect(acknowledgements).toEqual([2, 2]);
});
