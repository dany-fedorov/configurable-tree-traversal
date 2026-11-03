import type {
  DagMilestoneConstraint,
  DagMilestone,
} from '@core/errors/DagTraversalStallError';
import type { DagInspectionState } from '@core/graph/types';
import { makeMilestoneQuery } from '@core/graph/queryMilestones';
import type {
  DagProgressSnapshot,
  DagVertexProgress,
  DagWorkState,
} from './DagProgress';

export type DagMilestoneQueryOptions = {
  readonly includeTransitiveMilestones?: boolean;
};

export type DagMilestoneQueryResult<VertexId = unknown> = Readonly<{
  reachedMilestones: readonly DagMilestone<VertexId>[];
  originalMilestoneConstraints: readonly DagMilestoneConstraint<VertexId>[];
  discoveryComplete: boolean;
}>;

/** Endpoint facts at the captured milestone; completed W need not satisfy C. */
export type DagMilestoneStatus =
  | { kind: 'live'; workState: DagWorkState; milestoneSatisfied: boolean }
  | { kind: 'omitted' | 'deleted' | 'unresolved' };

type WorkTarget<VertexId> = { vertexId: VertexId; milestone: 'workCompletion' };
type CompletionTarget<VertexId> = {
  vertexId: VertexId;
  milestone: 'subgraphCompletion';
};

/** Original unmet constraints followed by terminal scheduler facts in BFS order. */
export type DagMilestoneBlocker<VertexId = unknown> =
  | (DagMilestoneConstraint<VertexId> & {
      kind: 'unmetMilestoneConstraint';
      waiterStatus: DagMilestoneStatus;
      prerequisiteStatus: DagMilestoneStatus;
    })
  | {
      kind: 'workCompletionUncommitted';
      targetMilestone: WorkTarget<VertexId>;
      workState: Exclude<DagWorkState, 'workCompletionCommitted'>;
    }
  | {
      kind: 'childDiscoveryNotClosed' | 'subgraphCompletionCommitPending';
      targetMilestone: CompletionTarget<VertexId>;
    };

export type DagMilestoneExplanation<VertexId = unknown> =
  | Readonly<{
      kind: 'unresolved' | 'deleted';
      targetMilestone: DagMilestone<VertexId>;
      discoveryComplete: boolean;
    }>
  | Readonly<{
      kind: 'live';
      targetMilestone: DagMilestone<VertexId>;
      milestoneSatisfied: boolean;
      progress: DagVertexProgress<VertexId>;
      blockers: readonly DagMilestoneBlocker<VertexId>[];
      discoveryComplete: boolean;
    }>
  | Readonly<{
      kind: 'omitted';
      targetMilestone: DagMilestone<VertexId>;
      milestoneSatisfied: true;
      progress: null;
      blockers: readonly DagMilestoneBlocker<VertexId>[];
      discoveryComplete: boolean;
    }>;

/** Detached original constraints, independent of subsequent runner progress. */
export interface DagMilestoneSnapshot<VertexId = unknown> {
  explainMilestone(
    targetMilestone: DagMilestone<VertexId>,
  ): DagMilestoneExplanation<VertexId>;
  queryOriginalPrerequisiteMilestonesOf(
    targetMilestone: DagMilestone<VertexId>,
    options?: DagMilestoneQueryOptions,
  ): DagMilestoneQueryResult<VertexId>;
  queryOriginalDependentMilestonesOf(
    targetMilestone: DagMilestone<VertexId>,
    options?: DagMilestoneQueryOptions,
  ): DagMilestoneQueryResult<VertexId>;
}

/** @internal Captured once for navigation and progress explanations. */
export type DagInspectionSnapshot<VertexId> = {
  state: DagInspectionState<VertexId>;
  captureProgressSnapshot: DagProgressSnapshot<VertexId>;
  edges: readonly DagMilestoneConstraint<VertexId>[];
};

