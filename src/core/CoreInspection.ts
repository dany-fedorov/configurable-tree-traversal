import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversalRunnerStatus } from '@core/TraversalRunner';
import type {
  CallbackValues,
  OwnerToken,
  VisitOrder,
} from '@core/effects/types';

export type InspectionFilters = Readonly<{
  iterateOver: readonly VisitOrder[];
  enableVisitorFunctionsFor: readonly VisitOrder[] | null;
  disableVisitorFunctionsFor: readonly VisitOrder[] | null;
}>;

export type KernelInspection = Readonly<{
  status: TraversalRunnerStatus;
  haltRequested: boolean;
  kind: 'depth-first' | 'breadth-first' | 'dag';
  execution: 'sync' | 'async';
  sourceMode: 'tree' | 'graph';
  concurrency: number;
  hasSorter: boolean;
  hasHintIds: boolean;
  iterableConfig: InspectionFilters;
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
    group: 'concurrent' | 'sequential';
    position: number;
    waitingFor: 'none' | 'callback' | 'batch';
    config: InspectionFilters;
  }>[];
  pendingRequests: readonly Readonly<{
    requestId: number;
    kind: keyof CallbackValues<TreeTypeParameters>;
    owner: Readonly<OwnerToken>;
    valid: boolean;
  }>[];
  pendingEventBoundaryCount: number;
}>;

export type DriverInspection = KernelInspection &
  Readonly<{ inFlightCallbackCount: number }>;

export type CoreInspection = DriverInspection &
  Readonly<{ bufferedEventCount: number }>;
