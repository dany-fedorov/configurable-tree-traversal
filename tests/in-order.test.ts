import { treeResolution } from './source-result-fixtures';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { DepthFirstTreeTraversal } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';
import type { InOrderOptions as Config } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import { DepthFirstPhase as Order } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalOrder';

type Node = { $data: string; $childHints: (Node | null)[] };
type Tree = VertexTypes<string, Node | null>;
function walk(
  hints: (string | null)[],
  config: Partial<Config> = {},
): string[] {
  const root: Node = {
    $data: 'root',
    $childHints: hints.map((value) =>
      value === null ? null : { $data: value, $childHints: [] },
    ),
  };
  const t = new DepthFirstTreeTraversal<Tree>({
    traversableTree: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: root },
      }),
      resolveChild: (hint) => treeResolution(hint),
    },
    inOrder: config,
  });
  return [
    ...t.createRunner().iterateEvents({ emitEvents: [Order.IN_ORDER] }),
  ].map((v) => v.vertex.getData());
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
      afterChildIndices: { indices: [0, 2] },
    }),
  ).toEqual(['a', 'root', 'b', 'c', 'root', 'd']);
});
test('out-of-bounds primary ranges use the fallback', () => {
  expect(
    walk(['a', 'b', 'c'], {
      afterChildIndices: { indices: [99] },
      fallbackChildIndices: { indices: [-1] },
    }),
  ).toEqual(['a', 'b', 'c', 'root']);
});
test('negative positions are relative to the end', () => {
  expect(
    walk(['a', 'b', 'c'], { afterChildIndices: { indices: [-2] } }),
  ).toEqual(['a', 'b', 'root', 'c']);
});
test('one-child parent visits can be disabled', () => {
  expect(walk(['a'], { visitSingleChildParent: false })).toEqual(['a']);
});
test('null positions can count for in-order boundaries', () => {
  expect(walk([null, 'a'])).toEqual(['root', 'a']);
  expect(walk([null, 'a'], { visitAfterOmittedChildren: false })).toEqual([
    'a',
  ]);
});
test('all null positions still finish traversal', () => {
  expect(walk([null, null])).toEqual(['root']);
});

test('tagged indices differ from inclusive intervals', () => {
  expect(
    walk(['a', 'b', 'c', 'd'], { afterChildIndices: { indices: [0, 2] } }),
  ).toEqual(['a', 'root', 'b', 'c', 'root', 'd']);
  expect(
    walk(['a', 'b', 'c', 'd'], {
      afterChildIndices: { ranges: [{ from: 0, through: 2 }] },
    }),
  ).toEqual(['a', 'root', 'b', 'root', 'c', 'root', 'd']);
  expect(
    walk(['a', 'b', 'c'], {
      afterChildIndices: { indices: [99, -99] },
      fallbackChildIndices: { indices: [-1] },
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
    walk(['a', 'b'], { afterChildIndices: selection } as never),
  ).toThrow(TypeError);
});
