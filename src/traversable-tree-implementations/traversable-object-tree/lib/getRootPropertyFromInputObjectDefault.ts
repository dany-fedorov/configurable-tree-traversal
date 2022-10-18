import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { TraversableObjectTreeInstanceConfigInput } from '@traversable-object-tree/lib/TraversableObjectTreeInstanceConfig';
import { __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__ } from '@traversable-object-tree/lib/constants';

export function getRootPropertyFromInputObjectDefault<
  In,
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
>(
  rootKey?: InK,
): Required<
  TraversableObjectTreeInstanceConfigInput<In, InK, InV, OutK, OutV>
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
