import type { VertexContent } from '@core/Vertex';
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
  vertexContent: VertexContent<TTP> | null;
  vertexId?: VertexId;
  dependsOn?: readonly VertexId[];
};

export type TraversableTree<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = {
  makeRoot(): MakeVertexResult<TTP>;

  makeVertex(
    vertexHint: TTP['VertexHint'],
    options: MakeVertexOptions<TTP, RW_TTP>,
  ): MakeVertexResult<TTP>;
};

export abstract class AbstractTraversableTree<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> implements TraversableTree<TTP, RW_TTP>
{
  abstract makeRoot(): MakeVertexResult<TTP>;

  abstract makeVertex(
    vertexHint: TTP['VertexHint'],
    options: MakeVertexOptions<TTP, RW_TTP>,
  ): MakeVertexResult<TTP>;
}
