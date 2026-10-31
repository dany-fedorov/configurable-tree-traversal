import { internalTreeStore } from './internal-runner-fixtures';
import type { InternalVertexResolutionContext as VertexResolutionContext } from '../src/core/ResolvedTree';
import type { DepthFirstTraversalResolvedTreesContainer } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import {
  DepthFirstPhase,
  DepthFirstTreeTraversal,
  MutableRef,
  ResolvedTreeStore,
  TraversalVisitorCommandName,
  TreeVertexRecord,
  Vertex,
  type VertexTypes,
} from '../src';
import {
  createInternalDepthFirstTreeRunner,
  runnerInternals,
  traversalInternals,
} from './internal-runner-fixtures';

type Node = { $data: string; $childHints: Node[] };
type TestTTP = VertexTypes<string, Node>;
type MutableNode = {
  $data: { label: string; nested: { count: number } };
  $childHints: MutableNode[];
};
type MutableDataTTP = VertexTypes<MutableNode['$data'], MutableNode>;

const node = ($data: string, ...$childHints: Node[]): Node => ({
  $data,
  $childHints,
});

function makeTraversal(root: Node, retainOriginalTreeStructure = false) {
  return new DepthFirstTreeTraversal<TestTTP>({
    traversableTree: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: root },
      }),
      resolveChild: (hint) => ({
        kind: 'found' as const,
        vertex: { vertexContent: hint },
      }),
    },
    retainOriginalTreeStructure,
  });
}

function makeRef(
  data: string,
  childrenHints: Node[] = [],
): MutableRef<Vertex<TestTTP>> {
  return new MutableRef(
    new Vertex<TestTTP>({
      $data: data,
      $childHints: childrenHints,
    }),
  );
}

function makeContext(
  parentVertexRef: MutableRef<Vertex<TestTTP>>,
  vertexHint: Node,
  depth = 1,
): VertexResolutionContext<TestTTP> {
  return {
    depth,
    parentVertex: parentVertexRef.getValue(),
    parentVertexRef,
    hintIndex: 0,
    vertexHint,
  };
}

function getSavedParts(
  container: DepthFirstTraversalResolvedTreesContainer<TestTTP, TestTTP>,
): {
  tree: ResolvedTreeStore<TestTTP>;
  refs: NonNullable<typeof container.originalTreeRefsMap>;
} {
  const tree = container.originalTreeView;
  const refs = container.originalTreeRefsMap;
  if (tree === null || refs === null) {
    throw new Error('Expected original resolved-tree capture to be enabled');
  }
  return { tree, refs };
}

