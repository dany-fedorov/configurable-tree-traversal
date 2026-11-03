import {
  assertOwnKeys,
  assertOptionalCallbacks,
  OBJECT_MUTATION_OPTION_KEYS,
  definedOptions,
} from '@core/assertPublicOptions';
import type { LiveObjectPropertyVertexTypes } from './ObjectCurrentVertexTypes';
import type { ObjectPropertyTreeVertexTypes } from '@traversable-object-tree/lib/ObjectTreeVertexTypes';
import type { ObjectPropertyKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { TreeVertexPhaseVisitorCallback } from '@core/TraversalVisitor';
import type { ObjectPropertyAssemblyClassification } from '@traversable-object-tree/lib/TO_IsCompositeAssertionsMixin';
import type { VertexHandle } from '@core/CTTRef';
import type { VertexDataReplacementOrDeletionCommand } from '@core/MakeMutationCommandFunctionFactory';
import type { ObjectPropertyRecord } from '@traversable-object-tree/lib/TraversableObjectProp';
import { TraversalVisitorCommandName } from '@core/TraversalVisitor';
/** Reference-keyed assembly storage must accept every reconstructed value. */
export type ObjectPropertyAssemblyCache<Key> = {
  hasAssembledValueForVertex: (vertexHandle: Key) => boolean;
  getAssembledValueForVertex: (vertexHandle: Key) => unknown;
  setAssembledValueForVertex: (
    vertexHandle: Key,
    assembledValue: unknown,
  ) => unknown;
};
export type ObjectMutationOptions<
  InputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>,
  OutputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>,
> = {
  arrayAssemblyIndexPolicy?:
    | 'compactRetainedNumericIndices'
    | 'preserveNumericIndicesAndArrayLength';
  assembledPropertyKeyCollisionPolicy?:
    | 'throwOnDuplicateKey'
    | 'keepFirstProperty'
    | 'keepLastProperty';
  matchesArrayAssemblyPredicate?: (
    vertexData: LiveObjectPropertyVertexTypes<
      InputTypes,
      OutputTypes
    >['VertexData'],
  ) => boolean;
  matchesObjectAssemblyPredicate?: (
    vertexData: LiveObjectPropertyVertexTypes<
      InputTypes,
      OutputTypes
    >['VertexData'],
  ) => boolean;
  assembleArrayValueFromChildProperties?: (
    processedChildProperties: LiveObjectPropertyVertexTypes<
      InputTypes,
      OutputTypes
    >['VertexData'][],
    vertexData: LiveObjectPropertyVertexTypes<
      InputTypes,
      OutputTypes
    >['VertexData'],
    propertyVisitorArguments: Parameters<
      TreeVertexPhaseVisitorCallback<
        InputTypes,
        LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>,
        string
      >
    >,
    assemblyClassification: ObjectPropertyAssemblyClassification,
  ) => unknown;
  assembleObjectValueFromChildProperties?: (
    processedChildProperties: LiveObjectPropertyVertexTypes<
      InputTypes,
      OutputTypes
    >['VertexData'][],
    vertexData: LiveObjectPropertyVertexTypes<
      InputTypes,
      OutputTypes
    >['VertexData'],
    propertyVisitorArguments: Parameters<
      TreeVertexPhaseVisitorCallback<
        InputTypes,
        LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>,
        string
      >
    >,
    assemblyClassification: ObjectPropertyAssemblyClassification,
  ) => unknown;
  assemblyCache?: ObjectPropertyAssemblyCache<
    VertexHandle<LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>>
  >;
};
export type ObjectPropertyRewriteRequest<
  OutputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>,
> =
  | {
      kind: 'patchPropertyKeyOrValue';
      propertyPatch: ObjectPropertyKeyValuePatch<OutputTypes>;
      propertyValue?: never;
    }
  | {
      kind: 'deletePropertySubtree';
      propertyPatch?: never;
      propertyValue?: never;
    }
  | {
      kind: 'keepPropertyAndAssembleCurrentChildren';
      propertyPatch?: never;
      propertyValue?: never;
    };
/** Object helpers merge only the supplied output property fields. */
export type ObjectPropertyKeyValuePatch<
  OutputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>,
> = Partial<Pick<OutputTypes['VertexData'], 'propertyKey' | 'propertyValue'>>;
export type BoundObjectPropertyMutationHelpers<
  OutputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>,
  InputTypes extends ObjectPropertyTreeVertexTypes<
    ObjectPropertyKey,
    unknown
  > = OutputTypes,
> = ObjectPropertyAssemblyClassification & {
  createObjectPropertyMutationCommand: (
    request?: ObjectPropertyRewriteRequest<OutputTypes>,
  ) => VertexDataReplacementOrDeletionCommand<
    LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>,
    TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS
  >;
  assembleCompositeFromCurrentChildren: (options?: {
    cacheResult?: boolean;
  }) => unknown;
};
export type ObjectPropertyMutationHelperBinder<
  InputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>,
  OutputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>,
> = (
  ...propertyVisitorArguments: Parameters<
    TreeVertexPhaseVisitorCallback<
      InputTypes,
      LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>,
      string
    >
  >
) => BoundObjectPropertyMutationHelpers<OutputTypes, InputTypes>;
export type ObjectPropertyMutationHelperBinderFactory = <
  InputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>,
  OutputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>,
>(
  options?: ObjectMutationOptions<InputTypes, OutputTypes>,
) => ObjectPropertyMutationHelperBinder<InputTypes, OutputTypes>;
export const createObjectPropertyMutationHelperBinder: ObjectPropertyMutationHelperBinderFactory =
  function configureObjectMutation<
    InputTypes extends ObjectPropertyTreeVertexTypes<
      ObjectPropertyKey,
      unknown
    >,
    OutputTypes extends ObjectPropertyTreeVertexTypes<
      ObjectPropertyKey,
      unknown
    >,
  >(
    options?: ObjectMutationOptions<InputTypes, OutputTypes>,
  ): ObjectPropertyMutationHelperBinder<InputTypes, OutputTypes> {
    if (options !== undefined) {
      assertOwnKeys(options, OBJECT_MUTATION_OPTION_KEYS);
      options = definedOptions(options);
      assertOptionalCallbacks(options, [
        'matchesArrayAssemblyPredicate',
        'matchesObjectAssemblyPredicate',
        'assembleArrayValueFromChildProperties',
        'assembleObjectValueFromChildProperties',
      ]);
      const assemblyCache = options.assemblyCache;
      if (
        assemblyCache !== undefined &&
        (assemblyCache === null ||
          [
            'hasAssembledValueForVertex',
            'getAssembledValueForVertex',
            'setAssembledValueForVertex',
          ].some(
            (propertyKey) =>
              typeof Reflect.get(assemblyCache, propertyKey) !== 'function',
          ))
      )
        throw new TypeError(
          'assemblyCache requires explicit vertex assembly cache methods',
        );
    }
    const {
      arrayAssemblyIndexPolicy = 'compactRetainedNumericIndices',
      assembledPropertyKeyCollisionPolicy = 'throwOnDuplicateKey',
    } = options ?? {};
    if (
      arrayAssemblyIndexPolicy !== 'compactRetainedNumericIndices' &&
      arrayAssemblyIndexPolicy !== 'preserveNumericIndicesAndArrayLength'
    ) {
      throw new TypeError('Invalid arrayAssemblyIndexPolicy');
    }
    if (
      assembledPropertyKeyCollisionPolicy !== 'throwOnDuplicateKey' &&
      assembledPropertyKeyCollisionPolicy !== 'keepFirstProperty' &&
      assembledPropertyKeyCollisionPolicy !== 'keepLastProperty'
    ) {
      throw new TypeError('Invalid assembledPropertyKeyCollisionPolicy');
    }
    const {
      matchesObjectAssemblyPredicate,
      matchesArrayAssemblyPredicate,
      assembleObjectValueFromChildProperties: customAssembleObject,
      assembleArrayValueFromChildProperties: customAssembleArray,
      assemblyCache: assembledMapInput,
    } = {
      ...OBJECT_MUTATION_DEFAULTS,
      ...definedOptions(options ?? {}),
    };
    const fallbackAssemblyValues = new Map<object, unknown>();
    const assemblyCache: NonNullable<typeof assembledMapInput> =
      assembledMapInput ?? {
        hasAssembledValueForVertex: (vertexHandle) =>
          fallbackAssemblyValues.has(vertexHandle),
        getAssembledValueForVertex: (vertexHandle) =>
          fallbackAssemblyValues.get(vertexHandle),
        setAssembledValueForVertex: (vertexHandle, assembledValue) =>
          fallbackAssemblyValues.set(vertexHandle, assembledValue),
      };
    const assembleArrayValueFromChildProperties =
      customAssembleArray ??
      ((
        children: ObjectPropertyRecord<ObjectPropertyKey, unknown>[],
        vertexData: ObjectPropertyRecord<ObjectPropertyKey, unknown>,
      ) =>
        assembleProperties(
          children,
          true,
          arrayAssemblyIndexPolicy,
          assembledPropertyKeyCollisionPolicy,
          vertexData.propertyValue,
        ));
    const assembleObjectValueFromChildProperties =
      customAssembleObject ??
      ((
        children: ObjectPropertyRecord<ObjectPropertyKey, unknown>[],
        vertexData: ObjectPropertyRecord<ObjectPropertyKey, unknown>,
      ) =>
        assembleProperties(
          children,
          false,
          arrayAssemblyIndexPolicy,
          assembledPropertyKeyCollisionPolicy,
          vertexData.propertyValue,
        ));
    return function bindObjectMutation(
      ...propertyVisitorArguments: Parameters<
        TreeVertexPhaseVisitorCallback<
          InputTypes,
          LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>,
          string
        >
      >
    ): BoundObjectPropertyMutationHelpers<OutputTypes, InputTypes> {
      const [vertex, context] = propertyVisitorArguments;
      const vertexData = vertex.getVertexData();
      const { liveResolvedTreeView, vertexHandle } = context;
      const isThisAnArray = matchesArrayAssemblyPredicate(vertexData);
      const isThisAnObject = matchesObjectAssemblyPredicate(vertexData);
      const isThisComposite = isThisAnArray || isThisAnObject;
      function TraversableObjectTree_getChildrenObjectPropertiesOf(
        vertexHandle: VertexHandle<
          LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>
        >,
      ): LiveObjectPropertyVertexTypes<
        InputTypes,
        OutputTypes
      >['VertexData'][] {
        return (
          liveResolvedTreeView.getChildVertexHandlesOrNull(vertexHandle) ?? []
        ).map((ch) => ch.getCurrentVertexView().getVertexData());
      }
      function TraversableObjectTree_assembleComposite(options?: {
        cacheResult?: boolean;
      }): unknown {
        if (options !== undefined) assertOwnKeys(options, ['cacheResult']);
        const cacheResult = options?.cacheResult ?? true;
        if (
          options?.cacheResult !== undefined &&
          typeof options.cacheResult !== 'boolean'
        ) {
          throw new TypeError('cacheResult must be boolean');
        }
        if (isThisAnArray) {
          const res = assembleArrayValueFromChildProperties(
            TraversableObjectTree_getChildrenObjectPropertiesOf(vertexHandle),
            vertex.getVertexData(),
            propertyVisitorArguments,
            {
              matchesObjectAssemblyPredicate: isThisAnObject,
              matchesArrayAssemblyPredicate: isThisAnArray,
              matchesAnyCompositeAssemblyPredicate: isThisComposite,
            },
          );
          if (cacheResult) {
            assemblyCache.setAssembledValueForVertex(vertexHandle, res);
          }
          return res;
        } else if (isThisAnObject) {
          const res = assembleObjectValueFromChildProperties(
            TraversableObjectTree_getChildrenObjectPropertiesOf(vertexHandle),
            vertex.getVertexData(),
            propertyVisitorArguments,
            {
              matchesObjectAssemblyPredicate: isThisAnObject,
              matchesArrayAssemblyPredicate: isThisAnArray,
              matchesAnyCompositeAssemblyPredicate: isThisComposite,
            },
          );
          if (cacheResult) {
            assemblyCache.setAssembledValueForVertex(vertexHandle, res);
          }
          return res;
        } else {
          throw new Error(
            'Calling assembleComposite when vertex.getData() is not recognized by isArray or by isObject',
          );
        }
      }
      function buildMutationCommand(
        request?: ObjectPropertyRewriteRequest<OutputTypes>,
      ): VertexDataReplacementOrDeletionCommand<
        LiveObjectPropertyVertexTypes<InputTypes, OutputTypes>,
        TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS
      > {
        let toDelete = false;
        let hasRewrite = false;
        let rewritePropertyAfterChildTraversal:
          | ObjectPropertyKeyValuePatch<OutputTypes>
          | undefined;
        if (request !== undefined) {
          if (
            request === null ||
            typeof request !== 'object' ||
            Array.isArray(request)
          ) {
            throw new TypeError('Invalid mutation operation');
          }
          const keys = Reflect.ownKeys(request);
          if (!Object.prototype.hasOwnProperty.call(request, 'kind')) {
            throw new TypeError('Mutation operation requires kind');
          }
          const kind = request.kind;
          if (
            kind !== 'patchPropertyKeyOrValue' &&
            kind !== 'deletePropertySubtree' &&
            kind !== 'keepPropertyAndAssembleCurrentChildren'
          ) {
            throw new TypeError('Invalid mutation operation kind');
          }
          if (
            keys.some(
              (propertyKey) =>
                propertyKey !== 'kind' &&
                !(
                  kind === 'patchPropertyKeyOrValue' &&
                  propertyKey === 'propertyPatch'
                ),
            ) ||
            (kind === 'patchPropertyKeyOrValue' &&
              !Object.prototype.hasOwnProperty.call(request, 'propertyPatch'))
          ) {
            throw new TypeError('Invalid mutation operation fields');
          }
          toDelete = kind === 'deletePropertySubtree';
          if (kind === 'patchPropertyKeyOrValue') {
            hasRewrite = true;
            rewritePropertyAfterChildTraversal = request.propertyPatch;
          }
        }
        if (
          hasRewrite &&
          (rewritePropertyAfterChildTraversal === null ||
            typeof rewritePropertyAfterChildTraversal !== 'object' ||
            Array.isArray(rewritePropertyAfterChildTraversal))
        ) {
          throw new TypeError(
            'rewrite patch must be a non-null object property patch',
          );
        }
        if (hasRewrite) {
          for (const propertyKey of Reflect.ownKeys(
            rewritePropertyAfterChildTraversal!,
          )) {
            if (
              propertyKey !== 'propertyKey' &&
              propertyKey !== 'propertyValue'
            ) {
              throw new TypeError(
                'Object property patches accept only propertyKey and propertyValue',
              );
            }
          }
        }
        const hasRewriteValue =
          hasRewrite &&
          Object.prototype.hasOwnProperty.call(
            rewritePropertyAfterChildTraversal,
            'propertyValue',
          );
        const hasRewriteKey =
          hasRewrite &&
          Object.prototype.hasOwnProperty.call(
            rewritePropertyAfterChildTraversal,
            'propertyKey',
          );
        const rewriteKeyObject = !hasRewriteKey
          ? {}
          : {
              propertyKey: rewritePropertyAfterChildTraversal?.propertyKey,
            };
        const rewriteValueObject = !hasRewriteValue
          ? {}
          : {
              propertyValue: rewritePropertyAfterChildTraversal?.propertyValue,
            };
        if (toDelete) {
          return {
            commandName:
              TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
          };
        } else if (hasRewriteValue) {
          return {
            commandName:
              TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
            commandArguments: {
              replacementVertexData: {
                ...vertexData,
                ...rewriteKeyObject,
                ...rewriteValueObject,
              },
            },
          };
        } else if (isThisComposite) {
          const hasAlreadyAssembled =
            assemblyCache?.hasAssembledValueForVertex(vertexHandle);
          return {
            commandName:
              TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
            commandArguments: {
              replacementVertexData: {
                ...vertexData,
                ...rewriteKeyObject,
                propertyValue: hasAlreadyAssembled
                  ? assemblyCache?.getAssembledValueForVertex(vertexHandle)
                  : TraversableObjectTree_assembleComposite({
                      cacheResult: false,
                    }),
              },
            },
          };
        } else {
          return {
            commandName:
              TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
            commandArguments: {
              replacementVertexData: {
                ...vertexData,
                ...rewriteKeyObject,
              },
            },
          };
        }
      }
      return {
        matchesAnyCompositeAssemblyPredicate: isThisComposite,
        matchesArrayAssemblyPredicate: isThisAnArray,
        matchesObjectAssemblyPredicate: isThisAnObject,
        assembleCompositeFromCurrentChildren:
          TraversableObjectTree_assembleComposite,
        createObjectPropertyMutationCommand: buildMutationCommand,
      };
    };
  };
/** Normalize property keys once, before collision checks and assignment. */
function assembleProperties(
  children: ObjectPropertyRecord<ObjectPropertyKey, unknown>[],
  array: boolean,
  arrayAssemblyIndexPolicy:
    | 'compactRetainedNumericIndices'
    | 'preserveNumericIndicesAndArrayLength',
  assembledPropertyKeyCollisionPolicy:
    | 'throwOnDuplicateKey'
    | 'keepFirstProperty'
    | 'keepLastProperty',
  originalValue: unknown,
): unknown {
  const result = array
    ? arrayAssemblyIndexPolicy === 'preserveNumericIndicesAndArrayLength' &&
      Array.isArray(originalValue)
      ? new Array(originalValue.length)
      : []
    : {};
  const occupied = new Set<string | symbol>();
  let nextIndex = 0;
  for (const child of children) {
    let propertyKey: string | symbol;
    if (array && typeof child.propertyKey === 'number') {
      if (arrayAssemblyIndexPolicy === 'preserveNumericIndicesAndArrayLength') {
        if (
          !Number.isInteger(child.propertyKey) ||
          child.propertyKey < 0 ||
          child.propertyKey > 4294967294
        ) {
          throw new TypeError(
            'Preserved array keys must be valid numeric indices',
          );
        }
        propertyKey = String(child.propertyKey);
      } else {
        propertyKey = String(nextIndex++);
      }
    } else {
      propertyKey =
        typeof child.propertyKey === 'symbol'
          ? child.propertyKey
          : String(child.propertyKey);
    }
    if (occupied.has(propertyKey)) {
      if (assembledPropertyKeyCollisionPolicy === 'throwOnDuplicateKey')
        throw new TypeError('Property collision during object assembly');
      if (assembledPropertyKeyCollisionPolicy === 'keepFirstProperty') continue;
    }
    occupied.add(propertyKey);
    Object.defineProperty(result, propertyKey, {
      value: child.propertyValue,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return result;
}
const OBJECT_MUTATION_DEFAULTS = {
  matchesArrayAssemblyPredicate: (
    d: ObjectPropertyRecord<ObjectPropertyKey, unknown>,
  ): boolean => Array.isArray(d.propertyValue),
  matchesObjectAssemblyPredicate: (
    d: ObjectPropertyRecord<ObjectPropertyKey, unknown>,
  ): boolean =>
    Boolean(
      d.propertyValue &&
        typeof d.propertyValue === 'object' &&
        !Array.isArray(d.propertyValue),
    ),
};
