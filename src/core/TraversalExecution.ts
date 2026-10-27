import type { ExecutionInspection } from '@core/ExecutionInspection';
import type {
  TraversalRunnerStatus,
  TraversalStopReason,
} from '@core/TraversalRunner';
import type {
  EmissionKind,
  TraversalExecutionOptions,
} from '@core/TraversalRunnerIterableConfig';

/** Observational state and a cooperative pause request, independent of ownership. */
export interface TraversalExecutionState<
  Inspection extends ExecutionInspection = ExecutionInspection,
> {
  getStatus(): TraversalRunnerStatus;
  getStopReason(): TraversalStopReason | null;
  isHalted(): boolean;
  inspect(): Inspection;
  /** Records a new request only while RUNNING; the owner drives the safe boundary. */
  requestPause(): boolean;
}

export interface SyncTraversalExecution<
  Phase extends string,
  Event,
  Inspection extends ExecutionInspection = ExecutionInspection,
  EmittedKind extends string = EmissionKind<Phase>,
> extends TraversalExecutionState<Inspection> {
  // Function properties preserve contravariance: a family cannot be widened to
  // accept phases which its concrete runner does not support.
  iterateEvents: (
    config?: TraversalExecutionOptions<Phase, EmittedKind>,
  ) => Generator<Event, void, unknown>;
  run: (config?: TraversalExecutionOptions<Phase, EmittedKind>) => this;
}

export interface AsyncTraversalExecution<
  Phase extends string,
  Event,
  Inspection extends ExecutionInspection = ExecutionInspection,
  EmittedKind extends string = EmissionKind<Phase>,
> extends TraversalExecutionState<Inspection> {
  iterateEvents: (
    config?: TraversalExecutionOptions<Phase, EmittedKind>,
  ) => AsyncGenerator<Event, void, unknown>;
  run: (
    config?: TraversalExecutionOptions<Phase, EmittedKind>,
  ) => Promise<this>;
}
