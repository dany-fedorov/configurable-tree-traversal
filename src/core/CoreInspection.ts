import type { OwnerToken, VisitPhase } from '@core/effects/types';
import type {
  TraversalRunnerStatus,
  TraversalStopReason,
} from '@core/TraversalRunner';
import type {
  EmissionKind,
  VisitorPhaseSelection,
} from './TraversalRunnerIterableConfig';

export type InspectionFilters<
  Phase extends string = VisitPhase,
  EmittedKind extends string = EmissionKind<Phase>,
> = Readonly<{
  emitEvents: readonly EmittedKind[];
  visitorPhases: VisitorPhaseSelection<Phase>;
}>;

/** Public callbacks observed by a tree or DAG runner. Engine effect keys stay private. */
export type TreeDagInspectionOperation =
  | 'resolveRoot'
  | 'resolveChild'
  | 'resolvePrerequisite'
  | 'sortChildrenHints'
  | 'getVertexIdFromHint'
  | 'visit';

export type KernelInspection<Phase extends string = VisitPhase> = Readonly<{
  status: TraversalRunnerStatus;
  stopReason: TraversalStopReason | null;
  pauseRequested: boolean;
  kind: 'depth-first' | 'breadth-first' | 'dag';
  execution: 'sync' | 'async';
  sourceMode: 'tree' | 'graph';
  concurrency: number;
  hasSorter: boolean;
  hasHintIds: boolean;
  executionOptions: InspectionFilters<Phase>;
  readyVisits: readonly Readonly<{
    vertexRefId: string;
    phase: Phase;
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
    phase: Phase;
    state: 'running' | 'paused' | 'done' | 'invalid';
    commandCommitMode: import('@core/TraversalVisitor').CommandCommitMode;
    visitorIndex: number;
    waitingFor: 'none' | 'callback' | 'batch';
    executionOptions: InspectionFilters<Phase>;
  }>[];
  pendingRequests: readonly Readonly<{
    requestId: number;
    operation: TreeDagInspectionOperation;
    owner: Readonly<OwnerToken>;
    valid: boolean;
  }>[];
  pendingEventBoundaryCount: number;
}>;

export type DriverInspection<Phase extends string = VisitPhase> =
  KernelInspection<Phase> & Readonly<{ inFlightCallbackCount: number }>;

export type TreeDagExecutionInspection<Phase extends string = VisitPhase> =
  DriverInspection<Phase> & Readonly<{ bufferedEventCount: number }>;
