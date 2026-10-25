import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';
import type { SyncTraversalExecution } from '@core/TraversalExecution';
import type { GraphWalkEvent, GraphWalkEventFor } from './GraphWalkEvent';
import type { GraphWalkPhase } from './GraphWalkPhase';
import type { GraphWalkInspection } from './lib/GraphWalkInspection';
import type { NormalizedWalkOptions } from './lib/normalizeWalkOptions';
import { WalkKernel } from './lib/WalkKernel';
import { SyncWalkSession } from './lib/SyncWalkSession';

export class GraphWalkRunner<Data, Edge, ID>
  implements
    SyncTraversalExecution<
      GraphWalkPhase,
      GraphWalkEvent<Data, Edge, ID>,
      GraphWalkInspection
    >
{
  private readonly kernel: WalkKernel<Data, Edge, ID>;
  private readonly session: SyncWalkSession<Data, Edge, ID>;
  constructor(options: NormalizedWalkOptions<Data, Edge, ID>) {
    this.kernel = new WalkKernel(options);
    this.session = new SyncWalkSession(this.kernel);
  }
  getIterable: {
    <Phase extends GraphWalkPhase>(
      config: TraversalIterableConfigInput<GraphWalkPhase> & {
        emitPhases: readonly Phase[];
      },
    ): Generator<GraphWalkEventFor<Data, Edge, Phase, ID>, void, unknown>;
    (config?: TraversalIterableConfigInput<GraphWalkPhase>): Generator<
      GraphWalkEvent<Data, Edge, ID>,
      void,
      unknown
    >;
  } = <Phase extends GraphWalkPhase>(
    config?: TraversalIterableConfigInput<GraphWalkPhase>,
  ) =>
    this.session.getIterable(config) as Generator<
      GraphWalkEventFor<Data, Edge, Phase, ID>,
      void,
      unknown
    >;
  run = (config?: TraversalIterableConfigInput<GraphWalkPhase>): this => {
    for (const _event of this.getIterable(config)) {
      /* Drive observations to exhaustion. */
    }
    return this;
  };
  close() {
    return this.session.close();
  }
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
    return this.kernel.requestPause();
  }
  summary() {
    return this.kernel.summary();
  }
  inspect() {
    return this.kernel.inspect();
  }
}
