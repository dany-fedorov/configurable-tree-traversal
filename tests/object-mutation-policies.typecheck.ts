import {
  type MutationRequest,
  createObjectMutationBinder,
  type ObjectTreeVertexTypes,
  type ObjectChildHookResult,
  ObjectTreeSource,
} from '../src';
const generic: MutationRequest<number> = { kind: 'rewrite', value: 1 };
// @ts-expect-error Old optional fields are removed.
const old: MutationRequest<number> = { rewrite: 1 };
// @ts-expect-error Mutually exclusive operations.
const conflict: MutationRequest<number> = { kind: 'keep', value: 1 };
const hook: ObjectChildHookResult<ObjectTreeVertexTypes<PropertyKey, unknown>> =
  { kind: 'useDefault' };
const bind = createObjectMutationBinder<
  ObjectTreeVertexTypes<PropertyKey, unknown>,
  ObjectTreeVertexTypes<PropertyKey, unknown>
>({ arrayIndexPolicy: 'preserveNumericKeys', propertyCollision: 'firstWins' });
void [generic, old, conflict, hook, bind];

type Prop = ObjectTreeVertexTypes<PropertyKey, unknown>;
const badObject: import('../src').ObjectMutationRequest<Prop> = {
  kind: 'rewrite',
  // @ts-expect-error Object requests use patch rather than generic replacement value.
  value: 1,
};
// @ts-expect-error Retired hook name is removed.
new ObjectTreeSource({}, { resolveVertexHook: () => ({ kind: 'useDefault' }) });
void badObject;
