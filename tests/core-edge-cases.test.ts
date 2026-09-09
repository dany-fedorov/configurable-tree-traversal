import {
  CTTRef,
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
  DepthFirstTraversalResolvedTreesContainer,
  ResolvedTree,
  type TreeTypeParameters,
  TraversalVisitorCommandName,
  Vertex,
  VertexResolved,
  type VertexResolutionContext,
} from '../src';

type Node = { $d: string; $c: Node[] };
type TestTTP = TreeTypeParameters<string, Node>;
type MutableNode = {
  $d: { label: string; nested: { count: number } };
  $c: MutableNode[];
};
type MutableDataTTP = TreeTypeParameters<MutableNode['$d'], MutableNode>;

const node = ($d: string, ...$c: Node[]): Node => ({ $d, $c });

function makeTraversal(root: Node, saveNotMutatedResolvedTree = false) {
  return new DepthFirstTraversal<TestTTP>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: root }),
      makeVertex: (hint) => ({ vertexContent: hint }),
    },
    saveNotMutatedResolvedTree,
  });
}

function makeRef(
  data: string,
  childrenHints: Node[] = [],
): CTTRef<Vertex<TestTTP>> {
  return new CTTRef(
    new Vertex<TestTTP>({
      $d: data,
      $c: childrenHints,
    }),
  );
}

function makeContext(
  parentVertexRef: CTTRef<Vertex<TestTTP>>,
  vertexHint: Node,
  depth = 1,
): VertexResolutionContext<TestTTP> {
  return {
    depth,
    parentVertex: parentVertexRef.unref(),
    parentVertexRef,
    hintIndex: 0,
    vertexHint,
  };
}

function getSavedParts(
  container: DepthFirstTraversalResolvedTreesContainer<TestTTP, TestTTP>,
): {
  tree: ResolvedTree<TestTTP>;
  refs: NonNullable<typeof container.notMutatedResolvedTreeRefsMap>;
} {
  const tree = container.notMutatedResolvedTree;
  const refs = container.notMutatedResolvedTreeRefsMap;
  if (tree === null || refs === null) {
    throw new Error('Expected original resolved-tree capture to be enabled');
  }
  return { tree, refs };
}

