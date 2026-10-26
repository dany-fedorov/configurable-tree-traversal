import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { MutableRef } from '@core/CTTRef';

export interface ResolvedTreeTypeParameters<TTP extends VertexTypes> {
  VertexData: MutableRef<Vertex<TTP>>;
  VertexHint: MutableRef<Vertex<TTP>>;
}
