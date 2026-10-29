import type { ExecutionInspection } from '@core/ExecutionInspection';
import type { InspectionFilters } from '@core/CoreInspection';
import type {
  GraphWalkStrategy,
  GraphWalkRevisitPolicy,
} from '../GraphWalkOptions';
import type { GraphWalkPhase } from '../GraphWalkPhase';
import type { GraphWalkCounts } from './GraphWalkSummary';
import type { GraphWalkOperation } from '../GraphWalkOperation';

export interface GraphWalkInspection extends ExecutionInspection {
  readonly kind: 'graph-walk';
  readonly sourceMode: 'graph';
  readonly concurrency: 1;
  readonly strategy: GraphWalkStrategy;
  readonly revisit: GraphWalkRevisitPolicy;
  readonly executionOptions: InspectionFilters<GraphWalkPhase>;
  readonly counts: GraphWalkCounts;
  readonly frontierSize: number;
  readonly openSourceIteratorCount: number;
  readonly pendingObservationKinds: readonly GraphWalkPhase[];
  readonly activeVisitor: Readonly<{
    phase: GraphWalkPhase;
    visitorIndex: number;
  }> | null;
  readonly pendingRequests: readonly Readonly<{
    requestId: number;
    operation: GraphWalkOperation;
    /** Stable runner-local identity; never a caller vertex ID. */
    vertexToken?: symbol | undefined;
  }>[];
}
