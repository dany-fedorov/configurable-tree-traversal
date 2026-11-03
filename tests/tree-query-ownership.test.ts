import {
  internalRef,
  createVertexHandleFacet,
} from '../src/core/observationFacets';
import { internalTreeStore } from './internal-runner-fixtures';
import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  MutableValueReference,
  Vertex,
  type ChildDiscoveryContext,
  type VertexHandle,
  type VertexDataAndChildHintTypes,
} from '../src';
import { runnerInternals } from './internal-runner-fixtures';

type Hint = { label: string };
type Data = { label: string; nested: { count: number } };
type T = VertexDataAndChildHintTypes<Data, Hint>;
const hint = { label: 'child' };
const rootData = { label: 'root', nested: { count: 1 } };
const source = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: {
        $vertexData: rootData,
        $childDiscoveryHints: [hint],
      },
    },
  }),
  resolveChildVertexFromHint: (child: Hint) => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: {
        $vertexData: { label: child.label, nested: { count: 1 } },
        $childDiscoveryHints: [],
      },
    },
  }),
};

test('mutating child query arrays cannot corrupt forward/reverse topology or paths', () => {
  const runner = new DepthFirstTreeTraversalBuilder<T>({
    treeDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  runner.runUntilSuspendedOrTerminal();
  const tree = internalTreeStore(runner);
  const root = tree.getRootVertexReferenceOrNull()!;
  const child = tree.getDetachedChildReferenceListOrNull(root)![0]!;
  const children = tree.getDetachedChildReferenceListOrNull(root)!;
  children.length = 0;

  expect(tree.getDetachedChildReferenceListOrNull(root)).toEqual([child]);
  expect(tree.getParentVertexReferenceOrNull(child)).toBe(root);
  expect(tree.requireStructuralAncestorPathTo(child)).toEqual([root, child]);
  expect(
    tree
      .getLiveResolvedGraphView()
      .getStructuralChildHandlesInSlotOrderOrNull(
        createVertexHandleFacet(root),
      ),
  ).toEqual([createVertexHandleFacet(child)]);
  expect(
    tree
      .getLiveResolvedGraphView()
      .getDistinctStructuralParentHandlesOrNull(createVertexHandleFacet(child)),
  ).toEqual([createVertexHandleFacet(root)]);
});

test('mutating query contexts cannot reparent a child or overwrite discovery metadata', () => {
  const runner = new DepthFirstTreeTraversalBuilder<T>({
    treeDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  runner.runUntilSuspendedOrTerminal();
  const tree = internalTreeStore(runner);
  const root = tree.getRootVertexReferenceOrNull()!;
  const child = tree.getDetachedChildReferenceListOrNull(root)![0]!;
  const context = tree.getDetachedChildDiscoveryContextOrNull(child)!;
  const unknown = new MutableValueReference(
    new Vertex<T>({ $vertexData: rootData, $childDiscoveryHints: [] }),
  );
  expect(context.parentVertexAtChildResolution).toBe(root.getReferencedValue());
  expect(context.childDiscoveryHint).toBe(hint);
  context.parentVertexHandle = unknown;
  context.discoveryDepthInEdges = 99;
  context.parentChildHintIndex = 99;
  context.childDiscoveryHint = { label: 'foreign' };

  expect(tree.getDetachedChildDiscoveryContextOrNull(child)).toEqual({
    parentVertexAtChildResolution: root.getReferencedValue(),
    parentVertexHandle: root,
    discoveryDepthInEdges: 1,
    parentChildHintIndex: 0,
    childDiscoveryHint: hint,
  });
  expect(tree.getParentVertexReferenceOrNull(child)).toBe(root);
  expect(tree.requireStructuralAncestorPathTo(child)).toEqual([root, child]);
  expect(
    tree
      .getLiveResolvedGraphView()
      .getDistinctStructuralParentHandlesOrNull(createVertexHandleFacet(child)),
  ).toEqual([createVertexHandleFacet(root)]);
});

for (const Constructor of [
  DepthFirstTreeTraversalBuilder<T>,
  AsyncDepthFirstTreeTraversalBuilder<T>,
  BreadthFirstTreeTraversalBuilder<T>,
  AsyncBreadthFirstTreeTraversalBuilder<T>,
  DagTraversalBuilder<T>,
  AsyncDagTraversalBuilder<T>,
]) {
  test(`${Constructor.name} exposes a stable live safe query view`, async () => {
    const runner = new Constructor({
      treeDiscoverySource: source,
    }).createIndependentRunnerFromCurrentOptions();
    const view = runner.getLiveResolvedTreeView()!;
    expect(view.getRootVertexHandleOrNull()).toBeNull();
    expect(runner.getLiveResolvedTreeView()).toBe(view);
    await runner.runUntilSuspendedOrTerminal();
    const root = view.getRootVertexHandleOrNull()!;
    const child = view.getChildVertexHandlesOrNull(root)![0]!;
    expect(view.containsVertexHandle(child)).toBe(true);
    expect(view.getParentVertexHandleOrNull(child)).toBe(root);
    expect(view.requireStructuralAncestorPathTo(child)).toEqual([root, child]);
    expect(
      view.requireStructuralAncestorPathTo(child, {
        includeDesignatedRoot: false,
        includeTargetVertex: false,
      }),
    ).toEqual([]);
    expect(root.getCurrentVertexView().getVertexData()).toBe(rootData);
    const context = view.getChildDiscoveryContextOrNull(child)!;
    expect(context.parentVertexAtChildResolution).toBe(
      root.getCurrentVertexView(),
    );
    expect(context.childDiscoveryHint).toBe(hint);
    expect(() => {
      (view.getChildVertexHandlesOrNull(root)! as VertexHandle<T>[]).length = 0;
    }).toThrow(TypeError);
    expect(() => {
      (
        view.requireStructuralAncestorPathTo(child) as VertexHandle<T>[]
      ).length = 0;
    }).toThrow(TypeError);
    expect(() => {
      // @ts-expect-error readonly context
      (context as ChildDiscoveryContext<T>).parentVertexHandle = child;
    }).toThrow(TypeError);
    expect(view.getChildVertexHandlesOrNull(root)).toEqual([child]);
    expect(view.getParentVertexHandleOrNull(child)).toBe(root);
    expect(view.requireStructuralAncestorPathTo(child)).toEqual([root, child]);
    expect(view.getChildDiscoveryContextOrNull(child)!.parentVertexHandle).toBe(
      root,
    );
    expect(view.getChildDiscoveryContextOrNull(root)).toBeNull();
    const unknown = new MutableValueReference(
      new Vertex<T>({ $vertexData: rootData, $childDiscoveryHints: [] }),
    );
    expect(view.containsVertexHandle(createVertexHandleFacet(unknown))).toBe(
      false,
    );
    expect(
      view.getChildVertexHandlesOrNull(createVertexHandleFacet(unknown)),
    ).toBeNull();
    expect(
      view.getParentVertexHandleOrNull(createVertexHandleFacet(unknown)),
    ).toBeNull();
    expect(
      view.getChildDiscoveryContextOrNull(createVertexHandleFacet(unknown)),
    ).toBeNull();
    expect(() =>
      view.requireStructuralAncestorPathTo(createVertexHandleFacet(unknown)),
    ).toThrow(/Could not find ref/);
    // Deliberate editing remains available through the advanced container.
    const internal = runnerInternals(runner);
    const tree =
      'resolvedTreesContainer' in internal
        ? internal.resolvedTreesContainer.resolvedTree
        : internal.resolvedGraphsContainer.treeContainer!.resolvedTree;
    expect(view).toBe(tree.getLiveReadOnlyTreeView());
    tree.deleteSubtree(internalRef(child));
    expect(view.getChildVertexHandlesOrNull(root)).toEqual([]);
    expect(view.containsVertexHandle(child)).toBe(false);
    expect(view.getParentVertexHandleOrNull(child)).toBeNull();
    tree.deleteSubtree(internalRef(root));
    expect(view.getRootVertexHandleOrNull()).toBeNull();
  });
}

for (const Constructor of [
  DagTraversalBuilder<T>,
  AsyncDagTraversalBuilder<T>,
]) {
  test(`${Constructor.name} has no tree view for graph sources`, async () => {
    const runner = new Constructor({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: rootData,
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildHint: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    expect(runner.getLiveResolvedTreeView()).toBeNull();
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.getLiveResolvedTreeView()).toBeNull();
  });
}

test('safe queries preserve saved topology while explicit active edits stay live', () => {
  const runner = new DepthFirstTreeTraversalBuilder<T>({
    treeDiscoverySource: source,
    retainDiscoveredTreeBeforeVisitorCommands: true,
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  const tree = internalTreeStore(runner);
  const view = tree.getLiveReadOnlyTreeView();
  const saved =
    runnerInternals(runner).resolvedTreesContainer
      .preCommandDiscoveredTreeView!;
  const savedView = saved.getLiveReadOnlyTreeView();
  const root = view.getRootVertexHandleOrNull()!;
  const child = view.getChildVertexHandlesOrNull(root)![0]!;
  const savedRoot = savedView.getRootVertexHandleOrNull()!;
  const savedChild = savedView.getChildVertexHandlesOrNull(savedRoot)![0]!;
  expect(savedRoot).not.toBe(root);
  expect(savedRoot.getCurrentVertexView().getVertexData()).toBe(rootData);
  expect(
    savedView.getChildDiscoveryContextOrNull(savedChild)!.childDiscoveryHint,
  ).toBe(hint);
  saved.getDetachedChildReferenceListOrNull(internalRef(savedRoot))!.length = 0;
  saved.getDetachedChildDiscoveryContextOrNull(
    internalRef(savedChild),
  )!.parentVertexHandle = internalRef(child);
  tree.getDetachedChildReferenceListOrNull(internalRef(root))!.length = 0;
  tree.getDetachedChildDiscoveryContextOrNull(
    internalRef(child),
  )!.parentVertexHandle = internalRef(savedRoot);
  expect(savedView.getChildVertexHandlesOrNull(savedRoot)).toEqual([
    savedChild,
  ]);
  expect(savedView.getParentVertexHandleOrNull(savedChild)).toBe(savedRoot);
  expect(savedView.requireStructuralAncestorPathTo(savedChild)).toEqual([
    savedRoot,
    savedChild,
  ]);
  expect(view.getChildVertexHandlesOrNull(root)).toEqual([child]);
  tree.deleteSubtree(internalRef(child));
  expect(view.getChildVertexHandlesOrNull(root)).toEqual([]);
  expect(savedView.getChildVertexHandlesOrNull(savedRoot)).toEqual([
    savedChild,
  ]);
  expect(savedView.requireStructuralAncestorPathTo(savedChild)).toEqual([
    savedRoot,
    savedChild,
  ]);
});
