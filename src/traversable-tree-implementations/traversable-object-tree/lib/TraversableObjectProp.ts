import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';

export type TraversableObjectProp<K extends TraversableObjectPropKey, V> = {
  key: K;
  value: V;
};
