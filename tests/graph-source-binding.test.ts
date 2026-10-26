import { CTTRef } from '../src/core/CTTRef';
import type { AsyncTreeSource } from '../src/core/AsyncTraversableTree';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import {
  bindGraphSource,
  bindTreeSource,
} from '../src/core/drivers/callbackBindings';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import type { DagDiscoverySource } from '../src/core/TraversableGraph';
import type { TreeChildResolutionContext } from '../src/core/TraversableTree';
import { Vertex } from '../src/core/Vertex';
import type { VertexResolutionContext } from '../src/core/ResolvedTree';
import { DepthFirstTreeTraversal } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';

type InputTTP = VertexTypes<string, string>;
type RewriteTTP = VertexTypes<number, number>;

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
  const treeContainer = new DepthFirstTreeTraversal<InputTTP, RewriteTTP>({
    traversableTree: {
      resolveRoot: () => ({ vertexContent: null }),
      resolveChild: () => ({ vertexContent: null }),
    },
    saveNotMutatedResolvedTree: true,
  }).createRunner().resolvedTreesContainer;
  const container = new ResolvedGraphsContainer({
    sourceMode: 'tree',
    saveOriginal: true,
    treeContainer,
  });
  const adapter = {
    resolveRoot: () => ({ vertexContent: { $d: 'root', $c: ['child'] } }),
    resolveChild: (
      hint: string,
      options: TreeChildResolutionContext<InputTTP, RewriteTTP>,
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

  const result = bindTreeSource(adapter, container).resolveChild(
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
    const adapter: AsyncTreeSource<InputTTP> = {
      // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
      resolveRoot: async () => ({ vertexContent: null, ...metadata }),
      // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
      resolveChild: async () => ({ vertexContent: null, ...metadata }),
    };
    const treeContainer = new DepthFirstTreeTraversal<InputTTP>({
      traversableTree: {
        resolveRoot: () => ({ vertexContent: null }),
        resolveChild: () => ({ vertexContent: null }),
      },
    }).createRunner().resolvedTreesContainer;
    const container = new ResolvedGraphsContainer({
      sourceMode: 'tree',
      saveOriginal: false,
      treeContainer,
    });
    const source = bindTreeSource(adapter, container);

    await expect(source.resolveRoot()).rejects.toThrow(/tree source.*metadata/i);
  },
);

test.each([
  ['resolveRoot', 'vertexId'],
  ['resolveRoot', 'dependsOn'],
  ['resolveChild', 'vertexId'],
  ['resolveChild', 'dependsOn'],
] as const)(
  'tree binding rejects synchronous %s %s metadata',
  (method, field) => {
    const metadata =
      field === 'vertexId' ? { vertexId: 'id' } : { dependsOn: [] };
    const treeContainer = new DepthFirstTreeTraversal<InputTTP, RewriteTTP>({
      traversableTree: {
        resolveRoot: () => ({ vertexContent: null }),
        resolveChild: () => ({ vertexContent: null }),
      },
    }).createRunner().resolvedTreesContainer;
    const container = new ResolvedGraphsContainer<InputTTP, RewriteTTP>({
      sourceMode: 'tree',
      saveOriginal: false,
      treeContainer,
    });
    const source = bindTreeSource(
      {
        // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
        resolveRoot: () => ({ vertexContent: null, ...metadata }),
        // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
        resolveChild: () => ({ vertexContent: null, ...metadata }),
      },
      container,
    );

    if (method === 'resolveRoot') {
      expect(() => source.resolveRoot()).toThrow(/tree source.*metadata/i);
    } else {
      const parent = rootRef();
      container.acceptRoot(parent, parent.getId());
      expect(() => source.resolveChild(childContext(parent))).toThrow(
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
  const adapter: DagDiscoverySource<InputTTP, RewriteTTP> = {
    resolveRoot: () => ({ vertexContent: null }),
    resolveChild: (hint, options) => {
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

  expect(source.resolveChild(context)).toEqual({
    vertexContent: { $d: 'child', $c: [] },
  });
  expect(source.getVertexIdFromHint?.('child')).toEqual({
    vertexId: 'id:child',
  });
  expect(source.getVertexIdFromHint?.(1)).toEqual({ vertexId: 'id:1' });
});

test('graph binding rejects a tree-mode container', () => {
  const treeContainer = new DepthFirstTreeTraversal<InputTTP>({
    traversableTree: {
      resolveRoot: () => ({ vertexContent: null }),
      resolveChild: () => ({ vertexContent: null }),
    },
  }).createRunner().resolvedTreesContainer;
  const container = new ResolvedGraphsContainer({
    sourceMode: 'tree',
    saveOriginal: false,
    treeContainer,
  });

  expect(() =>
    bindGraphSource(
      {
        resolveRoot: () => ({ vertexContent: null }),
        resolveChild: () => ({ vertexContent: null }),
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
        resolveRoot: () => ({ vertexContent: null }),
        resolveChild: () => ({ vertexContent: null }),
      },
      container,
    ),
  ).toThrow(/tree graph container/i);
});

test('tree binding preserves a throwing then accessor for sync diagnostics', () => {
  const treeContainer = new DepthFirstTreeTraversal<InputTTP>({
    traversableTree: {
      resolveRoot: () => ({ vertexContent: null }),
      resolveChild: () => ({ vertexContent: null }),
    },
  }).createRunner().resolvedTreesContainer;
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
      resolveRoot: () => result,
      resolveChild: () => ({ vertexContent: null }),
    },
    container,
  );
  const value = bound.resolveRoot();
  expect(() => Reflect.get(value, 'then')).toThrow('then getter');
});
