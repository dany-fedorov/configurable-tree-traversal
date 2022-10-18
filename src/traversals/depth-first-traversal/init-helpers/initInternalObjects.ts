import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { DepthFirstTraversalInstanceConfig } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstTraversalRunnerInternalObjects } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerInternalObjects';
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import { DepthFirstTraversalRunnerState } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerState';

// export function initInternalObjects<
//   TTP extends TreeTypeParameters,
//   RW_TTP extends TreeTypeParameters,
// >(
//   icfg: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
// ): DepthFirstTraversalRunnerInternalObjects<TTP, RW_TTP> {
//   return {
//     resolvedTreesContainer: new DepthFirstTraversalResolvedTreesContainer(icfg),
//     traversalState: new DepthFirstTraversalRunnerState(icfg),
//   };
// }
