import type { DriverInspection } from '../src/core/CoreInspection';
import type { TraversalRunnerIterableConfig } from '../src/core/TraversalRunnerIterableConfig';
import {
  TraversalRunnerStatus,
} from '../src/core/TraversalRunner';
import type { VisitOrder } from '../src/core/effects/types';
import type {
  AsyncSessionControl,
  SessionProgress,
} from '../src/core/kernelTypes';
import { AsyncRunnerSession } from '../src/core/drivers/AsyncRunnerSession';
import { Wakeup } from '../src/core/drivers/Wakeup';

const inspection: DriverInspection = Object.freeze({
  status: TraversalRunnerStatus.INITIAL,
  haltRequested: false,
  kind: 'depth-first',
  execution: 'async',
  sourceMode: 'tree',
  concurrency: 2,
  hasSorter: false,
  hasHintIds: false,
  iterableConfig: Object.freeze({
    iterateOver: Object.freeze<VisitOrder[]>([]),
    enableVisitorFunctionsFor: null,
    disableVisitorFunctionsFor: null,
  }),
  readyVisits: Object.freeze([]),
  frames: Object.freeze([]),
  chains: Object.freeze([]),
  pendingRequests: Object.freeze([]),
  pendingEventBoundaryCount: 0,
  inFlightCallbackCount: 1,
});

class FakeAsyncSessionControl<E> implements AsyncSessionControl<E> {
  public haltRequested = false;
  public readonly modes: string[] = [];
  public readonly acknowledged: number[] = [];
  public readonly resumedWith: (
    | Partial<TraversalRunnerIterableConfig<VisitOrder>>
    | undefined
  )[] = [];
  public advanceCount = 0;
  private readonly wakeup = new Wakeup();
  private readonly actions: SessionProgress<E>[] = [];
  private readonly outstandingBoundaries = new Set<number>();
  private status = TraversalRunnerStatus.INITIAL;
  private failure: { error: unknown } | null = null;

  public advance(mode: 'drive' | 'settle' | 'drain'): SessionProgress<E> {
    this.advanceCount += 1;
    this.modes.push(mode);
    if (this.failure !== null) {
      return { kind: 'FAILED', error: this.failure.error };
    }
    if (this.status === TraversalRunnerStatus.HALTED) return { kind: 'HALTED' };
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
    if (action.kind === 'FINISHED') this.status = TraversalRunnerStatus.FINISHED;
    if (action.kind === 'HALTED') this.status = TraversalRunnerStatus.HALTED;
    if (action.kind === 'FAILED') {
      this.status = TraversalRunnerStatus.FAILED;
      this.failure = { error: action.error };
    }
    return action;
  }

  public acknowledgeEvent(boundaryId: number): void {
    this.acknowledged.push(boundaryId);
    this.outstandingBoundaries.delete(boundaryId);
    this.wakeup.notify();
  }

  public requestHalt(): void {
    this.haltRequested = true;
    this.wakeup.notify();
  }

  public isHaltRequested(): boolean {
    return this.haltRequested;
  }

  public resume(
    config?: Partial<TraversalRunnerIterableConfig<VisitOrder>>,
  ): void {
    this.resumedWith.push(config);
    this.haltRequested = false;
    this.status = TraversalRunnerStatus.RUNNING;
    this.wakeup.notify();
  }

  public getStatus(): TraversalRunnerStatus {
    return this.status;
  }

  public getFailure(): { error: unknown } | null {
    return this.failure;
  }

  public inspect(): DriverInspection {
    return { ...inspection, status: this.status, haltRequested: this.haltRequested };
  }

  public waitForProgress(): Promise<void> {
    return this.wakeup.wait();
  }

  public enqueue(...actions: SessionProgress<E>[]): void {
    this.actions.push(...actions);
    this.wakeup.notify();
  }

  public reachHalted(): void {
    this.actions.push({ kind: 'HALTED' });
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

  const iterator = session.getIterable();
  const next = iterator.next();
  const close = iterator.return(undefined);
  expect(control.haltRequested).toBe(true);
  control.reachHalted();
  await expect(close).resolves.toEqual({ done: true, value: undefined });
  await expect(next).resolves.toEqual({ done: true, value: undefined });
});

test('creation and closing before first next do not touch the runner', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const iterator = new AsyncRunnerSession(control).getIterable();

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
  expect(control.haltRequested).toBe(false);
});

test('throw before first next rejects with the original consumer value', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const iterator = new AsyncRunnerSession(control).getIterable();

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
  const iterator = session.getIterable();

  await expect(iterator.next()).resolves.toEqual({ done: false, value: 'first' });
  expect(session.inspect().bufferedEventCount).toBe(1);
  expect(control.modes.slice(0, 3)).toEqual(['drive', 'settle', 'settle']);

  const second = iterator.next();
  const finished = iterator.next();
  control.enqueue({ kind: 'FINISHED' });
  await expect(second).resolves.toEqual({ done: false, value: 'second' });
  await expect(finished).resolves.toEqual({ done: true, value: undefined });
  expect(control.acknowledged).toEqual([10, 11]);
});

