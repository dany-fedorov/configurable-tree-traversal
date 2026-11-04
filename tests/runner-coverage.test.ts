import { internalTreeStore } from './internal-runner-fixtures';
import { treeResolution } from './source-result-fixtures';
import { MutableValueReference } from '../src/core/CTTRef';
import type { TreeDiscoverySource } from '../src/core/TraversableTree';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName } from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { Vertex } from '../src/core/Vertex';
import {
  BreadthFirstTreeVisitPhase,
  BreadthFirstTreeTraversalBuilder,
  runTreeBreadthFirstUntilSuspendedOrTerminal,
} from '../src/traversals/breadth-first-traversal';
import { BreadthFirstTraversalRunnerState } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerState';
import {
  DepthFirstTreeVisitPhase,
  DepthFirstTreeTraversalBuilder,
  runTreeDepthFirstUntilSuspendedOrTerminal,
} from '../src/traversals/depth-first-traversal';
import { shouldYieldForOrder } from '../src/traversals/depth-first-traversal/iterable-helpers/shouldYieldForOrder';
import type { DepthFirstTraversalRunnerIterableConfig } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import {
  createInternalBreadthFirstTreeTraversal,
  runnerInternals,
} from './internal-runner-fixtures';

type Node = { $vertexData: string; $childDiscoveryHints: Array<Node | null> };
type Tree = VertexDataAndChildHintTypes<string, Node | null>;

const node = ($vertexData: string, ...$childDiscoveryHints: Array<Node | null>): Node => ({
  $vertexData,
  $childDiscoveryHints,
});
const adapter = (root: Node | null): TreeDiscoverySource<Tree> => ({
  resolveRootVertex: () => treeResolution(root),
  resolveChildVertexFromHint: (hint) => treeResolution(hint),
});

test('depth-first convenience visitors run at their requested orders', () => {
  const visits: string[] = [];
  const runner = runTreeDepthFirstUntilSuspendedOrTerminal({
    treeDiscoverySource: adapter(node('root', node('child'))),
    visitors: {
      BEFORE_CHILD_EXPANSION: (vertex, options) => {
        visits.push(`${options.visitorPhase}:${vertex.getVertexData()}`);
      },
      AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES: (vertex, options) => {
        visits.push(`${options.visitorPhase}:${vertex.getVertexData()}`);
      },
      AFTER_CHILD_SUBTREES: (vertex, options) => {
        visits.push(`${options.visitorPhase}:${vertex.getVertexData()}`);
      },
    },
  });

  expect(runner.getTraversalLifecycleStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(visits).toEqual([
    `${DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION}:root`,
    `${DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION}:child`,
    `${DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES}:child`,
    `${DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES}:child`,
    `${DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES}:root`,
    `${DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES}:root`,
  ]);
});

test('depth-first convenience traversal accepts no visitors or config', () => {
  const runner = runTreeDepthFirstUntilSuspendedOrTerminal({
    treeDiscoverySource: adapter(node('root')),
  });

  expect(runner.getTraversalLifecycleStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(internalTreeStore(runner).getRootVertexReferenceOrNull()?.getReferencedValue().getVertexData()).toBe(
    'root',
  );
});

test('breadth-first convenience visitor receives sorted level-order vertices', () => {
  const visits: string[] = [];
  const runner = runTreeBreadthFirstUntilSuspendedOrTerminal({
    treeDiscoverySource: adapter(node('root', node('a'), node('b'))),
    ...{ transformChildHintsBeforeResolution: <Hint>(hints: Hint[]) => hints.reverse() },
    visitors: {
      AT_LEVEL_ORDER_VERTEX: (vertex, options) => {
        visits.push(`${options.visitorPhase}:${vertex.getVertexData()}`);
      },
    },
  });

  expect(runner.getTraversalLifecycleStatus()).toBe(TraversalRunnerStatus.FINISHED);
  expect(visits).toEqual([
    `${BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX}:root`,
    `${BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX}:b`,
    `${BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX}:a`,
  ]);
});

test('breadth-first set/list visitors preserve priority order when executed', () => {
  const traversal = new BreadthFirstTreeTraversalBuilder<Tree>({
    treeDiscoverySource: adapter(node('root')),
  });
  const visits: string[] = [];
  const lowerPriority = () => {
    visits.push('lower');
  };
  const higherPriority = () => {
    visits.push('higher');
  };

  const returned = traversal.replaceVisitorDefinitionsForPhase(BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX, [
    {
      descendingExecutionPriorityWithinGroup: 10,
      visitorCommandCommitTiming: "afterEachVisitorCallback" as const,
      visitor: lowerPriority,
    },
    {
      descendingExecutionPriorityWithinGroup: 20,
      visitorCommandCommitTiming: "afterEachVisitorCallback" as const,
      visitor: higherPriority,
    },
  ]);

  expect(returned).toBe(traversal);
  expect(
    traversal
      .getDetachedVisitorRegistrationRecordsForPhase(BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX)
      .map((record) => record.visitor),
  ).toEqual([higherPriority, lowerPriority]);
  traversal.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
  expect(visits).toEqual(['higher', 'lower']);
});

test('depth-first visitor listing reflects priority sorting', () => {
  const traversal = new DepthFirstTreeTraversalBuilder<Tree>({
    treeDiscoverySource: adapter(node('root')),
  });
  const lowerPriority = () => undefined;
  const higherPriority = () => undefined;

  traversal.registerVisitorForPhase(DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION, lowerPriority, {
    descendingExecutionPriorityWithinGroup: 10,
  });
  traversal.registerVisitorForPhase(DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION, higherPriority, {
    descendingExecutionPriorityWithinGroup: 20,
  });

  expect(
    traversal
      .getDetachedVisitorRegistrationRecordsForPhase(DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION)
      .map((record) => record.visitor),
  ).toEqual([higherPriority, lowerPriority]);
});

test.each(['depth-first', 'breadth-first'] as const)(
  '%s NOOP commands preserve the vertex and traversal',
  (strategy) => {
    const root = node('root', node('child'));
    const values: string[] = [];
    if (strategy === 'depth-first') {
      const traversal = new DepthFirstTreeTraversalBuilder<Tree>({
        treeDiscoverySource: adapter(root),
      });
      traversal.registerVisitorForPhase(DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION, () => ({
        commands: [{ commandName: TraversalVisitorCommandName.NO_OPERATION }],
      }));
      for (const event of traversal.createIndependentRunnerFromCurrentOptions().runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION],
      }))
        values.push(event.vertex.getVertexData());
    } else {
      const traversal = new BreadthFirstTreeTraversalBuilder<Tree>({
        treeDiscoverySource: adapter(root),
      });
      traversal.registerVisitorForPhase(BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX, () => ({
        commands: [{ commandName: TraversalVisitorCommandName.NO_OPERATION }],
      }));
      for (const event of traversal.createIndependentRunnerFromCurrentOptions().runAndIterateObservationEventsUntilSuspendedOrTerminal())
        values.push(event.vertex.getVertexData());
    }

    expect(values).toEqual(['root', 'child']);
  },
);

