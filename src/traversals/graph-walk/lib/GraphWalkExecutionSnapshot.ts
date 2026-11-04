import type { TraversalExecutionSnapshot } from '@core/ExecutionInspection';
import type { TraversalExecutionSelections } from '@core/CoreInspection';
import type {
  GraphWalkExpansionOrder,
  GraphWalkRouteEnumerationPolicy,
} from '../GraphWalkOptions';
import type { GraphWalkObservationKind } from '../GraphWalkPhase';
import type { GraphWalkProgressCounts } from './GraphWalkSummary';
import type { GraphWalkPendingInvocationOperation } from '../GraphWalkOperation';

export interface GraphWalkExecutionSnapshot extends TraversalExecutionSnapshot {
  readonly traversalAlgorithm: 'graph-walk';
  readonly sourceMode: 'graph';
  readonly concurrency: 1;
  readonly expansionOrder: GraphWalkExpansionOrder;
  readonly routeEnumerationPolicy: GraphWalkRouteEnumerationPolicy;
  readonly executionOptions: TraversalExecutionSelections<GraphWalkObservationKind>;
  readonly counts: GraphWalkProgressCounts;
  readonly pendingRouteExpansionFrameCount: number;
  readonly openSourceIteratorCount: number;
  readonly pendingObservationKinds: readonly GraphWalkObservationKind[];
  readonly visitorChainPosition: Readonly<{
    observationKind: GraphWalkObservationKind;
    visitorIndexInObservationChain: number;
  }> | null;
  readonly pendingInvocationRequests: readonly Readonly<{
    runnerLocalInvocationRequestId: number;
    operation: GraphWalkPendingInvocationOperation;
    /** Stable runner-local identity; never a caller vertex ID. */
    runnerLocalVertexIdentityToken?: symbol | undefined;
  }>[];
}
