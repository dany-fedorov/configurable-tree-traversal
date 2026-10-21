import type { VertexId } from '@core/graph/types';
import type { DagTraversalStallDiagnostics } from '@core/errors/DagTraversalStallError';

export const DEFER_READY: unique symbol = Symbol('DEFER_READY');
export type DagSettlementGeneration = symbol;
export type DagSettlementOutcome = { ok: true } | { ok: false; error: unknown };
export type DagWorkState =
  | 'pending'
  | 'ready'
  | 'running'
  | 'deferred'
  | 'succeeded';
export type DagVertexProgress = Readonly<{
  id: VertexId;
  work: DagWorkState;
  subtreeComplete: boolean;
  unmetPrerequisiteIds: readonly VertexId[];
  generation?: DagSettlementGeneration;
}>;
export type DagSummary = Readonly<{
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
  vertices: ReadonlyMap<VertexId, DagVertexProgress>;
  readyIds: readonly VertexId[];
  deferredIds: readonly VertexId[];
  inFlightIds: readonly VertexId[];
  completedWorkIds: readonly VertexId[];
  completedSubtreeIds: readonly VertexId[];
  unusedCompletedWorkIds: readonly VertexId[];
  diagnostics: DagTraversalStallDiagnostics | null;
}>;
