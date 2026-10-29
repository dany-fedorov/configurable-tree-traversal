import { internalRef, vertexHandle } from '../src/core/observationFacets';
import { internalTreeStore } from './internal-runner-fixtures';
import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  DagTraversal,
  DepthFirstTreeTraversal,
  MutableRef,
  Vertex,
  type VertexResolutionContext,
  type VertexTypes,
} from '../src';
import { runnerInternals } from './internal-runner-fixtures';

type Hint = { label: string };
type Data = { label: string; nested: { count: number } };
type T = VertexTypes<Data, Hint>;
const hint = { label: 'child' };
const rootData = { label: 'root', nested: { count: 1 } };
const source = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: {
      vertexContent: { $data: rootData, $childHints: [hint] },
    },
  }),
  resolveChild: (child: Hint) => ({
    kind: 'found' as const,
    vertex: {
      vertexContent: {
        $data: { label: child.label, nested: { count: 1 } },
        $childHints: [],
      },
    },
  }),
};

test('mutating child query arrays cannot corrupt forward/reverse topology or paths', () => {
  const runner = new DepthFirstTreeTraversal<T>({
    traversableTree: source,
  }).createRunner();
  runner.run();
  const tree = internalTreeStore(runner);
  const root = tree.getRoot()!;
  const child = tree.getChildrenOf(root)![0]!;
  const children = tree.getChildrenOf(root)!;
  children.length = 0;

  expect(tree.getChildrenOf(root)).toEqual([child]);
  expect(tree.getParentOf(child)).toBe(root);
  expect(tree.getPathTo(child)).toEqual([root, child]);
  expect(tree.getResolvedGraphView().getChildrenOf(root)).toEqual([
    vertexHandle(child),
  ]);
  expect(tree.getResolvedGraphView().getParentsOf(child)).toEqual([
    vertexHandle(root),
  ]);
});

test('mutating query contexts cannot reparent a child or overwrite discovery metadata', () => {
  const runner = new DepthFirstTreeTraversal<T>({
    traversableTree: source,
  }).createRunner();
  runner.run();
  const tree = internalTreeStore(runner);
  const root = tree.getRoot()!;
  const child = tree.getChildrenOf(root)![0]!;
  const context = tree.getResolutionContextOf(child)!;
  const unknown = new MutableRef(
    new Vertex<T>({ $data: rootData, $childHints: [] }),
  );
  expect(context.parentVertex).toBe(root.getValue());
  expect(context.vertexHint).toBe(hint);
  context.parentVertexRef = unknown;
  context.depth = 99;
  context.hintIndex = 99;
  context.vertexHint = { label: 'foreign' };

  expect(tree.getResolutionContextOf(child)).toEqual({
    parentVertex: root.getValue(),
    parentVertexRef: root,
    depth: 1,
    hintIndex: 0,
    vertexHint: hint,
  });
  expect(tree.getParentOf(child)).toBe(root);
  expect(tree.getPathTo(child)).toEqual([root, child]);
  expect(tree.getResolvedGraphView().getParentsOf(child)).toEqual([
    vertexHandle(root),
  ]);
});

