import type { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { GraphWalkPhase } from '../GraphWalkPhase';

export type GraphWalkCounts = Readonly<{
  /** Attempted root/link reads, including done results and cached route replay. */
  candidateReadAttempts: number;
  /** Distinct roots and eligible followed links, including omissions and returns. */
  admittedTargets: number;
  uniqueFoundVertices: number;
  uniqueOmittedVertices: number;
  /** Fresh source links read before filtering; cached replay is not recounted. */
  discoveredLinks: number;
  /** Per-phase acknowledged observations, independent of callback/delivery filters. */
  processedObservations: Readonly<Record<GraphWalkPhase, number>>;
}>;
export type GraphWalkOutcome =
  | { readonly kind: 'exhausted' | 'closed' }
  | {
      readonly kind: 'limited';
      readonly reasons: readonly (
        | 'maxDepth'
        | 'maxAdmittedTargets'
        | 'maxCandidateReadAttempts'
      )[];
    }
  | { readonly kind: 'failed'; readonly error: unknown };
export type GraphWalkSummary = Readonly<{
  status: TraversalRunnerStatus;
  counts: GraphWalkCounts;
  outcome: GraphWalkOutcome | null;
}>;
