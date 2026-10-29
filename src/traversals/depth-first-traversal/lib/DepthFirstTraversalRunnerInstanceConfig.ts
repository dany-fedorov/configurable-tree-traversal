import type { DepthFirstTraversalRunnerState } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerState';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import type { DepthFirstTraversalVisitors } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';

export type DepthFirstTraversalRunnerInstanceConfig<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  retainOriginalTreeStructure: boolean;
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
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = Partial<DepthFirstTraversalRunnerInstanceConfig<TTP, RW_TTP>>;
