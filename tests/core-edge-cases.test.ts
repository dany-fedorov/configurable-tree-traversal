import { createVertexHandleFacet } from '../src/core/observationFacets';
import { internalTreeStore } from './internal-runner-fixtures';
import type { MutableTreeChildDiscoveryContext as ChildDiscoveryContext } from '../src/core/ResolvedTree';
import type { DepthFirstTraversalResolvedTreesContainer } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import {
  DepthFirstTreeVisitPhase,
  DepthFirstTreeTraversalBuilder,
  MutableValueReference,
  MutableResolvedTreeStore,
  TraversalVisitorCommandName,
  MutableTreeVertexTopologyRecord,
  Vertex,
  type VertexDataAndChildHintTypes,
} from '../src';
import {
  createInternalDepthFirstTreeRunner,
  runnerInternals,
  traversalInternals,
} from './internal-runner-fixtures';

type Node = { $vertexData: string; $childDiscoveryHints: Node[] };
type TestTTP = VertexDataAndChildHintTypes<string, Node>;
type MutableNode = {
  $vertexData: { label: string; nested: { count: number } };
  $childDiscoveryHints: MutableNode[];
};
type MutableDataTTP = VertexDataAndChildHintTypes<
  MutableNode['$vertexData'],
  MutableNode
>;

const node = ($vertexData: string, ...$childDiscoveryHints: Node[]): Node => ({
  $vertexData,
  $childDiscoveryHints,
});

function makeTraversal(
  root: Node,
  retainDiscoveredTreeBeforeVisitorCommands = false,
) {
  return new DepthFirstTreeTraversalBuilder<TestTTP>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: { vertexContentInput: root },
      }),
      resolveChildVertexFromHint: (hint) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: { vertexContentInput: hint },
      }),
    },
    retainDiscoveredTreeBeforeVisitorCommands,
  });
}

function makeRef(
  data: string,
  childrenHints: Node[] = [],
): MutableValueReference<Vertex<TestTTP>> {
  return new MutableValueReference(
    new Vertex<TestTTP>({
      $vertexData: data,
      $childDiscoveryHints: childrenHints,
    }),
  );
}

function makeContext(
  parentVertexHandle: MutableValueReference<Vertex<TestTTP>>,
  childDiscoveryHint: Node,
  depth = 1,
): ChildDiscoveryContext<TestTTP> {
  return {
    discoveryDepthInEdges: depth,
    parentVertexAtChildResolution: parentVertexHandle.getReferencedValue(),
    parentVertexReference: parentVertexHandle,
    parentChildHintIndex: 0,
    childDiscoveryHint: childDiscoveryHint,
  };
}

function getSavedParts(
  container: DepthFirstTraversalResolvedTreesContainer<TestTTP, TestTTP>,
): {
  tree: MutableResolvedTreeStore<TestTTP>;
  refs: NonNullable<typeof container.originalTreeRefsMap>;
} {
  const tree = container.livePreCommandDiscoveredTreeView;
  const refs = container.originalTreeRefsMap;
  if (tree === null || refs === null) {
    throw new Error('Expected original resolved-tree capture to be enabled');
  }
  return { tree, refs };
}

