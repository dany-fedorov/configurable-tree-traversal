import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import type { VertexDataAndChildHintTypes } from '../src';
import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeVisitPhase as BfsOrder,
  BreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase as DagOrder,
  DepthFirstTreeVisitPhase as DfsOrder,
  DepthFirstTreeTraversalBuilder,
  TraversalVisitorCommandName as Command,
} from '../src';

type G = VertexDataAndChildHintTypes<string, string>;
const source = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'root',
      vertexContentInput: {
        $vertexData: 'root',
        $childDiscoveryHints: [] as string[],
      },
    },
  }),
  resolveChildHint: (id: string) => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: id,
      vertexContentInput: {
        $vertexData: id,
        $childDiscoveryHints: [] as string[],
      },
    },
  }),
};
for (const Constructor of [
  DagTraversalBuilder<G>,
  AsyncDagTraversalBuilder<G>,
]) {
  test.each(['command', 'symbol'])(
    `${Constructor.name} %s deferral discards group effects and resumes external work`,
    async (form) => {
      const traversal = new Constructor({ dagDiscoverySource: source });
      traversal.registerVisitorCallbackForPhase(
        DagOrder.ON_WORK_READY,
        () => ({
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: { replacementVertexData: 'committed' },
            },
          ],
        }),
        {
          visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
          descendingExecutionPriorityWithinGroup: 200,
        },
      );
      traversal.registerVisitorCallbackForPhase(
        DagOrder.ON_WORK_READY,
        () =>
          form === 'symbol'
            ? {
                commands: [
                  {
                    commandName:
                      VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
                  },
                ],
              }
            : {
                commands: [
                  {
                    commandName:
                      Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION,
                  },
                ],
              },
        { visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const },
      );
      traversal.registerVisitorCallbackForPhase(DagOrder.ON_WORK_READY, () => {
        throw new Error('must skip');
      });
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      expect(
        runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
      ).toEqual(['root']);
      expect(
        runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual([]);
      runner.settleDeferredWork(
        'root',
        { kind: 'workCompleted' },
        runner.captureProgressSnapshot().progressByVertexId.get('root')!
          .settlementToken!,
      );
      await runner.runUntilSuspendedOrTerminal();
      expect(
        runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual(['root']);
      expect(
        runner
          .getLiveResolvedGraphView()
          .getVertexHandleByIdOrNull('root')!
          .getCurrentVertexView().$vertexData,
      ).toBe('root');
    },
  );

  test(`${Constructor.name} rejects a mixed deferral before mutation`, async () => {
    const traversal = new Constructor({ dagDiscoverySource: source });
    traversal.registerVisitorCallbackForPhase(
      DagOrder.ON_WORK_READY,
      () =>
        ({
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: { replacementVertexData: 'wrong' },
            },
            {
              commandName:
                Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION,
            },
          ],
        } as never),
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await expect(async () => {
      await runner.runUntilSuspendedOrTerminal();
    }).rejects.toThrow(/sole command/);
    expect(
      runner
        .getLiveResolvedGraphView()
        .getVertexHandleByIdOrNull('root')!
        .getCurrentVertexView().$vertexData,
    ).toBe('root');
  });
}
for (const [Constructor, order, sourceKey] of [
  [
    DepthFirstTreeTraversalBuilder<G>,
    DfsOrder.BEFORE_CHILD_EXPANSION,
    'treeDiscoverySource',
  ],
  [
    AsyncDepthFirstTreeTraversalBuilder<G>,
    DfsOrder.BEFORE_CHILD_EXPANSION,
    'treeDiscoverySource',
  ],
  [
    BreadthFirstTreeTraversalBuilder<G>,
    BfsOrder.AT_LEVEL_ORDER_VERTEX,
    'treeDiscoverySource',
  ],
  [
    AsyncBreadthFirstTreeTraversalBuilder<G>,
    BfsOrder.AT_LEVEL_ORDER_VERTEX,
    'treeDiscoverySource',
  ],
  [DagTraversalBuilder<G>, DagOrder.ON_WORK_READY, 'dagDiscoverySource'],
  [AsyncDagTraversalBuilder<G>, DagOrder.ON_WORK_READY, 'dagDiscoverySource'],
] as const) {
  const make = () =>
    new Constructor({
      [sourceKey]:
        sourceKey === 'treeDiscoverySource'
          ? {
              resolveRootVertex: () => ({
                kind: 'vertexResolved' as const,
                resolvedVertexInput: {
                  vertexContentInput:
                    source.resolveRootVertex().resolvedVertexInput
                      .vertexContentInput,
                },
              }),
              resolveChildVertexFromHint: (id: string) => ({
                kind: 'vertexResolved' as const,
                resolvedVertexInput: {
                  vertexContentInput:
                    source.resolveChildHint(id).resolvedVertexInput
                      .vertexContentInput,
                },
              }),
            }
          : source,
    } as never);
  test(`${Constructor.name} rewrites actual child hints in its initial phase`, async () => {
    const traversal = make();
    const seen: string[] = [];
    const add = traversal.registerVisitorCallbackForPhase.bind(
      traversal,
    ) as DepthFirstTreeTraversalBuilder<G>['registerVisitorCallbackForPhase'];
    add(order as DfsOrder.BEFORE_CHILD_EXPANSION, (vertex) => {
      seen.push(vertex.$vertexData);
      if (vertex.$vertexData === 'root')
        return {
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
              commandArguments: { replacementChildHints: ['child'] },
            },
          ],
        };
      return undefined;
    });
    await traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['root', 'child']);
  });
  test(`${Constructor.name} normalizes configuration and replacement records and rejects conflicts`, async () => {
    const traversal = make();
    const seen: string[] = [];
    const record = {
      phaseRegistrationInsertionIndex: 0,
      descendingExecutionPriorityWithinGroup: 1,
      visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
      visitor: () => {
        seen.push('configured');
      },
    };
    traversal.patchOptionsForFutureRunners({
      visitors: { [order]: [record] },
    } as never);
    await traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    const listed = (
      traversal.getDetachedVisitorRegistrationRecordsForPhase.bind(
        traversal,
      ) as DepthFirstTreeTraversalBuilder<G>['getDetachedVisitorRegistrationRecordsForPhase']
    )(order as never);
    expect(listed[0]).toMatchObject({
      visitorCommandCommitTiming: 'afterContiguousVisitorBatch',
    });
    (
      traversal.replaceVisitorDefinitionsForPhase.bind(
        traversal,
      ) as DepthFirstTreeTraversalBuilder<G>['replaceVisitorDefinitionsForPhase']
    )(
      order as never,
      [
        {
          ...record,
          visitor: () => {
            seen.push('replaced');
          },
        },
      ] as never,
    );
    await traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['configured', 'replaced']);
    const conflict = {
      ...record,
      resolutionStyle: 'SEQUENTIAL',
      visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
    };
    expect(() =>
      traversal.patchOptionsForFutureRunners({
        visitors: { [order]: [conflict] },
      } as never),
    ).toThrow(/resolutionStyle|unsupported/i);
    expect(() =>
      (
        traversal.replaceVisitorDefinitionsForPhase.bind(
          traversal,
        ) as DepthFirstTreeTraversalBuilder<G>['replaceVisitorDefinitionsForPhase']
      )(order as never, [conflict] as never),
    ).toThrow(/resolutionStyle|unsupported/i);
  });
  test(`${Constructor.name} supports canonical batching and child rewrites`, async () => {
    // The heterogeneous constructor table deliberately erases only its dispatch signature.
    const traversal = new Constructor({
      [sourceKey]:
        sourceKey === 'treeDiscoverySource'
          ? {
              resolveRootVertex: () => ({
                kind: 'vertexResolved' as const,
                resolvedVertexInput: {
                  vertexContentInput:
                    source.resolveRootVertex().resolvedVertexInput
                      .vertexContentInput,
                },
              }),
              resolveChildVertexFromHint: (id: string) => ({
                kind: 'vertexResolved' as const,
                resolvedVertexInput: {
                  vertexContentInput:
                    source.resolveChildHint(id).resolvedVertexInput
                      .vertexContentInput,
                },
              }),
            }
          : source,
    } as never);
    const seen: string[] = [];
    const add = traversal.registerVisitorCallbackForPhase.bind(
      traversal,
    ) as DepthFirstTreeTraversalBuilder<G>['registerVisitorCallbackForPhase'];
    add(
      order as DfsOrder,
      (vertex) => {
        seen.push(`group1:${vertex.$vertexData}`);
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
    add(
      order as DfsOrder,
      (vertex) => {
        seen.push(`group2:${vertex.$vertexData}`);
      },
      {
        visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
      } as never,
    );
    add(
      order as DfsOrder.BEFORE_CHILD_EXPANSION,
      (vertex) => {
        seen.push(`each:${vertex.$vertexData}`);
        return {
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
              commandArguments: { replacementChildHints: [] },
            },
          ],
        };
      },
      { visitorCommandCommitTiming: 'afterEachVisitorCallback' as const },
    );
    await traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['group1:root', 'group2:root', 'each:changed']);
    expect(() =>
      add(order as DfsOrder, () => undefined, {
        resolutionStyle: 'SEQUENTIAL',
        visitorCommandCommitTiming: 'afterContiguousVisitorBatch',
      } as never),
    ).toThrow(/resolutionStyle|unsupported/i);
  });
}

