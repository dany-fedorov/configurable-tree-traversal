import type { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { BreadthFirstTraversalRunnerState } from './BreadthFirstTraversalRunnerState';

export type BreadthFirstTraversalRunnerInternalObjects<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = {
  resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
    TTP,
    RW_TTP
  >;
  state: BreadthFirstTraversalRunnerState<TTP, RW_TTP>;
};
