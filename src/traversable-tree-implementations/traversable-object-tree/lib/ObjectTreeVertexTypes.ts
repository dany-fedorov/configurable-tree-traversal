import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { TraversableObjectProp } from '@traversable-object-tree/lib/TraversableObjectProp';

export type ObjectTreeVertexTypes<
  K extends TraversableObjectPropKey,
  V,
> = VertexTypes<TraversableObjectProp<K, V>, TraversableObjectProp<K, V>>;
