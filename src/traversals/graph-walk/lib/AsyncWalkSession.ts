import type { GraphWalkEvent } from '../GraphWalkEvent';
import { GraphWalkObservationKind } from '../GraphWalkPhase';
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
  config: TraversalIterableConfigInput<GraphWalkObservationKind> | undefined;
  demand: Waiter<Event>[];
  closes: (Waiter<never> & { consumerError: { error: unknown } | null })[];
};
const done = Object.freeze({ done: true as const, value: undefined });

/** Executes one kernel request at a time; demand never drives past a delivery. */
export class AsyncWalkSession<VertexData, EdgeData, VertexId> {
  private owner: Lease<GraphWalkEvent<VertexData, EdgeData, VertexId>> | null =
    null;
  private readonly wakeup = new Wakeup();
  private pauseRequested = false;
  private terminalClose: Promise<void> | null = null;
  constructor(
    private readonly kernel: WalkKernel<VertexData, EdgeData, VertexId>,
  ) {}

  closeTerminal(): Promise<void> {
    if (this.terminalClose !== null) return this.terminalClose;
    if (this.owner !== null)
      return Promise.reject(
        new Error('Graph walk already has an execution owner'),
      );
    this.kernel.beginClose();
    this.terminalClose =
      this.runAndIterateObservationEventsUntilSuspendedOrTerminal()
        .next()
        .then(() => undefined);
    return this.terminalClose;
  }
  requestPauseAfterAdmittedCallbacksDrain(): boolean {
    const requested = this.kernel.requestPauseAfterAdmittedCallbacksDrain();
    if (requested) {
      this.pauseRequested = true;
      this.wakeup.notify();
    }
    return requested;
  }
  runAndIterateObservationEventsUntilSuspendedOrTerminal(
    config?: TraversalIterableConfigInput<GraphWalkObservationKind>,
  ): AsyncGenerator<
    GraphWalkEvent<VertexData, EdgeData, VertexId>,
    void,
    unknown
  > {
    const lease: Lease<GraphWalkEvent<VertexData, EdgeData, VertexId>> = {
      phase: 'unopened',
      config:
        config === undefined
          ? undefined
          : detachTraversalExecutionOptions(
              [
                GraphWalkObservationKind.VERTEX_OCCURRENCE,
                GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE,
                GraphWalkObservationKind.ROUTE_PREFIX,
              ],
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
    lease: Lease<GraphWalkEvent<VertexData, EdgeData, VertexId>>,
  ): Promise<
    IteratorResult<GraphWalkEvent<VertexData, EdgeData, VertexId>, void>
  > {
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
      IteratorResult<GraphWalkEvent<VertexData, EdgeData, VertexId>, void>
    >((resolve, reject) => {
      lease.demand.push({ resolve, reject });
    });
    this.wakeup.notify();
    return promise;
  }
  private close(
    lease: Lease<GraphWalkEvent<VertexData, EdgeData, VertexId>>,
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
    this.requestPauseAfterAdmittedCallbacksDrain();
    this.wakeup.notify();
    return promise;
  }
  private async pump(
    lease: Lease<GraphWalkEvent<VertexData, EdgeData, VertexId>>,
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
        void captureOutcome(action.invoke).then((terminalOutcome) => {
          this.kernel.submit(
            action.runnerLocalInvocationRequestId,
            terminalOutcome,
          );
          this.wakeup.notify();
        });
      } else if (action.kind === 'WAIT') {
        await this.wakeup.wait();
      } else if (action.kind === 'OBSERVATION') {
        const event = this.kernel.shouldEmit(action.observationKind)
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