describe('saved resolved-tree consistency', () => {
  test('setting an existing ref with children keeps one saved ref and translates its topology', () => {
    const container = runnerInternals(
      makeTraversal(
        node('unused'),
        true,
      ).createIndependentRunnerFromCurrentOptions(),
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
      new MutableTreeVertexTopologyRecord<TestTTP>({
        metadata: { childDiscoveryContext: null },
        childReferences: [childRef],
      }),
    );

    expect(savedRefs.get(parentRef)).toBe(firstSavedParentRef);
    expect(savedTree.getRootVertexReferenceOrNull()).toBe(firstSavedParentRef);
    expect(
      savedTree.getDetachedChildReferenceListOrNull(firstSavedParentRef),
    ).toEqual([savedChildRef]);
    expect(savedTree.getParentVertexReferenceOrNull(savedChildRef)).toBe(
      firstSavedParentRef,
    );
  });

  test('rejecting an unknown saved child does not partially update the active tree', () => {
    const container = runnerInternals(
      makeTraversal(
        node('unused'),
        true,
      ).createIndependentRunnerFromCurrentOptions(),
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

    expect(
      container.resolvedTree.getDetachedChildReferenceListOrNull(parentRef),
    ).toEqual([]);
    expect(
      savedTree.getDetachedChildReferenceListOrNull(savedParentRef),
    ).toEqual([]);
  });

  test('keeps the first vertex snapshot when an existing active ref is rewritten', () => {
    const container = runnerInternals(
      makeTraversal(
        node('unused'),
        true,
      ).createIndependentRunnerFromCurrentOptions(),
    ).resolvedTreesContainer;
    const rootRef = makeRef('original');
    container.setRoot(rootRef);
    const { tree: savedTree, refs: savedRefs } = getSavedParts(container);
    const savedRootRef = savedRefs.get(rootRef);
    if (savedRootRef === undefined) {
      throw new Error('Expected a saved root ref');
    }

    rootRef.replaceReferencedValue(
      rootRef
        .getReferencedValue()
        .createEditableShallowCloneWithContentOverrides({
          $vertexData: 'rewritten',
        }),
    );
    container.set(
      rootRef,
      new MutableTreeVertexTopologyRecord<TestTTP>({
        metadata: { childDiscoveryContext: null },
        childReferences: [],
      }),
    );

    expect(savedRefs.get(rootRef)).toBe(savedRootRef);
    expect(
      savedTree
        .getRootVertexReferenceOrNull()
        ?.getReferencedValue()
        .getVertexData(),
    ).toBe('original');
    expect(
      container.resolvedTree
        .getRootVertexReferenceOrNull()
        ?.getReferencedValue()
        .getVertexData(),
    ).toBe('rewritten');
  });

  test('rejects unresolved parent and child mappings without inserting the vertex', () => {
    const container = runnerInternals(
      makeTraversal(
        node('unused'),
        true,
      ).createIndependentRunnerFromCurrentOptions(),
    ).resolvedTreesContainer;
    const unknownParentRef = makeRef('unknown-parent');
    const childHint = node('child');
    const childRef = makeRef('child');

    expect(() =>
      container.set(
        childRef,
        new MutableTreeVertexTopologyRecord<TestTTP>({
          metadata: {
            childDiscoveryContext: makeContext(unknownParentRef, childHint),
          },
          childReferences: [],
        }),
      ),
    ).toThrow(/not mutated parent ref/i);
    expect(container.resolvedTree.containsVertexReference(childRef)).toBe(
      false,
    );
    expect(container.originalTreeRefsMap?.has(childRef)).toBe(false);

    const parentRef = makeRef('parent');
    container.setRoot(parentRef);
    expect(() =>
      container.set(
        parentRef,
        new MutableTreeVertexTopologyRecord<TestTTP>({
          metadata: { childDiscoveryContext: null },
          childReferences: [childRef],
        }),
      ),
    ).toThrow(/not mutated child ref/i);
    expect(
      container.resolvedTree.getDetachedChildReferenceListOrNull(parentRef),
    ).toEqual([]);
  });

  test('shares all three resolved-tree stores when a container is injected', () => {
    const source = runnerInternals(
      makeTraversal(
        node('unused'),
        true,
      ).createIndependentRunnerFromCurrentOptions(),
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
    expect(injected.livePreCommandDiscoveredTreeView).toBe(
      source.livePreCommandDiscoveredTreeView,
    );
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
    expect(
      savedTree.getDetachedChildReferenceListOrNull(savedRootRef!),
    ).toEqual([savedFirstRef, savedSecondRef]);
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
    traversal.registerVisitorForPhase(
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
      (vertex) => {
        switch (vertex.getVertexData()) {
          case 'root':
            return {
              commands: [
                {
                  commandName:
                    TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
                  commandArguments: { replacementVertexData: 'changed-root' },
                },
              ],
            };
          case 'rewrite':
            return {
              commands: [
                {
                  commandName:
                    TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
                  commandArguments: {
                    replacementChildHints: [replacementLeaf],
                  },
                },
              ],
            };
          case 'delete':
            return {
              commands: [
                {
                  commandName:
                    TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
                },
              ],
            };
          case 'prune':
            return {
              commands: [
                {
                  commandName:
                    TraversalVisitorCommandName.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX,
                },
              ],
            };
          default:
            return undefined;
        }
      },
    );

    const runner = traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    const activeTree = internalTreeStore(runner);
    const activeRootRef = activeTree.getRootVertexReferenceOrNull();
    if (activeRootRef === null) throw new Error('Expected an active root');
    expect(activeRootRef.getReferencedValue().getVertexData()).toBe(
      'changed-root',
    );
    expect(
      activeTree
        .getDetachedChildReferenceListOrNull(activeRootRef)
        ?.map((ref) => ref.getReferencedValue().getVertexData()),
    ).toEqual(['rewrite', 'prune', 'keep']);
    const activeRewriteRef =
      activeTree.getDetachedChildReferenceListOrNull(activeRootRef)?.[0];
    expect(
      activeTree
        .getDetachedChildReferenceListOrNull(activeRewriteRef!)
        ?.map((ref) => ref.getReferencedValue().getVertexData()),
    ).toEqual(['replacement-leaf']);

    const { tree: savedTree } = getSavedParts(
      runnerInternals(runner).resolvedTreesContainer,
    );
    const savedRootRef = savedTree.getRootVertexReferenceOrNull();
    if (savedRootRef === null) throw new Error('Expected a saved root');
    expect(savedRootRef.getReferencedValue().getVertexData()).toBe('root');
    expect(
      savedTree
        .getDetachedChildReferenceListOrNull(savedRootRef)
        ?.map((ref) => ref.getReferencedValue().getVertexData()),
    ).toEqual(['rewrite', 'delete', 'prune', 'keep']);
    const savedChildren =
      savedTree.getDetachedChildReferenceListOrNull(savedRootRef) ?? [];
    const savedRewriteRef = savedChildren[0]!;
    const savedDeletedRef = savedChildren[1]!;
    const savedPrunedRef = savedChildren[2]!;
    expect(
      savedTree
        .getDetachedChildReferenceListOrNull(savedRewriteRef)
        ?.map((ref) => ref.getReferencedValue().getVertexData()),
    ).toEqual(['replacement-leaf']);
    expect(
      savedRewriteRef.getReferencedValue().getMutableChildDiscoveryHints(),
    ).toEqual([originalLeaf]);
    expect(
      savedTree.getDetachedChildReferenceListOrNull(savedDeletedRef),
    ).toEqual([]);
    expect(
      savedTree.getDetachedChildReferenceListOrNull(savedPrunedRef),
    ).toEqual([]);

    activeRootRef
      .getReferencedValue()
      .getMutableChildDiscoveryHints()
      .push(node('active-only'));
    expect(
      savedRootRef.getReferencedValue().getMutableChildDiscoveryHints(),
    ).toHaveLength(4);
  });

  test('copies structural arrays while shallowly sharing user data', () => {
    const sharedData = { label: 'root', nested: { count: 1 } };
    const root: MutableNode = {
      $vertexData: sharedData,
      $childDiscoveryHints: [],
    };
    const runner = new DepthFirstTreeTraversalBuilder<MutableDataTTP>({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: { vertexContentInput: root },
        }),
        resolveChildVertexFromHint: (hint) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: { vertexContentInput: hint },
        }),
      },
      retainDiscoveredTreeBeforeVisitorCommands: true,
    })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    const activeRootRef =
      internalTreeStore(runner).getRootVertexReferenceOrNull();
    const savedRootRef =
      runnerInternals(
        runner,
      ).resolvedTreesContainer.livePreCommandDiscoveredTreeView?.getRootVertexReferenceOrNull();
    if (activeRootRef === null || savedRootRef == null) {
      throw new Error('Expected active and saved roots');
    }

    expect(savedRootRef).not.toBe(activeRootRef);
    expect(savedRootRef.getReferencedValue()).not.toBe(
      activeRootRef.getReferencedValue(),
    );
    expect(savedRootRef.getReferencedValue().getVertexData()).toBe(sharedData);
    expect(
      savedRootRef.getReferencedValue().getMutableChildDiscoveryHints(),
    ).not.toBe(
      activeRootRef.getReferencedValue().getMutableChildDiscoveryHints(),
    );

    activeRootRef.getReferencedValue().getVertexData().nested.count = 2;
    expect(savedRootRef.getReferencedValue().getVertexData().nested.count).toBe(
      2,
    );
  });
});

