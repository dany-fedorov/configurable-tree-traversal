import { internalTreeStore } from './internal-runner-fixtures';
import { treeResolution } from './source-result-fixtures';
import { MutableRef } from '../src/core/CTTRef';
import type { TreeSource } from '../src/core/TraversableTree';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName } from '../src/core/TraversalVisitor';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { Vertex } from '../src/core/Vertex';
import {
  BreadthFirstPhase,
  BreadthFirstTreeTraversal,
  traverseTreeBreadthFirst,
} from '../src/traversals/breadth-first-traversal';
import { BreadthFirstTraversalRunnerState } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerState';
import {
  DepthFirstPhase,
  DepthFirstTreeTraversal,
  traverseTreeDepthFirst,
} from '../src/traversals/depth-first-traversal';
import { shouldYieldForOrder } from '../src/traversals/depth-first-traversal/iterable-helpers/shouldYieldForOrder';
import type { DepthFirstTraversalRunnerIterableConfig } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import {
  createInternalBreadthFirstTreeTraversal,
  runnerInternals,
} from './internal-runner-fixtures';

type Node = { $data: string; $childHints: Array<Node | null> };
type Tree = VertexTypes<string, Node | null>;

const node = ($data: string, ...$childHints: Array<Node | null>): Node => ({
  $data,
  $childHints,
});
const adapter = (root: Node | null): TreeSource<Tree> => ({
  resolveRoot: () => treeResolution(root),
  resolveChild: (hint) => treeResolution(hint),
});

test('depth-first convenience visitors run at their requested orders', () => {
  const visits: string[] = [];
  const runner = traverseTreeDepthFirst({
    traversableTree: adapter(node('root', node('child'))),
    visitors: {
      PRE_ORDER: (vertex, options) => {
        visits.push(`${options.phase}:${vertex.getData()}`);
      },
      IN_ORDER: (vertex, options) => {
        visits.push(`${options.phase}:${vertex.getData()}`);
      },
      POST_ORDER: (vertex, options) => {
        visits.push(`${options.phase}:${vertex.getData()}`);
      },
    },
  });

  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(visits).toEqual([
    `${DepthFirstPhase.PRE_ORDER}:root`,
    `${DepthFirstPhase.PRE_ORDER}:child`,
    `${DepthFirstPhase.IN_ORDER}:child`,
    `${DepthFirstPhase.POST_ORDER}:child`,
    `${DepthFirstPhase.IN_ORDER}:root`,
    `${DepthFirstPhase.POST_ORDER}:root`,
  ]);
});

test('depth-first convenience traversal accepts no visitors or config', () => {
  const runner = traverseTreeDepthFirst({
    traversableTree: adapter(node('root')),
  });

  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(internalTreeStore(runner).getRoot()?.getValue().getData()).toBe(
    'root',
  );
});

test('breadth-first convenience visitor receives sorted level-order vertices', () => {
  const visits: string[] = [];
  const runner = traverseTreeBreadthFirst({
    traversableTree: adapter(node('root', node('a'), node('b'))),
    ...{ transformChildHints: <Hint>(hints: Hint[]) => hints.reverse() },
    visitors: {
      LEVEL_ORDER: (vertex, options) => {
        visits.push(`${options.phase}:${vertex.getData()}`);
      },
    },
  });

  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(visits).toEqual([
    `${BreadthFirstPhase.LEVEL_ORDER}:root`,
    `${BreadthFirstPhase.LEVEL_ORDER}:b`,
    `${BreadthFirstPhase.LEVEL_ORDER}:a`,
  ]);
});

test('breadth-first set/list visitors preserve priority order when executed', () => {
  const traversal = new BreadthFirstTreeTraversal<Tree>({
    traversableTree: adapter(node('root')),
  });
  const visits: string[] = [];
  const lowerPriority = () => {
    visits.push('lower');
  };
  const higherPriority = () => {
    visits.push('higher');
  };

  const returned = traversal.setVisitorsFor(BreadthFirstPhase.LEVEL_ORDER, [
    {
      priority: 10,
      commandCommitMode: 'afterEachVisitor' as const,
      visitor: lowerPriority,
    },
    {
      priority: 20,
      commandCommitMode: 'afterEachVisitor' as const,
      visitor: higherPriority,
    },
  ]);

  expect(returned).toBe(traversal);
  expect(
    traversal
      .listVisitorsFor(BreadthFirstPhase.LEVEL_ORDER)
      .map((record) => record.visitor),
  ).toEqual([higherPriority, lowerPriority]);
  traversal.createRunner().run();
  expect(visits).toEqual(['higher', 'lower']);
});

