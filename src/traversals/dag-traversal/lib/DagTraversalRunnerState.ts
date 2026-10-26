import type { CTTRef } from '@core/CTTRef';
import type { VisitOrder } from '@core/effects/types';
import type { VisitorExecutionState } from '@core/executeVisitors';
import type { Ref } from '@core/graph/types';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import { copyDagTerminalObservation } from './DagTerminalObservation';
import { DagVisitorPhase } from './DagTraversalOrder';

export type DagTraversalVisitorsState<T extends VertexTypes> = {
  [K in DagVisitorPhase]: VisitorExecutionState<T>;
};

function initVisitorsState<
  T extends VertexTypes,
>(): DagTraversalVisitorsState<T> {
  return {
    [DagVisitorPhase.ON_WORK_READY]: {
      phaseVisitIndex: 0,
      visitorIndex: 0,
      previousPhaseVertexRef: null,
    },
    [DagVisitorPhase.ON_SUBGRAPH_READY]: {
      phaseVisitIndex: 0,
      visitorIndex: 0,
      previousPhaseVertexRef: null,
    },
  };
}

export class DagTraversalRunnerState<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
> {
  status: TraversalRunnerStatus;
  traversalRootVertexRef: CTTRef<Vertex<T | R>> | null;
  subtreeTraversalDisabledRefs: Set<CTTRef<Vertex<T | R>>>;
  visitorsState: Partial<Record<VisitOrder, VisitorExecutionState<T | R>>>;
  readyVisits: Array<{ vertexRef: Ref<T | R>; order: DagVisitorPhase }>;
  expansionQueue: Ref<T | R>[];
  failure: { error: unknown } | null;

  constructor(from?: Partial<DagTraversalRunnerState<T, R>> | null) {
    this.status = from?.status ?? TraversalRunnerStatus.INITIAL;
    this.traversalRootVertexRef = from?.traversalRootVertexRef ?? null;
    this.subtreeTraversalDisabledRefs =
      from?.subtreeTraversalDisabledRefs ?? new Set();
    this.visitorsState = from?.visitorsState ?? initVisitorsState<T | R>();
    this.readyVisits = from?.readyVisits ?? [];
    this.expansionQueue = from?.expansionQueue ?? [];
    this.failure = from?.failure ?? null;
    copyDagTerminalObservation(from, this);
  }
}
