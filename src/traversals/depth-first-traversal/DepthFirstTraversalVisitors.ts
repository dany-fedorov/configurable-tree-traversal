import type { TraversalVisitorRecord, TreeTypeParameters } from '../../../core';
import type { DepthFirstTraversalOrder } from './DepthFirstTraversalOrder';

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
