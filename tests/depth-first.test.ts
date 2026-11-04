import { internalTreeStore } from './internal-runner-fixtures';
import { treeResolution } from './source-result-fixtures';
import type { TreeDiscoverySource } from '../src/core/TraversableTree';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { DepthFirstTreeTraversalBuilder } from '../src/traversals/depth-first-traversal';
import { DepthFirstTreeVisitPhase as Order } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalOrder';

type Node = { $vertexData: string; $childDiscoveryHints: (Node | null)[] };
type TTP = VertexDataAndChildHintTypes<string, Node | null>;
const node = (
  $vertexData: string,
  ...$childDiscoveryHints: (Node | null)[]
): Node => ({
  $vertexData,
  $childDiscoveryHints,
});
function traversal(
  root: Node | null = node(
    'F',
    node('B', node('A'), node('D', node('C'), node('E'))),
    node('G', null, node('I', node('H'))),
  ),
) {
  const tree: TreeDiscoverySource<TTP> = {
    resolveRootVertex: () => treeResolution(root),
    resolveChildVertexFromHint: (hint) => treeResolution(hint),
  };
  return new DepthFirstTreeTraversalBuilder<TTP>({ treeDiscoverySource: tree });
}
const values = (
  runner: ReturnType<
    ReturnType<typeof traversal>['createIndependentRunnerFromCurrentOptions']
  >,
  order: Order,
) =>
  [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [order],
    }),
  ].map((event) => event.vertex.getVertexData());

