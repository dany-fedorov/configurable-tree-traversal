import type { VertexTypes } from '@core/TreeTypeParameters';
import type { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import type { DepthFirstTraversalRunnerState } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerState';

export type DepthFirstTraversalRunnerInternalObjects<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
    TTP,
    RW_TTP
  >;
  state: DepthFirstTraversalRunnerState<TTP, RW_TTP>;
};
