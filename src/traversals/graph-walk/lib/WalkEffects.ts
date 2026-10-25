import type { GraphWalkEvent } from '../GraphWalkEvent';
import type { GraphWalkPhase } from '../GraphWalkPhase';

export type WalkOperation =
  | 'roots'
  | 'rootNext'
  | 'resolveVertex'
  | 'outgoing'
  | 'edgeNext'
  | 'followEdge'
  | 'expandVertex'
  | 'visitor'
  | 'iteratorReturn';
export type WalkAction<Data, Edge, ID> =
  | {
      kind: 'CALL';
      requestId: number;
      operation: WalkOperation;
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
