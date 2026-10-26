import type {
  CallbackValues,
  OwnerToken,
  VisitOrder,
} from '@core/effects/types';
import type {
  TraversalRunnerStatus,
  TraversalStopReason,
} from '@core/TraversalRunner';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type {
  EmissionKind,
  VisitorPhaseSelection,
} from './TraversalRunnerIterableConfig';

export type InspectionFilters<
  Phase extends string = VisitOrder,
  EmittedKind extends string = EmissionKind<Phase>,
> = Readonly<{
  emitEvents: readonly EmittedKind[];
  visitorPhases: VisitorPhaseSelection<Phase>;
}>;

export type KernelInspection = Readonly<{
  status: TraversalRunnerStatus;
  stopReason: TraversalStopReason | null;
  pauseRequested: boolean;
  kind: 'depth-first' | 'breadth-first' | 'dag';
  execution: 'sync' | 'async';
  sourceMode: 'tree' | 'graph';
  concurrency: number;
  hasSorter: boolean;
  hasHintIds: boolean;
  executionOptions: InspectionFilters;
  readyVisits: readonly Readonly<{
    vertexRefId: string;
    order: VisitOrder;
  }>[];
  frames: readonly Readonly<{
    owner: Readonly<OwnerToken>;
    vertexRefId: string;
    stage:
      | 'sort'
      | 'identify'
      | 'resolve'
      | 'closed'
      | import('@depth-first-traversal/lib/DepthFirstPolicy').DepthFirstFrameStage;
    pendingIndices: readonly number[];
  }>[];
  chains: readonly Readonly<{
    owner: Readonly<OwnerToken>;
    vertexRefId: string;
    order: VisitOrder;
    phase: 'running' | 'paused' | 'done' | 'invalid';
    commandCommitMode: import('@core/TraversalVisitor').CommandCommitMode;
    /** @deprecated Use commandCommitMode. */
    group: 'concurrent' | 'sequential';
    position: number;
    waitingFor: 'none' | 'callback' | 'batch';
    config: InspectionFilters;
  }>[];
  pendingRequests: readonly Readonly<{
    requestId: number;
    kind: keyof CallbackValues<VertexTypes>;
    owner: Readonly<OwnerToken>;
    valid: boolean;
  }>[];
  pendingEventBoundaryCount: number;
}>;

export type DriverInspection = KernelInspection &
  Readonly<{ inFlightCallbackCount: number }>;

export type CoreInspection = DriverInspection &
  Readonly<{ bufferedEventCount: number }>;
