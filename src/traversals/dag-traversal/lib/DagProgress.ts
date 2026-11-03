import type { DagTraversalStallDiagnostics } from '@core/errors/DagTraversalStallError';

export type DagWorkSettlementToken = symbol;
export type DagWorkAwaitingSettlement<VertexId = unknown> = Readonly<{
  vertexId: VertexId;
  settlementToken: DagWorkSettlementToken;
}>;
export type DagSettlementOutcome =
  | { kind: 'workCompleted'; ok?: never; error?: never }
  | { kind: 'traversalFailed'; error: unknown; ok?: never };
export type DagWorkState =
  | 'waitingForPrerequisiteMilestones'
  | 'readyForWorkVisitorAdmission'
  | 'workVisitorChainAdmitted'
  | 'workCompletionDeferred'
  | 'workCompletionCommitted';
export type DagVertexProgress<VertexId = unknown> = Readonly<{
  vertexId: VertexId;
  workState: DagWorkState;
  subgraphCompletionCommitted: boolean;
  unmetPrerequisiteVertexIds: readonly VertexId[];
  /** Exact W waits, independent of C waits even when their IDs overlap. */
  unmetWorkMilestoneVertexIds: readonly VertexId[];
  unmetSubgraphCompletionMilestoneVertexIds: readonly VertexId[];
  settlementToken?: DagWorkSettlementToken;
}>;
export type DagProgressSnapshot<VertexId = unknown> = Readonly<{
  discovery: Readonly<{
    timing: 'incrementalDuringTraversal' | 'completeBeforeAnyVisitor';
    complete: boolean;
  }>;
  counts: Readonly<{
    retainedLiveVertices: number;
    verticesWaitingForPrerequisiteMilestones: number;
    workVisitorReadyOrWorkCompletionDeferredVertices: number;
    workCompletionDeferredVertices: number;
    verticesWithAdmittedVisitorChains: number;
    workCompletionCommittedVertices: number;
    subgraphCompletionCommittedVertices: number;
  }>;
  progressByVertexId: ReadonlyMap<VertexId, DagVertexProgress<VertexId>>;
  workVisitorReadyOrWorkCompletionDeferredVertexIds: readonly VertexId[];
  workCompletionDeferredVertexIds: readonly VertexId[];
  workAwaitingSettlement: readonly DagWorkAwaitingSettlement<VertexId>[];
  admittedVisitorChainVertexIds: readonly VertexId[];
  workCompletionCommittedVertexIds: readonly VertexId[];
  subgraphCompletionCommittedVertexIds: readonly VertexId[];
  unmatchedCompletedWorkSeedVertexIds: readonly VertexId[];
  invalidDependencyTopologyDiagnostics: DagTraversalStallDiagnostics<VertexId> | null;
}>;