describe('saved resolved-tree consistency', () => {
  test('setting an existing ref with children keeps one saved ref and translates its topology', () => {
    const container = makeTraversal(node('unused'), true).makeRunner()
      .resolvedTreesContainer;
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
      new VertexResolved<TestTTP>({
        $d: { resolutionContext: null },
        $c: [childRef],
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
    const container = makeTraversal(node('unused'), true).makeRunner()
      .resolvedTreesContainer;
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
    const container = makeTraversal(node('unused'), true).makeRunner()
      .resolvedTreesContainer;
    const rootRef = makeRef('original');
    container.setRoot(rootRef);
    const { tree: savedTree, refs: savedRefs } = getSavedParts(container);
    const savedRootRef = savedRefs.get(rootRef);
    if (savedRootRef === undefined) {
      throw new Error('Expected a saved root ref');
    }

    rootRef.setPointsTo(rootRef.unref().clone({ $d: 'rewritten' }));
    container.set(
      rootRef,
      new VertexResolved<TestTTP>({
        $d: { resolutionContext: null },
        $c: [],
      }),
    );

    expect(savedRefs.get(rootRef)).toBe(savedRootRef);
    expect(savedTree.getRoot()?.unref().getData()).toBe('original');
    expect(container.resolvedTree.getRoot()?.unref().getData()).toBe(
      'rewritten',
    );
  });

  test('rejects unresolved parent and child mappings without inserting the vertex', () => {
    const container = makeTraversal(node('unused'), true).makeRunner()
      .resolvedTreesContainer;
    const unknownParentRef = makeRef('unknown-parent');
    const childHint = node('child');
    const childRef = makeRef('child');

    expect(() =>
      container.set(
        childRef,
        new VertexResolved<TestTTP>({
          $d: { resolutionContext: makeContext(unknownParentRef, childHint) },
          $c: [],
        }),
      ),
    ).toThrow(/not mutated parent ref/i);
    expect(container.resolvedTree.has(childRef)).toBe(false);
    expect(container.notMutatedResolvedTreeRefsMap?.has(childRef)).toBe(false);

    const parentRef = makeRef('parent');
    container.setRoot(parentRef);
    expect(() =>
      container.set(
        parentRef,
        new VertexResolved<TestTTP>({
          $d: { resolutionContext: null },
          $c: [childRef],
        }),
      ),
    ).toThrow(/not mutated child ref/i);
    expect(container.resolvedTree.getChildrenOf(parentRef)).toEqual([]);
  });

  test('shares all three resolved-tree stores when a container is injected', () => {
    const source = makeTraversal(node('unused'), true).makeRunner()
      .resolvedTreesContainer;
    const rootRef = makeRef('root');
    const firstHint = node('first');
    const firstRef = makeRef('first');
    source.setRoot(rootRef);
    source.setWithResolutionContext(firstRef, makeContext(rootRef, firstHint));
    source.pushChildrenTo(rootRef, [firstRef]);

    const injected = makeTraversal(node('ignored'))
      .configure({
        traversalRunnerInternalObjects: { resolvedTreesContainer: source },
      })
      .makeRunner().resolvedTreesContainer;
    expect(injected.resolvedTree).toBe(source.resolvedTree);
    expect(injected.notMutatedResolvedTree).toBe(source.notMutatedResolvedTree);
    expect(injected.notMutatedResolvedTreeRefsMap).toBe(
      source.notMutatedResolvedTreeRefsMap,
    );

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
    traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, (vertex) => {
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
                commandName:
                  TraversalVisitorCommandName.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
                commandArguments: { newHints: [replacementLeaf] },
              },
            ],
          };
        case 'delete':
          return {
            commands: [
              { commandName: TraversalVisitorCommandName.DELETE_VERTEX },
            ],
          };
        case 'prune':
          return {
            commands: [
              {
                commandName:
                  TraversalVisitorCommandName.DISABLE_SUBTREE_TRAVERSAL,
              },
            ],
          };
        default:
          return undefined;
      }
    });

    const runner = traversal.makeRunner().run();
    const activeTree = runner.getResolvedTree();
    const activeRootRef = activeTree.getRoot();
    if (activeRootRef === null) throw new Error('Expected an active root');
    expect(activeRootRef.unref().getData()).toBe('changed-root');
    expect(
      activeTree
        .getChildrenOf(activeRootRef)
        ?.map((ref) => ref.unref().getData()),
    ).toEqual(['rewrite', 'prune', 'keep']);
    const activeRewriteRef = activeTree.getChildrenOf(activeRootRef)?.[0];
    expect(
      activeTree
        .getChildrenOf(activeRewriteRef!)
        ?.map((ref) => ref.unref().getData()),
    ).toEqual(['replacement-leaf']);

    const { tree: savedTree } = getSavedParts(runner.resolvedTreesContainer);
    const savedRootRef = savedTree.getRoot();
    if (savedRootRef === null) throw new Error('Expected a saved root');
    expect(savedRootRef.unref().getData()).toBe('root');
    expect(
      savedTree
        .getChildrenOf(savedRootRef)
        ?.map((ref) => ref.unref().getData()),
    ).toEqual(['rewrite', 'delete', 'prune', 'keep']);
    const savedChildren = savedTree.getChildrenOf(savedRootRef) ?? [];
    const savedRewriteRef = savedChildren[0]!;
    const savedDeletedRef = savedChildren[1]!;
    const savedPrunedRef = savedChildren[2]!;
    expect(
      savedTree
        .getChildrenOf(savedRewriteRef)
        ?.map((ref) => ref.unref().getData()),
    ).toEqual(['replacement-leaf']);
    expect(savedRewriteRef.unref().getChildrenHints()).toEqual([originalLeaf]);
    expect(savedTree.getChildrenOf(savedDeletedRef)).toEqual([]);
    expect(savedTree.getChildrenOf(savedPrunedRef)).toEqual([]);

    activeRootRef.unref().getChildrenHints().push(node('active-only'));
    expect(savedRootRef.unref().getChildrenHints()).toHaveLength(4);
  });

  test('copies structural arrays while shallowly sharing user data', () => {
    const sharedData = { label: 'root', nested: { count: 1 } };
    const root: MutableNode = { $d: sharedData, $c: [] };
    const runner = new DepthFirstTraversal<MutableDataTTP>({
      traversableTree: {
        makeRoot: () => ({ vertexContent: root }),
        makeVertex: (hint) => ({ vertexContent: hint }),
      },
      saveNotMutatedResolvedTree: true,
    })
      .makeRunner()
      .run();
    const activeRootRef = runner.getResolvedTree().getRoot();
    const savedRootRef =
      runner.resolvedTreesContainer.notMutatedResolvedTree?.getRoot();
    if (activeRootRef === null || savedRootRef == null) {
      throw new Error('Expected active and saved roots');
    }

    expect(savedRootRef).not.toBe(activeRootRef);
    expect(savedRootRef.unref()).not.toBe(activeRootRef.unref());
    expect(savedRootRef.unref().getData()).toBe(sharedData);
    expect(savedRootRef.unref().getChildrenHints()).not.toBe(
      activeRootRef.unref().getChildrenHints(),
    );

    activeRootRef.unref().getData().nested.count = 2;
    expect(savedRootRef.unref().getData().nested.count).toBe(2);
  });
});

