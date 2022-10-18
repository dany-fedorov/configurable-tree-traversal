import type { DepthFirstTraversalRunnerState } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerState';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import type { DepthFirstTraversalVisitors } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';

export type DepthFirstTraversalRunnerInstanceConfig<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  saveNotMutatedResolvedTree: boolean;
  visitors: DepthFirstTraversalVisitors<TTP, RW_TTP>;
  internalObjects: {
    state: DepthFirstTraversalRunnerState<TTP, RW_TTP>;
    resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
      TTP,
      RW_TTP
    >;
  };
};

export type DepthFirstTraversalRunnerInstanceConfigInput<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = Partial<DepthFirstTraversalRunnerInstanceConfig<TTP, RW_TTP>>;
