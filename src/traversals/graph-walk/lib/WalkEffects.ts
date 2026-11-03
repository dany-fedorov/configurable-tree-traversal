import type { GraphWalkPendingInvocationOperation } from '../GraphWalkOperation';
import type { GraphWalkEvent } from '../GraphWalkEvent';
import type { GraphWalkObservationKind } from '../GraphWalkPhase';

export type WalkAction<VertexData, EdgeData, VertexId> =
  | {
      kind: 'CALL';
      runnerLocalInvocationRequestId: number;
      operation: GraphWalkPendingInvocationOperation;
      runnerLocalVertexIdentityToken?: symbol | undefined;
      invoke: () => unknown;
    }
  | {
      kind: 'OBSERVATION';
      boundaryId: number;
      observationKind: GraphWalkObservationKind;
      event: () => GraphWalkEvent<VertexData, EdgeData, VertexId>;
    }
  | { kind: 'WAIT' | 'SUSPENDED' | 'FINISHED' }
  | { kind: 'FAILED'; error: unknown };
