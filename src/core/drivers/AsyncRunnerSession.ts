import type { AsyncCoreExecution } from '@core/AsyncCoreExecution';
import type { CoreInspection } from '@core/CoreInspection';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { TraversalRunnerIterableConfig } from '@core/TraversalRunnerIterableConfig';
import type { PumpMode, VisitOrder } from '@core/effects/types';
import type { AsyncSessionControl } from '@core/kernelTypes';

type NextWaiter<E> = {
  resolve: (result: IteratorResult<E, void>) => void;
  reject: (error: unknown) => void;
};

type CloseWaiter = {
  consumerError: { error: unknown } | null;
  resolve: (result: IteratorResult<never, void>) => void;
  reject: (error: unknown) => void;
};

type IteratorState<E> = {
  phase: 'unopened' | 'active' | 'closing' | 'closed';
  config: Partial<TraversalRunnerIterableConfig<VisitOrder>> | undefined;
  nextWaiters: NextWaiter<E>[];
  closeWaiters: CloseWaiter[];
};

type BufferedEvent<E> = { event: E; boundaryId: number };

const done = Object.freeze({ done: true, value: undefined }) as IteratorResult<
  never,
  void
>;

export class AsyncRunnerSession<E> implements AsyncCoreExecution<E> {
  private readonly bufferedEvents: BufferedEvent<E>[] = [];
  private activeIterator: IteratorState<E> | null = null;
  private deliveredBoundaryId: number | null = null;
  private pumping = false;

  public constructor(private readonly control: AsyncSessionControl<E>) {}

  public getStatus(): TraversalRunnerStatus {
    return this.control.getStatus();
  }

  public isHalted(): boolean {
    return this.getStatus() === TraversalRunnerStatus.HALTED;
  }

  public inspect(): CoreInspection {
    return Object.freeze({
      ...this.control.inspect(),
      bufferedEventCount: this.bufferedEvents.length,
    });
  }

  public getIterable(
    config?: Partial<TraversalRunnerIterableConfig<VisitOrder>>,
  ): AsyncGenerator<E, void, unknown> {
    const state: IteratorState<E> = {
      phase: 'unopened',
      config,
      nextWaiters: [],
      closeWaiters: [],
    };
    const iterator: AsyncGenerator<E, void, unknown> = {
      next: () => this.next(state),
      return: () => this.close(state, null),
      throw: (error?: unknown) => this.close(state, { error }),
      [Symbol.asyncIterator]() {
        return this;
      },
    };
    return iterator;
  }

  public async run(
    config?: Partial<TraversalRunnerIterableConfig<VisitOrder>>,
  ): Promise<this> {
    const iterator = this.getIterable(config);
    while (!(await iterator.next()).done) {
      // Draining through next() preserves the same lease and boundaries as consumers.
    }
    return this;
  }

  private next(state: IteratorState<E>): Promise<IteratorResult<E, void>> {
    if (state.phase === 'closed') return Promise.resolve(done);
    if (state.phase === 'unopened') {
      if (this.activeIterator !== null) {
        state.phase = 'closed';
        return Promise.reject(new Error('Another active iterator owns execution'));
      }
      state.phase = 'active';
      this.activeIterator = state;
      const failure = this.control.getFailure();
      if (failure !== null) {
        this.release(state);
        return Promise.reject(failure.error);
      }
      if (this.control.getStatus() === TraversalRunnerStatus.FINISHED) {
        this.release(state);
        return Promise.resolve(done);
      }
      this.control.resume(state.config);
    }

    if (state.phase === 'active') this.acknowledgeDeliveredBoundary();
    const promise = new Promise<IteratorResult<E, void>>((resolve, reject) => {
      state.nextWaiters.push({ resolve, reject });
    });
    this.requestPump();
    return promise;
  }

  private close(
    state: IteratorState<E>,
    consumerError: { error: unknown } | null,
  ): Promise<IteratorResult<never, void>> {
    if (state.phase === 'unopened' || state.phase === 'closed') {
      state.phase = 'closed';
      return consumerError === null
        ? Promise.resolve(done)
        : Promise.reject(consumerError.error);
    }

    const promise = new Promise<IteratorResult<never, void>>(
      (resolve, reject) => {
        state.closeWaiters.push({ consumerError, resolve, reject });
      },
    );
    if (state.phase === 'active') {
      state.phase = 'closing';
      this.control.requestHalt();
    }
    this.requestPump();
    return promise;
  }

  private acknowledgeDeliveredBoundary(): void {
    if (this.deliveredBoundaryId === null) return;
    this.control.acknowledgeEvent(this.deliveredBoundaryId);
    this.deliveredBoundaryId = null;
  }

  private deliverBufferedEvents(state: IteratorState<E>): void {
    while (
      state.phase === 'active' &&
      state.nextWaiters.length > 0 &&
      this.bufferedEvents.length > 0
    ) {
      this.acknowledgeDeliveredBoundary();
      const waiter = state.nextWaiters.shift()!;
      const buffered = this.bufferedEvents.shift()!;
      this.deliveredBoundaryId = buffered.boundaryId;
      waiter.resolve({ done: false, value: buffered.event });
      if (state.nextWaiters.length > 0) this.acknowledgeDeliveredBoundary();
    }
  }

  private requestPump(): void {
    if (!this.pumping) void this.pump();
  }

  private async pump(): Promise<void> {
    this.pumping = true;
    try {
      while (this.activeIterator !== null) {
        const state = this.activeIterator;
        this.deliverBufferedEvents(state);

        const mode: PumpMode =
          state.phase === 'closing' || this.control.isHaltRequested()
            ? 'drain'
            : state.nextWaiters.length > 0
            ? 'drive'
            : 'settle';
        const progress = this.control.advance(mode);
        if (progress.kind === 'EVENT') {
          this.bufferedEvents.push(progress);
          continue;
        }
        if (progress.kind === 'HALTED' || progress.kind === 'FINISHED') {
          this.complete(state);
          continue;
        }
        if (progress.kind === 'FAILED') {
          this.fail(state, progress.error);
          continue;
        }
        await this.control.waitForProgress();
      }
    } finally {
      this.pumping = false;
    }
  }

  private complete(state: IteratorState<E>): void {
    for (const waiter of state.nextWaiters.splice(0)) waiter.resolve(done);
    for (const waiter of state.closeWaiters.splice(0)) {
      if (waiter.consumerError === null) waiter.resolve(done);
      else waiter.reject(waiter.consumerError.error);
    }
    this.release(state);
  }

  private fail(state: IteratorState<E>, error: unknown): void {
    this.bufferedEvents.length = 0;
    for (const waiter of state.nextWaiters.splice(0)) waiter.reject(error);
    for (const waiter of state.closeWaiters.splice(0)) {
      if (waiter.consumerError === null) waiter.reject(error);
      else waiter.reject(waiter.consumerError.error);
    }
    this.release(state);
  }

  private release(state: IteratorState<E>): void {
    state.phase = 'closed';
    this.activeIterator = null;
  }
}
