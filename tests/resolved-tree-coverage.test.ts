import type { MutableTreeChildDiscoveryContext as ChildDiscoveryContext } from '../src/core/ResolvedTree';
import {
  DepthFirstTreeTraversalBuilder,
  MutableValueReference,
  MutableResolvedTreeStore,
  MutableTreeVertexTopologyRecord,
  Vertex,
  type VertexDataAndChildHintTypes,
} from '../src';
import { runnerInternals } from './internal-runner-fixtures';

type Node = { $vertexData: string; $childDiscoveryHints: Node[] };
type TestTTP = VertexDataAndChildHintTypes<string, Node>;

const node = ($vertexData: string, ...$childDiscoveryHints: Node[]): Node => ({
  $vertexData,
  $childDiscoveryHints,
});

function makeRef(data: string): MutableValueReference<Vertex<TestTTP>> {
  return new MutableValueReference(
    new Vertex<TestTTP>({ $vertexData: data, $childDiscoveryHints: [] }),
  );
}

function makeResolved(
  context: ChildDiscoveryContext<TestTTP> | null,
): MutableTreeVertexTopologyRecord<TestTTP> {
  return new MutableTreeVertexTopologyRecord({
    metadata: { childDiscoveryContext: context },
    childReferences: [],
  });
}

function makeContext(
  parentVertexRef: MutableValueReference<Vertex<TestTTP>>,
  vertexHint: Node,
): ChildDiscoveryContext<TestTTP> {
  return {
    discoveryDepthInEdges: 1,
    parentVertexAtChildResolution: parentVertexRef.getReferencedValue(),
    parentVertexReference: parentVertexRef,
    parentChildHintIndex: 0,
    childDiscoveryHint: vertexHint,
  };
}

function makeSavingContainer() {
  return runnerInternals(
    new DepthFirstTreeTraversalBuilder<TestTTP>({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildVertexFromHint: (hint) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: { vertexContentInput: hint },
        }),
      },
      retainDiscoveredTreeBeforeVisitorCommands: true,
    }).createIndependentRunnerFromCurrentOptions(),
  ).resolvedTreesContainer;
}

describe('resolved-tree public fallbacks', () => {
  test('reports absent lookups and exposes unresolved refs as leaf adapter vertices', () => {
    const tree = new MutableResolvedTreeStore<TestTTP>();
    const unresolvedRef = makeRef('unresolved');

    expect(tree.getDetachedChildReferenceListOrNull(unresolvedRef)).toBeNull();
    expect(
      tree.getDetachedChildDiscoveryContextOrNull(unresolvedRef),
    ).toBeNull();
    expect(tree.resolveChildVertexFromHint(unresolvedRef)).toEqual({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexContentInput: {
          $vertexData: unresolvedRef,
          $childDiscoveryHints: [],
        },
      },
    });

    tree.setRootVertexReference(unresolvedRef);
    expect(tree.resolveRootVertex()).toEqual({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexContentInput: {
          $vertexData: unresolvedRef,
          $childDiscoveryHints: [],
        },
      },
    });
  });

  test('deleting duplicate public child edges visits the child only once', () => {
    const tree = new MutableResolvedTreeStore<TestTTP>();
    const rootRef = makeRef('root');
    const childRef = makeRef('child');
    tree.setRootVertexReference(rootRef);
    tree.setVertexRecord(rootRef, makeResolved(null));
    tree.setVertexRecord(
      childRef,
      makeResolved(makeContext(rootRef, node('child'))),
    );
    tree.appendChildReferencesTo(rootRef, [childRef, childRef]);

    tree.deleteSubtree(rootRef);

    expect(tree.getRootVertexReferenceOrNull()).toBeNull();
    expect(tree.containsVertexReference(rootRef)).toBe(false);
    expect(tree.containsVertexReference(childRef)).toBe(false);
  });
});

describe('saved-container consistency errors', () => {
  test('rejects append when the active parent has no saved mapping', () => {
    const container = makeSavingContainer();
    const unknownParentRef = makeRef('unknown-parent');

    expect(() => container.pushChildrenTo(unknownParentRef, [])).toThrow(
      /could not find not mutated ref by resolved ref/i,
    );
    expect(
      container.resolvedTree.containsVertexReference(unknownParentRef),
    ).toBe(false);
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
    const savedTree = container.livePreCommandDiscoveredTreeView;
    const savedRootRef = container.originalTreeRefsMap?.get(rootRef);
    if (savedTree === null || savedRootRef === undefined) {
      throw new Error('Expected saved root state');
    }
    savedTree.deleteSubtree(savedRootRef);

    expect(() => container.pushChildrenTo(rootRef, [childRef])).toThrow(
      /could not find not mutated ref/i,
    );
    expect(
      container.resolvedTree.getDetachedChildReferenceListOrNull(rootRef),
    ).toEqual([]);
  });
});