describe('ResolvedTreeStore paths', () => {
  test('rejects a path request for a ref that was never resolved', () => {
    const tree = makeTraversal(node('root'))
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal()
      .getLiveResolvedTreeView();

    expect(() =>
      tree.requireStructuralAncestorPathTo(
        createVertexHandleFacet(makeRef('missing')),
      ),
    ).toThrow(/could not find ref/i);
  });

  test('combines noRoot and noSelf at the root, branch, and leaf', () => {
    const tree = makeTraversal(
      node('root', node('branch', node('leaf')), node('sibling')),
    )
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal()
      .getLiveResolvedTreeView();
    const rootRef = tree.getRootVertexHandleOrNull();
    if (rootRef === null) throw new Error('Expected a root');
    const branchRef = tree.getChildVertexHandlesOrNull(rootRef)?.[0];
    const leafRef =
      branchRef && tree.getChildVertexHandlesOrNull(branchRef)?.[0];
    if (branchRef === undefined || leafRef === undefined) {
      throw new Error('Expected a branch and leaf');
    }

    expect(tree.requireStructuralAncestorPathTo(leafRef)).toEqual([
      rootRef,
      branchRef,
      leafRef,
    ]);
    expect(
      tree.requireStructuralAncestorPathTo(leafRef, {
        includeDesignatedRoot: false,
      }),
    ).toEqual([branchRef, leafRef]);
    expect(
      tree.requireStructuralAncestorPathTo(leafRef, {
        includeTargetVertex: false,
      }),
    ).toEqual([rootRef, branchRef]);
    expect(
      tree.requireStructuralAncestorPathTo(leafRef, {
        includeDesignatedRoot: false,
        includeTargetVertex: false,
      }),
    ).toEqual([branchRef]);
    expect(
      tree.requireStructuralAncestorPathTo(rootRef, {
        includeDesignatedRoot: false,
      }),
    ).toEqual([]);
    expect(
      tree.requireStructuralAncestorPathTo(rootRef, {
        includeTargetVertex: false,
      }),
    ).toEqual([]);
    expect(
      tree.requireStructuralAncestorPathTo(rootRef, {
        includeDesignatedRoot: false,
        includeTargetVertex: false,
      }),
    ).toEqual([]);
  });

  test('keeps path semantics when a resolved tree is traversed again', () => {
    const firstTree = internalTreeStore(
      makeTraversal(node('root', node('branch', node('leaf')), node('sibling')))
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    );
    const secondTree = new DepthFirstTreeTraversalBuilder({
      treeDiscoverySource: firstTree,
    })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal()
      .getLiveResolvedTreeView();
    const secondRootRef = secondTree.getRootVertexHandleOrNull();
    if (secondRootRef === null) throw new Error('Expected a second root');
    const secondBranchRef =
      secondTree.getChildVertexHandlesOrNull(secondRootRef)?.[0];
    const secondLeafRef =
      secondBranchRef &&
      secondTree.getChildVertexHandlesOrNull(secondBranchRef)?.[0];
    if (secondBranchRef === undefined || secondLeafRef === undefined) {
      throw new Error('Expected a second branch and leaf');
    }

    expect(
      secondTree
        .requireStructuralAncestorPathTo(secondLeafRef, {
          includeDesignatedRoot: false,
        })
        .map((ref) =>
          ref
            .getCurrentVertexView()
            .getVertexData()
            .getReferencedValue()
            .getVertexData(),
        ),
    ).toEqual(['branch', 'leaf']);
    expect(secondRootRef.getCurrentVertexView().getVertexData()).toBe(
      firstTree.getRootVertexReferenceOrNull(),
    );
    expect(secondRootRef).not.toBe(firstTree.getRootVertexReferenceOrNull());
  });
});

