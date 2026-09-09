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
  if (PRIMITIVE_TYPEOF_TYPES.includes(typeof value) || value === null) {
    return [];
  }

  const enumerableSymbolKeys = Object.getOwnPropertySymbols(value).filter(
    (key) => Object.prototype.propertyIsEnumerable.call(value, key),
  );

  if (Array.isArray(value)) {
    const stringKeys = Object.keys(value);
    return [...stringKeys, ...enumerableSymbolKeys].map((key) => ({
      key: (isArrayIndex(key) ? Number(key) : key) as K,
      value: value[key as keyof typeof value] as V,
    }));
  }

  const objectValue = value as Record<PropertyKey, V>;
  return [...Object.keys(objectValue), ...enumerableSymbolKeys].map((key) => ({
    key: key as K,
    value: objectValue[key] as V,
  }));
}

function isArrayIndex(key: string | symbol): key is string {
  if (typeof key !== 'string' || key === '') {
    return false;
  }
  const index = Number(key);
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < 2 ** 32 - 1 &&
    String(index) === key
  );
}
