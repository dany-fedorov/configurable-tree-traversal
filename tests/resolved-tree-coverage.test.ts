import {
  CTTRef,
  DepthFirstTraversal,
  ResolvedTree,
  type TreeTypeParameters,
  Vertex,
  VertexResolved,
  type VertexResolutionContext,
} from '../src';

type Node = { $d: string; $c: Node[] };
type TestTTP = TreeTypeParameters<string, Node>;

const node = ($d: string, ...$c: Node[]): Node => ({ $d, $c });

function makeRef(data: string): CTTRef<Vertex<TestTTP>> {
  return new CTTRef(new Vertex<TestTTP>({ $d: data, $c: [] }));
}

function makeResolved(
  context: VertexResolutionContext<TestTTP> | null,
): VertexResolved<TestTTP> {
  return new VertexResolved({
    $d: { resolutionContext: context },
    $c: [],
  });
}

function makeContext(
  parentVertexRef: CTTRef<Vertex<TestTTP>>,
  vertexHint: Node,
): VertexResolutionContext<TestTTP> {
  return {
    depth: 1,
    parentVertex: parentVertexRef.unref(),
    parentVertexRef,
    hintIndex: 0,
    vertexHint,
  };
}

function makeSavingContainer() {
  return new DepthFirstTraversal<TestTTP>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: null }),
      makeVertex: (hint) => ({ vertexContent: hint }),
    },
    saveNotMutatedResolvedTree: true,
  }).makeRunner().resolvedTreesContainer;
}

describe('resolved-tree public fallbacks', () => {
  test('reports absent lookups and exposes unresolved refs as leaf adapter vertices', () => {
    const tree = new ResolvedTree<TestTTP>();
    const unresolvedRef = makeRef('unresolved');

    expect(tree.getChildrenOf(unresolvedRef)).toBeNull();
    expect(tree.getResolutionContextOf(unresolvedRef)).toBeNull();
    expect(tree.makeVertex(unresolvedRef)).toEqual({
      vertexContent: { $d: unresolvedRef, $c: [] },
    });

    tree.setRoot(unresolvedRef);
    expect(tree.makeRoot()).toEqual({
      vertexContent: { $d: unresolvedRef, $c: [] },
    });
  });

  test('deleting duplicate public child edges visits the child only once', () => {
    const tree = new ResolvedTree<TestTTP>();
    const rootRef = makeRef('root');
    const childRef = makeRef('child');
    tree.setRoot(rootRef);
    tree.set(rootRef, makeResolved(null));
    tree.set(childRef, makeResolved(makeContext(rootRef, node('child'))));
    tree.pushChildrenTo(rootRef, [childRef, childRef]);

    tree.delete(rootRef);

    expect(tree.getRoot()).toBeNull();
    expect(tree.has(rootRef)).toBe(false);
    expect(tree.has(childRef)).toBe(false);
  });
});

describe('saved-container consistency errors', () => {
  test('rejects append when the active parent has no saved mapping', () => {
    const container = makeSavingContainer();
    const unknownParentRef = makeRef('unknown-parent');

    expect(() => container.pushChildrenTo(unknownParentRef, [])).toThrow(
      /could not find not mutated ref by resolved ref/i,
    );
    expect(container.resolvedTree.has(unknownParentRef)).toBe(false);
  });

  test('rejects append when the mapped saved parent was removed', () => {
    const container = makeSavingContainer();
    const rootRef = makeRef('root');
    const childHint = node('child');
    const childRef = makeRef('child');
    container.setRoot(rootRef);
    container.setWithResolutionContext(
      childRef,
      makeContext(rootRef, childHint),
    );
    const savedTree = container.notMutatedResolvedTree;
    const savedRootRef = container.notMutatedResolvedTreeRefsMap?.get(rootRef);
    if (savedTree === null || savedRootRef === undefined) {
      throw new Error('Expected saved root state');
    }
    savedTree.delete(savedRootRef);

    expect(() => container.pushChildrenTo(rootRef, [childRef])).toThrow(
      /could not find not mutated ref/i,
    );
    expect(container.resolvedTree.getChildrenOf(rootRef)).toEqual([]);
  });
});
