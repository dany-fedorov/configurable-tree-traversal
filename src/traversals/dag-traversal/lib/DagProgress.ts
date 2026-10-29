import type { DagTraversalStallDiagnostics } from '@core/errors/DagTraversalStallError';

export type DagSettlementGeneration = symbol;
export type DagDeferredWork<ID = unknown> = Readonly<{
  vertexId: ID;
  generation: DagSettlementGeneration;
}>;
export type DagSettlementOutcome =
  | { kind: 'workCompleted'; ok?: never; error?: never }
  | { kind: 'traversalFailed'; error: unknown; ok?: never };
export type DagWorkState =
  | 'pending'
  | 'ready'
  | 'visiting'
  | 'deferred'
  | 'completed';
export type DagVertexProgress<ID = unknown> = Readonly<{
  vertexId: ID;
  work: DagWorkState;
  subgraphComplete: boolean;
  unmetPrerequisiteIds: readonly ID[];
  /** Exact W waits, independent of C waits even when their IDs overlap. */
  unmetWorkPrerequisiteIds: readonly ID[];
  unmetSubgraphPrerequisiteIds: readonly ID[];
  generation?: DagSettlementGeneration;
}>;
export type DagSummary<ID = unknown> = Readonly<{
  discovery: Readonly<{ mode: 'lazy' | 'eager'; complete: boolean }>;
  counts: Readonly<{
    discovered: number;
    pending: number;
    readyOrDeferred: number;
    deferredWork: number;
    activeVisitorVertices: number;
    workCompleted: number;
    subgraphCompleted: number;
  }>;
  vertices: ReadonlyMap<ID, DagVertexProgress<ID>>;
  readyOrDeferredIds: readonly ID[];
  deferredWorkIds: readonly ID[];
  awaitingSettlement: readonly DagDeferredWork<ID>[];
  activeVisitorVertexIds: readonly ID[];
  completedWorkIds: readonly ID[];
  completedSubgraphIds: readonly ID[];
  unusedCompletedWorkIds: readonly ID[];
  diagnostics: DagTraversalStallDiagnostics<ID> | null;
}>;
