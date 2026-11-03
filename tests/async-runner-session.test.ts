import type { TreeOrDagCallbackDriverSnapshot } from '../src/core/CoreInspection';
import { AsyncRunnerSession } from '../src/core/drivers/AsyncRunnerSession';
import { Wakeup } from '../src/core/drivers/Wakeup';
import type { TreeOrDagVisitorPhase } from '../src/core/effects/types';
import type {
  AsyncSessionControl,
  SessionProgress,
} from '../src/core/kernelTypes';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import { eventLoopTurn } from './helpers/graph-fixtures';

const inspection: TreeOrDagCallbackDriverSnapshot = Object.freeze({
  traversalLifecycleStatus: TraversalRunnerStatus.NOT_STARTED,
  traversalStopReason: null,
  pauseRequested: false,
  traversalAlgorithm: 'depth-first',
  callbackExecutionMode: 'async',
  sourceTopologyKind: 'tree',
  maxConcurrentCallbackInvocations: 2,
  hasChildHintsListTransformer: false,
  hasChildHintVertexIdResolver: false,
  executionOptions: Object.freeze({
    deliveredEventKinds: Object.freeze([]),
    admittedVisitorCallbackPhases: 'all' as const,
  }),
  dependencyEligiblePhaseVisits: Object.freeze([]),
  vertexTraversalFrames: Object.freeze([]),
  vertexPhaseVisitorChains: Object.freeze([]),
  pendingCallbackRequests: Object.freeze([]),
  unacknowledgedCommittedEventBoundaryCount: 0,
  inFlightInvocationCount: 1,
});

class FakeAsyncSessionControl<E> implements AsyncSessionControl<E> {
  public pauseRequested = false;
  public readonly modes: string[] = [];
  public readonly acknowledged: number[] = [];
  public readonly resumedWith: (
    | import('../src/core/TraversalRunnerIterableConfig').TraversalIterableConfigInput<TreeOrDagVisitorPhase>
    | undefined
  )[] = [];
  public advanceCount = 0;
  private readonly wakeup = new Wakeup();
  private readonly actions: SessionProgress<E>[] = [];
  private readonly outstandingBoundaries = new Set<number>();
  private status = TraversalRunnerStatus.NOT_STARTED;
  private failure: { error: unknown } | null = null;

  public advance(mode: 'drive' | 'settle' | 'drain'): SessionProgress<E> {
    this.advanceCount += 1;
    this.modes.push(mode);
    if (this.failure !== null) {
      return { kind: 'FAILED', error: this.failure.error };
    }
    if (this.status === TraversalRunnerStatus.SUSPENDED) return { kind: 'SUSPENDED' };
    const nextAction = this.actions[0];
    if (
      nextAction?.kind === 'FINISHED' &&
      this.outstandingBoundaries.size > 0
    ) {
      return { kind: 'WAIT' };
    }
    const action = this.actions.shift();
    if (action === undefined) return { kind: 'WAIT' };
    if (action.kind === 'EVENT') {
      this.outstandingBoundaries.add(action.boundaryId);
    }
    if (action.kind === 'FINISHED')
      this.status = TraversalRunnerStatus.FINISHED;
    if (action.kind === 'SUSPENDED') this.status = TraversalRunnerStatus.SUSPENDED;
    if (action.kind === 'FAILED') {
      this.status = TraversalRunnerStatus.FAILED;
      this.failure = { error: action.error };
    }
    return action;
  }

  public shouldEmitEvent(): boolean {
    return true;
  }

  public acknowledgeEvent(boundaryId: number): void {
    this.acknowledged.push(boundaryId);
    this.outstandingBoundaries.delete(boundaryId);
  }

  public requestHalt(): void {
    this.pauseRequested = true;
    this.wakeup.notify();
  }

  public isHaltRequested(): boolean {
    return this.pauseRequested;
  }

  public resume(
    config?: import('../src/core/TraversalRunnerIterableConfig').TraversalIterableConfigInput<TreeOrDagVisitorPhase>,
  ): void {
    this.resumedWith.push(config);
    this.pauseRequested = false;
    this.status = TraversalRunnerStatus.RUNNING;
  }

  public getTraversalLifecycleStatus(): TraversalRunnerStatus {
    return this.status;
  }

  public getTraversalStopReason(): import('../src').TraversalStopReason | null {
    switch (this.status) {
      case TraversalRunnerStatus.SUSPENDED:
        return 'paused';
      case TraversalRunnerStatus.FINISHED:
        return 'finished';
      case TraversalRunnerStatus.FAILED:
        return 'failed';
      default:
        return null;
    }
  }

  public getFailure(): { error: unknown } | null {
    return this.failure;
  }

