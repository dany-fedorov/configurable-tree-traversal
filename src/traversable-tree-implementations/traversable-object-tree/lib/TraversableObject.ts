import type { ObjectPropertyKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';

export type NestedObjectOrArray<K extends ObjectPropertyKey, PV> =
  | Array<NestedObjectOrArray<K, PV> | PV>
  | {
      [KK in K]: NestedObjectOrArray<K, PV> | PV;
    };
