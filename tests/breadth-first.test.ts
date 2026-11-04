import { treeResolution } from './source-result-fixtures';
import type { TreeDiscoverySource } from '../src/core/TraversableTree';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import {
  BreadthFirstTreeVisitPhase as Order,
  BreadthFirstTreeTraversalBuilder,
  runTreeBreadthFirstUntilSuspendedOrTerminal,
} from '../src/traversals/breadth-first-traversal';
import { runnerInternals } from './internal-runner-fixtures';

type Node = { $vertexData: string; $childDiscoveryHints: (Node | null)[] };
type TTP = VertexDataAndChildHintTypes<string, Node | null>;

const node = (
  $vertexData: string,
  ...$childDiscoveryHints: (Node | null)[]
): Node => ({
  $vertexData,
  $childDiscoveryHints,
});

function setup(
  root: Node | null = node(
    'A',
    node('B', node('D'), node('E')),
    node('C', node('F'), node('G')),
  ),
) {
  const calls: string[] = [];
  const tree: TreeDiscoverySource<TTP> = {
    resolveRootVertex: () => {
      calls.push('root');
      return treeResolution(root);
    },
    resolveChildVertexFromHint: (hint) => {
      calls.push(`vertex:${hint?.$vertexData ?? 'null'}`);
      return treeResolution(hint);
    },
  };
  return {
    calls,
    tree,
    traversal: new BreadthFirstTreeTraversalBuilder<TTP>({
      treeDiscoverySource: tree,
    }),
  };
}

const yieldedValues = (
  runner: ReturnType<
    typeof setup
  >['traversal'] extends BreadthFirstTreeTraversalBuilder<TTP>
    ? ReturnType<
        BreadthFirstTreeTraversalBuilder<TTP>['createIndependentRunnerFromCurrentOptions']
      >
    : never,
) =>
  [...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()].map(
    (event) => event.vertex.getVertexData(),
  );

