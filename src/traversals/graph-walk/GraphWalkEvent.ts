import type { GraphWalkResolvedVertex } from './GraphWalkSource';
import type { GraphWalkObservationKind } from './GraphWalkPhase';

export type GraphWalkEdge<EdgeData, VertexId> = Readonly<{
  fromVertexId: VertexId;
  /** Zero-based source adjacency position before filtering; stable on cached replay. */
  sourceOutgoingLinkIndexBeforeFiltering: number;
  toVertexId: VertexId;
  edgeData: EdgeData;
}>;

export type GraphWalkEvent<VertexData, EdgeData, VertexId> =
  | Readonly<{
      eventKind: 'vertexOccurrence';
      vertex: GraphWalkResolvedVertex<VertexData, VertexId>;
      vertexHopDepth: number;
      incomingEdgeFromParentRouteOccurrence: GraphWalkEdge<
        EdgeData,
        VertexId
      > | null;
    }>
  | Readonly<{
      eventKind: 'admittedEdgeOccurrence';
      edge: GraphWalkEdge<EdgeData, VertexId>;
      fromVertex: GraphWalkResolvedVertex<VertexData, VertexId>;
      targetHopDepth: number;
      targetResolution:
        | Readonly<{
            kind: 'found';
            vertex: GraphWalkResolvedVertex<VertexData, VertexId>;
          }>
        | Readonly<{ kind: 'omitted' }>;
    }>
  | Readonly<{
      eventKind: 'routePrefix';
      verticesInRootToTargetOrder: readonly GraphWalkResolvedVertex<
        VertexData,
        VertexId
      >[];
      edgesInRootToTargetOrder: readonly GraphWalkEdge<EdgeData, VertexId>[];
      routeHopLength: number;
    }>;

export type GraphWalkEventForObservationKind<
  VertexData,
  EdgeData,
  ObservationKind extends `${GraphWalkObservationKind}`,
  VertexId,
> = Extract<
  GraphWalkEvent<VertexData, EdgeData, VertexId>,
  { eventKind: `${ObservationKind}` }
>;

export type GraphWalkRoutePrefixEvent<VertexData, EdgeData, VertexId> =
  GraphWalkEventForObservationKind<
    VertexData,
    EdgeData,
    GraphWalkObservationKind.ROUTE_PREFIX,
    VertexId
  >;
