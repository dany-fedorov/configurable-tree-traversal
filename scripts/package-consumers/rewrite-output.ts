// Packed public contracts; exercise actual calls under both declaration loaders.
import {
  ObjectTreeSource,
  objectRewrite as rewriteApi,
  rewriteObject,
  MutableRef,
  type VertexRef,
  type VertexTypes,
  type Vertex,
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
