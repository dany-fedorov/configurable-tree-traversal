import { MutableRef } from '@core/CTTRef';
import {
  ResolvedTreeStore,
  TreeVertexRecord,
  type VertexResolutionContext,
} from '@core/ResolvedTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { Vertex } from '@core/Vertex';
import type { DepthFirstTreeResolvedOptions } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';

type TestTTP = VertexTypes<{ label: string }, string>;
type NullableDataTTP = VertexTypes<string | null | undefined, string>;

function makeRef(
  label: string,
  children: string[] = [],
): MutableRef<Vertex<TestTTP>> {
  return new MutableRef(
    new Vertex<TestTTP>({
      $data: { label },
      $childHints: children,
    }),
  );
}

function makeContext(
  parentVertexRef: MutableRef<Vertex<TestTTP>>,
  vertexHint: string,
  depth: number,
  hintIndex = 0,
): VertexResolutionContext<TestTTP> {
  return {
    depth,
    parentVertex: parentVertexRef.getValue(),
    parentVertexRef,
    hintIndex,
    vertexHint,
  };
}

function setResolved(
  tree: ResolvedTreeStore<TestTTP>,
  ref: MutableRef<Vertex<TestTTP>>,
  resolutionContext: VertexResolutionContext<TestTTP> | null,
  children: MutableRef<Vertex<TestTTP>>[] = [],
): void {
  tree.set(
    ref,
    new TreeVertexRecord<TestTTP>({
      metadata: { resolutionContext },
      children: children,
    }),
  );
}

describe('Vertex', () => {
  test('clone preserves explicitly rewritten null and undefined data', () => {
    const vertex = new Vertex<NullableDataTTP>({
      $data: 'before',
      $childHints: [],
    });

    expect(vertex.clone({ $data: null }).getData()).toBeNull();
    expect(vertex.clone({ $data: undefined }).getData()).toBeUndefined();
    expect(vertex.clone().getData()).toBe('before');
  });
});

describe('TreeVertexRecord', () => {
  test('clone owns its resolution context and child-reference array', () => {
    const parentRef = makeRef('parent');
    const firstChildRef = makeRef('first');
    const secondChildRef = makeRef('second');
    const original = new TreeVertexRecord<TestTTP>({
      metadata: { resolutionContext: makeContext(parentRef, 'first', 1) },
      children: [firstChildRef],
    });

    const clone = original.clone();
    clone.setResolutionContext(null);
    clone.pushChildren([secondChildRef]);

    expect(original.getResolutionContext()?.parentVertexRef).toBe(parentRef);
    expect(original.getChildren()).toEqual([firstChildRef]);
    expect(clone.getResolutionContext()).toBeNull();
    expect(clone.getChildren()).toEqual([firstChildRef, secondChildRef]);
  });

  test('clone owns the nested resolution context object', () => {
    const parentRef = makeRef('parent');
    const original = new TreeVertexRecord<TestTTP>({
      metadata: { resolutionContext: makeContext(parentRef, 'child', 1) },
      children: [],
    });

    const clone = original.clone();
    const clonedContext = clone.getResolutionContext();
    if (clonedContext === null) {
      throw new Error('Cloned resolution context is missing');
    }
    clonedContext.depth = 99;

    expect(original.getResolutionContext()?.depth).toBe(1);
    expect(clone.getResolutionContext()?.depth).toBe(99);
  });

  test('accepts more children than the JavaScript argument limit', () => {
    const resolved = new TreeVertexRecord<TestTTP>({
      metadata: { resolutionContext: null },
      children: [],
    });
    const lastRef = makeRef('last');
    const children = Array.from(
      { length: 150_000 },
      () => ({} as MutableRef<Vertex<TestTTP>>),
    );
    children[children.length - 1] = lastRef;

    resolved.pushChildren(children);

    expect(resolved.getChildren()).toHaveLength(150_000);
    expect(resolved.getChildren()[149_999]).toBe(lastRef);
  });
});

