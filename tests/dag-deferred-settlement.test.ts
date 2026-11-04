import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase as Order,
} from '../src/traversals/dag-traversal';
import {
  DepthFirstTreeVisitPhase,
  DepthFirstTreeTraversalBuilder,
} from '../src/traversals/depth-first-traversal';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

type G = VertexDataAndChildHintTypes<string, string>;
const rootOnly = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'a',
      vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
    },
  }),
  resolveChildVertexFromHint: () => ({
    omittedVertexIdentity: null,
    kind: 'vertexIntentionallyOmitted' as const,
    satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
  }),
};
for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} settlement filters its committed event at delivery and discards buffered commands and remaining visitors`, async () => {
    const traversal = new Constructor<G>({ dagDiscoverySource: rootOnly });
    let visits = 0;
    traversal.registerVisitorForPhase(
      Order.ON_WORK_READY,
      () => ({
        commands: [
          {
            commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
            commandArguments: { replacementVertexData: 'wrong' },
          },
        ],
      }),
      { visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const },
    );
    traversal.registerVisitorForPhase(
      Order.ON_WORK_READY,
      () => {
        visits++;
        return {
          commands: [
            {
              commandName:
                VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
            },
          ],
        };
      },
      { visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const },
    );
    traversal.registerVisitorForPhase(Order.ON_WORK_READY, () => {
      throw Error('must skip');
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal({
      deliveredEventKinds: ['workCompletionCommitted'],
    });
    const token = runner.captureProgressSnapshot().progressByVertexId.get('a')!
      .settlementToken!;
    expect(() =>
      runner.settleDeferredWork('missing', { kind: 'workCompleted' }, token),
    ).toThrow();
    expect(() =>
      runner.settleDeferredWork('a', { kind: 'workCompleted' }, Symbol()),
    ).toThrow();
    const other = traversal.createIndependentRunnerFromCurrentOptions();
    await other.runUntilSuspendedOrTerminal();
    expect(() =>
      other.settleDeferredWork('a', { kind: 'workCompleted' }, token),
    ).toThrow();
    runner.settleDeferredWork('a', { kind: 'workCompleted' }, token);
    runner.settleDeferredWork('a', { kind: 'workCompleted' }, token);
    const events: string[] = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      {
        deliveredEventKinds: ['subgraphCompletionCommitted'],
      },
    ))
      events.push(`${event.eventKind}:${event.vertex.getVertexData()}`);
    expect(events).toEqual(['subgraphCompletionCommitted:a']);
    expect(visits).toBe(2);
  });

  test.each([undefined, null, { reason: 'business failure' }, NaN])(
    `${Constructor.name} preserves settlement error %p and guards replay`,
    async (error) => {
      const traversal = new Constructor<G>({ dagDiscoverySource: rootOnly });
      traversal.registerVisitorForPhase(Order.ON_WORK_READY, () => ({
        commands: [
          {
            commandName:
              VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
          },
        ],
      }));
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      const token = runner
        .captureProgressSnapshot()
        .progressByVertexId.get('a')!.settlementToken!;
      expect(
        runner.settleDeferredWork(
          'a',
          { kind: 'traversalFailed', error },
          token,
        ),
      ).toBe(true);
      expect(
        runner.settleDeferredWork(
          'a',
          { kind: 'traversalFailed', error },
          token,
        ),
      ).toBe(false);
      expect(() =>
        runner.settleDeferredWork('a', { kind: 'workCompleted' }, token),
      ).toThrow();
      expect(() =>
        runner.settleDeferredWork(
          'a',
          { kind: 'traversalFailed', error: {} },
          token,
        ),
      ).toThrow();
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
      expect(
        runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual([]);
      await expect(async () => {
        await runner.runUntilSuspendedOrTerminal();
      }).rejects.toBe(error);
    },
  );

  test(`${Constructor.name} rejects completion deferral`, async () => {
    const traversal = new Constructor<G>({ dagDiscoverySource: rootOnly });
    traversal.registerVisitorForPhase(
      Order.ON_SUBGRAPH_COMPLETION_READY,
      () => ({
        commands: [
          {
            // @ts-expect-error Runtime validation for JavaScript callers.
            commandName:
              VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
          },
        ],
      }),
    );
    await expect(async () => {
      await traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal();
    }).rejects.toThrow(/ON_WORK_READY/);
  });

  test(`${Constructor.name} lazy deferred discovery reports a partial frontier until settlement`, async () => {
    const traversal = new Constructor<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['a', 'b'],
            },
          },
        }),
        resolveChildVertexFromHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf: id === 'a' ? ['c'] : id === 'b' ? ['root'] : [],
            vertexContentInput: {
              $vertexData: id,
              $childDiscoveryHints: id === 'b' ? ['c'] : [],
            },
          },
        }),
      },
    });
    traversal.registerVisitorForPhase(Order.ON_WORK_READY, () => ({
      commands: [
        {
          commandName:
            VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
        },
      ],
    }));
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.captureProgressSnapshot().discovery).toEqual({
      timing: 'incrementalDuringTraversal',
      complete: false,
    });
    expect(
      runner.captureProgressSnapshot().invalidDependencyTopologyDiagnostics,
    ).toBeNull();
    runner.settleDeferredWork(
      'root',
      { kind: 'workCompleted' },
      runner.captureProgressSnapshot().progressByVertexId.get('root')!
        .settlementToken!,
    );
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual(['b', 'c']);
    runner.settleDeferredWork(
      'c',
      { kind: 'workCompleted' },
      runner.captureProgressSnapshot().progressByVertexId.get('c')!
        .settlementToken!,
    );
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.captureProgressSnapshot().discovery.complete).toBe(true);
    expect(
      runner.captureProgressSnapshot()
        .workVisitorReadyOrWorkCompletionDeferredVertexIds,
    ).toEqual(['a', 'b']);
  });
}

test('tree visitors cannot use the DAG deferral sentinel', () => {
  const traversal = new DepthFirstTreeTraversalBuilder<G>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
        },
      }),
      resolveChildVertexFromHint: () => ({
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    },
  });
  traversal.registerVisitorForPhase(
    DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    () =>
      ({
        commands: [
          {
            commandName:
              VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
          },
        ],
      } as never),
  );
  expect(() =>
    traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal(),
  ).toThrow(/ON_WORK_READY/);
});

test('settlement wakes an active async consumer while another physical callback is pending', async () => {
  const waitB = deferred<{
    commands: [
      {
        commandName: VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION;
      },
    ];
  }>();
  const seen: string[] = [];
  const traversal = new AsyncDagTraversalBuilder<G>({
    maxConcurrentCallbackInvocations: 2,
    discoveryTiming: 'completeBeforeAnyVisitor',
    sourceRootIsHiddenEntryHolder: true,
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: '',
            $childDiscoveryHints: ['a', 'b', 'c'],
          },
        },
      }),
      resolveChildVertexFromHint: (id) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: id,
          workWaitsForWorkOf: id === 'c' ? ['a'] : [],
          vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
        },
      }),
    },
  });
  traversal.registerVisitorForPhase(Order.ON_WORK_READY, (vertex) => {
    const id = vertex.getVertexData();
    seen.push(id);
    return id === 'b'
      ? waitB.promise
      : {
          commands: [
            {
              commandName:
                VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
            },
          ],
        };
  });
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  await eventLoopTurn();
  expect(
    runner.captureProgressSnapshot().admittedVisitorChainVertexIds,
  ).toEqual(['b']);
  expect(
    runner.captureProgressSnapshot().progressByVertexId.get('b')!.workState,
  ).toBe('workVisitorChainAdmitted');
  runner.settleDeferredWork(
    'a',
    { kind: 'workCompleted' },
    runner.captureProgressSnapshot().progressByVertexId.get('a')!
      .settlementToken!,
  );
  await eventLoopTurn();
  expect(seen).toEqual(['a', 'b', 'c']);
  expect(runner.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);
  waitB.resolve({
    commands: [
      {
        commandName:
          VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
      },
    ],
  });
  await running;
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
});

test('deleted orphan refuses a previously issued deferred generation', async () => {
  const finishP = deferred<void>();
  const traversal = new AsyncDagTraversalBuilder<G>({
    maxConcurrentCallbackInvocations: 2,
    discoveryTiming: 'completeBeforeAnyVisitor',
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'root',
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['p'],
          },
        },
      }),
      resolveChildVertexFromHint: (id) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: id,
          workWaitsForWorkOf: [],
          vertexContentInput: {
            $vertexData: id,
            $childDiscoveryHints: id === 'p' ? ['a'] : [],
          },
        },
      }),
    },
  });
  traversal.registerVisitorForPhase(
    Order.ON_WORK_READY,
    async (vertex) => {
      if (vertex.getVertexData() === 'p') {
        await finishP.promise;
        return {
          commands: [
            {
              commandName:
                Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
            },
          ],
        };
      }
      if (vertex.getVertexData() === 'a')
        return {
          commands: [
            {
              commandName:
                VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
            },
          ],
        };
      return undefined;
    },
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  await eventLoopTurn();
  const token = runner.captureProgressSnapshot().progressByVertexId.get('a')!
    .settlementToken!;
  finishP.resolve();
  await running;
  expect(runner.captureProgressSnapshot().progressByVertexId.has('a')).toBe(
    false,
  );
  expect(() =>
    runner.settleDeferredWork('a', { kind: 'workCompleted' }, token),
  ).toThrow();
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
});

test('halt waits for a physical callback and retains deferred handles across resume', async () => {
  const release = deferred<{
    commands: [
      {
        commandName: VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION;
      },
    ];
  }>();
  const traversal = new AsyncDagTraversalBuilder<G>({
    maxConcurrentCallbackInvocations: 2,
    discoveryTiming: 'completeBeforeAnyVisitor',
    sourceRootIsHiddenEntryHolder: true,
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: '',
            $childDiscoveryHints: ['a', 'b'],
          },
        },
      }),
      resolveChildVertexFromHint: (id) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: id,
          vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
        },
      }),
    },
  });
  traversal.registerVisitorForPhase(Order.ON_WORK_READY, (vertex) =>
    vertex.getVertexData() === 'a'
      ? {
          commands: [
            {
              commandName:
                VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
            },
          ],
        }
      : release.promise,
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: ['workCompletionCommitted'],
    });
  const next = iterator.next();
  await eventLoopTurn();
  const token = runner.captureProgressSnapshot().progressByVertexId.get('a')!
    .settlementToken!;
  let closed = false;
  const closing = iterator.return().then(() => {
    closed = true;
  });
  await eventLoopTurn();
  expect(closed).toBe(false);
  expect(runner.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);
  release.resolve({
    commands: [
      {
        commandName:
          VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
      },
    ],
  });
  await closing;
  await next;
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  expect(
    runner.captureProgressSnapshot().progressByVertexId.get('a')!
      .settlementToken,
  ).toBe(token);
  runner.settleDeferredWork('a', { kind: 'workCompleted' }, token);
  await runner.runUntilSuspendedOrTerminal();
  expect(
    runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
  ).toEqual(['a']);
  expect(
    runner.captureProgressSnapshot()
      .workVisitorReadyOrWorkCompletionDeferredVertexIds,
  ).toEqual(['b']);
});

test('failure settlement cannot free a still-running callback permit or accept another deferred result', async () => {
  const release = deferred<void>();
  const traversal = new AsyncDagTraversalBuilder<G>({
    maxConcurrentCallbackInvocations: 3,
    discoveryTiming: 'completeBeforeAnyVisitor',
    sourceRootIsHiddenEntryHolder: true,
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: '',
            $childDiscoveryHints: ['a', 'b', 'c'],
          },
        },
      }),
      resolveChildVertexFromHint: (id) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: id,
          vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
        },
      }),
    },
  });
  traversal.registerVisitorForPhase(Order.ON_WORK_READY, (vertex) =>
    vertex.getVertexData() === 'b'
      ? release.promise
      : {
          commands: [
            {
              commandName:
                VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
            },
          ],
        },
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  const rejected = expect(running).rejects.toBe(null);
  await eventLoopTurn();
  const snapshot = runner.captureProgressSnapshot();
  runner.settleDeferredWork(
    'a',
    { kind: 'traversalFailed', error: null },
    snapshot.progressByVertexId.get('a')!.settlementToken!,
  );
  await rejected;
  expect(runner.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);
  expect(() =>
    runner.settleDeferredWork(
      'c',
      { kind: 'workCompleted' },
      snapshot.progressByVertexId.get('c')!.settlementToken!,
    ),
  ).toThrow(/failed/);
  release.resolve();
  await eventLoopTurn();
  expect(runner.captureExecutionSnapshot().inFlightInvocationCount).toBe(0);
});

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test.each([
    ['backend', 'frontend'],
    ['frontend', 'backend'],
  ])(
    `${Constructor.name} reconstructed completed facts agree with settlement order %j`,
    async (first, second) => {
      const make = (acceptedCompletedWorkVertexIds: Set<string>) => {
        const traversal = new Constructor<G>({
          discoveryTiming: 'completeBeforeAnyVisitor',
          sourceRootIsHiddenEntryHolder: true,
          acceptedCompletedWorkVertexIds,
          dagDiscoverySource: {
            resolveRootVertex: () => ({
              kind: 'vertexResolved' as const,
              resolvedVertexInput: {
                vertexContentInput: {
                  $vertexData: '',
                  $childDiscoveryHints: [
                    'design',
                    'backend',
                    'frontend',
                    'verify',
                  ],
                },
              },
            }),
            resolveChildVertexFromHint: (id) => ({
              kind: 'vertexResolved' as const,
              resolvedVertexInput: {
                vertexId: id,
                workWaitsForWorkOf:
                  id === 'design'
                    ? []
                    : id === 'verify'
                    ? ['backend', 'frontend']
                    : ['design'],
                vertexContentInput: {
                  $vertexData: id,
                  $childDiscoveryHints: [],
                },
              },
            }),
          },
        });
        traversal.registerVisitorForPhase(Order.ON_WORK_READY, () => ({
          commands: [
            {
              commandName:
                VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
            },
          ],
        }));
        return traversal.createIndependentRunnerFromCurrentOptions();
      };
      const completed = new Set(['design']);
      const retained = make(completed);
      await retained.runUntilSuspendedOrTerminal();
      for (const id of [first, second]) {
        const token = retained
          .captureProgressSnapshot()
          .progressByVertexId.get(id)!.settlementToken!;
        retained.settleDeferredWork(id, { kind: 'workCompleted' }, token);
        await retained.runUntilSuspendedOrTerminal();
        completed.add(id);
        const rebuilt = make(completed);
        await rebuilt.runUntilSuspendedOrTerminal();
        expect(
          rebuilt.captureProgressSnapshot()
            .workVisitorReadyOrWorkCompletionDeferredVertexIds,
        ).toEqual(
          retained.captureProgressSnapshot()
            .workVisitorReadyOrWorkCompletionDeferredVertexIds,
        );
        expect(
          rebuilt.captureProgressSnapshot().workCompletionCommittedVertexIds,
        ).toEqual(
          retained.captureProgressSnapshot().workCompletionCommittedVertexIds,
        );
        expect(rebuilt.captureProgressSnapshot().counts).toEqual(
          retained.captureProgressSnapshot().counts,
        );
        expect(() =>
          rebuilt.settleDeferredWork(id, { kind: 'workCompleted' }, token),
        ).toThrow();
      }
      expect(
        retained.captureProgressSnapshot()
          .workVisitorReadyOrWorkCompletionDeferredVertexIds,
      ).toEqual(['verify']);
    },
  );
}
