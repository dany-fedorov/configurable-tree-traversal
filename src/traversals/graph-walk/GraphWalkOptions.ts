type OptionalFieldsAllowingUndefined<T> = { [K in keyof T]?: T[K] | undefined };
import type { MaybePromise } from '@core/graph/types';
import type { TraversalExecutionSelectionPatch } from '@core/TraversalRunnerIterableConfig';
import type { VisitorDefinitionsForPhase } from '@core/TraversalVisitor';
import type {
  GraphWalkEdge,
  GraphWalkRoutePrefixEvent,
} from './GraphWalkEvent';
import type { GraphWalkObservationKind } from './GraphWalkPhase';
import type {
  AsyncGraphWalkDiscoverySource,
  GraphWalkDiscoverySource,
  GraphWalkResolvedVertex,
} from './GraphWalkSource';
import type {
  AsyncGraphWalkVisitor,
  GraphWalkVisitor,
} from './GraphWalkVisitor';

export type GraphWalkExpansionOrder = 'breadthFirst' | 'depthFirst';
export type GraphWalkRouteEnumerationPolicy =
  | 'firstAdmittedFoundRoutePerVertex'
  | 'allVertexSimpleRoutePrefixes'
  | 'allRoutePrefixesAllowingRepeatedVertices';
export type GraphWalkExplorationLimits = {
  /** Maximum route depth; gates expansion after the expansion predicate. */
  maxRouteHopDepth?: number;
  /** Distinct roots and eligible followed links, including returning/omitted targets. */
  maxAdmittedRootOrLinkTargetOccurrences?: number;
  /** Root/link read attempts, including exhaustion, filtering, and cached replay. */
  maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay?: number;
};
export type GraphWalkRouteEnumerationAndRequiredBounds =
  | {
      routeEnumerationPolicy?: 'firstAdmittedFoundRoutePerVertex';
      limits?: GraphWalkExplorationLimits;
    }
  | {
      routeEnumerationPolicy:
        | 'allVertexSimpleRoutePrefixes'
        | 'allRoutePrefixesAllowingRepeatedVertices';
      limits: GraphWalkExplorationLimits &
        (
          | { maxRouteHopDepth: number }
          | { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: number }
        );
    };

export type GraphWalkRouteEnumerationContext<VertexData, EdgeData, VertexId> =
  | Readonly<{ routeEnumerationPolicy: 'firstAdmittedFoundRoutePerVertex' }>
  | Readonly<{
      routeEnumerationPolicy:
        | 'allVertexSimpleRoutePrefixes'
        | 'allRoutePrefixesAllowingRepeatedVertices';
      routePrefix: GraphWalkRoutePrefixEvent<VertexData, EdgeData, VertexId>;
    }>;
export type GraphWalkVertexOccurrenceExpansionContext<
  VertexData,
  EdgeData,
  VertexId,
> = GraphWalkRouteEnumerationContext<VertexData, EdgeData, VertexId> &
  Readonly<{
    vertexHopDepth: number;
    incomingEdgeFromParentRouteOccurrence: GraphWalkEdge<
      EdgeData,
      VertexId
    > | null;
  }>;
export type GraphWalkLinkTargetAdmissionContext<
  VertexData,
  EdgeData,
  VertexId,
> = GraphWalkRouteEnumerationContext<VertexData, EdgeData, VertexId> &
  Readonly<{
    fromVertex: GraphWalkResolvedVertex<VertexData, VertexId>;
    targetHopDepth: number;
  }>;
export type GraphWalkVertexOccurrenceExpansionPredicate<
  VertexData,
  EdgeData,
  VertexId,
> = (
  vertex: GraphWalkResolvedVertex<VertexData, VertexId>,
  context: GraphWalkVertexOccurrenceExpansionContext<
    VertexData,
    EdgeData,
    VertexId
  >,
) => boolean;
export type AsyncGraphWalkVertexOccurrenceExpansionPredicate<
  VertexData,
  EdgeData,
  VertexId,
> = (
  vertex: GraphWalkResolvedVertex<VertexData, VertexId>,
  context: GraphWalkVertexOccurrenceExpansionContext<
    VertexData,
    EdgeData,
    VertexId
  >,
) => MaybePromise<boolean>;
export type GraphWalkLinkTargetAdmissionPredicate<
  VertexData,
  EdgeData,
  VertexId,
