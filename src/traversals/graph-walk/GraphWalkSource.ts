import type { MaybePromise } from '@core/graph/types';

export type GraphWalkVertex<Data, ID> = Readonly<{
  vertexId: ID;
  data: Data;
}>;

export type GraphWalkVertexResult<Data> =
  | { kind: 'found'; data: Data }
  | { kind: 'omitted' };

export type GraphWalkTarget<Data, ID> = Readonly<{
  vertexId: ID;
  resolution?: GraphWalkVertexResult<Data>;
}>;

export type GraphWalkLink<Data, Edge, ID> = Readonly<{
  target: GraphWalkTarget<Data, ID>;
  data: Edge;
}>;

export interface GraphWalkSource<Data, Edge, ID> {
  roots(): Iterable<GraphWalkTarget<Data, ID>>;
  resolveVertex?(vertexId: ID): GraphWalkVertexResult<Data>;
  outgoing(
    vertex: GraphWalkVertex<Data, ID>,
  ): Iterable<GraphWalkLink<Data, Edge, ID>>;
}

export interface AsyncGraphWalkSource<Data, Edge, ID> {
  roots(): MaybePromise<
    | Iterable<GraphWalkTarget<Data, ID>>
    | AsyncIterable<GraphWalkTarget<Data, ID>>
  >;
  resolveVertex?(vertexId: ID): MaybePromise<GraphWalkVertexResult<Data>>;
  outgoing(
    vertex: GraphWalkVertex<Data, ID>,
  ): MaybePromise<
    | Iterable<GraphWalkLink<Data, Edge, ID>>
    | AsyncIterable<GraphWalkLink<Data, Edge, ID>>
  >;
}
