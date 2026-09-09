import type { TraversalVisitorInputOptions } from '@core/TraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { BreadthFirstTraversalOrder } from './BreadthFirstTraversalOrder';

export type BreadthFirstTraversalVisitorsState<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = {
  [K in BreadthFirstTraversalOrder]: Pick<
    TraversalVisitorInputOptions<BreadthFirstTraversalOrder, TTP, RW_TTP>,
    | 'vertexVisitIndex'
    | 'curVertexVisitorVisitIndex'
    | 'previousVisitedVertexRef'
  >;
};
