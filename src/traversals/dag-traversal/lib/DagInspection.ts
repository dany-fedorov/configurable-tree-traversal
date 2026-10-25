import type {
  DagDependencyEdge,
  DagDependencyMilestone,
} from '@core/errors/DagTraversalStallError';
import type { DagInspectionState } from '@core/graph/types';
import { makeMilestoneQuery } from '@core/graph/queryMilestones';
import type { DagSummary } from './DagProgress';

export type DagMilestoneQueryOptions = { readonly transitive?: boolean };

export type DagMilestoneQueryResult<ID = unknown> = Readonly<{
  milestones: readonly DagDependencyMilestone<ID>[];
  edges: readonly DagDependencyEdge<ID>[];
  discoveryComplete: boolean;
}>;

/** Detached original constraints, independent of subsequent runner progress. */
export interface DagInspection<ID = unknown> {
  prerequisitesOf(
    target: DagDependencyMilestone<ID>,
    options?: DagMilestoneQueryOptions,
  ): DagMilestoneQueryResult<ID>;
  dependentsOf(
    target: DagDependencyMilestone<ID>,
    options?: DagMilestoneQueryOptions,
  ): DagMilestoneQueryResult<ID>;
}

/** @internal Captured once for navigation and progress explanations. */
export type DagInspectionSnapshot<ID> = {
  state: DagInspectionState<ID>;
  summary: DagSummary<ID>;
  edges: readonly DagDependencyEdge<ID>[];
};

/** @internal No caller receives the captured state or adjacency records. */
export function makeDagInspection<ID>(
  snapshot: DagInspectionSnapshot<ID>,
): DagInspection<ID> {
  const knownIds = new Set(
    snapshot.state.identityStates.map(({ vertexId }) => vertexId),
  );
  const walk = makeMilestoneQuery(snapshot.edges);
  const query = (
    target: DagDependencyMilestone<ID>,
    direction: 'prerequisites' | 'dependents',
    options: DagMilestoneQueryOptions = {},
  ): DagMilestoneQueryResult<ID> => ({
    ...(knownIds.has(target.vertexId)
      ? walk(target, direction, options.transitive ?? false)
      : { milestones: [], edges: [] }),
    discoveryComplete: snapshot.state.discoveryComplete,
  });
  return {
    prerequisitesOf: (target, options) =>
      query(target, 'prerequisites', options),
    dependentsOf: (target, options) => query(target, 'dependents', options),
  };
}
