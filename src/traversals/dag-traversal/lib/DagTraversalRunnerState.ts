import type { CTTRef } from '@core/CTTRef';
import type { VisitOrder } from '@core/effects/types';
import type { VisitorExecutionState } from '@core/executeVisitors';
import type { Ref } from '@core/graph/types';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import { DagTraversalOrder } from './DagTraversalOrder';

export type DagTraversalVisitorsState<T extends TreeTypeParameters> = {
  [K in DagTraversalOrder]: VisitorExecutionState<T>;
};

function initVisitorsState<T extends TreeTypeParameters>(): DagTraversalVisitorsState<T> {
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
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
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
  }
}
