import type { TraversableObjectTTP } from '@traversable-object-tree/lib/TraversableObjectTTP';
import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { TraversalVisitor } from '@core/TraversalVisitor';
import type { TO_IsCompositeAssertionsMixin } from '@traversable-object-tree/lib/TO_IsCompositeAssertionsMixin';
import type { CTTRef } from '@core/CTTRef';
import type { Vertex } from '@core/Vertex';
import type {
  MakeMutationCommandFunction,
  MakeMutationCommandFunctionInput,
  MakeMutationCommandFunctionResult,
} from '@core/MakeMutationCommandFunctionFactory';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversableObjectProp } from '@traversable-object-tree/lib/TraversableObjectProp';
import { TraversalVisitorCommandName } from '@core/TraversalVisitor';

export type TO_MakeMutationCommandFunctionFactoryConfiguration<
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
    isCompositeAssertions: TO_IsCompositeAssertionsMixin,
  ) => OUT_TO_TTP['VertexData']['value'];
  assembleObject?: (
    processedChildren: OUT_TO_TTP['VertexData'][],
    vertexData: IN_TO_TTP['VertexData'],
    visitorArguments: Parameters<
      TraversalVisitor<string, IN_TO_TTP, OUT_TO_TTP>
    >,
    isCompositeAssertions: TO_IsCompositeAssertionsMixin,
  ) => OUT_TO_TTP['VertexData']['value'];
  assembledMap?: Map<
    CTTRef<Vertex<IN_TO_TTP | OUT_TO_TTP>>,
    OUT_TO_TTP['VertexData']['value']
  >;
};

export type TO_MakeMutationCommandFactoryResult<
  OUT_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
> = TO_IsCompositeAssertionsMixin & {
  makeMutationCommand: MakeMutationCommandFunction<OUT_TO_TTP>;
  assembleComposite: (saveToMap?: boolean) => OUT_TO_TTP['VertexData']['value'];
};

export type TO_MakeMutationCommandFunctionFactory_2<
  IN_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
  OUT_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
> = (
  ...visitorArguments: Parameters<
    TraversalVisitor<string, IN_TO_TTP, OUT_TO_TTP>
  >
) => TO_MakeMutationCommandFactoryResult<OUT_TO_TTP>;

export type TO_MakeMutationCommandFunctionFactory = <
  IN_TO_TTP extends TreeTypeParameters<any, any>, // See [1]
  OUT_TO_TTP extends TreeTypeParameters<any, any>, // See [1]
>(
  input_0?: TO_MakeMutationCommandFunctionFactoryConfiguration<
    IN_TO_TTP,
    OUT_TO_TTP
  >,
) => TO_MakeMutationCommandFunctionFactory_2<IN_TO_TTP, OUT_TO_TTP>;

export const makeMutationCommandFactory: TO_MakeMutationCommandFunctionFactory =
  function TraversableObjectTree_makeMutationCommandFactory_0<
    IN_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
    OUT_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
  >(
    input_0?: TO_MakeMutationCommandFunctionFactoryConfiguration<
      IN_TO_TTP,
      OUT_TO_TTP
    >,
  ): TO_MakeMutationCommandFunctionFactory_2<IN_TO_TTP, OUT_TO_TTP> {
    const {
      isObject,
      isArray,
      assembleObject,
      assembleArray,
      assembledMap: assembledMapInput,
    } = {
      ...MAKE_MUTATION_COMMAND_FACTORY_CONFIGURATION_DEFAULT,
      ...input_0,
    };
    const assembledMap = assembledMapInput ?? new Map();

    return function TraversableObjectTree_makeMutationCommandFactory_1(
      ...visitorArguments: Parameters<
        TraversalVisitor<string, IN_TO_TTP, OUT_TO_TTP>
      >
    ): TO_MakeMutationCommandFactoryResult<OUT_TO_TTP> {
      const [vertex, options] = visitorArguments;
      const vertexData = vertex.getData();
      const { resolvedTree, vertexRef } = options;

      const isThisAnArray = isArray(vertexData);
      const isThisAnObject = isObject(vertexData);
      const isThisComposite = isThisAnArray || isThisAnObject;

      function TraversableObjectTree_getChildrenObjectPropertiesOf(
        vertexRef: CTTRef<Vertex<IN_TO_TTP | OUT_TO_TTP>>,
      ): OUT_TO_TTP['VertexData'][] {
        return (resolvedTree.getChildrenOf(vertexRef) ?? []).map((ch) =>
          ch.unref().getData(),
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

      function TraversableObjectTree_makeMutationCommand_2(
        input_2?: MakeMutationCommandFunctionInput<OUT_TO_TTP['VertexData']>,
      ): MakeMutationCommandFunctionResult<OUT_TO_TTP> {
        const inputOk = input_2 && typeof input_2 === 'object';
        const toDelete =
          inputOk &&
          Object.prototype.hasOwnProperty.call(input_2, 'delete') &&
          input_2?.delete === true;
        const hasRewrite =
          inputOk && Object.prototype.hasOwnProperty.call(input_2, 'rewrite');
        const hasRewriteValue =
          hasRewrite &&
          Object.prototype.hasOwnProperty.call(input_2.rewrite, 'value');
        const hasRewriteKey =
          hasRewrite &&
          Object.prototype.hasOwnProperty.call(input_2.rewrite, 'key');
        const rewriteKeyObject = !hasRewriteKey
          ? {}
          : {
              key: input_2?.rewrite?.key,
            };
        const rewriteValueObject = !hasRewriteValue
          ? {}
          : {
              value: input_2?.rewrite?.value,
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
        makeMutationCommand: TraversableObjectTree_makeMutationCommand_2,
      };
    };
  };

export const MAKE_MUTATION_COMMAND_FACTORY_CONFIGURATION_DEFAULT = {
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
  ): TraversableObjectProp<TraversableObjectPropKey, unknown>['value'] => {
    return processedChildren.map((ch) => ch.value);
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
