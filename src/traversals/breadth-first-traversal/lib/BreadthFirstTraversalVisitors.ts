import type { TreeVisitorRecord } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { BreadthFirstPhase } from './BreadthFirstTraversalOrder';

export type BreadthFirstTraversalVisitors<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = {
  [K in BreadthFirstPhase]: TreeVisitorRecord<K, TTP, RW_TTP>[];
};
