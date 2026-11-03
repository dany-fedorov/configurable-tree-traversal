import type { ObjectPropertyKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { ObjectPropertyRecord } from '@traversable-object-tree/lib/TraversableObjectProp';
import type { ObjectPropertyTreeVertexTypes } from '@traversable-object-tree/lib/ObjectTreeVertexTypes';
import { PRIMITIVE_TYPEOF_TYPES } from '@traversable-object-tree/lib/constants';

export function enumerateOwnEnumerableChildProperties(
  prop: ObjectPropertyRecord<ObjectPropertyKey, unknown>,
): ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>['ChildHint'][] {
  const { propertyValue } = prop;
  if (
    PRIMITIVE_TYPEOF_TYPES.includes(typeof propertyValue) ||
    propertyValue === null
  ) {
    return [];
  }

  const enumerableSymbolKeys = Object.getOwnPropertySymbols(
    propertyValue,
  ).filter((propertyKey) =>
    Object.prototype.propertyIsEnumerable.call(propertyValue, propertyKey),
  );

  if (Array.isArray(propertyValue)) {
    const stringKeys = Object.keys(propertyValue);
    return [...stringKeys, ...enumerableSymbolKeys].map((propertyKey) => ({
      propertyKey: isArrayIndex(propertyKey)
        ? Number(propertyKey)
        : propertyKey,
      propertyValue: propertyValue[propertyKey as keyof typeof propertyValue],
    }));
  }

  const objectValue = propertyValue as Record<PropertyKey, unknown>;
  return [...Object.keys(objectValue), ...enumerableSymbolKeys].map(
    (propertyKey) => ({
      propertyKey,
      propertyValue: objectValue[propertyKey],
    }),
  );
}

function isArrayIndex(propertyKey: string | symbol): propertyKey is string {
  if (typeof propertyKey !== 'string' || propertyKey === '') {
    return false;
  }
  const index = Number(propertyKey);
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < 2 ** 32 - 1 &&
    String(index) === propertyKey
  );
}
