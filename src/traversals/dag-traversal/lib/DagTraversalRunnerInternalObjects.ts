import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { DagTraversalRunnerState } from './DagTraversalRunnerState';

export type DagTraversalRunnerInternalObjects<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> = {
  resolvedGraphsContainer: ResolvedGraphsContainer<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >;
  state: DagTraversalRunnerState<SourceVertexTypes, RewrittenVertexTypes>;
};
