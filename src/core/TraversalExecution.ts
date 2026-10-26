import type { ExecutionInspection } from '@core/ExecutionInspection';
import type { CoreInspection } from '@core/CoreInspection';
import type {
  TraversalRunnerStatus,
  TraversalStopReason,
} from '@core/TraversalRunner';
import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';

/** Observational state and a cooperative pause request, independent of ownership. */
export interface TraversalExecutionState<
  Inspection extends ExecutionInspection = CoreInspection,
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
  Inspection extends ExecutionInspection = CoreInspection,
  EmittedKind extends string = Phase,
> extends TraversalExecutionState<Inspection> {
  // Function properties preserve contravariance: a family cannot be widened to
  // accept phases which its concrete runner does not support.
  iterateEvents: (
    config?: TraversalIterableConfigInput<Phase, EmittedKind>,
  ) => Generator<Event, void, unknown>;
  run: (config?: TraversalIterableConfigInput<Phase, EmittedKind>) => this;
}

export interface AsyncTraversalExecution<
  Phase extends string,
  Event,
  Inspection extends ExecutionInspection = CoreInspection,
  EmittedKind extends string = Phase,
> extends TraversalExecutionState<Inspection> {
  iterateEvents: (
    config?: TraversalIterableConfigInput<Phase, EmittedKind>,
  ) => AsyncGenerator<Event, void, unknown>;
  run: (
    config?: TraversalIterableConfigInput<Phase, EmittedKind>,
  ) => Promise<this>;
}