/** @internal No caller receives the captured state or adjacency records. */
export function makeDagInspection<VertexId>(
  snapshot: DagInspectionSnapshot<VertexId>,
): DagMilestoneSnapshot<VertexId> {
  const identities = new Map(
    snapshot.state.identityStates.map((item) => [item.vertexId, item.kind]),
  );
  const scheduling = new Map(
    snapshot.state.schedulingStates.map((item) => [item.vertexId, item]),
  );
  const status = (
    targetMilestone: DagMilestone<VertexId>,
  ): DagMilestoneStatus => {
    const kind = identities.get(targetMilestone.vertexId);
    if (kind !== 'live') return { kind: kind ?? 'unresolved' };
    const state = scheduling.get(targetMilestone.vertexId)!;
    return {
      kind: 'live',
      workState: snapshot.captureProgressSnapshot.progressByVertexId.get(
        targetMilestone.vertexId,
      )!.workState,
      milestoneSatisfied:
        targetMilestone.milestone === 'workCompletion'
          ? state.initialCommitted
          : state.completionCommitted,
    };
  };
  const milestoneSatisfied = (targetMilestone: DagMilestone<VertexId>) => {
    const endpoint = status(targetMilestone);
    return (
      endpoint.kind === 'omitted' ||
      (endpoint.kind === 'live' && endpoint.milestoneSatisfied)
    );
  };
  const copyProgress = (id: VertexId): DagVertexProgress<VertexId> => {
    const progress =
      snapshot.captureProgressSnapshot.progressByVertexId.get(id)!;
    return {
      ...progress,
      unmetPrerequisiteVertexIds: progress.unmetPrerequisiteVertexIds.slice(),
      unmetWorkMilestoneVertexIds: progress.unmetWorkMilestoneVertexIds.slice(),
      unmetSubgraphCompletionMilestoneVertexIds:
        progress.unmetSubgraphCompletionMilestoneVertexIds.slice(),
    };
  };
  const walk = makeMilestoneQuery(snapshot.edges);
  const explainMilestone = (
    input: DagMilestone<VertexId>,
  ): DagMilestoneExplanation<VertexId> => {
    const targetMilestone = {
      vertexId: input.vertexId,
      milestone: input.milestone,
    };
    const discoveryComplete = snapshot.state.discoveryComplete;
    const kind = identities.get(targetMilestone.vertexId);
    if (kind === undefined || kind === 'deleted')
      return {
        kind: kind === undefined ? 'unresolved' : kind,
        targetMilestone,
        discoveryComplete,
      };
    if (kind === 'omitted')
      return {
        kind: 'omitted',
        targetMilestone,
        milestoneSatisfied: true,
        progress: null,
        blockers: [],
        discoveryComplete,
      };
    const isSatisfied = milestoneSatisfied(targetMilestone);
    const blockers: DagMilestoneBlocker<VertexId>[] = [];
    if (!isSatisfied) {
      // Start unsatisfied and admit only unmet endpoints: satisfied nodes never enter the queue.
      const reachable = walk(
        targetMilestone,
        'prerequisites',
        true,
        (edge) => !milestoneSatisfied(edge.prerequisiteMilestone),
      );
      const blockedWork = new Set<VertexId>();
      for (const edge of reachable.edges) {
        blockers.push({
          ...edge,
          kind: 'unmetMilestoneConstraint',
          waiterStatus: status(edge.waitingMilestone),
          prerequisiteStatus: status(edge.prerequisiteMilestone),
        });
        if (edge.waitingMilestone.milestone === 'workCompletion')
          blockedWork.add(edge.waitingMilestone.vertexId);
      }
      for (const current of [targetMilestone, ...reachable.milestones]) {
        const endpoint = status(current);
        if (endpoint.kind !== 'live') continue;
        if (current.milestone === 'workCompletion') {
          // Engine W state and initialCommitted agree; unsatisfied W cannot be completed.
          if (!blockedWork.has(current.vertexId))
            blockers.push({
              kind: 'workCompletionUncommitted',
              targetMilestone: {
                vertexId: current.vertexId,
                milestone: 'workCompletion',
              },
              workState: endpoint.workState as Exclude<
                DagWorkState,
                'workCompletionCommitted'
              >,
            });
        } else {
          const state = scheduling.get(current.vertexId)!;
          if (state.expansion !== 'closed')
            blockers.push({
              kind: 'childDiscoveryNotClosed',
              targetMilestone: {
                vertexId: current.vertexId,
                milestone: 'subgraphCompletion',
              },
            });
          else if (state.initialCommitted && state.remainingChildren === 0)
            blockers.push({
              kind: 'subgraphCompletionCommitPending',
              targetMilestone: {
                vertexId: current.vertexId,
                milestone: 'subgraphCompletion',
              },
            });
        }
      }
    }
    return {
      kind: 'live',
      targetMilestone,
      milestoneSatisfied: isSatisfied,
      progress: copyProgress(targetMilestone.vertexId),
      blockers,
      discoveryComplete,
    };
  };
  const query = (
    input: DagMilestone<VertexId>,
    direction: 'prerequisites' | 'dependents',
    options: DagMilestoneQueryOptions = {},
  ): DagMilestoneQueryResult<VertexId> => {
    const targetMilestone = {
      vertexId: input.vertexId,
      milestone: input.milestone,
    };
    const result = identities.has(targetMilestone.vertexId)
      ? walk(
          targetMilestone,
          direction,
          options.includeTransitiveMilestones ?? false,
        )
      : { milestones: [], edges: [] };
    return {
      reachedMilestones: result.milestones,
      originalMilestoneConstraints: result.edges,
      discoveryComplete: snapshot.state.discoveryComplete,
    };
  };
  return {
    explainMilestone,
    queryOriginalPrerequisiteMilestonesOf: (targetMilestone, options) =>
      query(targetMilestone, 'prerequisites', options),
    queryOriginalDependentMilestonesOf: (targetMilestone, options) =>
      query(targetMilestone, 'dependents', options),
  };
}
