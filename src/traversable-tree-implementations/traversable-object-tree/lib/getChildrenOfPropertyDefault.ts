import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { TraversableObjectProp } from '@traversable-object-tree/lib/TraversableObjectProp';
import type { TraversableObjectTTP } from '@traversable-object-tree/lib/TraversableObjectTTP';
import { PRIMITIVE_TYPEOF_TYPES } from '@traversable-object-tree/lib/constants';

export function getChildrenOfPropertyDefault<
  K extends TraversableObjectPropKey,
  V,
>(
  prop: TraversableObjectProp<K, V>,
): TraversableObjectTTP<K, V>['VertexHint'][] {
  const { value } = prop;
  if (PRIMITIVE_TYPEOF_TYPES.includes(typeof value)) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((v, i) => {
      return {
        key: i as K,
        value: v,
      };
    });
  } else {
    return Object.entries(value).map((v) => {
      return {
        key: v[0] as K,
        value: v[1] as V,
      };
    });
  }
}
