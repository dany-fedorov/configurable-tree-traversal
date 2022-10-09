import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import type { DepthFirstTraversalState } from '@depth-first-traversal/lib/DepthFirstTraversalState';

export type DepthFirstTraversalInternalObjects<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<TTP, RW_TTP>;
  traversalState: DepthFirstTraversalState<TTP, RW_TTP>;
};
