import type { LiveObjectPropertyVertexTypes } from '@traversable-object-tree/lib/ObjectCurrentVertexTypes';
import {
  assertOwnKeys,
  assertOptionalCallbacks,
  TREE_OPTION_KEYS,
  OBJECT_SOURCE_OPTION_KEYS,
  OBJECT_MUTATION_OPTION_KEYS,
  definedOptions,
} from '@core/assertPublicOptions';
import type { StructuralAncestorPathOptions } from '@core/ResolvedTree';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { TreeVisitorContext } from '@core/TraversalVisitor';
import type { VertexView } from '@core/Vertex';
import type { DepthFirstTreeTraversalBuilderOptionsPatch } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTreeVisitPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { DepthFirstTreeRunner } from '@depth-first-traversal/lib/DepthFirstTraversalRunner';
import { DepthFirstTreeTraversalBuilder } from '@depth-first-traversal/DepthFirstTraversal';
import type {
  ObjectMutationOptions,
  ObjectPropertyRewriteRequest,
} from '@traversable-object-tree/lib/makeMutationCommandFactory';
import type { ObjectPropertyAssemblyClassification } from '@traversable-object-tree/lib/TO_IsCompositeAssertionsMixin';
import type { NestedObjectOrArray } from '@traversable-object-tree/lib/TraversableObject';
import type { ObjectPropertyKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type {
  ObjectPropertyTreeSourceOptions,
  ObjectPropertyTreeBaseOptions,
  ObjectPropertyTreeAdapters,
} from '@traversable-object-tree/lib/TraversableObjectTreeInstanceConfig';
import type { ObjectPropertyTreeVertexTypes } from '@traversable-object-tree/lib/ObjectTreeVertexTypes';
import { ObjectPropertyTreeSource } from '@traversable-object-tree/TraversableObjectTree';

export type ObjectPropertyRewriteContext<
  InputPropertyKey extends ObjectPropertyKey,
  InputPropertyValue,
  RewrittenPropertyKey extends ObjectPropertyKey,
  RewrittenPropertyValue,
> = TreeVisitorContext<
  DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
  ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
  LiveObjectPropertyVertexTypes<
    ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
    ObjectPropertyTreeVertexTypes<RewrittenPropertyKey, RewrittenPropertyValue>
  >
> &
  ObjectPropertyAssemblyClassification & {
    vertex: VertexView<
      LiveObjectPropertyVertexTypes<
        ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
        ObjectPropertyTreeVertexTypes<
          RewrittenPropertyKey,
          RewrittenPropertyValue
        >
      >
    >;
    requirePropertyKeyPathFromRoot: (
      options?: StructuralAncestorPathOptions,
    ) => (InputPropertyKey | RewrittenPropertyKey)[];
  };

export type ObjectPropertyRewriteInput<
  InputPropertyKey extends ObjectPropertyKey,
  InputPropertyValue,
  RewrittenPropertyKey extends ObjectPropertyKey,
  RewrittenPropertyValue,
> = LiveObjectPropertyVertexTypes<
  ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
  ObjectPropertyTreeVertexTypes<RewrittenPropertyKey, RewrittenPropertyValue>
>['VertexData'] & {
  assembledValueFromCurrentChildren?: unknown;
};

export type ObjectPropertyPostOrderRewriteCallback<
  InputPropertyKey extends ObjectPropertyKey,
  InputPropertyValue,
  RewrittenPropertyKey extends ObjectPropertyKey,
  RewrittenPropertyValue,
> = (
  prop: ObjectPropertyRewriteInput<
    InputPropertyKey,
    InputPropertyValue,
    RewrittenPropertyKey,
    RewrittenPropertyValue
  >,
  context: ObjectPropertyRewriteContext<
    InputPropertyKey,
    InputPropertyValue,
    RewrittenPropertyKey,
    RewrittenPropertyValue
  >,
) =>
  | ObjectPropertyRewriteRequest<
      ObjectPropertyTreeVertexTypes<
        RewrittenPropertyKey,
        RewrittenPropertyValue
      >
    >
  | undefined;

export const __REWRITE_OBJECT_DEFAULT_ROOT_KEY__ =
  '__REWRITE_OBJECT_DEFAULT_ROOT_KEY__';

/** Root presence is independent of a legitimate null/undefined converted value. */
export type ObjectRewriteOutputResult<OutputValue> =
  | Readonly<{ kind: 'present'; value: OutputValue }>
  | Readonly<{ kind: 'absent' }>;

export type ObjectPropertyRewriteResult<
  InputPropertyKey extends ObjectPropertyKey,
  InputPropertyValue,
  OutputValue,
  RewrittenPropertyKey extends ObjectPropertyKey,
  RewrittenPropertyValue,
> = {
  /** Converted output captured at return, possibly partial before completion. */
  capturedOutputResultAtReturn: ObjectRewriteOutputResult<OutputValue>;
  /** Final converted output; throws until the runner has finished. */
  getFinalOutputResult(): ObjectRewriteOutputResult<OutputValue>;
  traversalRunner: DepthFirstTreeRunner<
    ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
    LiveObjectPropertyVertexTypes<
      ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
      ObjectPropertyTreeVertexTypes<
        RewrittenPropertyKey,
        RewrittenPropertyValue
      >
    >
  >;
};

export type ObjectPropertyRewriteOptions<
  InputValue,
  InputPropertyKey extends ObjectPropertyKey,
  InputPropertyValue,
  OutputValue,
  RewrittenPropertyKey extends ObjectPropertyKey,
  RewrittenPropertyValue,
> = ObjectPropertyTreeSourceOptions<
  InputValue,
  InputPropertyKey,
  InputPropertyValue,
  RewrittenPropertyKey,
  RewrittenPropertyValue
> &
  Partial<
    ObjectMutationOptions<
      ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
      ObjectPropertyTreeVertexTypes<
        RewrittenPropertyKey,
        RewrittenPropertyValue
      >
    > &
      Omit<
        DepthFirstTreeTraversalBuilderOptionsPatch<
          ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
          LiveObjectPropertyVertexTypes<
            ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
            ObjectPropertyTreeVertexTypes<
              RewrittenPropertyKey,
              RewrittenPropertyValue
            >
          >
        >,
        'treeDiscoverySource'
      >
  > & {
    treeDiscoverySource?: never;
    rewritePropertyAfterChildTraversal?: ObjectPropertyPostOrderRewriteCallback<
      InputPropertyKey,
      InputPropertyValue,
      RewrittenPropertyKey,
      RewrittenPropertyValue
    >;
    includeAssembledValueInRewriteInput?: boolean;
  } & (unknown extends OutputValue
    ? {
        convertPresentRootOutputValue?: PresentRootOutputConverter<OutputValue>;
      }
    : {
        convertPresentRootOutputValue: PresentRootOutputConverter<OutputValue>;
      });

export type PresentRootOutputConverter<OutputValue> = (
  propertyValue: unknown,
  context: { readonly isTraversalFinished: boolean },
) => OutputValue;

export function rewriteObject<
  InputValue = NestedObjectOrArray<ObjectPropertyKey, unknown>,
  InputPropertyKey extends ObjectPropertyKey = ObjectPropertyKey,
  InputPropertyValue = unknown,
  OutputValue = unknown,
  RewrittenPropertyKey extends ObjectPropertyKey = InputPropertyKey,
  RewrittenPropertyValue = InputPropertyValue,
>(
  object: InputValue,
  ...args: Record<never, never> extends ObjectPropertyRewriteOptions<
    InputValue,
    InputPropertyKey,
    InputPropertyValue,
    OutputValue,
    RewrittenPropertyKey,
    RewrittenPropertyValue
  >
    ? [
        options?: ObjectPropertyRewriteOptions<
          InputValue,
          InputPropertyKey,
          InputPropertyValue,
          OutputValue,
          RewrittenPropertyKey,
          RewrittenPropertyValue
        >,
      ]
    : [
        options: ObjectPropertyRewriteOptions<
          InputValue,
          InputPropertyKey,
          InputPropertyValue,
          OutputValue,
          RewrittenPropertyKey,
          RewrittenPropertyValue
        >,
      ]
): ObjectPropertyRewriteResult<
  InputPropertyKey,
  InputPropertyValue,
  OutputValue,
  RewrittenPropertyKey,
  RewrittenPropertyValue
> {
  const [inputOptions] = args;
  if (inputOptions !== undefined)
    assertOwnKeys(inputOptions, [
      ...TREE_OPTION_KEYS.filter(
        (propertyKey) => propertyKey !== 'treeDiscoverySource',
      ),
      ...OBJECT_SOURCE_OPTION_KEYS,
      ...OBJECT_MUTATION_OPTION_KEYS,
      'childBoundaryVisits',
      'rewritePropertyAfterChildTraversal',
      'convertPresentRootOutputValue',
      'includeAssembledValueInRewriteInput',
    ]);
  const options =
    inputOptions === undefined ? undefined : definedOptions(inputOptions);
  if (options !== undefined) {
    assertOptionalCallbacks(options, [
      ...OBJECT_SOURCE_OPTION_KEYS,
      'matchesArrayAssemblyPredicate',
      'matchesObjectAssemblyPredicate',
      'assembleArrayValueFromChildProperties',
      'assembleObjectValueFromChildProperties',
      'rewritePropertyAfterChildTraversal',
      'convertPresentRootOutputValue',
    ]);
    if (
      options.includeAssembledValueInRewriteInput !== undefined &&
      typeof options.includeAssembledValueInRewriteInput !== 'boolean'
    )
      throw new TypeError('assembleCompositesBeforeRewrite must be boolean');
  }
  const assembleCompositeBeforeVisit =
    options?.includeAssembledValueInRewriteInput ?? false;
  const rewritePropertyAfterChildTraversal =
    typeof options?.rewritePropertyAfterChildTraversal === 'function'
      ? options.rewritePropertyAfterChildTraversal
      : null;
  const convertPresentRootOutputValue: PresentRootOutputConverter<OutputValue> =
    options?.convertPresentRootOutputValue ??
    ((propertyValue: unknown) => propertyValue as OutputValue);
  const resolveChildPropertyOrUseDefault =
    options?.resolveChildPropertyOrUseDefault;
  // Required narrow adapters are enforced by RewriteObjectOptions. The default
  // mapper preserves the actual input; its discovery domain is broad.
  const tree = ObjectPropertyTreeSource.fromPropertyAdapters<
    InputValue,
    InputPropertyKey,
    InputPropertyValue,
    RewrittenPropertyKey,
    RewrittenPropertyValue
  >(object, {
    ...(resolveChildPropertyOrUseDefault === undefined
      ? {}
      : { resolveChildPropertyOrUseDefault }),
    enumerateChildPropertyHints:
      options?.enumerateChildPropertyHints ??
      ObjectPropertyTreeSource.enumerateOwnEnumerableChildProperties,
    mapInputToRootProperty:
      options?.mapInputToRootProperty ??
      ObjectPropertyTreeSource.createInputValueToRootPropertyMapper(
        __REWRITE_OBJECT_DEFAULT_ROOT_KEY__,
      ),
  } as ObjectPropertyTreeBaseOptions<InputValue, InputPropertyKey, InputPropertyValue, RewrittenPropertyKey, RewrittenPropertyValue> & ObjectPropertyTreeAdapters<InputValue, InputPropertyKey, InputPropertyValue>);
  const bindObjectMutation =
    ObjectPropertyTreeSource.createObjectPropertyMutationHelperBinder<
      ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
      ObjectPropertyTreeVertexTypes<
        RewrittenPropertyKey,
        RewrittenPropertyValue
      >
    >({
      ...(options?.arrayAssemblyIndexPolicy === undefined
        ? {}
        : { arrayAssemblyIndexPolicy: options.arrayAssemblyIndexPolicy }),
      ...(options?.assembledPropertyKeyCollisionPolicy === undefined
        ? {}
        : {
            assembledPropertyKeyCollisionPolicy:
              options.assembledPropertyKeyCollisionPolicy,
          }),
      ...(options?.matchesArrayAssemblyPredicate
        ? {
            matchesArrayAssemblyPredicate:
              options.matchesArrayAssemblyPredicate,
          }
        : {}),
      ...(options?.matchesObjectAssemblyPredicate
        ? {
            matchesObjectAssemblyPredicate:
              options.matchesObjectAssemblyPredicate,
          }
        : {}),
      ...(options?.assembleArrayValueFromChildProperties
        ? {
            assembleArrayValueFromChildProperties:
              options.assembleArrayValueFromChildProperties,
          }
        : {}),
      ...(options?.assembleObjectValueFromChildProperties
        ? {
            assembleObjectValueFromChildProperties:
              options.assembleObjectValueFromChildProperties,
          }
        : {}),
      ...(options?.assemblyCache === undefined
        ? {}
        : { assemblyCache: options.assemblyCache }),
    });
  const traversal = new DepthFirstTreeTraversalBuilder<
    ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
    LiveObjectPropertyVertexTypes<
      ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
      ObjectPropertyTreeVertexTypes<
        RewrittenPropertyKey,
        RewrittenPropertyValue
      >
    >
  >({
    treeDiscoverySource: tree,
    ...{
      ...(options?.transformChildHintsBeforeResolution === undefined
        ? {}
        : {
            transformChildHintsBeforeResolution:
              options.transformChildHintsBeforeResolution,
          }),
      ...(options?.visitors === undefined
        ? {}
        : { visitors: options.visitors }),
      ...(options?.childBoundaryVisits === undefined
        ? {}
        : { childBoundaryVisits: options.childBoundaryVisits }),
      ...(options?.retainDiscoveredTreeBeforeVisitorCommands === undefined
        ? {}
        : {
            retainDiscoveredTreeBeforeVisitorCommands:
              options.retainDiscoveredTreeBeforeVisitorCommands,
          }),
    },
  });
  traversal.registerVisitorForPhase(
    DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
    (
      vertex: VertexView<
        LiveObjectPropertyVertexTypes<
          ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
          ObjectPropertyTreeVertexTypes<
            RewrittenPropertyKey,
            RewrittenPropertyValue
          >
        >
      >,
      context: TreeVisitorContext<
        DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
        ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
        LiveObjectPropertyVertexTypes<
          ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
          ObjectPropertyTreeVertexTypes<
            RewrittenPropertyKey,
            RewrittenPropertyValue
          >
        >
      >,
    ) => {
      const {
        createObjectPropertyMutationCommand,
        matchesAnyCompositeAssemblyPredicate,
        matchesObjectAssemblyPredicate,
        matchesArrayAssemblyPredicate,
        assembleCompositeFromCurrentChildren,
      } = bindObjectMutation(vertex, context);
      let rwInput: ObjectPropertyRewriteInput<
        InputPropertyKey,
        InputPropertyValue,
        RewrittenPropertyKey,
        RewrittenPropertyValue
      > = vertex.getVertexData();
      if (
        assembleCompositeBeforeVisit &&
        matchesAnyCompositeAssemblyPredicate
      ) {
        rwInput = {
          ...rwInput,
          assembledValueFromCurrentChildren:
            assembleCompositeFromCurrentChildren(),
        };
      }
      const rw = rewritePropertyAfterChildTraversal?.(rwInput, {
        ...context,
        matchesAnyCompositeAssemblyPredicate,
        matchesObjectAssemblyPredicate,
        matchesArrayAssemblyPredicate,
        vertex,
        requirePropertyKeyPathFromRoot: (
          thisOptions?: StructuralAncestorPathOptions,
        ) =>
          context.liveResolvedTreeView
            .requireStructuralAncestorPathTo(context.vertexHandle, thisOptions)
            .map((ps) => ps.getCurrentVertexView().getVertexData().propertyKey),
      });
      return { commands: [createObjectPropertyMutationCommand(rw)] };
    },
  );
  const traversalRunner = traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  const convertCurrentRoot = (): ObjectRewriteOutputResult<OutputValue> => {
    const liveResolvedTreeView = traversalRunner.getLiveResolvedTreeView();
    const rootRef = liveResolvedTreeView.getRootVertexHandleOrNull();
    if (
      rootRef === null ||
      !liveResolvedTreeView.containsVertexHandle(rootRef)
    ) {
      return Object.freeze({ kind: 'absent' });
    }
    return Object.freeze({
      kind: 'present',
      value: convertPresentRootOutputValue(
        rootRef.getCurrentVertexView().getVertexData().propertyValue,
        {
          isTraversalFinished:
            traversalRunner.getTraversalLifecycleStatus() ===
            TraversalRunnerStatus.FINISHED,
        },
      ),
    });
  };
  const capturedOutputResultAtReturn = convertCurrentRoot();
  let hasFinalOutput =
    traversalRunner.getTraversalLifecycleStatus() ===
    TraversalRunnerStatus.FINISHED;
  let finalOutput = capturedOutputResultAtReturn;
  return {
    capturedOutputResultAtReturn,
    traversalRunner,
    getFinalOutputResult() {
      if (
        traversalRunner.getTraversalLifecycleStatus() !==
        TraversalRunnerStatus.FINISHED
      ) {
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
export function rewriteObjectWithAssertedOutputType<OutputValue>(
  object: unknown,
  options?: ObjectPropertyRewriteOptions<
    unknown,
    ObjectPropertyKey,
    unknown,
    unknown,
    ObjectPropertyKey,
    unknown
  >,
): ObjectPropertyRewriteResult<
  ObjectPropertyKey,
  unknown,
  OutputValue,
  ObjectPropertyKey,
  unknown
> {
  // This helper is the explicit caller assertion. Ordinary rewriteObject keeps
  // the unknown result unless convertRootValue establishes a typed output.
  return rewriteObject(object, options) as ObjectPropertyRewriteResult<
    ObjectPropertyKey,
    unknown,
    OutputValue,
    ObjectPropertyKey,
    unknown
  >;
}