for (const Constructor of [
  DepthFirstTreeTraversal<T>,
  AsyncDepthFirstTreeTraversal<T>,
  BreadthFirstTreeTraversal<T>,
  AsyncBreadthFirstTreeTraversal<T>,
  DagTraversal<T>,
  AsyncDagTraversal<T>,
]) {
  test(`${Constructor.name} exposes a stable live safe query view`, async () => {
    const runner = new Constructor({ traversableTree: source }).createRunner();
    const view = runner.getResolvedTreeView()!;
    expect(view.getRoot()).toBeNull();
    expect(runner.getResolvedTreeView()).toBe(view);
    await runner.run();
    const root = view.getRoot()!;
    const child = view.getChildrenOf(root)![0]!;
    expect(view.has(child)).toBe(true);
    expect(view.getParentOf(child)).toBe(root);
    expect(view.getPathTo(child)).toEqual([root, child]);
    expect(view.getPathTo(child, { noRoot: true, noSelf: true })).toEqual([]);
    expect(root.getValue().getData()).toBe(rootData);
    const context = view.getResolutionContextOf(child)!;
    expect(context.parentVertex).toBe(root.getValue());
    expect(context.vertexHint).toBe(hint);
    expect(() => {
      (view.getChildrenOf(root)! as MutableRef<Vertex<T>>[]).length = 0;
    }).toThrow(TypeError);
    expect(() => {
      (view.getPathTo(child) as MutableRef<Vertex<T>>[]).length = 0;
    }).toThrow(TypeError);
    expect(() => {
      // @ts-expect-error readonly context
      (context as VertexResolutionContext<T>).parentVertexRef = child;
    }).toThrow(TypeError);
    expect(view.getChildrenOf(root)).toEqual([child]);
    expect(view.getParentOf(child)).toBe(root);
    expect(view.getPathTo(child)).toEqual([root, child]);
    expect(view.getResolutionContextOf(child)!.parentVertexRef).toBe(root);
    expect(view.getResolutionContextOf(root)).toBeNull();
    const unknown = new MutableRef(
      new Vertex<T>({ $data: rootData, $childHints: [] }),
    );
    expect(view.has(unknown)).toBe(false);
    expect(view.getChildrenOf(unknown)).toBeNull();
    expect(view.getParentOf(unknown)).toBeNull();
    expect(view.getResolutionContextOf(unknown)).toBeNull();
    expect(() => view.getPathTo(unknown)).toThrow(/Could not find ref/);
    // Deliberate editing remains available through the advanced container.
    const internal = runnerInternals(runner);
    const tree =
      'resolvedTreesContainer' in internal
        ? internal.resolvedTreesContainer.resolvedTree
        : internal.resolvedGraphsContainer.treeContainer!.resolvedTree;
    expect(view).toBe(tree.asReadOnly());
    tree.deleteSubtree(internalRef(child));
    expect(view.getChildrenOf(root)).toEqual([]);
    expect(view.has(child)).toBe(false);
    expect(view.getParentOf(child)).toBeNull();
    tree.deleteSubtree(internalRef(root));
    expect(view.getRoot()).toBeNull();
  });
}

for (const Constructor of [DagTraversal<T>, AsyncDagTraversal<T>]) {
  test(`${Constructor.name} has no tree view for graph sources`, async () => {
    const runner = new Constructor({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: rootData, $childHints: [] },
          },
        }),
        resolveChild: () => ({
          satisfiesDependencies: true as const,
          kind: 'omitted' as const,
        }),
      },
    }).createRunner();
    expect(runner.getResolvedTreeView()).toBeNull();
    await runner.run();
    expect(runner.getResolvedTreeView()).toBeNull();
  });
}

test('safe queries preserve saved topology while explicit active edits stay live', () => {
  const runner = new DepthFirstTreeTraversal<T>({
    traversableTree: source,
    retainOriginalTreeStructure: true,
  })
    .createRunner()
    .run();
  const tree = internalTreeStore(runner);
  const view = tree.asReadOnly();
  const saved =
    runnerInternals(runner).resolvedTreesContainer.originalTreeView!;
  const savedView = saved.asReadOnly();
  const root = view.getRoot()!;
  const child = view.getChildrenOf(root)![0]!;
  const savedRoot = savedView.getRoot()!;
  const savedChild = savedView.getChildrenOf(savedRoot)![0]!;
  expect(savedRoot).not.toBe(root);
  expect(savedRoot.getValue().getData()).toBe(rootData);
  expect(savedView.getResolutionContextOf(savedChild)!.vertexHint).toBe(hint);
  saved.getChildrenOf(internalRef(savedRoot))!.length = 0;
  saved.getResolutionContextOf(internalRef(savedChild))!.parentVertexRef =
    internalRef(child);
  tree.getChildrenOf(internalRef(root))!.length = 0;
  tree.getResolutionContextOf(internalRef(child))!.parentVertexRef =
    internalRef(savedRoot);
  expect(savedView.getChildrenOf(savedRoot)).toEqual([savedChild]);
  expect(savedView.getParentOf(savedChild)).toBe(savedRoot);
  expect(savedView.getPathTo(savedChild)).toEqual([savedRoot, savedChild]);
  expect(view.getChildrenOf(root)).toEqual([child]);
  tree.deleteSubtree(internalRef(child));
  expect(view.getChildrenOf(root)).toEqual([]);
  expect(savedView.getChildrenOf(savedRoot)).toEqual([savedChild]);
  expect(savedView.getPathTo(savedChild)).toEqual([savedRoot, savedChild]);
});
