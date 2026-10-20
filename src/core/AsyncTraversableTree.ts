import type { MakeVertexOptions, MakeVertexResult } from '@core/TraversableTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { MaybePromise } from '@core/graph/types';

export interface AsyncTraversableTree<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  makeRoot(): MaybePromise<MakeVertexResult<T>>;
  makeVertex(
    hint: T['VertexHint'],
    options: MakeVertexOptions<T, R>,
  ): MaybePromise<MakeVertexResult<T>>;
}
