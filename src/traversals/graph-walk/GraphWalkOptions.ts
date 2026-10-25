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
  maxDepth?: number;
  maxOccurrences?: number;
  maxSteps?: number;
};
export type GraphWalkRevisitOptions =
  | { revisit?: 'once'; limits?: GraphWalkLimits }
  | {
      revisit: 'simplePaths' | 'walks';
      limits: GraphWalkLimits & ({ maxDepth: number } | { maxSteps: number });
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
export type GraphWalkExpandVertex<Data, Edge, ID> = (
  vertex: GraphWalkVertex<Data, ID>,
  context: GraphWalkExpandContext<Data, Edge, ID>,
) => boolean;
export type AsyncGraphWalkExpandVertex<Data, Edge, ID> = (
  vertex: GraphWalkVertex<Data, ID>,
  context: GraphWalkExpandContext<Data, Edge, ID>,
) => MaybePromise<boolean>;
export type GraphWalkFollowEdge<Data, Edge, ID> = (
  edge: GraphWalkEdge<Edge, ID>,
  context: GraphWalkFollowContext<Data, Edge, ID>,
) => boolean;
export type AsyncGraphWalkFollowEdge<Data, Edge, ID> = (
  edge: GraphWalkEdge<Edge, ID>,
  context: GraphWalkFollowContext<Data, Edge, ID>,
) => MaybePromise<boolean>;

type GraphWalkFields<Data, Edge, ID> = {
  source: GraphWalkSource<Data, Edge, ID>;
  strategy?: GraphWalkStrategy;
  followEdge?: GraphWalkFollowEdge<Data, Edge, ID>;
  expandVertex?: GraphWalkExpandVertex<Data, Edge, ID>;
  visitors?: {
    [Phase in GraphWalkPhase]?: VisitorPhaseInput<
      GraphWalkVisitor<Data, Edge, Phase, ID>
    >;
  };
} & TraversalIterableConfigInput<GraphWalkPhase>;
type AsyncGraphWalkFields<Data, Edge, ID> = {
  source: AsyncGraphWalkSource<Data, Edge, ID>;
  strategy?: GraphWalkStrategy;
  followEdge?: AsyncGraphWalkFollowEdge<Data, Edge, ID>;
  expandVertex?: AsyncGraphWalkExpandVertex<Data, Edge, ID>;
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
 * the merged revisit policy must still have a depth or step bound. */
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
