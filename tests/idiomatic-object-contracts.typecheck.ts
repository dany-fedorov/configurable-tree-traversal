import type { VertexHandle } from '../src';
import {
  rewriteObject,
  createObjectPropertyMutationHelperBinder,
  type VertexDataAndChildHintTypes,
  type ObjectPropertyPostOrderRewriteCallback,
  type ObjectPropertyRewriteInput,
  type ObjectPropertyRewriteContext,
  type ObjectPropertyTreeVertexTypes,
  type StoredTreeReferenceVertexTypes,
  type ObjectPropertyKeyValuePatch,
  ObjectPropertyTreeSource,
  DepthFirstTreeVisitPhase,
  TraversalVisitorCommandName,
  type LiveObjectPropertyVertexTypes,
  runTreeDepthFirstUntilSuspendedOrTerminal,
} from '../src';

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
const assemblyCache = new Map<VertexHandle<LiteralCurrent>, unknown>();
const composedBinder = createObjectPropertyMutationHelperBinder<
  LiteralInput,
  LiteralOutput
>({
  assemblyCache: {
    hasAssembledValueForVertex: (vertexHandle) =>
      assemblyCache.has(vertexHandle),
    getAssembledValueForVertex: (vertexHandle) =>
      assemblyCache.get(vertexHandle),
    setAssembledValueForVertex: (vertexHandle, assembledValue) =>
      assemblyCache.set(vertexHandle, assembledValue),
  },
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
