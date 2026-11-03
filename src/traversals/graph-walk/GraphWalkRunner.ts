import type { SyncTraversalExecution } from '@core/TraversalExecution';
import type { TraversalExecutionSelectionPatch } from '@core/TraversalRunnerIterableConfig';
import type {
  GraphWalkEvent,
  GraphWalkEventForObservationKind,
} from './GraphWalkEvent';
import type { GraphWalkObservationKind } from './GraphWalkPhase';
import type { GraphWalkInspection } from './lib/GraphWalkInspection';
import type { GraphWalkProgressSnapshot } from './lib/GraphWalkSummary';
import type { GraphWalkResolvedOptions } from './lib/normalizeWalkOptions';
import { SyncWalkSession } from './lib/SyncWalkSession';
import { WalkKernel } from './lib/WalkKernel';

export interface GraphWalkRunner<VertexData, EdgeData, VertexId>
  extends SyncTraversalExecution<
    GraphWalkObservationKind,
    GraphWalkEvent<VertexData, EdgeData, VertexId>,
    GraphWalkInspection,
    `${GraphWalkObservationKind}`
  > {
  runAndIterateObservationEventsUntilSuspendedOrTerminal: {
    (): Generator<
      GraphWalkEvent<VertexData, EdgeData, VertexId>,
      void,
      unknown
    >;
    <ObservationKind extends `${GraphWalkObservationKind}`>(
      executionOptionsPatch: TraversalExecutionSelectionPatch<
        GraphWalkObservationKind,
        ObservationKind
      > & {
        deliveredEventKinds: readonly ObservationKind[];
      },
    ): Generator<
      GraphWalkEventForObservationKind<
        VertexData,
        EdgeData,
        ObservationKind,
        VertexId
      >,
      void,
      unknown
    >;
    (
      executionOptionsPatch?: TraversalExecutionSelectionPatch<GraphWalkObservationKind>,
    ): Generator<GraphWalkEvent<VertexData, EdgeData, VertexId>, void, unknown>;
  };
  runUntilSuspendedOrTerminal: (
    executionOptionsPatch?: TraversalExecutionSelectionPatch<GraphWalkObservationKind>,
  ) => this;
  closePermanentlyAndDisposeSourceIterators(): void;
  captureProgressSnapshot(): GraphWalkProgressSnapshot;
}

export class InternalGraphWalkRunner<VertexData, EdgeData, VertexId>
  implements GraphWalkRunner<VertexData, EdgeData, VertexId>
{
  private readonly kernel: WalkKernel<VertexData, EdgeData, VertexId>;
  private readonly session: SyncWalkSession<VertexData, EdgeData, VertexId>;
  constructor(
    options: GraphWalkResolvedOptions<VertexData, EdgeData, VertexId>,
  ) {
    this.kernel = new WalkKernel(options);
    this.session = new SyncWalkSession(this.kernel);
  }
  runAndIterateObservationEventsUntilSuspendedOrTerminal: {
    (): Generator<
      GraphWalkEvent<VertexData, EdgeData, VertexId>,
      void,
      unknown
    >;
    <ObservationKind extends `${GraphWalkObservationKind}`>(
      executionOptionsPatch: TraversalExecutionSelectionPatch<
        GraphWalkObservationKind,
        ObservationKind
      > & {
        deliveredEventKinds: readonly ObservationKind[];
      },
    ): Generator<
      GraphWalkEventForObservationKind<
        VertexData,
        EdgeData,
        ObservationKind,
        VertexId
      >,
      void,
      unknown
    >;
    (
      executionOptionsPatch?: TraversalExecutionSelectionPatch<GraphWalkObservationKind>,
    ): Generator<GraphWalkEvent<VertexData, EdgeData, VertexId>, void, unknown>;
  } = <ObservationKind extends `${GraphWalkObservationKind}`>(
    executionOptionsPatch?: TraversalExecutionSelectionPatch<GraphWalkObservationKind>,
  ) =>
    this.session.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      executionOptionsPatch,
    ) as Generator<
      GraphWalkEventForObservationKind<
        VertexData,
        EdgeData,
        ObservationKind,
        VertexId
      >,
      void,
      unknown
    >;
  runUntilSuspendedOrTerminal = (
    executionOptionsPatch?: TraversalExecutionSelectionPatch<GraphWalkObservationKind>,
  ): this => {
    for (const _event of this.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      executionOptionsPatch,
    )) {
      /* Drive observations to exhaustion. */
    }
    return this;
  };
  closePermanentlyAndDisposeSourceIterators() {
    return this.session.close();
  }
  getTraversalLifecycleStatus() {
    return this.kernel.getTraversalLifecycleStatus();
  }
  getTraversalStopReason() {
    return this.kernel.getTraversalStopReason();
  }
  isSuspended() {
    return this.kernel.isSuspended();
  }
  requestPauseAfterAdmittedCallbacksDrain() {
    return this.kernel.requestPauseAfterAdmittedCallbacksDrain();
  }
  captureProgressSnapshot() {
    return this.kernel.captureProgressSnapshot();
  }
  captureExecutionSnapshot() {
    return this.kernel.captureExecutionSnapshot();
  }
}
