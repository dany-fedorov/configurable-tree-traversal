import { CTTRef } from '../src/core/CTTRef';
import type { VertexResolutionContext } from '../src/core/ResolvedTree';
import type { TraversableTree } from '../src/core/TraversableTree';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import { Vertex } from '../src/core/Vertex';
import { DepthFirstTraversal } from '../src/traversals/depth-first-traversal';
import type { DepthFirstTraversalRunnerState } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerState';

type Node = { $d: string; $c: Node[] };
type Tree = TreeTypeParameters<string, Node>;

const node = ($d: string, ...$c: Node[]): Node => ({ $d, $c });
const adapter = (root: Node): TraversableTree<Tree> => ({
  makeRoot: () => ({ vertexContent: root }),
  makeVertex: (hint) => ({ vertexContent: hint }),
});
const ref = (data: string) => new CTTRef(new Vertex<Tree>(node(data)));
const context = (
  parentVertexRef: CTTRef<Vertex<Tree>>,
  data: string,
  hintIndex: number,
): VertexResolutionContext<Tree> => ({
  depth: 1,
  hintIndex,
  parentVertex: parentVertexRef.unref(),
  parentVertexRef,
  vertexHint: node(data),
});

function makeState(): DepthFirstTraversalRunnerState<Tree, Tree> {
  return new DepthFirstTraversal<Tree>({
    traversableTree: adapter(node('root')),
  }).makeRunner().state;
}

test('depth-first state injection retains supplied continuation objects', () => {
  const source = makeState();
  const disabledParentRef = ref('disabled-parent');
  const activeParentRef = ref('active-parent');
  const disabledContext = context(disabledParentRef, 'skipped-child', 0);
  const activeContext = context(activeParentRef, 'active-child', 0);
  const visitorsState = source.visitorsState;
  source.pushToStack(disabledParentRef, [disabledContext]);
  source.pushToStack(activeParentRef, [activeContext]);
  source.subtreeTraversalDisabledRefs.add(disabledParentRef);
  source.postOrderNotVisitedChildrenCountMap.set(activeParentRef, 2);
  source.traversalRootVertexRef = activeParentRef;
  source.status = TraversalRunnerStatus.HALTED;

  const injected = new DepthFirstTraversal<Tree>({
    traversableTree: adapter(node('unused')),
    traversalRunnerInternalObjects: { state: source },
  }).makeRunner().state;

  expect(injected.STACK).toBe(source.STACK);
  expect(injected.postOrderNotVisitedChildrenCountMap).toBe(
    source.postOrderNotVisitedChildrenCountMap,
  );
  expect(injected.visitorsState).toBe(visitorsState);
  expect(injected.traversalRootVertexRef).toBe(activeParentRef);
  expect(injected.status).toBe(TraversalRunnerStatus.HALTED);

  expect(injected.popStack()).toEqual({
    stackIsEmpty: false,
    vertexContext: activeContext,
  });
  expect(source.STACK).toEqual([disabledContext]);
  expect(injected.countVisitedOnPostOrderAChildOf(activeParentRef)).toBe(1);
  expect(source.postOrderNotVisitedChildrenCountMap.get(activeParentRef)).toBe(
    1,
  );
  expect(injected.popStack()).toEqual({
    stackIsEmpty: true,
    vertexContext: null,
  });
  expect(source.vertexRefStackChildrenHintsRanges.size).toBe(0);
});

test('post-order child counts decrement, clean up, and reject invalid counts', () => {
  const state = makeState();
  const parentRef = ref('parent');

  expect(() => state.countVisitedOnPostOrderAChildOf(parentRef)).toThrow(
    /Could not find entry/,
  );

  state.postOrderNotVisitedChildrenCountMap.set(parentRef, 2);
  expect(state.countVisitedOnPostOrderAChildOf(parentRef)).toBe(1);
  expect(state.postOrderNotVisitedChildrenCountMap.get(parentRef)).toBe(1);
  expect(state.countVisitedOnPostOrderAChildOf(parentRef)).toBe(0);
  expect(state.postOrderNotVisitedChildrenCountMap.has(parentRef)).toBe(false);

  state.postOrderNotVisitedChildrenCountMap.set(parentRef, 0);
  expect(() => state.countVisitedOnPostOrderAChildOf(parentRef)).toThrow(
    /Count got to < 0/,
  );
});

test('legacy stack ranges shrink and disabled-parent entries are pruned', () => {
  const state = makeState();
  const firstParent = ref('first-parent');
  const secondParent = ref('second-parent');
  const first = context(firstParent, 'first', 0);
  const second = context(firstParent, 'second', 1);
  const third = context(secondParent, 'third', 0);

  state.pushToStack(firstParent, [first, second]);
  state.pushToStack(secondParent, [third]);
  expect(state.vertexRefStackChildrenHintsRanges.get(firstParent)).toEqual([
    0, 2,
  ]);
  expect(state.vertexRefStackChildrenHintsRanges.get(secondParent)).toEqual([
    2, 3,
  ]);

  expect(state.popStack()).toEqual({
    stackIsEmpty: false,
    vertexContext: third,
  });
  expect(state.vertexRefStackChildrenHintsRanges.has(secondParent)).toBe(false);

  expect(state.popStack()).toEqual({
    stackIsEmpty: false,
    vertexContext: second,
  });
  expect(state.vertexRefStackChildrenHintsRanges.get(firstParent)).toEqual([
    0, 1,
  ]);

  state.subtreeTraversalDisabledRefs.add(firstParent);
  expect(state.popStack()).toEqual({
    stackIsEmpty: true,
    vertexContext: null,
  });
  expect(state.vertexRefStackChildrenHintsRanges.has(firstParent)).toBe(false);
  expect(state.STACK).toEqual([]);
});
