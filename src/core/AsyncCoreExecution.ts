import type { CoreInspection } from '@core/CoreInspection';
import type { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';
import type { VisitOrder } from '@core/effects/types';

export interface AsyncCoreExecution<E> {
  getStatus(): TraversalRunnerStatus;
  isHalted(): boolean;
  inspect(): CoreInspection;
  getIterable(
    config?: TraversalIterableConfigInput<VisitOrder>,
  ): AsyncGenerator<E, void, unknown>;
  run(config?: TraversalIterableConfigInput<VisitOrder>): Promise<this>;
}
