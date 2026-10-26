import type { TraversableObjectTTP } from '@traversable-object-tree/lib/TraversableObjectTTP';
import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { TraversalVisitor } from '@core/TraversalVisitor';
import type { ObjectCompositeClassification } from '@traversable-object-tree/lib/TO_IsCompositeAssertionsMixin';
import type { MutableRef } from '@core/CTTRef';
import type { Vertex } from '@core/Vertex';
import type {
  MutationCommandBuilder,
  MutationRequest,
  MutationCommand,
} from '@core/MakeMutationCommandFunctionFactory';
import type { TraversableObjectProp } from '@traversable-object-tree/lib/TraversableObjectProp';
import { TraversalVisitorCommandName } from '@core/TraversalVisitor';

export type ObjectMutationOptions<
  IN_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
  OUT_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
> = {
  isArray?: (vertexData: IN_TO_TTP['VertexData']) => boolean;
  isObject?: (vertexData: IN_TO_TTP['VertexData']) => boolean;
  assembleArray?: (
    processedChildren: OUT_TO_TTP['VertexData'][],
    vertexData: IN_TO_TTP['VertexData'],
    visitorArguments: Parameters<
      TraversalVisitor<string, IN_TO_TTP, OUT_TO_TTP>
    >,
    isCompositeAssertions: ObjectCompositeClassification,
  ) => OUT_TO_TTP['VertexData']['value'];
  assembleObject?: (
    processedChildren: OUT_TO_TTP['VertexData'][],
    vertexData: IN_TO_TTP['VertexData'],
    visitorArguments: Parameters<
      TraversalVisitor<string, IN_TO_TTP, OUT_TO_TTP>
    >,
    isCompositeAssertions: ObjectCompositeClassification,
  ) => OUT_TO_TTP['VertexData']['value'];
  assembledMap?: Map<
    MutableRef<Vertex<IN_TO_TTP | OUT_TO_TTP>>,
    OUT_TO_TTP['VertexData']['value']
  >;
};

/** Object helpers merge only the supplied output property fields. */
export type ObjectMutationPatch<
  OUT_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
> = Partial<OUT_TO_TTP['VertexData']>;

export type ObjectMutationCommands<
  OUT_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
> = ObjectCompositeClassification & {
  makeMutationCommand: MutationCommandBuilder<
    OUT_TO_TTP,
    ObjectMutationPatch<OUT_TO_TTP>
  >;
  assembleComposite: (saveToMap?: boolean) => OUT_TO_TTP['VertexData']['value'];
};

export type ObjectMutationBinder<
  IN_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
  OUT_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
> = (
  ...visitorArguments: Parameters<
    TraversalVisitor<string, IN_TO_TTP, OUT_TO_TTP>
  >
) => ObjectMutationCommands<OUT_TO_TTP>;

export type ObjectMutationBinderFactory = <
  IN_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
  OUT_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
>(
  options?: ObjectMutationOptions<IN_TO_TTP, OUT_TO_TTP>,
) => ObjectMutationBinder<IN_TO_TTP, OUT_TO_TTP>;

export const createObjectMutationBinder: ObjectMutationBinderFactory =
  function configureObjectMutation<
    IN_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
    OUT_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
  >(
    options?: ObjectMutationOptions<IN_TO_TTP, OUT_TO_TTP>,
  ): ObjectMutationBinder<IN_TO_TTP, OUT_TO_TTP> {
    const {
      isObject,
      isArray,
      assembleObject,
      assembleArray,
      assembledMap: assembledMapInput,
    } = {
      ...OBJECT_MUTATION_DEFAULTS,
      ...options,
    };
    const assembledMap = assembledMapInput ?? new Map();

    return function bindObjectMutation(
      ...visitorArguments: Parameters<
        TraversalVisitor<string, IN_TO_TTP, OUT_TO_TTP>
      >
    ): ObjectMutationCommands<OUT_TO_TTP> {
      const [vertex, options] = visitorArguments;
      const vertexData = vertex.getData();
      const { resolvedTree, vertexRef } = options;

      const isThisAnArray = isArray(vertexData);
      const isThisAnObject = isObject(vertexData);
      const isThisComposite = isThisAnArray || isThisAnObject;

      function TraversableObjectTree_getChildrenObjectPropertiesOf(
        vertexRef: MutableRef<Vertex<IN_TO_TTP | OUT_TO_TTP>>,
      ): OUT_TO_TTP['VertexData'][] {
        return (resolvedTree.getChildrenOf(vertexRef) ?? []).map((ch) =>
          ch.getValue().getData(),
        );
      }

      function TraversableObjectTree_assembleComposite(
        saveToMap = true,
      ): OUT_TO_TTP['VertexData']['value'] {
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
        request?: MutationRequest<ObjectMutationPatch<OUT_TO_TTP>>,
      ): MutationCommand<OUT_TO_TTP> {
        const inputOk = request && typeof request === 'object';
        const toDelete =
          inputOk &&
          Object.prototype.hasOwnProperty.call(request, 'delete') &&
          request?.delete === true;
        const hasRewrite =
          inputOk && Object.prototype.hasOwnProperty.call(request, 'rewrite');
        const rewrite = hasRewrite ? request.rewrite : undefined;
        if (hasRewrite && (rewrite === null || typeof rewrite !== 'object')) {
          throw new TypeError(
            'rewrite must be a non-null object property patch',
          );
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
            commandName: TraversalVisitorCommandName.DELETE_VERTEX,
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

export const OBJECT_MUTATION_DEFAULTS = {
  isArray: (
    d: TraversableObjectProp<TraversableObjectPropKey, unknown>,
  ): boolean => Array.isArray(d.value),
  isObject: (
    d: TraversableObjectProp<TraversableObjectPropKey, unknown>,
  ): boolean =>
    Boolean(d.value && typeof d.value === 'object' && !Array.isArray(d.value)),
  assembleArray: (
    processedChildren: TraversableObjectProp<
      TraversableObjectPropKey,
      unknown
    >[],
    _vertexData: TraversableObjectProp<TraversableObjectPropKey, unknown>,
  ): TraversableObjectProp<TraversableObjectPropKey, unknown>['value'] => {
    const numericChildren = processedChildren.filter(
      (child) => typeof child.key === 'number',
    );
    const result = numericChildren.map((child) => child.value);
    for (const child of processedChildren) {
      if (typeof child.key !== 'number') {
        Object.defineProperty(result, child.key, {
          value: child.value,
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
    }
    return result;
  },
  assembleObject: (
    processedChildren: TraversableObjectProp<
      TraversableObjectPropKey,
      unknown
    >[],
  ): TraversableObjectProp<TraversableObjectPropKey, unknown>['value'] => {
    return Object.fromEntries(
      processedChildren.map((ch) => [ch.key, ch.value]),
    );
  },
};
