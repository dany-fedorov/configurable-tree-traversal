import type { DepthFirstTraversalOrder } from './DepthFirstTraversalOrder';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversalVisitorRecord } from '@core/TraversalVisitor';

export type DepthFirstTraversalVisitors<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  [K in DepthFirstTraversalOrder]: TraversalVisitorRecord<
    DepthFirstTraversalOrder,
    TTP,
    RW_TTP
  >[];
};
