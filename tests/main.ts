import { traverseDepthFirst } from '../src/traversals/traverseDepthFirst';
import type { Vertex } from '../src/core/Vertex';
import type { TraversableTreeParametersFromTraversableTree } from '../src/core/TraversableTreeParametersFromTraversableTree';
import { jsonStringifySafe } from '../src/utils/jsonStringifySafe';
import type { TraversalVisitorOptions } from '../src/core/TraversalVisitor';
import { TraversableObjectTree } from '../src/traversable-tree-implementations/TraversableObjectTree';
import { rewriteObject } from '../src/tools/rewriteObject';

/*const main_ = () => {
  const host = {
    a: 1,
    b: 2,
    c: [1, 2, 1, 3],
    d: { d1: { d2: 'heh' }, d11: { d22: { d33: { d44: 'heh-deep' } } } },
    e: 'fef',
    f: { f1: { f2: 'heh' } },
    g: [{ g1: 123, g11: { g22: [1, 2, 3, 4, 3, 2, 1] } }],
  };
  console.log(jsonStringifySafe(host, 8));
  const tree = new TraversableObjectTree({
    rootKey: Symbol.for('ROOT'),
    host,
  });
  type TreeTTP = TraversableTreeParametersFromTraversableTree<typeof tree>;
  const { resolvedTree } = traverseDepthFirst(tree, {
    postOrderVisitor: (
      vertex: Vertex<TreeTTP>,
      options: TraversalVisitorOptions<TreeTTP>,
    ) => {
      const depth =
        options.resolvedTree.get(options.vertexRef)?.getResolutionContext()
          ?.depth ?? 0;
      // console.log(depth, vertex.getData());
      const makeMutationCommand =
        TraversableObjectTree.makeMutationCommandFactory<
          TreeTTP,
          Partial<TreeTTP['VertexData']>
        >(vertex, options);
      // TraversableTreeParametersFromTraversableTree<typeof tree>,
      if (vertex.getData().value === 1) {
        return {
          commands: [
            makeMutationCommand({
              rewrite: { value: 1000 },
            }),
          ],
        };
      } else if (vertex.getData().value === 2) {
        return {
          commands: [
            makeMutationCommand({
              delete: true,
            }),
          ],
        };
      } else if (depth % 2 === 0 && typeof vertex.getData().key === 'string') {
        const newKey = [vertex.getData().key, depth].join('__');
        // console.log(depth, vertex.getData(), newKey);
        return {
          commands: [
            makeMutationCommand({
              rewrite: {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                key: newKey,
              },
            }),
          ],
        };
      } else {
        return {
          commands: [makeMutationCommand()],
        };
      }
    },
  });
  console.log(
    jsonStringifySafe(resolvedTree.getRoot()?.unref().getData().value, 8),
  );
};*/

const main = () => {
  const host = {
    a: 1,
    b: 2,
    c: [1, 2, 1, 3],
    d: { d1: { d2: 'heh' }, d11: { d22: { d33: { d44: 'heh-deep' } } } },
    e: 'fef',
    f: { f1: { f2: 'heh' } },
    g: [{ g1: 123, g11: { g22: [1, 2, 3, 4, 3, 2, 1] } }],
  };
  console.log(jsonStringifySafe(host, 8));
  const { result } = rewriteObject<string | number>(
    host,
    ({ key, value }, options) => {
      const depth =
        options.resolvedTree.get(options.vertexRef)?.getResolutionContext()
          ?.depth ?? 0;
      const p = options.resolvedTree.getPathTo(options.vertexRef, {
        noRoot: true,
      });
      console.log(p.map((ps) => ps.unref().getData().key));
      if (value === 2) {
        return {
          delete: true,
        };
      } else if (value === 1) {
        return {
          rewrite: { value: 1000 },
        };
      } else if (depth % 2 === 0 && typeof key === 'string') {
        const newKey = [key, depth].join('__');
        return {
          rewrite: {
            key: newKey,
          },
        };
      }
      return;
    },
  );
  console.log(jsonStringifySafe(result, 8));
};

// main_();
main();
