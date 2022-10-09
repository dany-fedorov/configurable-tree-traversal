import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { TraversalVisitorInputOptions } from '@core/TraversalVisitor';

export type DepthFirstTraversalVisitorsState<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  [K in DepthFirstTraversalOrder]: Pick<
    TraversalVisitorInputOptions<DepthFirstTraversalOrder, TTP, RW_TTP>,
    | 'vertexVisitIndex'
    | 'curVertexVisitorVisitIndex'
    | 'previousVisitedVertexRef'
  >;
};
