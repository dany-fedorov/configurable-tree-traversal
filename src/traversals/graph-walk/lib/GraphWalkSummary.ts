import type { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { GraphWalkPhase } from '../GraphWalkPhase';

export type GraphWalkCounts = Readonly<{
  steps: number;
  occurrences: number;
  foundVertices: number;
  omittedVertices: number;
  observedLinks: number;
  observations: Readonly<Record<GraphWalkPhase, number>>;
}>;
export type GraphWalkOutcome =
  | { readonly kind: 'exhausted' | 'closed' }
  | {
      readonly kind: 'limited';
      readonly reasons: readonly ('maxDepth' | 'maxOccurrences' | 'maxSteps')[];
    }
  | { readonly kind: 'failed'; readonly error: unknown };
export type GraphWalkSummary = Readonly<{
  status: TraversalRunnerStatus;
  counts: GraphWalkCounts;
  outcome: GraphWalkOutcome | null;
}>;
