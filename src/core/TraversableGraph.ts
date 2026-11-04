import type {
  LiveResolvedGraphView,
  LivePreCommandDiscoveredGraphView,
} from '@core/ResolvedGraphView';
import type { ChildDiscoveryContext } from '@core/ResolvedTree';
import type {
  DagSourceVertexResolution,
  DagPrerequisiteLookupResult,
} from '@core/TraversableTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { ChildHintVertexIdentity, MaybePromise } from '@core/graph/types';

export type DagChildResolutionContext<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> = {
  structuralChildResolution:
    | ChildDiscoveryContext<SourceVertexTypes | RewrittenVertexTypes>
    | Readonly<
        Omit<
          ChildDiscoveryContext<SourceVertexTypes | RewrittenVertexTypes>,
          'parentVertexAtChildResolution' | 'parentVertexHandle'
        > & {
          /** Synthetic entry-slot parent is private; both parent fields are null. */
          parentVertexAtChildResolution: null;
          parentVertexHandle: null;
        }
      >;
  liveResolvedGraphView: LiveResolvedGraphView<
    SourceVertexTypes | RewrittenVertexTypes,
    VertexId
  >;
  livePreCommandDiscoveredGraphView: LivePreCommandDiscoveredGraphView<
    SourceVertexTypes,
    VertexId
  > | null;
};

/** Input T owns discovery hints/results; callbacks must accept the full T | R live context. */
export interface DagDiscoverySource<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> {
  resolvePrerequisiteByVertexId?: (
    vertexId: VertexId,
  ) => DagPrerequisiteLookupResult<SourceVertexTypes, VertexId>;
  resolveRootVertex: () => DagSourceVertexResolution<
    SourceVertexTypes,
    VertexId
  >;
  resolveChildVertexFromHint: (
    hint: SourceVertexTypes['ChildHint'],
    context: DagChildResolutionContext<
      SourceVertexTypes,
      RewrittenVertexTypes,
      VertexId
    >,
  ) => DagSourceVertexResolution<SourceVertexTypes, VertexId>;
  tryGetVertexIdentityFromHint?: (
    hint: SourceVertexTypes['ChildHint'],
  ) => ChildHintVertexIdentity<VertexId> | undefined;
}

export interface AsyncDagDiscoverySource<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> {
  resolvePrerequisiteByVertexId?: (
    vertexId: VertexId,
  ) => MaybePromise<DagPrerequisiteLookupResult<SourceVertexTypes, VertexId>>;
  resolveRootVertex: () => MaybePromise<
    DagSourceVertexResolution<SourceVertexTypes, VertexId>
  >;
  resolveChildVertexFromHint: (
    hint: SourceVertexTypes['ChildHint'],
    context: DagChildResolutionContext<
      SourceVertexTypes,
      RewrittenVertexTypes,
      VertexId
    >,
  ) => MaybePromise<DagSourceVertexResolution<SourceVertexTypes, VertexId>>;
  tryGetVertexIdentityFromHint?: (
    hint: SourceVertexTypes['ChildHint'],
  ) => MaybePromise<ChildHintVertexIdentity<VertexId> | undefined>;
}
