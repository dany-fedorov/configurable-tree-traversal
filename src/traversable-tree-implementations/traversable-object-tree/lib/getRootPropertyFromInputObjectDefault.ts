import type {TraversableObjectPropKey} from "@traversable-object-tree/lib/TraversableObjectPropKey";
import type {
  TraversableObjectTreeInstanceConfigInput
} from "@traversable-object-tree/lib/TraversableObjectTreeInstanceConfig";
import {__TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__} from "@traversable-object-tree/lib/constants";

export function getRootPropertyFromInputObjectDefault<
  In,
  K extends TraversableObjectPropKey,
  V,
  >(
  rootKey?: K,
): Required<
  TraversableObjectTreeInstanceConfigInput<In, K, V>
  >['getRootPropertyFromInputObject'] {
  return function getRootPropertyFromInputObjectDefault_implementation(
    inputObject: In,
  ) {
    return {
      key: (rootKey ?? __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__) as K,
      value: inputObject as unknown as V,
    };
  };
}
