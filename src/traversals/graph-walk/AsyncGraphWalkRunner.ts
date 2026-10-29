import type { AsyncTraversalExecution } from '@core/TraversalExecution';
import type { TraversalExecutionOptions } from '@core/TraversalRunnerIterableConfig';
import type { GraphWalkEvent, GraphWalkEventFor } from './GraphWalkEvent';
import type { GraphWalkPhase } from './GraphWalkPhase';
import { AsyncWalkSession } from './lib/AsyncWalkSession';
import type { GraphWalkInspection } from './lib/GraphWalkInspection';
import type { GraphWalkSummary } from './lib/GraphWalkSummary';
import type { GraphWalkResolvedOptions } from './lib/normalizeWalkOptions';
import { WalkKernel } from './lib/WalkKernel';

export interface AsyncGraphWalkRunner<Data, Edge, ID>
  extends AsyncTraversalExecution<
    GraphWalkPhase,
    GraphWalkEvent<Data, Edge, ID>,
    GraphWalkInspection,
    `${GraphWalkPhase}`
  > {
  iterateEvents: {
    (): AsyncGenerator<GraphWalkEvent<Data, Edge, ID>, void, unknown>;
    <Phase extends `${GraphWalkPhase}`>(
      config: TraversalExecutionOptions<GraphWalkPhase, Phase> & {
        emitEvents: readonly Phase[];
      },
    ): AsyncGenerator<GraphWalkEventFor<Data, Edge, Phase, ID>, void, unknown>;
    (config?: TraversalExecutionOptions<GraphWalkPhase>): AsyncGenerator<
      GraphWalkEvent<Data, Edge, ID>,
      void,
      unknown
    >;
  };
  close(): Promise<void>;
  summary(): GraphWalkSummary;
}

export class InternalAsyncGraphWalkRunner<Data, Edge, ID>
  implements
    AsyncTraversalExecution<
      GraphWalkPhase,
      GraphWalkEvent<Data, Edge, ID>,
      GraphWalkInspection,
      `${GraphWalkPhase}`
    >
{
  private readonly kernel: WalkKernel<Data, Edge, ID>;
  private readonly session: AsyncWalkSession<Data, Edge, ID>;
  constructor(options: GraphWalkResolvedOptions<Data, Edge, ID>) {
    this.kernel = new WalkKernel(options, 'async');
    this.session = new AsyncWalkSession(this.kernel);
  }
  iterateEvents: {
    (): AsyncGenerator<GraphWalkEvent<Data, Edge, ID>, void, unknown>;
    <Phase extends `${GraphWalkPhase}`>(
      config: TraversalExecutionOptions<GraphWalkPhase, Phase> & {
        emitEvents: readonly Phase[];
      },
    ): AsyncGenerator<GraphWalkEventFor<Data, Edge, Phase, ID>, void, unknown>;
    (config?: TraversalExecutionOptions<GraphWalkPhase>): AsyncGenerator<
      GraphWalkEvent<Data, Edge, ID>,
      void,
      unknown
    >;
  } = <Phase extends `${GraphWalkPhase}`>(
    config?: TraversalExecutionOptions<GraphWalkPhase>,
  ) =>
    this.session.iterateEvents(config) as AsyncGenerator<
      GraphWalkEventFor<Data, Edge, Phase, ID>,
      void,
      unknown
    >;
  run = async (
    config?: TraversalExecutionOptions<GraphWalkPhase>,
  ): Promise<this> => {
    for await (const _event of this.iterateEvents(config)) {
      /* Drive observations to exhaustion. */
    }
    return this;
  };
  close() {
    return this.session.closeTerminal();
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
    return this.session.requestPause();
  }
  summary() {
    return this.kernel.summary();
  }
  inspect() {
    return this.kernel.inspect();
  }
}
