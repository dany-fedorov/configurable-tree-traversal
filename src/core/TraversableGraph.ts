import type { ResolvedGraph, ResolvedGraphSnapshot } from '@core/ResolvedGraph';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { MakeVertexResult } from '@core/TraversableTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { HintVertexId, MaybePromise } from '@core/graph/types';

export type MakeGraphVertexOptions<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = {
  resolutionContext: VertexResolutionContext<T | R>;
  resolvedGraph: ResolvedGraph<T | R>;
  notMutatedResolvedGraph: ResolvedGraphSnapshot<T> | null;
};

export interface TraversableGraph<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  makeRoot(): MakeVertexResult<T>;
  makeVertex(
    hint: T['VertexHint'],
    options: MakeGraphVertexOptions<T, R>,
  ): MakeVertexResult<T>;
  getVertexIdFromHint?(hint: T['VertexHint']): HintVertexId | undefined;
}

export interface AsyncTraversableGraph<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  makeRoot(): MaybePromise<MakeVertexResult<T>>;
  makeVertex(
    hint: T['VertexHint'],
    options: MakeGraphVertexOptions<T, R>,
  ): MaybePromise<MakeVertexResult<T>>;
  getVertexIdFromHint?(
    hint: T['VertexHint'],
  ): MaybePromise<HintVertexId | undefined>;
}
