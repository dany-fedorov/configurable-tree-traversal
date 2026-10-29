import type {
  DagWaitEdge,
  DagMilestone,
} from '@core/errors/DagTraversalStallError';
import type { DagInspectionState } from '@core/graph/types';
import { makeMilestoneQuery } from '@core/graph/queryMilestones';
import type {
  DagSummary,
  DagVertexProgress,
  DagWorkState,
} from './DagProgress';

export type DagMilestoneQueryOptions = { readonly transitive?: boolean };

export type DagMilestoneQueryResult<ID = unknown> = Readonly<{
  milestones: readonly DagMilestone<ID>[];
  edges: readonly DagWaitEdge<ID>[];
  discoveryComplete: boolean;
}>;

/** Endpoint facts at the captured milestone; completed W need not satisfy C. */
export type DagMilestoneStatus =
  | { kind: 'live'; work: DagWorkState; satisfied: boolean }
  | { kind: 'omitted' | 'deleted' | 'unresolved' };

type WorkTarget<ID> = { vertexId: ID; milestone: 'work' };
type CompletionTarget<ID> = { vertexId: ID; milestone: 'subgraphCompletion' };

/** Original unmet constraints followed by terminal scheduler facts in BFS order. */
export type DagBlocker<ID = unknown> =
  | (DagWaitEdge<ID> & {
      kind: 'constraint';
      waiterStatus: DagMilestoneStatus;
      prerequisiteStatus: DagMilestoneStatus;
    })
  | {
      kind: 'unfinishedWork';
      target: WorkTarget<ID>;
      work: Exclude<DagWorkState, 'completed'>;
    }
  | {
      kind: 'discoveryOpen' | 'completionPending';
      target: CompletionTarget<ID>;
    };

export type DagExplanation<ID = unknown> =
  | Readonly<{
      kind: 'unknown' | 'deleted';
      target: DagMilestone<ID>;
      discoveryComplete: boolean;
    }>
  | Readonly<{
      kind: 'known';
      target: DagMilestone<ID>;
      satisfied: boolean;
      progress: DagVertexProgress<ID> | null;
      blockers: readonly DagBlocker<ID>[];
      discoveryComplete: boolean;
    }>;

/** Detached original constraints, independent of subsequent runner progress. */
export interface DagMilestoneSnapshot<ID = unknown> {
  explain(target: DagMilestone<ID>): DagExplanation<ID>;
  prerequisitesOf(
    target: DagMilestone<ID>,
    options?: DagMilestoneQueryOptions,
  ): DagMilestoneQueryResult<ID>;
  dependentsOf(
    target: DagMilestone<ID>,
    options?: DagMilestoneQueryOptions,
  ): DagMilestoneQueryResult<ID>;
}

/** @internal Captured once for navigation and progress explanations. */
export type DagInspectionSnapshot<ID> = {
  state: DagInspectionState<ID>;
  summary: DagSummary<ID>;
  edges: readonly DagWaitEdge<ID>[];
};

/** @internal No caller receives the captured state or adjacency records. */
export function makeDagInspection<ID>(
  snapshot: DagInspectionSnapshot<ID>,
): DagMilestoneSnapshot<ID> {
  const identities = new Map(
    snapshot.state.identityStates.map((item) => [item.vertexId, item.kind]),
  );
  const scheduling = new Map(
    snapshot.state.schedulingStates.map((item) => [item.vertexId, item]),
  );
  const status = (target: DagMilestone<ID>): DagMilestoneStatus => {
    const kind = identities.get(target.vertexId);
    if (kind !== 'live') return { kind: kind ?? 'unresolved' };
    const state = scheduling.get(target.vertexId)!;
    return {
      kind: 'live',
      work: snapshot.summary.vertices.get(target.vertexId)!.work,
      satisfied:
        target.milestone === 'work'
          ? state.initialCommitted
          : state.completionCommitted,
    };
  };
  const satisfied = (target: DagMilestone<ID>) => {
    const endpoint = status(target);
    return (
      endpoint.kind === 'omitted' ||
      (endpoint.kind === 'live' && endpoint.satisfied)
    );
  };
  const copyProgress = (id: ID): DagVertexProgress<ID> => {
    const progress = snapshot.summary.vertices.get(id)!;
    return {
      ...progress,
      unmetPrerequisiteIds: progress.unmetPrerequisiteIds.slice(),
      unmetWorkPrerequisiteIds: progress.unmetWorkPrerequisiteIds.slice(),
      unmetSubgraphPrerequisiteIds:
        progress.unmetSubgraphPrerequisiteIds.slice(),
    };
  };
  const walk = makeMilestoneQuery(snapshot.edges);
  const explain = (input: DagMilestone<ID>): DagExplanation<ID> => {
    const target = { vertexId: input.vertexId, milestone: input.milestone };
    const discoveryComplete = snapshot.state.discoveryComplete;
    const kind = identities.get(target.vertexId);
    if (kind === undefined || kind === 'deleted')
      return {
        kind: kind === undefined ? 'unknown' : kind,
        target,
        discoveryComplete,
      };
    const isSatisfied = satisfied(target);
    const blockers: DagBlocker<ID>[] = [];
    if (!isSatisfied) {
      // Start unsatisfied and admit only unmet endpoints: satisfied nodes never enter the queue.
      const reachable = walk(
        target,
        'prerequisites',
        true,
        (edge) => !satisfied(edge.prerequisite),
      );
      const blockedWork = new Set<ID>();
      for (const edge of reachable.edges) {
        blockers.push({
          ...edge,
          kind: 'constraint',
          waiterStatus: status(edge.waiter),
          prerequisiteStatus: status(edge.prerequisite),
        });
        if (edge.waiter.milestone === 'work') blockedWork.add(edge.waiter.vertexId);
      }
      for (const current of [target, ...reachable.milestones]) {
        const endpoint = status(current);
        if (endpoint.kind !== 'live') continue;
        if (current.milestone === 'work') {
          // Engine W state and initialCommitted agree; unsatisfied W cannot be completed.
          if (!blockedWork.has(current.vertexId))
            blockers.push({
              kind: 'unfinishedWork',
              target: { vertexId: current.vertexId, milestone: 'work' },
              work: endpoint.work as Exclude<DagWorkState, 'completed'>,
            });
        } else {
          const state = scheduling.get(current.vertexId)!;
          if (state.expansion !== 'closed')
            blockers.push({
              kind: 'discoveryOpen',
              target: { vertexId: current.vertexId, milestone: 'subgraphCompletion' },
            });
          else if (state.initialCommitted && state.remainingChildren === 0)
            blockers.push({
              kind: 'completionPending',
              target: { vertexId: current.vertexId, milestone: 'subgraphCompletion' },
            });
        }
      }
    }
    return {
      kind: 'known',
      target,
      satisfied: isSatisfied,
      progress: kind === 'omitted' ? null : copyProgress(target.vertexId),
      blockers,
      discoveryComplete,
    };
  };
  const query = (
    input: DagMilestone<ID>,
    direction: 'prerequisites' | 'dependents',
    options: DagMilestoneQueryOptions = {},
  ): DagMilestoneQueryResult<ID> => {
    const target = { vertexId: input.vertexId, milestone: input.milestone };
    return {
      ...(identities.has(target.vertexId)
        ? walk(target, direction, options.transitive ?? false)
        : { milestones: [], edges: [] }),
      discoveryComplete: snapshot.state.discoveryComplete,
    };
  };
  return {
    explain,
    prerequisitesOf: (target, options) =>
      query(target, 'prerequisites', options),
    dependentsOf: (target, options) => query(target, 'dependents', options),
  };
}
