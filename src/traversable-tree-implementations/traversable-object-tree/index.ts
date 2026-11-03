export { ObjectPropertyTreeSource } from './TraversableObjectTree';
export { createObjectPropertyMutationHelperBinder } from './lib/makeMutationCommandFactory';
export type {
  ObjectMutationOptions,
  ObjectPropertyAssemblyCache,
  ObjectPropertyKeyValuePatch,
  ObjectPropertyRewriteRequest,
  BoundObjectPropertyMutationHelpers,
  ObjectPropertyMutationHelperBinder,
  ObjectPropertyMutationHelperBinderFactory,
} from './lib/makeMutationCommandFactory';
export type { ObjectPropertyAssemblyClassification } from './lib/TO_IsCompositeAssertionsMixin';
export type { NestedObjectOrArray } from './lib/TraversableObject';
export type { ObjectPropertyRecord } from './lib/TraversableObjectProp';
export type { ObjectPropertyKey } from './lib/TraversableObjectPropKey';
export type {
  ObjectChildPropertyResolutionOverrideResult,
  ObjectPropertyTreeSourceOptions,
  ObjectPropertyTreeAdapters,
} from './lib/TraversableObjectTreeInstanceConfig';
export type { ObjectPropertyTreeVertexTypes } from './lib/ObjectTreeVertexTypes';
export type { LiveObjectPropertyVertexTypes } from './lib/ObjectCurrentVertexTypes';