describe('saved resolved-tree consistency', () => {
  test('setting an existing ref with children keeps one saved ref and translates its topology', () => {
    const container = runnerInternals(
      makeTraversal(node('unused'), true).createRunner(),
    ).resolvedTreesContainer;
    const childHint = node('child');
    const parentRef = makeRef('parent', [childHint]);
    const childRef = makeRef('child');

    container.setRoot(parentRef);
    container.setWithResolutionContext(
      childRef,
      makeContext(parentRef, childHint),
    );
    const { tree: savedTree, refs: savedRefs } = getSavedParts(container);
    const firstSavedParentRef = savedRefs.get(parentRef);
    const savedChildRef = savedRefs.get(childRef);
    if (firstSavedParentRef === undefined || savedChildRef === undefined) {
      throw new Error('Expected saved refs for parent and child');
    }

    container.set(
      parentRef,
      new TreeVertexRecord<TestTTP>({
        metadata: { resolutionContext: null },
        children: [childRef],
      }),
    );

    expect(savedRefs.get(parentRef)).toBe(firstSavedParentRef);
    expect(savedTree.getRoot()).toBe(firstSavedParentRef);
    expect(savedTree.getChildrenOf(firstSavedParentRef)).toEqual([
      savedChildRef,
    ]);
    expect(savedTree.getParentOf(savedChildRef)).toBe(firstSavedParentRef);
  });

  test('rejecting an unknown saved child does not partially update the active tree', () => {
    const container = runnerInternals(
      makeTraversal(node('unused'), true).createRunner(),
    ).resolvedTreesContainer;
    const parentRef = makeRef('parent');
    const unknownChildRef = makeRef('unknown');
    container.setRoot(parentRef);
    const { tree: savedTree, refs: savedRefs } = getSavedParts(container);
    const savedParentRef = savedRefs.get(parentRef);
    if (savedParentRef === undefined) {
      throw new Error('Expected a saved parent ref');
    }

    expect(() =>
      container.pushChildrenTo(parentRef, [unknownChildRef]),
    ).toThrow(/not mutated child ref/i);

    expect(container.resolvedTree.getChildrenOf(parentRef)).toEqual([]);
    expect(savedTree.getChildrenOf(savedParentRef)).toEqual([]);
  });

  test('keeps the first vertex snapshot when an existing active ref is rewritten', () => {
    const container = runnerInternals(
      makeTraversal(node('unused'), true).createRunner(),
    ).resolvedTreesContainer;
    const rootRef = makeRef('original');
    container.setRoot(rootRef);
    const { tree: savedTree, refs: savedRefs } = getSavedParts(container);
    const savedRootRef = savedRefs.get(rootRef);
    if (savedRootRef === undefined) {
      throw new Error('Expected a saved root ref');
    }

    rootRef.setValue(rootRef.getValue().clone({ $data: 'rewritten' }));
    container.set(
      rootRef,
      new TreeVertexRecord<TestTTP>({
        metadata: { resolutionContext: null },
        children: [],
      }),
    );

    expect(savedRefs.get(rootRef)).toBe(savedRootRef);
    expect(savedTree.getRoot()?.getValue().getData()).toBe('original');
    expect(container.resolvedTree.getRoot()?.getValue().getData()).toBe(
      'rewritten',
    );
  });

  test('rejects unresolved parent and child mappings without inserting the vertex', () => {
    const container = runnerInternals(
      makeTraversal(node('unused'), true).createRunner(),
    ).resolvedTreesContainer;
    const unknownParentRef = makeRef('unknown-parent');
    const childHint = node('child');
    const childRef = makeRef('child');

    expect(() =>
      container.set(
        childRef,
        new TreeVertexRecord<TestTTP>({
          metadata: {
            resolutionContext: makeContext(unknownParentRef, childHint),
          },
          children: [],
        }),
      ),
    ).toThrow(/not mutated parent ref/i);
    expect(container.resolvedTree.has(childRef)).toBe(false);
    expect(container.originalTreeRefsMap?.has(childRef)).toBe(false);

    const parentRef = makeRef('parent');
    container.setRoot(parentRef);
    expect(() =>
      container.set(
        parentRef,
        new TreeVertexRecord<TestTTP>({
          metadata: { resolutionContext: null },
          children: [childRef],
        }),
      ),
    ).toThrow(/not mutated child ref/i);
    expect(container.resolvedTree.getChildrenOf(parentRef)).toEqual([]);
  });

  test('shares all three resolved-tree stores when a container is injected', () => {
    const source = runnerInternals(
      makeTraversal(node('unused'), true).createRunner(),
    ).resolvedTreesContainer;
    const rootRef = makeRef('root');
    const firstHint = node('first');
    const firstRef = makeRef('first');
    source.setRoot(rootRef);
    source.setWithResolutionContext(firstRef, makeContext(rootRef, firstHint));
    source.pushChildrenTo(rootRef, [firstRef]);

    const injected = runnerInternals(
      createInternalDepthFirstTreeRunner({
        ...traversalInternals(makeTraversal(node('ignored'))).icfg,
        traversalRunnerInternalObjects: { resolvedTreesContainer: source },
      }),
    ).resolvedTreesContainer;
    expect(injected.resolvedTree).toBe(source.resolvedTree);
    expect(injected.originalTreeView).toBe(source.originalTreeView);
    expect(injected.originalTreeRefsMap).toBe(source.originalTreeRefsMap);

    const secondHint = node('second');
    const secondRef = makeRef('second');
    injected.setWithResolutionContext(
      secondRef,
      makeContext(rootRef, secondHint),
    );
    injected.pushChildrenTo(rootRef, [secondRef]);
    const { tree: savedTree, refs: savedRefs } = getSavedParts(source);
    const savedRootRef = savedRefs.get(rootRef);
    const savedFirstRef = savedRefs.get(firstRef);
    const savedSecondRef = savedRefs.get(secondRef);
    expect(savedRootRef).toBeDefined();
    expect(savedTree.getChildrenOf(savedRootRef!)).toEqual([
      savedFirstRef,
      savedSecondRef,
    ]);
  });

  test('isolates rewrite, deletion, and pruning while retaining only resolved vertices', () => {
    const originalLeaf = node('original-leaf');
    const replacementLeaf = node('replacement-leaf');
    const root = node(
      'root',
      node('rewrite', originalLeaf),
      node('delete', node('deleted-hidden')),
      node('prune', node('pruned-hidden')),
      node('keep'),
    );
    const traversal = makeTraversal(root, true);
    traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, (vertex) => {
      switch (vertex.getData()) {
        case 'root':
          return {
            commands: [
              {
                commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
                commandArguments: { newData: 'changed-root' },
              },
            ],
          };
        case 'rewrite':
          return {
            commands: [
              {
                commandName: TraversalVisitorCommandName.REWRITE_CHILD_HINTS,
                commandArguments: { newHints: [replacementLeaf] },
              },
            ],
          };
        case 'delete':
          return {
            commands: [
              { commandName: TraversalVisitorCommandName.DELETE_TREE_SUBTREE },
            ],
          };
        case 'prune':
          return {
            commands: [
              {
                commandName:
                  TraversalVisitorCommandName.SKIP_REMAINING_CHILDREN,
              },
            ],
          };
        default:
          return undefined;
      }
    });

    const runner = traversal.createRunner().run();
    const activeTree = internalTreeStore(runner);
    const activeRootRef = activeTree.getRoot();
    if (activeRootRef === null) throw new Error('Expected an active root');
    expect(activeRootRef.getValue().getData()).toBe('changed-root');
    expect(
      activeTree
        .getChildrenOf(activeRootRef)
        ?.map((ref) => ref.getValue().getData()),
    ).toEqual(['rewrite', 'prune', 'keep']);
    const activeRewriteRef = activeTree.getChildrenOf(activeRootRef)?.[0];
    expect(
      activeTree
        .getChildrenOf(activeRewriteRef!)
        ?.map((ref) => ref.getValue().getData()),
    ).toEqual(['replacement-leaf']);

    const { tree: savedTree } = getSavedParts(
      runnerInternals(runner).resolvedTreesContainer,
    );
    const savedRootRef = savedTree.getRoot();
    if (savedRootRef === null) throw new Error('Expected a saved root');
    expect(savedRootRef.getValue().getData()).toBe('root');
    expect(
      savedTree
        .getChildrenOf(savedRootRef)
        ?.map((ref) => ref.getValue().getData()),
    ).toEqual(['rewrite', 'delete', 'prune', 'keep']);
    const savedChildren = savedTree.getChildrenOf(savedRootRef) ?? [];
    const savedRewriteRef = savedChildren[0]!;
    const savedDeletedRef = savedChildren[1]!;
    const savedPrunedRef = savedChildren[2]!;
    expect(
      savedTree
        .getChildrenOf(savedRewriteRef)
        ?.map((ref) => ref.getValue().getData()),
    ).toEqual(['replacement-leaf']);
    expect(savedRewriteRef.getValue().getChildHints()).toEqual([originalLeaf]);
    expect(savedTree.getChildrenOf(savedDeletedRef)).toEqual([]);
    expect(savedTree.getChildrenOf(savedPrunedRef)).toEqual([]);

    activeRootRef.getValue().getChildHints().push(node('active-only'));
    expect(savedRootRef.getValue().getChildHints()).toHaveLength(4);
  });

  test('copies structural arrays while shallowly sharing user data', () => {
    const sharedData = { label: 'root', nested: { count: 1 } };
    const root: MutableNode = { $data: sharedData, $childHints: [] };
    const runner = new DepthFirstTreeTraversal<MutableDataTTP>({
      traversableTree: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: { vertexContent: root },
        }),
        resolveChild: (hint) => ({
          kind: 'found' as const,
          vertex: { vertexContent: hint },
        }),
      },
      retainOriginalTreeStructure: true,
    })
      .createRunner()
      .run();
    const activeRootRef = internalTreeStore(runner).getRoot();
    const savedRootRef =
      runnerInternals(
        runner,
      ).resolvedTreesContainer.originalTreeView?.getRoot();
    if (activeRootRef === null || savedRootRef == null) {
      throw new Error('Expected active and saved roots');
    }

    expect(savedRootRef).not.toBe(activeRootRef);
    expect(savedRootRef.getValue()).not.toBe(activeRootRef.getValue());
    expect(savedRootRef.getValue().getData()).toBe(sharedData);
    expect(savedRootRef.getValue().getChildHints()).not.toBe(
      activeRootRef.getValue().getChildHints(),
    );

    activeRootRef.getValue().getData().nested.count = 2;
    expect(savedRootRef.getValue().getData().nested.count).toBe(2);
  });
});

