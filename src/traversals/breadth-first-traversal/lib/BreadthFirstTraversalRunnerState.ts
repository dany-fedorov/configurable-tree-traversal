import type { CTTRef } from '@core/CTTRef';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import { BreadthFirstTraversalOrder } from './BreadthFirstTraversalOrder';
import type { BreadthFirstTraversalVisitorsState } from './BreadthFirstTraversalVisitorsState';

export function initBreadthFirstVisitorsState<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(): BreadthFirstTraversalVisitorsState<TTP, RW_TTP> {
  return {
    [BreadthFirstTraversalOrder.LEVEL_ORDER]: {
      vertexVisitIndex: 0,
      curVertexVisitorVisitIndex: 0,
      previousVisitedVertexRef: null,
    },
  };
}

export class BreadthFirstTraversalRunnerState<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> {
  queue: VertexResolutionContext<TTP | RW_TTP>[];
  queueIndex: number;
  visitorsState: BreadthFirstTraversalVisitorsState<TTP, RW_TTP>;
  traversalRootVertexRef: CTTRef<Vertex<TTP | RW_TTP>> | null;
  status: TraversalRunnerStatus;
  subtreeTraversalDisabledRefs: Set<CTTRef<Vertex<TTP | RW_TTP>>>;

  constructor(
    from?: Partial<BreadthFirstTraversalRunnerState<TTP, RW_TTP>> | null,
  ) {
    this.queue = from?.queue ?? [];
    this.queueIndex = from?.queueIndex ?? 0;
    this.visitorsState = from?.visitorsState ?? initBreadthFirstVisitorsState();
    this.traversalRootVertexRef = from?.traversalRootVertexRef ?? null;
    this.status = from?.status ?? TraversalRunnerStatus.INITIAL;
    this.subtreeTraversalDisabledRefs =
      from?.subtreeTraversalDisabledRefs ?? new Set();
  }
}