describe('ResolvedTree paths', () => {
  test('rejects a path request for a ref that was never resolved', () => {
    const tree = makeTraversal(node('root'))
      .makeRunner()
      .run()
      .getResolvedTree();

    expect(() => tree.getPathTo(makeRef('missing'))).toThrow(
      /could not find ref/i,
    );
  });

  test('combines noRoot and noSelf at the root, branch, and leaf', () => {
    const tree = makeTraversal(
      node('root', node('branch', node('leaf')), node('sibling')),
    )
      .makeRunner()
      .run()
      .getResolvedTree();
    const rootRef = tree.getRoot();
    if (rootRef === null) throw new Error('Expected a root');
    const branchRef = tree.getChildrenOf(rootRef)?.[0];
    const leafRef = branchRef && tree.getChildrenOf(branchRef)?.[0];
    if (branchRef === undefined || leafRef === undefined) {
      throw new Error('Expected a branch and leaf');
    }

    expect(tree.getPathTo(leafRef)).toEqual([rootRef, branchRef, leafRef]);
    expect(tree.getPathTo(leafRef, { noRoot: true })).toEqual([
      branchRef,
      leafRef,
    ]);
    expect(tree.getPathTo(leafRef, { noSelf: true })).toEqual([
      rootRef,
      branchRef,
    ]);
    expect(tree.getPathTo(leafRef, { noRoot: true, noSelf: true })).toEqual([
      branchRef,
    ]);
    expect(tree.getPathTo(rootRef, { noRoot: true })).toEqual([]);
    expect(tree.getPathTo(rootRef, { noSelf: true })).toEqual([]);
    expect(tree.getPathTo(rootRef, { noRoot: true, noSelf: true })).toEqual([]);
  });

  test('keeps path semantics when a resolved tree is traversed again', () => {
    const firstTree = makeTraversal(
      node('root', node('branch', node('leaf')), node('sibling')),
    )
      .makeRunner()
      .run()
      .getResolvedTree();
    const secondTree = new DepthFirstTraversal({ traversableTree: firstTree })
      .makeRunner()
      .run()
      .getResolvedTree();
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
        .getPathTo(secondLeafRef, { noRoot: true })
        .map((ref) => ref.unref().getData().unref().getData()),
    ).toEqual(['branch', 'leaf']);
    expect(secondRootRef.unref().getData()).toBe(firstTree.getRoot());
    expect(secondRootRef).not.toBe(firstTree.getRoot());
  });
});

describe('ResolvedTree deletion boundaries', () => {
  test('deletes a 20,000-level resolved subtree iteratively', () => {
    const tree = new ResolvedTree<TestTTP>();
    const rootRef = makeRef('root');
    tree.setRoot(rootRef);
    tree.set(
      rootRef,
      new VertexResolved<TestTTP>({
        $d: { resolutionContext: null },
        $c: [],
      }),
    );
    let parentRef = rootRef;
    let deepestRef = rootRef;
    for (let depth = 1; depth <= 20_000; depth++) {
      const hint = node(String(depth));
      const childRef = makeRef(String(depth));
      tree.set(
        childRef,
        new VertexResolved<TestTTP>({
          $d: { resolutionContext: makeContext(parentRef, hint, depth) },
          $c: [],
        }),
      );
      tree.pushChildrenTo(parentRef, [childRef]);
      parentRef = childRef;
      deepestRef = childRef;
    }

    expect(() => tree.delete(rootRef)).not.toThrow();
    expect(tree.getRoot()).toBeNull();
    expect(tree.has(deepestRef)).toBe(false);
  });

  test('deletes every child of a 25,000-wide resolved root', () => {
    const tree = new ResolvedTree<TestTTP>();
    const rootRef = makeRef('root');
    tree.setRoot(rootRef);
    tree.set(
      rootRef,
      new VertexResolved<TestTTP>({
        $d: { resolutionContext: null },
        $c: [],
      }),
    );
    const children = Array.from({ length: 25_000 }, (_, index) => {
      const hint = node(String(index));
      const childRef = makeRef(String(index));
      tree.set(
        childRef,
        new VertexResolved<TestTTP>({
          $d: { resolutionContext: makeContext(rootRef, hint) },
          $c: [],
        }),
      );
      return childRef;
    });
    tree.pushChildrenTo(rootRef, children);

    tree.delete(rootRef);

    expect(tree.getRoot()).toBeNull();
    expect(tree.has(children[0]!)).toBe(false);
    expect(tree.has(children[12_500]!)).toBe(false);
    expect(tree.has(children[24_999]!)).toBe(false);
  });

  test('reports a missing parent when children cannot be appended', () => {
    const tree = new ResolvedTree<TestTTP>();

    expect(() => tree.pushChildrenTo(makeRef('missing'), [])).toThrow(
      /could not find ref/i,
    );
  });
});

describe('CTTRef identity', () => {
  test('keeps a stable unique id while its target is replaced', () => {
    const first = makeRef('first');
    const second = makeRef('second');
    const firstId = first.getId();

    first.setPointsTo(makeRef('replacement').unref());

    expect(first.getId()).toBe(firstId);
    expect(first.getId()).not.toBe(second.getId());
    expect(first.unref().getData()).toBe('replacement');
  });
});
