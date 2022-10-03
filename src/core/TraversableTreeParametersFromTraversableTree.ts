import type { TraversableTree } from './TraversableTree';
import type { TreeTypeParameters } from './TreeTypeParameters';

export type TraversableTreeParametersFromTraversableTree<
  T extends TraversableTree<TreeTypeParameters>,
> = {
  VertexData: Parameters<
    T['makeVertex']
  >[1]['resolutionContext']['parentVertex']['$d'];
  VertexHint: Parameters<
    T['makeVertex']
  >[1]['resolutionContext']['parentVertex']['$c'][number];
};
