import type { GraphWalkEvent } from '../GraphWalkEvent';
import type { GraphWalkObservationKind } from '../GraphWalkPhase';
import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';
import { detachTraversalExecutionOptions } from '@core/normalizeTraversalExecutionOptions';
import { GraphWalkObservationKind as ObservationKind } from '../GraphWalkPhase';
import type { WalkKernel } from './WalkKernel';
import { rejectThenable } from './rejectThenable';

export class SyncWalkSession<VertexData, EdgeData, VertexId> {
  private owner: symbol | null = null;
  constructor(
    private readonly kernel: WalkKernel<VertexData, EdgeData, VertexId>,
  ) {}
  close(): void {
    if (this.owner !== null)
      throw new Error('Graph walk already has an execution owner');
    this.kernel.beginClose();
    this.runAndIterateObservationEventsUntilSuspendedOrTerminal().next();
  }
  runAndIterateObservationEventsUntilSuspendedOrTerminal(
    config?: TraversalIterableConfigInput<GraphWalkObservationKind>,
  ): Generator<GraphWalkEvent<VertexData, EdgeData, VertexId>, void, unknown> {
    const patch =
      config === undefined
        ? undefined
        : detachTraversalExecutionOptions(
            [
              ObservationKind.VERTEX_OCCURRENCE,
              ObservationKind.ADMITTED_EDGE_OCCURRENCE,
              ObservationKind.ROUTE_PREFIX,
            ],
            config,
          );
    return this.iterate(patch);
  }
  private *iterate(
    config?: TraversalIterableConfigInput<GraphWalkObservationKind>,
  ): Generator<GraphWalkEvent<VertexData, EdgeData, VertexId>, void, unknown> {
    if (this.owner !== null)
      throw new Error('Graph walk already has an execution owner');
    this.kernel.resume(config);
    // Acquisition occurs on first next(), so returning an unstarted iterator
    // cannot pause or release another lease. Competing execution fails above
    // before configuration or the current lease is changed.
    this.owner = Symbol('synchronous walking iterator lease');
    try {
      for (;;) {
        const action = this.kernel.poll();
        if (action.kind === 'CALL') {
          let terminalOutcome;
          try {
            const value = action.invoke();
            rejectThenable(value);
            terminalOutcome = { ok: true as const, value };
          } catch (error) {
            terminalOutcome = { ok: false as const, error };
          }
          this.kernel.submit(
            action.runnerLocalInvocationRequestId,
            terminalOutcome,
          );
        } else if (action.kind === 'OBSERVATION') {
          const event = this.kernel.shouldEmit(action.observationKind)
            ? action.event()
            : null;
          this.kernel.acknowledgeObservation(action.boundaryId);
          if (event !== null) yield event;
        } else if (action.kind === 'FAILED') throw action.error;
        else if (action.kind === 'WAIT')
          throw new Error('Synchronous graph walking has an unsettled request');
        else return;
      }
    } finally {
      this.owner = null;
      this.kernel.requestPauseAfterAdmittedCallbacksDrain();
      this.kernel.poll();
    }
  }
}
