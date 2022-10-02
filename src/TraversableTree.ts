import type { VertexContent } from './Vertex';
import type { TreeTypeParameters } from './TreeTypeParameters';
import type { VertexResolutionContext } from './ResolvedTree';
import type { ResolvedTree } from './ResolvedTree';

type MakeVertexOptions<TTP extends TreeTypeParameters> = {
  resolutionContext: VertexResolutionContext<TTP>;
  resolvedTree: ResolvedTree<TTP>;
};

export interface TraversableTree<TTP extends TreeTypeParameters> {
  makeRoot(): VertexContent<TTP> | null;

  makeVertex(
    vertexHint: TTP['VertexHint'],
    options: MakeVertexOptions<TTP>,
  ): VertexContent<TTP> | null;
}
