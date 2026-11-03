import type {
  TraversalRunnerStatus,
  TraversalStopReason,
} from './TraversalRunner';

/** Common observational state shared by independent traversal engines. */
export interface TraversalExecutionSnapshot {
  readonly traversalLifecycleStatus: TraversalRunnerStatus;
  readonly traversalStopReason: TraversalStopReason | null;
  readonly pauseRequested: boolean;
  readonly traversalAlgorithm: string;
  readonly callbackExecutionMode: 'sync' | 'async';
  readonly inFlightInvocationCount: number;
  readonly bufferedDeliveryEventCount: number;
}
