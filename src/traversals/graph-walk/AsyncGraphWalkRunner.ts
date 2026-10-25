import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';
import type { AsyncTraversalExecution } from '@core/TraversalExecution';
import type { GraphWalkEvent, GraphWalkEventFor } from './GraphWalkEvent';
import type { GraphWalkPhase } from './GraphWalkPhase';
import type { GraphWalkInspection } from './lib/GraphWalkInspection';
import type { NormalizedWalkOptions } from './lib/normalizeWalkOptions';
import { WalkKernel } from './lib/WalkKernel';
import { AsyncWalkSession } from './lib/AsyncWalkSession';

export class AsyncGraphWalkRunner<Data, Edge, ID>
  implements
    AsyncTraversalExecution<
      GraphWalkPhase,
      GraphWalkEvent<Data, Edge, ID>,
      GraphWalkInspection
    >
{
  private readonly kernel: WalkKernel<Data, Edge, ID>;
  private readonly session: AsyncWalkSession<Data, Edge, ID>;
  constructor(options: NormalizedWalkOptions<Data, Edge, ID>) {
    this.kernel = new WalkKernel(options, 'async');
    this.session = new AsyncWalkSession(this.kernel);
  }
  getIterable: {
    <Phase extends GraphWalkPhase>(
      config: TraversalIterableConfigInput<GraphWalkPhase> & {
        emitPhases: readonly Phase[];
      },
    ): AsyncGenerator<GraphWalkEventFor<Data, Edge, Phase, ID>, void, unknown>;
    (config?: TraversalIterableConfigInput<GraphWalkPhase>): AsyncGenerator<
      GraphWalkEvent<Data, Edge, ID>,
      void,
      unknown
    >;
  } = <Phase extends GraphWalkPhase>(
    config?: TraversalIterableConfigInput<GraphWalkPhase>,
  ) =>
    this.session.getIterable(config) as AsyncGenerator<
      GraphWalkEventFor<Data, Edge, Phase, ID>,
      void,
      unknown
    >;
  run = async (
    config?: TraversalIterableConfigInput<GraphWalkPhase>,
  ): Promise<this> => {
    for await (const _event of this.getIterable(config)) {
      /* Drive observations to exhaustion. */
    }
    return this;
  };
  getStatus() {
    return this.kernel.getStatus();
  }
  getStopReason() {
    return this.kernel.getStopReason();
  }
  isHalted() {
    return this.kernel.isHalted();
  }
  requestPause() {
    return this.session.requestPause();
  }
  summary() {
    return this.kernel.summary();
  }
  inspect() {
    return this.kernel.inspect();
  }
}
