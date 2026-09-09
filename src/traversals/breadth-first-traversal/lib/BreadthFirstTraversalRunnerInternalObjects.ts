import type { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { BreadthFirstTraversalRunnerState } from './BreadthFirstTraversalRunnerState';

export type BreadthFirstTraversalRunnerInternalObjects<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = {
  resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
    TTP,
    RW_TTP
  >;
  state: BreadthFirstTraversalRunnerState<TTP, RW_TTP>;
};
