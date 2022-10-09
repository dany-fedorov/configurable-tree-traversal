import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { CTTRef } from '@core/CTTRef';
import type { Vertex } from '@core/Vertex';
import type { DepthFirstTraversalVisitorsState } from '@depth-first-traversal/lib/DepthFirstTraversalVisitorsState';
import { TraversalStatus } from '@core/Traversal';
import type { DepthFirstTraversalInstanceConfig } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';

export function initDepthFirstVisitorsState<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(): DepthFirstTraversalVisitorsState<TTP, RW_TTP> {
  const empty = {
    vertexVisitIndex: 0,
    curVertexVisitorVisitIndex: 0,
    previousVisitedVertexRef: null,
  };
  return {
    [DepthFirstTraversalOrder.PRE_ORDER]: { ...empty },
    [DepthFirstTraversalOrder.IN_ORDER]: { ...empty },
    [DepthFirstTraversalOrder.POST_ORDER]: { ...empty },
  };
}

export class DepthFirstTraversalState<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> {
  STACK: Array<VertexResolutionContext<TTP | RW_TTP>>;
  postOrderNotVisitedChildrenCountMap: Map<
    CTTRef<Vertex<TTP | RW_TTP>>,
    number
  >;
  visitorsState: DepthFirstTraversalVisitorsState<TTP, RW_TTP>;
  traversalRootVertexRef: CTTRef<Vertex<TTP | RW_TTP>> | null;
  status: TraversalStatus;

  constructor(cfg: {
    internalObjects: {
      traversalState?: DepthFirstTraversalInstanceConfig<
        TTP,
        RW_TTP
      >['internalObjects']['traversalState'];
    };
  }) {
    this.STACK =
      cfg.internalObjects?.traversalState?.STACK != null
        ? cfg.internalObjects?.traversalState?.STACK
        : [];
    this.postOrderNotVisitedChildrenCountMap =
      cfg.internalObjects?.traversalState
        ?.postOrderNotVisitedChildrenCountMap != null
        ? cfg.internalObjects?.traversalState
            ?.postOrderNotVisitedChildrenCountMap
        : new Map<CTTRef<Vertex<TTP | RW_TTP>>, number>();
    this.visitorsState =
      cfg.internalObjects?.traversalState?.visitorsState != null
        ? cfg.internalObjects?.traversalState?.visitorsState
        : initDepthFirstVisitorsState();
    this.traversalRootVertexRef =
      cfg.internalObjects?.traversalState?.traversalRootVertexRef != null
        ? cfg.internalObjects?.traversalState?.traversalRootVertexRef
        : null;
    this.status =
      cfg.internalObjects?.traversalState?.status != null
        ? cfg.internalObjects?.traversalState?.status
        : TraversalStatus.INITIAL;
  }
}
