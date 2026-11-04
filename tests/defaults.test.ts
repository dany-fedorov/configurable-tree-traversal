import { DEFAULT_VISITOR_FN_OPTIONS } from '../src/core/TraversalVisitor';
import { BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalInstanceConfig';
import { BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerIterableConfig';
import { makeEffectiveBreadthFirstTraversalRunnerIterableConfig } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerIterableConfig';
import { DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import { makeEffectiveDepthFirstTraversalRunnerIterableConfig } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import type { VertexDataAndChildHintTypes } from '../src/core';
import {
  BreadthFirstTreeVisitPhase,
  BreadthFirstTreeTraversalBuilder,
} from '../src/traversals/breadth-first-traversal';
import {
  DepthFirstTreeVisitPhase,
  DepthFirstTreeTraversalBuilder,
} from '../src/traversals/depth-first-traversal';
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

const tree = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: { vertexContentInput: root },
  }),
  resolveChildVertexFromHint: (hint: Node) => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: { vertexContentInput: hint },
  }),
};

function expectRecursivelyFrozen(value: unknown, seen = new Set<object>()) {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function') ||
    seen.has(value)
  ) {
    return;
  }
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Reflect.ownKeys(value).map(
    (key) => (value as Record<PropertyKey, unknown>)[key],
  )) {
    expectRecursivelyFrozen(child, seen);
  }
}

