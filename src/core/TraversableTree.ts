import type { VertexContentInput } from '@core/Vertex';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { ResolvedTree } from '@core/ResolvedTree';
import type { VertexId } from '@core/graph/types';

export type MakeVertexOptions<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  resolutionContext: VertexResolutionContext<TTP | RW_TTP>;
  resolvedTree: ResolvedTree<TTP | RW_TTP>;
  notMutatedResolvedTree: ResolvedTree<TTP> | null;
};

export type MakeVertexResult<TTP extends TreeTypeParameters> = {
  vertexContent: VertexContentInput<TTP> | null;
  vertexId?: VertexId;
  dependsOn?: readonly VertexId[];
  dependsOnComplete?: readonly VertexId[];
};

/** A source deliberately supplied a vertex with non-null content. */
export type FoundVertexResult<T extends TreeTypeParameters> = {
  kind: 'found';
  vertex: Omit<MakeVertexResult<T>, 'vertexContent'> & {
    vertexContent: VertexContentInput<T>;
  };
};

/** Deliberate omission satisfies both work and completion prerequisites. */
export type OmittedVertexResult = {
  kind: 'omitted';
  vertexId?: VertexId;
  satisfiesDependencies: true;
};

/** Prerequisite lookup did not find the requested identity. */
export type MissingVertexResult = { kind: 'missing' };

export type SourceVertexResult<T extends TreeTypeParameters> =
  | FoundVertexResult<T>
  | OmittedVertexResult
  /** @deprecated Return a tagged found or omitted result. */
  | MakeVertexResult<T>;

export type PrerequisiteResolutionResult<T extends TreeTypeParameters> =
  | SourceVertexResult<T>
  | MissingVertexResult
  | undefined;

/** Graph identity and prerequisites are unsupported by tree sources. */
type TreeMetadataRestrictions = {
  vertexId?: never;
  dependsOn?: never;
  dependsOnComplete?: never;
};

/** @deprecated Return a tagged tree found or omitted result. */
export type MakeTreeVertexResult<T extends TreeTypeParameters> =
  TreeMetadataRestrictions & { vertexContent: VertexContentInput<T> | null };

export type TreeFoundVertexResult<T extends TreeTypeParameters> =
  TreeMetadataRestrictions & {
    kind: 'found';
    vertex: TreeMetadataRestrictions & { vertexContent: VertexContentInput<T> };
  };

export type TreeOmittedVertexResult = TreeMetadataRestrictions & {
  kind: 'omitted';
  satisfiesDependencies: true;
};

export type TreeSourceVertexResult<T extends TreeTypeParameters> =
  | TreeFoundVertexResult<T>
  | TreeOmittedVertexResult
  | MakeTreeVertexResult<T>;

export type TraversableTree<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = {
  makeRoot(): TreeSourceVertexResult<TTP>;

  makeVertex(
    vertexHint: TTP['VertexHint'],
    options: MakeVertexOptions<TTP, RW_TTP>,
  ): TreeSourceVertexResult<TTP>;
};

export abstract class AbstractTraversableTree<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> implements TraversableTree<TTP, RW_TTP>
{
  abstract makeRoot(): TreeSourceVertexResult<TTP>;

  abstract makeVertex(
    vertexHint: TTP['VertexHint'],
    options: MakeVertexOptions<TTP, RW_TTP>,
  ): TreeSourceVertexResult<TTP>;
}
