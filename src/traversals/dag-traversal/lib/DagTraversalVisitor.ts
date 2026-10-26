import type { DEFER_READY } from './DagProgress';
import type { CTTRef } from '@core/CTTRef';
import type { ResolvedGraph, ResolvedGraphSnapshot } from '@core/ResolvedGraph';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { MaybePromise, VisitResult } from '@core/graph/types';
import type { VisitorRegistrationMetadata } from '@core/TraversalVisitor';
import type { DagTraversalOrder } from './DagTraversalOrder';

export type DagVisitorOptions<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ORDER extends DagTraversalOrder = DagTraversalOrder,
  ID = unknown,
> = {
  resolvedGraph: ResolvedGraph<T | R, ID>;
  notMutatedResolvedGraph: ResolvedGraphSnapshot<T, ID> | null;
  vertexRef: CTTRef<Vertex<T | R>>;
  order: ORDER;
  isGraphRoot: boolean;
  isTraversalRoot: boolean;
  vertexVisitIndex: number;
  curVertexVisitorVisitIndex: number;
  previousVisitedVertexRef: CTTRef<Vertex<T | R>> | null;
  vertexVisitorsChainState: unknown;
  visitorRecord: VisitorRegistrationMetadata;
};

export type DagVisitor<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ORDER extends DagTraversalOrder = DagTraversalOrder,
  ID = unknown,
> =
  | VisitResult<R, ORDER>
  | ([ORDER] extends ['ON_READY']
      ? typeof DEFER_READY
      : never) extends infer RESULT
  ? (
      vertex: Vertex<T | R>,
      options: DagVisitorOptions<T, R, ORDER, ID>,
    ) => RESULT
  : never;

export type AsyncDagVisitorOptions<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ORDER extends DagTraversalOrder = DagTraversalOrder,
  ID = unknown,
> = DagVisitorOptions<T, R, ORDER, ID>;

export type AsyncDagVisitor<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ORDER extends DagTraversalOrder = DagTraversalOrder,
  ID = unknown,
> =
  | VisitResult<R, ORDER>
  | ([ORDER] extends ['ON_READY']
      ? typeof DEFER_READY
      : never) extends infer RESULT
  ? (
      vertex: Vertex<T | R>,
      options: AsyncDagVisitorOptions<T, R, ORDER, ID>,
    ) => MaybePromise<RESULT>
  : never;

/**
 * Committed milestone observation: `ON_READY`/`workCompleted` emits after W,
 * including deferred settlement, while an `ON_READY` visitor runs before work.
 * Dispatch external work from coordinator frontier tickets or a pre-work visitor.
 */
export type DagEvent<T extends VertexTypes, ID = unknown> = {
  vertexId: ID;
  vertex: Vertex<T>;
  vertexRef: CTTRef<Vertex<T>>;
  isGraphRoot: boolean;
  isTraversalRoot: boolean;
} & (
  | { kind: 'workCompleted'; order: DagTraversalOrder.ON_READY }
  | { kind: 'subgraphCompleted'; order: DagTraversalOrder.ON_COMPLETE }
);
