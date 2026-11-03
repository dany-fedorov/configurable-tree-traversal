import {
  type VertexDataReplacementOrDeletionRequest,
  createObjectPropertyMutationHelperBinder,
  type ObjectPropertyTreeVertexTypes,
  type ObjectChildPropertyResolutionOverrideResult,
  ObjectPropertyTreeSource,
} from '../src';
const generic: VertexDataReplacementOrDeletionRequest<number> = {
  kind: 'replaceData',
  replacementData: 1,
};
// @ts-expect-error Old optional fields are removed.
const old: VertexDataReplacementOrDeletionRequest<number> = { rewrite: 1 };
// @ts-expect-error Mutually exclusive operations.
const conflict: VertexDataReplacementOrDeletionRequest<number> = {
  kind: 'keep',
  replacementData: 1,
};
const hook: ObjectChildPropertyResolutionOverrideResult<
  ObjectPropertyTreeVertexTypes<PropertyKey, unknown>
> = { kind: 'useDefaultChildPropertyResolution' };
const bind = createObjectPropertyMutationHelperBinder<
  ObjectPropertyTreeVertexTypes<PropertyKey, unknown>,
  ObjectPropertyTreeVertexTypes<PropertyKey, unknown>
>({
  arrayAssemblyIndexPolicy: 'preserveNumericIndicesAndArrayLength',
  assembledPropertyKeyCollisionPolicy: 'keepFirstProperty',
});
void [generic, old, conflict, hook, bind];

type Prop = ObjectPropertyTreeVertexTypes<PropertyKey, unknown>;
const badObject: import('../src').ObjectPropertyRewriteRequest<Prop> = {
  kind: 'patchPropertyKeyOrValue',
  // @ts-expect-error Object requests use patch rather than generic replacement value.
  propertyValue: 1,
};
new ObjectPropertyTreeSource(
  {},
  // @ts-expect-error Retired hook name is removed.
  { resolveVertexHook: () => ({ kind: 'useDefault' }) },
);
void badObject;
