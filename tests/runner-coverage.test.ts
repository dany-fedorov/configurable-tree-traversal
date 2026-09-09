import { CTTRef } from '../src/core/CTTRef';
import type { TraversableTree } from '../src/core/TraversableTree';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import {
  TraversalVisitorCommandName,
  TraversalVisitorFunctionResolutionStyle,
} from '../src/core/TraversalVisitor';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import { Vertex } from '../src/core/Vertex';
import {
  BreadthFirstTraversal,
  BreadthFirstTraversalOrder,
  traverseBreadthFirst,
} from '../src/traversals/breadth-first-traversal';
import { BreadthFirstTraversalRunnerState } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerState';
import {
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
  traverseDepthFirst,
} from '../src/traversals/depth-first-traversal';
import { shouldYieldForOrder } from '../src/traversals/depth-first-traversal/iterable-helpers/shouldYieldForOrder';
import type { DepthFirstTraversalRunnerIterableConfig } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';

type Node = { $d: string; $c: Array<Node | null> };
type Tree = TreeTypeParameters<string, Node | null>;

const node = ($d: string, ...$c: Array<Node | null>): Node => ({ $d, $c });
const adapter = (root: Node | null): TraversableTree<Tree> => ({
  makeRoot: () => ({ vertexContent: root }),
  makeVertex: (hint) => ({ vertexContent: hint }),
});

test('depth-first convenience visitors run at their requested orders', () => {
  const visits: string[] = [];
  const runner = traverseDepthFirst(adapter(node('root', node('child'))), {
    preOrderVisitor: (vertex, options) => {
      visits.push(`${options.order}:${vertex.getData()}`);
    },
    inOrderVisitor: (vertex, options) => {
      visits.push(`${options.order}:${vertex.getData()}`);
    },
    postOrderVisitor: (vertex, options) => {
      visits.push(`${options.order}:${vertex.getData()}`);
    },
  });

  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(visits).toEqual([
    `${DepthFirstTraversalOrder.PRE_ORDER}:root`,
    `${DepthFirstTraversalOrder.PRE_ORDER}:child`,
    `${DepthFirstTraversalOrder.IN_ORDER}:child`,
    `${DepthFirstTraversalOrder.POST_ORDER}:child`,
    `${DepthFirstTraversalOrder.IN_ORDER}:root`,
    `${DepthFirstTraversalOrder.POST_ORDER}:root`,
  ]);
});

test('depth-first convenience traversal accepts no visitors or config', () => {
  const runner = traverseDepthFirst(adapter(node('root')), null);

  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(runner.getResolvedTree().getRoot()?.unref().getData()).toBe('root');
});

test('breadth-first convenience visitor receives sorted level-order vertices', () => {
  const visits: string[] = [];
  const runner = traverseBreadthFirst(
    adapter(node('root', node('a'), node('b'))),
    (vertex, options) => {
      visits.push(`${options.order}:${vertex.getData()}`);
    },
    { sortChildrenHints: (hints) => hints.reverse() },
  );

  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(visits).toEqual([
    `${BreadthFirstTraversalOrder.LEVEL_ORDER}:root`,
    `${BreadthFirstTraversalOrder.LEVEL_ORDER}:b`,
    `${BreadthFirstTraversalOrder.LEVEL_ORDER}:a`,
  ]);
});

test('breadth-first set/list visitors preserve priority order when executed', () => {
  const traversal = new BreadthFirstTraversal<Tree>({
    traversableTree: adapter(node('root')),
  });
  const visits: string[] = [];
  const lowerPriority = () => {
    visits.push('lower');
  };
  const higherPriority = () => {
    visits.push('higher');
  };

  const returned = traversal.setVisitorsFor(
    BreadthFirstTraversalOrder.LEVEL_ORDER,
    [
      {
        addedIndex: 0,
        priority: 10,
        resolutionStyle: TraversalVisitorFunctionResolutionStyle.SEQUENTIAL,
        visitor: lowerPriority,
      },
      {
        addedIndex: 1,
        priority: 20,
        resolutionStyle: TraversalVisitorFunctionResolutionStyle.SEQUENTIAL,
        visitor: higherPriority,
      },
    ],
  );

  expect(returned).toBe(traversal);
  expect(
    traversal
      .listVisitorsFor(BreadthFirstTraversalOrder.LEVEL_ORDER)
      .map((record) => record.visitor),
  ).toEqual([higherPriority, lowerPriority]);
  traversal.makeRunner().run();
  expect(visits).toEqual(['higher', 'lower']);
});

test('depth-first visitor listing reflects priority sorting', () => {
  const traversal = new DepthFirstTraversal<Tree>({
    traversableTree: adapter(node('root')),
  });
  const lowerPriority = () => undefined;
  const higherPriority = () => undefined;

  traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, lowerPriority, {
    priority: 10,
  });
  traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, higherPriority, {
    priority: 20,
  });

  expect(
    traversal
      .listVisitorsFor(DepthFirstTraversalOrder.PRE_ORDER)
      .map((record) => record.visitor),
  ).toEqual([higherPriority, lowerPriority]);
});

test.each(['depth-first', 'breadth-first'] as const)(
  '%s NOOP commands preserve the vertex and traversal',
  (strategy) => {
    const root = node('root', node('child'));
    const values: string[] = [];
    if (strategy === 'depth-first') {
      const traversal = new DepthFirstTraversal<Tree>({
        traversableTree: adapter(root),
      });
      traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, () => ({
        commands: [{ commandName: TraversalVisitorCommandName.NOOP }],
      }));
      for (const event of traversal.makeRunner().getIterable({
        iterateOver: [DepthFirstTraversalOrder.PRE_ORDER],
      }))
        values.push(event.vertex.getData());
    } else {
      const traversal = new BreadthFirstTraversal<Tree>({
        traversableTree: adapter(root),
      });
      traversal.addVisitorFor(BreadthFirstTraversalOrder.LEVEL_ORDER, () => ({
        commands: [{ commandName: TraversalVisitorCommandName.NOOP }],
      }));
      for (const event of traversal.makeRunner().getIterable())
        values.push(event.vertex.getData());
    }

    expect(values).toEqual(['root', 'child']);
  },
);

