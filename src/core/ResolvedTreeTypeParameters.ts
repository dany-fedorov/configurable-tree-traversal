import type { CTTRef } from './CTTRef';
import type { Vertex } from './Vertex';
import type { TreeTypeParameters } from './TreeTypeParameters';

export interface ResolvedTreeTypeParameters<TTP extends TreeTypeParameters> {
  VertexData: CTTRef<Vertex<TTP>>;
  VertexHint: CTTRef<Vertex<TTP>>;
}
