import type { VertexContent } from '@core/Vertex';
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

export type MakeVertexResult<TTP extends TreeTypeParameters> = {
  vertexContent: VertexContent<TTP> | null;
};

export type TraversableTree<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = {
  makeRoot(): VertexContent<TTP> | null;

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
  abstract makeRoot(): VertexContent<TTP> | null;

  abstract makeVertex(
    vertexHint: TTP['VertexHint'],
    options: MakeVertexOptions<TTP, RW_TTP>,
  ): MakeVertexResult<TTP>;
}
