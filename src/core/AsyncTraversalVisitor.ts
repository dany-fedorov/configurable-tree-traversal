import type {
  TraversalVisitorInputOptions,
  TraversalVisitorResult,
} from '@core/TraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { MaybePromise, VisitorRecord } from '@core/graph/types';

export type AsyncTraversalVisitorInputOptions<
  ORDER extends string,
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = Omit<TraversalVisitorInputOptions<ORDER, T, R>, 'visitorRecord'> & {
  visitorRecord: VisitorRecord<AsyncTraversalVisitor<ORDER, T, R>>;
};

export type AsyncTraversalVisitor<
  ORDER extends string,
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = (
  vertex: Vertex<T | R>,
  options: AsyncTraversalVisitorInputOptions<ORDER, T, R>,
) => MaybePromise<TraversalVisitorResult<R> | undefined | void>;
