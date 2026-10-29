import { resolutionContextView } from '../src/core/observationFacets';
import type { InternalVertexResolutionContext as VertexResolutionContext } from '../src/core/ResolvedTree';
import { getTreeGraphStore } from '../src/core/graph/treeStoreCapabilities';
import type { AsyncTreeSource } from '../src/core/AsyncTraversableTree';
import { MutableRef } from '../src/core/CTTRef';
import {
  bindGraphSource,
  bindTreeSource,
} from '../src/core/drivers/callbackBindings';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { DagDiscoverySource } from '../src/core/TraversableGraph';
import type { TreeChildResolutionContext } from '../src/core/TraversableTree';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { Vertex } from '../src/core/Vertex';
import { DepthFirstTreeTraversal } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';
import { runnerInternals } from './internal-runner-fixtures';

type InputTTP = VertexTypes<string, string>;
type RewriteTTP = VertexTypes<number, number>;

function rootRef() {
  return new MutableRef(
    new Vertex<InputTTP | RewriteTTP>({
      $data: 'root',
      $childHints: ['child'],
    }),
  );
}

function childContext(
  parentVertexRef: MutableRef<Vertex<InputTTP | RewriteTTP>>,
): VertexResolutionContext<InputTTP | RewriteTTP> {
  return {
    depth: 1,
    parentVertex: parentVertexRef.getValue(),
    parentVertexRef,
    hintIndex: 0,
    vertexHint: 'child',
  };
}

test('tree binding reuses the legacy facade and passes real tree options', () => {
  const treeContainer = runnerInternals(
    new DepthFirstTreeTraversal<InputTTP, RewriteTTP>({
      traversableTree: {
        resolveRoot: () => ({ kind: 'omitted' as const }),
        resolveChild: () => ({ kind: 'omitted' as const }),
      },
      retainOriginalTreeStructure: true,
    }).createRunner(),
  ).resolvedTreesContainer;
  const container = new ResolvedGraphsContainer({
    sourceMode: 'tree',
    saveOriginal: true,
    treeContainer,
  });
  const adapter = {
    resolveRoot: () => ({
      kind: 'found' as const,
      vertex: { vertexContent: { $data: 'root', $childHints: ['child'] } },
    }),
    resolveChild: (
      hint: string,
      options: TreeChildResolutionContext<InputTTP, RewriteTTP>,
    ) => {
      expect(options.resolvedTreeView).toBe(
        container.treeContainer!.resolvedTree.asReadOnly(),
      );
      expect(
        options.resolvedTreeView.getParentOf(
          options.resolutionContext.parentVertexRef,
        ),
      ).toBeNull();
      return {
        kind: 'found' as const,
        vertex: { vertexContent: { $data: hint, $childHints: [] } },
      };
    },
  };
  const parent = rootRef();
  container.acceptRoot(parent, parent.getRefId());

  const result = bindTreeSource(adapter, container).resolveChild(
    childContext(parent),
  );

  expect(result).toEqual({
    vertexContent: { $data: 'child', $childHints: [] },
  });
  expect(container.store).toBe(getTreeGraphStore(treeContainer.resolvedTree));
  expect(container.publicResolvedGraph).toBe(
    treeContainer.resolvedTree.getResolvedGraphView(),
  );

  const child = new MutableRef(
    new Vertex<InputTTP | RewriteTTP>({ $data: 'child', $childHints: [] }),
  );
  container.acceptVertex(child, child.getRefId(), [], childContext(parent));
  container.store.prepareSlots(parent, ['child']);
  container.acceptEdge(parent, 0, child);
  const savedParent = treeContainer.originalTreeRefsMap!.get(parent)!;
  const savedChild = treeContainer.originalTreeRefsMap!.get(child)!;

  expect(container.resolvedGraphView.get(parent)?.slots).toEqual([
    { kind: 'linked', hint: 'child', childRef: child },
  ]);
  expect(treeContainer.originalTreeView!.getChildrenOf(savedParent)).toEqual([
    savedChild,
  ]);
});

test.each(['vertexId', 'dependsOnWork'] as const)(
  'tree binding rejects the %s graph metadata field',
  async (field) => {
    const metadata =
      field === 'vertexId' ? { vertexId: 'id' } : { dependsOnWork: [] };
    const adapter: AsyncTreeSource<InputTTP> = {
      // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
      resolveRoot: async () => ({ kind: 'omitted' as const, ...metadata }),
      // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
      resolveChild: async () => ({ kind: 'omitted' as const, ...metadata }),
    };
    const treeContainer = runnerInternals(
      new DepthFirstTreeTraversal<InputTTP>({
        traversableTree: {
          resolveRoot: () => ({ kind: 'omitted' as const }),
          resolveChild: () => ({ kind: 'omitted' as const }),
        },
      }).createRunner(),
    ).resolvedTreesContainer;
    const container = new ResolvedGraphsContainer({
      sourceMode: 'tree',
      saveOriginal: false,
      treeContainer,
    });
    const source = bindTreeSource(adapter, container);

    await expect(source.resolveRoot()).rejects.toThrow(
      /tree source.*metadata/i,
    );
  },
);

