import {
  AbstractTraversableTree,
  MakeVertexOptions,
} from '../core/TraversableTree';
import type { TreeTypeParameters } from '../core/TreeTypeParameters';
import type { VertexContent } from '../core/Vertex';
import type {
  MakeMutationCommandFunction,
  MakeMutationCommandFunctionInput,
  MakeMutationCommandFunctionResult,
} from '../core/MakeMutationCommandFunctionFactory';
import {
  TraversalVisitor,
  TraversalVisitorCommandName,
} from '../core/TraversalVisitor';
import type { CTTRef } from '../core';
import type { Vertex } from '../core/Vertex';

export type TraversableObjectPropKey = number | string | symbol;

export type TraversableObjectProp_V1<K extends TraversableObjectPropKey, PV> = {
  key: K;
  value: TraversableObject<K, PV> | PV;
};

export type TraversableObjectTTP_V1<
  K extends TraversableObjectPropKey,
  V,
> = TreeTypeParameters<
  TraversableObjectProp_V1<K, V>,
  TraversableObjectProp_V1<K, V>
>;

export type TraversableObjectProp<K extends TraversableObjectPropKey, V> = {
  key: K;
  value: V;
};

export type TraversableObjectTTP<
  K extends TraversableObjectPropKey,
  V,
> = TreeTypeParameters<
  TraversableObjectProp<K, V>,
  TraversableObjectProp<K, V>
>;

export type TraversableObject<K extends TraversableObjectPropKey, PV> =
  | Array<TraversableObject<K, PV> | PV>
  | {
      [KK in K]: TraversableObject<K, PV> | PV;
    };

export type TraversableObjectTreeInstanceConfigInput<
  In,
  K extends TraversableObjectPropKey,
  V,
> = {
  inputObject: In;
  getChildrenOfProperty?: (
    prop: TraversableObjectProp<K, V>,
  ) => TraversableObjectTTP<K, V>['VertexHint'][];
  getRootPropertyFromInputObject?: (
    inputObj: In,
  ) => TraversableObjectProp<K, V>;
};

const PRIMITIVE_TYPEOF_TYPES = [
  'null',
  'undefined',
  'symbol',
  'string',
  'number',
  'boolean',
  'bigint',
];

function getChildrenOfPropertyDefault<K extends TraversableObjectPropKey, V>(
  prop: TraversableObjectProp<K, V>,
): TraversableObjectTTP<K, V>['VertexHint'][] {
  const { value } = prop;
  if (PRIMITIVE_TYPEOF_TYPES.includes(typeof value)) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((v, i) => {
      return {
        key: i as K,
        value: v,
      };
    });
  } else {
    return Object.entries(value).map((v) => {
      return {
        key: v[0] as K,
        value: v[1] as V,
      };
    });
  }
}

export const __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__ =
  '__TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__';

function getRootPropertyFromInputObjectDefault<
  In,
  K extends TraversableObjectPropKey,
  V,
>(
  rootKey?: K,
): Required<
  TraversableObjectTreeInstanceConfigInput<In, K, V>
>['getRootPropertyFromInputObject'] {
  return function getRootPropertyFromInputObjectDefault_implementation(
    inputObject: In,
  ) {
    return {
      key: (rootKey ?? __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__) as K,
      value: inputObject as unknown as V,
    };
  };
}

export type TO_MakeMutationCommandFunctionFactoryConfiguration<
  IN_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
  OUT_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
> = {
  isArray?: (data: IN_TO_TTP['VertexData']) => boolean;
  isObject?: (data: IN_TO_TTP['VertexData']) => boolean;
  assembleArray?: (
    children: OUT_TO_TTP['VertexData'][],
  ) => OUT_TO_TTP['VertexData']['value'];
  assembleObject?: (
    children: OUT_TO_TTP['VertexData'][],
  ) => OUT_TO_TTP['VertexData']['value'];
  assembledMap?: Map<
    CTTRef<Vertex<IN_TO_TTP | OUT_TO_TTP>>,
    OUT_TO_TTP['VertexData']['value']
  >;
};

export type TO_MakeMutationCommandFactoryResult<
  OUT_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
> = {
  makeMutationCommand: MakeMutationCommandFunction<OUT_TO_TTP>;
  isComposite: () => boolean;
  assembleComposite: (saveToMap?: boolean) => OUT_TO_TTP['VertexData']['value'];
};

export type TO_MakeMutationCommandFunctionFactory_2<
  IN_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
  OUT_TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
