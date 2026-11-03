import type { InternalChildDiscoveryContext as ChildDiscoveryContext } from '../src/core/ResolvedTree';
import { MutableValueReference } from '@core/CTTRef';
import {
  MutableResolvedTreeStore,
  MutableTreeVertexTopologyRecord,
} from '@core/ResolvedTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { Vertex } from '@core/Vertex';
import type { DepthFirstTreeResolvedOptions } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';

type TestTTP = VertexDataAndChildHintTypes<{ label: string }, string>;
type NullableDataTTP = VertexDataAndChildHintTypes<
  string | null | undefined,
  string
>;

function makeRef(
  label: string,
  children: string[] = [],
): MutableValueReference<Vertex<TestTTP>> {
  return new MutableValueReference(
    new Vertex<TestTTP>({
      $vertexData: { label },
      $childDiscoveryHints: children,
    }),
  );
}

function makeContext(
  parentVertexHandle: MutableValueReference<Vertex<TestTTP>>,
  childDiscoveryHint: string,
  depth: number,
  hintIndex = 0,
): ChildDiscoveryContext<TestTTP> {
  return {
    discoveryDepthInEdges: depth,
    parentVertexAtChildResolution: parentVertexHandle.getReferencedValue(),
    parentVertexHandle: parentVertexHandle,
    parentChildHintIndex: hintIndex,
    childDiscoveryHint: childDiscoveryHint,
  };
}

function setResolved(
  tree: MutableResolvedTreeStore<TestTTP>,
  ref: MutableValueReference<Vertex<TestTTP>>,
  childDiscoveryContext: ChildDiscoveryContext<TestTTP> | null,
  children: MutableValueReference<Vertex<TestTTP>>[] = [],
): void {
  tree.setVertexRecord(
    ref,
    new MutableTreeVertexTopologyRecord<TestTTP>({
      metadata: { childDiscoveryContext },
      childReferences: children,
    }),
  );
}

describe('Vertex', () => {
  test('clone preserves explicitly rewritten null and undefined data', () => {
    const vertex = new Vertex<NullableDataTTP>({
      $vertexData: 'before',
      $childDiscoveryHints: [],
    });

    expect(
      vertex
        .createEditableShallowCloneWithContentOverrides({ $vertexData: null })
        .getVertexData(),
    ).toBeNull();
    expect(
      vertex
        .createEditableShallowCloneWithContentOverrides({
          $vertexData: undefined,
        })
        .getVertexData(),
    ).toBeUndefined();
    expect(
      vertex.createEditableShallowCloneWithContentOverrides().getVertexData(),
    ).toBe('before');
  });
});

describe('MutableTreeVertexTopologyRecord', () => {
  test('clone owns its resolution context and child-reference array', () => {
    const parentRef = makeRef('parent');
    const firstChildRef = makeRef('first');
    const secondChildRef = makeRef('second');
    const original = new MutableTreeVertexTopologyRecord<TestTTP>({
      metadata: { childDiscoveryContext: makeContext(parentRef, 'first', 1) },
      childReferences: [firstChildRef],
    });

    const clone = original.shallowCloneWithRecordOverrides();
    clone.replaceChildDiscoveryContext(null);
    clone.appendChildReferences([secondChildRef]);

    expect(
      original.getMutableChildDiscoveryContextOrNull()?.parentVertexHandle,
    ).toBe(parentRef);
    expect(original.getMutableChildReferenceList()).toEqual([firstChildRef]);
    expect(clone.getMutableChildDiscoveryContextOrNull()).toBeNull();
    expect(clone.getMutableChildReferenceList()).toEqual([
      firstChildRef,
      secondChildRef,
    ]);
  });

  test('clone owns the nested resolution context object', () => {
    const parentRef = makeRef('parent');
    const original = new MutableTreeVertexTopologyRecord<TestTTP>({
      metadata: { childDiscoveryContext: makeContext(parentRef, 'child', 1) },
      childReferences: [],
    });

    const clone = original.shallowCloneWithRecordOverrides();
    const clonedContext = clone.getMutableChildDiscoveryContextOrNull();
    if (clonedContext === null) {
      throw new Error('Cloned resolution context is missing');
    }
    clonedContext.discoveryDepthInEdges = 99;

    expect(
      original.getMutableChildDiscoveryContextOrNull()?.discoveryDepthInEdges,
    ).toBe(1);
    expect(
      clone.getMutableChildDiscoveryContextOrNull()?.discoveryDepthInEdges,
    ).toBe(99);
  });

  test('accepts more children than the JavaScript argument limit', () => {
    const resolved = new MutableTreeVertexTopologyRecord<TestTTP>({
      metadata: { childDiscoveryContext: null },
      childReferences: [],
    });
    const lastRef = makeRef('last');
    const children = Array.from(
      { length: 150_000 },
      () => ({} as MutableValueReference<Vertex<TestTTP>>),
    );
    children[children.length - 1] = lastRef;

    resolved.appendChildReferences(children);

    expect(resolved.getMutableChildReferenceList()).toHaveLength(150_000);
    expect(resolved.getMutableChildReferenceList()[149_999]).toBe(lastRef);
  });
});

