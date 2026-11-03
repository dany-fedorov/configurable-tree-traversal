import type { MaybePromise } from '@core/graph/types';

export type GraphWalkResolvedVertex<VertexData, VertexId> = Readonly<{
  vertexId: VertexId;
  vertexData: VertexData;
}>;

export type GraphWalkVertexResolutionResult<VertexData> =
  | { kind: 'found'; vertexData: VertexData }
  | { kind: 'omitted' };

type GraphWalkResolverOrInlineTarget<VertexData, VertexId> = Readonly<{
  vertexId: VertexId;
  resolutionIfNotPreviouslyAdmitted?: GraphWalkVertexResolutionResult<VertexData>;
}>;
type GraphWalkInlineOrPreviouslyAdmittedTarget<VertexData, VertexId> =
  | Readonly<{
      kind: 'inlineResolution';
      vertexId: VertexId;
      resolutionIfNotPreviouslyAdmitted: GraphWalkVertexResolutionResult<VertexData>;
    }>
  | Readonly<{
      kind: 'previouslyAdmittedVertex';
      vertexId: VertexId;
      resolutionIfNotPreviouslyAdmitted?: never;
    }>;

export type GraphWalkVertexResolutionMode =
  | 'resolverWithOptionalInlineResolution'
  | 'inlineResolutionOrPreviouslyAdmittedVertex';

/** The vertex resolution mode parameter preserves the protocol policy in reusable helpers. */
export type GraphWalkVertexResolutionTarget<
  VertexData,
  VertexId,
  VertexResolutionMode extends GraphWalkVertexResolutionMode = GraphWalkVertexResolutionMode,
> = VertexResolutionMode extends 'resolverWithOptionalInlineResolution'
  ? GraphWalkResolverOrInlineTarget<VertexData, VertexId>
  : GraphWalkInlineOrPreviouslyAdmittedTarget<VertexData, VertexId>;

type GraphWalkOutgoingTargetLink<EdgeData, Target> = Readonly<{
  targetToResolveOnAdmission: Target;
  edgeData: EdgeData;
}>;
export type GraphWalkOutgoingLink<
  VertexData,
  EdgeData,
  VertexId,
  VertexResolutionMode extends GraphWalkVertexResolutionMode = GraphWalkVertexResolutionMode,
> = GraphWalkOutgoingTargetLink<
  EdgeData,
  GraphWalkVertexResolutionTarget<VertexData, VertexId, VertexResolutionMode>
>;

type GraphWalkTargetEnumerationProtocol<
  VertexData,
  EdgeData,
  VertexId,
  Target,
> = {
  enumerateRootTargets(): Iterable<Target>;
  enumerateOutgoingLinks(
    vertex: GraphWalkResolvedVertex<VertexData, VertexId>,
  ): Iterable<GraphWalkOutgoingTargetLink<EdgeData, Target>>;
};

export type GraphWalkDiscoverySource<VertexData, EdgeData, VertexId> =
  | ({
      vertexResolutionMode: 'resolverWithOptionalInlineResolution';
      resolveVertexDataById(
        vertexId: VertexId,
      ): GraphWalkVertexResolutionResult<VertexData>;
    } & GraphWalkTargetEnumerationProtocol<
      VertexData,
      EdgeData,
      VertexId,
      GraphWalkResolverOrInlineTarget<VertexData, VertexId>
    >)
  | ({
      vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex';
      resolveVertexDataById?: undefined;
    } & GraphWalkTargetEnumerationProtocol<
      VertexData,
      EdgeData,
      VertexId,
      GraphWalkInlineOrPreviouslyAdmittedTarget<VertexData, VertexId>
    >);

type MaybePromiseOfSyncOrAsyncIterable<T> = MaybePromise<
  Iterable<T> | AsyncIterable<T>
>;
type AsyncGraphWalkTargetEnumerationProtocol<
  VertexData,
  EdgeData,
  VertexId,
  Target,
> = {
  enumerateRootTargets(): MaybePromiseOfSyncOrAsyncIterable<Target>;
  enumerateOutgoingLinks(
    vertex: GraphWalkResolvedVertex<VertexData, VertexId>,
  ): MaybePromiseOfSyncOrAsyncIterable<
    GraphWalkOutgoingTargetLink<EdgeData, Target>
  >;
};
export type AsyncGraphWalkDiscoverySource<VertexData, EdgeData, VertexId> =
  | ({
      vertexResolutionMode: 'resolverWithOptionalInlineResolution';
      resolveVertexDataById(
        vertexId: VertexId,
      ): MaybePromise<GraphWalkVertexResolutionResult<VertexData>>;
    } & AsyncGraphWalkTargetEnumerationProtocol<
      VertexData,
      EdgeData,
      VertexId,
      GraphWalkResolverOrInlineTarget<VertexData, VertexId>
    >)
  | ({
      vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex';
      resolveVertexDataById?: undefined;
    } & AsyncGraphWalkTargetEnumerationProtocol<
      VertexData,
      EdgeData,
      VertexId,
      GraphWalkInlineOrPreviouslyAdmittedTarget<VertexData, VertexId>
    >);
