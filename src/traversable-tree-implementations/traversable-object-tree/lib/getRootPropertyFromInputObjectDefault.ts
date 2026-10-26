import { __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__ } from '@traversable-object-tree/lib/constants';
import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { ObjectTreeOptions } from '@traversable-object-tree/lib/TraversableObjectTreeInstanceConfig';

export function getRootPropertyFromInputObjectDefault<
  In,
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
>(
  rootKey?: InK,
): Required<
  ObjectTreeOptions<In, InK, InV, OutK, OutV>
>['getRootPropertyFromInputObject'] {
  return function getRootPropertyFromInputObjectDefault_implementation(
    inputObject: In,
  ) {
    return {
      key: (rootKey ?? __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__) as InK,
      value: inputObject as unknown as InV,
    };
  };
}
