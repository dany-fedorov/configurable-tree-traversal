import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { DagTraversalRunnerState } from './DagTraversalRunnerState';

export type DagTraversalRunnerInternalObjects<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> = {
  resolvedGraphsContainer: ResolvedGraphsContainer<T, R, ID>;
  state: DagTraversalRunnerState<T, R>;
};
