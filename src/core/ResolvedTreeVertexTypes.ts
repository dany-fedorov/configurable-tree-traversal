import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { MutableRef } from '@core/CTTRef';

export interface ResolvedTreeVertexTypes<InputTypes extends VertexTypes> {
  VertexData: MutableRef<Vertex<InputTypes>>;
  VertexHint: MutableRef<Vertex<InputTypes>>;
}
