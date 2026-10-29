import type { MutableRef } from '@core/CTTRef';
import type { InternalVertexResolutionContext } from '@core/ResolvedTree';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import { BreadthFirstPhase } from './BreadthFirstTraversalOrder';
import type { BreadthFirstTraversalVisitorsState } from './BreadthFirstTraversalVisitorsState';

export function initBreadthFirstVisitorsState<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
>(): BreadthFirstTraversalVisitorsState<TTP, RW_TTP> {
  return {
    [BreadthFirstPhase.LEVEL_ORDER]: {
      phaseVisitIndex: 0,
      visitorIndex: 0,
      previousPhaseVertexRef: null,
    },
  };
}

export class BreadthFirstTraversalRunnerState<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> {
  queue: InternalVertexResolutionContext<TTP | RW_TTP>[];
  queueIndex: number;
  visitorsState: BreadthFirstTraversalVisitorsState<TTP, RW_TTP>;
  traversalRootVertexRef: MutableRef<Vertex<TTP | RW_TTP>> | null;
  status: TraversalRunnerStatus;
  subtreeTraversalDisabledRefs: Set<MutableRef<Vertex<TTP | RW_TTP>>>;

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
