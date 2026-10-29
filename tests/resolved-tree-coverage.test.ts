import type { InternalVertexResolutionContext as VertexResolutionContext } from '../src/core/ResolvedTree';
import {
  DepthFirstTreeTraversal,
  MutableRef,
  ResolvedTreeStore,
  TreeVertexRecord,
  Vertex,
  type VertexTypes,
} from '../src';
import { runnerInternals } from './internal-runner-fixtures';

type Node = { $data: string; $childHints: Node[] };
type TestTTP = VertexTypes<string, Node>;

const node = ($data: string, ...$childHints: Node[]): Node => ({
  $data,
  $childHints,
});

function makeRef(data: string): MutableRef<Vertex<TestTTP>> {
  return new MutableRef(new Vertex<TestTTP>({ $data: data, $childHints: [] }));
}

function makeResolved(
  context: VertexResolutionContext<TestTTP> | null,
): TreeVertexRecord<TestTTP> {
  return new TreeVertexRecord({
    metadata: { resolutionContext: context },
    children: [],
  });
}

function makeContext(
  parentVertexRef: MutableRef<Vertex<TestTTP>>,
  vertexHint: Node,
): VertexResolutionContext<TestTTP> {
  return {
    depth: 1,
    parentVertex: parentVertexRef.getValue(),
    parentVertexRef,
    hintIndex: 0,
    vertexHint,
  };
}

function makeSavingContainer() {
  return runnerInternals(
    new DepthFirstTreeTraversal<TestTTP>({
      traversableTree: {
        resolveRoot: () => ({ kind: 'omitted' as const }),
        resolveChild: (hint) => ({
          kind: 'found' as const,
          vertex: { vertexContent: hint },
        }),
      },
      retainOriginalTreeStructure: true,
    }).createRunner(),
  ).resolvedTreesContainer;
}

describe('resolved-tree public fallbacks', () => {
  test('reports absent lookups and exposes unresolved refs as leaf adapter vertices', () => {
    const tree = new ResolvedTreeStore<TestTTP>();
    const unresolvedRef = makeRef('unresolved');

    expect(tree.getChildrenOf(unresolvedRef)).toBeNull();
    expect(tree.getResolutionContextOf(unresolvedRef)).toBeNull();
    expect(tree.resolveChild(unresolvedRef)).toEqual({
      kind: 'found' as const,
      vertex: {
        vertexContent: { $data: unresolvedRef, $childHints: [] },
      },
    });

    tree.setRoot(unresolvedRef);
    expect(tree.resolveRoot()).toEqual({
      kind: 'found' as const,
      vertex: {
        vertexContent: { $data: unresolvedRef, $childHints: [] },
      },
    });
  });

  test('deleting duplicate public child edges visits the child only once', () => {
    const tree = new ResolvedTreeStore<TestTTP>();
    const rootRef = makeRef('root');
    const childRef = makeRef('child');
    tree.setRoot(rootRef);
    tree.set(rootRef, makeResolved(null));
    tree.set(childRef, makeResolved(makeContext(rootRef, node('child'))));
    tree.pushChildrenTo(rootRef, [childRef, childRef]);

    tree.deleteSubtree(rootRef);

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
    const savedTree = container.originalTreeView;
    const savedRootRef = container.originalTreeRefsMap?.get(rootRef);
    if (savedTree === null || savedRootRef === undefined) {
      throw new Error('Expected saved root state');
    }
    savedTree.deleteSubtree(savedRootRef);

    expect(() => container.pushChildrenTo(rootRef, [childRef])).toThrow(
      /could not find not mutated ref/i,
    );
    expect(container.resolvedTree.getChildrenOf(rootRef)).toEqual([]);
  });
});
