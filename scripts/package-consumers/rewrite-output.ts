// Packed public contracts; exercise actual calls under both declaration loaders.
import {
  ObjectPropertyTreeSource,
  objectRewrite as rewriteApi,
  rewriteObject,
  type VertexHandle,
  type VertexDataAndChildHintTypes,
  createObjectPropertyMutationHelperBinder,
  type ObjectPropertyPostOrderRewriteCallback,
  type ObjectPropertyRewriteInput,
  type ObjectPropertyRewriteContext,
  type ObjectPropertyTreeVertexTypes,
  type StoredTreeReferenceVertexTypes,
  type ObjectPropertyKeyValuePatch,
  DepthFirstTreeVisitPhase,
  TraversalVisitorCommandName,
  type LiveObjectPropertyVertexTypes,
  runTreeDepthFirstUntilSuspendedOrTerminal,
  rewriteObjectWithAssertedOutputType,
  type ObjectPropertyTreeSourceOptions,
  type ObjectPropertyRewriteOptions,
} from 'configurable-tree-traversal';
import {
  rewriteObject as subpathRewriteObject,
  rewriteObjectWithAssertedOutputType as subpathRewriteObjectAs,
} from 'configurable-tree-traversal/tools/rewrite-object';

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

const rootAndSubpath: typeof subpathRewriteObject = rewriteObject;
declare const vertexHandle: VertexHandle<VertexDataAndChildHintTypes>;
const genericRef: VertexHandle<VertexDataAndChildHintTypes> = vertexHandle;
void [rootAndSubpath, genericRef];

