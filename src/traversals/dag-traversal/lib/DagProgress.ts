import type { DagTraversalStallDiagnostics } from '@core/errors/DagTraversalStallError';

/** @deprecated Return the DEFER_WORK_COMPLETION visitor command instead. */
export const DEFER_READY: unique symbol = Symbol('DEFER_READY');
export type DagSettlementGeneration = symbol;
export type DagDeferredWork<ID = unknown> = Readonly<{
  vertexId: ID;
  generation: DagSettlementGeneration;
}>;
export type DagSettlementOutcome =
  | { kind: 'workCompleted'; ok?: never; error?: never }
  | { kind: 'traversalFailed'; error: unknown; ok?: never }
  /** @deprecated Use { kind: 'workCompleted' } instead. */
  | { ok: true; kind?: never; error?: never }
  /** @deprecated Use { kind: 'traversalFailed', error } instead. */
  | { ok: false; error: unknown; kind?: never };
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
  /** Exact W waits; always present in engine-produced summaries. */
  unmetWorkPrerequisiteIds?: readonly ID[];
  unmetSubgraphPrerequisiteIds?: readonly ID[];
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
