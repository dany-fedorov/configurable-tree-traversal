import type { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { BreadthFirstTraversalRunnerState } from './BreadthFirstTraversalRunnerState';

export type BreadthFirstTraversalRunnerInternalObjects<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = {
  resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  state: BreadthFirstTraversalRunnerState<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
};
