import { capturedOutputValue, outputValue } from './helpers/rewriteOutput';
import {
  ObjectTreeSource,
  objectRewrite as rewriteApi,
  rewriteObjectAs,
} from '../src';
import {
  rewriteObject,
  rewriteObjectAs as subpathRewriteObjectAs,
} from '../src/tools/rewrite-object';

// @ts-expect-error Reconstruction alone does not preserve arbitrary input shape.
capturedOutputValue(rewriteObject({ count: 1 }))!.count;
const changed = rewriteObject(
  { count: 1 },
  {
    rewrite: ({ key }) =>
      key === 'count'
        ? { kind: 'rewrite', patch: { key: 'renamed' } }
        : undefined,
  },
);
// @ts-expect-error Arbitrary rewrites do not preserve the input shape.
capturedOutputValue(changed)!.count;
// @ts-expect-error The final output default is conservative too.
outputValue(changed)!.count;
const typed = rewriteObjectAs<{ renamed: number }>(
  { count: 1 },
  {
    rewrite: ({ key }) =>
      key === 'count'
        ? { kind: 'rewrite', patch: { key: 'renamed' } }
        : undefined,
  },
);
const value: number = outputValue(typed)!.renamed;
const namespaceValue: number = outputValue(
  rewriteApi.rewriteObjectAs<number>(1),
)!;
const subpathValue: number = outputValue(subpathRewriteObjectAs<number>(1))!;
const inferred = rewriteObject(1, {
  convertRootValue: () => ({ converted: true }),
});
const converted: boolean = outputValue(inferred)!.converted;
const snapshotConverted: boolean = capturedOutputValue(inferred)!.converted;
// @ts-expect-error A generic output selection requires a converter.
const explicit = rewriteObject<
  Record<string, never>,
  PropertyKey,
  unknown,
  { renamed: number },
  PropertyKey,
  unknown
>({});
const explicitValue: number = outputValue(explicit)!.renamed;
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
