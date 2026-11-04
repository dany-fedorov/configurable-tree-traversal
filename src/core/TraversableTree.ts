import type { LiveResolvedTreeView } from '@core/ResolvedTreeView';
import type { VertexContentInput } from '@core/Vertex';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { ChildDiscoveryContext } from '@core/ResolvedTree';

export type TreeChildResolverContext<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = {
  childDiscoveryContext: ChildDiscoveryContext<
    InputVertexTypes | RewrittenVertexTypes
  >;
  liveResolvedTreeView: LiveResolvedTreeView<
    InputVertexTypes | RewrittenVertexTypes
  >;
  livePreCommandDiscoveredTreeView: LiveResolvedTreeView<InputVertexTypes> | null;
};

/** Explicit ID domains cannot use the generated-reference identity fallback. */
type RequiredGraphVertexIdentity<VertexId> =
  | { vertexId: VertexId }
  | (unknown extends VertexId ? unknown : never);

type GraphDependencies<VertexId> = {
  workWaitsForWorkOf?: readonly VertexId[];
  workWaitsForSubgraphCompletionOf?: readonly VertexId[];
};

export type MakeVertexResult<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> = GraphDependencies<VertexId> & {
  vertexContent: VertexContentInput<InputVertexTypes> | null;
  vertexId?: VertexId;
} & (RequiredGraphVertexIdentity<VertexId> | { vertexContent: null });

/** A source deliberately supplied a resolvedVertexInput with non-null content. */
export type ResolvedDagSourceVertex<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> = {
  kind: 'vertexResolved';
  resolvedVertexInput: GraphDependencies<VertexId> &
    RequiredGraphVertexIdentity<VertexId> & {
      vertexContentInput: VertexContentInput<InputVertexTypes>;
      vertexId?: VertexId;
    };
};

/** Deliberate omission satisfies both work and completion prerequisites. */
export type OmittedDagSourceVertex<VertexId = unknown> = {
  kind: 'vertexIntentionallyOmitted';
  omittedVertexIdentity: Readonly<{ vertexId: VertexId }> | null;
  satisfiesWorkAndSubgraphCompletionPrerequisites: true;
};

/** Prerequisite lookup did not find the requested identity. */
export type DagPrerequisiteLookupMissing = { kind: 'missing' };

export type DagSourceVertexResolution<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> =
  | ResolvedDagSourceVertex<InputVertexTypes, VertexId>
  | OmittedDagSourceVertex<VertexId>;

export type DagPrerequisiteLookupResult<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> =
  | DagSourceVertexResolution<InputVertexTypes, VertexId>
  | DagPrerequisiteLookupMissing;

/** Graph identity and prerequisites are unsupported by tree sources. */
type ForbiddenGraphMetadataOnTreeResolution = {
  omittedVertexIdentity?: never;
  identity?: never;
  vertexId?: never;
  workWaitsForWorkOf?: never;
  workWaitsForSubgraphCompletionOf?: never;
  satisfiesWorkAndSubgraphCompletionPrerequisites?: never;
  satisfiesDependencies?: never;
};

export type ResolvedTreeSourceVertex<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = ForbiddenGraphMetadataOnTreeResolution & {
  kind: 'vertexResolved';
  resolvedVertexInput: ForbiddenGraphMetadataOnTreeResolution & {
    vertexContentInput: VertexContentInput<InputVertexTypes>;
  };
};

export type OmittedTreeSourceVertex =
  ForbiddenGraphMetadataOnTreeResolution & {
    kind: 'vertexIntentionallyOmitted';
  };

export type TreeSourceVertexResolution<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = ResolvedTreeSourceVertex<InputVertexTypes> | OmittedTreeSourceVertex;

/** Input T owns discovery hints/results; callbacks must accept the full T | R live context. */
export type TreeDiscoverySource<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = {
  resolveRootVertex: () => TreeSourceVertexResolution<InputVertexTypes>;

  resolveChildVertexFromHint: (
    vertexHint: InputVertexTypes['ChildHint'],
    options: TreeChildResolverContext<InputVertexTypes, RewrittenVertexTypes>,
  ) => TreeSourceVertexResolution<InputVertexTypes>;
};
