import type { ObjectPropertyKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { ObjectPropertyRecord } from '@traversable-object-tree/lib/TraversableObjectProp';

export type ObjectPropertyTreeVertexTypes<
  K extends ObjectPropertyKey,
  V,
> = VertexDataAndChildHintTypes<
  ObjectPropertyRecord<K, V>,
  ObjectPropertyRecord<K, V>
>;
