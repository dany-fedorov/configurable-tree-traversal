import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { CTTRef } from '@core/CTTRef';

export interface ResolvedTreeTypeParameters<TTP extends VertexTypes> {
  VertexData: CTTRef<Vertex<TTP>>;
  VertexHint: CTTRef<Vertex<TTP>>;
}