  public captureExecutionSnapshot(): TreeOrDagCallbackDriverSnapshot {
    return {
      ...inspection,
      traversalLifecycleStatus: this.status,
      traversalStopReason: this.getTraversalStopReason(),
      pauseRequested: this.pauseRequested,
    };
  }

  public waitForProgress(): Promise<void> {
    return this.wakeup.wait();
  }

  public enqueue(...actions: SessionProgress<E>[]): void {
    this.actions.push(...actions);
    this.wakeup.notify();
  }

  public reachHalted(): void {
    this.actions.push({ kind: 'SUSPENDED' });
    this.wakeup.notify();
  }

  public fail(error: unknown): void {
    this.failure = { error };
    this.status = TraversalRunnerStatus.FAILED;
    this.wakeup.notify();
  }
}

test('return signals halt before an unresolved next and closes both at halt', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const session = new AsyncRunnerSession(control);

  const iterator = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const next = iterator.next();
  const close = iterator.return(undefined);
  expect(control.pauseRequested).toBe(true);
  control.reachHalted();
  await expect(close).resolves.toEqual({ done: true, value: undefined });
  await expect(next).resolves.toEqual({ done: true, value: undefined });
});

test('creation and closing before first next do not touch the runner', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const iterator = new AsyncRunnerSession(control).runAndIterateObservationEventsUntilSuspendedOrTerminal();

  expect(iterator[Symbol.asyncIterator]()).toBe(iterator);

  await expect(iterator.return(undefined)).resolves.toEqual({
    done: true,
    value: undefined,
  });
  await expect(iterator.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
  await expect(iterator.return(undefined)).resolves.toEqual({
    done: true,
    value: undefined,
  });
  expect(control.advanceCount).toBe(0);
  expect(control.resumedWith).toEqual([]);
  expect(control.pauseRequested).toBe(false);
});

test('throw before first next rejects with the original consumer value', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const iterator = new AsyncRunnerSession(control).runAndIterateObservationEventsUntilSuspendedOrTerminal();

  await expect(iterator.throw(undefined)).rejects.toBeUndefined();
  await expect(iterator.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
  expect(control.resumedWith).toEqual([]);
});

test('queues next calls, settles while idle, and acknowledges delivered boundaries', async () => {
  const control = new FakeAsyncSessionControl<string>();
  control.enqueue(
    { kind: 'EVENT', event: 'first', boundaryId: 10 },
    { kind: 'EVENT', event: 'second', boundaryId: 11 },
  );
  const session = new AsyncRunnerSession(control);
  const iterator = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();

  await expect(iterator.next()).resolves.toEqual({
    done: false,
    value: 'first',
  });
  expect(session.captureExecutionSnapshot().bufferedDeliveryEventCount).toBe(1);
  expect(control.modes.slice(0, 3)).toEqual(['drive', 'settle', 'settle']);

  const second = iterator.next();
  const finished = iterator.next();
  control.enqueue({ kind: 'FINISHED' });
  await expect(second).resolves.toEqual({ done: false, value: 'second' });
  await expect(finished).resolves.toEqual({ done: true, value: undefined });
  expect(control.acknowledged).toEqual([10, 11]);
});

test('new demand wakes a pump waiting on a conforming silent control', async () => {
  const control = new FakeAsyncSessionControl<string>();
  control.enqueue({ kind: 'EVENT', event: 'first', boundaryId: 12 });
  const session = new AsyncRunnerSession(control);
  const iterator = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await iterator.next();
  await eventLoopTurn();
  const advancesBeforeDemand = control.advanceCount;

  const pending = iterator.next();
  await eventLoopTurn();

  expect(control.advanceCount).toBeGreaterThan(advancesBeforeDemand);
  expect(control.modes.at(-1)).toBe('drive');
  const close = iterator.return(undefined);
  control.reachHalted();
  await close;
  await pending;
});

test('an idle traversal failure rejects the active iterator on its next demand', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const error = new Error('failed while idle');
  control.enqueue(
    { kind: 'EVENT', event: 'first', boundaryId: 13 },
    { kind: 'FAILED', error },
  );
  const iterator = new AsyncRunnerSession(control).runAndIterateObservationEventsUntilSuspendedOrTerminal();

  await expect(iterator.next()).resolves.toEqual({
    done: false,
    value: 'first',
  });
  await expect(iterator.next()).rejects.toBe(error);
});