test('depth-first hint rewrites outside pre-order fail the runner', () => {
  const traversal = new DepthFirstTraversal<Tree>({
    traversableTree: adapter(node('root')),
  });
  traversal.addVisitorFor(DepthFirstTraversalOrder.POST_ORDER, () => ({
    commands: [
      {
        commandName:
          TraversalVisitorCommandName.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
        commandArguments: { newHints: [node('late')] },
      },
    ],
  }));
  const runner = traversal.makeRunner();

  expect(() => runner.run()).toThrow(/only be rewritten during pre-order/i);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FAILED);
});

test('an enable list runs only named depth-first visitors while iteration filters independently', () => {
  const traversal = new DepthFirstTraversal<Tree>({
    traversableTree: adapter(node('root')),
  });
  const visits: DepthFirstTraversalOrder[] = [];
  for (const order of Object.values(DepthFirstTraversalOrder)) {
    traversal.addVisitorFor(order, (_vertex, options) => {
      visits.push(options.order);
    });
  }

  const yielded = [
    ...traversal.makeRunner().getIterable({
      enableVisitorFunctionsFor: [DepthFirstTraversalOrder.PRE_ORDER],
      iterateOver: [DepthFirstTraversalOrder.POST_ORDER],
    }),
  ];

  expect(visits).toEqual([DepthFirstTraversalOrder.PRE_ORDER]);
  expect(yielded.map((event) => event.order)).toEqual([
    DepthFirstTraversalOrder.POST_ORDER,
  ]);
});

test('object-form fallback ranges control depth-first in-order boundaries', () => {
  const traversal = new DepthFirstTraversal<Tree>({
    traversableTree: adapter(node('root', node('first'), node('second'))),
    inOrderTraversalConfig: {
      visitParentAfterChildren: { ranges: [99] },
      visitParentAfterChildrenAllRangesOutOfBoundsFallback: { ranges: [0] },
    },
  });

  expect(
    [
      ...traversal.makeRunner().getIterable({
        iterateOver: [DepthFirstTraversalOrder.IN_ORDER],
      }),
    ].map((event) => event.vertex.getData()),
  ).toEqual(['first', 'root', 'second']);
});

test('the historical yield helper defaults to yielding for omitted JavaScript input', () => {
  const javascriptConfig = {
    enableVisitorFunctionsFor: null,
    disableVisitorFunctionsFor: null,
  } as unknown as DepthFirstTraversalRunnerIterableConfig;

  expect(
    shouldYieldForOrder(javascriptConfig, DepthFirstTraversalOrder.PRE_ORDER),
  ).toBe(true);
});

test.each(['depth-first', 'breadth-first'] as const)(
  '%s ignores an unregistered preassigned root reference',
  (strategy) => {
    let visitorCalls = 0;
    const traversal =
      strategy === 'depth-first'
        ? new DepthFirstTraversal<Tree>({
            traversableTree: adapter(node('unused')),
          })
        : new BreadthFirstTraversal<Tree>({
            traversableTree: adapter(node('unused')),
          });
    if (traversal instanceof DepthFirstTraversal) {
      traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, () => {
        visitorCalls++;
      });
    } else {
      traversal.addVisitorFor(BreadthFirstTraversalOrder.LEVEL_ORDER, () => {
        visitorCalls++;
      });
    }
    const runner = traversal.makeRunner();
    const unregisteredRoot = new CTTRef(new Vertex<Tree>(node('detached')));
    runner.getResolvedTree().setRoot(unregisteredRoot);

    expect([...runner.getIterable()]).toEqual([]);
    expect(visitorCalls).toBe(0);
    expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  },
);

test.each(['missing', 'disabled'] as const)(
  'breadth-first injected state skips queued work whose parent is %s',
  (mode) => {
    const seedRunner = new BreadthFirstTraversal<Tree>({
      traversableTree: adapter(node('root')),
    })
      .makeRunner()
      .run();
    const rootRef = seedRunner.getResolvedTree().getRoot()!;
    const missingParentRef = new CTTRef(new Vertex<Tree>(node('removed')));
    const parentRef = mode === 'missing' ? missingParentRef : rootRef;
    const state = new BreadthFirstTraversalRunnerState<Tree, Tree>({
      queue: [
        {
          depth: 1,
          hintIndex: 0,
          parentVertex: parentRef.unref(),
          parentVertexRef: parentRef,
          vertexHint: node('queued'),
        },
      ],
      queueIndex: 0,
      status: TraversalRunnerStatus.INITIAL,
      subtreeTraversalDisabledRefs:
        mode === 'disabled' ? new Set([rootRef]) : new Set(),
    });
    let childResolutionCalls = 0;
    const traversal = new BreadthFirstTraversal<Tree>({
      traversableTree: {
        makeRoot: () => {
          throw new Error('the injected resolved root should be reused');
        },
        makeVertex: (hint) => {
          childResolutionCalls++;
          return { vertexContent: hint };
        },
      },
      traversalRunnerInternalObjects: {
        resolvedTreesContainer: seedRunner.resolvedTreesContainer,
        state,
      },
    });

    const runner = traversal.makeRunner().run();
    expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
    expect(childResolutionCalls).toBe(0);
    expect(runner.getResolvedTree().getRoot()).toBe(rootRef);
  },
);