for (const Constructor of [
  DagTraversalBuilder<G>,
  AsyncDagTraversalBuilder<G>,
]) {
  test(`${Constructor.name} preserves committed effects before deferral and validates generations`, async () => {
    const traversal = new Constructor({ dagDiscoverySource: source });
    traversal.registerVisitorCallbackForPhase(DagOrder.ON_WORK_READY, () => ({
      commands: [
        {
          commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
          commandArguments: { replacementVertexData: 'kept' },
        },
      ],
    }));
    traversal.registerVisitorCallbackForPhase(DagOrder.ON_WORK_READY, () => ({
      commands: [
        {
          commandName: Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION,
        },
      ],
    }));
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner
        .getLiveResolvedGraphView()
        .getVertexHandleByIdOrNull('root')!
        .getCurrentVertexView().$vertexData,
    ).toBe('kept');
    const generation = runner
      .captureProgressSnapshot()
      .progressByVertexId.get('root')!.settlementToken!;
    expect(() =>
      runner.settleDeferredWork('root', { kind: 'workCompleted' }, Symbol()),
    ).toThrow();
    expect(
      runner.settleDeferredWork('root', { kind: 'workCompleted' }, generation),
    ).toBe(true);
    expect(
      runner.settleDeferredWork('root', { kind: 'workCompleted' }, generation),
    ).toBe(false);
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual(['root']);
  });

  test.each([
    Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
    Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
  ] as const)(
    `${Constructor.name} validates %s during completion and eager discovery`,
    async (commandName) => {
      const rewrite = (): import('../src').VisitorCommandsResult<
        G,
        'ON_WORK_READY',
        'dag'
      > => ({
        commands: [
          { commandName, commandArguments: { replacementChildHints: [] } },
        ],
      });
      const completion = new Constructor({ dagDiscoverySource: source });
      completion.registerVisitorCallbackForPhase(
        DagOrder.ON_SUBGRAPH_COMPLETION_READY,
        rewrite as never,
      );
      await expect(async () => {
        await completion
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
      }).rejects.toThrow(/ON_WORK_READY/);
      const eager = new Constructor({
        dagDiscoverySource: source,
        discoveryTiming: 'completeBeforeAnyVisitor',
      });
      eager.registerVisitorCallbackForPhase(DagOrder.ON_WORK_READY, rewrite);
      await expect(async () => {
        await eager
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
      }).rejects.toThrow(/eager discovery/);
    },
  );

  test(`${Constructor.name} rejects command deferral during completion`, async () => {
    const traversal = new Constructor({ dagDiscoverySource: source });
    traversal.registerVisitorCallbackForPhase(
      DagOrder.ON_SUBGRAPH_COMPLETION_READY,
      () =>
        ({
          commands: [
            {
              commandName:
                Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION,
            },
          ],
        } as never),
    );
    await expect(async () => {
      await traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal();
    }).rejects.toThrow(/ON_WORK_READY/);
  });
}

