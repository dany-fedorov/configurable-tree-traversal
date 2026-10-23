import type { DEFER_READY } from './DagProgress';
import type { CTTRef } from '@core/CTTRef';
import type { ResolvedGraph, ResolvedGraphSnapshot } from '@core/ResolvedGraph';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type {
  MaybePromise,
  VisitResult,
  VisitorRecord,
} from '@core/graph/types';
import type { DagTraversalOrder } from './DagTraversalOrder';

export type DagVisitorOptions<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ORDER extends DagTraversalOrder = DagTraversalOrder,
> = {
  resolvedGraph: ResolvedGraph<T | R>;
  notMutatedResolvedGraph: ResolvedGraphSnapshot<T> | null;
  vertexRef: CTTRef<Vertex<T | R>>;
  order: ORDER;
  isGraphRoot: boolean;
  isTraversalRoot: boolean;
  vertexVisitIndex: number;
  curVertexVisitorVisitIndex: number;
  previousVisitedVertexRef: CTTRef<Vertex<T | R>> | null;
  vertexVisitorsChainState: unknown;
  visitorRecord: VisitorRecord<DagVisitor<T, R, ORDER>>;
};

export type DagVisitor<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ORDER extends DagTraversalOrder = DagTraversalOrder,
> = (
  vertex: Vertex<T | R>,
  options: DagVisitorOptions<T, R, ORDER>,
) =>
  | VisitResult<R, ORDER>
  | ([ORDER] extends ['ON_READY'] ? typeof DEFER_READY : never);

export type AsyncDagVisitorOptions<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ORDER extends DagTraversalOrder = DagTraversalOrder,
> = Omit<DagVisitorOptions<T, R, ORDER>, 'visitorRecord'> & {
  visitorRecord: VisitorRecord<AsyncDagVisitor<T, R, ORDER>>;
};

export type AsyncDagVisitor<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ORDER extends DagTraversalOrder = DagTraversalOrder,
> = (
  vertex: Vertex<T | R>,
  options: AsyncDagVisitorOptions<T, R, ORDER>,
) => MaybePromise<
  | VisitResult<R, ORDER>
  | ([ORDER] extends ['ON_READY'] ? typeof DEFER_READY : never)
>;

export type DagEvent<T extends TreeTypeParameters> = {
  vertex: Vertex<T>;
  vertexRef: CTTRef<Vertex<T>>;
  order: DagTraversalOrder;
  isGraphRoot: boolean;
  isTraversalRoot: boolean;
};