test.each([
  ['resolveRoot', 'vertexId'],
  ['resolveRoot', 'dependsOnWork'],
  ['resolveChild', 'vertexId'],
  ['resolveChild', 'dependsOnWork'],
] as const)(
  'tree binding rejects synchronous %s %s metadata',
  (method, field) => {
    const metadata =
      field === 'vertexId' ? { vertexId: 'id' } : { dependsOnWork: [] };
    const treeContainer = runnerInternals(
      new DepthFirstTreeTraversal<InputTTP, RewriteTTP>({
        traversableTree: {
          resolveRoot: () => ({ kind: 'omitted' as const }),
          resolveChild: () => ({ kind: 'omitted' as const }),
        },
      }).createRunner(),
    ).resolvedTreesContainer;
    const container = new ResolvedGraphsContainer<InputTTP, RewriteTTP>({
      sourceMode: 'tree',
      saveOriginal: false,
      treeContainer,
    });
    const source = bindTreeSource(
      {
        // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
        resolveRoot: () => ({ kind: 'omitted' as const, ...metadata }),
        // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
        resolveChild: () => ({ kind: 'omitted' as const, ...metadata }),
      },
      container,
    );

    if (method === 'resolveRoot') {
      expect(() => source.resolveRoot()).toThrow(/tree source.*metadata/i);
    } else {
      const parent = rootRef();
      container.acceptRoot(parent, parent.getRefId());
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
    resolveRoot: () => ({
      kind: 'omitted' as const,
      satisfiesDependencies: true as const,
    }),
    resolveChild: (hint, options) => {
      expect(hint).toBe('child');
      expect(options).toEqual({
        resolutionContext: resolutionContextView(context),
        resolvedGraphView: container.publicResolvedGraph,
        originalGraphView: container.originalGraphView,
      });
      return {
        kind: 'found' as const,
        vertex: { vertexContent: { $data: hint, $childHints: [] } },
      };
    },
    getVertexIdFromHint: (hint) => ({ vertexId: `id:${hint}` }),
  };
  const source = bindGraphSource(adapter, container);

  expect(source.resolveChild(context)).toEqual({
    vertexContent: { $data: 'child', $childHints: [] },
  });
  expect(source.getVertexIdFromHint?.('child')).toEqual({
    vertexId: 'id:child',
  });
  expect(source.getVertexIdFromHint?.(1)).toEqual({ vertexId: 'id:1' });
});

test('graph binding rejects a tree-mode container', () => {
  const treeContainer = runnerInternals(
    new DepthFirstTreeTraversal<InputTTP>({
      traversableTree: {
        resolveRoot: () => ({ kind: 'omitted' as const }),
        resolveChild: () => ({ kind: 'omitted' as const }),
      },
    }).createRunner(),
  ).resolvedTreesContainer;
  const container = new ResolvedGraphsContainer({
    sourceMode: 'tree',
    saveOriginal: false,
    treeContainer,
  });

  expect(() =>
    bindGraphSource(
      {
        resolveRoot: () => ({
          satisfiesDependencies: true as const,
          kind: 'omitted' as const,
        }),
        resolveChild: () => ({
          satisfiesDependencies: true as const,
          kind: 'omitted' as const,
        }),
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
        resolveRoot: () => ({ kind: 'omitted' as const }),
        resolveChild: () => ({ kind: 'omitted' as const }),
      },
      container,
    ),
  ).toThrow(/tree graph container/i);
});

test('tree binding preserves a throwing then accessor for sync diagnostics', () => {
  const treeContainer = runnerInternals(
    new DepthFirstTreeTraversal<InputTTP>({
      traversableTree: {
        resolveRoot: () => ({ kind: 'omitted' as const }),
        resolveChild: () => ({ kind: 'omitted' as const }),
      },
    }).createRunner(),
  ).resolvedTreesContainer;
  const container = new ResolvedGraphsContainer({
    sourceMode: 'tree',
    saveOriginal: false,
    treeContainer,
  });
  const result = Object.defineProperty({ kind: 'omitted' as const }, 'then', {
    get() {
      throw new Error('then getter');
    },
  });
  const bound = bindTreeSource(
    {
      resolveRoot: () => result,
      resolveChild: () => ({ kind: 'omitted' as const }),
    },
    container,
  );
  const value = bound.resolveRoot();
  expect(() => Reflect.get(value, 'then')).toThrow('then getter');
});
