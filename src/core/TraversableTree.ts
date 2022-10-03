import type { VertexContent } from './Vertex';
import type { TreeTypeParameters } from './TreeTypeParameters';
import type { VertexResolutionContext } from './ResolvedTree';
import type { ResolvedTree } from './ResolvedTree';

export type MakeVertexOptions<TTP extends TreeTypeParameters> = {
  resolutionContext: VertexResolutionContext<TTP>;
  resolvedTree: ResolvedTree<TTP>;
};

export type TraversableTree<TTP extends TreeTypeParameters> = {
  makeRoot(): VertexContent<TTP> | null;

  makeVertex(
    vertexHint: TTP['VertexHint'],
    options: MakeVertexOptions<TTP>,
  ): VertexContent<TTP> | null;
};

export abstract class AbstractTraversableTree<TTP extends TreeTypeParameters>
  implements TraversableTree<TTP>
{
  abstract makeRoot(): VertexContent<TTP> | null;

  abstract makeVertex(
    vertexHint: TTP['VertexHint'],
    options: MakeVertexOptions<TTP>,
  ): VertexContent<TTP> | null;
}