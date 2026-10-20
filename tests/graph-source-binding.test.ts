import { CTTRef } from '../src/core/CTTRef';
import type { AsyncTraversableTree } from '../src/core/AsyncTraversableTree';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import {
  bindGraphSource,
  bindTreeSource,
} from '../src/core/drivers/callbackBindings';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import type { TraversableGraph } from '../src/core/TraversableGraph';
import type { MakeVertexOptions } from '../src/core/TraversableTree';
import { Vertex } from '../src/core/Vertex';
import type { VertexResolutionContext } from '../src/core/ResolvedTree';
import { DepthFirstTraversal } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';

type InputTTP = TreeTypeParameters<string, string>;
type RewriteTTP = TreeTypeParameters<number, number>;

function rootRef() {
  return new CTTRef(
    new Vertex<InputTTP | RewriteTTP>({ $d: 'root', $c: ['child'] }),
  );
}

function childContext(
  parentVertexRef: CTTRef<Vertex<InputTTP | RewriteTTP>>,
): VertexResolutionContext<InputTTP | RewriteTTP> {
  return {
    depth: 1,
    parentVertex: parentVertexRef.unref(),
    parentVertexRef,
    hintIndex: 0,
    vertexHint: 'child',
  };
}

test('tree binding reuses the legacy facade and passes real tree options', () => {
  const treeContainer = new DepthFirstTraversal<InputTTP, RewriteTTP>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: null }),
      makeVertex: () => ({ vertexContent: null }),
    },
    saveNotMutatedResolvedTree: true,
  }).makeRunner().resolvedTreesContainer;
  const container = new ResolvedGraphsContainer({
    sourceMode: 'tree',
    saveOriginal: true,
    treeContainer,
  });
  const adapter = {
    makeRoot: () => ({ vertexContent: { $d: 'root', $c: ['child'] } }),
    makeVertex: (
      hint: string,
      options: MakeVertexOptions<InputTTP, RewriteTTP>,
    ) => {
      expect(options.resolvedTree).toBe(container.treeContainer!.resolvedTree);
      expect(
        options.resolvedTree.getParentOf(
          options.resolutionContext.parentVertexRef,
        ),
      ).toBeNull();
      return { vertexContent: { $d: hint, $c: [] } };
    },
  };
  const parent = rootRef();
  container.acceptRoot(parent, parent.getId());

  const result = bindTreeSource(adapter, container).makeVertex(
    childContext(parent),
  );

  expect(result).toEqual({ vertexContent: { $d: 'child', $c: [] } });
  expect(container.store).toBe(treeContainer.resolvedTree.getGraphStore());
  expect(container.resolvedGraph).toBe(
    treeContainer.resolvedTree.getResolvedGraph(),
  );

  const child = new CTTRef(
    new Vertex<InputTTP | RewriteTTP>({ $d: 'child', $c: [] }),
  );
  container.acceptVertex(child, child.getId(), [], childContext(parent));
  container.store.prepareSlots(parent, ['child']);
  container.acceptEdge(parent, 0, child);
  const savedParent = treeContainer.notMutatedResolvedTreeRefsMap!.get(parent)!;
  const savedChild = treeContainer.notMutatedResolvedTreeRefsMap!.get(child)!;

  expect(container.resolvedGraph.get(parent)?.slots).toEqual([
    { kind: 'linked', hint: 'child', childRef: child },
  ]);
  expect(
    treeContainer.notMutatedResolvedTree!.getChildrenOf(savedParent),
  ).toEqual([savedChild]);
});

test.each(['vertexId', 'dependsOn'] as const)(
  'tree binding rejects the %s graph metadata field',
  async (field) => {
    const metadata =
      field === 'vertexId' ? { vertexId: 'id' } : { dependsOn: [] };
    const adapter: AsyncTraversableTree<InputTTP> = {
      makeRoot: async () => ({ vertexContent: null, ...metadata }),
      makeVertex: async () => ({ vertexContent: null, ...metadata }),
    };
    const treeContainer = new DepthFirstTraversal<InputTTP>({
      traversableTree: {
        makeRoot: () => ({ vertexContent: null }),
        makeVertex: () => ({ vertexContent: null }),
      },
    }).makeRunner().resolvedTreesContainer;
    const container = new ResolvedGraphsContainer({
      sourceMode: 'tree',
      saveOriginal: false,
      treeContainer,
    });
    const source = bindTreeSource(adapter, container);

    await expect(source.makeRoot()).rejects.toThrow(/tree source.*metadata/i);
  },
);