describe('ResolvedTreeStore paths', () => {
  test('rejects a path request for a ref that was never resolved', () => {
    const tree = makeTraversal(node('root'))
      .createRunner()
      .run()
      .getResolvedTreeView();

    expect(() => tree.requirePathTo(makeRef('missing'))).toThrow(
      /could not find ref/i,
    );
  });

  test('combines noRoot and noSelf at the root, branch, and leaf', () => {
    const tree = makeTraversal(
      node('root', node('branch', node('leaf')), node('sibling')),
    )
      .createRunner()
      .run()
      .getResolvedTreeView();
    const rootRef = tree.getRoot();
    if (rootRef === null) throw new Error('Expected a root');
    const branchRef = tree.getChildrenOf(rootRef)?.[0];
    const leafRef = branchRef && tree.getChildrenOf(branchRef)?.[0];
    if (branchRef === undefined || leafRef === undefined) {
      throw new Error('Expected a branch and leaf');
    }

    expect(tree.requirePathTo(leafRef)).toEqual([rootRef, branchRef, leafRef]);
    expect(tree.requirePathTo(leafRef, { noRoot: true })).toEqual([
      branchRef,
      leafRef,
    ]);
    expect(tree.requirePathTo(leafRef, { noSelf: true })).toEqual([
      rootRef,
      branchRef,
    ]);
    expect(tree.requirePathTo(leafRef, { noRoot: true, noSelf: true })).toEqual(
      [branchRef],
    );
    expect(tree.requirePathTo(rootRef, { noRoot: true })).toEqual([]);
    expect(tree.requirePathTo(rootRef, { noSelf: true })).toEqual([]);
    expect(tree.requirePathTo(rootRef, { noRoot: true, noSelf: true })).toEqual(
      [],
    );
  });

  test('keeps path semantics when a resolved tree is traversed again', () => {
    const firstTree = internalTreeStore(
      makeTraversal(node('root', node('branch', node('leaf')), node('sibling')))
        .createRunner()
        .run(),
    );
    const secondTree = new DepthFirstTreeTraversal({
      traversableTree: firstTree,
    })
      .createRunner()
      .run()
      .getResolvedTreeView();
    const secondRootRef = secondTree.getRoot();
    if (secondRootRef === null) throw new Error('Expected a second root');
    const secondBranchRef = secondTree.getChildrenOf(secondRootRef)?.[0];
    const secondLeafRef =
      secondBranchRef && secondTree.getChildrenOf(secondBranchRef)?.[0];
    if (secondBranchRef === undefined || secondLeafRef === undefined) {
      throw new Error('Expected a second branch and leaf');
    }

    expect(
      secondTree
        .requirePathTo(secondLeafRef, { noRoot: true })
        .map((ref) => ref.getValue().getData().getValue().getData()),
    ).toEqual(['branch', 'leaf']);
    expect(secondRootRef.getValue().getData()).toBe(firstTree.getRoot());
    expect(secondRootRef).not.toBe(firstTree.getRoot());
  });
});

