import {
  assertOwnKeys,
  assertOptionalCallbacks,
  OBJECT_MUTATION_OPTION_KEYS,
  definedOptions,
} from '@core/assertPublicOptions';
import type { ObjectCurrentVertexTypes } from './ObjectCurrentVertexTypes';
import type { ObjectTreeVertexTypes } from '@traversable-object-tree/lib/ObjectTreeVertexTypes';
import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { TreeVisitor } from '@core/TraversalVisitor';
import type { ObjectCompositeClassification } from '@traversable-object-tree/lib/TO_IsCompositeAssertionsMixin';
import type { VertexHandle } from '@core/CTTRef';
import type { MutationCommand } from '@core/MakeMutationCommandFunctionFactory';
import type { TraversableObjectProp } from '@traversable-object-tree/lib/TraversableObjectProp';
import { TraversalVisitorCommandName } from '@core/TraversalVisitor';

/** Reference-keyed assembly storage must accept every reconstructed value. */
export type ObjectAssemblyCache<Key> = {
  has: (key: Key) => boolean;
  get: (key: Key) => unknown;
  set: (key: Key, value: unknown) => unknown;
};

export type ObjectMutationOptions<
  InputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>,
  OutputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>,
> = {
  arrayIndexPolicy?: 'compactInTraversalOrder' | 'preserveNumericKeys';
  propertyCollision?: 'error' | 'firstWins' | 'lastWins';
  isArray?: (
    vertexData: ObjectCurrentVertexTypes<InputTypes, OutputTypes>['VertexData'],
  ) => boolean;
  isObject?: (
    vertexData: ObjectCurrentVertexTypes<InputTypes, OutputTypes>['VertexData'],
  ) => boolean;
  assembleArray?: (
    processedChildren: ObjectCurrentVertexTypes<
      InputTypes,
      OutputTypes
    >['VertexData'][],
    vertexData: ObjectCurrentVertexTypes<InputTypes, OutputTypes>['VertexData'],
    visitorArguments: Parameters<
      TreeVisitor<
        string,
        InputTypes,
        ObjectCurrentVertexTypes<InputTypes, OutputTypes>
      >
    >,
    isCompositeAssertions: ObjectCompositeClassification,
  ) => unknown;
  assembleObject?: (
    processedChildren: ObjectCurrentVertexTypes<
      InputTypes,
      OutputTypes
    >['VertexData'][],
    vertexData: ObjectCurrentVertexTypes<InputTypes, OutputTypes>['VertexData'],
    visitorArguments: Parameters<
      TreeVisitor<
        string,
        InputTypes,
        ObjectCurrentVertexTypes<InputTypes, OutputTypes>
      >
    >,
    isCompositeAssertions: ObjectCompositeClassification,
  ) => unknown;
  assembledMap?: ObjectAssemblyCache<
    VertexHandle<ObjectCurrentVertexTypes<InputTypes, OutputTypes>>
  >;
};

export type ObjectMutationRequest<
  OutputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>,
> =
  | { kind: 'rewrite'; patch: ObjectPropertyPatch<OutputTypes>; value?: never }
  | { kind: 'delete'; patch?: never; value?: never }
  | { kind: 'keep'; patch?: never; value?: never };

/** Object helpers merge only the supplied output property fields. */
export type ObjectPropertyPatch<
  OutputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>,
> = Partial<Pick<OutputTypes['VertexData'], 'key' | 'value'>>;

export type ObjectMutationCommands<
  OutputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>,
  InputTypes extends ObjectTreeVertexTypes<
    TraversableObjectPropKey,
    unknown
  > = OutputTypes,
> = ObjectCompositeClassification & {
  makeMutationCommand: (
    request?: ObjectMutationRequest<OutputTypes>,
  ) => MutationCommand<
    ObjectCurrentVertexTypes<InputTypes, OutputTypes>,
    TraversalVisitorCommandName.DELETE_TREE_SUBTREE
  >;
  assembleComposite: (saveToMap?: boolean) => unknown;
};

export type ObjectMutationBinder<
  InputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>,
  OutputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>,
> = (
  ...visitorArguments: Parameters<
    TreeVisitor<
      string,
      InputTypes,
      ObjectCurrentVertexTypes<InputTypes, OutputTypes>
    >
  >
) => ObjectMutationCommands<OutputTypes, InputTypes>;

export type ObjectMutationBinderFactory = <
  InputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>,
  OutputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>,
>(
  options?: ObjectMutationOptions<InputTypes, OutputTypes>,
) => ObjectMutationBinder<InputTypes, OutputTypes>;

