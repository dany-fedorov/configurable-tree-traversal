import type {
  ResolvedGraphView,
  OriginalGraphView,
} from '@core/ResolvedGraphView';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type {
  DagVertexResolution,
  DagPrerequisiteResolution,
} from '@core/TraversableTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { HintVertexId, MaybePromise } from '@core/graph/types';

export type DagChildResolutionContext<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> = {
  resolutionContext:
    | VertexResolutionContext<T | R>
    | Readonly<
        Omit<
          VertexResolutionContext<T | R>,
          'parentVertex' | 'parentVertexRef'
        > & {
          /** Synthetic entry-slot parent is private; both parent fields are null. */
          parentVertex: null;
          parentVertexRef: null;
        }
      >;
  resolvedGraphView: ResolvedGraphView<T | R, ID>;
  originalGraphView: OriginalGraphView<T, ID> | null;
};

/** Input T owns discovery hints/results; callbacks must accept the full T | R live context. */
export interface DagDiscoverySource<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> {
  resolvePrerequisite?: (id: ID) => DagPrerequisiteResolution<T, ID>;
  resolveRoot: () => DagVertexResolution<T, ID>;
  resolveChild: (
    hint: T['VertexHint'],
    options: DagChildResolutionContext<T, R, ID>,
  ) => DagVertexResolution<T, ID>;
  getVertexIdFromHint?: (hint: T['VertexHint']) => HintVertexId<ID> | undefined;
}

export interface AsyncDagDiscoverySource<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> {
  resolvePrerequisite?: (
    id: ID,
  ) => MaybePromise<DagPrerequisiteResolution<T, ID>>;
  resolveRoot: () => MaybePromise<DagVertexResolution<T, ID>>;
  resolveChild: (
    hint: T['VertexHint'],
    options: DagChildResolutionContext<T, R, ID>,
  ) => MaybePromise<DagVertexResolution<T, ID>>;
  getVertexIdFromHint?: (
    hint: T['VertexHint'],
  ) => MaybePromise<HintVertexId<ID> | undefined>;
}
