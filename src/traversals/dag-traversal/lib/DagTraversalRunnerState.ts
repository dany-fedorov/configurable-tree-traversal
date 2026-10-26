import type { CTTRef } from '@core/CTTRef';
import type { VisitOrder } from '@core/effects/types';
import type { VisitorExecutionState } from '@core/executeVisitors';
import type { Ref } from '@core/graph/types';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import { copyDagTerminalObservation } from './DagTerminalObservation';
import { DagTraversalOrder } from './DagTraversalOrder';

export type DagTraversalVisitorsState<T extends VertexTypes> = {
  [K in DagTraversalOrder]: VisitorExecutionState<T>;
};

function initVisitorsState<
  T extends VertexTypes,
>(): DagTraversalVisitorsState<T> {
  return {
    [DagTraversalOrder.ON_READY]: {
      vertexVisitIndex: 0,
      curVertexVisitorVisitIndex: 0,
      previousVisitedVertexRef: null,
    },
    [DagTraversalOrder.ON_COMPLETE]: {
      vertexVisitIndex: 0,
      curVertexVisitorVisitIndex: 0,
      previousVisitedVertexRef: null,
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
  readyVisits: Array<{ vertexRef: Ref<T | R>; order: DagTraversalOrder }>;
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