describe('ResolvedTreeStore deletion boundaries', () => {
  test('deletes a 20,000-level resolved subtree iteratively', () => {
    const tree = new ResolvedTreeStore<TestTTP>();
    const rootRef = makeRef('root');
    tree.setRoot(rootRef);
    tree.set(
      rootRef,
      new TreeVertexRecord<TestTTP>({
        metadata: { resolutionContext: null },
        children: [],
      }),
    );
    let parentRef = rootRef;
    let deepestRef = rootRef;
    for (let depth = 1; depth <= 20_000; depth++) {
      const hint = node(String(depth));
      const childRef = makeRef(String(depth));
      tree.set(
        childRef,
        new TreeVertexRecord<TestTTP>({
          metadata: { resolutionContext: makeContext(parentRef, hint, depth) },
          children: [],
        }),
      );
      tree.pushChildrenTo(parentRef, [childRef]);
      parentRef = childRef;
      deepestRef = childRef;
    }

    expect(() => tree.deleteSubtree(rootRef)).not.toThrow();
    expect(tree.getRoot()).toBeNull();
    expect(tree.has(deepestRef)).toBe(false);
  });

  test('deletes every child of a 25,000-wide resolved root', () => {
    const tree = new ResolvedTreeStore<TestTTP>();
    const rootRef = makeRef('root');
    tree.setRoot(rootRef);
    tree.set(
      rootRef,
      new TreeVertexRecord<TestTTP>({
        metadata: { resolutionContext: null },
        children: [],
      }),
    );
    const children = Array.from({ length: 25_000 }, (_, index) => {
      const hint = node(String(index));
      const childRef = makeRef(String(index));
      tree.set(
        childRef,
        new TreeVertexRecord<TestTTP>({
          metadata: { resolutionContext: makeContext(rootRef, hint) },
          children: [],
        }),
      );
      return childRef;
    });
    tree.pushChildrenTo(rootRef, children);

    tree.deleteSubtree(rootRef);

    expect(tree.getRoot()).toBeNull();
    expect(tree.has(children[0]!)).toBe(false);
    expect(tree.has(children[12_500]!)).toBe(false);
    expect(tree.has(children[24_999]!)).toBe(false);
  });

  test('reports a missing parent when children cannot be appended', () => {
    const tree = new ResolvedTreeStore<TestTTP>();

    expect(() => tree.pushChildrenTo(makeRef('missing'), [])).toThrow(
      /could not find ref/i,
    );
  });
});

describe('MutableRef identity', () => {
  test('keeps a stable unique id while its target is replaced', () => {
    const first = makeRef('first');
    const second = makeRef('second');
    const firstId = first.getRefId();

    expect(firstId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    first.setValue(makeRef('replacement').getValue());

    expect(first.getRefId()).toBe(firstId);
    expect(first.getRefId()).not.toBe(second.getRefId());
    expect(first.getValue().getData()).toBe('replacement');
  });
});
