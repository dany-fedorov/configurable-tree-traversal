import type {
  TreeVisitorContext,
  VisitorCommandsResult,
} from '@core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { VertexView } from '@core/Vertex';
import type { MaybePromise } from '@core/graph/types';

export type AsyncTreeVertexPhaseVisitorCallback<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
  Phase extends string = string,
> = VisitorCommandsResult<
  RewrittenVertexTypes,
  Phase,
  'tree',
  InputVertexTypes['ChildHint']
> extends infer RESULT
  ? (
      vertex: VertexView<InputVertexTypes | RewrittenVertexTypes>,
      options: TreeVisitorContext<
        Phase,
        InputVertexTypes,
        RewrittenVertexTypes
      >,
    ) => MaybePromise<RESULT | undefined | void>
  : never;
