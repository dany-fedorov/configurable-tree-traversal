import type {
  TreeVisitorContext,
  TraversalVisitorResult,
} from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { VertexView } from '@core/Vertex';
import type { MaybePromise } from '@core/graph/types';

export type AsyncTreeVisitor<
  Phase extends string = string,
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
> = TraversalVisitorResult<
  R,
  Phase,
  'tree',
  T['VertexHint']
> extends infer RESULT
  ? (
      vertex: VertexView<T | R>,
      options: TreeVisitorContext<Phase, T, R>,
    ) => MaybePromise<RESULT | undefined | void>
  : never;
