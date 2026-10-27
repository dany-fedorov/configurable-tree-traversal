// Packed public contracts; exercise actual calls under both declaration loaders.
import {
  ObjectTreeSource,
  objectRewrite as rewriteApi,
  rewriteObject,
  MutableRef,
  type VertexRef,
  type VertexTypes,
  type Vertex,
  createObjectMutationBinder,
  type ObjectRewriteCallback,
  type ObjectRewriteInput,
  type ObjectRewriteContext,
  type ObjectTreeVertexTypes,
  type ResolvedTreeVertexTypes,
  type ObjectPropertyPatch,
  rewriteObjectAs,
} from 'configurable-tree-traversal';
import {
  rewriteObject as subpathRewriteObject,
  rewriteObjectAs as subpathRewriteObjectAs,
} from 'configurable-tree-traversal/tools/rewrite-object';

// @ts-expect-error Reconstruction alone does not preserve arbitrary input shape.
rewriteObject({ count: 1 }).outputAtReturn!.count;
const changed = rewriteObject(
  { count: 1 },
  {
    rewrite: ({ key }) =>
      key === 'count' ? { rewrite: { key: 'renamed' } } : undefined,
  },
);
// @ts-expect-error Arbitrary rewrites do not preserve the input shape.
changed.outputAtReturn!.count;
// @ts-expect-error The final output default is conservative too.
changed.getOutput()!.count;
const typed = rewriteObjectAs<{ renamed: number }>(
  { count: 1 },
  {
    rewrite: ({ key }) =>
      key === 'count' ? { rewrite: { key: 'renamed' } } : undefined,
  },
);
const value: number = typed.getOutput()!.renamed;
const namespaceValue: number = rewriteApi
  .rewriteObjectAs<number>(1)
  .getOutput()!;
const subpathValue: number = subpathRewriteObjectAs<number>(1).getOutput()!;
const inferred = rewriteObject(1, {
  getOutputObjectFromRootValue: () => ({ converted: true }),
});
const converted: boolean = inferred.getOutput()!.converted;
const snapshotConverted: boolean = inferred.outputAtReturn!.converted;
const explicit = rewriteObject<
  Record<string, never>,
  PropertyKey,
  unknown,
  { renamed: number },
  PropertyKey,
  unknown
>({});
const explicitValue: number = explicit.getOutput()!.renamed;
const source = new ObjectTreeSource({ count: 1 });
// @ts-expect-error The rewrite helper owns its source.
rewriteObject({}, { traversableTree: source });
// @ts-expect-error Presence is invalid even with undefined.
rewriteObject({}, { traversableTree: undefined });
const optionsWithSource = {
  traversableTree: source,
  assembleCompositesBeforeRewrite: true,
};
// @ts-expect-error Pretyped options cannot provide an ignored source.
rewriteObject({}, optionsWithSource);
// @ts-expect-error The explicit helper also owns its source.
rewriteObjectAs<number>({}, { traversableTree: source });
// @ts-expect-error The explicit helper rejects pretyped source options.
rewriteObjectAs<number>({}, optionsWithSource);
// @ts-expect-error The explicit helper rejects a present undefined source.
rewriteObjectAs<number>({}, { traversableTree: undefined });
rewriteObjectAs<unknown>(
  {},
  {
    rewrite: ({ value, key }) => {
      const propertyKey: PropertyKey = key;
      // @ts-expect-error Property values remain unknown despite the explicit output selection.
      const numeric: number = value;
      void [propertyKey, numeric];
      return undefined;
    },
  },
);
void [
  value,
  namespaceValue,
  subpathValue,
  converted,
  snapshotConverted,
  explicitValue,
];

const rootAndSubpath: typeof subpathRewriteObject = rewriteObject;
declare const vertexRef: VertexRef<VertexTypes>;
const genericRef: MutableRef<Vertex<VertexTypes>> = vertexRef;
void [rootAndSubpath, genericRef];

rewriteObject<number, string, number, unknown, symbol, string>(1, {
  rewrite(prop, context) {
    // @ts-expect-error A configured visitor can already have rewritten the value.
    const value: number = prop.value;
    // @ts-expect-error Current keys include output keys.
    const key: string = prop.key;
    // @ts-expect-error The live vertex includes rewritten output values.
    const vertexValue: number = context.vertex.getData().value;
    // @ts-expect-error The live reference includes rewritten output values.
    const refValue: number = context.vertexRef.getValue().getData().value;
    // @ts-expect-error The live tree includes rewritten output values.
    const treeValue: number = context.resolvedTree
      .getRoot()!
      .getValue()
      .getData().value;
    // @ts-expect-error Previously visited vertices can already be rewritten.
    const previousValue: number = context
      .previousPhaseVertexRef!.getValue()
      .getData().value;
    // @ts-expect-error Live paths include output keys.
    const path: string[] = context.getKeyPath();
    const originalValue: number = context
      .originalTreeView!.getRoot()!
      .getValue()
      .getData().value;
    const assembled: string | undefined = prop.assembledComposite;
    void [
      value,
      key,
      vertexValue,
      refValue,
      treeValue,
      previousValue,
      path,
      originalValue,
      assembled,
    ];
    return undefined;
  },
  isArray(prop) {
    // @ts-expect-error Classifiers inspect current input-or-output data.
    const value: number = prop.value;
    void value;
    return false;
  },
  isObject(prop) {
    // @ts-expect-error Classifiers inspect current input-or-output data.
    const value: number = prop.value;
    void value;
    return false;
  },
  assembleArray(children, prop, [vertex, context]) {
    // @ts-expect-error Assemblers inspect current input-or-output data.
    const value: number = prop.value;
    // @ts-expect-error An unchanged child can retain its input value.
    const childValue: string = children[0]!.value;
    const liveValue: string | number = vertex.getData().value;
    const pathValue: string | number = context.vertexRef
      .getValue()
      .getData().value;
    void [value, childValue, liveValue, pathValue];
    return '';
  },
  assembleObject(children, prop) {
    // @ts-expect-error An unchanged child can retain its input value.
    const childValue: string = children[0]!.value;
    void childValue;
    // @ts-expect-error Assemblers inspect current input-or-output data.
    const value: number = prop.value;
    void value;
    return '';
  },
});

type ExtendedProp = { key: string; value: number; note: string };
type Extended = VertexTypes<ExtendedProp, ExtendedProp>;
const bind = createObjectMutationBinder<Extended, Extended>();
declare const args: Parameters<typeof bind>;
// @ts-expect-error Object patches change key/value only, even for extended data.
bind(...args).makeMutationCommand({ rewrite: { note: 'new' } });

const callback: ObjectRewriteCallback<string, number, symbol, string> = (
  prop,
  context,
) => {
  const input: ObjectRewriteInput<string, number, symbol, string> = prop;
  const live: ObjectRewriteContext<string, number, symbol, string> = context;
  const key: string | symbol = input.key;
  const value: number | string = input.value;
  void [live, key, value];
  return undefined;
};
const patch: ObjectPropertyPatch<ObjectTreeVertexTypes<string, number>> = {
  value: 1,
};
declare const resolved: ResolvedTreeVertexTypes<
  ObjectTreeVertexTypes<string, number>
>;
const retainedValue: number = resolved.VertexData.getValue().getData().value;
const mapper = ObjectTreeSource.createRootPropertyMapper<
  number,
  string,
  number,
  string,
  number
>('root');
const rootValue: number = mapper(1).value;
void [callback, patch, retainedValue, rootValue];