test.each(['depth-first', 'breadth-first'] as const)(
  '%s adopts a registered root assigned after runner construction',
  (strategy) => {
    const traversal =
      strategy === 'depth-first'
        ? new DepthFirstTreeTraversalBuilder<Tree>({
            treeDiscoverySource: {
              ...adapter(node('unused')),
              resolveRootVertex: () => {
                throw new Error('Registered root must be reused');
              },
            },
          })
        : new BreadthFirstTreeTraversalBuilder<Tree>({
            treeDiscoverySource: {
              ...adapter(node('unused')),
              resolveRootVertex: () => {
                throw new Error('Registered root must be reused');
              },
            },
          });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    const root = new MutableValueReference(new Vertex<Tree>(node('late-root')));
    runnerInternals(runner).resolvedTreesContainer.setRoot(root);
    expect(
      [...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()].map((event) => event.vertex.getVertexData()),
    ).toEqual(
      strategy === 'depth-first'
        ? ['late-root', 'late-root', 'late-root']
        : ['late-root'],
    );
  },
);

test('depth-first hint rewrites outside pre-order fail the runner', () => {
  const traversal = new DepthFirstTreeTraversalBuilder<Tree>({
    treeDiscoverySource: adapter(node('root')),
  });
  traversal.registerVisitorForPhase(
    DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
    () =>
      ({
        commands: [
          {
            commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
            commandArguments: { replacementChildHints: [node('late')] },
          },
        ],
      } as never),
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();

  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(/only be rewritten during pre-order/i);
  expect(runner.getTraversalLifecycleStatus()).toBe(TraversalRunnerStatus.FAILED);
});

test('an enable list runs only named depth-first visitors while iteration filters independently', () => {
  const traversal = new DepthFirstTreeTraversalBuilder<Tree>({
    treeDiscoverySource: adapter(node('root')),
  });
  const visits: DepthFirstTreeVisitPhase[] = [];
  for (const order of Object.values(DepthFirstTreeVisitPhase)) {
    traversal.registerVisitorForPhase(order, (_vertex, options) => {
      visits.push(options.visitorPhase);
    });
  }

  const yielded = [
    ...traversal.createIndependentRunnerFromCurrentOptions().runAndIterateObservationEventsUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases: { include: [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION] },
      deliveredEventKinds: [DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES],
    }),
  ];

  expect(visits).toEqual([DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]);
  expect(yielded.map((event) => event.eventKind)).toEqual([
    DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
  ]);
});

