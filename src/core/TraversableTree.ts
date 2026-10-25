import type { VertexContentInput } from '@core/Vertex';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { ResolvedTree } from '@core/ResolvedTree';

export type MakeVertexOptions<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  resolutionContext: VertexResolutionContext<TTP | RW_TTP>;
  resolvedTree: ResolvedTree<TTP | RW_TTP>;
  notMutatedResolvedTree: ResolvedTree<TTP> | null;
};

/** Explicit ID domains cannot use the generated-reference identity fallback. */
type RequiredGraphVertexIdentity<ID> =
  | { vertexId: ID }
  | (unknown extends ID ? unknown : never);

type GraphDependencies<ID> = {
  dependsOn?: readonly ID[];
  dependsOnComplete?: readonly ID[];
};

export type MakeVertexResult<
  TTP extends TreeTypeParameters,
  ID = unknown,
> = GraphDependencies<ID> & {
  vertexContent: VertexContentInput<TTP> | null;
  vertexId?: ID;
} & (RequiredGraphVertexIdentity<ID> | { vertexContent: null });

/** A source deliberately supplied a vertex with non-null content. */
export type FoundVertexResult<T extends TreeTypeParameters, ID = unknown> = {
  kind: 'found';
  vertex: GraphDependencies<ID> &
    RequiredGraphVertexIdentity<ID> & {
      vertexContent: VertexContentInput<T>;
      vertexId?: ID;
    };
};

/** Deliberate omission satisfies both work and completion prerequisites. */
export type OmittedVertexResult<ID = unknown> = {
  kind: 'omitted';
  vertexId?: ID;
  satisfiesDependencies: true;
};

/** Prerequisite lookup did not find the requested identity. */
export type MissingVertexResult = { kind: 'missing' };

export type SourceVertexResult<T extends TreeTypeParameters, ID = unknown> =
  | FoundVertexResult<T, ID>
  | OmittedVertexResult<ID>
  /** @deprecated Return a tagged found or omitted result. */
  | MakeVertexResult<T, ID>;

export type PrerequisiteResolutionResult<
  T extends TreeTypeParameters,
  ID = unknown,
> = SourceVertexResult<T, ID> | MissingVertexResult | undefined;

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
