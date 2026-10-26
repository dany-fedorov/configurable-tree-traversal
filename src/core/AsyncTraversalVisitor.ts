import type {
  TreeVisitorContext,
  TraversalVisitorResult,
} from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { MaybePromise } from '@core/graph/types';

export type AsyncTraversalVisitor<
  ORDER extends string = string,
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
> = TraversalVisitorResult<R, ORDER> extends infer RESULT
  ? (
      vertex: Vertex<T | R>,
      options: TreeVisitorContext<ORDER, T, R>,
    ) => MaybePromise<RESULT | undefined | void>
  : never;
