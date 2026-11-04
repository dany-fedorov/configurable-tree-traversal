import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase as Order,
} from '../src/traversals/dag-traversal';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';
import { traversalInternals } from './internal-runner-fixtures';

type G = VertexDataAndChildHintTypes<string, string>;
const catalog = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: '', $childDiscoveryHints: ['A', 'B'] },
    },
  }),
  resolveChildVertexFromHint: (id: string) => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: id,
      workWaitsForWorkOf: id === 'B' ? ['A'] : [],
      vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
    },
  }),
};
const external = {
  workCompletionPolicy: 'requireExternalWorkSettlement' as const,
};

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test.each([
    'incrementalDuringTraversal',
    'completeBeforeAnyVisitor',
  ] as const)(
    `${Constructor.name} empty %s frontier requires guarded settlement`,
    async (discovery) => {
      const runner = new Constructor<G>({
        dagDiscoverySource: catalog,
        sourceRootIsHiddenEntryHolder: true,
        discoveryTiming: discovery,
        ...external,
      }).createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      expect(
        runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual([]);
      expect(
        runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
      ).toEqual(['A']);
      expect(runner.getTraversalStopReason()).toBe('awaitingSettlement');
      expect(
        runner.captureProgressSnapshot().progressByVertexId.get('B')!.workState,
      ).toBe('waitingForPrerequisiteMilestones');
      const generation = runner
        .captureProgressSnapshot()
        .progressByVertexId.get('A')!.settlementToken!;
      expect(() =>
        runner.settleDeferredWork('A', { kind: 'workCompleted' }, Symbol()),
      ).toThrow();
      runner.settleDeferredWork('A', { kind: 'workCompleted' }, generation);
      expect(runner.getTraversalStopReason()).toBe('awaitingSettlement');
      await runner.runUntilSuspendedOrTerminal();
      expect(
        runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual(['A']);
      expect(
        runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
      ).toEqual(['B']);
      runner.settleDeferredWork(
        'B',
        { kind: 'workCompleted' },
        runner.captureProgressSnapshot().progressByVertexId.get('B')!
          .settlementToken!,
      );
      await runner.runUntilSuspendedOrTerminal();
      expect(
        runner.captureProgressSnapshot().subgraphCompletionCommittedVertexIds,
      ).toEqual(['A', 'B']);
    },
  );

  test(`${Constructor.name} tree source defers parent work before admitting children`, async () => {
    const runner = new Constructor<G>({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'A',
              $childDiscoveryHints: ['B'],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: { $vertexData: 'B', $childDiscoveryHints: [] },
          },
        }),
      },
      ...external,
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([]);
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toHaveLength(1);
    const first =
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds[0];
    runner.settleDeferredWork(
      first,
      { kind: 'workCompleted' },
      runner.captureProgressSnapshot().progressByVertexId.get(first)!
        .settlementToken!,
    );
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([first]);
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toHaveLength(1);
  });

  test(`${Constructor.name} external completion commits callbacks and commands before deferral`, async () => {
    const seen: string[] = [];
    const traversal = new Constructor<G>({
      dagDiscoverySource: catalog,
      sourceRootIsHiddenEntryHolder: true,
      discoveryTiming: 'completeBeforeAnyVisitor',
      ...external,
    });
    traversal.registerVisitorForPhase(
      Order.ON_WORK_READY,
      (vertex) => {
        seen.push(vertex.getVertexData());
        return {
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: { replacementVertexData: 'committed' },
            },
          ],
        };
      },
      { visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['A']);
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([]);
    const id =
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds[0];
    runner.settleDeferredWork(
      id,
      { kind: 'workCompleted' },
      runner.captureProgressSnapshot().progressByVertexId.get(id)!
        .settlementToken!,
    );
    const events: string[] = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      events.push(`${event.eventKind}:${event.vertex.getVertexData()}`);
    expect(events).toContain('workCompletionCommitted:committed');
    expect(seen).toEqual(['A', 'B']);
  });

  test(`${Constructor.name} filtered callbacks cannot complete external work and seeds stay completed`, async () => {
    const traversal = new Constructor<G>({
      dagDiscoverySource: catalog,
      sourceRootIsHiddenEntryHolder: true,
      discoveryTiming: 'completeBeforeAnyVisitor',
      acceptedCompletedWorkVertexIds: new Set(['A']),
      ...external,
    });
    traversal.registerVisitorForPhase(Order.ON_WORK_READY, () => {
      throw new Error('filtered callback ran');
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases: { include: [] },
    });
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual(['A']);
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual(['B']);
  });

  test(`${Constructor.name} rejects invalid completion policies before execution and preserves patchOptionsForFutureRunners state`, () => {
    const invalid = {
      workCompletionPolicy: 'invalid' as 'afterWorkReadyVisitorChain',
    };
    expect(
      () => new Constructor<G>({ dagDiscoverySource: catalog, ...invalid }),
    ).toThrow(TypeError);
    const traversal = new Constructor<G>({
      dagDiscoverySource: catalog,
      ...external,
    });
    expect(() =>
      traversal.patchOptionsForFutureRunners({
        ...invalid,
        discoveryTiming: 'completeBeforeAnyVisitor',
      }),
    ).toThrow(TypeError);
    expect(traversalInternals(traversal).icfg.workCompletionPolicy).toBe(
      'requireExternalWorkSettlement',
    );
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} explicit deferral retains exclusive early-chain semantics in external mode`, async () => {
    const traversal = new Constructor<G>({
      dagDiscoverySource: catalog,
      sourceRootIsHiddenEntryHolder: true,
      ...external,
    });
    traversal.registerVisitorForPhase(
      Order.ON_WORK_READY,
      () => ({
        commands: [
          {
            commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
            commandArguments: { replacementVertexData: 'discarded' },
          },
        ],
      }),
      { visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const },
    );
    traversal.registerVisitorForPhase(
      Order.ON_WORK_READY,
      () => ({
        commands: [
          {
            commandName:
              Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION,
          },
        ],
      }),
      { visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const },
    );
    traversal.registerVisitorForPhase(Order.ON_WORK_READY, () => {
      throw new Error('must skip later callback');
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    const generation = runner
      .captureProgressSnapshot()
      .progressByVertexId.get('A')!.settlementToken!;
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('A')!
        .settlementToken,
    ).toBe(generation);
    runner.settleDeferredWork('A', { kind: 'workCompleted' }, generation);
    const events: string[] = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      events.push(`${event.eventKind}:${event.vertex.getVertexData()}`);
    expect(events).toEqual([
      'workCompletionCommitted:A',
      'subgraphCompletionCommitted:A',
    ]);
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual(['B']);
    expect(
      runner.settleDeferredWork('A', { kind: 'workCompleted' }, generation),
    ).toBe(false);
  });

  test(`${Constructor.name} external W and C joins require their distinct milestones`, async () => {
    const traversal = new Constructor<G>({
      discoveryTiming: 'completeBeforeAnyVisitor',
      sourceRootIsHiddenEntryHolder: true,
      ...external,
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: '',
              $childDiscoveryHints: ['A', 'W', 'C'],
            },
          },
        }),
        resolveChildVertexFromHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf: id === 'W' ? ['A'] : [],
            workWaitsForSubgraphCompletionOf: id === 'C' ? ['A'] : [],
            vertexContentInput: {
              $vertexData: id,
              $childDiscoveryHints: id === 'A' ? ['child'] : [],
            },
          },
        }),
      },
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    const settle = (id: string) =>
      runner.settleDeferredWork(
        id,
        { kind: 'workCompleted' },
        runner.captureProgressSnapshot().progressByVertexId.get(id)!
          .settlementToken!,
      );
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual(['A', 'child']);
    settle('A');
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual(['W', 'child']);
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('C')!.workState,
    ).toBe('waitingForPrerequisiteMilestones');
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('A')!
        .subgraphCompletionCommitted,
    ).toBe(false);
    settle('child');
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('A')!
        .subgraphCompletionCommitted,
    ).toBe(true);
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual(['W', 'C']);
    settle('W');
    settle('C');
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.getTraversalStopReason()).toBe('finished');
  });

  test(`${Constructor.name} halt preserves a normal command continuation before external deferral`, async () => {
    const seen: string[] = [];
    const traversal = new Constructor<G>({
      dagDiscoverySource: catalog,
      sourceRootIsHiddenEntryHolder: true,
      ...external,
    });
    traversal.registerVisitorForPhase(
      Order.ON_WORK_READY,
      (vertex) => ({
        commands: [
          {
            commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
            commandArguments: {
              replacementVertexData: vertex.getVertexData() + '!',
            },
          },
          { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
        ],
      }),
    );
    traversal.registerVisitorForPhase(Order.ON_WORK_READY, (vertex) => {
      seen.push(vertex.getVertexData());
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.getTraversalStopReason()).toBe('paused');
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual([]);
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([]);
    await runner.runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['A!']);
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual(['A']);
    expect(runner.getTraversalStopReason()).toBe('awaitingSettlement');
  });

  test(`${Constructor.name} deleted external work never receives a deferred generation`, async () => {
    const traversal = new Constructor<G>({
      dagDiscoverySource: catalog,
      sourceRootIsHiddenEntryHolder: true,
      ...external,
    });
    traversal.registerVisitorForPhase(Order.ON_WORK_READY, () => ({
      commands: [
        {
          commandName:
            Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
        },
      ],
    }));
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual([]);
    expect(runner.captureProgressSnapshot().progressByVertexId.size).toBe(0);
    expect(runner.getTraversalStopReason()).toBe('finished');
  });

  test.each([undefined, null, NaN, { cause: 'external' }])(
    `${Constructor.name} external failure settlement preserves exact error %p`,
    async (error) => {
      const runner = new Constructor<G>({
        dagDiscoverySource: catalog,
        sourceRootIsHiddenEntryHolder: true,
        ...external,
      }).createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      runner.settleDeferredWork(
        'A',
        { kind: 'traversalFailed', error },
        runner.captureProgressSnapshot().progressByVertexId.get('A')!
          .settlementToken!,
      );
      expect(runner.getTraversalStopReason()).toBe('failed');
      expect(runner.captureExecutionSnapshot().traversalStopReason).toBe(
        'failed',
      );
      await expect(async () => {
        await runner.runUntilSuspendedOrTerminal();
      }).rejects.toBe(error);
    },
  );
}

test('async external settlement frees logical chain capacity while a physical callback remains active', async () => {
  const release = deferred<void>();
  const seen: string[] = [];
  const traversal = new AsyncDagTraversalBuilder<G>({
    maxConcurrentCallbackInvocations: 2,
    discoveryTiming: 'completeBeforeAnyVisitor',
    sourceRootIsHiddenEntryHolder: true,
    ...external,
    dagDiscoverySource: {
      ...catalog,
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: '',
            $childDiscoveryHints: ['A', 'busy', 'B'],
          },
        },
      }),
    },
  });
  traversal.registerVisitorForPhase(Order.ON_WORK_READY, (vertex) => {
    seen.push(vertex.getVertexData());
    return vertex.getVertexData() === 'busy' ? release.promise : undefined;
  });
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  await eventLoopTurn();
  expect(seen).toEqual(['A', 'busy']);
  expect(runner.getTraversalStopReason()).toBeNull();
  runner.settleDeferredWork(
    'A',
    { kind: 'workCompleted' },
    runner.captureProgressSnapshot().progressByVertexId.get('A')!
      .settlementToken!,
  );
  await eventLoopTurn();
  expect(seen).toEqual(['A', 'busy', 'B']);
  expect(runner.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);
  expect(runner.getTraversalStopReason()).toBeNull();
  release.resolve();
  await running;
  expect(
    runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
  ).toEqual(['busy', 'B']);
  expect(runner.getTraversalStopReason()).toBe('awaitingSettlement');
});

test('external async close drains callbacks before recording pause and retains generations through settlement', async () => {
  const release = deferred<void>();
  const traversal = new AsyncDagTraversalBuilder<G>({
    maxConcurrentCallbackInvocations: 2,
    discoveryTiming: 'completeBeforeAnyVisitor',
    sourceRootIsHiddenEntryHolder: true,
    ...external,
    dagDiscoverySource: {
      ...catalog,
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: '',
            $childDiscoveryHints: ['A', 'busy', 'B'],
          },
        },
      }),
    },
  });
  traversal.registerVisitorForPhase(Order.ON_WORK_READY, (vertex) =>
    vertex.getVertexData() === 'busy' ? release.promise : undefined,
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const pending = iterator.next();
  await eventLoopTurn();
  const generation = runner
    .captureProgressSnapshot()
    .progressByVertexId.get('A')!.settlementToken!;
  const closing = iterator.return();
  await eventLoopTurn();
  expect(runner.getTraversalStopReason()).toBeNull();
  expect(runner.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);
  release.resolve();
  await closing;
  await pending;
  expect(runner.getTraversalStopReason()).toBe('paused');
  expect(
    runner.captureProgressSnapshot().progressByVertexId.get('A')!
      .settlementToken,
  ).toBe(generation);
  runner.settleDeferredWork('A', { kind: 'workCompleted' }, generation);
  expect(runner.getTraversalStopReason()).toBe('paused');
  await runner.runUntilSuspendedOrTerminal();
  expect(
    runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
  ).toEqual(['busy', 'B']);
  expect(runner.getTraversalStopReason()).toBe('awaitingSettlement');
});

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} rejects an invalid retained policy before source execution`, () => {
    const traversal = new Constructor<G>({ dagDiscoverySource: catalog });
    // JavaScript callers can mutate the advanced configuration record.
    Object.assign(traversalInternals(traversal).icfg, {
      workCompletionPolicy: null,
    });
    expect(() => traversal.createIndependentRunnerFromCurrentOptions()).toThrow(
      TypeError,
    );
  });
}