test('retains events buffered during close and acknowledges the delivered boundary on resume', async () => {
  const control = new FakeAsyncSessionControl<string>();
  control.enqueue({ kind: 'EVENT', event: 'delivered', boundaryId: 20 });
  const session = new AsyncRunnerSession(control);
  const firstIterator = session.getIterable();
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
  expect(session.inspect().bufferedEventCount).toBe(1);
  expect(control.acknowledged).toEqual([]);

  const secondIterator = session.getIterable();
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
  const owner = session.getIterable();
  const pending = owner.next();

  const firstClose = owner.return(undefined);
  const secondClose = owner.return(undefined);
  const contender = session.getIterable();
  await expect(contender.next()).rejects.toThrow(/active iterator/i);

  control.reachHalted();
  await expect(Promise.all([firstClose, secondClose])).resolves.toEqual([
    { done: true, value: undefined },
    { done: true, value: undefined },
  ]);
  await expect(pending).resolves.toEqual({ done: true, value: undefined });
  await expect(owner.next()).resolves.toEqual({ done: true, value: undefined });

  const resumed = session.getIterable();
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
  const iterator = session.getIterable();
  const pending = iterator.next();
  const consumerError = new Error('consumer failed');
  const traversalError = new Error('traversal failed');

  const thrown = iterator.throw(consumerError);
  const close = iterator.return(undefined);
  control.fail(traversalError);

  await expect(thrown).rejects.toBe(consumerError);
  await expect(close).rejects.toBe(traversalError);
  await expect(pending).rejects.toBe(traversalError);
  await expect(session.run()).rejects.toBe(traversalError);
});

test('consumer throw cleans up successfully without poisoning the resumable session', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const session = new AsyncRunnerSession(control);
  const iterator = session.getIterable();
  const pending = iterator.next();
  const consumerError = new Error('stop consuming');

  const thrown = iterator.throw(consumerError);
  control.reachHalted();
  await expect(thrown).rejects.toBe(consumerError);
  await expect(pending).resolves.toEqual({ done: true, value: undefined });

  const resumed = session.getIterable();
  const resumedNext = resumed.next();
  const close = resumed.return(undefined);
  control.reachHalted();
  await close;
  await resumedNext;
});

test('preserves an undefined traversal failure through close and later execution', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const session = new AsyncRunnerSession(control);
  const iterator = session.getIterable();
  const pending = iterator.next();
  const close = iterator.return(undefined);

  control.fail(undefined);
  await expect(close).rejects.toBeUndefined();
  await expect(pending).rejects.toBeUndefined();
  await expect(session.run()).rejects.toBeUndefined();
});

test('run drains the session iterator, returns itself, and applies its config', async () => {
  const control = new FakeAsyncSessionControl<string>();
  control.enqueue(
    { kind: 'EVENT', event: 'ignored', boundaryId: 30 },
    { kind: 'FINISHED' },
  );
  const session = new AsyncRunnerSession(control);
  const config = { iterateOver: ['PRE_ORDER' as const] };

  await expect(session.run(config)).resolves.toBe(session);
  expect(control.resumedWith).toEqual([config]);
  expect(control.acknowledged).toEqual([30]);
  expect(session.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(session.isHalted()).toBe(false);
  await expect(session.getIterable().next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
});

test('run uses the iterator halt path when execution requests a halt', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const session = new AsyncRunnerSession(control);
  const running = session.run();

  control.requestHalt();
  control.reachHalted();
  await expect(running).resolves.toBe(session);
  expect(control.modes).toContain('drain');
  expect(session.isHalted()).toBe(true);
});

test('run rejects while another iterator owns execution', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const session = new AsyncRunnerSession(control);
  const iterator = session.getIterable();
  const pending = iterator.next();

  await expect(session.run()).rejects.toThrow(/active iterator/i);
  const close = iterator.return(undefined);
  control.reachHalted();
  await close;
  await pending;
});

test('inspection is synchronous, detached, and does not advance pending work', async () => {
  const control = new FakeAsyncSessionControl<string>();
  const session = new AsyncRunnerSession(control);
  const iterator = session.getIterable();
  const pending = iterator.next();
  const advancesBeforeInspection = control.advanceCount;

  const snapshot = session.inspect();

  expect(snapshot).toEqual({
    ...inspection,
    status: TraversalRunnerStatus.RUNNING,
    bufferedEventCount: 0,
  });
  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(control.advanceCount).toBe(advancesBeforeInspection);
  const close = iterator.return(undefined);
  control.reachHalted();
  await close;
  await pending;
  expect(session.isHalted()).toBe(true);
});