describe('depth-first traversal', () => {
  test.each([
    [
      Order.BEFORE_CHILD_EXPANSION,
      ['F', 'B', 'A', 'D', 'C', 'E', 'G', 'I', 'H'],
    ],
    [
      Order.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
    ],
    [Order.AFTER_CHILD_SUBTREES, ['A', 'C', 'E', 'D', 'B', 'H', 'I', 'G', 'F']],
  ])('iterates %s without requiring visitor functions', (order, expected) => {
    expect(
      values(traversal().createIndependentRunnerFromCurrentOptions(), order),
    ).toEqual(expected);
  });

  test('finishes an empty tree', () => {
    const runner = traversal(null).createIndependentRunnerFromCurrentOptions();
    expect([
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ]).toEqual([]);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    expect(internalTreeStore(runner).getRootVertexReferenceOrNull()).toBeNull();
  });

  test('sorts copied hints before resolving children', () => {
    const root = node('root', node('b'), node('a'));
    const t = traversal(root).patchOptionsForFutureRunners({
      transformChildHintsBeforeResolution: (hints) => hints.reverse(),
    });
    expect(
      values(
        t.createIndependentRunnerFromCurrentOptions(),
        Order.BEFORE_CHILD_EXPANSION,
      ),
    ).toEqual(['root', 'a', 'b']);
    expect(
      root.$childDiscoveryHints.map((child) => child?.$vertexData),
    ).toEqual(['b', 'a']);
  });

  test('completes parents whose last hint resolves to null', () => {
    const t = traversal(
      node('root', node('branch', node('leaf'), null), node('last')),
    );
    const post: string[] = [];
    t.registerVisitorForPhase(Order.AFTER_CHILD_SUBTREES, (v) => {
      post.push(v.getVertexData());
    });
    t.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
    expect(post).toEqual(['leaf', 'branch', 'last', 'root']);
  });

  test('null hints do not require in-order visitors or count tracking', () => {
    const t = traversal(
      node('root', null, node('leaf')),
    ).patchOptionsForFutureRunners({
      childBoundaryVisits: { allowBoundaryVisitsAfterOmittedChildSlots: false },
    });
    expect(
      values(
        t.createIndependentRunnerFromCurrentOptions(),
        Order.AFTER_CHILD_SUBTREES,
      ),
    ).toEqual(['leaf', 'root']);
  });

  test('disables only the listed visitors', () => {
    const t = traversal(node('root'));
    const visits: Order[] = [];
    for (const order of Object.values(Order))
      t.registerVisitorForPhase(order, (_v, o) => {
        visits.push(o.visitorPhase);
      });
    t.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases: {
        exclude: [Order.BEFORE_CHILD_EXPANSION],
      },
    });
    expect(visits).toEqual([
      Order.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
      Order.AFTER_CHILD_SUBTREES,
    ]);
  });

  test('halts even if the halted order is not yielded and resumes remaining visitors', () => {
    const t = traversal(node('root', node('leaf')));
    const visits: string[] = [];
    t.registerVisitorForPhase(Order.BEFORE_CHILD_EXPANSION, (v) => {
      visits.push(`first:${v.getVertexData()}`);
      if (v.getVertexData() === 'root')
        return {
          commands: [
            { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
          ],
        };
      return undefined;
    });
    t.registerVisitorForPhase(Order.BEFORE_CHILD_EXPANSION, (v) => {
      visits.push(`second:${v.getVertexData()}`);
    });
    const runner = t.createIndependentRunnerFromCurrentOptions();
    runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
    expect(visits).toEqual(['first:root']);
    runner.runUntilSuspendedOrTerminal();
    expect(visits).toEqual([
      'first:root',
      'second:root',
      'first:leaf',
      'second:leaf',
    ]);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    runner.runUntilSuspendedOrTerminal();
    expect(visits).toHaveLength(4);
  });

  test('changes iterator filters when resuming after a break', () => {
    const runner = traversal(
      node('root', node('leaf')),
    ).createIndependentRunnerFromCurrentOptions();
    for (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      {
        deliveredEventKinds: [Order.BEFORE_CHILD_EXPANSION],
      },
    )) {
      expect(event.vertex.getVertexData()).toBe('root');
      break;
    }
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
    expect(values(runner, Order.AFTER_CHILD_SUBTREES)).toEqual([
      'leaf',
      'root',
    ]);
  });

  test('prunes a subtree but completes its parent', () => {
    const t = traversal(
      node('root', node('branch', node('hidden')), node('leaf')),
    );
    t.registerVisitorForPhase(Order.BEFORE_CHILD_EXPANSION, (v) =>
      v.getVertexData() === 'branch'
        ? {
            commands: [
              {
                commandName:
                  Command.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX,
              },
            ],
          }
        : undefined,
    );
    expect(
      values(
        t.createIndependentRunnerFromCurrentOptions(),
        Order.AFTER_CHILD_SUBTREES,
      ),
    ).toEqual(['branch', 'leaf', 'root']);
  });

  test('rewrites hints repeatedly without deleting sibling hints', () => {
    const t = traversal(
      node('root', node('branch', node('old')), node('sibling')),
    );
    t.registerVisitorForPhase(Order.BEFORE_CHILD_EXPANSION, (v) =>
      v.getVertexData() === 'branch'
        ? {
            commands: [
              {
                commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
                commandArguments: { replacementChildHints: [node('discard')] },
              },
              {
                commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
                commandArguments: { replacementChildHints: [node('new')] },
              },
            ],
          }
        : undefined,
    );
    expect(
      values(
        t.createIndependentRunnerFromCurrentOptions(),
        Order.BEFORE_CHILD_EXPANSION,
      ),
    ).toEqual(['root', 'branch', 'new', 'sibling']);
  });

  test('reports previous vertex and zero-based visit and visitor indices', () => {
    const t = traversal(node('root', node('leaf')));
    const seen: unknown[] = [];
    for (let i = 0; i < 2; i++)
      t.registerVisitorForPhase(
        Order.BEFORE_CHILD_EXPANSION,
        (_v, o) => {
          seen.push([
            o.phaseVisitorChainIndex,
            o.visitorCallbackIndexInPhaseChain,
            o.previousCommittedVisitVertexHandleForSamePhase
              ?.getCurrentVertexView()
              .getVertexData() ?? null,
          ]);
        },
      );
    t.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
    expect(seen).toEqual([
      [0, 0, null],
      [0, 1, null],
      [1, 0, 'root'],
      [1, 1, 'root'],
    ]);
  });

  test('concurrent visitors see original data; sequential visitors see commands and chain state', () => {
    const t = traversal(node('root'));
    const seen: unknown[] = [];
    t.registerVisitorForPhase(
      Order.BEFORE_CHILD_EXPANSION,
      (v) => {
        seen.push(v.getVertexData());
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
    t.registerVisitorForPhase(
      Order.BEFORE_CHILD_EXPANSION,
      (v) => {
        seen.push(v.getVertexData());
      },
      { visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const },
    );
    t.registerVisitorForPhase(Order.BEFORE_CHILD_EXPANSION, (v) => {
      seen.push(v.getVertexData());
      return {
        commands: [
          {
            commandName: Command.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
            commandArguments: { phaseChainState: 42 },
          },
        ],
      };
    });
    t.registerVisitorForPhase(Order.BEFORE_CHILD_EXPANSION, (_v, o) => {
      seen.push(o.currentVertexPhaseChainState);
    });
    t.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['root', 'root', 'changed', 42]);
  });

  test('configure preserves added visitors and runner visitors are isolated', () => {
    const t = traversal(node('root'));
    const seen: string[] = [];
    t.registerVisitorForPhase(Order.BEFORE_CHILD_EXPANSION, () => {
      seen.push('first');
    });
    t.patchOptionsForFutureRunners({
      transformChildHintsBeforeResolution: null,
    });
    const runner = t.createIndependentRunnerFromCurrentOptions();
    t.registerVisitorForPhase(Order.BEFORE_CHILD_EXPANSION, () => {
      seen.push('late');
    });
    runner.runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['first']);
  });

  test('deleting a vertex removes its subtree and still visits siblings', () => {
    const t = traversal(
      node('root', node('branch', node('hidden')), node('sibling')),
    );
    t.registerVisitorForPhase(Order.BEFORE_CHILD_EXPANSION, (v) =>
      v.getVertexData() === 'branch'
        ? {
            commands: [
              {
                commandName:
                  Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
              },
            ],
          }
        : undefined,
    );
    const runner = t
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    const tree = internalTreeStore(runner);
    expect(
      tree
        .getDetachedChildReferenceListOrNull(
          tree.getRootVertexReferenceOrNull()!,
        )
        ?.map((ref) => ref.getReferencedValue().getVertexData()),
    ).toEqual(['sibling']);
  });

  test('traverses deep trees without recursive call-stack growth', () => {
    let root = node('20000');
    for (let i = 19999; i >= 0; i--) root = node(String(i), root);
    const t = traversal(root);
    let count = 0;
    t.registerVisitorForPhase(Order.AFTER_CHILD_SUBTREES, () => {
      count++;
    });
    t.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal({
      deliveredEventKinds: [],
    });
    expect(count).toBe(20001);
  });
});