describe('ResolvedTreeStore', () => {
  test('deleting a vertex removes its entire resolved subtree', () => {
    const tree = new ResolvedTreeStore<TestTTP>();
    const rootRef = makeRef('root');
    const deletedRef = makeRef('deleted');
    const grandchildRef = makeRef('grandchild');
    const siblingRef = makeRef('sibling');
    tree.setRoot(rootRef);
    setResolved(tree, rootRef, null, [deletedRef, siblingRef]);
    setResolved(tree, deletedRef, makeContext(rootRef, 'deleted', 1), [
      grandchildRef,
    ]);
    setResolved(tree, grandchildRef, makeContext(deletedRef, 'grandchild', 2));
    setResolved(tree, siblingRef, makeContext(rootRef, 'sibling', 1));

    tree.deleteSubtree(deletedRef);

    expect(tree.getChildrenOf(rootRef)).toEqual([siblingRef]);
    expect(tree.has(deletedRef)).toBe(false);
    expect(tree.has(grandchildRef)).toBe(false);
    expect(tree.has(siblingRef)).toBe(true);
  });

  test('deleting the root clears the root and every descendant', () => {
    const tree = new ResolvedTreeStore<TestTTP>();
    const rootRef = makeRef('root');
    const childRef = makeRef('child');
    tree.setRoot(rootRef);
    setResolved(tree, rootRef, null, [childRef]);
    setResolved(tree, childRef, makeContext(rootRef, 'child', 1));

    tree.deleteSubtree(rootRef);

    expect(tree.getRoot()).toBeNull();
    expect(tree.has(rootRef)).toBe(false);
    expect(tree.has(childRef)).toBe(false);
    expect(tree.resolveRoot()).toEqual({ kind: 'omitted' });
  });

  test('deleting a wide root subtree does not exceed argument limits', () => {
    const tree = new ResolvedTreeStore<TestTTP>();
    const rootRef = makeRef('root');
    const lastChildRef = makeRef('last');
    const children = Array.from(
      { length: 150_000 },
      () => ({} as MutableRef<Vertex<TestTTP>>),
    );
    children[children.length - 1] = lastChildRef;
    tree.setRoot(rootRef);
    setResolved(tree, rootRef, null, children);
    setResolved(tree, lastChildRef, makeContext(rootRef, 'last', 1));

    tree.deleteSubtree(rootRef);

    expect(tree.getRoot()).toBeNull();
    expect(tree.has(lastChildRef)).toBe(false);
  });

  test('noRoot excludes only the configured root', () => {
    const tree = new ResolvedTreeStore<TestTTP>();
    const rootRef = makeRef('root');
    const detachedRef = makeRef('detached');
    tree.setRoot(rootRef);
    setResolved(tree, rootRef, null);
    setResolved(tree, detachedRef, null);

    expect(tree.getPathTo(rootRef, { noRoot: true })).toEqual([]);
    expect(tree.getPathTo(rootRef, { noRoot: true, noSelf: true })).toEqual([]);
    expect(tree.getPathTo(detachedRef, { noRoot: true })).toEqual([
      detachedRef,
    ]);
  });
});

describe('DepthFirstTraversalResolvedTreesContainer', () => {
  test('appends only to the active tree when snapshots are disabled', () => {
    const container = new DepthFirstTraversalResolvedTreesContainer<
      TestTTP,
      TestTTP
    >({
      retainOriginalTreeStructure: false,
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
    expect(container.resolvedTree.getChildrenOf(rootRef)).toEqual([childRef]);
    expect(container.originalTreeView).toBeNull();
  });

  test('saved tree owns references, contexts, topology, and its root', () => {
    const container = new DepthFirstTraversalResolvedTreesContainer<
      TestTTP,
      TestTTP
    >({
      retainOriginalTreeStructure: true,
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

    const savedTree = container.originalTreeView;
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

    expect(savedTree.getRoot()).toBe(savedRootRef);
    expect(savedRootRef).not.toBe(rootRef);
    expect(savedChildRef).not.toBe(childRef);
    expect(savedRootRef.getValue()).not.toBe(rootRef.getValue());
    expect(savedRootRef.getValue().getData()).toBe(
      rootRef.getValue().getData(),
    );
    expect(container.resolvedTree.getChildrenOf(rootRef)).toEqual([childRef]);
    expect(savedTree.getChildrenOf(savedRootRef)).toEqual([savedChildRef]);
    expect(
      container.resolvedTree.getResolutionContextOf(childRef)?.parentVertexRef,
    ).toBe(rootRef);
    expect(
      savedTree.getResolutionContextOf(savedChildRef)?.parentVertexRef,
    ).toBe(savedRootRef);
    expect(savedTree.getResolutionContextOf(savedChildRef)?.parentVertex).toBe(
      savedRootRef.getValue(),
    );

    rootRef.getValue().getChildrenHints().push('later-active-hint');
    expect(savedRootRef.getValue().getChildrenHints()).toEqual(['child']);

    container.delete(rootRef);

    expect(container.resolvedTree.getRoot()).toBeNull();
    expect(savedTree.getRoot()).toBe(savedRootRef);
    expect(savedTree.getChildrenOf(savedRootRef)).toEqual([savedChildRef]);
    expect(savedTree.getPathTo(savedChildRef)).toEqual([
      savedRootRef,
      savedChildRef,
    ]);
  });
});
