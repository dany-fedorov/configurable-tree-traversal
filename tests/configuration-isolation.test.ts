import type { VertexTypes } from '../src/core/TreeTypeParameters';
import {
  DepthFirstPhase as Order,
  DepthFirstTreeTraversal,
} from '../src/traversals/depth-first-traversal';
import type { InOrderOptions as InOrderConfig } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import { traversalInternals } from './internal-runner-fixtures';

type Node = { $data: string; $childHints: Node[] };
type Tree = VertexTypes<string, Node>;
const root: Node = {
  $data: 'root',
  $childHints: ['a', 'b', 'c'].map(($data) => ({ $data, $childHints: [] })),
};
const create = (inOrder: Partial<InOrderConfig> = {}) =>
  new DepthFirstTreeTraversal<Tree>({
    traversableTree: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: root },
      }),
      resolveChild: (hint) => ({
        kind: 'found' as const,
        vertex: { vertexContent: hint },
      }),
    },
    inOrder,
  });
const collect = (
  runner: ReturnType<ReturnType<typeof create>['createRunner']>,
) =>
  [...runner.iterateEvents({ emitEvents: [Order.IN_ORDER] })].map((event) =>
    event.vertex.getData(),
  );

test('editing one traversal range does not change future traversal defaults', () => {
  const traversal = create();
  const range = traversalInternals(traversal).icfg.inOrder.afterChildIndices;
  if (!('ranges' in range) || range.ranges === undefined)
    throw new Error('Expected the documented default range');
  const original = range.ranges[0]!.from;
  try {
    Object.assign(range.ranges[0]!, { from: 2 });
    expect(collect(create().createRunner())).toEqual([
      'a',
      'root',
      'b',
      'root',
      'c',
    ]);
  } finally {
    Object.assign(range.ranges[0]!, { from: original });
  }
});

test('an existing runner keeps its in-order configuration after traversal configuration is edited', () => {
  const traversal = create({ afterChildIndices: { indices: [0] } });
  const runner = traversal.createRunner();
  traversalInternals(traversal).icfg.inOrder.afterChildIndices = {
    indices: [2],
  };
  expect(collect(runner)).toEqual(['a', 'root', 'b', 'c']);
});

test('caller-owned nested ranges are copied when configuring the traversal', () => {
  const ranges: { ranges: Array<{ from: number; through: number }> } = {
    ranges: [{ from: 0, through: 0 }],
  };
  const traversal = create({ afterChildIndices: ranges });
  ranges.ranges[0]!.from = 2;
  ranges.ranges[0]!.through = 2;
  expect(collect(traversal.createRunner())).toEqual(['a', 'root', 'b', 'c']);
});

test('caller-owned fallback ranges are isolated too', () => {
  const fallback: { ranges: Array<{ from: number; through: number }> } = {
    ranges: [{ from: 0, through: 0 }],
  };
  const traversal = create({
    afterChildIndices: { indices: [99] },
    fallbackChildIndices: fallback,
  });
  fallback.ranges[0]!.from = 2;
  fallback.ranges[0]!.through = 2;
  expect(collect(traversal.createRunner())).toEqual(['a', 'root', 'b', 'c']);
});
