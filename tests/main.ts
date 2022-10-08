import {
  VisitParent,
  traverseDepthFirst,
} from '../src/traversals/traverseDepthFirst';
import { TraversableObjectTree } from '../src/traversable-tree-implementations/TraversableObjectTree';
import { jsonStringifySafe } from '../src/utils/jsonStringifySafe';
import { rewriteObject } from '../src/tools';
import { TraversalVisitorCommandName } from '../src/core';

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
        TraversableObjectTree.makeMutationCommandFactory<TreeTTP, TreeTTP>()(vertex, options);
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
}*/

/*const main = () => {
  const host = {
    a: 1,
    b: 2,
    c: [1, 2, 1, 3],
    d: { d1: { d2: 'heh' }, d11: { d22: { d33: { d44: 'heh-deep' } } } },
    e: 'fef',
    f: { f1: { f2: 'heh' } },
    g: [{ g1: 123, g11: { g22: [1, 2, 3, 4, 3, 2, 1] } }],
  };
  // console.log(jsonStringifySafe(host, 8));
  const { outputObject } = rewriteObject(host, {
    assembleCompositesBeforeRewrite: true,
    rewrite: ({ key, value }, options) => {
      const depth =
        options.resolvedTree.get(options.vertexRef)?.getResolutionContext()
          ?.depth ?? 0;
      const p = options.resolvedTree.getPathTo(options.vertexRef, {
        noRoot: true,
        // noSelf: true,
      });
      console.log(
        // p.map((ps) => ps.unref().getData().key),
        options.getPath({ noRoot: true }),
        // '=====>',
        // value,
        // '---->',
        // assembledComposite,
      );
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
  });
  console.log(jsonStringifySafe(outputObject, 8));
}*/

/*const main = () => {
  const host: KvasInMemoryJsonMapHost<JsonPrimitive> = {
    a: 1,
    b: 2,
    c: [1, 2, 1, 3],
    d: { d1: { d2: 'heh' }, d11: { d22: { d33: { d44: 'heh-deep' } } } },
    e: 'fef',
    f: { f1: { f2: 'heh' } },
    g: [{ g1: 123, g11: { g22: [1, 2, 3, 4, 3, 2, 1] } }],
  };
  console.log(jsonStringifySafe({ host__: host }));
  const { result } = rewriteObject<
    KvasInMemoryJsonMapHost<JsonPrimitive>,
    KvasInMemoryJsonKey,
    JsonPrimitive | KvasInMemoryJsonMapHost<JsonPrimitive>,
    KvasInMemoryJsonMap<JsonPrimitive>,
    keyof KvasInMemoryJsonMap<JsonPrimitive>,
    KvasInMemoryJsonMap<JsonPrimitive>
  >(host, ({ value }) => {
    if (typeof value === 'object' && value !== null) {
      return {
        rewrite: {
          value: new KvasInMemoryJsonMap({
            host: value,
          }),
        },
      };
    } else {
      return {};
    }
  });
  // console.log({ result });
  console.log(jsonStringifySafe({ result }, 2));
};*/

