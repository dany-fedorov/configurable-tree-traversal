import { DepthFirstTraversal } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';
import { DepthFirstTraversalOrder as Order } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { DepthFirstTraversalInOrderTraversalConfig as Config } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';

type Node = { $d: string; $c: (Node | null)[] };
type Tree = TreeTypeParameters<string, Node | null>;
function walk(
  hints: (string | null)[],
  config: Partial<Config> = {},
): string[] {
  const root: Node = {
    $d: 'root',
    $c: hints.map((value) => (value === null ? null : { $d: value, $c: [] })),
  };
  const t = new DepthFirstTraversal<Tree>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: root }),
      makeVertex: (hint) => ({ vertexContent: hint }),
    },
    inOrderTraversalConfig: config,
  });
  return [...t.makeRunner().getIterable({ iterateOver: [Order.IN_ORDER] })].map(
    (v) => v.vertex.getData(),
  );
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
      visitParentAfterChildren: { ranges: [0, 2] },
    }),
  ).toEqual(['a', 'root', 'b', 'c', 'root', 'd']);
});
test('out-of-bounds primary ranges use the fallback', () => {
  expect(
    walk(['a', 'b', 'c'], {
      visitParentAfterChildren: 99,
      visitParentAfterChildrenAllRangesOutOfBoundsFallback: -1,
    }),
  ).toEqual(['a', 'b', 'c', 'root']);
});
test('negative positions are relative to the end', () => {
  expect(walk(['a', 'b', 'c'], { visitParentAfterChildren: -2 })).toEqual([
    'a',
    'b',
    'root',
    'c',
  ]);
});
test('one-child parent visits can be disabled', () => {
  expect(walk(['a'], { visitUpOneChildParents: false })).toEqual(['a']);
});
test('null positions can count for in-order boundaries', () => {
  expect(walk([null, 'a'])).toEqual(['root', 'a']);
  expect(
    walk([null, 'a'], { considerVisitAfterNullContentVertices: false }),
  ).toEqual(['a']);
});
test('all null positions still finish traversal', () => {
  expect(walk([null, null])).toEqual(['root']);
});
