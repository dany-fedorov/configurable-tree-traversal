import { Vertex } from '../../../src/classes';
import type {
  ITraversableTree,
  ITreeTypeParameters,
  IVertex,
  TraversalVisitor,
  TraversalVisitorOptions,
} from '../../../src/types';
import {
  DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG,
  DepthFirstTraversalConfig,
  DepthFirstVisitors,
  traverseDepthFirst,
} from '../../../src/traversals/traverse-depth-first';

export type TreeTypeParameters1 = ITreeTypeParameters<string, string>;

export const tree1: ITraversableTree<TreeTypeParameters1> = {
  makeRoot() {
    return Vertex.makePlain({
      data: '1',
      childrenHints: ['1', '2'],
    });
  },
  makeVertex(hint, { parentVertex }) {
    return Vertex.makePlain({
      data: [Vertex.getData(parentVertex), hint].join('.'),
      childrenHints: Vertex.getData(parentVertex).length > 3 ? [] : ['1', '2'],
    });
  },
};

export type Tree2TypeParameters = ITreeTypeParameters<
  string | null,
  string | null
>;

const tree2Nodes: Record<string, (string | null)[]> = {
  F: ['B', 'G'],
  B: ['A', 'D'],
  D: ['C', 'E'],
  G: [null, 'I'],
  I: ['H', null],
};

const mkNodeForTree2 = (h: string | null) =>
  Vertex.makePlain<Tree2TypeParameters>({
    data: h,
    childrenHints: h === null ? [] : tree2Nodes[h] || [],
  });

/**
 * https://en.wikipedia.org/wiki/Tree_traversal#/media/File:Sorted_binary_tree_ALL_RGB.svg
 */
export const tree2: ITraversableTree<Tree2TypeParameters> = {
  makeRoot() {
    return mkNodeForTree2('F');
  },
  makeVertex(hint /*{ parentVertex }*/) {
    return mkNodeForTree2(hint);
  },
};

export function testDepthFirstTree<
  TreeTypeParameters extends ITreeTypeParameters,
>(
  tree: ITraversableTree<TreeTypeParameters>,
  visitorKey: keyof DepthFirstVisitors<TreeTypeParameters>,
  config: Partial<DepthFirstTraversalConfig> = DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG,
  visitor?: TraversalVisitor<TreeTypeParameters>,
) {
  const visited: Array<{
    vertex: IVertex<TreeTypeParameters>;
    options: Omit<
      TraversalVisitorOptions<TreeTypeParameters>,
      'resolvedTreeMap' | 'vertexContextMap'
    >;
  }> = [];
  const { rootVertex, resolvedTreeMap, vertexContextMap } =
    traverseDepthFirst<TreeTypeParameters>(
      tree,
      {
        [visitorKey]: (
          vertex: IVertex<TreeTypeParameters>,
          options: TraversalVisitorOptions<TreeTypeParameters>,
        ) => {
          visited.push({
            vertex,
            options: {
              visitIndex: options.visitIndex,
              isLeafVertex: options.isLeafVertex,
              isRootVertex: options.isRootVertex,
              previousVisitedVertex: options.previousVisitedVertex,
            },
          });
          return visitor?.(vertex, options);
        },
      },
      config,
    );
  return {
    visited,
    visitedData: visited.map((v) => v.vertex.$d),
    rootVertex,
    resolvedTreeMap,
    vertexContextMap,
  };
}
