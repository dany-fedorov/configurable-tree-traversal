import {
  DEFAULT_VISITOR_FN_OPTIONS,
  TraversalVisitorFunctionResolutionStyle,
  type VertexTypes,
} from '../src/core';
import {
  BreadthFirstPhase,
  BreadthFirstTreeTraversal,
  BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT,
  makeEffectiveBreadthFirstTraversalRunnerIterableConfig,
} from '../src/traversals/breadth-first-traversal';
import {
  DepthFirstPhase,
  DepthFirstTreeTraversal,
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT,
  makeEffectiveDepthFirstTraversalRunnerIterableConfig,
} from '../src/traversals/depth-first-traversal';
import { traversalInternals } from './internal-runner-fixtures';

type Node = { $d: string; $c: Node[] };
type Tree = VertexTypes<string, Node>;

const root: Node = {
  $d: 'root',
  $c: ['a', 'b', 'c'].map(($d) => ({ $d, $c: [] })),
};

const tree = {
  resolveRoot: () => ({ vertexContent: root }),
  resolveChild: (hint: Node) => ({ vertexContent: hint }),
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

describe('exported traversal defaults', () => {
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

  test('mutating the exported DFS range cannot corrupt a future traversal', () => {
    const ranges =
      DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.inOrder.afterChildIndices;
    if (!Array.isArray(ranges)) throw new Error('Expected default ranges');
    const original = ranges[0];
    let mutationError: unknown;

    try {
      ranges[0] = 2;
    } catch (error) {
      mutationError = error;
    }

    try {
      const traversal = new DepthFirstTreeTraversal<Tree>({
        traversableTree: tree,
      });
      const values = [
        ...traversal.createRunner().iterateEvents({
          emitEvents: [DepthFirstPhase.IN_ORDER],
        }),
      ].map(({ vertex }) => vertex.getData());

      expect(values).toEqual(['a', 'root', 'b', 'root', 'c']);
      expect(mutationError).toBeInstanceOf(TypeError);
    } finally {
      if (!Object.isFrozen(ranges)) ranges[0] = original;
    }
  });

  test.each([
    [
      'depth-first',
      DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT.iterateOver,
      makeEffectiveDepthFirstTraversalRunnerIterableConfig,
      [
        DepthFirstPhase.PRE_ORDER,
        DepthFirstPhase.IN_ORDER,
        DepthFirstPhase.POST_ORDER,
      ],
    ],
    [
      'breadth-first',
      BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT.iterateOver,
      makeEffectiveBreadthFirstTraversalRunnerIterableConfig,
      [BreadthFirstPhase.LEVEL_ORDER],
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
        BreadthFirstPhase.LEVEL_ORDER
      ];
    let unexpectedVisits = 0;
    const record = {
      addedIndex: 0,
      priority: 100,
      resolutionStyle: TraversalVisitorFunctionResolutionStyle.SEQUENTIAL,
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
      new BreadthFirstTreeTraversal<Tree>({ traversableTree: tree })
        .createRunner()
        .run();
      expect(unexpectedVisits).toBe(0);
      expect(mutationError).toBeInstanceOf(TypeError);
    } finally {
      if (!Object.isFrozen(records)) records.pop();
    }
  });

  test('mutating exported visitor options cannot change future visitor priority', () => {
    const mutableDefaults = DEFAULT_VISITOR_FN_OPTIONS as {
      priority: number;
      resolutionStyle: TraversalVisitorFunctionResolutionStyle;
    };
    const original = mutableDefaults.priority;
    let mutationError: unknown;

    try {
      mutableDefaults.priority = -1;
    } catch (error) {
      mutationError = error;
    }

    try {
      const traversal = new DepthFirstTreeTraversal<Tree>({
        traversableTree: tree,
      }).addVisitorFor(DepthFirstPhase.PRE_ORDER, () => undefined);
      expect(
        traversal.listVisitorsFor(DepthFirstPhase.PRE_ORDER)[0]?.priority,
      ).toBe(100);
      expect(mutationError).toBeInstanceOf(TypeError);
    } finally {
      if (!Object.isFrozen(mutableDefaults))
        mutableDefaults.priority = original;
    }
  });

  test('effective and per-instance configurations remain mutable', () => {
    const depthIterable =
      makeEffectiveDepthFirstTraversalRunnerIterableConfig();
    const breadthIterable =
      makeEffectiveBreadthFirstTraversalRunnerIterableConfig();
    const depthTraversal = new DepthFirstTreeTraversal<Tree>({
      traversableTree: tree,
    });
    const breadthTraversal = new BreadthFirstTreeTraversal<Tree>({
      traversableTree: tree,
    });
    const depthRecord = {
      addedIndex: 0,
      priority: 100,
      resolutionStyle: TraversalVisitorFunctionResolutionStyle.SEQUENTIAL,
      visitor: () => undefined,
    };
    const breadthRecord = {
      addedIndex: 0,
      priority: 100,
      resolutionStyle: TraversalVisitorFunctionResolutionStyle.SEQUENTIAL,
      visitor: () => undefined,
    };

    expect(() => {
      depthIterable.iterateOver.length = 0;
      breadthIterable.iterateOver.length = 0;
      traversalInternals(depthTraversal).icfg.retainOriginalTreeStructure =
        true;
      traversalInternals(breadthTraversal).icfg.retainOriginalTreeStructure =
        true;
      traversalInternals(depthTraversal).icfg.visitors[
        DepthFirstPhase.PRE_ORDER
      ].push(depthRecord);
      traversalInternals(breadthTraversal).icfg.visitors[
        BreadthFirstPhase.LEVEL_ORDER
      ].push(breadthRecord);
    }).not.toThrow();
    expect(depthIterable.iterateOver).toEqual([]);
    expect(breadthIterable.iterateOver).toEqual([]);
    expect(
      traversalInternals(depthTraversal).icfg.retainOriginalTreeStructure,
    ).toBe(true);
    expect(
      traversalInternals(breadthTraversal).icfg.retainOriginalTreeStructure,
    ).toBe(true);
    expect(
      traversalInternals(depthTraversal).icfg.visitors[
        DepthFirstPhase.PRE_ORDER
      ],
    ).toEqual([depthRecord]);
    expect(
      traversalInternals(breadthTraversal).icfg.visitors[
        BreadthFirstPhase.LEVEL_ORDER
      ],
    ).toEqual([breadthRecord]);
  });
});
