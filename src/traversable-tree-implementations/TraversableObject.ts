import {
  AbstractTraversableTree,
  MakeVertexOptions,
} from '../core/TraversableTree';
import type { TreeTypeParameters } from '../core/TreeTypeParameters';
import type { VertexContent } from '../core/Vertex';
import type {
  MakeMutationCommandFunction,
  MakeMutationCommandFunctionFactory,
  MakeMutationCommandFunctionInput,
  MakeMutationCommandFunctionResult,
} from '../core/MakeMutationCommandFunctionFactory';
import {
  TraversalVisitor,
  TraversalVisitorCommandName,
} from '../core/TraversalVisitor';

export type TraversableObjectPropKey = number | string | symbol;

export type TraversableObjectProp<K extends TraversableObjectPropKey, PV> = {
  key: K;
  value: TraversableObject<K, PV> | PV;
};

export type TraversableObjectTTP<
  K extends TraversableObjectPropKey,
  V,
> = TreeTypeParameters<
  TraversableObjectProp<K, V>,
  TraversableObjectProp<K, V>
>;

export type TraversableObject<
  K extends TraversableObjectPropKey,
  PV,
> = K extends number
  ? Array<TraversableObject<K, PV> | PV>
  : {
      [KK in K]: TraversableObject<K, PV> | PV;
    };

export type TraversableObjectTreeInstanceConfigInput<
  K extends TraversableObjectPropKey,
  PV,
> = {
  host: TraversableObject<K, PV>;
  rootKey: K;
  getHintsForValue?: (
    value: TraversableObject<K, PV> | PV,
  ) => TraversableObjectTTP<K, PV>['VertexHint'][];
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

export function getHintsForValueDefault<K extends TraversableObjectPropKey, PV>(
  value: TraversableObject<K, PV> | PV,
): TraversableObjectTTP<K, PV>['VertexHint'][] {
  if (PRIMITIVE_TYPEOF_TYPES.includes(typeof value)) {
    return [];
  }
  if (Array.isArray(value)) {
    return (value as Array<TraversableObject<K, PV> | PV>).map((v, i) => {
      return {
        key: i as K,
        value: v,
      };
    });
  } else {
    return Object.entries(value as TraversableObject<K, PV>).map((v) => {
      return {
        key: v[0] as K,
        value: v[1] as TraversableObject<K, PV> | PV,
      };
    });
  }
}

const makeMutationCommandFactory: MakeMutationCommandFunctionFactory =
  function TraversableObjectTree_makeMutationCommandFactory<
    TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>,
    RW_V extends TO_TTP['VertexData'],
  >(
    ...visitorArguments: Parameters<TraversalVisitor<TO_TTP>>
  ): MakeMutationCommandFunction<TO_TTP, RW_V> {
    return function TraversableObjectTree_makeMutationCommand(
      input?: MakeMutationCommandFunctionInput<RW_V>,
    ): MakeMutationCommandFunctionResult<TO_TTP> {
      const [vertex, options] = visitorArguments;
      const vertexData = vertex.getData();
      const { resolvedTree, vertexRef } = options;
      const inputOk = input && typeof input === 'object';
      const toDelete =
        inputOk &&
        Object.prototype.hasOwnProperty.call(input, 'delete') &&
        input?.delete === true;
      const hasRewrite =
        inputOk && Object.prototype.hasOwnProperty.call(input, 'rewrite');
      const hasRewriteValue =
        hasRewrite &&
        Object.prototype.hasOwnProperty.call(input.rewrite, 'value');
      const hasRewriteKey =
        hasRewrite &&
        Object.prototype.hasOwnProperty.call(input.rewrite, 'key');
      const rewriteKeyObject = !hasRewriteKey
        ? {}
        : {
            key: input?.rewrite?.key,
          };
      const rewriteValueObject = !hasRewriteValue
        ? {}
        : {
            value: input?.rewrite?.value,
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
      } else if (PRIMITIVE_TYPEOF_TYPES.includes(typeof vertexData.value)) {
        return {
          commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
          commandArguments: {
            newData: {
              ...vertexData,
              ...rewriteKeyObject,
            },
          },
        };
      } else if (Array.isArray(vertexData.value)) {
        return {
          commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
          commandArguments: {
            newData: {
              ...vertexData,
              ...rewriteKeyObject,
              value: (resolvedTree.getChildrenOf(vertexRef) ?? []).map(
                (ch) => ch.unref().getData().value,
              ),
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
              value: Object.fromEntries(
                (resolvedTree.getChildrenOf(vertexRef) ?? []).map((ch) => [
                  ch.unref().getData().key,
                  ch.unref().getData().value,
                ]),
              ),
            },
          },
        };
      }
    };
  };

export class TraversableObjectTree<
  K extends TraversableObjectPropKey = TraversableObjectPropKey,
  PV = unknown, // Primitive Value
> extends AbstractTraversableTree<TraversableObjectTTP<K, PV>> {
  private readonly instanceConfig: Required<
    TraversableObjectTreeInstanceConfigInput<K, PV>
  >;

  constructor(instanceConfig: TraversableObjectTreeInstanceConfigInput<K, PV>) {
    super();
    this.instanceConfig = {
      ...instanceConfig,
      getHintsForValue:
        instanceConfig.getHintsForValue ?? getHintsForValueDefault,
    };
  }

  static makeMutationCommandFactory = makeMutationCommandFactory;

  makeRoot(): VertexContent<TraversableObjectTTP<K, PV>> | null {
    const { rootKey, host, getHintsForValue } = this.instanceConfig;
    return {
      $d: { key: rootKey, value: host },
      $c: getHintsForValue(host),
    };
  }

  makeVertex(
    vertexHint: TraversableObjectTTP<K, PV>['VertexHint'],
    _options: MakeVertexOptions<TraversableObjectTTP<K, PV>>,
  ): VertexContent<TraversableObjectTTP<K, PV>> | null {
    const { getHintsForValue } = this.instanceConfig;
    const hints = getHintsForValue(vertexHint.value);
    return {
      $d: vertexHint,
      $c: hints,
    };
  }
}
