import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import type { DepthFirstTraversalRunnerState } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerState';

export type DepthFirstTraversalRunnerInternalObjects<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
    TTP,
    RW_TTP
  >;
  state: DepthFirstTraversalRunnerState<TTP, RW_TTP>;
};
