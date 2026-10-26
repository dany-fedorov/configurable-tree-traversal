import type { MaybePromise } from '@core/graph/types';
import type { VisitorPhaseInput } from '@core/TraversalVisitor';
import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';
import type { GraphWalkPhase } from './GraphWalkPhase';
import type {
  GraphWalkSource,
  AsyncGraphWalkSource,
  GraphWalkVertex,
} from './GraphWalkSource';
import type { GraphWalkEdge, GraphWalkPathEvent } from './GraphWalkEvent';
import type {
  GraphWalkVisitor,
  AsyncGraphWalkVisitor,
} from './GraphWalkVisitor';

export type GraphWalkStrategy = 'breadthFirst' | 'depthFirst';
export type GraphWalkRevisitPolicy = 'once' | 'simplePaths' | 'walks';
export type GraphWalkLimits = {
  /** Maximum route depth; gates expansion after the expansion predicate. */
  maxDepth?: number;
  /** Distinct roots and eligible followed links, including returning/omitted targets. */
  maxAdmittedTargets?: number;
  /** Root/link read attempts, including exhaustion, filtering, and cached replay. */
  maxCandidateReadAttempts?: number;
};
export type GraphWalkRevisitOptions =
  | { revisit?: 'once'; limits?: GraphWalkLimits }
  | {
      revisit: 'simplePaths' | 'walks';
      limits: GraphWalkLimits &
        ({ maxDepth: number } | { maxCandidateReadAttempts: number });
    };

export type GraphWalkRouteContext<Data, Edge, ID> =
  | Readonly<{ revisit: 'once' }>
  | Readonly<{
      revisit: 'simplePaths' | 'walks';
      path: GraphWalkPathEvent<Data, Edge, ID>;
    }>;
export type GraphWalkExpandContext<Data, Edge, ID> = GraphWalkRouteContext<
  Data,
  Edge,
  ID
> &
  Readonly<{
    depth: number;
    via: GraphWalkEdge<Edge, ID> | null;
  }>;
export type GraphWalkFollowContext<Data, Edge, ID> = GraphWalkRouteContext<
  Data,
  Edge,
  ID
> &
  Readonly<{
    source: GraphWalkVertex<Data, ID>;
    depth: number;
  }>;
export type GraphWalkExpansionPredicate<Data, Edge, ID> = (
  vertex: GraphWalkVertex<Data, ID>,
  context: GraphWalkExpandContext<Data, Edge, ID>,
) => boolean;
export type AsyncGraphWalkExpansionPredicate<Data, Edge, ID> = (
  vertex: GraphWalkVertex<Data, ID>,
  context: GraphWalkExpandContext<Data, Edge, ID>,
) => MaybePromise<boolean>;
export type GraphWalkEdgePredicate<Data, Edge, ID> = (
  edge: GraphWalkEdge<Edge, ID>,
  context: GraphWalkFollowContext<Data, Edge, ID>,
) => boolean;
export type AsyncGraphWalkEdgePredicate<Data, Edge, ID> = (
  edge: GraphWalkEdge<Edge, ID>,
  context: GraphWalkFollowContext<Data, Edge, ID>,
) => MaybePromise<boolean>;

type GraphWalkFields<Data, Edge, ID> = {
  source: GraphWalkSource<Data, Edge, ID>;
  strategy?: GraphWalkStrategy;
  /** Null clears the predicate; omitted/undefined patches retain it. */
  shouldFollowEdge?: GraphWalkEdgePredicate<Data, Edge, ID> | null | undefined;
  /** Null clears the predicate; omitted/undefined patches retain it. */
  shouldExpandVertex?:
    | GraphWalkExpansionPredicate<Data, Edge, ID>
    | null
    | undefined;
  visitors?: {
    [Phase in GraphWalkPhase]?: VisitorPhaseInput<
      GraphWalkVisitor<Data, Edge, Phase, ID>
    >;
  };
} & TraversalIterableConfigInput<GraphWalkPhase>;
type AsyncGraphWalkFields<Data, Edge, ID> = {
  source: AsyncGraphWalkSource<Data, Edge, ID>;
  strategy?: GraphWalkStrategy;
  /** Null clears the predicate; omitted/undefined patches retain it. */
  shouldFollowEdge?:
    | AsyncGraphWalkEdgePredicate<Data, Edge, ID>
    | null
    | undefined;
  /** Null clears the predicate; omitted/undefined patches retain it. */
  shouldExpandVertex?:
    | AsyncGraphWalkExpansionPredicate<Data, Edge, ID>
    | null
    | undefined;
  visitors?: {
    [Phase in GraphWalkPhase]?: VisitorPhaseInput<
      AsyncGraphWalkVisitor<Data, Edge, Phase, ID>
    >;
  };
} & TraversalIterableConfigInput<GraphWalkPhase>;

export type GraphWalkOptions<Data, Edge, ID> = GraphWalkFields<Data, Edge, ID> &
  GraphWalkRevisitOptions;
export type AsyncGraphWalkOptions<Data, Edge, ID> = AsyncGraphWalkFields<
  Data,
  Edge,
  ID
> &
  GraphWalkRevisitOptions;
/** Atomic top-level patch. Supplied limits replace the previous limits record;
 * the merged revisit policy must still have a depth or candidate-read bound. */
export type GraphWalkConfigureInput<Data, Edge, ID> = Partial<
  GraphWalkFields<Data, Edge, ID>
> & {
  revisit?: GraphWalkRevisitPolicy;
  limits?: GraphWalkLimits;
};
/** Async counterpart with the same atomic patch and limits replacement rules. */
export type AsyncGraphWalkConfigureInput<Data, Edge, ID> = Partial<
  AsyncGraphWalkFields<Data, Edge, ID>
> & {
  revisit?: GraphWalkRevisitPolicy;
  limits?: GraphWalkLimits;
};
