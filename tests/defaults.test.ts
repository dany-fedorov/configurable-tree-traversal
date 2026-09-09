import {
  DEFAULT_VISITOR_FN_OPTIONS,
  TraversalVisitorFunctionResolutionStyle,
  type TreeTypeParameters,
} from '../src/core';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT,
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
  makeEffectiveDepthFirstTraversalRunnerIterableConfig,
} from '../src/traversals/depth-first-traversal';
import {
  BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT,
  BreadthFirstTraversal,
  BreadthFirstTraversalOrder,
  makeEffectiveBreadthFirstTraversalRunnerIterableConfig,
} from '../src/traversals/breadth-first-traversal';

type Node = { $d: string; $c: Node[] };
type Tree = TreeTypeParameters<string, Node>;

const root: Node = {
  $d: 'root',
  $c: ['a', 'b', 'c'].map(($d) => ({ $d, $c: [] })),
};

const tree = {
  makeRoot: () => ({ vertexContent: root }),
  makeVertex: (hint: Node) => ({ vertexContent: hint }),
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
      DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.inOrderTraversalConfig
        .visitParentAfterChildren;
    if (!Array.isArray(ranges)) throw new Error('Expected default ranges');
    const original = ranges[0];
    let mutationError: unknown;

    try {
      ranges[0] = 2;
    } catch (error) {
      mutationError = error;
    }

    try {
      const traversal = new DepthFirstTraversal<Tree>({
        traversableTree: tree,
      });
      const values = [
        ...traversal.makeRunner().getIterable({
          iterateOver: [DepthFirstTraversalOrder.IN_ORDER],
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
        DepthFirstTraversalOrder.PRE_ORDER,
        DepthFirstTraversalOrder.IN_ORDER,
        DepthFirstTraversalOrder.POST_ORDER,
      ],
    ],
    [
      'breadth-first',
      BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT.iterateOver,
      makeEffectiveBreadthFirstTraversalRunnerIterableConfig,
      [BreadthFirstTraversalOrder.LEVEL_ORDER],
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
        BreadthFirstTraversalOrder.LEVEL_ORDER
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
      new BreadthFirstTraversal<Tree>({ traversableTree: tree })
        .makeRunner()
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
      const traversal = new DepthFirstTraversal<Tree>({
        traversableTree: tree,
      }).addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, () => undefined);
      expect(
        traversal.listVisitorsFor(DepthFirstTraversalOrder.PRE_ORDER)[0]
          ?.priority,
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
    const depthTraversal = new DepthFirstTraversal<Tree>({
      traversableTree: tree,
    });
    const breadthTraversal = new BreadthFirstTraversal<Tree>({
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
      depthTraversal.icfg.saveNotMutatedResolvedTree = true;
      breadthTraversal.icfg.saveNotMutatedResolvedTree = true;
      depthTraversal.icfg.visitors[DepthFirstTraversalOrder.PRE_ORDER].push(
        depthRecord,
      );
      breadthTraversal.icfg.visitors[
        BreadthFirstTraversalOrder.LEVEL_ORDER
      ].push(breadthRecord);
    }).not.toThrow();
    expect(depthIterable.iterateOver).toEqual([]);
    expect(breadthIterable.iterateOver).toEqual([]);
    expect(depthTraversal.icfg.saveNotMutatedResolvedTree).toBe(true);
    expect(breadthTraversal.icfg.saveNotMutatedResolvedTree).toBe(true);
    expect(
      depthTraversal.icfg.visitors[DepthFirstTraversalOrder.PRE_ORDER],
    ).toEqual([depthRecord]);
    expect(
      breadthTraversal.icfg.visitors[BreadthFirstTraversalOrder.LEVEL_ORDER],
    ).toEqual([breadthRecord]);
  });
});
