import type { ResolvedGraph, ResolvedGraphSnapshot } from '@core/ResolvedGraph';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type {
  SourceVertexResult,
  PrerequisiteResolutionResult,
} from '@core/TraversableTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { HintVertexId, MaybePromise } from '@core/graph/types';

export type MakeGraphVertexOptions<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ID = unknown,
> = {
  resolutionContext: VertexResolutionContext<T | R>;
  resolvedGraph: ResolvedGraph<T | R, ID>;
  notMutatedResolvedGraph: ResolvedGraphSnapshot<T, ID> | null;
};

export interface TraversableGraph<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ID = unknown,
> {
  resolvePrerequisite?(id: ID): PrerequisiteResolutionResult<T, ID>;
  makeRoot(): SourceVertexResult<T, ID>;
  makeVertex(
    hint: T['VertexHint'],
    options: MakeGraphVertexOptions<T, R, ID>,
  ): SourceVertexResult<T, ID>;
  getVertexIdFromHint?(hint: T['VertexHint']): HintVertexId<ID> | undefined;
}

export interface AsyncTraversableGraph<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ID = unknown,
> {
  resolvePrerequisite?(
    id: ID,
  ): MaybePromise<PrerequisiteResolutionResult<T, ID>>;
  makeRoot(): MaybePromise<SourceVertexResult<T, ID>>;
  makeVertex(
    hint: T['VertexHint'],
    options: MakeGraphVertexOptions<T, R, ID>,
  ): MaybePromise<SourceVertexResult<T, ID>>;
  getVertexIdFromHint?(
    hint: T['VertexHint'],
  ): MaybePromise<HintVertexId<ID> | undefined>;
}
