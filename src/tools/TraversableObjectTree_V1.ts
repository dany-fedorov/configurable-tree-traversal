import { AbstractTraversableTree } from '../core/TraversableTree';
import type { TreeTypeParameters } from '../core/TreeTypeParameters';
import type { Vertex, VertexContent } from '../core/Vertex';
import type {
  TraversalVisitorCommand,
  TraversalVisitorOptions,
} from '../core/TraversalVisitor';
import { TraversalVisitorCommandName } from '../core/TraversalVisitor';

type ObjectProp_V1 = {
  key: number | string | symbol;
  value: unknown;
  type: 'object' | 'array' | 'primitive';
};

export type ObjectTTP_V1 = TreeTypeParameters<ObjectProp_V1, ObjectProp_V1>;

function getType(o: unknown): ObjectProp_V1['type'] {
  return typeof o === 'object' && o !== null
    ? Array.isArray(o)
      ? 'array'
      : 'object'
    : 'primitive';
}

function getHintsFor(o: unknown): ObjectTTP_V1['VertexHint'][] {
  if ((typeof o !== 'object' && typeof o !== 'function') || o === null) {
    return [];
  }
  return Object.entries(o as object).map((e) => ({
    key: e[0],
    value: e[1],
    type: getType(e[1]),
  }));
}

export type MakeRewriteCommandInput_V1<TTP extends TreeTypeParameters> = {
  vertexInput: Vertex<TTP>;
  options: TraversalVisitorOptions<TTP>;
  newValue?: unknown;
  delete?: boolean;
};

export function makeObjectRewriteCommand_v1<
  TTP extends ObjectTTP_V1 = ObjectTTP_V1,
>(input: MakeRewriteCommandInput_V1<TTP>): TraversalVisitorCommand<TTP> {
  const type = input.vertexInput.getData().type;
  if (
    Object.prototype.hasOwnProperty.call(input, 'delete') &&
    input.delete === true
  ) {
    return {
      commandName: TraversalVisitorCommandName.DELETE_V1,
    };
  } else if (Object.prototype.hasOwnProperty.call(input, 'newValue')) {
    return {
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: {
        newData: {
          ...input.vertexInput.getData(),
          type: getType(input.newValue),
          value: input.newValue,
        },
      },
    };
  } else if (type === 'object') {
    return {
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: {
        newData: {
          ...input.vertexInput.getData(),
          value: Object.fromEntries(
            (
              input.options.resolvedTree.getChildrenOf(
                input.options.vertexRef,
              ) ?? []
            ).map((ch) => [
              ch.unref().getData().key,
              ch.unref().getData().value,
            ]),
          ),
        },
      },
    };
  } else if (type === 'array') {
    return {
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: {
        newData: {
          ...input.vertexInput.getData(),
          value: (
            input.options.resolvedTree.getChildrenOf(input.options.vertexRef) ??
            []
          ).map((ch) => ch.unref().getData().value),
        },
      },
    };
  } else {
    return {
      commandName: TraversalVisitorCommandName.NOOP,
    };
  }
}

export class TraversableObjectTree_V1 extends AbstractTraversableTree<ObjectTTP_V1> {
  readonly host: object;
  readonly rootSym: symbol;

  constructor(host: object) {
    super();
    this.rootSym = Symbol('ROOT');
    this.host = host;
  }

  makeRoot(): VertexContent<ObjectTTP_V1> | null {
    return {
      $d: { key: this.rootSym, value: this.host, type: getType(this.host) },
      $c: getHintsFor(this.host),
    };
  }

  makeVertex(
    vertexHint: ObjectTTP_V1['VertexHint'],
  ): VertexContent<ObjectTTP_V1> | null {
    const hints = getHintsFor(vertexHint.value);
    return {
      $d: vertexHint,
      $c: hints,
    };
  }
}
