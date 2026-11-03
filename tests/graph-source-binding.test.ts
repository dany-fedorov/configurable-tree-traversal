import { resolutionContextView } from '../src/core/observationFacets';
import type { InternalChildDiscoveryContext as ChildDiscoveryContext } from '../src/core/ResolvedTree';
import { getTreeGraphStore } from '../src/core/graph/treeStoreCapabilities';
import type { AsyncTreeDiscoverySource } from '../src/core/AsyncTraversableTree';
import { MutableValueReference } from '../src/core/CTTRef';
import {
  bindGraphSource,
  bindTreeSource,
} from '../src/core/drivers/callbackBindings';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { DagDiscoverySource } from '../src/core/TraversableGraph';
import type { TreeChildResolverContext } from '../src/core/TraversableTree';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { Vertex } from '../src/core/Vertex';
import { DepthFirstTreeTraversalBuilder } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';
import { runnerInternals } from './internal-runner-fixtures';

type InputTTP = VertexDataAndChildHintTypes<string, string>;
type RewriteTTP = VertexDataAndChildHintTypes<number, number>;

function rootRef() {
  return new MutableValueReference(
    new Vertex<InputTTP | RewriteTTP>({
      $vertexData: 'root',
      $childDiscoveryHints: ['child'],
    }),
  );
}

function childContext(
  parentVertexRef: MutableValueReference<Vertex<InputTTP | RewriteTTP>>,
): ChildDiscoveryContext<InputTTP | RewriteTTP> {
  return {
    discoveryDepthInEdges: 1,
    parentVertexAtChildResolution: parentVertexRef.getReferencedValue(),
    parentVertexHandle: parentVertexRef,
    parentChildHintIndex: 0,
    childDiscoveryHint: 'child',
  };
}

test('tree binding reuses the legacy facade and passes real tree options', () => {
  const treeContainer = runnerInternals(
    new DepthFirstTreeTraversalBuilder<InputTTP, RewriteTTP>({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
      retainDiscoveredTreeBeforeVisitorCommands: true,
    }).createIndependentRunnerFromCurrentOptions(),
  ).resolvedTreesContainer;
  const container = new ResolvedGraphsContainer({
    sourceMode: 'tree',
    saveOriginal: true,
    treeContainer,
  });
  const adapter = {
    resolveRootVertex: () => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexContentInput: {
          $vertexData: 'root',
          $childDiscoveryHints: ['child'],
        },
      },
    }),
    resolveChildVertexFromHint: (
      hint: string,
      options: TreeChildResolverContext<InputTTP, RewriteTTP>,
    ) => {
      expect(options.liveResolvedTreeView).toBe(
        container.treeContainer!.resolvedTree.getLiveReadOnlyTreeView(),
      );
      expect(
        options.liveResolvedTreeView.getParentVertexHandleOrNull(
          options.childDiscoveryContext.parentVertexHandle,
        ),
      ).toBeNull();
      return {
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
        },
      };
    },
  };
  const parent = rootRef();
  container.acceptRoot(parent, parent.getReferenceIdentity());

  const result = bindTreeSource(adapter, container).resolveChild(
    childContext(parent),
  );

  expect(result).toEqual({
    vertexContent: { $vertexData: 'child', $childDiscoveryHints: [] },
  });
  expect(container.store).toBe(getTreeGraphStore(treeContainer.resolvedTree));
  expect(container.publicResolvedGraph).toBe(
    treeContainer.resolvedTree.getLiveResolvedGraphView(),
  );

  const child = new MutableValueReference(
    new Vertex<InputTTP | RewriteTTP>({
      $vertexData: 'child',
      $childDiscoveryHints: [],
    }),
  );
  container.acceptVertex(
    child,
    child.getReferenceIdentity(),
    [],
    childContext(parent),
  );
  container.store.prepareSlots(parent, ['child']);
  container.acceptEdge(parent, 0, child);
  const savedParent = treeContainer.originalTreeRefsMap!.get(parent)!;
  const savedChild = treeContainer.originalTreeRefsMap!.get(child)!;

  expect(container.liveResolvedGraphView.get(parent)?.slots).toEqual([
    { kind: 'linked', hint: 'child', childRef: child },
  ]);
  expect(
    treeContainer.preCommandDiscoveredTreeView!.getDetachedChildReferenceListOrNull(
      savedParent,
    ),
  ).toEqual([savedChild]);
});

