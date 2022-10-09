import type {TraversableObjectPropKey} from "@traversable-object-tree/lib/TraversableObjectPropKey";

export type TraversableObject<K extends TraversableObjectPropKey, PV> =
  | Array<TraversableObject<K, PV> | PV>
  | {
  [KK in K]: TraversableObject<K, PV> | PV;
};
