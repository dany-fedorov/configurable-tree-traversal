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
  if (!Array.isArray(range))
    throw new Error('Expected the documented default range');
  const original = range[0];
  try {
    range[0] = 2;
    expect(collect(create().createRunner())).toEqual([
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
  const traversal = create({ afterChildIndices: 0 });
  const runner = traversal.createRunner();
  traversalInternals(traversal).icfg.inOrder.afterChildIndices = 2;
  expect(collect(runner)).toEqual(['a', 'root', 'b', 'c']);
});

test('caller-owned nested ranges are copied when configuring the traversal', () => {
  const ranges: { ranges: Array<[number, number]> } = { ranges: [[0, 0]] };
  const traversal = create({ afterChildIndices: ranges });
  ranges.ranges[0]![0] = 2;
  ranges.ranges[0]![1] = 2;
  expect(collect(traversal.createRunner())).toEqual(['a', 'root', 'b', 'c']);
});

test('caller-owned fallback ranges are isolated too', () => {
  const fallback: { ranges: Array<[number, number]> } = { ranges: [[0, 0]] };
  const traversal = create({
    afterChildIndices: 99,
    fallbackChildIndices: fallback,
  });
  fallback.ranges[0]![0] = 2;
  fallback.ranges[0]![1] = 2;
  expect(collect(traversal.createRunner())).toEqual(['a', 'root', 'b', 'c']);
});
