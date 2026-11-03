import type { DepthFirstTraversalRunnerState } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerState';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import type { DepthFirstTreeVisitorRegistrationsByPhase } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';

export type DepthFirstTraversalRunnerInstanceConfig<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = {
  retainDiscoveredTreeBeforeVisitorCommands: boolean;
  visitors: DepthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  internalObjects: {
    state: DepthFirstTraversalRunnerState<
      InputVertexTypes,
      RewrittenVertexTypes
    >;
    resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
      InputVertexTypes,
      RewrittenVertexTypes
    >;
  };
};

export type DepthFirstTraversalRunnerInstanceConfigInput<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = Partial<
  DepthFirstTraversalRunnerInstanceConfig<
    InputVertexTypes,
    RewrittenVertexTypes
  >
>;
