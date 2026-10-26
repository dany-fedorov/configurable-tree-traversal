import type { DepthFirstTraversalOrder } from './DepthFirstTraversalOrder';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { TraversalVisitorRecord } from '@core/TraversalVisitor';

export type DepthFirstTraversalVisitors<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  [K in DepthFirstTraversalOrder]: TraversalVisitorRecord<K, TTP, RW_TTP>[];
};