describe('MutableResolvedTreeStore', () => {
  test('deleting a vertex removes its entire resolved subtree', () => {
    const tree = new MutableResolvedTreeStore<TestTTP>();
    const rootRef = makeRef('root');
    const deletedRef = makeRef('deleted');
    const grandchildRef = makeRef('grandchild');
    const siblingRef = makeRef('sibling');
    tree.setRootVertexReference(rootRef);
    setResolved(tree, rootRef, null, [deletedRef, siblingRef]);
    setResolved(tree, deletedRef, makeContext(rootRef, 'deleted', 1), [
      grandchildRef,
    ]);
    setResolved(tree, grandchildRef, makeContext(deletedRef, 'grandchild', 2));
    setResolved(tree, siblingRef, makeContext(rootRef, 'sibling', 1));

    tree.deleteSubtree(deletedRef);

    expect(tree.getDetachedChildReferenceListOrNull(rootRef)).toEqual([
      siblingRef,
    ]);
    expect(tree.containsVertexReference(deletedRef)).toBe(false);
    expect(tree.containsVertexReference(grandchildRef)).toBe(false);
    expect(tree.containsVertexReference(siblingRef)).toBe(true);
  });

  test('deleting the root clears the root and every descendant', () => {
    const tree = new MutableResolvedTreeStore<TestTTP>();
    const rootRef = makeRef('root');
    const childRef = makeRef('child');
    tree.setRootVertexReference(rootRef);
    setResolved(tree, rootRef, null, [childRef]);
    setResolved(tree, childRef, makeContext(rootRef, 'child', 1));

    tree.deleteSubtree(rootRef);

    expect(tree.getRootVertexReferenceOrNull()).toBeNull();
    expect(tree.containsVertexReference(rootRef)).toBe(false);
    expect(tree.containsVertexReference(childRef)).toBe(false);
    expect(tree.resolveRootVertex()).toEqual({
      kind: 'vertexIntentionallyOmitted',
    });
  });

  test('deleting a wide root subtree does not exceed argument limits', () => {
    const tree = new MutableResolvedTreeStore<TestTTP>();
    const rootRef = makeRef('root');
    const lastChildRef = makeRef('last');
    const children = Array.from(
      { length: 150_000 },
      () => ({} as MutableValueReference<Vertex<TestTTP>>),
    );
    children[children.length - 1] = lastChildRef;
    tree.setRootVertexReference(rootRef);
    setResolved(tree, rootRef, null, children);
    setResolved(tree, lastChildRef, makeContext(rootRef, 'last', 1));

    tree.deleteSubtree(rootRef);

    expect(tree.getRootVertexReferenceOrNull()).toBeNull();
    expect(tree.containsVertexReference(lastChildRef)).toBe(false);
  });

  test('noRoot excludes only the configured root', () => {
    const tree = new MutableResolvedTreeStore<TestTTP>();
    const rootRef = makeRef('root');
    const detachedRef = makeRef('detached');
    tree.setRootVertexReference(rootRef);
    setResolved(tree, rootRef, null);
    setResolved(tree, detachedRef, null);

    expect(
      tree.requireStructuralAncestorPathTo(rootRef, {
        includeDesignatedRoot: false,
      }),
    ).toEqual([]);
    expect(
      tree.requireStructuralAncestorPathTo(rootRef, {
        includeDesignatedRoot: false,
        includeTargetVertex: false,
      }),
    ).toEqual([]);
    expect(
      tree.requireStructuralAncestorPathTo(detachedRef, {
        includeDesignatedRoot: false,
      }),
    ).toEqual([detachedRef]);
  });
});

