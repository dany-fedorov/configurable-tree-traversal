import type {
  TraversableTree,
  TraversalVisitorInputOptions,
  TraversalVisitorRecord,
  TreeTypeParameters,
  VertexResolutionContext,
} from '../../core';
import { CTTRef, ResolvedTree, Vertex, VertexResolved } from '../../core';
import { TraversalStatus } from '../../core/Traversal';
import {DepthFirstTraversalOrder} from "./configuration/DepthFirstTraversalOrder";

function initDepthFirstVisitorsState<
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






export function initVisitors<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  icfg: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
): DepthFirstTraversalVisitors<TTP, RW_TTP> {
  return Object.fromEntries(
    Object.entries(icfg.visitors).map(([order, visitors]) => {
      return [order, [...visitors]];
    }),
  ) as DepthFirstTraversalVisitors<TTP, RW_TTP>;
}

export function initInternalObjects<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  icfg: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
): DepthFirstTraversalInternalObjects<TTP, RW_TTP> {
  return {
    resolvedTreesContainer: new ResolvedTreesContainer(icfg),
    traversalState: new DepthFirstTraversalState(icfg),
  };
}
