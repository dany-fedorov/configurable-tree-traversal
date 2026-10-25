import type { DagTraversalStallDiagnostics } from '@core/errors/DagTraversalStallError';

/** @deprecated Return the DEFER_READY visitor command instead. */
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
  | 'running'
  | 'deferred'
  | 'completed';
export type DagVertexProgress<ID = unknown> = Readonly<{
  id: ID;
  work: DagWorkState;
  subtreeComplete: boolean;
  unmetPrerequisiteIds: readonly ID[];
  unmetCompletePrerequisiteIds?: readonly ID[];
  generation?: DagSettlementGeneration;
}>;
export type DagSummary<ID = unknown> = Readonly<{
  discovery: Readonly<{ mode: 'lazy' | 'eager'; complete: boolean }>;
  counts: Readonly<{
    discovered: number;
    pending: number;
    ready: number;
    deferred: number;
    inFlight: number;
    workCompleted: number;
    subtreeCompleted: number;
  }>;
  vertices: ReadonlyMap<ID, DagVertexProgress<ID>>;
  readyIds: readonly ID[];
  deferredIds: readonly ID[];
  deferredFrontier: readonly DagDeferredWork<ID>[];
  inFlightIds: readonly ID[];
  completedWorkIds: readonly ID[];
  completedSubtreeIds: readonly ID[];
  unusedCompletedWorkIds: readonly ID[];
  diagnostics: DagTraversalStallDiagnostics<ID> | null;
}>;