test('depth-first visitor listing reflects priority sorting', () => {
  const traversal = new DepthFirstTreeTraversal<Tree>({
    traversableTree: adapter(node('root')),
  });
  const lowerPriority = () => undefined;
  const higherPriority = () => undefined;

  traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, lowerPriority, {
    priority: 10,
  });
  traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, higherPriority, {
    priority: 20,
  });

  expect(
    traversal
      .listVisitorsFor(DepthFirstPhase.PRE_ORDER)
      .map((record) => record.visitor),
  ).toEqual([higherPriority, lowerPriority]);
});

test.each(['depth-first', 'breadth-first'] as const)(
  '%s NOOP commands preserve the vertex and traversal',
  (strategy) => {
    const root = node('root', node('child'));
    const values: string[] = [];
    if (strategy === 'depth-first') {
      const traversal = new DepthFirstTreeTraversal<Tree>({
        traversableTree: adapter(root),
      });
      traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, () => ({
        commands: [{ commandName: TraversalVisitorCommandName.NOOP }],
      }));
      for (const event of traversal.createRunner().iterateEvents({
        emitEvents: [DepthFirstPhase.PRE_ORDER],
      }))
        values.push(event.vertex.getData());
    } else {
      const traversal = new BreadthFirstTreeTraversal<Tree>({
        traversableTree: adapter(root),
      });
      traversal.addVisitorFor(BreadthFirstPhase.LEVEL_ORDER, () => ({
        commands: [{ commandName: TraversalVisitorCommandName.NOOP }],
      }));
      for (const event of traversal.createRunner().iterateEvents())
        values.push(event.vertex.getData());
    }

    expect(values).toEqual(['root', 'child']);
  },
);

test.each(['depth-first', 'breadth-first'] as const)(
  '%s adopts a registered root assigned after runner construction',
  (strategy) => {
    const traversal =
      strategy === 'depth-first'
        ? new DepthFirstTreeTraversal<Tree>({
            traversableTree: {
              ...adapter(node('unused')),
              resolveRoot: () => {
                throw new Error('Registered root must be reused');
              },
            },
          })
        : new BreadthFirstTreeTraversal<Tree>({
            traversableTree: {
              ...adapter(node('unused')),
              resolveRoot: () => {
                throw new Error('Registered root must be reused');
              },
            },
          });
    const runner = traversal.createRunner();
    const root = new MutableRef(new Vertex<Tree>(node('late-root')));
    runnerInternals(runner).resolvedTreesContainer.setRoot(root);
    expect(
      [...runner.iterateEvents()].map((event) => event.vertex.getData()),
    ).toEqual(
      strategy === 'depth-first'
        ? ['late-root', 'late-root', 'late-root']
        : ['late-root'],
    );
  },
);

test('depth-first hint rewrites outside pre-order fail the runner', () => {
  const traversal = new DepthFirstTreeTraversal<Tree>({
    traversableTree: adapter(node('root')),
  });
  traversal.addVisitorFor(
    DepthFirstPhase.POST_ORDER,
    () =>
      ({
        commands: [
          {
            commandName: TraversalVisitorCommandName.REWRITE_CHILD_HINTS,
            commandArguments: { newHints: [node('late')] },
          },
        ],
      } as never),
  );
  const runner = traversal.createRunner();

  expect(() => runner.run()).toThrow(/only be rewritten during pre-order/i);
  expect(runner.getStatus()).toBe(TraversalRunnerStatus.FAILED);
});