rewriteObject<number, string, number, unknown, symbol, string>(1, {
  mapInputToRootProperty: (value) => ({
    propertyKey: 'root',
    propertyValue: value,
  }),
  enumerateChildPropertyHints: () => [],
  rewritePropertyAfterChildTraversal(prop, context) {
    // @ts-expect-error A configured visitor can already have rewritten the value.
    const value: number = prop.propertyValue;
    // @ts-expect-error Current keys include output keys.
    const key: string = prop.propertyKey;
    // @ts-expect-error The live vertex includes rewritten output values.
    const vertexValue: number = context.vertex.getVertexData().propertyValue;
    // @ts-expect-error The live reference includes rewritten output values.
    const refValue: number = context.vertexHandle
      .getCurrentVertexView()
      .getVertexData().propertyValue;
    // @ts-expect-error The live tree includes rewritten output values.
    const treeValue: number = context.liveResolvedTreeView
      .getRootVertexHandleOrNull()!
      .getCurrentVertexView()
      .getVertexData().propertyValue;
    // @ts-expect-error Previously visited vertices can already be rewritten.
    const previousValue: number = context
      .previousCommittedVisitVertexHandleForSamePhase!.getCurrentVertexView()
      .getVertexData().propertyValue;
    // @ts-expect-error Live paths include output keys.
    const path: string[] = context.requirePropertyKeyPathFromRoot();
    const originalValue: number = context
      .livePreCommandDiscoveredTreeView!.getRootVertexHandleOrNull()!
      .getCurrentVertexView()
      .getVertexData().propertyValue;
    const assembled: unknown = prop.assembledValueFromCurrentChildren;
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
  matchesArrayAssemblyPredicate(prop) {
    // @ts-expect-error Classifiers inspect current input-or-output data.
    const value: number = prop.propertyValue;
    void value;
    return false;
  },
  matchesObjectAssemblyPredicate(prop) {
    // @ts-expect-error Classifiers inspect current input-or-output data.
    const value: number = prop.propertyValue;
    void value;
    return false;
  },
  assembleArrayValueFromChildProperties(children, prop, [vertex, context]) {
    // @ts-expect-error Assemblers inspect current input-or-output data.
    const value: number = prop.propertyValue;
    // @ts-expect-error An unchanged child can retain its input value.
    const childValue: string = children[0]!.propertyValue;
    const liveValue: unknown = vertex.getVertexData().propertyValue;
    const pathValue: unknown = context.vertexHandle
      .getCurrentVertexView()
      .getVertexData().propertyValue;
    void [value, childValue, liveValue, pathValue];
    return '';
  },
  assembleObjectValueFromChildProperties(children, prop) {
    // @ts-expect-error An unchanged child can retain its input value.
    const childValue: string = children[0]!.propertyValue;
    void childValue;
    // @ts-expect-error Assemblers inspect current input-or-output data.
    const value: number = prop.propertyValue;
    void value;
    return '';
  },
});

type ExtendedProp = {
  propertyKey: string;
  propertyValue: number;
  note: string;
};
type Extended = VertexDataAndChildHintTypes<ExtendedProp, ExtendedProp>;
const bind = createObjectPropertyMutationHelperBinder<Extended, Extended>();
declare const args: Parameters<typeof bind>;
bind(...args).createObjectPropertyMutationCommand({
  kind: 'patchPropertyKeyOrValue',
  // @ts-expect-error Object patches change key/value only, even for extended data.
  propertyPatch: { note: 'new' },
});

const callback: ObjectPropertyPostOrderRewriteCallback<
  string,
  number,
  symbol,
  string
> = (prop, context) => {
  const input: ObjectPropertyRewriteInput<string, number, symbol, string> =
    prop;
  const live: ObjectPropertyRewriteContext<string, number, symbol, string> =
    context;
  const key: string | symbol = input.propertyKey;
  const value: unknown = input.propertyValue;
  void [live, key, value];
  return undefined;
};
const patch: ObjectPropertyKeyValuePatch<
  ObjectPropertyTreeVertexTypes<string, number>
> = {
  propertyValue: 1,
};
declare const resolved: StoredTreeReferenceVertexTypes<
  ObjectPropertyTreeVertexTypes<string, number>
>;
const retainedValue: number =
  resolved.VertexData.getReferencedValue().getVertexData().propertyValue;
const mapper =
  ObjectPropertyTreeSource.createInputValueToRootPropertyMapper('root');
const rootValue: number = mapper(1).propertyValue;
void [callback, patch, retainedValue, rootValue];

// Partial patches independently mix keys and values; narrowing either record
// by its key must never restore a complete-input/complete-output correlation.
type LiteralInput = ObjectPropertyTreeVertexTypes<'input', number>;
type LiteralOutput = ObjectPropertyTreeVertexTypes<'output', string>;
const bindLiteral = createObjectPropertyMutationHelperBinder<
  LiteralInput,
  LiteralOutput
>();
const hybridResult = rewriteObject<
  number,
  'input',
  number,
  unknown,
  'output',
  string
>(1, {
  mapInputToRootProperty: (value) => ({
    propertyKey: 'input',
    propertyValue: value,
  }),
  enumerateChildPropertyHints: () => [],
  visitors: {
    [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: (vertex, context) => ({
      commands: [
        bindLiteral(vertex, context).createObjectPropertyMutationCommand({
          kind: 'patchPropertyKeyOrValue',
          propertyPatch: { propertyValue: 'changed' },
        }),
        bindLiteral(vertex, context).createObjectPropertyMutationCommand({
          kind: 'patchPropertyKeyOrValue',
          propertyPatch: { propertyKey: 'output' },
        }),
      ],
    }),
    [DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES]: (vertex, context) => {
      const visitorProperty = vertex.getVertexData();
      const visitorPropertyKey: 'input' | 'output' =
        visitorProperty.propertyKey;
      const visitorPropertyValue: unknown = visitorProperty.propertyValue;
      void [visitorPropertyKey, visitorPropertyValue];
      if (visitorProperty.propertyKey === 'input') {
        // @ts-expect-error A value-only patch can leave an input key with an output value.
        const numberOnly: number = visitorProperty.propertyValue;
        void numberOnly;
      }
      if (visitorProperty.propertyKey === 'output') {
        // @ts-expect-error A key-only patch can leave an output key with an input value.
        const stringOnly: string = visitorProperty.propertyValue;
        void stringOnly;
      }
      const visitorRef = context.vertexHandle
        .getCurrentVertexView()
        .getVertexData();
      const visitorRefKey: 'input' | 'output' = visitorRef.propertyKey;
      const visitorRefValue: unknown = visitorRef.propertyValue;
      void [visitorRefKey, visitorRefValue];
      if (visitorRef.propertyKey === 'input') {
        // @ts-expect-error A value-only patch can leave an input key with an output value.
        const numberOnly: number = visitorRef.propertyValue;
        void numberOnly;
      }
      if (visitorRef.propertyKey === 'output') {
        // @ts-expect-error A key-only patch can leave an output key with an input value.
        const stringOnly: string = visitorRef.propertyValue;
        void stringOnly;
      }
      return undefined;
    },
  },
  rewritePropertyAfterChildTraversal(prop, context) {
    const direct = prop;
    const directKey: 'input' | 'output' = direct.propertyKey;
    const directValue: unknown = direct.propertyValue;
    void [directKey, directValue];
    if (direct.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = direct.propertyValue;
      void numberOnly;
    }
    if (direct.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = direct.propertyValue;
      void stringOnly;
    }
    const vertex = context.vertex.getVertexData();
    const vertexKey: 'input' | 'output' = vertex.propertyKey;
    const vertexValue: unknown = vertex.propertyValue;
    void [vertexKey, vertexValue];
    if (vertex.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = vertex.propertyValue;
      void numberOnly;
    }
    if (vertex.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = vertex.propertyValue;
      void stringOnly;
    }
    const ref = context.vertexHandle.getCurrentVertexView().getVertexData();
    const refKey: 'input' | 'output' = ref.propertyKey;
    const refValue: unknown = ref.propertyValue;
    void [refKey, refValue];
    if (ref.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = ref.propertyValue;
      void numberOnly;
    }
    if (ref.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = ref.propertyValue;
      void stringOnly;
    }
    const tree = context.liveResolvedTreeView
      .getRootVertexHandleOrNull()!
      .getCurrentVertexView()
      .getVertexData();
    const treeKey: 'input' | 'output' = tree.propertyKey;
    const treeValue: unknown = tree.propertyValue;
    void [treeKey, treeValue];
    if (tree.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = tree.propertyValue;
      void numberOnly;
    }
    if (tree.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = tree.propertyValue;
      void stringOnly;
    }
    const previous = context
      .previousCommittedVisitVertexHandleForSamePhase!.getCurrentVertexView()
      .getVertexData();
    const previousKey: 'input' | 'output' = previous.propertyKey;
    const previousValue: unknown = previous.propertyValue;
    void [previousKey, previousValue];
    if (previous.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = previous.propertyValue;
      void numberOnly;
    }
    if (previous.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = previous.propertyValue;
      void stringOnly;
    }
    const original: number = context
      .livePreCommandDiscoveredTreeView!.getRootVertexHandleOrNull()!
      .getCurrentVertexView()
      .getVertexData().propertyValue;
    void original;
    return undefined;
  },
  matchesArrayAssemblyPredicate(prop) {
    const classified = prop;
    const classifiedKey: 'input' | 'output' = classified.propertyKey;
    const classifiedValue: unknown = classified.propertyValue;
    void [classifiedKey, classifiedValue];
    if (classified.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = classified.propertyValue;
      void numberOnly;
    }
    if (classified.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = classified.propertyValue;
      void stringOnly;
    }
    return false;
  },
  matchesObjectAssemblyPredicate(prop) {
    const classified = prop;
    const classifiedKey: 'input' | 'output' = classified.propertyKey;
    const classifiedValue: unknown = classified.propertyValue;
    void [classifiedKey, classifiedValue];
    if (classified.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = classified.propertyValue;
      void numberOnly;
    }
    if (classified.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = classified.propertyValue;
      void stringOnly;
    }
    return false;
  },
  assembleArrayValueFromChildProperties(children, prop, [vertex, context]) {
    const child = children[0]!;
    const childKey: 'input' | 'output' = child.propertyKey;
    const childValue: unknown = child.propertyValue;
    void [childKey, childValue];
    if (child.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = child.propertyValue;
      void numberOnly;
    }
    if (child.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = child.propertyValue;
      void stringOnly;
    }
    const parent = prop;
    const parentKey: 'input' | 'output' = parent.propertyKey;
    const parentValue: unknown = parent.propertyValue;
    void [parentKey, parentValue];
    if (parent.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = parent.propertyValue;
      void numberOnly;
    }
    if (parent.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = parent.propertyValue;
      void stringOnly;
    }
    const visitorVertex = vertex.getVertexData();
    const visitorVertexKey: 'input' | 'output' = visitorVertex.propertyKey;
    const visitorVertexValue: unknown = visitorVertex.propertyValue;
    void [visitorVertexKey, visitorVertexValue];
    if (visitorVertex.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = visitorVertex.propertyValue;
      void numberOnly;
    }
    if (visitorVertex.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = visitorVertex.propertyValue;
      void stringOnly;
    }
    const visitorRef = context.vertexHandle
      .getCurrentVertexView()
      .getVertexData();
    const visitorRefKey: 'input' | 'output' = visitorRef.propertyKey;
    const visitorRefValue: unknown = visitorRef.propertyValue;
    void [visitorRefKey, visitorRefValue];
    if (visitorRef.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = visitorRef.propertyValue;
      void numberOnly;
    }
    if (visitorRef.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = visitorRef.propertyValue;
      void stringOnly;
    }
    return 'assembled';
  },
  assembleObjectValueFromChildProperties(children, prop, [vertex, context]) {
    const child = children[0]!;
    const childKey: 'input' | 'output' = child.propertyKey;
    const childValue: unknown = child.propertyValue;
    void [childKey, childValue];
    if (child.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = child.propertyValue;
      void numberOnly;
    }
    if (child.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = child.propertyValue;
      void stringOnly;
    }
    const parent = prop;
    const parentKey: 'input' | 'output' = parent.propertyKey;
    const parentValue: unknown = parent.propertyValue;
    void [parentKey, parentValue];
    if (parent.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = parent.propertyValue;
      void numberOnly;
    }
    if (parent.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = parent.propertyValue;
      void stringOnly;
    }
    const visitorVertex = vertex.getVertexData();
    const visitorVertexKey: 'input' | 'output' = visitorVertex.propertyKey;
    const visitorVertexValue: unknown = visitorVertex.propertyValue;
    void [visitorVertexKey, visitorVertexValue];
    if (visitorVertex.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = visitorVertex.propertyValue;
      void numberOnly;
    }
    if (visitorVertex.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = visitorVertex.propertyValue;
      void stringOnly;
    }
    const previous = context
      .previousCommittedVisitVertexHandleForSamePhase!.getCurrentVertexView()
      .getVertexData();
    const previousKey: 'input' | 'output' = previous.propertyKey;
    const previousValue: unknown = previous.propertyValue;
    void [previousKey, previousValue];
    if (previous.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = previous.propertyValue;
      void numberOnly;
    }
    if (previous.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = previous.propertyValue;
      void stringOnly;
    }
    return 'assembled';
  },
  resolveChildPropertyOrUseDefault(_hint, context) {
    const parent = context.childDiscoveryContext.parentVertexHandle
      .getCurrentVertexView()
      .getVertexData();
    const parentKey: 'input' | 'output' = parent.propertyKey;
    const parentValue: unknown = parent.propertyValue;
    void [parentKey, parentValue];
    if (parent.propertyKey === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = parent.propertyValue;
      void numberOnly;
    }
    if (parent.propertyKey === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = parent.propertyValue;
      void stringOnly;
    }
    return { kind: 'useDefaultChildPropertyResolution' };
  },
});
const resultProperty = hybridResult.traversalRunner
  .getLiveResolvedTreeView()
  .getRootVertexHandleOrNull()!
  .getCurrentVertexView()
  .getVertexData();
const resultPropertyKey: 'input' | 'output' = resultProperty.propertyKey;
const resultPropertyValue: unknown = resultProperty.propertyValue;
void [resultPropertyKey, resultPropertyValue];
if (resultProperty.propertyKey === 'input') {
  // @ts-expect-error A value-only patch can leave an input key with an output value.
  const numberOnly: number = resultProperty.propertyValue;
  void numberOnly;
}
if (resultProperty.propertyKey === 'output') {
  // @ts-expect-error A key-only patch can leave an output key with an input value.
  const stringOnly: string = resultProperty.propertyValue;
  void stringOnly;
}

type MetaInputProp = {
  propertyKey: 'input';
  propertyValue: number;
  tag: 'input';
  originalNote: object;
};
type MetaOutputProp = {
  propertyKey: 'output';
  propertyValue: string;
  tag: 'output';
  outputNote: object;
};
type MetaInput = VertexDataAndChildHintTypes<MetaInputProp, MetaInputProp>;
type MetaOutput = VertexDataAndChildHintTypes<MetaOutputProp, MetaOutputProp>;
const bindMetadata = createObjectPropertyMutationHelperBinder<
  MetaInput,
  MetaOutput
>({
  matchesArrayAssemblyPredicate(prop) {
    if (prop.tag === 'input') {
      const metadata: object = prop.originalNote;
      // @ts-expect-error Retained metadata does not prove a property still has its input value.
      const numberOnly: number = prop.propertyValue;
      void [metadata, numberOnly];
    }
    if (prop.tag === 'output') {
      const metadata: object = prop.outputNote;
      // @ts-expect-error Metadata cannot restore key/value correlations after partial patches.
      const outputKey: 'output' = prop.propertyKey;
      void [metadata, outputKey];
    }
    return false;
  },
  assembleObjectValueFromChildProperties(children, prop, [vertex, context]) {
    const child = children[0]!;
    if (child.tag === 'input') {
      // @ts-expect-error Retained input metadata may accompany rewritten output values.
      const numberOnly: number = child.propertyValue;
      void numberOnly;
    }
    const parent = prop;
    if (parent.tag === 'input') {
      // @ts-expect-error Retained input metadata may accompany rewritten output values.
      const numberOnly: number = parent.propertyValue;
      void numberOnly;
    }
    const vertexProperty = vertex.getVertexData();
    if (vertexProperty.tag === 'input') {
      // @ts-expect-error Retained input metadata may accompany rewritten output values.
      const numberOnly: number = vertexProperty.propertyValue;
      void numberOnly;
    }
    const refProperty = context.vertexHandle
      .getCurrentVertexView()
      .getVertexData();
    if (refProperty.tag === 'input') {
      // @ts-expect-error Retained input metadata may accompany rewritten output values.
      const numberOnly: number = refProperty.propertyValue;
      void numberOnly;
    }
    return 'assembled';
  },
});
declare const metadataArgs: Parameters<typeof bindMetadata>;
const metadataCommand = bindMetadata(
  ...metadataArgs,
).createObjectPropertyMutationCommand({
  kind: 'patchPropertyKeyOrValue',
  propertyPatch: { propertyValue: 'changed' },
});
if (
  metadataCommand.commandName ===
  TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA
) {
  // @ts-expect-error A partial patch does not guarantee a complete output record.
  const outputOnly: string =
    metadataCommand.commandArguments.replacementVertexData.propertyValue;
  void outputOnly;
}

type LiteralCurrent = LiveObjectPropertyVertexTypes<
  LiteralInput,
  LiteralOutput
>;
const mixedValue: LiteralCurrent['VertexData'] = {
  propertyKey: 'input',
  propertyValue: 'changed',
};
const mixedKey: LiteralCurrent['VertexData'] = {
  propertyKey: 'output',
  propertyValue: 1,
};
const assemblyValues = new Map<VertexHandle<LiteralCurrent>, unknown>();
const assemblyCache = {
  hasAssembledValueForVertex: (vertexHandle: VertexHandle<LiteralCurrent>) =>
    assemblyValues.has(vertexHandle),
  getAssembledValueForVertex: (vertexHandle: VertexHandle<LiteralCurrent>) =>
    assemblyValues.get(vertexHandle),
  setAssembledValueForVertex: (
    vertexHandle: VertexHandle<LiteralCurrent>,
    value: unknown,
  ) => assemblyValues.set(vertexHandle, value),
};
const composedBinder = createObjectPropertyMutationHelperBinder<
  LiteralInput,
  LiteralOutput
>({
  assemblyCache,
});
const composedRunner = runTreeDepthFirstUntilSuspendedOrTerminal<
  LiteralInput,
  LiteralCurrent
>({
  treeDiscoverySource: new ObjectPropertyTreeSource<
    number,
    'input',
    number,
    'output',
    string
  >(1, {
    mapInputToRootProperty: (value) => ({
      propertyKey: 'input',
      propertyValue: value,
    }),
    enumerateChildPropertyHints: () => [],
  }),
  visitors: {
    [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: (vertex, context) => ({
      commands: [
        composedBinder(vertex, context).createObjectPropertyMutationCommand({
          kind: 'patchPropertyKeyOrValue',
          propertyPatch: { propertyKey: 'output' },
        }),
      ],
    }),
  },
});
const composedValue = composedRunner
  .getLiveResolvedTreeView()
  .getRootVertexHandleOrNull()!
  .getCurrentVertexView()
  .getVertexData();
if (composedValue.propertyKey === 'output') {
  // @ts-expect-error Public generic traversal composition keeps partial-patch values broad.
  const outputOnly: string = composedValue.propertyValue;
  void outputOnly;
}
const mixedMetadata: LiveObjectPropertyVertexTypes<
  MetaInput,
  MetaOutput
>['VertexData'] = {
  tag: 'input',
  originalNote: {},
  propertyKey: 'output',
  propertyValue: 'changed',
};
const assembledOutput: unknown = bindMetadata(
  ...metadataArgs,
).assembleCompositeFromCurrentChildren();
const retainedMetadata: MetaInputProp = metadataArgs[1]
  .livePreCommandDiscoveredTreeView!.getRootVertexHandleOrNull()!
  .getCurrentVertexView()
  .getVertexData();
void [mixedValue, mixedKey, mixedMetadata, assembledOutput, retainedMetadata];

const objectDomainProbeBinder = createObjectPropertyMutationHelperBinder<
  ObjectPropertyTreeVertexTypes<'root', number>,
  ObjectPropertyTreeVertexTypes<'replacement', string>
>();
declare const objectDomainProbeArgs: Parameters<typeof objectDomainProbeBinder>;
{
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
    precise.resolveRootVertex().resolvedVertexInput.vertexContentInput
      .$vertexData.propertyValue;
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
  const args: Parameters<typeof bind> = objectDomainProbeArgs;
  // @ts-expect-error Even narrow replacement payloads do not promise narrow assembled values.
  const assembled: string = bind(
    ...args,
  ).assembleCompositeFromCurrentChildren();
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
      const live: number | string =
        context.vertex.getVertexData().propertyValue;
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
}

// @ts-expect-error A generic root key cannot replace the actual default root key.
ObjectPropertyTreeSource.createInputValueToRootPropertyMapper<'fake'>();
// @ts-expect-error Default child discovery cannot assert arbitrary generic domains.
ObjectPropertyTreeSource.enumerateOwnEnumerableChildProperties<'root', number>({
  propertyKey: 'root',
  propertyValue: 1,
});

function capturedOutputValue<Out>(result: {
  capturedOutputResultAtReturn:
    | { readonly kind: 'present'; readonly value: Out }
    | { readonly kind: 'absent' };
}): Out | null {
  const output = result.capturedOutputResultAtReturn;
  return output.kind === 'present' ? output.value : null;
}

function outputValue<Out>(result: {
  getFinalOutputResult():
    | { readonly kind: 'present'; readonly value: Out }
    | { readonly kind: 'absent' };
}): Out | null {
  const output = result.getFinalOutputResult();
  return output.kind === 'present' ? output.value : null;
}
