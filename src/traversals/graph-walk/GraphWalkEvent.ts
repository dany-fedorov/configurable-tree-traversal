import type { GraphWalkVertex } from './GraphWalkSource';
import type { GraphWalkPhase } from './GraphWalkPhase';

export type GraphWalkEdge<Edge, ID> = Readonly<{
  from: ID;
  /** Zero-based source adjacency position before filtering; stable on cached replay. */
  outgoingIndex: number;
  to: ID;
  data: Edge;
}>;

export type GraphWalkEvent<Data, Edge, ID> =
  | Readonly<{
      kind: 'vertex';
      vertex: GraphWalkVertex<Data, ID>;
      depth: number;
      via: GraphWalkEdge<Edge, ID> | null;
    }>
  | Readonly<{
      kind: 'edge';
      edge: GraphWalkEdge<Edge, ID>;
      fromVertex: GraphWalkVertex<Data, ID>;
      depth: number;
      target:
        | Readonly<{ kind: 'found'; vertex: GraphWalkVertex<Data, ID> }>
        | Readonly<{ kind: 'omitted' }>;
    }>
  | Readonly<{
      kind: 'path';
      vertices: readonly GraphWalkVertex<Data, ID>[];
      edges: readonly GraphWalkEdge<Edge, ID>[];
      depth: number;
    }>;

export type GraphWalkEventFor<
  Data,
  Edge,
  Phase extends `${GraphWalkPhase}`,
  ID,
> = Extract<GraphWalkEvent<Data, Edge, ID>, { kind: `${Phase}` }>;

export type GraphWalkPathEvent<Data, Edge, ID> = GraphWalkEventFor<
  Data,
  Edge,
  GraphWalkPhase.PATH,
  ID
>;
