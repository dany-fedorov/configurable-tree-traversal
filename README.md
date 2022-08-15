# Configurable Tree Traversal

Use your own data structure through a universal wrapper - `TraversableTree`

```typescript
/**
 * Paremetrize the tree with TreeTypeParameters.
 */
interface ThisTreeParameters {
  VertexData: string | null;
  VertexHint: string | null;
}

/**
 * Data structure is your own.
 */
const treeNodes = {
  F: ['B', 'G'],
  B: ['A', 'D'],
  D: ['C', 'E'],
  G: [null, 'I'],
  I: ['H', null],
} as Record<
  ThisTreeParameters['VertexData'],
  Array<ThisTreeParameters['VertexHint']>
  >;

/**
 * Provide a wrapper for underlying data structure.
 */
function makeVertexForTree(hint: ThisTreeParameters['VertexHint']) {
  return Vertex.makePlain<ThisTreeParameters>({
    data: hint,
    childrenHints: hint === null ? [] : tree2Nodes[h] || [],
  });
}

/**
 * `TraversableTree` allows to implement lazy evaluation for your tree data.
 */
const tree: TraversableTree<ThisTreeParameters> = {
  makeRoot() {
    return makeVertexForTree('F');
  },
  makeVertex(hint) {
    return makeVertexForTree(hint);
  },
};
```

Supply visitors for different orders of traversals

```typescript
const { rootVertex, resolvedTreeMap, vertexContextMap } =
  traverseDepthFirst<ThisTreeParameters>(
    tree,
    {
      /**
       * See also postOrderVisitor and inOrderVisitor.
       * Arguments are tree vertex + all the context.
       */
      preOrderVisitor: (
        vertex,
        {
          vertexContextMap,
          resolvedTreeMap,
          visitIndex,
          previousVisitedVertex,
          isLeafVertex,
          isRootVertex,
        },
      ) => {
        const data = Vertex.getData<ThisTreeParameters>(vertex);
        /**
         * ... Process this data ...
         */
        if (data === 'C') {
          /**
           * Can halt traversal from a visitor.
           */
          return {
            command: TraversalVisitorCommand.HALT_TRAVERSAL,
          };
        }
      },
    },
    {
      childrenOrder: ChildrenOrder.DEFAULT,
    },
  );
```
