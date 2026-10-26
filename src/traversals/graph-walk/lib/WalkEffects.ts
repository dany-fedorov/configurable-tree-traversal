import type { GraphWalkOperation } from '../GraphWalkOperation';
import type { GraphWalkEvent } from '../GraphWalkEvent';
import type { GraphWalkPhase } from '../GraphWalkPhase';

export type WalkAction<Data, Edge, ID> =
  | {
      kind: 'CALL';
      requestId: number;
      operation: GraphWalkOperation;
      vertexToken?: symbol | undefined;
      invoke: () => unknown;
    }
  | {
      kind: 'OBSERVATION';
      boundaryId: number;
      phase: GraphWalkPhase;
      event: () => GraphWalkEvent<Data, Edge, ID>;
    }
  | { kind: 'WAIT' | 'HALTED' | 'FINISHED' }
  | { kind: 'FAILED'; error: unknown };
