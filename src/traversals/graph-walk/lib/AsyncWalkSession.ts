import type { GraphWalkEvent } from '../GraphWalkEvent';
import { GraphWalkPhase } from '../GraphWalkPhase';
import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';
import { detachTraversalExecutionOptions } from '@core/normalizeTraversalExecutionOptions';
import { captureOutcome } from '@core/drivers/captureOutcome';
import { Wakeup } from '@core/drivers/Wakeup';
import type { WalkKernel } from './WalkKernel';

type Waiter<Event> = {
  resolve: (result: IteratorResult<Event, void>) => void;
  reject: (error: unknown) => void;
};
type Lease<Event> = {
  phase: 'unopened' | 'active' | 'closing' | 'closed';
  config: TraversalIterableConfigInput<GraphWalkPhase> | undefined;
  demand: Waiter<Event>[];
  closes: (Waiter<never> & { consumerError: { error: unknown } | null })[];
};
const done = Object.freeze({ done: true as const, value: undefined });

/** Executes one kernel request at a time; demand never drives past a delivery. */
export class AsyncWalkSession<Data, Edge, ID> {
  private owner: Lease<GraphWalkEvent<Data, Edge, ID>> | null = null;
  private readonly wakeup = new Wakeup();
  private pauseRequested = false;
  constructor(private readonly kernel: WalkKernel<Data, Edge, ID>) {}

  requestPause(): boolean {
    const requested = this.kernel.requestPause();
    if (requested) {
      this.pauseRequested = true;
      this.wakeup.notify();
    }
    return requested;
  }
  getIterable(
    config?: TraversalIterableConfigInput<GraphWalkPhase>,
  ): AsyncGenerator<GraphWalkEvent<Data, Edge, ID>, void, unknown> {
    const lease: Lease<GraphWalkEvent<Data, Edge, ID>> = {
      phase: 'unopened',
      config:
        config === undefined
          ? undefined
          : detachTraversalExecutionOptions(
              [GraphWalkPhase.VERTEX, GraphWalkPhase.EDGE, GraphWalkPhase.PATH],
              config,
            ),
      demand: [],
      closes: [],
    };
    return {
      next: () => this.next(lease),
      return: () => this.close(lease, null),
      throw: (error?: unknown) => this.close(lease, { error }),
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }
  private async next(
    lease: Lease<GraphWalkEvent<Data, Edge, ID>>,
  ): Promise<IteratorResult<GraphWalkEvent<Data, Edge, ID>, void>> {
    if (lease.phase === 'closed') return Promise.resolve(done);
    if (lease.phase === 'unopened') {
      if (this.owner !== null) {
        lease.phase = 'closed';
        return Promise.reject(
          new Error('Graph walk already has an execution owner'),
        );
      }
      // Selectors were detached and validated when this iterator was created.
      this.kernel.resume(lease.config);
      lease.phase = 'active';
      this.owner = lease;
      this.pauseRequested = false;
      void this.pump(lease);
    }
    const promise = new Promise<
      IteratorResult<GraphWalkEvent<Data, Edge, ID>, void>
    >((resolve, reject) => {
      lease.demand.push({ resolve, reject });
    });
    this.wakeup.notify();
    return promise;
  }
  private close(
    lease: Lease<GraphWalkEvent<Data, Edge, ID>>,
    consumerError: { error: unknown } | null,
  ): Promise<IteratorResult<never, void>> {
    if (lease.phase === 'unopened' || lease.phase === 'closed') {
      lease.phase = 'closed';
      return consumerError === null
        ? Promise.resolve(done)
        : Promise.reject(consumerError.error);
    }
    const promise = new Promise<IteratorResult<never, void>>(
      (resolve, reject) => {
        lease.closes.push({ resolve, reject, consumerError });
      },
    );
    lease.phase = 'closing';
    this.requestPause();
    this.wakeup.notify();
    return promise;
  }
  private async pump(
    lease: Lease<GraphWalkEvent<Data, Edge, ID>>,
  ): Promise<void> {
    for (;;) {
      if (
        lease.phase === 'active' &&
        lease.demand.length === 0 &&
        !this.pauseRequested
      ) {
        await this.wakeup.wait();
        continue;
      }
      const action = this.kernel.poll(lease.phase === 'closing');
      if (action.kind === 'CALL') {
        // captureOutcome observes rejection as soon as caller code is admitted.
        void captureOutcome(action.invoke).then((outcome) => {
          this.kernel.submit(action.requestId, outcome);
          this.wakeup.notify();
        });
      } else if (action.kind === 'WAIT') {
        await this.wakeup.wait();
      } else if (action.kind === 'OBSERVATION') {
        const event = this.kernel.shouldEmit(action.phase)
          ? action.event()
          : null;
        this.kernel.acknowledgeObservation(action.boundaryId);
        if (event !== null)
          lease.demand.shift()!.resolve({ done: false, value: event });
      } else {
        const failure =
          action.kind === 'FAILED' ? { error: action.error } : null;
        for (const waiter of lease.demand.splice(0)) {
          if (failure === null) waiter.resolve(done);
          else waiter.reject(failure.error);
        }
        for (const waiter of lease.closes.splice(0)) {
          const error = waiter.consumerError ?? failure;
          if (error === null) waiter.resolve(done);
          else waiter.reject(error.error);
        }
        lease.phase = 'closed';
        this.owner = null;
        return;
      }
    }
  }
}
