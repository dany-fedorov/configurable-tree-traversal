import type { ObjectPropertyKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';

export type ObjectPropertyRecord<K extends ObjectPropertyKey, V> = {
  propertyKey: K;
  propertyValue: V;
};
