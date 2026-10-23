import type { ResolvedGraph, ResolvedGraphSnapshot } from '@core/ResolvedGraph';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type {
  SourceVertexResult,
  PrerequisiteResolutionResult,
} from '@core/TraversableTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { HintVertexId, MaybePromise, VertexId } from '@core/graph/types';

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
  resolvePrerequisite?(id: VertexId): PrerequisiteResolutionResult<T>;
  makeRoot(): SourceVertexResult<T>;
  makeVertex(
    hint: T['VertexHint'],
    options: MakeGraphVertexOptions<T, R>,
  ): SourceVertexResult<T>;
  getVertexIdFromHint?(hint: T['VertexHint']): HintVertexId | undefined;
}

export interface AsyncTraversableGraph<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  resolvePrerequisite?(
    id: VertexId,
  ): MaybePromise<PrerequisiteResolutionResult<T>>;
  makeRoot(): MaybePromise<SourceVertexResult<T>>;
  makeVertex(
    hint: T['VertexHint'],
    options: MakeGraphVertexOptions<T, R>,
  ): MaybePromise<SourceVertexResult<T>>;
  getVertexIdFromHint?(
    hint: T['VertexHint'],
  ): MaybePromise<HintVertexId | undefined>;
}
