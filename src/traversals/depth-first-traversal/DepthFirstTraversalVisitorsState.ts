import type {
  TraversalVisitorInputOptions,
  TreeTypeParameters,
} from '../../core';
import type { DepthFirstTraversalOrder } from './DepthFirstTraversalOrder';

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
