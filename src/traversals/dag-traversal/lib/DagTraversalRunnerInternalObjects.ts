import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { DagTraversalRunnerState } from './DagTraversalRunnerState';

export type DagTraversalRunnerInternalObjects<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ID = unknown,
> = {
  resolvedGraphsContainer: ResolvedGraphsContainer<T, R, ID>;
  state: DagTraversalRunnerState<T, R>;
};
