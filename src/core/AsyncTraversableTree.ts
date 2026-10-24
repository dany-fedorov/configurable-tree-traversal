import type {
  MakeVertexOptions,
  TreeSourceVertexResult,
} from '@core/TraversableTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { MaybePromise } from '@core/graph/types';

export interface AsyncTraversableTree<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  makeRoot(): MaybePromise<TreeSourceVertexResult<T>>;
  makeVertex(
    hint: T['VertexHint'],
    options: MakeVertexOptions<T, R>,
  ): MaybePromise<TreeSourceVertexResult<T>>;
}
