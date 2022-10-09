import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversableObjectProp } from '@traversable-object-tree/lib/TraversableObjectProp';

export type TraversableObjectTTP<
  K extends TraversableObjectPropKey,
  V,
> = TreeTypeParameters<
  TraversableObjectProp<K, V>,
  TraversableObjectProp<K, V>
>;
