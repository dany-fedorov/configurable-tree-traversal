import { CTTRef } from '@core/CTTRef';
import {
  ResolvedTree,
  VertexResolved,
  type VertexResolutionContext,
} from '@core/ResolvedTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { Vertex } from '@core/Vertex';
import type { DepthFirstTraversalInstanceConfig } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';

type TestTTP = TreeTypeParameters<{ label: string }, string>;
type NullableDataTTP = TreeTypeParameters<string | null | undefined, string>;

function makeRef(
  label: string,
  children: string[] = [],
): CTTRef<Vertex<TestTTP>> {
  return new CTTRef(
    new Vertex<TestTTP>({
      $d: { label },
      $c: children,
    }),
  );
}

function makeContext(
  parentVertexRef: CTTRef<Vertex<TestTTP>>,
  vertexHint: string,
  depth: number,
  hintIndex = 0,
): VertexResolutionContext<TestTTP> {
  return {
    depth,
    parentVertex: parentVertexRef.unref(),
    parentVertexRef,
    hintIndex,
    vertexHint,
  };
}

function setResolved(
  tree: ResolvedTree<TestTTP>,
  ref: CTTRef<Vertex<TestTTP>>,
  resolutionContext: VertexResolutionContext<TestTTP> | null,
  children: CTTRef<Vertex<TestTTP>>[] = [],
): void {
  tree.set(
    ref,
    new VertexResolved<TestTTP>({
      $d: { resolutionContext },
      $c: children,
    }),
  );
}

describe('Vertex', () => {
  test('clone preserves explicitly rewritten null and undefined data', () => {
    const vertex = new Vertex<NullableDataTTP>({
      $d: 'before',
      $c: [],
    });

    expect(vertex.clone({ $d: null }).getData()).toBeNull();
    expect(vertex.clone({ $d: undefined }).getData()).toBeUndefined();
    expect(vertex.clone().getData()).toBe('before');
  });
});

describe('VertexResolved', () => {
  test('clone owns its resolution context and child-reference array', () => {
    const parentRef = makeRef('parent');
    const firstChildRef = makeRef('first');
    const secondChildRef = makeRef('second');
    const original = new VertexResolved<TestTTP>({
      $d: { resolutionContext: makeContext(parentRef, 'first', 1) },
      $c: [firstChildRef],
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
    const original = new VertexResolved<TestTTP>({
      $d: { resolutionContext: makeContext(parentRef, 'child', 1) },
      $c: [],
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
    const resolved = new VertexResolved<TestTTP>({
      $d: { resolutionContext: null },
      $c: [],
    });
    const lastRef = makeRef('last');
    const children = Array.from(
      { length: 150_000 },
      () => ({} as CTTRef<Vertex<TestTTP>>),
    );
    children[children.length - 1] = lastRef;

    resolved.pushChildren(children);

    expect(resolved.getChildren()).toHaveLength(150_000);
    expect(resolved.getChildren()[149_999]).toBe(lastRef);
  });
});

describe('ResolvedTree', () => {
  test('deleting a vertex removes its entire resolved subtree', () => {
    const tree = new ResolvedTree<TestTTP>();
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

    tree.delete(deletedRef);

    expect(tree.getChildrenOf(rootRef)).toEqual([siblingRef]);
    expect(tree.has(deletedRef)).toBe(false);
    expect(tree.has(grandchildRef)).toBe(false);
    expect(tree.has(siblingRef)).toBe(true);
  });

  test('deleting the root clears the root and every descendant', () => {
    const tree = new ResolvedTree<TestTTP>();
    const rootRef = makeRef('root');
    const childRef = makeRef('child');
    tree.setRoot(rootRef);
    setResolved(tree, rootRef, null, [childRef]);
    setResolved(tree, childRef, makeContext(rootRef, 'child', 1));

    tree.delete(rootRef);

    expect(tree.getRoot()).toBeNull();
    expect(tree.has(rootRef)).toBe(false);
    expect(tree.has(childRef)).toBe(false);
    expect(tree.makeRoot().vertexContent).toBeNull();
  });

  test('deleting a wide root subtree does not exceed argument limits', () => {
    const tree = new ResolvedTree<TestTTP>();
    const rootRef = makeRef('root');
    const lastChildRef = makeRef('last');
    const children = Array.from(
      { length: 150_000 },
      () => ({} as CTTRef<Vertex<TestTTP>>),
    );
    children[children.length - 1] = lastChildRef;
    tree.setRoot(rootRef);
    setResolved(tree, rootRef, null, children);
    setResolved(tree, lastChildRef, makeContext(rootRef, 'last', 1));

    tree.delete(rootRef);

    expect(tree.getRoot()).toBeNull();
    expect(tree.has(lastChildRef)).toBe(false);
  });

  test('noRoot excludes only the configured root', () => {
    const tree = new ResolvedTree<TestTTP>();
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
  test('saved tree owns references, contexts, topology, and its root', () => {
    const container = new DepthFirstTraversalResolvedTreesContainer<
      TestTTP,
      TestTTP
    >({
      saveNotMutatedResolvedTree: true,
      traversalRunnerInternalObjects: {
        resolvedTreesContainer: null,
        state: null,
      },
    } as unknown as DepthFirstTraversalInstanceConfig<TestTTP, TestTTP>);
    const rootRef = makeRef('root', ['child']);
    const childRef = makeRef('child');

    container.setRoot(rootRef);
    container.setWithResolutionContext(
      childRef,
      makeContext(rootRef, 'child', 1),
    );
    container.pushChildrenTo(rootRef, [childRef]);

    const savedTree = container.notMutatedResolvedTree;
    const refsMap = container.notMutatedResolvedTreeRefsMap;
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
    expect(savedRootRef.unref()).not.toBe(rootRef.unref());
    expect(savedRootRef.unref().getData()).toBe(rootRef.unref().getData());
    expect(container.resolvedTree.getChildrenOf(rootRef)).toEqual([childRef]);
    expect(savedTree.getChildrenOf(savedRootRef)).toEqual([savedChildRef]);
    expect(
      container.resolvedTree.getResolutionContextOf(childRef)?.parentVertexRef,
    ).toBe(rootRef);
    expect(
      savedTree.getResolutionContextOf(savedChildRef)?.parentVertexRef,
    ).toBe(savedRootRef);
    expect(savedTree.getResolutionContextOf(savedChildRef)?.parentVertex).toBe(
      savedRootRef.unref(),
    );

    rootRef.unref().getChildrenHints().push('later-active-hint');
    expect(savedRootRef.unref().getChildrenHints()).toEqual(['child']);

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
