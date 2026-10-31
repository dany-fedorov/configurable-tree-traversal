import type { ObjectCurrentVertexTypes } from '@traversable-object-tree/lib/ObjectCurrentVertexTypes';
import {
  assertOwnKeys,
  assertOptionalCallbacks,
  TREE_OPTION_KEYS,
  OBJECT_SOURCE_OPTION_KEYS,
  OBJECT_MUTATION_OPTION_KEYS,
  definedOptions,
} from '@core/assertPublicOptions';
import type { GetPathToOptions } from '@core/ResolvedTree';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { TreeVisitorContext } from '@core/TraversalVisitor';
import type { VertexView } from '@core/Vertex';
import type { DepthFirstTreeOptionsPatch } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { DepthFirstTreeRunner } from '@depth-first-traversal/lib/DepthFirstTraversalRunner';
import { DepthFirstTreeTraversal } from '@depth-first-traversal/DepthFirstTraversal';
import type {
  ObjectMutationOptions,
  ObjectMutationRequest,
} from '@traversable-object-tree/lib/makeMutationCommandFactory';
import type { ObjectCompositeClassification } from '@traversable-object-tree/lib/TO_IsCompositeAssertionsMixin';
import type { TraversableObject } from '@traversable-object-tree/lib/TraversableObject';
import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type {
  ObjectTreeOptions,
  ObjectTreeBaseOptions,
  ObjectTreePropertyAdapters,
} from '@traversable-object-tree/lib/TraversableObjectTreeInstanceConfig';
import type { ObjectTreeVertexTypes } from '@traversable-object-tree/lib/ObjectTreeVertexTypes';
import { ObjectTreeSource } from '@traversable-object-tree/TraversableObjectTree';

export type ObjectRewriteContext<
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = TreeVisitorContext<
  DepthFirstPhase.POST_ORDER,
  ObjectTreeVertexTypes<InK, InV>,
  ObjectCurrentVertexTypes<
    ObjectTreeVertexTypes<InK, InV>,
    ObjectTreeVertexTypes<OutK, OutV>
  >
> &
  ObjectCompositeClassification & {
    vertex: VertexView<
      ObjectCurrentVertexTypes<
        ObjectTreeVertexTypes<InK, InV>,
        ObjectTreeVertexTypes<OutK, OutV>
      >
    >;
    getKeyPath: (options?: GetPathToOptions) => (InK | OutK)[];
  };

export type ObjectRewriteInput<
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = ObjectCurrentVertexTypes<
  ObjectTreeVertexTypes<InK, InV>,
  ObjectTreeVertexTypes<OutK, OutV>
>['VertexData'] & {
  assembledComposite?: unknown;
};

export type ObjectRewriteCallback<
  InK extends TraversableObjectPropKey,
  InV,
  OutK extends TraversableObjectPropKey,
  OutV,
> = (
  prop: ObjectRewriteInput<InK, InV, OutK, OutV>,
  context: ObjectRewriteContext<InK, InV, OutK, OutV>,
) => ObjectMutationRequest<ObjectTreeVertexTypes<OutK, OutV>> | undefined;

export const __REWRITE_OBJECT_DEFAULT_ROOT_KEY__ =
  '__REWRITE_OBJECT_DEFAULT_ROOT_KEY__';

/** Root presence is independent of a legitimate null/undefined converted value. */
export type ObjectRewriteOutputResult<Out> =
  | Readonly<{ kind: 'present'; value: Out }>
  | Readonly<{ kind: 'absent' }>;

export type RewriteObjectResult<
  InK extends TraversableObjectPropKey,
  InV,
  Out,
  OutK extends TraversableObjectPropKey,
  OutV,
> = {
  /** Converted output captured at return, possibly partial before completion. */
  outputResultAtReturn: ObjectRewriteOutputResult<Out>;
  /** Final converted output; throws until the runner has finished. */
  getOutputResult(): ObjectRewriteOutputResult<Out>;
  traversalRunner: DepthFirstTreeRunner<
    ObjectTreeVertexTypes<InK, InV>,
    ObjectCurrentVertexTypes<
      ObjectTreeVertexTypes<InK, InV>,
      ObjectTreeVertexTypes<OutK, OutV>
    >
  >;
};

export type RewriteObjectOptions<
  In,
  InK extends TraversableObjectPropKey,
  InV,
  Out,
  OutK extends TraversableObjectPropKey,
  OutV,
