import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { CTTRef } from '@core/CTTRef';
import type { Vertex } from '@core/Vertex';
import type { DepthFirstTraversalVisitorsState } from '@depth-first-traversal/lib/DepthFirstTraversalVisitorsState';
import type { DepthFirstTraversalInstanceConfig } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { jsonStringifySafe } from '@utils/jsonStringifySafe';
import { TraversalRunnerStatus } from '@core/TraversalRunner';

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

export class DepthFirstTraversalRunnerState<
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
  status: TraversalRunnerStatus;

  constructor(cfg: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>) {
    const from = cfg?.traversalRunnerInternalObjects?.state ?? null;
    this.STACK = from?.STACK != null ? from?.STACK : [];
    this.postOrderNotVisitedChildrenCountMap =
      from?.postOrderNotVisitedChildrenCountMap != null
        ? from?.postOrderNotVisitedChildrenCountMap
        : new Map<CTTRef<Vertex<TTP | RW_TTP>>, number>();
    this.visitorsState =
      from?.visitorsState != null
        ? from?.visitorsState
        : initDepthFirstVisitorsState();
    this.traversalRootVertexRef =
      from?.traversalRootVertexRef != null
        ? from?.traversalRootVertexRef
        : null;
    this.status =
      from?.status != null ? from?.status : TraversalRunnerStatus.INITIAL;
  }

  countVisitedOnPostOrderAChildOf(
    parentVertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ): number {
    const postOrderNotVisitedChildrenCount =
      this.postOrderNotVisitedChildrenCountMap.get(parentVertexRef);
    if (postOrderNotVisitedChildrenCount == null) {
      throw new Error(
        [
          'countVisitedOnPostOrderAChildOf::Could not find entry in postOrderNotVisitedChildrenCountMap',
          `trying to count for parent: ${jsonStringifySafe(parentVertexRef)}`,
        ].join(', '),
      );
    }
    const newCount = postOrderNotVisitedChildrenCount - 1;
    this.postOrderNotVisitedChildrenCountMap.set(parentVertexRef, newCount);
    if (newCount < 0) {
      throw new Error(
        [
          `countVisitedOnPostOrderAChildOf::Count got to < 0`,
          `trying to count for parent: ${jsonStringifySafe(parentVertexRef)}`,
        ].join(', '),
      );
    }
    if (newCount === 0) {
      this.postOrderNotVisitedChildrenCountMap.delete(parentVertexRef);
    }
    return newCount;
  }
}
