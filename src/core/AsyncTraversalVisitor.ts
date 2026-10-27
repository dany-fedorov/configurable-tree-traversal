import type {
  TreeVisitorContext,
  TraversalVisitorResult,
} from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { MaybePromise } from '@core/graph/types';

export type AsyncTreeVisitor<
  Phase extends string = string,
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
> = TraversalVisitorResult<R, Phase> extends infer RESULT
  ? (
      vertex: Vertex<T | R>,
      options: TreeVisitorContext<Phase, T, R>,
    ) => MaybePromise<RESULT | undefined | void>
  : never;