test.each([
  ['makeRoot', 'vertexId'],
  ['makeRoot', 'dependsOn'],
  ['makeVertex', 'vertexId'],
  ['makeVertex', 'dependsOn'],
] as const)(
  'tree binding rejects synchronous %s %s metadata',
  (method, field) => {
    const metadata =
      field === 'vertexId' ? { vertexId: 'id' } : { dependsOn: [] };
    const treeContainer = new DepthFirstTraversal<InputTTP, RewriteTTP>({
      traversableTree: {
        makeRoot: () => ({ vertexContent: null }),
        makeVertex: () => ({ vertexContent: null }),
      },
    }).makeRunner().resolvedTreesContainer;
    const container = new ResolvedGraphsContainer<InputTTP, RewriteTTP>({
      sourceMode: 'tree',
      saveOriginal: false,
      treeContainer,
    });
    const source = bindTreeSource(
      {
        makeRoot: () => ({ vertexContent: null, ...metadata }),
        makeVertex: () => ({ vertexContent: null, ...metadata }),
      },
      container,
    );

    if (method === 'makeRoot') {
      expect(() => source.makeRoot()).toThrow(/tree source.*metadata/i);
    } else {
      const parent = rootRef();
      container.acceptRoot(parent, parent.getId());
      expect(() => source.makeVertex(childContext(parent))).toThrow(
        /tree source.*metadata/i,
      );
    }
  },
);

test('graph binding passes graph options and forwards hint identity', () => {
  const container = new ResolvedGraphsContainer<InputTTP, RewriteTTP>({
    sourceMode: 'graph',
    saveOriginal: true,
  });
  const parent = rootRef();
  container.acceptRoot(parent, 'root');
  const context = childContext(parent);
  const adapter: TraversableGraph<InputTTP, RewriteTTP> = {
    makeRoot: () => ({ vertexContent: null }),
    makeVertex: (hint, options) => {
      expect(hint).toBe('child');
      expect(options).toEqual({
        resolutionContext: context,
        resolvedGraph: container.resolvedGraph,
        notMutatedResolvedGraph: container.notMutatedResolvedGraph,
      });
      return { vertexContent: { $d: hint, $c: [] } };
    },
    getVertexIdFromHint: (hint) => ({ vertexId: `id:${hint}` }),
  };
  const source = bindGraphSource(adapter, container);

  expect(source.makeVertex(context)).toEqual({
    vertexContent: { $d: 'child', $c: [] },
  });
  expect(source.getVertexIdFromHint?.('child')).toEqual({
    vertexId: 'id:child',
  });
  expect(source.getVertexIdFromHint?.(1)).toEqual({ vertexId: 'id:1' });
});

test('graph binding rejects a tree-mode container', () => {
  const treeContainer = new DepthFirstTraversal<InputTTP>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: null }),
      makeVertex: () => ({ vertexContent: null }),
    },
  }).makeRunner().resolvedTreesContainer;
  const container = new ResolvedGraphsContainer({
    sourceMode: 'tree',
    saveOriginal: false,
    treeContainer,
  });

  expect(() =>
    bindGraphSource(
      {
        makeRoot: () => ({ vertexContent: null }),
        makeVertex: () => ({ vertexContent: null }),
      },
      container,
    ),
  ).toThrow(/graph source.*graph.*container/i);
});

test('tree binding rejects a graph-mode container', () => {
  const container = new ResolvedGraphsContainer<InputTTP>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  expect(() =>
    bindTreeSource(
      {
        makeRoot: () => ({ vertexContent: null }),
        makeVertex: () => ({ vertexContent: null }),
      },
      container,
    ),
  ).toThrow(/tree graph container/i);
});

test('tree binding leaves a throwing then accessor for sync diagnostics', () => {
  const treeContainer = new DepthFirstTraversal<InputTTP>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: null }),
      makeVertex: () => ({ vertexContent: null }),
    },
  }).makeRunner().resolvedTreesContainer;
  const container = new ResolvedGraphsContainer({
    sourceMode: 'tree',
    saveOriginal: false,
    treeContainer,
  });
  const result = Object.defineProperty(
    { vertexContent: null },
    'then',
    {
      get() {
        throw new Error('then getter');
      },
    },
  );
  const bound = bindTreeSource(
    {
      makeRoot: () => result,
      makeVertex: () => ({ vertexContent: null }),
    },
    container,
  );
  expect(bound.makeRoot()).toBe(result);
});