describe('breadth-first traversal', () => {
  test('visits vertices in hand-checked level order', () => {
    expect(
      yieldedValues(
        setup().traversal.createIndependentRunnerFromCurrentOptions(),
      ),
    ).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });

  test('resolves the root and children lazily', () => {
    const { traversal, calls } = setup();
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    expect(calls).toEqual([]);
    const iterator =
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
    expect(calls).toEqual([]);
    expect(iterator.next().value?.vertex.getVertexData()).toBe('A');
    expect(calls).toEqual(['root']);
    expect(iterator.next().value?.vertex.getVertexData()).toBe('B');
    expect(calls).toEqual(['root', 'vertex:B']);
    iterator.return?.(undefined);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  });

  test('finishes an empty tree without resolving children', () => {
    const { traversal, calls } = setup(null);
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    expect([
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ]).toEqual([]);
    expect(calls).toEqual(['root']);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    expect(
      runner.getLiveResolvedTreeView().getRootVertexHandleOrNull(),
    ).toBeNull();
  });

  test('sorts a copy of each hint list and skips null results', () => {
    const root = node('root', node('b'), null, node('a'));
    const { traversal } = setup(root);
    traversal.patchOptionsForFutureRunners({
      transformChildHintsBeforeResolution: (hints) => hints.reverse(),
    });
    expect(
      yieldedValues(traversal.createIndependentRunnerFromCurrentOptions()),
    ).toEqual(['root', 'a', 'b']);
    expect(
      root.$childDiscoveryHints.map((child) => child?.$vertexData ?? null),
    ).toEqual(['b', null, 'a']);
  });

  test('orders visitors by priority and preserves them across configure', () => {
    const { traversal } = setup(node('root'));
    const visits: string[] = [];
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      () => {
        visits.push('low');
      },
      { descendingExecutionPriorityWithinGroup: 1 },
    );
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      () => {
        visits.push('high-first');
      },
      { descendingExecutionPriorityWithinGroup: 2 },
    );
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      () => {
        visits.push('high-second');
      },
      { descendingExecutionPriorityWithinGroup: 2 },
    );
    traversal.patchOptionsForFutureRunners({
      transformChildHintsBeforeResolution: null,
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      () => {
        visits.push('late');
      },
    );
    runner.runUntilSuspendedOrTerminal();
    expect(visits).toEqual(['high-first', 'high-second', 'low']);
  });

  test('rewrites hints before children are scheduled', () => {
    const { traversal } = setup(node('root', node('old'), node('sibling')));
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      (vertex) =>
        vertex.getVertexData() === 'root'
          ? {
              commands: [
                {
                  commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
                  commandArguments: { replacementChildHints: [node('new')] },
                },
              ],
            }
          : undefined,
    );
    expect(
      yieldedValues(traversal.createIndependentRunnerFromCurrentOptions()),
    ).toEqual(['root', 'new']);
  });

  test.each([
    [Command.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX],
    [Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS],
  ] as const)(
    '%s suppresses descendants while later siblings continue',
    (commandName) => {
      const { traversal } = setup(
        node('root', node('branch', node('hidden')), node('sibling')),
      );
      traversal.registerVisitorForPhase(
        Order.AT_LEVEL_ORDER_VERTEX,
        (vertex) =>
          vertex.getVertexData() === 'branch'
            ? { commands: [{ commandName }] }
            : undefined,
      );
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      expect(yieldedValues(runner)).toEqual(
        commandName ===
          Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS
          ? ['root', 'sibling']
          : ['root', 'branch', 'sibling'],
      );
      const rootRef = runner
        .getLiveResolvedTreeView()
        .getRootVertexHandleOrNull();
      expect(
        rootRef &&
          runner
            .getLiveResolvedTreeView()
            .getChildVertexHandlesOrNull(rootRef)
            ?.map((ref) => ref.getCurrentVertexView().getVertexData()),
      ).toEqual(
        commandName ===
          Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS
          ? ['sibling']
          : ['branch', 'sibling'],
      );
    },
  );

  test('deleting the root skips all child resolution and clears the resolved root', () => {
    const { traversal, calls } = setup(node('root', node('hidden')));
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      () => ({
        commands: [
          {
            commandName:
              Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
          },
        ],
      }),
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    expect([
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ]).toEqual([]);
    expect(calls).toEqual(['root']);
    expect(
      runner.getLiveResolvedTreeView().getRootVertexHandleOrNull(),
    ).toBeNull();
  });

  test('halts with no yielded orders and resumes the remaining visitor chain', () => {
    const { traversal } = setup(node('root', node('child')));
    const visits: string[] = [];
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      (vertex) => {
        visits.push(`first:${vertex.getVertexData()}`);
        return vertex.getVertexData() === 'root'
          ? {
              commands: [
                {
                  commandName:
                    Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
                },
              ],
            }
          : undefined;
      },
    );
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      (vertex) => {
        visits.push(`second:${vertex.getVertexData()}`);
      },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
    expect(visits).toEqual(['first:root']);
    runner.runUntilSuspendedOrTerminal();
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    expect(visits).toEqual([
      'first:root',
      'second:root',
      'first:child',
      'second:child',
    ]);
  });

  test('preserves the pending chain through repeated visitor halts', () => {
    const { traversal } = setup(node('root'));
    const visits: number[] = [];
    for (let index = 0; index < 3; index++) {
      traversal.registerVisitorForPhase(
        Order.AT_LEVEL_ORDER_VERTEX,
        () => {
          visits.push(index);
          return {
            commands: [
              {
                commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
              },
            ],
          };
        },
      );
    }
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    for (let index = 0; index < 3; index++) {
      runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
      expect(visits).toEqual(Array.from({ length: index + 1 }, (_, i) => i));
    }
    runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    expect(visits).toEqual([0, 1, 2]);
  });

  test('applies new iterable filters after a consumer break', () => {
    const { traversal } = setup(node('root', node('child')));
    const visits: string[] = [];
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      (vertex) => {
        visits.push(vertex.getVertexData());
      },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    for (const _event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      {
        admittedVisitorCallbackPhases: {
          exclude: [Order.AT_LEVEL_ORDER_VERTEX],
        },
      },
    ))
      break;
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
    expect(visits).toEqual([]);
    expect([
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [],
        admittedVisitorCallbackPhases: {
          include: [Order.AT_LEVEL_ORDER_VERTEX],
        },
      }),
    ]).toEqual([]);
    expect(visits).toEqual(['child']);
  });

  test('shares concurrent snapshots and sequential chain state semantics', () => {
    const { traversal } = setup(node('root'));
    const seen: unknown[] = [];
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      (vertex) => {
        seen.push(vertex.getVertexData());
        return {
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: { replacementVertexData: 'changed' },
            },
          ],
        };
      },
      { visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const },
    );
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      (vertex) => {
        seen.push(vertex.getVertexData());
      },
      { visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const },
    );
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      (vertex) => {
        seen.push(vertex.getVertexData());
        return {
          commands: [
            {
              commandName: Command.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
              commandArguments: { phaseChainState: 42 },
            },
          ],
        };
      },
    );
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      (_vertex, options) => {
        seen.push(options.currentVertexPhaseChainState);
      },
    );
    traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['root', 'root', 'changed', 42]);
  });

  test('keeps an original resolved tree after data rewrite and deletion', () => {
    const { traversal } = setup(node('root', node('deleted'), node('kept')));
    let savedLabels: string[] = [];
    traversal.patchOptionsForFutureRunners({
      retainDiscoveredTreeBeforeVisitorCommands: true,
    });
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      (vertex, options) => {
        if (vertex.getVertexData() === 'root') {
          return {
            commands: [
              {
                commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
                commandArguments: { replacementVertexData: 'changed-root' },
              },
            ],
          };
        }
        if (vertex.getVertexData() === 'deleted') {
          return {
            commands: [
              {
                commandName:
                  Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
              },
            ],
          };
        }
        const saved = options.livePreCommandDiscoveredTreeView;
        const savedRoot = saved?.getRootVertexHandleOrNull();
        savedLabels = savedRoot
          ? [
              savedRoot,
              ...(saved?.getChildVertexHandlesOrNull(savedRoot) ?? []),
            ].map((ref) => ref.getCurrentVertexView().getVertexData())
          : [];
        return undefined;
      },
    );
    const runner = traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(savedLabels).toEqual(['root', 'deleted', 'kept']);
    expect(
      runner
        .getLiveResolvedTreeView()
        .getRootVertexHandleOrNull()
        ?.getCurrentVertexView()
        .getVertexData(),
    ).toBe('changed-root');
  });

  test('throws for simultaneous iterators and propagates callback errors', () => {
    const activeRunner = setup(
      node('root', node('child')),
    ).traversal.createIndependentRunnerFromCurrentOptions();
    const first =
      activeRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
    expect(first.next().value?.vertex.getVertexData()).toBe('root');
    const second =
      activeRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
    expect(() => second.next()).toThrow(/one active iterator/i);
    first.return?.(undefined);

    const { traversal } = setup(node('root'));
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      () => {
        throw new Error('visitor failed');
      },
    );
    expect(() =>
      traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    ).toThrow('visitor failed');
  });

  test('the convenience helper accepts a null visitor and completed runners are reusable', () => {
    const { tree } = setup(node('root', node('child')));
    const runner = runTreeBreadthFirstUntilSuspendedOrTerminal({
      treeDiscoverySource: tree,
    });
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    expect(
      runner
        .getLiveResolvedTreeView()
        .getRootVertexHandleOrNull()
        ?.getCurrentVertexView()
        .getVertexData(),
    ).toBe('root');
    runner.runUntilSuspendedOrTerminal();
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
  });

  test('handles a wide queue without recursive calls', () => {
    const root = node(
      'root',
      ...Array.from({ length: 20_000 }, (_, i) => node(String(i))),
    );
    const { traversal } = setup(root);
    let count = 0;
    traversal.registerVisitorForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
      () => {
        count++;
      },
    );
    const runner = traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
    expect(count).toBe(20_001);
    expect(runnerInternals(runner).state.queue).toEqual([]);
    expect(runnerInternals(runner).state.queueIndex).toBe(0);
  });
});
