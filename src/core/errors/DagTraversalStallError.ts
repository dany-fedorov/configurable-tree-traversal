import { createVertexIdLabeler } from '@core/graph/identity';

/** A vertex milestone in the original declared dependency constraints. */
export type DagMilestone<VertexId = unknown> = {
  vertexId: VertexId;
  milestone: 'workCompletion' | 'subgraphCompletion';
};

/** Direction means waiter waits for prerequisite, independently of accepted work seeds. */
export type DagMilestoneConstraint<VertexId = unknown> = {
  waitingMilestone: DagMilestone<VertexId>;
  prerequisiteMilestone: DagMilestone<VertexId>;
  reason:
    | 'workDependency'
    | 'subgraphCompletionDependency'
    | 'ownWork'
    | 'structuralChild';
};

export type DagTraversalStallDiagnostics<VertexId = unknown> = {
  blockedVertexPrerequisiteReports: Array<{
    vertexId: VertexId;
    unmetPrerequisiteVertexIds: VertexId[];
  }>;
  unresolvedPrerequisiteVertexIds: VertexId[];
  /** Strongly connected component membership, not ordered cycle witnesses. */
  milestoneCycleVertexIdComponents: VertexId[][];
  originalMilestoneConstraints: DagMilestoneConstraint<VertexId>[];
  nonCyclePrerequisiteBlockedVertexIds: VertexId[];
  incompleteVertexIdsWithoutUnmetPrerequisites: VertexId[];
};

// Keep legacy constructor calls in the unknown domain (including heterogeneous
// IDs); explicit type arguments validate diagnostics on TypeScript 4.7 too.
type DiagnosticId<VertexId> = [VertexId][VertexId extends unknown ? 0 : never];

/** Explicit ID annotations type diagnostics; arbitrary catches retain the unknown ID domain. */
export class DagTraversalStallError<VertexId = unknown> extends Error {
  readonly diagnostics: DagTraversalStallDiagnostics<VertexId>;

  constructor(
    diagnostics: Omit<
      DagTraversalStallDiagnostics<DiagnosticId<VertexId>>,
      'originalMilestoneConstraints'
    > &
      Partial<
        Pick<
          DagTraversalStallDiagnostics<DiagnosticId<VertexId>>,
          'originalMilestoneConstraints'
        >
      >,
  ) {
    const ids = diagnostics.blockedVertexPrerequisiteReports.flatMap(
      ({ vertexId, unmetPrerequisiteVertexIds }) => [
        vertexId,
        ...unmetPrerequisiteVertexIds,
      ],
    );
    const detail =
      ids.length > 0
        ? ids.map(createVertexIdLabeler()).join(', ')
        : 'incomplete work';
    super(`DAG traversal stalled: ${detail}`);
    this.name = 'DagTraversalStallError';
    this.diagnostics = {
      blockedVertexPrerequisiteReports:
        diagnostics.blockedVertexPrerequisiteReports.map(
          ({ vertexId, unmetPrerequisiteVertexIds }) => ({
            vertexId,
            unmetPrerequisiteVertexIds:
              unmetPrerequisiteVertexIds.slice(),
          }),
        ),
      unresolvedPrerequisiteVertexIds:
        diagnostics.unresolvedPrerequisiteVertexIds.slice(),
      milestoneCycleVertexIdComponents:
        diagnostics.milestoneCycleVertexIdComponents.map((ids) => ids.slice()),
      originalMilestoneConstraints: (
        diagnostics.originalMilestoneConstraints ?? []
      ).map((edge) => ({
        waitingMilestone: { ...edge.waitingMilestone },
        prerequisiteMilestone: { ...edge.prerequisiteMilestone },
        reason: edge.reason,
      })),
      nonCyclePrerequisiteBlockedVertexIds:
        diagnostics.nonCyclePrerequisiteBlockedVertexIds.slice(),
      incompleteVertexIdsWithoutUnmetPrerequisites:
        diagnostics.incompleteVertexIdsWithoutUnmetPrerequisites.slice(),
    };
  }
}