test('an enable list runs only named depth-first visitors while iteration filters independently', () => {
  const traversal = new DepthFirstTreeTraversal<Tree>({
    traversableTree: adapter(node('root')),
  });
  const visits: DepthFirstPhase[] = [];
  for (const order of Object.values(DepthFirstPhase)) {
    traversal.addVisitorFor(order, (_vertex, options) => {
      visits.push(options.phase);
    });
  }

  const yielded = [
    ...traversal.createRunner().iterateEvents({
      visitorPhases: { include: [DepthFirstPhase.PRE_ORDER] },
      emitEvents: [DepthFirstPhase.POST_ORDER],
    }),
  ];

  expect(visits).toEqual([DepthFirstPhase.PRE_ORDER]);
  expect(yielded.map((event) => event.phase)).toEqual([
    DepthFirstPhase.POST_ORDER,
  ]);
});

test('object-form fallback ranges control depth-first in-order boundaries', () => {
  const traversal = new DepthFirstTreeTraversal<Tree>({
    traversableTree: adapter(node('root', node('first'), node('second'))),
    inOrder: {
      afterChildIndices: { indices: [99] },
      fallbackChildIndices: { indices: [0] },
    },
  });

  expect(
    [
      ...traversal.createRunner().iterateEvents({
        emitEvents: [DepthFirstPhase.IN_ORDER],
      }),
    ].map((event) => event.vertex.getData()),
  ).toEqual(['first', 'root', 'second']);
});

test('the historical yield helper defaults to yielding for omitted JavaScript input', () => {
  const javascriptConfig = {
    enableVisitorFunctionsFor: null,
    disableVisitorFunctionsFor: null,
  } as unknown as DepthFirstTraversalRunnerIterableConfig;

  expect(shouldYieldForOrder(javascriptConfig, DepthFirstPhase.PRE_ORDER)).toBe(
    true,
  );
});

test.each(['depth-first', 'breadth-first'] as const)(
  '%s ignores an unregistered preassigned root reference',
  (strategy) => {
    let visitorCalls = 0;
    const traversal =
      strategy === 'depth-first'
        ? new DepthFirstTreeTraversal<Tree>({
            traversableTree: adapter(node('unused')),
          })
        : new BreadthFirstTreeTraversal<Tree>({
            traversableTree: adapter(node('unused')),
          });
    if (traversal instanceof DepthFirstTreeTraversal) {
      traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, () => {
        visitorCalls++;
      });
    } else {
      traversal.addVisitorFor(BreadthFirstPhase.LEVEL_ORDER, () => {
        visitorCalls++;
      });
    }
    const runner = traversal.createRunner();
    const unregisteredRoot = new MutableRef(new Vertex<Tree>(node('detached')));
    internalTreeStore(runner).setRoot(unregisteredRoot);

    expect([...runner.iterateEvents()]).toEqual([]);
    expect(visitorCalls).toBe(0);
    expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
  },
);

test.each(['missing', 'disabled'] as const)(
  'breadth-first injected state skips queued work whose parent is %s',
  (mode) => {
    const seedRunner = new BreadthFirstTreeTraversal<Tree>({
      traversableTree: adapter(node('root')),
    })
      .createRunner()
      .run();
    const rootRef = internalTreeStore(seedRunner).getRoot()!;
    const missingParentRef = new MutableRef(new Vertex<Tree>(node('removed')));
    const parentRef = mode === 'missing' ? missingParentRef : rootRef;
    const state = new BreadthFirstTraversalRunnerState<Tree, Tree>({
      queue: [
        {
          depth: 1,
          hintIndex: 0,
          parentVertex: parentRef.getValue(),
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
    const traversal = createInternalBreadthFirstTreeTraversal<Tree>({
      traversableTree: {
        resolveRoot: () => {
          throw new Error('the injected resolved root should be reused');
        },
        resolveChild: (hint) => {
          childResolutionCalls++;
          return treeResolution(hint);
        },
      },
      traversalRunnerInternalObjects: {
        resolvedTreesContainer:
          runnerInternals(seedRunner).resolvedTreesContainer,
        state,
      },
    });

    const runner = traversal.createRunner().run();
    expect(runner.getStatus()).toBe(TraversalRunnerStatus.FINISHED);
    expect(childResolutionCalls).toBe(0);
    expect(internalTreeStore(runner).getRoot()).toBe(rootRef);
  },
);
