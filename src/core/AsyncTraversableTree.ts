import type {
  TreeChildResolverContext,
  TreeSourceVertexResolution,
} from '@core/TraversableTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { MaybePromise } from '@core/graph/types';

/** Input T owns discovery hints/results; callbacks must accept the full T | R live context. */
export interface AsyncTreeDiscoverySource<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> {
  resolveRootVertex: () => MaybePromise<TreeSourceVertexResolution<InputVertexTypes>>;
  resolveChildVertexFromHint: (
    hint: InputVertexTypes['ChildHint'],
    options: TreeChildResolverContext<InputVertexTypes, RewrittenVertexTypes>,
  ) => MaybePromise<TreeSourceVertexResolution<InputVertexTypes>>;
}
