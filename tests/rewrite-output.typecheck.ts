import { capturedOutputValue, outputValue } from './helpers/rewriteOutput';
import {
  ObjectPropertyTreeSource,
  objectRewrite as rewriteApi,
  rewriteObjectWithAssertedOutputType,
} from '../src';
import {
  rewriteObject,
  rewriteObjectWithAssertedOutputType as subpathRewriteObjectAs,
} from '../src/tools/rewrite-object';

// @ts-expect-error Reconstruction alone does not preserve arbitrary input shape.
capturedOutputValue(rewriteObject({ count: 1 }))!.count;
const changed = rewriteObject(
  { count: 1 },
  {
    rewritePropertyAfterChildTraversal: ({ propertyKey: key }) =>
      key === 'count'
        ? {
            kind: 'patchPropertyKeyOrValue',
            propertyPatch: { propertyKey: 'renamed' },
          }
        : undefined,
  },
);
// @ts-expect-error Arbitrary rewrites do not preserve the input shape.
capturedOutputValue(changed)!.count;
// @ts-expect-error The final output default is conservative too.
outputValue(changed)!.count;
const typed = rewriteObjectWithAssertedOutputType<{ renamed: number }>(
  { count: 1 },
  {
    rewritePropertyAfterChildTraversal: ({ propertyKey: key }) =>
      key === 'count'
        ? {
            kind: 'patchPropertyKeyOrValue',
            propertyPatch: { propertyKey: 'renamed' },
          }
        : undefined,
  },
);
const value: number = outputValue(typed)!.renamed;
const namespaceValue: number = outputValue(
  rewriteApi.rewriteObjectWithAssertedOutputType<number>(1),
)!;
const subpathValue: number = outputValue(subpathRewriteObjectAs<number>(1))!;
const inferred = rewriteObject(1, {
  convertPresentRootOutputValue: () => ({ converted: true }),
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
const source = new ObjectPropertyTreeSource({ count: 1 });
// @ts-expect-error The rewrite helper owns its source.
rewriteObject({}, { treeDiscoverySource: source });
// @ts-expect-error Presence is invalid even with undefined.
rewriteObject({}, { treeDiscoverySource: undefined });
const optionsWithSource = {
  treeDiscoverySource: source,
  includeAssembledValueInRewriteInput: true,
};
// @ts-expect-error Pretyped options cannot provide an ignored source.
rewriteObject({}, optionsWithSource);
rewriteObjectWithAssertedOutputType<number>(
  {},
  // @ts-expect-error The explicit helper also owns its source.
  { treeDiscoverySource: source },
);
// @ts-expect-error The explicit helper rejects pretyped source options.
rewriteObjectWithAssertedOutputType<number>({}, optionsWithSource);
rewriteObjectWithAssertedOutputType<number>(
  {},
  // @ts-expect-error The explicit helper rejects a present undefined source.
  { treeDiscoverySource: undefined },
);
rewriteObjectWithAssertedOutputType<unknown>(
  {},
  {
    rewritePropertyAfterChildTraversal: ({
      propertyValue: value,
      propertyKey: key,
    }) => {
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
