import type {
  TraversalVisitorInputOptions,
  TraversalVisitorResult,
} from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { MaybePromise } from '@core/graph/types';

export type AsyncTraversalVisitorInputOptions<
  ORDER extends string,
  T extends VertexTypes,
  R extends VertexTypes = T,
> = TraversalVisitorInputOptions<ORDER, T, R>;

export type AsyncTraversalVisitor<
  ORDER extends string = string,
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
> = TraversalVisitorResult<R, ORDER> extends infer RESULT
  ? (
      vertex: Vertex<T | R>,
      options: AsyncTraversalVisitorInputOptions<ORDER, T, R>,
    ) => MaybePromise<RESULT | undefined | void>
  : never;
