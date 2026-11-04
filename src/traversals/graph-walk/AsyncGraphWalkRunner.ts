import type { AsyncTraversalExecution } from '@core/TraversalExecution';
import type { TraversalExecutionSelectionPatch } from '@core/TraversalRunnerIterableConfig';
import type {
  GraphWalkEvent,
  GraphWalkEventForObservationKind,
} from './GraphWalkEvent';
import type { GraphWalkObservationKind } from './GraphWalkPhase';
import { AsyncWalkSession } from './lib/AsyncWalkSession';
import type { GraphWalkExecutionSnapshot } from './lib/GraphWalkExecutionSnapshot';
import type { GraphWalkProgressSnapshot } from './lib/GraphWalkSummary';
import type { GraphWalkResolvedOptions } from './lib/normalizeWalkOptions';
import { WalkKernel } from './lib/WalkKernel';

export interface AsyncGraphWalkRunner<VertexData, EdgeData, VertexId>
  extends AsyncTraversalExecution<
    GraphWalkObservationKind,
    GraphWalkEvent<VertexData, EdgeData, VertexId>,
    GraphWalkExecutionSnapshot,
    `${GraphWalkObservationKind}`
  > {
  runAndIterateObservationEventsUntilSuspendedOrTerminal: {
    (): AsyncGenerator<
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
    ): AsyncGenerator<
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
    ): AsyncGenerator<
      GraphWalkEvent<VertexData, EdgeData, VertexId>,
      void,
      unknown
    >;
  };
  runUntilSuspendedOrTerminal: (
    executionOptionsPatch?: TraversalExecutionSelectionPatch<GraphWalkObservationKind>,
  ) => Promise<this>;
  closePermanentlyAndDisposeSourceIterators(): Promise<void>;
  captureProgressSnapshot(): GraphWalkProgressSnapshot;
}

export class InternalAsyncGraphWalkRunner<VertexData, EdgeData, VertexId>
  implements AsyncGraphWalkRunner<VertexData, EdgeData, VertexId>
{
  private readonly kernel: WalkKernel<VertexData, EdgeData, VertexId>;
  private readonly session: AsyncWalkSession<VertexData, EdgeData, VertexId>;
  constructor(
    options: GraphWalkResolvedOptions<VertexData, EdgeData, VertexId>,
  ) {
    this.kernel = new WalkKernel(options, 'async');
    this.session = new AsyncWalkSession(this.kernel);
  }
  runAndIterateObservationEventsUntilSuspendedOrTerminal: {
    (): AsyncGenerator<
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
    ): AsyncGenerator<
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
    ): AsyncGenerator<
      GraphWalkEvent<VertexData, EdgeData, VertexId>,
      void,
      unknown
    >;
  } = <ObservationKind extends `${GraphWalkObservationKind}`>(
    executionOptionsPatch?: TraversalExecutionSelectionPatch<GraphWalkObservationKind>,
  ) =>
    this.session.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      executionOptionsPatch,
    ) as AsyncGenerator<
      GraphWalkEventForObservationKind<
        VertexData,
        EdgeData,
        ObservationKind,
        VertexId
      >,
      void,
      unknown
    >;
  runUntilSuspendedOrTerminal = async (
    executionOptionsPatch?: TraversalExecutionSelectionPatch<GraphWalkObservationKind>,
  ): Promise<this> => {
    for await (const _event of this.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      executionOptionsPatch,
    )) {
      /* Drive observations to exhaustion. */
    }
    return this;
  };
  closePermanentlyAndDisposeSourceIterators() {
    return this.session.closeTerminal();
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
    return this.session.requestPauseAfterAdmittedCallbacksDrain();
  }
  captureProgressSnapshot() {
    return this.kernel.captureProgressSnapshot();
  }
  captureExecutionSnapshot() {
    return this.kernel.captureExecutionSnapshot();
  }
}
