import type { TraversalVisitorRecord } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { BreadthFirstPhase } from './BreadthFirstTraversalOrder';

export type BreadthFirstTraversalVisitors<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = {
  [K in BreadthFirstPhase]: TraversalVisitorRecord<K, TTP, RW_TTP>[];
};
