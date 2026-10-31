import { outputValue } from './helpers/rewriteOutput';
import {
  ObjectTreeSource,
  rewriteObject,
  createObjectMutationBinder,
  type ObjectTreeOptions,
  type RewriteObjectOptions,
  type ObjectTreeVertexTypes,
} from '../src';

// @ts-expect-error Default discovery cannot promise narrow keys or values.
new ObjectTreeSource<number, 'root', number>(1);
const rootOnly = {
  getRootPropertyFromInputObject: (value: number) => ({
    key: 'root' as const,
    value,
  }),
};
// @ts-expect-error A root adapter alone cannot validate descendant domains.
new ObjectTreeSource<number, 'root', number>(1, rootOnly);
// @ts-expect-error Spreading a root-only bag cannot bypass required discovery.
new ObjectTreeSource<number, 'root', number>(1, { ...rootOnly });
const childrenOnly = { getChildrenOfProperty: () => [] };
// @ts-expect-error A child adapter alone cannot validate the root domain.
new ObjectTreeSource<number, 'root', number>(1, childrenOnly);
// @ts-expect-error Options themselves retain required adapters.
const unsafeOptions: ObjectTreeOptions<number, 'root', number, 'root', number> =
  {};
// @ts-expect-error Rewrite helpers require the same two adapters.
rewriteObject<number, 'root', number>(1, rootOnly);
// @ts-expect-error Output generics alone cannot assert converted output.
rewriteObject<number, PropertyKey, unknown, string>(1);
// @ts-expect-error Pretyped options cannot omit the required converter.
const noConverter: RewriteObjectOptions<
  number,
  PropertyKey,
  unknown,
  string,
  PropertyKey,
  unknown
> = {};
const outputOnly = { convertRootValue: (value: string) => value.toUpperCase() };
// @ts-expect-error A converter must accept arbitrary reconstructed/current values.
rewriteObject(1, outputOnly);
// @ts-expect-error Spread converters cannot narrow their input domain.
rewriteObject(1, { ...outputOnly });
const precise = ObjectTreeSource.fromProperties(1, {
  ...rootOnly,
  ...childrenOnly,
});
const rootValue: number =
  precise.resolveRoot().vertex.vertexContent.$data.value;
const defaultChildren = ObjectTreeSource.getChildrenOfPropertyDefault({
  key: 'root' as const,
  value: { child: 'text' },
});
// @ts-expect-error Discovery includes arbitrary descendant values.
const numeric: number = defaultChildren[0]!.value;
// @ts-expect-error Discovery includes arbitrary descendant keys.
const rootKey: 'root' = defaultChildren[0]!.key;
const mapper = ObjectTreeSource.createRootPropertyMapper('root' as const);
const mappedValue: { count: number } = mapper({ count: 1 }).value;
const mappedKey: 'root' = mapper(1).key;
const converted = rewriteObject([1, 2], {
  convertRootValue(value, context) {
    const complete: boolean = context.complete;
    // @ts-expect-error The converter sees mixed reconstruction, never a guaranteed string.
    value.toUpperCase();
    return { value, complete };
  },
});
const complete: boolean = outputValue(converted)!.complete;
const bind = createObjectMutationBinder<
  ObjectTreeVertexTypes<'root', number>,
  ObjectTreeVertexTypes<'replacement', string>
>();
declare const args: Parameters<typeof bind>;
// @ts-expect-error Even narrow replacement payloads do not promise narrow assembled values.
const assembled: string = bind(...args).assembleComposite();
rewriteObject<number, 'root', number, unknown, 'replacement', string>(1, {
  ...rootOnly,
  ...childrenOnly,
  rewrite(prop, context) {
    // @ts-expect-error Current values may include mixed reconstructed containers.
    const narrow: number | string = prop.value;
    // @ts-expect-error An assembled container need not be a replacement payload.
    const assembled: string | undefined = prop.assembledComposite;
    // @ts-expect-error Live values retain the unknown assembly domain.
    const live: number | string = context.vertex.getData().value;
    void [narrow, assembled, live];
    return { kind: 'rewrite', patch: { value: 'valid replacement' } };
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
const narrowCache = new Map<Parameters<typeof bind>[1]['vertexRef'], string>();
createObjectMutationBinder<
  ObjectTreeVertexTypes<'root', number>,
  ObjectTreeVertexTypes<'replacement', string>
>({
  // @ts-expect-error Library assembly writes arbitrary reconstructed values.
  assembledMap: narrowCache,
});

// @ts-expect-error The precise route requires both adapters too.
ObjectTreeSource.fromProperties(1, rootOnly);
// @ts-expect-error A spread bag cannot assert output without conversion.
rewriteObject<number, PropertyKey, unknown, string>(1, { ...{} });
rewriteObject<number, 'root', number, unknown, 'replacement', string>(1, {
  ...rootOnly,
  ...childrenOnly,
  // @ts-expect-error Replacement patches retain their declared output payload type.
  rewrite: () => ({ kind: 'rewrite', patch: { value: 3 } }),
});
const defaultSource = new ObjectTreeSource([1, 'two']);
// @ts-expect-error Raw source discovery remains unknown for mixed containers.
const raw: number | string =
  defaultSource.resolveRoot().vertex.vertexContent.$data.value;
const defaultMapped = ObjectTreeSource.createRootPropertyMapper()(1);
const defaultMappedValue: number = defaultMapped.value;
const defaultMappedKey: '__TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__' =
  defaultMapped.key;
void [raw, defaultMappedValue, defaultMappedKey];

// @ts-expect-error A generic root key cannot replace the actual default root key.
ObjectTreeSource.createRootPropertyMapper<'fake'>();
// @ts-expect-error Default child discovery cannot assert arbitrary generic domains.
ObjectTreeSource.getChildrenOfPropertyDefault<'root', number>({
  key: 'root',
  value: 1,
});
