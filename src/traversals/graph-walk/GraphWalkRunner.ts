import type { SyncTraversalExecution } from '@core/TraversalExecution';
import type { TraversalExecutionOptions } from '@core/TraversalRunnerIterableConfig';
import type { GraphWalkEvent, GraphWalkEventFor } from './GraphWalkEvent';
import type { GraphWalkPhase } from './GraphWalkPhase';
import type { GraphWalkInspection } from './lib/GraphWalkInspection';
import type { GraphWalkSummary } from './lib/GraphWalkSummary';
import type { GraphWalkResolvedOptions } from './lib/normalizeWalkOptions';
import { SyncWalkSession } from './lib/SyncWalkSession';
import { WalkKernel } from './lib/WalkKernel';

export interface GraphWalkRunner<Data, Edge, ID>
  extends SyncTraversalExecution<
    GraphWalkPhase,
    GraphWalkEvent<Data, Edge, ID>,
    GraphWalkInspection,
    `${GraphWalkPhase}`
  > {
  iterateEvents: {
    <Phase extends `${GraphWalkPhase}`>(
      config: TraversalExecutionOptions<GraphWalkPhase, Phase> & {
        emitEvents: readonly Phase[];
      },
    ): Generator<GraphWalkEventFor<Data, Edge, Phase, ID>, void, unknown>;
    (config?: TraversalExecutionOptions<GraphWalkPhase>): Generator<
      GraphWalkEvent<Data, Edge, ID>,
      void,
      unknown
    >;
  };
  close(): void;
  summary(): GraphWalkSummary;
}

export class InternalGraphWalkRunner<Data, Edge, ID>
  implements
    SyncTraversalExecution<
      GraphWalkPhase,
      GraphWalkEvent<Data, Edge, ID>,
      GraphWalkInspection,
      `${GraphWalkPhase}`
    >
{
  private readonly kernel: WalkKernel<Data, Edge, ID>;
  private readonly session: SyncWalkSession<Data, Edge, ID>;
  constructor(options: GraphWalkResolvedOptions<Data, Edge, ID>) {
    this.kernel = new WalkKernel(options);
    this.session = new SyncWalkSession(this.kernel);
  }
  iterateEvents: {
    <Phase extends `${GraphWalkPhase}`>(
      config: TraversalExecutionOptions<GraphWalkPhase, Phase> & {
        emitEvents: readonly Phase[];
      },
    ): Generator<GraphWalkEventFor<Data, Edge, Phase, ID>, void, unknown>;
    (config?: TraversalExecutionOptions<GraphWalkPhase>): Generator<
      GraphWalkEvent<Data, Edge, ID>,
      void,
      unknown
    >;
  } = <Phase extends `${GraphWalkPhase}`>(
    config?: TraversalExecutionOptions<GraphWalkPhase>,
  ) =>
    this.session.iterateEvents(config) as Generator<
      GraphWalkEventFor<Data, Edge, Phase, ID>,
      void,
      unknown
    >;
  run = (config?: TraversalExecutionOptions<GraphWalkPhase>): this => {
    for (const _event of this.iterateEvents(config)) {
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
