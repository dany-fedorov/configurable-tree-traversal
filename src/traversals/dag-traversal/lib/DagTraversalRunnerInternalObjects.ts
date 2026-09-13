import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { DagTraversalRunnerState } from './DagTraversalRunnerState';

export type DagTraversalRunnerInternalObjects<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = {
  resolvedGraphsContainer: ResolvedGraphsContainer<T, R>;
  state: DagTraversalRunnerState<T, R>;
};