test('non-closing failure delivers committed buffered events before rejecting', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const error = new Error('failed after commits');
  control.enqueue(
    { kind: 'EVENT', event: 'first', boundaryId: 14 },
    { kind: 'EVENT', event: 'buffered', boundaryId: 15 },
    { kind: 'FAILED', error },
  );
  const session = new AsyncRunnerSession(control);
  const iterator = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();

  await expect(iterator.next()).resolves.toEqual({
    done: false,
    value: 'first',
  });
  expect(session.captureExecutionSnapshot().bufferedDeliveryEventCount).toBe(1);
  await expect(iterator.next()).resolves.toEqual({
    done: false,
    value: 'buffered',
  });
  await expect(iterator.next()).rejects.toBe(error);
  expect(control.acknowledged).toEqual([14, 15]);
});

test('retains events buffered during close and acknowledges the delivered boundary on resume', async () => {
  const control = new FakeAsyncSessionControl<string>();
  control.enqueue({ kind: 'EVENT', event: 'delivered', boundaryId: 20 });
  const session = new AsyncRunnerSession(control);
  const firstIterator = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await expect(firstIterator.next()).resolves.toEqual({
    done: false,
    value: 'delivered',
  });

  control.enqueue({ kind: 'EVENT', event: 'buffered', boundaryId: 21 });
  const close = firstIterator.return(undefined);
  const nextWhileClosing = firstIterator.next();
  expect(control.acknowledged).toEqual([]);
  control.reachHalted();
  await expect(close).resolves.toEqual({ done: true, value: undefined });
  await expect(nextWhileClosing).resolves.toEqual({
    done: true,
    value: undefined,
  });
  expect(session.captureExecutionSnapshot().bufferedDeliveryEventCount).toBe(1);
  expect(control.acknowledged).toEqual([]);

  const secondIterator = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await expect(secondIterator.next()).resolves.toEqual({
    done: false,
    value: 'buffered',
  });
  expect(control.acknowledged).toEqual([20]);
  const secondClose = secondIterator.return(undefined);
  control.reachHalted();
  await secondClose;
});

test('keeps the lease through closing and releases it once for repeated return', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const session = new AsyncRunnerSession(control);
  const owner = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const pending = owner.next();

  const firstClose = owner.return(undefined);
  const secondClose = owner.return(undefined);
  const contender = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await expect(contender.next()).rejects.toThrow(/active iterator/i);

  control.reachHalted();
  await expect(Promise.all([firstClose, secondClose])).resolves.toEqual([
    { done: true, value: undefined },
    { done: true, value: undefined },
  ]);
  await expect(pending).resolves.toEqual({ done: true, value: undefined });
  await expect(owner.next()).resolves.toEqual({ done: true, value: undefined });

  const resumed = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const resumedNext = resumed.next();
  const resumedClose = resumed.return(undefined);
  control.reachHalted();
  await resumedClose;
  await resumedNext;
  expect(control.resumedWith).toHaveLength(2);
});

test('consumer throw wins its call while traversal failure rejects close and pending next', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const session = new AsyncRunnerSession(control);
  const iterator = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const pending = iterator.next();
  const consumerError = new Error('consumer failed');
  const traversalError = new Error('traversal failed');

  const thrown = iterator.throw(consumerError);
  const close = iterator.return(undefined);
  control.fail(traversalError);

  await expect(thrown).rejects.toBe(consumerError);
  await expect(close).rejects.toBe(traversalError);
  await expect(pending).rejects.toBe(traversalError);
  await expect(session.runUntilSuspendedOrTerminal()).rejects.toBe(traversalError);
});

test('consumer throw cleans up successfully without poisoning the resumable session', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const session = new AsyncRunnerSession(control);
  const iterator = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const pending = iterator.next();
  const consumerError = new Error('stop consuming');

  const thrown = iterator.throw(consumerError);
  control.reachHalted();
  await expect(thrown).rejects.toBe(consumerError);
  await expect(pending).resolves.toEqual({ done: true, value: undefined });

  const resumed = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const resumedNext = resumed.next();
  const close = resumed.return(undefined);
  control.reachHalted();
  await close;
  await resumedNext;
});

test('preserves an undefined traversal failure through close and later execution', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const session = new AsyncRunnerSession(control);
  const iterator = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const pending = iterator.next();
  const close = iterator.return(undefined);

  control.fail(undefined);
  await expect(close).rejects.toBeUndefined();
  await expect(pending).rejects.toBeUndefined();
  await expect(session.runUntilSuspendedOrTerminal()).rejects.toBeUndefined();
});

test('captures an undefined control exception without rejecting the detached pump', async () => {
  const control = new FakeAsyncSessionControl<string>();
  control.advance = () => {
    throw undefined;
  };
  const session = new AsyncRunnerSession(control);

  await expect(
    Promise.race([
      session.runAndIterateObservationEventsUntilSuspendedOrTerminal().next(),
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error('session pump timed out')), 100);
      }),
    ]),
  ).rejects.toBeUndefined();
  expect(session.getTraversalLifecycleStatus()).toBe(TraversalRunnerStatus.FAILED);
  expect(session.getTraversalStopReason()).toBe('failed');
  expect(session.captureExecutionSnapshot().traversalStopReason).toBe('failed');
});

