import type {
  TraversalVisitorInputOptions,
  TraversalVisitorResult,
} from '@core/TraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { MaybePromise } from '@core/graph/types';

export type AsyncTraversalVisitorInputOptions<
  ORDER extends string,
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = TraversalVisitorInputOptions<ORDER, T, R>;

export type AsyncTraversalVisitor<
  ORDER extends string = string,
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = TraversalVisitorResult<R, ORDER> extends infer RESULT
  ? (
      vertex: Vertex<T | R>,
      options: AsyncTraversalVisitorInputOptions<ORDER, T, R>,
    ) => MaybePromise<RESULT | undefined | void>
  : never;
