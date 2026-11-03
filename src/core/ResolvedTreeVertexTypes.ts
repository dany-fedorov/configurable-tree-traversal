import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { MutableValueReference } from '@core/CTTRef';

export interface StoredTreeReferenceVertexTypes<
  InputTypes extends VertexDataAndChildHintTypes,
> {
  VertexData: MutableValueReference<Vertex<InputTypes>>;
  ChildHint: MutableValueReference<Vertex<InputTypes>>;
}
