import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import {
  DepthFirstTreeVisitPhase as Order,
  DepthFirstTreeTraversalBuilder,
} from '../src/traversals/depth-first-traversal';
import type { DepthFirstChildBoundaryVisitOptions as InOrderConfig } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import { traversalInternals } from './internal-runner-fixtures';

type Node = { $vertexData: string; $childDiscoveryHints: Node[] };
type Tree = VertexDataAndChildHintTypes<string, Node>;
const root: Node = {
  $vertexData: 'root',
  $childDiscoveryHints: ['a', 'b', 'c'].map(($vertexData) => ({
    $vertexData,
    $childDiscoveryHints: [],
  })),
};
const create = (childBoundaryVisits: Partial<InOrderConfig> = {}) =>
  new DepthFirstTreeTraversalBuilder<Tree>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: { vertexContentInput: root },
      }),
      resolveChildVertexFromHint: (hint) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: { vertexContentInput: hint },
      }),
    },
    childBoundaryVisits,
  });
const collect = (
  runner: ReturnType<
    ReturnType<typeof create>['createIndependentRunnerFromCurrentOptions']
  >,
) =>
  [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Order.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES],
    }),
  ].map((event) => event.vertex.getVertexData());

test('editing one traversal range does not change future traversal defaults', () => {
  const traversal = create();
  const range =
    traversalInternals(traversal).icfg.childBoundaryVisits
      .visitAfterChildIndices;
  if (!('ranges' in range) || range.ranges === undefined)
    throw new Error('Expected the documented default range');
  const original = range.ranges[0]!.fromInclusive;
  try {
    Object.assign(range.ranges[0]!, { fromInclusive: 2 });
    expect(
      collect(create().createIndependentRunnerFromCurrentOptions()),
    ).toEqual(['a', 'root', 'b', 'root', 'c']);
  } finally {
    Object.assign(range.ranges[0]!, { fromInclusive: original });
  }
});

test('an existing runner keeps its in-order configuration after traversal configuration is edited', () => {
  const traversal = create({ visitAfterChildIndices: { indices: [0] } });
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  traversalInternals(
    traversal,
  ).icfg.childBoundaryVisits.visitAfterChildIndices = {
    indices: [2],
  };
  expect(collect(runner)).toEqual(['a', 'root', 'b', 'c']);
});

test('caller-owned nested ranges are copied when configuring the traversal', () => {
  const ranges: {
    ranges: Array<{ fromInclusive: number; throughInclusive: number }>;
  } = {
    ranges: [{ fromInclusive: 0, throughInclusive: 0 }],
  };
  const traversal = create({ visitAfterChildIndices: ranges });
  ranges.ranges[0]!.fromInclusive = 2;
  ranges.ranges[0]!.throughInclusive = 2;
  expect(
    collect(traversal.createIndependentRunnerFromCurrentOptions()),
  ).toEqual(['a', 'root', 'b', 'c']);
});

test('caller-owned fallback ranges are isolated too', () => {
  const fallback: {
    ranges: Array<{ fromInclusive: number; throughInclusive: number }>;
  } = {
    ranges: [{ fromInclusive: 0, throughInclusive: 0 }],
  };
  const traversal = create({
    visitAfterChildIndices: { indices: [99] },
    visitAfterChildIndicesWhenPrimarySelectionIsEmpty: fallback,
  });
  fallback.ranges[0]!.fromInclusive = 2;
  fallback.ranges[0]!.throughInclusive = 2;
  expect(
    collect(traversal.createIndependentRunnerFromCurrentOptions()),
  ).toEqual(['a', 'root', 'b', 'c']);
});
