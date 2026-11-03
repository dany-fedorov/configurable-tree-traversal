import { outputValue } from './helpers/rewriteOutput';
import {
  ObjectPropertyTreeSource,
  rewriteObject,
  createObjectPropertyMutationHelperBinder,
  type ObjectPropertyTreeSourceOptions,
  type ObjectPropertyRewriteOptions,
  type ObjectPropertyTreeVertexTypes,
} from '../src';

// @ts-expect-error Default discovery cannot promise narrow keys or values.
new ObjectPropertyTreeSource<number, 'root', number>(1);
const rootOnly = {
  mapInputToRootProperty: (value: number) => ({
    propertyKey: 'root' as const,
    propertyValue: value,
  }),
};
// @ts-expect-error A root adapter alone cannot validate descendant domains.
new ObjectPropertyTreeSource<number, 'root', number>(1, rootOnly);
// @ts-expect-error Spreading a root-only bag cannot bypass required discovery.
new ObjectPropertyTreeSource<number, 'root', number>(1, { ...rootOnly });
const childrenOnly = { enumerateChildPropertyHints: () => [] };
// @ts-expect-error A child adapter alone cannot validate the root domain.
new ObjectPropertyTreeSource<number, 'root', number>(1, childrenOnly);
// @ts-expect-error Options themselves retain required adapters.
const unsafeOptions: ObjectPropertyTreeSourceOptions<
  number,
  'root',
  number,
  'root',
  number
> = {};
// @ts-expect-error Rewrite helpers require the same two adapters.
rewriteObject<number, 'root', number>(1, rootOnly);
// @ts-expect-error Output generics alone cannot assert converted output.
rewriteObject<number, PropertyKey, unknown, string>(1);
// @ts-expect-error Pretyped options cannot omit the required converter.
const noConverter: ObjectPropertyRewriteOptions<
  number,
  PropertyKey,
  unknown,
  string,
  PropertyKey,
  unknown
> = {};
const outputOnly = {
  convertPresentRootOutputValue: (value: string) => value.toUpperCase(),
};
// @ts-expect-error A converter must accept arbitrary reconstructed/current values.
rewriteObject(1, outputOnly);
// @ts-expect-error Spread converters cannot narrow their input domain.
rewriteObject(1, { ...outputOnly });
const precise = ObjectPropertyTreeSource.fromPropertyAdapters(1, {
  ...rootOnly,
  ...childrenOnly,
});
const rootValue: number =
  precise.resolveRootVertex().resolvedVertexInput.vertexContentInput.$vertexData
    .propertyValue;
const defaultChildren =
  ObjectPropertyTreeSource.enumerateOwnEnumerableChildProperties({
    propertyKey: 'root' as const,
    propertyValue: { child: 'text' },
  });
// @ts-expect-error Discovery includes arbitrary descendant values.
const numeric: number = defaultChildren[0]!.propertyValue;
// @ts-expect-error Discovery includes arbitrary descendant keys.
const rootKey: 'root' = defaultChildren[0]!.propertyKey;
const mapper = ObjectPropertyTreeSource.createInputValueToRootPropertyMapper(
  'root' as const,
);
const mappedValue: { count: number } = mapper({ count: 1 }).propertyValue;
const mappedKey: 'root' = mapper(1).propertyKey;
const converted = rewriteObject([1, 2], {
  convertPresentRootOutputValue(value, context) {
    const complete: boolean = context.isTraversalFinished;
    // @ts-expect-error The converter sees mixed reconstruction, never a guaranteed string.
    value.toUpperCase();
    return { value, complete };
  },
});
const complete: boolean = outputValue(converted)!.complete;
const bind = createObjectPropertyMutationHelperBinder<
  ObjectPropertyTreeVertexTypes<'root', number>,
  ObjectPropertyTreeVertexTypes<'replacement', string>
>();
declare const args: Parameters<typeof bind>;
// @ts-expect-error Even narrow replacement payloads do not promise narrow assembled values.
const assembled: string = bind(...args).assembleCompositeFromCurrentChildren();
rewriteObject<number, 'root', number, unknown, 'replacement', string>(1, {
  ...rootOnly,
  ...childrenOnly,
  rewritePropertyAfterChildTraversal(prop, context) {
    // @ts-expect-error Current values may include mixed reconstructed containers.
    const narrow: number | string = prop.propertyValue;
    // @ts-expect-error An assembled container need not be a replacement payload.
    const assembled: string | undefined =
      prop.assembledValueFromCurrentChildren;
    // @ts-expect-error Live values retain the unknown assembly domain.
    const live: number | string = context.vertex.getVertexData().propertyValue;
    void [narrow, assembled, live];
    return {
      kind: 'patchPropertyKeyOrValue',
      propertyPatch: { propertyValue: 'valid replacement' },
    };
  },
});
void [
  unsafeOptions,
  noConverter,
  rootValue,
  numeric,
  rootKey,
  mappedValue,
  mappedKey,
  complete,
  assembled,
];

// A cache written by assembly cannot retain a false string-only read type.
const narrowCache = new Map<
  Parameters<typeof bind>[1]['vertexHandle'],
  string
>();
createObjectPropertyMutationHelperBinder<
  ObjectPropertyTreeVertexTypes<'root', number>,
  ObjectPropertyTreeVertexTypes<'replacement', string>
>({
  // @ts-expect-error Library assembly writes arbitrary reconstructed values.
  assemblyCache: narrowCache,
});

// @ts-expect-error The precise route requires both adapters too.
ObjectPropertyTreeSource.fromPropertyAdapters(1, rootOnly);
// @ts-expect-error A spread bag cannot assert output without conversion.
rewriteObject<number, PropertyKey, unknown, string>(1, { ...{} });
rewriteObject<number, 'root', number, unknown, 'replacement', string>(1, {
  ...rootOnly,
  ...childrenOnly,
  // @ts-expect-error Replacement patches retain their declared output payload type.
  rewritePropertyAfterChildTraversal: () => ({
    kind: 'patchPropertyKeyOrValue',
    propertyPatch: { propertyValue: 3 },
  }),
});
const defaultSource = new ObjectPropertyTreeSource([1, 'two']);
// @ts-expect-error Raw source discovery remains unknown for mixed containers.
const raw: number | string =
  defaultSource.resolveRootVertex().resolvedVertexInput.vertexContentInput
    .$vertexData.propertyValue;
const defaultMapped =
  ObjectPropertyTreeSource.createInputValueToRootPropertyMapper()(1);
const defaultMappedValue: number = defaultMapped.propertyValue;
const defaultMappedKey: '__TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__' =
  defaultMapped.propertyKey;
void [raw, defaultMappedValue, defaultMappedKey];

// @ts-expect-error A generic root key cannot replace the actual default root key.
ObjectPropertyTreeSource.createInputValueToRootPropertyMapper<'fake'>();
// @ts-expect-error Default child discovery cannot assert arbitrary generic domains.
ObjectPropertyTreeSource.enumerateOwnEnumerableChildProperties<'root', number>({
  propertyKey: 'root',
  propertyValue: 1,
});
