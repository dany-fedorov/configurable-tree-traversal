import type { TraversalVisitorRecord } from '@core/TraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { BreadthFirstTraversalOrder } from './BreadthFirstTraversalOrder';

export type BreadthFirstTraversalVisitors<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = {
  [K in BreadthFirstTraversalOrder]: TraversalVisitorRecord<
    BreadthFirstTraversalOrder,
    TTP,
    RW_TTP
  >[];
};
