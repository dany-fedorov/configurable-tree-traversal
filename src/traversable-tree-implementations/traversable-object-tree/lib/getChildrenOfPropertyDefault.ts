import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { TraversableObjectProp } from '@traversable-object-tree/lib/TraversableObjectProp';
import type { ObjectTreeVertexTypes } from '@traversable-object-tree/lib/ObjectTreeVertexTypes';
import { PRIMITIVE_TYPEOF_TYPES } from '@traversable-object-tree/lib/constants';

export function getChildrenOfPropertyDefault(
  prop: TraversableObjectProp<TraversableObjectPropKey, unknown>,
): ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>['VertexHint'][] {
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
      key: isArrayIndex(key) ? Number(key) : key,
      value: value[key as keyof typeof value],
    }));
  }

  const objectValue = value as Record<PropertyKey, unknown>;
  return [...Object.keys(objectValue), ...enumerableSymbolKeys].map((key) => ({
    key,
    value: objectValue[key],
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