> = ObjectTreeOptions<In, InK, InV, OutK, OutV> &
  Partial<
    ObjectMutationOptions<
      ObjectTreeVertexTypes<InK, InV>,
      ObjectTreeVertexTypes<OutK, OutV>
    > &
      Omit<
        DepthFirstTreeOptionsPatch<
          ObjectTreeVertexTypes<InK, InV>,
          ObjectCurrentVertexTypes<
            ObjectTreeVertexTypes<InK, InV>,
            ObjectTreeVertexTypes<OutK, OutV>
          >
        >,
        'traversableTree'
      >
  > & {
    traversableTree?: never;
    rewrite?: ObjectRewriteCallback<InK, InV, OutK, OutV>;
    assembleCompositesBeforeRewrite?: boolean;
  } & (unknown extends Out
    ? { convertRootValue?: RootValueConverter<Out> }
    : { convertRootValue: RootValueConverter<Out> });

export type RootValueConverter<Out> = (
  value: unknown,
  context: { readonly complete: boolean },
) => Out;

export function rewriteObject<
  In = TraversableObject<TraversableObjectPropKey, unknown>,
  InK extends TraversableObjectPropKey = TraversableObjectPropKey,
  InV = unknown,
  Out = unknown,
  OutK extends TraversableObjectPropKey = InK,
  OutV = InV,