test('async command deferral releases callback capacity while work prerequisites remain blocked', async () => {
  const traversal = new AsyncDagTraversalBuilder<G>({
    maxConcurrentCallbackInvocations: 1,
    sourceRootIsHiddenEntryHolder: true,
    discoveryTiming: 'completeBeforeAnyVisitor',
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
      resolveChildHint: (id) => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          ...source.resolveChildHint(id).resolvedVertexInput,
          workWaitsForWorkOf: id === 'c' ? ['a'] : [],
        },
      }),
    },
  });
  const seen: string[] = [];
  traversal.registerVisitorCallbackForPhase(
    DagOrder.ON_WORK_READY,
    async (vertex) => {
      seen.push(vertex.$vertexData);
      return {
        commands: [
          {
            commandName:
              Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION,
          },
        ],
      };
    },
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  await runner.runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['a', 'b']);
  expect(
    runner.captureProgressSnapshot().admittedVisitorChainVertexIds,
  ).toEqual([]);
  expect(
    runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
  ).toEqual([]);
  runner.settleDeferredWork(
    'a',
    { kind: 'workCompleted' },
    runner.captureProgressSnapshot().progressByVertexId.get('a')!
      .settlementToken!,
  );
  await runner.runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['a', 'b', 'c']);
});

test('rejects an unknown canonical commit mode without registering the callback', () => {
  const traversal = new DagTraversalBuilder<G>({ dagDiscoverySource: source });
  expect(() =>
    traversal.registerVisitorCallbackForPhase(
      DagOrder.ON_WORK_READY,
      () => undefined,
      {
        visitorCommandCommitTiming: 'parallel' as never,
      },
    ),
  ).toThrow(/Unknown visitor command commit mode/);
  expect(
    traversal.getDetachedVisitorRegistrationRecordsForPhase(
      DagOrder.ON_WORK_READY,
    ),
  ).toEqual([]);
});

test.each(['afterContiguousVisitorBatch', 'afterEachVisitorCallback'] as const)(
  'inspection exposes canonical %s while a callback is pending',
  async (visitorCommandCommitTiming) => {
    const { deferred, eventLoopTurn } = await import(
      './helpers/graph-fixtures'
    );
    const pending = deferred<void>();
    const traversal = new AsyncDagTraversalBuilder<G>({
      dagDiscoverySource: source,
    });
    traversal.registerVisitorCallbackForPhase(
      DagOrder.ON_WORK_READY,
      () => pending.promise,
      {
        visitorCommandCommitTiming,
      },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    const running = runner.runUntilSuspendedOrTerminal();
    await eventLoopTurn();
    expect(
      runner.captureExecutionSnapshot().vertexPhaseVisitorChains[0],
    ).toMatchObject({ visitorCommandCommitTiming });
    pending.resolve();
    await running;
  },
);