> = (
  ...visitorArguments: Parameters<TraversalVisitor<IN_TO_TTP, OUT_TO_TTP>>
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

const MAKE_MUTATION_COMMAND_FACTORY_CONFIGURATION_DEFAULT = {
  isArray: (
    d: TraversableObjectProp<TraversableObjectPropKey, unknown>,
  ): boolean => Array.isArray(d.value),
  isObject: (
    d: TraversableObjectProp<TraversableObjectPropKey, unknown>,
  ): boolean =>
    Boolean(d.value && typeof d.value === 'object' && !Array.isArray(d.value)),
  assembleArray: (
    children: TraversableObjectProp<TraversableObjectPropKey, unknown>[],
  ): TraversableObjectProp<TraversableObjectPropKey, unknown>['value'] => {
    return children.map((ch) => ch.value);
  },
  assembleObject: (
    children: TraversableObjectProp<TraversableObjectPropKey, unknown>[],
  ): TraversableObjectProp<TraversableObjectPropKey, unknown>['value'] => {
    return Object.fromEntries(children.map((ch) => [ch.key, ch.value]));
  },
};

const makeMutationCommandFactory: TO_MakeMutationCommandFunctionFactory =
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
      ...visitorArguments: Parameters<TraversalVisitor<IN_TO_TTP, OUT_TO_TTP>>
    ): TO_MakeMutationCommandFactoryResult<OUT_TO_TTP> {
      const [vertex, options] = visitorArguments;
      const vertexData = vertex.getData();
      const { resolvedTree, vertexRef } = options;

      function TraversableObjectTree_isComposite(): boolean {
        return isObject(vertexData) || isArray(vertexData);
      }

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
        if (isArray(vertexData)) {
          const res = assembleArray(
            TraversableObjectTree_getChildrenObjectPropertiesOf(vertexRef),
          );
          if (saveToMap) {
            assembledMap.set(vertexRef, res);
          }
          return res;
        } else if (isObject(vertexData)) {
          const res = assembleObject(
            TraversableObjectTree_getChildrenObjectPropertiesOf(vertexRef),
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
        // console.log({
        //   vertexData,
        //   toDelete,
        //   hasRewriteValue,
        //   isArray: isArray(vertexData),
        //   isObject: isObject(vertexData),
        // });
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
        } else if (TraversableObjectTree_isComposite()) {
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
        isComposite: TraversableObjectTree_isComposite,
        assembleComposite: TraversableObjectTree_assembleComposite,
        makeMutationCommand: TraversableObjectTree_makeMutationCommand_2,
      };
    };
  };

export class TraversableObjectTree<
  In = TraversableObject<TraversableObjectPropKey, unknown>,
  InK extends TraversableObjectPropKey = TraversableObjectPropKey,
  InV = TraversableObject<TraversableObjectPropKey, unknown> | unknown,
  OutK extends TraversableObjectPropKey = InK,
  OutV = InV,
> extends AbstractTraversableTree<
  TraversableObjectTTP<InK, InV>,
  TraversableObjectTTP<OutK, OutV>
> {
  private readonly instanceConfig: Required<
    TraversableObjectTreeInstanceConfigInput<In, InK, InV>
  >;

  static getChildrenOfPropertyDefault = getChildrenOfPropertyDefault;
  static getRootPropertyFromInputObjectDefault =
    getRootPropertyFromInputObjectDefault;

  constructor(
    instanceConfig: TraversableObjectTreeInstanceConfigInput<In, InK, InV>,
  ) {
    super();
    this.instanceConfig = {
      ...instanceConfig,
      getChildrenOfProperty:
        instanceConfig.getChildrenOfProperty ??
        TraversableObjectTree.getChildrenOfPropertyDefault,
      getRootPropertyFromInputObject:
        instanceConfig.getRootPropertyFromInputObject ??
        TraversableObjectTree.getRootPropertyFromInputObjectDefault(),
    };
  }

  static makeMutationCommandFactory = makeMutationCommandFactory;

  makeRoot(): VertexContent<TraversableObjectTTP<InK, InV>> | null {
    const {
      inputObject,
      getChildrenOfProperty,
      getRootPropertyFromInputObject,
    } = this.instanceConfig;
    const rootProp = getRootPropertyFromInputObject(inputObject);
    return {
      $d: rootProp,
      $c: getChildrenOfProperty(rootProp),
    };
  }

  makeVertex(
    vertexHint: TraversableObjectTTP<InK, InV>['VertexHint'],
    _options: MakeVertexOptions<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >,
  ): VertexContent<TraversableObjectTTP<InK, InV>> | null {
    const { getChildrenOfProperty } = this.instanceConfig;
    const hints = getChildrenOfProperty(vertexHint);
    return {
      $d: vertexHint,
      $c: hints,
    };
  }
}
