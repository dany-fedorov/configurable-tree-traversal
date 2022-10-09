import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { CTTRef } from '@core/CTTRef';

export interface ResolvedTreeTypeParameters<TTP extends TreeTypeParameters> {
  VertexData: CTTRef<Vertex<TTP>>;
  VertexHint: CTTRef<Vertex<TTP>>;
}
