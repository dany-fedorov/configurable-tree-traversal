import type { CoreInspection } from '@core/CoreInspection';
import type {
  TraversalRunnerStatus,
  TraversalStopReason,
} from '@core/TraversalRunner';
import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';

/** Observational state and a cooperative pause request, independent of ownership. */
export interface TraversalExecutionState {
  getStatus(): TraversalRunnerStatus;
  getStopReason(): TraversalStopReason | null;
  isHalted(): boolean;
  inspect(): CoreInspection;
  /** Records a new request only while RUNNING; the owner drives the safe boundary. */
  requestPause(): boolean;
}

export interface SyncTraversalExecution<Phase extends string, Event>
  extends TraversalExecutionState {
  // Function properties preserve contravariance: a family cannot be widened to
  // accept phases which its concrete runner does not support.
  getIterable: (
    config?: TraversalIterableConfigInput<Phase>,
  ) => Generator<Event, void, unknown>;
  run: (config?: TraversalIterableConfigInput<Phase>) => this;
}

export interface AsyncTraversalExecution<Phase extends string, Event>
  extends TraversalExecutionState {
  getIterable: (
    config?: TraversalIterableConfigInput<Phase>,
  ) => AsyncGenerator<Event, void, unknown>;
  run: (config?: TraversalIterableConfigInput<Phase>) => Promise<this>;
}
