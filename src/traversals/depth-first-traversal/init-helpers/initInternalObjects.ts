import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { DepthFirstTraversalInstanceConfig } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstTraversalInternalObjects } from '@depth-first-traversal/lib/DepthFirstTraversalInternalObjects';
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import { DepthFirstTraversalState } from '@depth-first-traversal/lib/DepthFirstTraversalState';

export function initInternalObjects<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  icfg: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
): DepthFirstTraversalInternalObjects<TTP, RW_TTP> {
  return {
    resolvedTreesContainer: new DepthFirstTraversalResolvedTreesContainer(icfg),
    traversalState: new DepthFirstTraversalState(icfg),
  };
}
