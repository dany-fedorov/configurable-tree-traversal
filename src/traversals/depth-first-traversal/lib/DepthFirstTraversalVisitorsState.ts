import type { VertexTypes } from '@core/TreeTypeParameters';
import type { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { TraversalVisitorInputOptions } from '@core/TraversalVisitor';

export type DepthFirstTraversalVisitorsState<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  [K in DepthFirstTraversalOrder]: Pick<
    TraversalVisitorInputOptions<DepthFirstTraversalOrder, TTP, RW_TTP>,
    | 'vertexVisitIndex'
    | 'curVertexVisitorVisitIndex'
    | 'previousVisitedVertexRef'
  >;
};
