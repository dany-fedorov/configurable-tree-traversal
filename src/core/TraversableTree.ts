import type { VertexContentInput } from '@core/Vertex';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { ResolvedTree } from '@core/ResolvedTree';

export type TreeChildResolutionContext<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
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
  TTP extends VertexTypes,
  ID = unknown,
> = GraphDependencies<ID> & {
  vertexContent: VertexContentInput<TTP> | null;
  vertexId?: ID;
} & (RequiredGraphVertexIdentity<ID> | { vertexContent: null });

/** A source deliberately supplied a vertex with non-null content. */
export type DagVertexFound<T extends VertexTypes, ID = unknown> = {
  kind: 'found';
  vertex: GraphDependencies<ID> &
    RequiredGraphVertexIdentity<ID> & {
      vertexContent: VertexContentInput<T>;
      vertexId?: ID;
    };
};

/** Deliberate omission satisfies both work and completion prerequisites. */
export type DagVertexOmitted<ID = unknown> = {
  kind: 'omitted';
  vertexId?: ID;
  satisfiesDependencies: true;
};

/** Prerequisite lookup did not find the requested identity. */
export type PrerequisiteMissing = { kind: 'missing' };

export type DagVertexResolution<T extends VertexTypes, ID = unknown> =
  | DagVertexFound<T, ID>
  | DagVertexOmitted<ID>
  /** @deprecated Return a tagged found or omitted result. */
  | MakeVertexResult<T, ID>;

export type DagPrerequisiteResolution<
  T extends VertexTypes,
  ID = unknown,
> = DagVertexResolution<T, ID> | PrerequisiteMissing | undefined;

/** Graph identity and prerequisites are unsupported by tree sources. */
type TreeMetadataRestrictions = {
  vertexId?: never;
  dependsOn?: never;
  dependsOnComplete?: never;
  satisfiesDependencies?: never;
};

/** @deprecated Return a tagged tree found or omitted result. */
export type MakeTreeVertexResult<T extends VertexTypes> =
  TreeMetadataRestrictions & { vertexContent: VertexContentInput<T> | null };

export type TreeVertexFound<T extends VertexTypes> =
  TreeMetadataRestrictions & {
    kind: 'found';
    vertex: TreeMetadataRestrictions & { vertexContent: VertexContentInput<T> };
  };

export type TreeVertexOmitted = TreeMetadataRestrictions & {
  kind: 'omitted';
};

export type TreeVertexResolution<T extends VertexTypes> =
  | TreeVertexFound<T>
  | TreeVertexOmitted
  | MakeTreeVertexResult<T>;

export type TreeSource<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = {
  resolveRoot(): TreeVertexResolution<TTP>;

  resolveChild(
    vertexHint: TTP['VertexHint'],
    options: TreeChildResolutionContext<TTP, RW_TTP>,
  ): TreeVertexResolution<TTP>;
};

export abstract class AbstractTreeSource<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> implements TreeSource<TTP, RW_TTP>
{
  abstract resolveRoot(): TreeVertexResolution<TTP>;

  abstract resolveChild(
    vertexHint: TTP['VertexHint'],
    options: TreeChildResolutionContext<TTP, RW_TTP>,
  ): TreeVertexResolution<TTP>;
}
