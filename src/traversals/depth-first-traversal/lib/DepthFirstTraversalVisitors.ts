import type { DepthFirstPhase } from './DepthFirstTraversalOrder';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { TreeVisitorRecord } from '@core/TraversalVisitor';

export type DepthFirstTraversalVisitors<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  [K in DepthFirstPhase]: TreeVisitorRecord<K, TTP, RW_TTP>[];
};
