import { jsonStringifySafe } from '../src/utils/jsonStringifySafe';
import { rewriteObject_v1 } from '../src/tools/rewriteObject_v1';
// import {
//   makeRewriteCommand_v1,
//   TraversableObjectTree_V1,
// } from '../src/tools/TraversableObjectTree_V1';
// import { traverseDepthFirst } from '../src/traversals/traverseDepthFirst';

/*const main = () => {
  const host = {
    a: 1,
    b: 2,
    c: [1, 2],
    d: { d1: { d2: 'heh' } },
  };
  console.log(jsonStringifySafe(host, 2));
  const tree = new TraversableObjectTree_V1(host);
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
      const val = v.getData().value;
      if (typeof val === 'number') {
        return {
          commands: [
            makeRewriteCommand_v1({
              vertexInput: v,
              options,
              newValue: val + 1000,
            }),
          ],
        };
      } else if (typeof val === 'string') {
        return {
          commands: [
            makeRewriteCommand_v1({
              vertexInput: v,
              options,
              newValue: '+++' + val + '+++',
            }),
          ],
        };
      } else {
        return {
          commands: [
            makeRewriteCommand_v1({
              vertexInput: v,
              options,
            }),
          ],
        };
      }
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
};*/

const _main = () => {
  const host = {
    a: 1,
    b: 2,
    c: [1, 2],
    d: { d1: { d2: 'heh' } },
    e: 'fef',
  };
  console.log(jsonStringifySafe({ host1: host }));
  const newHost = rewriteObject_v1(host, (v) => {
    const val = v.getData().value;
    if (v.getData().key === 'e' || v.getData().key === 'd1') {
      return {
        delete: true,
      };
    } else if (typeof val === 'number') {
      return {
        newValue: val + 1000,
      };
    } else if (typeof val === 'string') {
      return {
        newValue: '+++' + val + '+++',
      };
    } else {
      return {};
    }
  });
  console.log(jsonStringifySafe({ host2: newHost }));
};
_main();
