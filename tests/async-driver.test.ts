import type { CallbackBindings } from '../src/core/effects/types';
import { TraversalKernel } from '../src/core/TraversalKernel';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { createAsyncDriver } from '../src/core/drivers/runAsync';
import { AsyncRunnerSession } from '../src/core/drivers/AsyncRunnerSession';
import type { TestGraph } from './helpers/graph-fixtures';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';
import type { Ref } from '../src/core/graph/types';

function makeKernel(iterateOver: Array<'PRE_ORDER' | 'POST_ORDER'> = []) {
  return new TraversalKernel<TestGraph>({
    kind: 'depth-first',
    execution: 'async',
    sourceMode: 'tree',
    container: new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    }),
    stateBridge: {
      status: TraversalRunnerStatus.INITIAL,
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
      visitParentAfterChildren: 0,
      visitParentAfterChildrenAllRangesOutOfBoundsFallback: 0,
      visitUpOneChildParents: true,
      considerVisitAfterNullContentVertices: true,
    },
    hasSorter: false,
    hasHintIds: false,
    concurrency: 2,
  });
}

test('closes while root resolution is pending and consumes it after resume', async () => {
  const root = deferred<{ vertexContent: { $d: string; $c: string[] } }>();
  const kernel = makeKernel(['PRE_ORDER']);
  const bindings: CallbackBindings<TestGraph> = {
    invoke: (call) => {
      if (call.kind !== 'MAKE_ROOT') throw new Error('Unexpected callback');
      return { kind: call.kind, value: root.promise };
    },
  };
  const driver = createAsyncDriver(kernel, bindings, 1);
  const session = new AsyncRunnerSession(driver);
  const first = session.getIterable();
  const pending = first.next();
  await eventLoopTurn();
  expect(driver.inspect().inFlightCallbackCount).toBe(1);

  await expect(first.return(undefined)).resolves.toEqual({
    done: true,
    value: undefined,
  });
  await expect(pending).resolves.toEqual({ done: true, value: undefined });
  expect(kernel.getStatus()).toBe(TraversalRunnerStatus.HALTED);

  root.resolve({ vertexContent: { $d: 'root', $c: [] } });
  await eventLoopTurn();
  expect(driver.inspect().inFlightCallbackCount).toBe(0);
  expect(kernel.inspect().pendingRequests).toHaveLength(1);

  const resumed = session.getIterable();
  await expect(resumed.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'root' }, order: 'PRE_ORDER' },
  });
  await expect(resumed.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
});

test('validates callback result kinds and concurrency', async () => {
  const kernel = makeKernel();
  expect(() => createAsyncDriver(kernel, {} as CallbackBindings<TestGraph>, 0)).toThrow(
    /positive integer.*Infinity/i,
  );
  const driver = createAsyncDriver(
    kernel,
    {
      invoke: () => ({ kind: 'VISIT', value: undefined }),
    } as CallbackBindings<TestGraph>,
    1,
  );
  const session = new AsyncRunnerSession(driver);
  await expect(session.run()).rejects.toThrow(/returned VISIT.*MAKE_ROOT/i);
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
  expect(driver.advance('drain')).toEqual({ kind: 'HALTED' });
  expect(kernel.inspect().pendingRequests).toHaveLength(1);

  driver.resume();
  expect(driver.advance('drive')).toEqual({ kind: 'FINISHED' });
  expect(kernel.inspect().pendingRequests).toHaveLength(0);
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
  expect(driver.advance('drain')).toEqual({ kind: 'HALTED' });
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
  const kernel = makeKernel(['PRE_ORDER']);
  const driver = createAsyncDriver(
    kernel,
    {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: { vertexContent: { $d: 'root', $c: ['A', 'B', 'C'] } },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          started.push(call.context.vertexHint);
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
  expect(driver.inspect().inFlightCallbackCount).toBe(1);

  const internals = kernel as unknown as {
    scheduling: { deleteVertex(ref: Ref<TestGraph>): Set<Ref<TestGraph>> };
    invalidateRefs(refs: ReadonlySet<Ref<TestGraph>>, except: {
      kind: 'chain';
      id: number;
      epoch: number;
    }): void;
  };
  const removed = internals.scheduling.deleteVertex(rootEvent.event.vertexRef);
  internals.invalidateRefs(removed, { kind: 'chain', id: -1, epoch: 0 });

  expect(driver.advance('settle')).toEqual({ kind: 'FINISHED' });
  expect(started).toEqual(['A']);
  expect(driver.inspect()).toMatchObject({
    status: TraversalRunnerStatus.FINISHED,
    inFlightCallbackCount: 1,
    pendingRequests: [{ valid: false }],
  });

  first.reject(new Error('ignored late error'));
  await eventLoopTurn();
  expect(driver.advance('settle')).toEqual({ kind: 'FINISHED' });
  expect(driver.inspect()).toMatchObject({
    status: TraversalRunnerStatus.FINISHED,
    inFlightCallbackCount: 0,
    pendingRequests: [],
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
    invalidateOwner(owner: { kind: 'root'; id: number; epoch: number }): void;
  };
  internals.invalidateOwner({ kind: 'root', id: 1, epoch: 0 });
  driver.resume();
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  expect(kernel.inspect().pendingRequests).toEqual([]);
});