export const createObjectMutationBinder: ObjectMutationBinderFactory =
  function configureObjectMutation<
    InputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>,
    OutputTypes extends ObjectTreeVertexTypes<
      TraversableObjectPropKey,
      unknown
    >,
  >(
    options?: ObjectMutationOptions<InputTypes, OutputTypes>,
  ): ObjectMutationBinder<InputTypes, OutputTypes> {
    if (options !== undefined) {
      assertOwnKeys(options, OBJECT_MUTATION_OPTION_KEYS);
      options = definedOptions(options);
      assertOptionalCallbacks(options, [
        'isArray',
        'isObject',
        'assembleArray',
        'assembleObject',
      ]);
      const assemblyCache = options.assembledMap;
      if (
        assemblyCache !== undefined &&
        (assemblyCache === null ||
          ['has', 'get', 'set'].some(
            (key) => typeof Reflect.get(assemblyCache, key) !== 'function',
          ))
      )
        throw new TypeError('assembledMap requires has/get/set');
    }
    const {
      arrayIndexPolicy = 'compactInTraversalOrder',
      propertyCollision = 'error',
    } = options ?? {};
    if (
      arrayIndexPolicy !== 'compactInTraversalOrder' &&
      arrayIndexPolicy !== 'preserveNumericKeys'
    ) {
      throw new TypeError('Invalid arrayIndexPolicy');
    }
    if (
      propertyCollision !== 'error' &&
      propertyCollision !== 'firstWins' &&
      propertyCollision !== 'lastWins'
    ) {
      throw new TypeError('Invalid propertyCollision');
    }
    const {
      isObject,
      isArray,
      assembleObject: customAssembleObject,
      assembleArray: customAssembleArray,
      assembledMap: assembledMapInput,
    } = {
      ...OBJECT_MUTATION_DEFAULTS,
      ...definedOptions(options ?? {}),
    };
    const assembledMap = assembledMapInput ?? new Map();
    const assembleArray =
      customAssembleArray ??
      ((
        children: TraversableObjectProp<TraversableObjectPropKey, unknown>[],
        vertexData: TraversableObjectProp<TraversableObjectPropKey, unknown>,
      ) =>
        assembleProperties(
          children,
          true,
          arrayIndexPolicy,
          propertyCollision,
          vertexData.value,
        ));
    const assembleObject =
      customAssembleObject ??
      ((
        children: TraversableObjectProp<TraversableObjectPropKey, unknown>[],
        vertexData: TraversableObjectProp<TraversableObjectPropKey, unknown>,
      ) =>
        assembleProperties(
          children,
          false,
          arrayIndexPolicy,
          propertyCollision,
          vertexData.value,
        ));

    return function bindObjectMutation(
      ...visitorArguments: Parameters<
        TreeVisitor<
          string,
          InputTypes,
          ObjectCurrentVertexTypes<InputTypes, OutputTypes>
        >
      >
    ): ObjectMutationCommands<OutputTypes, InputTypes> {
      const [vertex, context] = visitorArguments;
      const vertexData = vertex.getData();
      const { resolvedTreeView, vertexRef } = context;

      const isThisAnArray = isArray(vertexData);
      const isThisAnObject = isObject(vertexData);
      const isThisComposite = isThisAnArray || isThisAnObject;

      function TraversableObjectTree_getChildrenObjectPropertiesOf(
        vertexRef: VertexHandle<
          ObjectCurrentVertexTypes<InputTypes, OutputTypes>
        >,
      ): ObjectCurrentVertexTypes<InputTypes, OutputTypes>['VertexData'][] {
        return (resolvedTreeView.getChildrenOf(vertexRef) ?? []).map((ch) =>
          ch.getValue().getData(),
        );
      }

      function TraversableObjectTree_assembleComposite(
        saveToMap = true,
      ): unknown {
        if (isThisAnArray) {
          const res = assembleArray(
            TraversableObjectTree_getChildrenObjectPropertiesOf(vertexRef),
            vertex.getData(),
            visitorArguments,
            {
              isObject: isThisAnObject,
              isArray: isThisAnArray,
              isComposite: isThisComposite,
            },
          );
          if (saveToMap) {
            assembledMap.set(vertexRef, res);
          }
          return res;
        } else if (isThisAnObject) {
          const res = assembleObject(
            TraversableObjectTree_getChildrenObjectPropertiesOf(vertexRef),
            vertex.getData(),
            visitorArguments,
            {
              isObject: isThisAnObject,
              isArray: isThisAnArray,
              isComposite: isThisComposite,
            },
          );
          if (saveToMap) {
            assembledMap.set(vertexRef, res);
          }
          return res;
        } else {
          throw new Error(
            'Calling assembleComposite when vertex.getData() is not recognized by isArray or by isObject',
          );
        }
      }

      function buildMutationCommand(
        request?: ObjectMutationRequest<OutputTypes>,
      ): MutationCommand<
        ObjectCurrentVertexTypes<InputTypes, OutputTypes>,
        TraversalVisitorCommandName.DELETE_TREE_SUBTREE
      > {
        let toDelete = false;
        let hasRewrite = false;
        let rewrite: ObjectPropertyPatch<OutputTypes> | undefined;
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
          if (kind !== 'rewrite' && kind !== 'delete' && kind !== 'keep') {
            throw new TypeError('Invalid mutation operation kind');
          }
          if (
            keys.some(
              (key) =>
                key !== 'kind' && !(kind === 'rewrite' && key === 'patch'),
            ) ||
            (kind === 'rewrite' &&
              !Object.prototype.hasOwnProperty.call(request, 'patch'))
          ) {
            throw new TypeError('Invalid mutation operation fields');
          }
          toDelete = kind === 'delete';
          if (kind === 'rewrite') {
            hasRewrite = true;
            rewrite = request.patch;
          }
        }
        if (
          hasRewrite &&
          (rewrite === null ||
            typeof rewrite !== 'object' ||
            Array.isArray(rewrite))
        ) {
          throw new TypeError(
            'rewrite patch must be a non-null object property patch',
          );
        }
        if (hasRewrite) {
          for (const key of Reflect.ownKeys(rewrite!)) {
            if (key !== 'key' && key !== 'value') {
              throw new TypeError(
                'Object property patches accept only key and value',
              );
            }
          }
        }
        const hasRewriteValue =
          hasRewrite && Object.prototype.hasOwnProperty.call(rewrite, 'value');
        const hasRewriteKey =
          hasRewrite && Object.prototype.hasOwnProperty.call(rewrite, 'key');
        const rewriteKeyObject = !hasRewriteKey
          ? {}
          : {
              key: rewrite?.key,
            };
        const rewriteValueObject = !hasRewriteValue
          ? {}
          : {
              value: rewrite?.value,
            };
        if (toDelete) {
          return {
            commandName: TraversalVisitorCommandName.DELETE_TREE_SUBTREE,
          };
        } else if (hasRewriteValue) {
          return {
            commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
            commandArguments: {
              newData: {
                ...vertexData,
                ...rewriteKeyObject,
                ...rewriteValueObject,
              },
            },
          };
        } else if (isThisComposite) {
          const hasAlreadyAssembled = assembledMap?.has(vertexRef);
          return {
            commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
            commandArguments: {
              newData: {
                ...vertexData,
                ...rewriteKeyObject,
                value: hasAlreadyAssembled
                  ? assembledMap?.get(vertexRef)
                  : TraversableObjectTree_assembleComposite(false),
              },
            },
          };
        } else {
          return {
            commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
            commandArguments: {
              newData: {
                ...vertexData,
                ...rewriteKeyObject,
              },
            },
          };
        }
      }

      return {
        isComposite: isThisComposite,
        isArray: isThisAnArray,
        isObject: isThisAnObject,
        assembleComposite: TraversableObjectTree_assembleComposite,
        makeMutationCommand: buildMutationCommand,
      };
    };
  };