describe('internal traversal defaults', () => {
  test.each([
    ['depth-first instance', DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG],
    ['breadth-first instance', BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG],
    [
      'depth-first iterable',
      DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT,
    ],
    [
      'breadth-first iterable',
      BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT,
    ],
    ['visitor function', DEFAULT_VISITOR_FN_OPTIONS],
  ])('%s defaults are recursively frozen', (_name, defaults) => {
    expectRecursivelyFrozen(defaults);
  });

  test('mutating the internal DFS range cannot corrupt a future traversal', () => {
    const ranges =
      DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.childBoundaryVisits
        .visitAfterChildIndices;
    if (ranges.ranges === undefined) throw new Error('Expected default ranges');
    const original = ranges.ranges[0]!.fromInclusive;
    let mutationError: unknown;

    try {
      Object.assign(ranges.ranges[0]!, { from: 2 });
    } catch (error) {
      mutationError = error;
    }

    try {
      const traversal = new DepthFirstTreeTraversalBuilder<Tree>({
        treeDiscoverySource: tree,
      });
      const values = [
        ...traversal
          .createIndependentRunnerFromCurrentOptions()
          .runAndIterateObservationEventsUntilSuspendedOrTerminal({
            deliveredEventKinds: [
              DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
            ],
          }),
      ].map(({ vertex }) => vertex.getVertexData());

      expect(values).toEqual(['a', 'root', 'b', 'root', 'c']);
      expect(mutationError).toBeInstanceOf(TypeError);
    } finally {
      if (!Object.isFrozen(ranges.ranges[0]))
        Object.assign(ranges.ranges[0]!, { from: original });
    }
  });

  test.each([
    [
      'depth-first',
      DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT.iterateOver,
      makeEffectiveDepthFirstTraversalRunnerIterableConfig,
      [
        DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
        DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
        DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
      ],
    ],
    [
      'breadth-first',
      BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT.iterateOver,
      makeEffectiveBreadthFirstTraversalRunnerIterableConfig,
      [BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX],
    ],
  ] as const)(
    'mutating the exported %s iterable order cannot corrupt effective options',
    (_name, exportedOrders, makeEffective, expectedOrders) => {
      const saved = exportedOrders.slice();
      let mutationError: unknown;

      try {
        (exportedOrders as string[]).length = 0;
      } catch (error) {
        mutationError = error;
      }

      try {
        expect(makeEffective().iterateOver).toEqual(expectedOrders);
        expect(mutationError).toBeInstanceOf(TypeError);
      } finally {
        if (!Object.isFrozen(exportedOrders)) {
          (exportedOrders as string[]).push(...saved);
        }
      }
    },
  );

  test('mutating the exported BFS visitor list cannot register a future visitor', () => {
    const records =
      BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.visitors[
        BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX
      ];
    let unexpectedVisits = 0;
    const record = {
      phaseRegistrationInsertionIndex: 0,
      descendingExecutionPriorityWithinGroup: 100,
      visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
      visitor: () => {
        unexpectedVisits += 1;
      },
    };
    let mutationError: unknown;

    try {
      records.push(record);
    } catch (error) {
      mutationError = error;
    }

    try {
      new BreadthFirstTreeTraversalBuilder<Tree>({ treeDiscoverySource: tree })
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal();
      expect(unexpectedVisits).toBe(0);
      expect(mutationError).toBeInstanceOf(TypeError);
    } finally {
      if (!Object.isFrozen(records)) records.pop();
    }
  });

  test('mutating exported visitor options cannot change future visitor priority', () => {
    const mutableDefaults = DEFAULT_VISITOR_FN_OPTIONS as {
      descendingExecutionPriorityWithinGroup: number;
      visitorCommandCommitTiming: import('../src').VisitorCommandCommitTiming;
    };
    const original = mutableDefaults.descendingExecutionPriorityWithinGroup;
    let mutationError: unknown;

    try {
      mutableDefaults.descendingExecutionPriorityWithinGroup = -1;
    } catch (error) {
      mutationError = error;
    }

    try {
      const traversal = new DepthFirstTreeTraversalBuilder<Tree>({
        treeDiscoverySource: tree,
      }).registerVisitorForPhase(
        DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
        () => undefined,
      );
      expect(
        traversal.getDetachedVisitorRegistrationRecordsForPhase(
          DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
        )[0]?.descendingExecutionPriorityWithinGroup,
      ).toBe(100);
      expect(mutationError).toBeInstanceOf(TypeError);
    } finally {
      if (!Object.isFrozen(mutableDefaults))
        mutableDefaults.descendingExecutionPriorityWithinGroup = original;
    }
  });

  test('effective and per-instance configurations remain mutable', () => {
    const depthIterable =
      makeEffectiveDepthFirstTraversalRunnerIterableConfig();
    const breadthIterable =
      makeEffectiveBreadthFirstTraversalRunnerIterableConfig();
    const depthTraversal = new DepthFirstTreeTraversalBuilder<Tree>({
      treeDiscoverySource: tree,
    });
    const breadthTraversal = new BreadthFirstTreeTraversalBuilder<Tree>({
      treeDiscoverySource: tree,
    });
    const depthRecord = {
      phaseRegistrationInsertionIndex: 0,
      descendingExecutionPriorityWithinGroup: 100,
      visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
      visitor: () => undefined,
    };
    const breadthRecord = {
      phaseRegistrationInsertionIndex: 0,
      descendingExecutionPriorityWithinGroup: 100,
      visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
      visitor: () => undefined,
    };

    expect(() => {
      depthIterable.iterateOver.length = 0;
      breadthIterable.iterateOver.length = 0;
      traversalInternals(
        depthTraversal,
      ).icfg.retainDiscoveredTreeBeforeVisitorCommands = true;
      traversalInternals(
        breadthTraversal,
      ).icfg.retainDiscoveredTreeBeforeVisitorCommands = true;
      traversalInternals(depthTraversal).icfg.visitors[
        DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION
      ].push(depthRecord);
      traversalInternals(breadthTraversal).icfg.visitors[
        BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX
      ].push(breadthRecord);
    }).not.toThrow();
    expect(depthIterable.iterateOver).toEqual([]);
    expect(breadthIterable.iterateOver).toEqual([]);
    expect(
      traversalInternals(depthTraversal).icfg
        .retainDiscoveredTreeBeforeVisitorCommands,
    ).toBe(true);
    expect(
      traversalInternals(breadthTraversal).icfg
        .retainDiscoveredTreeBeforeVisitorCommands,
    ).toBe(true);
    expect(
      traversalInternals(depthTraversal).icfg.visitors[
        DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION
      ],
    ).toEqual([depthRecord]);
    expect(
      traversalInternals(breadthTraversal).icfg.visitors[
        BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX
      ],
    ).toEqual([breadthRecord]);
  });
});
