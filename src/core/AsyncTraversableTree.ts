import type {
  MakeVertexOptions,
  TreeVertexResolution,
} from '@core/TraversableTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { MaybePromise } from '@core/graph/types';

export interface AsyncTreeSource<
  T extends VertexTypes,
  R extends VertexTypes = T,
> {
  resolveRoot(): MaybePromise<TreeVertexResolution<T>>;
  resolveChild(
    hint: T['VertexHint'],
    options: MakeVertexOptions<T, R>,
  ): MaybePromise<TreeVertexResolution<T>>;
}
