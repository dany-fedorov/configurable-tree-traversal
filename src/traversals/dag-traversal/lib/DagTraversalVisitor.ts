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
> = {
  resolvedGraph: ResolvedGraph<T | R>;
  notMutatedResolvedGraph: ResolvedGraphSnapshot<T> | null;
  vertexRef: CTTRef<Vertex<T | R>>;
  order: DagTraversalOrder;
  isGraphRoot: boolean;
  isTraversalRoot: boolean;
  vertexVisitIndex: number;
  curVertexVisitorVisitIndex: number;
  previousVisitedVertexRef: CTTRef<Vertex<T | R>> | null;
  vertexVisitorsChainState: unknown;
  visitorRecord: VisitorRecord<DagVisitor<T, R>>;
};

export type DagVisitor<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = (
  vertex: Vertex<T | R>,
  options: DagVisitorOptions<T, R>,
) => VisitResult<R>;

export type AsyncDagVisitorOptions<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = Omit<DagVisitorOptions<T, R>, 'visitorRecord'> & {
  visitorRecord: VisitorRecord<AsyncDagVisitor<T, R>>;
};

export type AsyncDagVisitor<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = (
  vertex: Vertex<T | R>,
  options: AsyncDagVisitorOptions<T, R>,
) => MaybePromise<VisitResult<R>>;

export type DagEvent<T extends TreeTypeParameters> = {
  vertex: Vertex<T>;
  vertexRef: CTTRef<Vertex<T>>;
  order: DagTraversalOrder;
  isGraphRoot: boolean;
  isTraversalRoot: boolean;
};
