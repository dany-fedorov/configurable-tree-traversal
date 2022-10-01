import { Vertex } from '../../../src/Vertex';
import type {
  TraversableTree,
  TreeTypeParameters,
  VertexContent,
  TraversalVisitor,
  TraversalVisitorOptions,
} from '../../../src/types';
import {
  DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG,
  DepthFirstTraversalConfig,
  DepthFirstVisitors,
  traverseDepthFirst,
} from '../../../src/traversals/traverse-depth-first';

export type TTP1 = TreeTypeParameters<string, string>;

export const tree1: TraversableTree<TTP1> = {
  makeRoot() {
    return Vertex.makeContent({
      data: '1',
      childrenHints: ['1', '2'],
    });
  },
  makeVertex(hint, { parentVertex }) {
    return Vertex.makeContent({
      data: [Vertex.getDataFromContent(parentVertex), hint].join('.'),
      childrenHints: Vertex.getDataFromContent(parentVertex).length > 3 ? [] : ['1', '2'],
    });
  },
};

export type Tree2TypeParameters = TreeTypeParameters<
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
  Vertex.makeContent<Tree2TypeParameters>({
    data: h,
    childrenHints: h === null ? [] : tree2Nodes[h] || [],
  });

/**
 * https://en.wikipedia.org/wiki/Tree_traversal#/media/File:Sorted_binary_tree_ALL_RGB.svg
 */
export const tree2: TraversableTree<Tree2TypeParameters> = {
  makeRoot() {
    return mkNodeForTree2('F');
  },
  makeVertex(hint /*{ parentVertex }*/) {
    return mkNodeForTree2(hint);
  },
};

export function testDepthFirstTree<
  TTP extends TreeTypeParameters,
>(
  tree: TraversableTree<TTP>,
  visitorKey: keyof DepthFirstVisitors<TTP>,
  config: Partial<DepthFirstTraversalConfig> = DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG,
  visitor?: TraversalVisitor<TTP>,
) {
  const visited: Array<{
    vertex: VertexContent<TTP>;
    options: Omit<
      TraversalVisitorOptions<TTP>,
      'resolvedTreeMap' | 'vertexContextMap'
    >;
  }> = [];
  const { rootVertex, resolvedTreeMap, vertexContextMap } =
    traverseDepthFirst<TTP>(
      tree,
      {
        [visitorKey]: (
          vertex: VertexContent<TTP>,
          options: TraversalVisitorOptions<TTP>,
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