test('object-form fallback ranges control depth-first in-order boundaries', () => {
  const traversal = new DepthFirstTreeTraversalBuilder<Tree>({
    treeDiscoverySource: adapter(node('root', node('first'), node('second'))),
    childBoundaryVisits: {
      visitAfterChildIndices: { indices: [99] },
      visitAfterChildIndicesWhenPrimarySelectionIsEmpty: { indices: [0] },
    },
  });

  expect(
    [
      ...traversal.createIndependentRunnerFromCurrentOptions().runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES],
      }),
    ].map((event) => event.vertex.getVertexData()),
  ).toEqual(['first', 'root', 'second']);
});

test('the historical yield helper defaults to yielding for omitted JavaScript input', () => {
  const javascriptConfig = {
    enableVisitorFunctionsFor: null,
    disableVisitorFunctionsFor: null,
  } as unknown as DepthFirstTraversalRunnerIterableConfig;

  expect(shouldYieldForOrder(javascriptConfig, DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION)).toBe(
    true,
  );
});

test.each(['depth-first', 'breadth-first'] as const)(
  '%s ignores an unregistered preassigned root reference',
  (strategy) => {
    let visitorCalls = 0;
    const traversal =
      strategy === 'depth-first'
        ? new DepthFirstTreeTraversalBuilder<Tree>({
            treeDiscoverySource: adapter(node('unused')),
          })
        : new BreadthFirstTreeTraversalBuilder<Tree>({
            treeDiscoverySource: adapter(node('unused')),
          });
    if (traversal instanceof DepthFirstTreeTraversalBuilder) {
      traversal.registerVisitorForPhase(DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION, () => {
        visitorCalls++;
      });
    } else {
      traversal.registerVisitorForPhase(BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX, () => {
        visitorCalls++;
      });
    }
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    const unregisteredRoot = new MutableValueReference(new Vertex<Tree>(node('detached')));
    internalTreeStore(runner).setRootVertexReference(unregisteredRoot);

    expect([...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()]).toEqual([]);
    expect(visitorCalls).toBe(0);
    expect(runner.getTraversalLifecycleStatus()).toBe(TraversalRunnerStatus.FINISHED);
  },
);

test.each(['missing', 'disabled'] as const)(
  'breadth-first injected state skips queued work whose parent is %s',
  (mode) => {
    const seedRunner = new BreadthFirstTreeTraversalBuilder<Tree>({
      treeDiscoverySource: adapter(node('root')),
    })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    const rootRef = internalTreeStore(seedRunner).getRootVertexReferenceOrNull()!;
    const missingParentRef = new MutableValueReference(new Vertex<Tree>(node('removed')));
    const parentRef = mode === 'missing' ? missingParentRef : rootRef;
    const state = new BreadthFirstTraversalRunnerState<Tree, Tree>({
      queue: [
        {
          discoveryDepthInEdges: 1,
          parentChildHintIndex: 0,
          parentVertexAtChildResolution: parentRef.getReferencedValue(),
          parentVertexReference: parentRef,
          childDiscoveryHint: node('queued'),
        },
      ],
      queueIndex: 0,
      status: TraversalRunnerStatus.NOT_STARTED,
      subtreeTraversalDisabledRefs:
        mode === 'disabled' ? new Set([rootRef]) : new Set(),
    });
    let childResolutionCalls = 0;
    const traversal = createInternalBreadthFirstTreeTraversal<Tree>({
      treeDiscoverySource: {
        resolveRootVertex: () => {
          throw new Error('the injected resolved root should be reused');
        },
        resolveChildVertexFromHint: (hint) => {
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

    const runner = traversal.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
    expect(runner.getTraversalLifecycleStatus()).toBe(TraversalRunnerStatus.FINISHED);
    expect(childResolutionCalls).toBe(0);
    expect(internalTreeStore(runner).getRootVertexReferenceOrNull()).toBe(rootRef);
  },
);
