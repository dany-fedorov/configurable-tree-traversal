import { __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__ } from './constants';
import type { ObjectPropertyKey } from './TraversableObjectPropKey';
import type { ObjectPropertyRecord } from './TraversableObjectProp';

export function createInputValueToRootPropertyMapper(
  rootKey?: undefined,
): <InputValue>(
  inputObject: InputValue,
) => ObjectPropertyRecord<
  typeof __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__,
  InputValue
>;
export function createInputValueToRootPropertyMapper<
  K extends ObjectPropertyKey,
>(
  rootKey: K,
): <InputValue>(inputObject: InputValue) => ObjectPropertyRecord<K, InputValue>;
export function createInputValueToRootPropertyMapper<
  K extends ObjectPropertyKey,
>(
  rootKey: K | undefined,
): <InputValue>(
  inputObject: InputValue,
) => ObjectPropertyRecord<
  K | typeof __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__,
  InputValue
>;

export function createInputValueToRootPropertyMapper(
  rootKey: ObjectPropertyKey = __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__,
) {
  return <InputValue>(inputObject: InputValue) => ({
    propertyKey: rootKey,
    propertyValue: inputObject,
  });
}
