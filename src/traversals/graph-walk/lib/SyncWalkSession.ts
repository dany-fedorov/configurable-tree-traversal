import type { GraphWalkEvent } from '../GraphWalkEvent';
import type { GraphWalkPhase } from '../GraphWalkPhase';
import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';
import { detachTraversalExecutionOptions } from '@core/normalizeTraversalExecutionOptions';
import { GraphWalkPhase as Phase } from '../GraphWalkPhase';
import type { WalkKernel } from './WalkKernel';
import { rejectThenable } from './rejectThenable';

export class SyncWalkSession<Data, Edge, ID> {
  private owned = false;
  constructor(private readonly kernel: WalkKernel<Data, Edge, ID>) {}
  getIterable(
    config?: TraversalIterableConfigInput<GraphWalkPhase>,
  ): Generator<GraphWalkEvent<Data, Edge, ID>, void, unknown> {
    const patch =
      config === undefined
        ? undefined
        : detachTraversalExecutionOptions(
            [Phase.VERTEX, Phase.EDGE, Phase.PATH],
            config,
          );
    return this.iterate(patch);
  }
  private *iterate(
    config?: TraversalIterableConfigInput<GraphWalkPhase>,
  ): Generator<GraphWalkEvent<Data, Edge, ID>, void, unknown> {
    if (this.owned)
      throw new Error('Graph walk already has an execution owner');
    this.kernel.resume(config);
    this.owned = true;
    try {
      for (;;) {
        const action = this.kernel.poll();
        if (action.kind === 'CALL') {
          let outcome;
          try {
            const value = action.invoke();
            rejectThenable(value);
            outcome = { ok: true as const, value };
          } catch (error) {
            outcome = { ok: false as const, error };
          }
          this.kernel.submit(action.requestId, outcome);
        } else if (action.kind === 'OBSERVATION') {
          const event = this.kernel.shouldEmit(action.phase)
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
      this.owned = false;
      this.kernel.requestPause();
      this.kernel.poll();
    }
  }
}
