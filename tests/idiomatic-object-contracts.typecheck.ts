import {
  rewriteObject,
  createObjectMutationBinder,
  type VertexTypes,
  type ObjectRewriteCallback,
  type ObjectRewriteInput,
  type ObjectRewriteContext,
  type ObjectTreeVertexTypes,
  type ResolvedTreeVertexTypes,
  type ObjectPropertyPatch,
  ObjectTreeSource,
  DepthFirstPhase,
  TraversalVisitorCommandName,
  type ObjectCurrentVertexTypes,
  type MutableRef,
  type Vertex,
  traverseTreeDepthFirst,
} from '../src';

rewriteObject<number, string, number, unknown, symbol, string>(1, {
  getRootPropertyFromInputObject: (value) => ({ key: 'root', value }),
  getChildrenOfProperty: () => [],
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
    const assembled: unknown = prop.assembledComposite;
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
    const liveValue: unknown = vertex.getData().value;
    const pathValue: unknown = context.vertexRef.getValue().getData().value;
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
  const value: unknown = input.value;
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
const mapper = ObjectTreeSource.createRootPropertyMapper('root');
const rootValue: number = mapper(1).value;
void [callback, patch, retainedValue, rootValue];

// Partial patches independently mix keys and values; narrowing either record
// by its key must never restore a complete-input/complete-output correlation.
type LiteralInput = ObjectTreeVertexTypes<'input', number>;
type LiteralOutput = ObjectTreeVertexTypes<'output', string>;
const bindLiteral = createObjectMutationBinder<LiteralInput, LiteralOutput>();
const hybridResult = rewriteObject<
  number,
  'input',
  number,
  unknown,
  'output',
  string
>(1, {
  getRootPropertyFromInputObject: (value) => ({ key: 'input', value }),
  getChildrenOfProperty: () => [],
  visitors: {
    [DepthFirstPhase.PRE_ORDER]: (vertex, context) => ({
      commands: [
        bindLiteral(vertex, context).makeMutationCommand({
          rewrite: { value: 'changed' },
        }),
        bindLiteral(vertex, context).makeMutationCommand({
          rewrite: { key: 'output' },
        }),
      ],
    }),
    [DepthFirstPhase.POST_ORDER]: (vertex, context) => {
      const visitorProperty = vertex.getData();
      const visitorPropertyKey: 'input' | 'output' = visitorProperty.key;
      const visitorPropertyValue: unknown = visitorProperty.value;
      void [visitorPropertyKey, visitorPropertyValue];
      if (visitorProperty.key === 'input') {
        // @ts-expect-error A value-only patch can leave an input key with an output value.
        const numberOnly: number = visitorProperty.value;
        void numberOnly;
      }
      if (visitorProperty.key === 'output') {
        // @ts-expect-error A key-only patch can leave an output key with an input value.
        const stringOnly: string = visitorProperty.value;
        void stringOnly;
      }
      const visitorRef = context.vertexRef.getValue().getData();
      const visitorRefKey: 'input' | 'output' = visitorRef.key;
      const visitorRefValue: unknown = visitorRef.value;
      void [visitorRefKey, visitorRefValue];
      if (visitorRef.key === 'input') {
        // @ts-expect-error A value-only patch can leave an input key with an output value.
        const numberOnly: number = visitorRef.value;
        void numberOnly;
      }
      if (visitorRef.key === 'output') {
        // @ts-expect-error A key-only patch can leave an output key with an input value.
        const stringOnly: string = visitorRef.value;
        void stringOnly;
      }
      return undefined;
    },
  },
  rewrite(prop, context) {
    const direct = prop;
    const directKey: 'input' | 'output' = direct.key;
    const directValue: unknown = direct.value;
    void [directKey, directValue];
    if (direct.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = direct.value;
      void numberOnly;
    }
    if (direct.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = direct.value;
      void stringOnly;
    }
    const vertex = context.vertex.getData();
    const vertexKey: 'input' | 'output' = vertex.key;
    const vertexValue: unknown = vertex.value;
    void [vertexKey, vertexValue];
    if (vertex.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = vertex.value;
      void numberOnly;
    }
    if (vertex.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = vertex.value;
      void stringOnly;
    }
    const ref = context.vertexRef.getValue().getData();
    const refKey: 'input' | 'output' = ref.key;
    const refValue: unknown = ref.value;
    void [refKey, refValue];
    if (ref.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = ref.value;
      void numberOnly;
    }
    if (ref.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = ref.value;
      void stringOnly;
    }
    const tree = context.resolvedTree.getRoot()!.getValue().getData();
    const treeKey: 'input' | 'output' = tree.key;
    const treeValue: unknown = tree.value;
    void [treeKey, treeValue];
    if (tree.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = tree.value;
      void numberOnly;
    }
    if (tree.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = tree.value;
      void stringOnly;
    }
    const previous = context.previousPhaseVertexRef!.getValue().getData();
    const previousKey: 'input' | 'output' = previous.key;
    const previousValue: unknown = previous.value;
    void [previousKey, previousValue];
    if (previous.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = previous.value;
      void numberOnly;
    }
    if (previous.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = previous.value;
      void stringOnly;
    }
    const original: number = context
      .originalTreeView!.getRoot()!
      .getValue()
      .getData().value;
    void original;
    return undefined;
  },
  isArray(prop) {
    const classified = prop;
    const classifiedKey: 'input' | 'output' = classified.key;
    const classifiedValue: unknown = classified.value;
    void [classifiedKey, classifiedValue];
    if (classified.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = classified.value;
      void numberOnly;
    }
    if (classified.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = classified.value;
      void stringOnly;
    }
    return false;
  },
  isObject(prop) {
    const classified = prop;
    const classifiedKey: 'input' | 'output' = classified.key;
    const classifiedValue: unknown = classified.value;
    void [classifiedKey, classifiedValue];
    if (classified.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = classified.value;
      void numberOnly;
    }
    if (classified.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = classified.value;
      void stringOnly;
    }
    return false;
  },
  assembleArray(children, prop, [vertex, context]) {
    const child = children[0]!;
    const childKey: 'input' | 'output' = child.key;
    const childValue: unknown = child.value;
    void [childKey, childValue];
    if (child.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = child.value;
      void numberOnly;
    }
    if (child.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = child.value;
      void stringOnly;
    }
    const parent = prop;
    const parentKey: 'input' | 'output' = parent.key;
    const parentValue: unknown = parent.value;
    void [parentKey, parentValue];
    if (parent.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = parent.value;
      void numberOnly;
    }
    if (parent.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = parent.value;
      void stringOnly;
    }
    const visitorVertex = vertex.getData();
    const visitorVertexKey: 'input' | 'output' = visitorVertex.key;
    const visitorVertexValue: unknown = visitorVertex.value;
    void [visitorVertexKey, visitorVertexValue];
    if (visitorVertex.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = visitorVertex.value;
      void numberOnly;
    }
    if (visitorVertex.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = visitorVertex.value;
      void stringOnly;
    }
    const visitorRef = context.vertexRef.getValue().getData();
    const visitorRefKey: 'input' | 'output' = visitorRef.key;
    const visitorRefValue: unknown = visitorRef.value;
    void [visitorRefKey, visitorRefValue];
    if (visitorRef.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = visitorRef.value;
      void numberOnly;
    }
    if (visitorRef.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = visitorRef.value;
      void stringOnly;
    }
    return 'assembled';
  },
  assembleObject(children, prop, [vertex, context]) {
    const child = children[0]!;
    const childKey: 'input' | 'output' = child.key;
    const childValue: unknown = child.value;
    void [childKey, childValue];
    if (child.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = child.value;
      void numberOnly;
    }
    if (child.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = child.value;
      void stringOnly;
    }
    const parent = prop;
    const parentKey: 'input' | 'output' = parent.key;
    const parentValue: unknown = parent.value;
    void [parentKey, parentValue];
    if (parent.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = parent.value;
      void numberOnly;
    }
    if (parent.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = parent.value;
      void stringOnly;
    }
    const visitorVertex = vertex.getData();
    const visitorVertexKey: 'input' | 'output' = visitorVertex.key;
    const visitorVertexValue: unknown = visitorVertex.value;
    void [visitorVertexKey, visitorVertexValue];
    if (visitorVertex.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = visitorVertex.value;
      void numberOnly;
    }
    if (visitorVertex.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = visitorVertex.value;
      void stringOnly;
    }
    const previous = context.previousPhaseVertexRef!.getValue().getData();
    const previousKey: 'input' | 'output' = previous.key;
    const previousValue: unknown = previous.value;
    void [previousKey, previousValue];
    if (previous.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = previous.value;
      void numberOnly;
    }
    if (previous.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = previous.value;
      void stringOnly;
    }
    return 'assembled';
  },
  resolveVertexHook(_hint, context) {
    const parent = context.resolutionContext.parentVertexRef
      .getValue()
      .getData();
    const parentKey: 'input' | 'output' = parent.key;
    const parentValue: unknown = parent.value;
    void [parentKey, parentValue];
    if (parent.key === 'input') {
      // @ts-expect-error A value-only patch can leave an input key with an output value.
      const numberOnly: number = parent.value;
      void numberOnly;
    }
    if (parent.key === 'output') {
      // @ts-expect-error A key-only patch can leave an output key with an input value.
      const stringOnly: string = parent.value;
      void stringOnly;
    }
    return { kind: 'useDefault' };
  },
});
const resultProperty = hybridResult.traversalRunner
  .getResolvedTreeView()
  .getRoot()!
  .getValue()
  .getData();
const resultPropertyKey: 'input' | 'output' = resultProperty.key;
const resultPropertyValue: unknown = resultProperty.value;
void [resultPropertyKey, resultPropertyValue];
if (resultProperty.key === 'input') {
  // @ts-expect-error A value-only patch can leave an input key with an output value.
  const numberOnly: number = resultProperty.value;
  void numberOnly;
}
if (resultProperty.key === 'output') {
  // @ts-expect-error A key-only patch can leave an output key with an input value.
  const stringOnly: string = resultProperty.value;
  void stringOnly;
}

type MetaInputProp = {
  key: 'input';
  value: number;
  tag: 'input';
  originalNote: object;
};
type MetaOutputProp = {
  key: 'output';
  value: string;
  tag: 'output';
  outputNote: object;
};
type MetaInput = VertexTypes<MetaInputProp, MetaInputProp>;
type MetaOutput = VertexTypes<MetaOutputProp, MetaOutputProp>;
const bindMetadata = createObjectMutationBinder<MetaInput, MetaOutput>({
  isArray(prop) {
    if (prop.tag === 'input') {
      const metadata: object = prop.originalNote;
      // @ts-expect-error Retained metadata does not prove a property still has its input value.
      const numberOnly: number = prop.value;
      void [metadata, numberOnly];
    }
    if (prop.tag === 'output') {
      const metadata: object = prop.outputNote;
      // @ts-expect-error Metadata cannot restore key/value correlations after partial patches.
      const outputKey: 'output' = prop.key;
      void [metadata, outputKey];
    }
    return false;
  },
  assembleObject(children, prop, [vertex, context]) {
    const child = children[0]!;
    if (child.tag === 'input') {
      // @ts-expect-error Retained input metadata may accompany rewritten output values.
      const numberOnly: number = child.value;
      void numberOnly;
    }
    const parent = prop;
    if (parent.tag === 'input') {
      // @ts-expect-error Retained input metadata may accompany rewritten output values.
      const numberOnly: number = parent.value;
      void numberOnly;
    }
    const vertexProperty = vertex.getData();
    if (vertexProperty.tag === 'input') {
      // @ts-expect-error Retained input metadata may accompany rewritten output values.
      const numberOnly: number = vertexProperty.value;
      void numberOnly;
    }
    const refProperty = context.vertexRef.getValue().getData();
    if (refProperty.tag === 'input') {
      // @ts-expect-error Retained input metadata may accompany rewritten output values.
      const numberOnly: number = refProperty.value;
      void numberOnly;
    }
    return 'assembled';
  },
});
declare const metadataArgs: Parameters<typeof bindMetadata>;
const metadataCommand = bindMetadata(...metadataArgs).makeMutationCommand({
  rewrite: { value: 'changed' },
});
if (
  metadataCommand.commandName ===
  TraversalVisitorCommandName.REWRITE_VERTEX_DATA
) {
  // @ts-expect-error A partial patch does not guarantee a complete output record.
  const outputOnly: string = metadataCommand.commandArguments.newData.value;
  void outputOnly;
}

type LiteralCurrent = ObjectCurrentVertexTypes<LiteralInput, LiteralOutput>;
const mixedValue: LiteralCurrent['VertexData'] = {
  key: 'input',
  value: 'changed',
};
const mixedKey: LiteralCurrent['VertexData'] = { key: 'output', value: 1 };
const assembledMap = new Map<MutableRef<Vertex<LiteralCurrent>>, unknown>();
const composedBinder = createObjectMutationBinder<LiteralInput, LiteralOutput>({
  assembledMap,
});
const composedRunner = traverseTreeDepthFirst<LiteralInput, LiteralCurrent>({
  traversableTree: new ObjectTreeSource<
    number,
    'input',
    number,
    'output',
    string
  >(1, {
    getRootPropertyFromInputObject: (value) => ({ key: 'input', value }),
    getChildrenOfProperty: () => [],
  }),
  visitors: {
    [DepthFirstPhase.PRE_ORDER]: (vertex, context) => ({
      commands: [
        composedBinder(vertex, context).makeMutationCommand({
          rewrite: { key: 'output' },
        }),
      ],
    }),
  },
});
const composedValue = composedRunner
  .getResolvedTreeView()
  .getRoot()!
  .getValue()
  .getData();
if (composedValue.key === 'output') {
  // @ts-expect-error Public generic traversal composition keeps partial-patch values broad.
  const outputOnly: string = composedValue.value;
  void outputOnly;
}
const mixedMetadata: ObjectCurrentVertexTypes<
  MetaInput,
  MetaOutput
>['VertexData'] = {
  tag: 'input',
  originalNote: {},
  key: 'output',
  value: 'changed',
};
const assembledOutput: unknown = bindMetadata(
  ...metadataArgs,
).assembleComposite();
const retainedMetadata: MetaInputProp = metadataArgs[1]
  .originalTreeView!.getRoot()!
  .getValue()
  .getData();
void [mixedValue, mixedKey, mixedMetadata, assembledOutput, retainedMetadata];