test('fails the session when acknowledging a delivered boundary throws', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const error = new Error('acknowledgement failed');
  control.enqueue({ kind: 'EVENT', event: 'value', boundaryId: 40 });
  const session = new AsyncRunnerSession(control);
  const iterator = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await expect(iterator.next()).resolves.toEqual({
    done: false,
    value: 'value',
  });
  control.acknowledgeEvent = () => {
    throw error;
  };

  await expect(iterator.next()).rejects.toBe(error);
  expect(session.getTraversalLifecycleStatus()).toBe(TraversalRunnerStatus.FAILED);
  expect(session.getTraversalStopReason()).toBe('failed');
  expect(session.captureExecutionSnapshot().traversalStopReason).toBe('failed');
});

test('rejects close and pending demand when requesting halt throws', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const error = new Error('halt request failed');
  const session = new AsyncRunnerSession(control);
  const iterator = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const pending = iterator.next();
  control.requestHalt = () => {
    throw error;
  };

  await expect(iterator.return(undefined)).rejects.toBe(error);
  await expect(pending).rejects.toBe(error);
  expect(session.getTraversalLifecycleStatus()).toBe(TraversalRunnerStatus.FAILED);
  expect(session.getTraversalStopReason()).toBe('failed');
  expect(session.captureExecutionSnapshot().traversalStopReason).toBe('failed');
});

test('run drains the session iterator, returns itself, and applies its config', async () => {
  const control = new FakeAsyncSessionControl<string>();
  control.enqueue(
    { kind: 'EVENT', event: 'ignored', boundaryId: 30 },
    { kind: 'FINISHED' },
  );
  const session = new AsyncRunnerSession(control);
  const config = { deliveredEventKinds: ['BEFORE_CHILD_EXPANSION' as const] };

  await expect(session.runUntilSuspendedOrTerminal(config)).resolves.toBe(session);
  expect(control.resumedWith).toEqual([config]);
  expect(control.acknowledged).toEqual([30]);
  expect(session.getTraversalLifecycleStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(session.isSuspended()).toBe(false);
  await expect(session.runAndIterateObservationEventsUntilSuspendedOrTerminal().next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
});

test('run uses the iterator halt path when execution requests a halt', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const session = new AsyncRunnerSession(control);
  const running = session.runUntilSuspendedOrTerminal();

  control.requestHalt();
  control.reachHalted();
  await expect(running).resolves.toBe(session);
  expect(control.modes).toContain('drain');
  expect(session.isSuspended()).toBe(true);
});

test('run rejects while another iterator owns execution', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const session = new AsyncRunnerSession(control);
  const iterator = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const pending = iterator.next();

  await expect(session.runUntilSuspendedOrTerminal()).rejects.toThrow(/active iterator/i);
  const close = iterator.return(undefined);
  control.reachHalted();
  await close;
  await pending;
});

test('inspection is synchronous, detached, and does not advance pending work', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const session = new AsyncRunnerSession(control);
  const iterator = session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const pending = iterator.next();
  const advancesBeforeInspection = control.advanceCount;

  const snapshot = session.captureExecutionSnapshot();

  expect(snapshot).toEqual({
    ...inspection,
    traversalLifecycleStatus: TraversalRunnerStatus.RUNNING,
    bufferedDeliveryEventCount: 0,
  });
  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(control.advanceCount).toBe(advancesBeforeInspection);
  const close = iterator.return(undefined);
  control.reachHalted();
  await close;
  await pending;
  expect(session.isSuspended()).toBe(true);
});

test('internal resume errors remain terminal with their exact thrown value', async () => {
  const control = new FakeAsyncSessionControl<string>();
  control.resume = () => {
    throw undefined;
  };
  const session = new AsyncRunnerSession(control);
  await expect(session.runUntilSuspendedOrTerminal()).rejects.toBeUndefined();
  expect(session.getTraversalLifecycleStatus()).toBe(TraversalRunnerStatus.FAILED);
  expect(session.getTraversalStopReason()).toBe('failed');
  expect(session.captureExecutionSnapshot().traversalStopReason).toBe('failed');
  await expect(
    session.runUntilSuspendedOrTerminal({ admittedVisitorCallbackPhases: { include: ['ON_WORK_READY'] } }),
  ).rejects.toBeUndefined();
  await expect(session.runUntilSuspendedOrTerminal()).rejects.toBeUndefined();
});