test('passes chain state from concurrent commands to the first sequential visitor', () => {
  const t = traversal(node('root'));
  let seen: unknown;
  t.registerVisitorForPhase(
    Order.BEFORE_CHILD_EXPANSION,
    () => ({
      commands: [
        {
          commandName: Command.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
          commandArguments: { phaseChainState: 42 },
        },
      ],
    }),
    { visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const },
  );
  t.registerVisitorForPhase(
    Order.BEFORE_CHILD_EXPANSION,
    (_vertex, options) => {
      seen = options.currentVertexPhaseChainState;
    },
  );
  t.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
  expect(seen).toBe(42);
});

test('retains equal-priority registration order after replacing visitor records', () => {
  const t = traversal(node('root'));
  const seen: string[] = [];
  t.replaceVisitorDefinitionsForPhase(Order.BEFORE_CHILD_EXPANSION, [
    {
      descendingExecutionPriorityWithinGroup: 100,
      visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
      visitor: () => {
        seen.push('existing');
      },
    },
  ]);
  t.registerVisitorForPhase(Order.BEFORE_CHILD_EXPANSION, () => {
    seen.push('new');
  });
  t.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['existing', 'new']);
});

test('a resolved tree can be traversed again as an adapter', () => {
  const resolvedTree = internalTreeStore(
    traversal(node('root', node('a'), node('b')))
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal(),
  );
  const again = new DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: resolvedTree,
  });
  const data = [
    ...again
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [Order.AFTER_CHILD_SUBTREES],
      }),
  ].map((event) =>
    event.vertex.getVertexData().getReferencedValue().getVertexData(),
  );
  expect(data).toEqual(['a', 'b', 'root']);
});
