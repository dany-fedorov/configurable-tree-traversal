import type {
  TraversalRunnerStatus,
  TraversalStopReason,
} from './TraversalRunner';

/** Common observational state shared by independent traversal engines. */
export interface ExecutionInspection {
  readonly status: TraversalRunnerStatus;
  readonly stopReason: TraversalStopReason | null;
  readonly pauseRequested: boolean;
  readonly kind: string;
  readonly execution: 'sync' | 'async';
  readonly inFlightCallbackCount: number;
  readonly bufferedEventCount: number;
}