/** Normalize property keys once, before collision checks and assignment. */
function assembleProperties(
  children: TraversableObjectProp<TraversableObjectPropKey, unknown>[],
  array: boolean,
  arrayIndexPolicy: 'compactInTraversalOrder' | 'preserveNumericKeys',
  propertyCollision: 'error' | 'firstWins' | 'lastWins',
  originalValue: unknown,
): unknown {
  const result = array
    ? arrayIndexPolicy === 'preserveNumericKeys' && Array.isArray(originalValue)
      ? new Array(originalValue.length)
      : []
    : {};
  const occupied = new Set<string | symbol>();
  let nextIndex = 0;
  for (const child of children) {
    let key: string | symbol;
    if (array && typeof child.key === 'number') {
      if (arrayIndexPolicy === 'preserveNumericKeys') {
        if (
          !Number.isInteger(child.key) ||
          child.key < 0 ||
          child.key > 4294967294
        ) {
          throw new TypeError(
            'Preserved array keys must be valid numeric indices',
          );
        }
        key = String(child.key);
      } else {
        key = String(nextIndex++);
      }
    } else {
      key = typeof child.key === 'symbol' ? child.key : String(child.key);
    }
    if (occupied.has(key)) {
      if (propertyCollision === 'error')
        throw new TypeError('Property collision during object assembly');
      if (propertyCollision === 'firstWins') continue;
    }
    occupied.add(key);
    Object.defineProperty(result, key, {
      value: child.value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return result;
}

const OBJECT_MUTATION_DEFAULTS = {
  isArray: (
    d: TraversableObjectProp<TraversableObjectPropKey, unknown>,
  ): boolean => Array.isArray(d.value),
  isObject: (
    d: TraversableObjectProp<TraversableObjectPropKey, unknown>,
  ): boolean =>
    Boolean(d.value && typeof d.value === 'object' && !Array.isArray(d.value)),
};