test.each(['vertexId', 'workWaitsForWorkOf'] as const)(
  'tree binding rejects the %s graph metadata field',
  async (field) => {
    const metadata =
      field === 'vertexId' ? { vertexId: 'id' } : { workWaitsForWorkOf: [] };
    const adapter: AsyncTreeDiscoverySource<InputTTP> = {
      // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
      resolveRootVertex: async () => ({
        kind: 'vertexIntentionallyOmitted' as const,
        ...metadata,
      }),
      // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
      resolveChildVertexFromHint: async () => ({
        kind: 'vertexIntentionallyOmitted' as const,
        ...metadata,
      }),
    };
    const treeContainer = runnerInternals(
      new DepthFirstTreeTraversalBuilder<InputTTP>({
        treeDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexIntentionallyOmitted' as const,
          }),
          resolveChildVertexFromHint: () => ({
            kind: 'vertexIntentionallyOmitted' as const,
          }),
        },
      }).createIndependentRunnerFromCurrentOptions(),
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
  ['resolveRootVertex', 'vertexId'],
  ['resolveRootVertex', 'workWaitsForWorkOf'],
  ['resolveChildVertexFromHint', 'vertexId'],
  ['resolveChildVertexFromHint', 'workWaitsForWorkOf'],
] as const)(
  'tree binding rejects synchronous %s %s metadata',
  (method, field) => {
    const metadata =
      field === 'vertexId' ? { vertexId: 'id' } : { workWaitsForWorkOf: [] };
    const treeContainer = runnerInternals(
      new DepthFirstTreeTraversalBuilder<InputTTP, RewriteTTP>({
        treeDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexIntentionallyOmitted' as const,
          }),
          resolveChildVertexFromHint: () => ({
            kind: 'vertexIntentionallyOmitted' as const,
          }),
        },
      }).createIndependentRunnerFromCurrentOptions(),
    ).resolvedTreesContainer;
    const container = new ResolvedGraphsContainer<InputTTP, RewriteTTP>({
      sourceMode: 'tree',
      saveOriginal: false,
      treeContainer,
    });
    const source = bindTreeSource(
      {
        resolveRootVertex: () => ({
          // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
          kind: 'vertexIntentionallyOmitted' as const,
          ...metadata,
        }),
        resolveChildVertexFromHint: () => ({
          // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
          kind: 'vertexIntentionallyOmitted' as const,
          ...metadata,
        }),
      },
      container,
    );

    if (method === 'resolveRootVertex') {
      expect(() => source.resolveRoot()).toThrow(/tree source.*metadata/i);
    } else {
      const parent = rootRef();
      container.acceptRoot(parent, parent.getReferenceIdentity());
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
    resolveRootVertex: () => ({
      omittedVertexIdentity: null,
      kind: 'vertexIntentionallyOmitted' as const,
      satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
    }),
    resolveChildHint: (hint, options) => {
      expect(hint).toBe('child');
      expect(options).toEqual({
        structuralChildResolution: resolutionContextView(context),
        liveResolvedGraphView: container.publicResolvedGraph,
        preCommandDiscoveredGraphView: container.preCommandDiscoveredGraphView,
      });
      return {
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
        },
      };
    },
    tryGetVertexIdentityFromHint: (hint) => ({ vertexId: `id:${hint}` }),
  };
  const source = bindGraphSource(adapter, container);

  expect(source.resolveChild(context)).toEqual({
    vertexContent: { $vertexData: 'child', $childDiscoveryHints: [] },
  });
  expect(source.getVertexIdFromHint?.('child')).toEqual({
    vertexId: 'id:child',
  });
  expect(source.getVertexIdFromHint?.(1)).toEqual({ vertexId: 'id:1' });
});

test('graph binding rejects a tree-mode container', () => {
  const treeContainer = runnerInternals(
    new DepthFirstTreeTraversalBuilder<InputTTP>({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions(),
  ).resolvedTreesContainer;
  const container = new ResolvedGraphsContainer({
    sourceMode: 'tree',
    saveOriginal: false,
    treeContainer,
  });

  expect(() =>
    bindGraphSource(
      {
        resolveRootVertex: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildHint: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
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
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
      container,
    ),
  ).toThrow(/tree graph container/i);
});

test('tree binding preserves a throwing then accessor for sync diagnostics', () => {
  const treeContainer = runnerInternals(
    new DepthFirstTreeTraversalBuilder<InputTTP>({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions(),
  ).resolvedTreesContainer;
  const container = new ResolvedGraphsContainer({
    sourceMode: 'tree',
    saveOriginal: false,
    treeContainer,
  });
  const result = Object.defineProperty(
    { kind: 'vertexIntentionallyOmitted' as const },
    'then',
    {
      get() {
        throw new Error('then getter');
      },
    },
  );
  const bound = bindTreeSource(
    {
      resolveRootVertex: () => result,
      resolveChildVertexFromHint: () => ({
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    },
    container,
  );
  const value = bound.resolveRoot();
  expect(() => Reflect.get(value, 'then')).toThrow('then getter');
});