> = (
  edge: GraphWalkEdge<EdgeData, VertexId>,
  context: GraphWalkLinkTargetAdmissionContext<VertexData, EdgeData, VertexId>,
) => boolean;
export type AsyncGraphWalkLinkTargetAdmissionPredicate<
  VertexData,
  EdgeData,
  VertexId,
> = (
  edge: GraphWalkEdge<EdgeData, VertexId>,
  context: GraphWalkLinkTargetAdmissionContext<VertexData, EdgeData, VertexId>,
) => MaybePromise<boolean>;

type GraphWalkCommonBuilderOptions<VertexData, EdgeData, VertexId> = {
  graphWalkDiscoverySource: GraphWalkDiscoverySource<
    VertexData,
    EdgeData,
    VertexId
  >;
  expansionOrder?: GraphWalkExpansionOrder;
  /** Null clears the predicate; omitted/undefined patches retain it. */
  shouldAdmitOutgoingLinkTarget?:
    | GraphWalkLinkTargetAdmissionPredicate<VertexData, EdgeData, VertexId>
    | null
    | undefined;
  /** Null clears the predicate; omitted/undefined patches retain it. */
  shouldExpandVertexOccurrence?:
    | GraphWalkVertexOccurrenceExpansionPredicate<
        VertexData,
        EdgeData,
        VertexId
      >
    | null
    | undefined;
  visitorsByObservationKind?: {
    [ObservationKind in GraphWalkObservationKind]?:
      | VisitorDefinitionsForPhase<
          GraphWalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>
        >
      | undefined;
  };
} & TraversalExecutionSelectionPatch<GraphWalkObservationKind>;
type AsyncGraphWalkCommonBuilderOptions<VertexData, EdgeData, VertexId> = {
  graphWalkDiscoverySource: AsyncGraphWalkDiscoverySource<
    VertexData,
    EdgeData,
    VertexId
  >;
  expansionOrder?: GraphWalkExpansionOrder;
  /** Null clears the predicate; omitted/undefined patches retain it. */
  shouldAdmitOutgoingLinkTarget?:
    | AsyncGraphWalkLinkTargetAdmissionPredicate<VertexData, EdgeData, VertexId>
    | null
    | undefined;
  /** Null clears the predicate; omitted/undefined patches retain it. */
  shouldExpandVertexOccurrence?:
    | AsyncGraphWalkVertexOccurrenceExpansionPredicate<
        VertexData,
        EdgeData,
        VertexId
      >
    | null
    | undefined;
  visitorsByObservationKind?: {
    [ObservationKind in GraphWalkObservationKind]?:
      | VisitorDefinitionsForPhase<
          AsyncGraphWalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>
        >
      | undefined;
  };
} & TraversalExecutionSelectionPatch<GraphWalkObservationKind>;

export type GraphWalkBuilderOptions<VertexData, EdgeData, VertexId> =
  GraphWalkCommonBuilderOptions<VertexData, EdgeData, VertexId> &
    GraphWalkRouteEnumerationAndRequiredBounds;
export type AsyncGraphWalkBuilderOptions<VertexData, EdgeData, VertexId> =
  AsyncGraphWalkCommonBuilderOptions<VertexData, EdgeData, VertexId> &
    GraphWalkRouteEnumerationAndRequiredBounds;
/** Atomic top-level patch. Supplied replaceLimits replace the previous limits record;
 * the merged route enumeration policy must still have a depth or candidate-read bound. */
export type GraphWalkBuilderOptionsPatch<VertexData, EdgeData, VertexId> =
  OptionalFieldsAllowingUndefined<
    GraphWalkCommonBuilderOptions<VertexData, EdgeData, VertexId>
  > & {
    routeEnumerationPolicy?: GraphWalkRouteEnumerationPolicy | undefined;
    replaceLimits?: GraphWalkExplorationLimits | undefined;
  };
/** Async counterpart with the same atomic patch and limits replacement rules. */
export type AsyncGraphWalkBuilderOptionsPatch<VertexData, EdgeData, VertexId> =
  OptionalFieldsAllowingUndefined<
    AsyncGraphWalkCommonBuilderOptions<VertexData, EdgeData, VertexId>
  > & {
    routeEnumerationPolicy?: GraphWalkRouteEnumerationPolicy | undefined;
    replaceLimits?: GraphWalkExplorationLimits | undefined;
  };
