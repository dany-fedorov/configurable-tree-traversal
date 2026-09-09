import {
  DepthFirstTraversal,
  DepthFirstTraversalOrder as Order,
} from '../src/traversals/depth-first-traversal';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import type { DepthFirstTraversalInOrderTraversalConfig as InOrderConfig } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';

type Node = { $d: string; $c: Node[] };
type Tree = TreeTypeParameters<string, Node>;
const root: Node = {
  $d: 'root',
  $c: ['a', 'b', 'c'].map(($d) => ({ $d, $c: [] })),
};
const create = (inOrderTraversalConfig: Partial<InOrderConfig> = {}) =>
  new DepthFirstTraversal<Tree>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: root }),
      makeVertex: (hint) => ({ vertexContent: hint }),
    },
    inOrderTraversalConfig,
  });
const collect = (runner: ReturnType<ReturnType<typeof create>['makeRunner']>) =>
  [...runner.getIterable({ iterateOver: [Order.IN_ORDER] })].map((event) =>
    event.vertex.getData(),
  );

test('editing one traversal range does not change future traversal defaults', () => {
  const traversal = create();
  const range = traversal.icfg.inOrderTraversalConfig.visitParentAfterChildren;
  if (!Array.isArray(range))
    throw new Error('Expected the documented default range');
  const original = range[0];
  try {
    range[0] = 2;
    expect(collect(create().makeRunner())).toEqual([
      'a',
      'root',
      'b',
      'root',
      'c',
    ]);
  } finally {
    range[0] = original;
  }
});

test('an existing runner keeps its in-order configuration after traversal configuration is edited', () => {
  const traversal = create({ visitParentAfterChildren: 0 });
  const runner = traversal.makeRunner();
  traversal.icfg.inOrderTraversalConfig.visitParentAfterChildren = 2;
  expect(collect(runner)).toEqual(['a', 'root', 'b', 'c']);
});

test('caller-owned nested ranges are copied when configuring the traversal', () => {
  const ranges: { ranges: Array<[number, number]> } = { ranges: [[0, 0]] };
  const traversal = create({ visitParentAfterChildren: ranges });
  ranges.ranges[0]![0] = 2;
  ranges.ranges[0]![1] = 2;
  expect(collect(traversal.makeRunner())).toEqual(['a', 'root', 'b', 'c']);
});

test('caller-owned fallback ranges are isolated too', () => {
  const fallback: { ranges: Array<[number, number]> } = { ranges: [[0, 0]] };
  const traversal = create({
    visitParentAfterChildren: 99,
    visitParentAfterChildrenAllRangesOutOfBoundsFallback: fallback,
  });
  fallback.ranges[0]![0] = 2;
  fallback.ranges[0]![1] = 2;
  expect(collect(traversal.makeRunner())).toEqual(['a', 'root', 'b', 'c']);
});