>(
  object: In,
  ...args: Record<never, never> extends RewriteObjectOptions<
    In,
    InK,
    InV,
    Out,
    OutK,
    OutV
  >
    ? [options?: RewriteObjectOptions<In, InK, InV, Out, OutK, OutV>]
    : [options: RewriteObjectOptions<In, InK, InV, Out, OutK, OutV>]
): RewriteObjectResult<InK, InV, Out, OutK, OutV> {
  const [inputOptions] = args;
  if (inputOptions !== undefined)
    assertOwnKeys(inputOptions, [
      ...TREE_OPTION_KEYS.filter((key) => key !== 'traversableTree'),
      ...OBJECT_SOURCE_OPTION_KEYS,
      ...OBJECT_MUTATION_OPTION_KEYS,
      'inOrder',
      'rewrite',
      'convertRootValue',
      'assembleCompositesBeforeRewrite',
    ]);
  const options =
    inputOptions === undefined ? undefined : definedOptions(inputOptions);
  if (options !== undefined) {
    assertOptionalCallbacks(options, [
      ...OBJECT_SOURCE_OPTION_KEYS,
      'isArray',
      'isObject',
      'assembleArray',
      'assembleObject',
      'rewrite',
      'convertRootValue',
    ]);
    if (
      options.assembleCompositesBeforeRewrite !== undefined &&
      typeof options.assembleCompositesBeforeRewrite !== 'boolean'
    )
      throw new TypeError('assembleCompositesBeforeRewrite must be boolean');
  }
  const assembleCompositeBeforeVisit =
    options?.assembleCompositesBeforeRewrite ?? false;
  const rewrite =
    typeof options?.rewrite === 'function' ? options.rewrite : null;
  const convertRootValue: RootValueConverter<Out> =
    options?.convertRootValue ?? ((value: unknown) => value as Out);
  const resolveChildHook = options?.resolveChildHook;
  // Required narrow adapters are enforced by RewriteObjectOptions. The default
  // mapper preserves the actual input; its discovery domain is broad.
  const tree = ObjectTreeSource.fromProperties<In, InK, InV, OutK, OutV>(
    object,
    {
      ...(resolveChildHook === undefined ? {} : { resolveChildHook }),
      getChildrenOfProperty:
        options?.getChildrenOfProperty ??
        ObjectTreeSource.getChildrenOfPropertyDefault,
      getRootPropertyFromInputObject:
        options?.getRootPropertyFromInputObject ??
        ObjectTreeSource.createRootPropertyMapper(
          __REWRITE_OBJECT_DEFAULT_ROOT_KEY__,
        ),
    } as ObjectTreeBaseOptions<In, InK, InV, OutK, OutV> &
      ObjectTreePropertyAdapters<In, InK, InV>,
  );
  const bindObjectMutation = ObjectTreeSource.createObjectMutationBinder<
    ObjectTreeVertexTypes<InK, InV>,
    ObjectTreeVertexTypes<OutK, OutV>
  >({
    ...(options?.arrayIndexPolicy === undefined
      ? {}
      : { arrayIndexPolicy: options.arrayIndexPolicy }),
    ...(options?.propertyCollision === undefined
      ? {}
      : { propertyCollision: options.propertyCollision }),
    ...(options?.isArray ? { isArray: options.isArray } : {}),
    ...(options?.isObject ? { isObject: options.isObject } : {}),
    ...(options?.assembleArray ? { assembleArray: options.assembleArray } : {}),
    ...(options?.assembleObject
      ? { assembleObject: options.assembleObject }
      : {}),
    ...(options?.assembledMap === undefined
      ? { assembledMap: new Map() }
      : { assembledMap: options.assembledMap }),
  });
  const traversal = new DepthFirstTreeTraversal<
    ObjectTreeVertexTypes<InK, InV>,
    ObjectCurrentVertexTypes<
      ObjectTreeVertexTypes<InK, InV>,
      ObjectTreeVertexTypes<OutK, OutV>
    >
  >({
    traversableTree: tree,
    ...{
      ...(options?.transformChildHints === undefined
        ? {}
        : { transformChildHints: options.transformChildHints }),
      ...(options?.visitors === undefined
        ? {}
        : { visitors: options.visitors }),
      ...(options?.inOrder === undefined ? {} : { inOrder: options.inOrder }),
      ...(options?.retainOriginalTreeStructure === undefined
        ? {}
        : {
            retainOriginalTreeStructure: options.retainOriginalTreeStructure,
          }),
    },
  });
  traversal.addVisitorFor(
    DepthFirstPhase.POST_ORDER,
    (
      vertex: VertexView<
        ObjectCurrentVertexTypes<
          ObjectTreeVertexTypes<InK, InV>,
          ObjectTreeVertexTypes<OutK, OutV>
        >
      >,
      context: TreeVisitorContext<
        DepthFirstPhase.POST_ORDER,
        ObjectTreeVertexTypes<InK, InV>,
        ObjectCurrentVertexTypes<
          ObjectTreeVertexTypes<InK, InV>,
          ObjectTreeVertexTypes<OutK, OutV>
        >
      >,
    ) => {
      const {
        makeMutationCommand,
        isComposite,
        isObject,
        isArray,
        assembleComposite,
      } = bindObjectMutation(vertex, context);
      let rwInput: ObjectRewriteInput<InK, InV, OutK, OutV> = vertex.getData();
      if (assembleCompositeBeforeVisit && isComposite) {
        rwInput = { ...rwInput, assembledComposite: assembleComposite() };
      }
      const rw = rewrite?.(rwInput, {
        ...context,
        isComposite,
        isObject,
        isArray,
        vertex,
        getKeyPath: (thisOptions?: GetPathToOptions) =>
          context.resolvedTreeView
            .requirePathTo(context.vertexRef, thisOptions)
            .map((ps) => ps.getValue().getData().key),
      });
      return { commands: [makeMutationCommand(rw)] };
    },
  );
  const traversalRunner = traversal.createRunner().run();
  const convertCurrentRoot = (): ObjectRewriteOutputResult<Out> => {
    const resolvedTreeView = traversalRunner.getResolvedTreeView();
    const rootRef = resolvedTreeView.getRoot();
    if (rootRef === null || !resolvedTreeView.has(rootRef)) {
      return Object.freeze({ kind: 'absent' });
    }
    return Object.freeze({
      kind: 'present',
      value: convertRootValue(rootRef.getValue().getData().value, {
        complete:
          traversalRunner.getStatus() === TraversalRunnerStatus.FINISHED,
      }),
    });
  };
  const outputResultAtReturn = convertCurrentRoot();
  let hasFinalOutput =
    traversalRunner.getStatus() === TraversalRunnerStatus.FINISHED;
  let finalOutput = outputResultAtReturn;
  return {
    outputResultAtReturn,
    traversalRunner,
    getOutputResult() {
      if (traversalRunner.getStatus() !== TraversalRunnerStatus.FINISHED) {
        throw new Error('Rewrite output is not complete');
      }
      if (!hasFinalOutput) {
        finalOutput = convertCurrentRoot();
        hasFinalOutput = true;
      }
      return finalOutput;
    },
  };
}

/** Select an output type as a caller assertion, without runtime schema validation. */
export function rewriteObjectAs<Out>(
  object: unknown,
  options?: RewriteObjectOptions<
    unknown,
    TraversableObjectPropKey,
    unknown,
    unknown,
    TraversableObjectPropKey,
    unknown
  >,
): RewriteObjectResult<
  TraversableObjectPropKey,
  unknown,
  Out,
  TraversableObjectPropKey,
  unknown
> {
  // This helper is the explicit caller assertion. Ordinary rewriteObject keeps
  // the unknown result unless convertRootValue establishes a typed output.
  return rewriteObject(object, options) as RewriteObjectResult<
    TraversableObjectPropKey,
    unknown,
    Out,
    TraversableObjectPropKey,
    unknown
  >;
}
