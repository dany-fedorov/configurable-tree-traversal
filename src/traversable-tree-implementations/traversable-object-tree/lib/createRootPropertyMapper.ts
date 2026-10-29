import { __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__ } from './constants';
import type { TraversableObjectPropKey } from './TraversableObjectPropKey';
import type { TraversableObjectProp } from './TraversableObjectProp';

export function createRootPropertyMapper(
  rootKey?: undefined,
): <In>(
  inputObject: In,
) => TraversableObjectProp<
  typeof __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__,
  In
>;
export function createRootPropertyMapper<K extends TraversableObjectPropKey>(
  rootKey: K,
): <In>(inputObject: In) => TraversableObjectProp<K, In>;
export function createRootPropertyMapper<K extends TraversableObjectPropKey>(
  rootKey: K | undefined,
): <In>(
  inputObject: In,
) => TraversableObjectProp<
  K | typeof __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__,
  In
>;

export function createRootPropertyMapper(
  rootKey: TraversableObjectPropKey = __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__,
) {
  return <In>(inputObject: In) => ({ key: rootKey, value: inputObject });
}