describe('ResolvedTreeStore deletion boundaries', () => {
  test('deletes a 20,000-level resolved subtree iteratively', () => {
    const tree = new MutableResolvedTreeStore<TestTTP>();
    const rootRef = makeRef('root');
    tree.setRootVertexReference(rootRef);
    tree.setVertexRecord(
      rootRef,
      new MutableTreeVertexTopologyRecord<TestTTP>({
        metadata: { childDiscoveryContext: null },
        childReferences: [],
      }),
    );
    let parentRef = rootRef;
    let deepestRef = rootRef;
    for (let depth = 1; depth <= 20_000; depth++) {
      const hint = node(String(depth));
      const childRef = makeRef(String(depth));
      tree.setVertexRecord(
        childRef,
        new MutableTreeVertexTopologyRecord<TestTTP>({
          metadata: {
            childDiscoveryContext: makeContext(parentRef, hint, depth),
          },
          childReferences: [],
        }),
      );
      tree.appendChildReferencesTo(parentRef, [childRef]);
      parentRef = childRef;
      deepestRef = childRef;
    }

    expect(() => tree.deleteSubtree(rootRef)).not.toThrow();
    expect(tree.getRootVertexReferenceOrNull()).toBeNull();
    expect(tree.containsVertexReference(deepestRef)).toBe(false);
  });

  test('deletes every child of a 25,000-wide resolved root', () => {
    const tree = new MutableResolvedTreeStore<TestTTP>();
    const rootRef = makeRef('root');
    tree.setRootVertexReference(rootRef);
    tree.setVertexRecord(
      rootRef,
      new MutableTreeVertexTopologyRecord<TestTTP>({
        metadata: { childDiscoveryContext: null },
        childReferences: [],
      }),
    );
    const children = Array.from({ length: 25_000 }, (_, index) => {
      const hint = node(String(index));
      const childRef = makeRef(String(index));
      tree.setVertexRecord(
        childRef,
        new MutableTreeVertexTopologyRecord<TestTTP>({
          metadata: { childDiscoveryContext: makeContext(rootRef, hint) },
          childReferences: [],
        }),
      );
      return childRef;
    });
    tree.appendChildReferencesTo(rootRef, children);

    tree.deleteSubtree(rootRef);

    expect(tree.getRootVertexReferenceOrNull()).toBeNull();
    expect(tree.containsVertexReference(children[0]!)).toBe(false);
    expect(tree.containsVertexReference(children[12_500]!)).toBe(false);
    expect(tree.containsVertexReference(children[24_999]!)).toBe(false);
  });

  test('reports a missing parent when children cannot be appended', () => {
    const tree = new MutableResolvedTreeStore<TestTTP>();

    expect(() => tree.appendChildReferencesTo(makeRef('missing'), [])).toThrow(
      /could not find ref/i,
    );
  });
});

describe('MutableRef identity', () => {
  test('keeps a stable unique id while its target is replaced', () => {
    const first = makeRef('first');
    const second = makeRef('second');
    const firstId = first.getReferenceIdentity();

    expect(firstId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    first.replaceReferencedValue(makeRef('replacement').getReferencedValue());

    expect(first.getReferenceIdentity()).toBe(firstId);
    expect(first.getReferenceIdentity()).not.toBe(
      second.getReferenceIdentity(),
    );
    expect(first.getReferencedValue().getVertexData()).toBe('replacement');
  });
});
