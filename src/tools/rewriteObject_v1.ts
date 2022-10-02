import type { TraversalVisitor } from '../core/TraversalVisitor';
import type { ObjectTTP_V1 } from './TraversableObjectTree_V1';
import {
  makeObjectRewriteCommand_v1,
  TraversableObjectTree_V1,
} from './TraversableObjectTree_V1';
import { traverseDepthFirst } from '../traversals/traverseDepthFirst';

export function rewriteObject_v1(
  obj: unknown,
  rewrite: (...args: Parameters<TraversalVisitor<ObjectTTP_V1>>) => {
    newValue?: unknown;
    delete?: boolean;
  },
): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  const tree = new TraversableObjectTree_V1(obj as unknown as object);
  const { resolvedTree } = traverseDepthFirst(tree, {
    postOrderVisitor: (v, options) => {
      const res = rewrite(v, options);
      return {
        commands: [
          makeObjectRewriteCommand_v1({
            vertexInput: v,
            options,
            ...(!Object.prototype.hasOwnProperty.call(res, 'newValue')
              ? {}
              : {
                  newValue: res.newValue,
                }),
            ...(res.delete === undefined
              ? {}
              : {
                  delete: res.delete,
                }),
          }),
        ],
      };
    },
  });
  const root = resolvedTree.getRoot();
  if (root !== null) {
    return root.unref().getData().value;
  }
  return null;
}
