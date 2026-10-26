import type { ResolvedGraph, ResolvedGraphSnapshot } from '@core/ResolvedGraph';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type {
  DagVertexResolution,
  DagPrerequisiteResolution,
} from '@core/TraversableTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { HintVertexId, MaybePromise } from '@core/graph/types';

export type MakeGraphVertexOptions<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> = {
  resolutionContext: VertexResolutionContext<T | R>;
  resolvedGraph: ResolvedGraph<T | R, ID>;
  notMutatedResolvedGraph: ResolvedGraphSnapshot<T, ID> | null;
};

export interface DagDiscoverySource<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> {
  resolvePrerequisite?(id: ID): DagPrerequisiteResolution<T, ID>;
  resolveRoot(): DagVertexResolution<T, ID>;
  resolveChild(
    hint: T['VertexHint'],
    options: MakeGraphVertexOptions<T, R, ID>,
  ): DagVertexResolution<T, ID>;
  getVertexIdFromHint?(hint: T['VertexHint']): HintVertexId<ID> | undefined;
}

export interface AsyncDagDiscoverySource<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> {
  resolvePrerequisite?(
    id: ID,
  ): MaybePromise<DagPrerequisiteResolution<T, ID>>;
  resolveRoot(): MaybePromise<DagVertexResolution<T, ID>>;
  resolveChild(
    hint: T['VertexHint'],
    options: MakeGraphVertexOptions<T, R, ID>,
  ): MaybePromise<DagVertexResolution<T, ID>>;
  getVertexIdFromHint?(
    hint: T['VertexHint'],
  ): MaybePromise<HintVertexId<ID> | undefined>;
}
