import type { MaybePromise } from '@core/graph/types';

export type GraphWalkVertex<Data, ID> = Readonly<{
  vertexId: ID;
  data: Data;
}>;

export type GraphWalkVertexResult<Data> =
  | { kind: 'found'; data: Data }
  | { kind: 'omitted' };

type ResolverTarget<Data, ID> = Readonly<{
  vertexId: ID;
  resolution?: GraphWalkVertexResult<Data>;
}>;
type InlineOrCachedTarget<Data, ID> =
  | Readonly<{
      kind: 'inline';
      vertexId: ID;
      resolution: GraphWalkVertexResult<Data>;
    }>
  | Readonly<{ kind: 'cached'; vertexId: ID; resolution?: never }>;

/** Resolver targets may hydrate inline; no-resolver targets declare cache use. */
export type GraphWalkTarget<Data, ID> =
  | ResolverTarget<Data, ID>
  | InlineOrCachedTarget<Data, ID>;

type LinkTo<Edge, Target> = Readonly<{ target: Target; data: Edge }>;
export type GraphWalkLink<Data, Edge, ID> = LinkTo<
  Edge,
  GraphWalkTarget<Data, ID>
>;

type SourceProtocol<Data, Edge, ID, Target> = {
  roots(): Iterable<Target>;
  outgoing(vertex: GraphWalkVertex<Data, ID>): Iterable<LinkTo<Edge, Target>>;
};

export type GraphWalkSource<Data, Edge, ID> =
  | ({
      hydration: 'resolver';
      resolveVertex(vertexId: ID): GraphWalkVertexResult<Data>;
    } & SourceProtocol<Data, Edge, ID, ResolverTarget<Data, ID>>)
  | ({
      hydration: 'inlineOrCached';
      resolveVertex?: undefined;
    } & SourceProtocol<Data, Edge, ID, InlineOrCachedTarget<Data, ID>>);

type AsyncIterableResult<T> = MaybePromise<Iterable<T> | AsyncIterable<T>>;
type AsyncSourceProtocol<Data, Edge, ID, Target> = {
  roots(): AsyncIterableResult<Target>;
  outgoing(
    vertex: GraphWalkVertex<Data, ID>,
  ): AsyncIterableResult<LinkTo<Edge, Target>>;
};
export type AsyncGraphWalkSource<Data, Edge, ID> =
  | ({
      hydration: 'resolver';
      resolveVertex(vertexId: ID): MaybePromise<GraphWalkVertexResult<Data>>;
    } & AsyncSourceProtocol<Data, Edge, ID, ResolverTarget<Data, ID>>)
  | ({
      hydration: 'inlineOrCached';
      resolveVertex?: undefined;
    } & AsyncSourceProtocol<Data, Edge, ID, InlineOrCachedTarget<Data, ID>>);
