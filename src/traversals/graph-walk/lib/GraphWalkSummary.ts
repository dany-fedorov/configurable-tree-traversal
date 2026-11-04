import type { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { GraphWalkObservationKind } from '../GraphWalkPhase';

export type GraphWalkProgressCounts = Readonly<{
  /** Attempted root/link reads, including done results and cached route replay. */
  rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: number;
  /** Distinct roots and eligible followed links, including omissions and returns. */
  admittedRootOrLinkTargetOccurrences: number;
  resolvedFoundVertexIdCount: number;
  resolvedOmittedVertexIdCount: number;
  /** Fresh source links read before filtering; cached replay is not recounted. */
  freshSourceOutgoingLinkCount: number;
  /** Per-kind acknowledged observations, independent of callback/delivery filters. */
  acknowledgedObservationCountsByKind: Readonly<
    Record<GraphWalkObservationKind, number>
  >;
}>;
export type GraphWalkTerminalOutcome =
  | { readonly kind: 'explorationExhausted' | 'permanentlyClosedByCaller' }
  | {
      readonly kind: 'traversalLimitsReached';
      readonly reachedLimits: readonly (
        | 'maxRouteHopDepth'
        | 'maxAdmittedRootOrLinkTargetOccurrences'
        | 'maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay'
      )[];
    }
  | { readonly kind: 'failed'; readonly error: unknown };
export type GraphWalkProgressSnapshot = Readonly<{
  status: TraversalRunnerStatus;
  counts: GraphWalkProgressCounts;
  terminalOutcome: GraphWalkTerminalOutcome | null;
}>;
