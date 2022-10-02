import { traverseDepthFirst } from './traversals/traverseDepthFirst';
import { AbstractTraversableTree } from './core/TraversableTree';
import type { TreeTypeParameters } from './core/TreeTypeParameters';
import type { VertexContent } from './core/Vertex';
import { jsonStringifySafe } from './utils/jsonStringifySafe';
import { TraversalVisitorCommandName } from './core/TraversalVisitor';

type ObjectProp = {
  key: number | string | symbol;
  value: unknown;
  type: 'object' | 'array' | 'primitive';
};

type ObjectTTP = TreeTypeParameters<ObjectProp, ObjectProp>;

function getType(o: unknown): ObjectProp['type'] {
  return typeof o === 'object' && o !== null
    ? Array.isArray(o)
      ? 'array'
      : 'object'
    : 'primitive';
}

function getHintsFor(o: unknown): ObjectTTP['VertexHint'][] {
  // console.log('getHintsFor', typeof o);
  if ((typeof o !== 'object' && typeof o !== 'function') || o === null) {
    return [];
  }
  return Object.entries(o as object).map((e) => ({
    key: e[0],
    value: e[1],
    type: getType(e[1]),
  }));
}

class TraversableObjectTree extends AbstractTraversableTree<ObjectTTP> {
  readonly host: object;
  readonly rootSym: symbol;

  constructor(host: object) {
    super();
    this.rootSym = Symbol('ROOT');
    this.host = host;
  }

  makeRoot(): VertexContent<ObjectTTP> | null {
    return {
      $d: { key: this.rootSym, value: this.host, type: getType(this.host) },
      $c: getHintsFor(this.host),
    };
  }

  makeVertex(
    vertexHint: ObjectTTP['VertexHint'],
    // options: MakeVertexOptions<ObjectTTP>,
  ): VertexContent<ObjectTTP> | null {
    const hints = getHintsFor(vertexHint.value);
    // console.log('makeVertex', vertexHint.value, hints);
    return {
      $d: vertexHint,
      $c: hints,
    };
  }
}

const main = () => {
  const host = {
    a: 1,
    b: 2,
    c: [1, 2],
    d: { d1: { d2: 'heh' } },
  };
  console.log(jsonStringifySafe(host, 2));
  const tree = new TraversableObjectTree(host);
  const { resolvedTree } = traverseDepthFirst(tree, {
    // preOrderVisitor: (v, options) => {
    //   // const depth = options.resolvedTree.getResolutionContextOf(
    //   //   options.vertexRef,
    //   // )?.depth;
    //   // console.log(depth, 'preOrderVisitor', v.getData().key, v.getData().value);
    // },
    postOrderVisitor: (v, options) => {
      const depth = options.isRoot
        ? 0
        : options.resolvedTree.getResolutionContextOf(options.vertexRef)?.depth;
      console.log(
        depth,
        'postOrderVisitor',
        v.getData().key,
        v.getData().value,
      );
      const key = v.getData().key;
      const val = v.getData().value;
      const type = v.getData().type;
      if (typeof val === 'number') {
        return {
          commands: [
            {
              commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
              commandArguments: {
                newData: { key, value: val + 1000, type },
              },
            },
          ],
        };
      } else if (typeof val === 'string') {
        return {
          commands: [
            {
              commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
              commandArguments: {
                newData: { key, value: '+++' + val + '+++', type },
              },
            },
          ],
        };
      } else if (type === 'object') {
        return {
          commands: [
            {
              commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
              commandArguments: {
                newData: {
                  key,
                  type,
                  value: Object.fromEntries(
                    (
                      options.resolvedTree.getChildrenOf(options.vertexRef) ??
                      []
                    ).map((ch) => [
                      ch.unref().getData().key,
                      ch.unref().getData().value,
                    ]),
                  ),
                },
              },
            },
          ],
        };
      } else if (type === 'array') {
        return {
          commands: [
            {
              commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
              commandArguments: {
                newData: {
                  key,
                  type,
                  value: (
                    options.resolvedTree.getChildrenOf(options.vertexRef) ?? []
                  ).map((ch) => ch.unref().getData().value),
                },
              },
            },
          ],
        };
      }
      return;
    },
  });
  const root = resolvedTree.getRoot();
  if (root !== null) {
    console.log(root.unref().getData().value);
    // console.log(resolvedTree.get(root));
  }
  traverseDepthFirst(resolvedTree, {
    preOrderVisitor: (v) => {
      console.log(
        'preOrderVisitor--',
        jsonStringifySafe(v.getData().unref().getData()),
      );
    },
  });
};

main();