// const main = () => {
//   const inputObject = {
//     a: 1,
//     b: 2,
//     c: [1, 2, 1, 3],
//     d: { d1: { d2: 'heh' }, d11: { d22: { d33: { d44: 'heh-deep' } } } },
//     e: 'fef',
//     f: { f1: { f2: 'heh' } },
//     g: [{ g1: 123, g11: { g22: [1, 2, 3, 4, 3, 2, 1] } }],
//   };
//   // const inputObject = {
//   //   // a: [11, 12, 13, 14, 15],
//   //   // b: [21, 22, 23, 24, 25],
//   //   // c: [31, 32, 33, 34, 35],
//   //   d: 4,
//   //   e: 5,
//   //   f: 6,
//   //   g: 7,
//   //   h: 8,
//   //   i: 9,
//   //   j: 10,
//   //   k: 11,
//   // };
//   console.log(jsonStringifySafe(inputObject, 2));
//   const tree = new TraversableObjectTree({ inputObject });
//   traverseDepthFirst(
//     tree,
//     {
//       inOrderVisitor: (vertex, options) => {
//         //   postOrderVisitor: (vertex, options) => {
//         const p = options.resolvedTree.getPathTo(options.vertexRef, {
//           noRoot: true,
//         });
//         console.log(
//           // options.vertexRef,
//           // '------------------------------\n',
//           // options.vertexRef.getId(),
//           p.map((ps) => ps.unref().getData().key),
//           typeof vertex.getData().value === 'object'
//             ? 'OBJECT'
//             : vertex.getData().value,
//           // '\n<---------\n',
//           // options.previousVisitedVertexRef === null
//           //   ? 'NONE'
//           //   : options.previousVisitedVertexRef.getId(),
//           // options.previousVisitedVertexRef === null
//           //   ? 'NONE'
//           //   : options.resolvedTree
//           //       .getPathTo(options.previousVisitedVertexRef, {
//           //         noRoot: true,
//           //       })
//           //       .map((ps) => ps.unref().getData().key),
//           // typeof options.previousVisitedVertexRef?.unref().getData().value ===
//           //   'object'
//           //   ? 'OBJECT'
//           //   : options.previousVisitedVertexRef?.unref().getData().value,
//         );
//       },
//     },
//     {
//       inOrderTraversalConfig: {
//         visitParentAfter: [4, 3],
//         // visitParentAfter: {
//         //   // ranges: [
//         //   //   // [1, 3],
//         //   //   // [-11, -9],
//         //   // ],
//         // },
//       },
//     },
//   );
// };

const main = () => {
  const obj = {
    a: 1,
    b: 2,
    c: 3,
  };
  const tree = new TraversableObjectTree({
    inputObject: obj,
  });
  const res = traverseDepthFirst(tree, {
    preOrderVisitor(vertex, { isTreeRoot }) {
      console.log(
        'PRE'.padEnd(4),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        (isTreeRoot ? 'ROOT' : vertex.getData().key).padEnd(8),
        jsonStringifySafe(vertex.getData().value),
      );
    },
    inOrderVisitor(vertex, { isTreeRoot }) {
      console.log(
        'IN'.padEnd(4),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        (isTreeRoot ? 'ROOT' : vertex.getData().key).padEnd(8),
        jsonStringifySafe(vertex.getData().value),
      );
    },
    postOrderVisitor(vertex, { isTreeRoot }) {
      console.log(
        'POST'.padEnd(4),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        (isTreeRoot ? 'ROOT' : vertex.getData().key).padEnd(8),
        jsonStringifySafe(vertex.getData().value),
      );
      if (vertex.getData().key === 'b') {
        return {
          commands: [
            {
              commandName: TraversalVisitorCommandName.HALT_TRAVERSAL,
            },
          ],
        };
      }
      return {};
    },
  });
  // console.log(jsonStringifySafe(resolvedTree.getRoot()?.unref().getData()));
  // console.log(haltedOnContext);
  console.log('----------');
  const res1 = res.continue(
    null,
    {
      preOrderVisitor(vertex, { isTreeRoot, isTraversalRoot }) {
        console.log(
          'PRE'.padEnd(4),
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          (isTreeRoot ? 'ROOT' : vertex.getData().key).padEnd(8),
          jsonStringifySafe(vertex.getData().value),
        );
      },
      inOrderVisitor(vertex, { isTreeRoot }) {
        console.log(
          'IN'.padEnd(4),
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          (isTreeRoot ? 'ROOT' : vertex.getData().key).padEnd(8),
          jsonStringifySafe(vertex.getData().value),
        );
      },
      postOrderVisitor(vertex, { isTreeRoot }) {
        console.log(
          'POST'.padEnd(4),
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          (isTreeRoot ? 'ROOT' : vertex.getData().key).padEnd(8),
          jsonStringifySafe(vertex.getData().value),
        );
      },
    },
    /*{
      resolvedTreesContainer: res.getResolvedTreesContainer(),
      traversalState: res.getTraversalState(),
      rootVertexRef: res.getHaltedOnVertexRef(),
      lastVisitedBy: res.getHaltedOnVisitorOrderKey(),
    }*/
  );
};

// main_();
main();
