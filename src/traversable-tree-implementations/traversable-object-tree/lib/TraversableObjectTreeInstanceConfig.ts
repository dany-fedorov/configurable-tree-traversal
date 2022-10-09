import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { TraversableObjectProp } from '@traversable-object-tree/lib/TraversableObjectProp';
import type { TraversableObjectTTP } from '@traversable-object-tree/lib/TraversableObjectTTP';

export type TraversableObjectTreeInstanceConfigInput<
  In,
  K extends TraversableObjectPropKey,
  V,
> = {
  inputObject: In;
  getChildrenOfProperty?: (
    prop: TraversableObjectProp<K, V>,
  ) => TraversableObjectTTP<K, V>['VertexHint'][];
  getRootPropertyFromInputObject?: (
    inputObj: In,
  ) => TraversableObjectProp<K, V>;
};

export type TraversableObjectTreeInstanceConfig<
  In,
  InK extends TraversableObjectPropKey,
  InV,
> = Required<TraversableObjectTreeInstanceConfigInput<In, InK, InV>>;
