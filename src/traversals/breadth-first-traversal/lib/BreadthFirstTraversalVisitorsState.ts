import type { TraversalVisitorInputOptions } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { BreadthFirstTraversalOrder } from './BreadthFirstTraversalOrder';

export type BreadthFirstTraversalVisitorsState<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = {
  [K in BreadthFirstTraversalOrder]: Pick<
    TraversalVisitorInputOptions<BreadthFirstTraversalOrder, TTP, RW_TTP>,
    | 'vertexVisitIndex'
    | 'curVertexVisitorVisitIndex'
    | 'previousVisitedVertexRef'
  >;
};