describe('DepthFirstTraversalResolvedTreesContainer', () => {
  test('appends only to the active tree when snapshots are disabled', () => {
    const container = new DepthFirstTraversalResolvedTreesContainer<
      TestTTP,
      TestTTP
    >({
      retainDiscoveredTreeBeforeVisitorCommands: false,
      traversalRunnerInternalObjects: {
        resolvedTreesContainer: null,
        state: null,
      },
    } as unknown as DepthFirstTreeResolvedOptions<TestTTP, TestTTP>);
    const rootRef = makeRef('root', ['child']);
    const childRef = makeRef('child');
    container.setRoot(rootRef);
    container.setWithResolutionContext(
      childRef,
      makeContext(rootRef, 'child', 1),
    );
    container.pushChildrenTo(rootRef, [childRef]);
    expect(
      container.resolvedTree.getDetachedChildReferenceListOrNull(rootRef),
    ).toEqual([childRef]);
    expect(container.preCommandDiscoveredTreeView).toBeNull();
  });

  test('saved tree owns references, contexts, topology, and its root', () => {
    const container = new DepthFirstTraversalResolvedTreesContainer<
      TestTTP,
      TestTTP
    >({
      retainDiscoveredTreeBeforeVisitorCommands: true,
      traversalRunnerInternalObjects: {
        resolvedTreesContainer: null,
        state: null,
      },
    } as unknown as DepthFirstTreeResolvedOptions<TestTTP, TestTTP>);
    const rootRef = makeRef('root', ['child']);
    const childRef = makeRef('child');

    container.setRoot(rootRef);
    container.setWithResolutionContext(
      childRef,
      makeContext(rootRef, 'child', 1),
    );
    container.pushChildrenTo(rootRef, [childRef]);

    const savedTree = container.preCommandDiscoveredTreeView;
    const refsMap = container.originalTreeRefsMap;
    expect(savedTree).not.toBeNull();
    expect(refsMap).not.toBeNull();
    if (savedTree === null || refsMap === null) {
      throw new Error('Saved tree was not initialized');
    }
    const savedRootRef = refsMap.get(rootRef);
    const savedChildRef = refsMap.get(childRef);
    expect(savedRootRef).toBeDefined();
    expect(savedChildRef).toBeDefined();
    if (savedRootRef === undefined || savedChildRef === undefined) {
      throw new Error('Saved refs were not initialized');
    }

    expect(savedTree.getRootVertexReferenceOrNull()).toBe(savedRootRef);
    expect(savedRootRef).not.toBe(rootRef);
    expect(savedChildRef).not.toBe(childRef);
    expect(savedRootRef.getReferencedValue()).not.toBe(
      rootRef.getReferencedValue(),
    );
    expect(savedRootRef.getReferencedValue().getVertexData()).toBe(
      rootRef.getReferencedValue().getVertexData(),
    );
    expect(
      container.resolvedTree.getDetachedChildReferenceListOrNull(rootRef),
    ).toEqual([childRef]);
    expect(savedTree.getDetachedChildReferenceListOrNull(savedRootRef)).toEqual(
      [savedChildRef],
    );
    expect(
      container.resolvedTree.getDetachedChildDiscoveryContextOrNull(childRef)
        ?.parentVertexHandle,
    ).toBe(rootRef);
    expect(
      savedTree.getDetachedChildDiscoveryContextOrNull(savedChildRef)
        ?.parentVertexHandle,
    ).toBe(savedRootRef);
    expect(
      savedTree.getDetachedChildDiscoveryContextOrNull(savedChildRef)
        ?.parentVertexAtChildResolution,
    ).toBe(savedRootRef.getReferencedValue());

    rootRef
      .getReferencedValue()
      .getMutableChildDiscoveryHints()
      .push('later-active-hint');
    expect(
      savedRootRef.getReferencedValue().getMutableChildDiscoveryHints(),
    ).toEqual(['child']);

    container.delete(rootRef);

    expect(container.resolvedTree.getRootVertexReferenceOrNull()).toBeNull();
    expect(savedTree.getRootVertexReferenceOrNull()).toBe(savedRootRef);
    expect(savedTree.getDetachedChildReferenceListOrNull(savedRootRef)).toEqual(
      [savedChildRef],
    );
    expect(savedTree.requireStructuralAncestorPathTo(savedChildRef)).toEqual([
      savedRootRef,
      savedChildRef,
    ]);
  });
});
