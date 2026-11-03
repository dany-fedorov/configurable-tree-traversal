import { treeResolution } from './source-result-fixtures';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { DepthFirstTreeTraversalBuilder } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';
import type { DepthFirstChildBoundaryVisitOptions as Config } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import { DepthFirstTreeVisitPhase as Order } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalOrder';

type Node = { $vertexData: string; $childDiscoveryHints: (Node | null)[] };
type Tree = VertexDataAndChildHintTypes<string, Node | null>;
function walk(
  hints: (string | null)[],
  config: Partial<Config> = {},
): string[] {
  const root: Node = {
    $vertexData: 'root',
    $childDiscoveryHints: hints.map((value) =>
      value === null ? null : { $vertexData: value, $childDiscoveryHints: [] },
    ),
  };
  const t = new DepthFirstTreeTraversalBuilder<Tree>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: "vertexResolved" as const,
        resolvedVertexInput: { vertexContentInput: root },
      }),
      resolveChildVertexFromHint: (hint) => treeResolution(hint),
    },
    childBoundaryVisits: config,
  });
  return [
    ...t.createIndependentRunnerFromCurrentOptions().runAndIterateObservationEventsUntilSuspendedOrTerminal({ deliveredEventKinds: [Order.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES] }),
  ].map((v) => v.vertex.getVertexData());
}

test('default n-ary in-order visits between each pair of children', () => {
  expect(walk(['a', 'b', 'c', 'd'])).toEqual([
    'a',
    'root',
    'b',
    'root',
    'c',
    'root',
    'd',
  ]);
});
test('multiple explicit child positions are independent of ranges', () => {
  expect(
    walk(['a', 'b', 'c', 'd'], {
      visitAfterChildIndices: { indices: [0, 2] },
    }),
  ).toEqual(['a', 'root', 'b', 'c', 'root', 'd']);
});
test('out-of-bounds primary ranges use the fallback', () => {
  expect(
    walk(['a', 'b', 'c'], {
      visitAfterChildIndices: { indices: [99] },
      visitAfterChildIndicesWhenPrimarySelectionIsEmpty: { indices: [-1] },
    }),
  ).toEqual(['a', 'b', 'c', 'root']);
});
test('negative positions are relative to the end', () => {
  expect(
    walk(['a', 'b', 'c'], { visitAfterChildIndices: { indices: [-2] } }),
  ).toEqual(['a', 'b', 'root', 'c']);
});
test('one-child parent visits can be disabled', () => {
  expect(walk(['a'], { alsoVisitAfterOnlyChild: false })).toEqual(['a']);
});
test('null positions can count for in-order boundaries', () => {
  expect(walk([null, 'a'])).toEqual(['root', 'a']);
  expect(walk([null, 'a'], { allowBoundaryVisitsAfterOmittedChildSlots: false })).toEqual([
    'a',
  ]);
});
test('all null positions still finish traversal', () => {
  expect(walk([null, null])).toEqual(['root']);
});

test('tagged indices differ from inclusive intervals', () => {
  expect(
    walk(['a', 'b', 'c', 'd'], { visitAfterChildIndices: { indices: [0, 2] } }),
  ).toEqual(['a', 'root', 'b', 'c', 'root', 'd']);
  expect(
    walk(['a', 'b', 'c', 'd'], {
      visitAfterChildIndices: { ranges: [{ fromInclusive: 0, throughInclusive: 2 }] },
    }),
  ).toEqual(['a', 'root', 'b', 'root', 'c', 'root', 'd']);
  expect(
    walk(['a', 'b', 'c'], {
      visitAfterChildIndices: { indices: [99, -99] },
      visitAfterChildIndicesWhenPrimarySelectionIsEmpty: { indices: [-1] },
    }),
  ).toEqual(['a', 'b', 'c', 'root']);
});

test.each([
  0,
  [0, 2],
  { ranges: [0, 2] },
  { indices: [0], ranges: [] },
  { indices: [0.5] },
  { indices: null },
  { ranges: [{ from: 0, through: Infinity }] },
])('rejects malformed or ambiguous child selection %p', (selection) => {
  expect(() =>
    walk(['a', 'b'], { visitAfterChildIndices: selection } as never),
  ).toThrow(TypeError);
});
