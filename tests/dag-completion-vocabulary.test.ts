import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase as Order,
  TraversalRunnerStatus as Status,
  TraversalVisitorCommandName as Command,
  type DagSettlementOutcome,
  type VertexDataAndChildHintTypes,
} from '../src';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

type G = VertexDataAndChildHintTypes<string, string>;
const deferReady = () => ({
  commands: [
    { commandName: Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
  ] as [
    { commandName: Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
  ],
});
const rootOnly = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'root',
      vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
    },
  }),
  resolveChildHint: () => ({
    omittedVertexIdentity: null,
    kind: 'vertexIntentionallyOmitted' as const,
    satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
  }),
};

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} completion releases W before children and committed C`, async () => {
    const traversal = new Constructor<G>({
      discoveryTiming: 'completeBeforeAnyVisitor',
      sourceRootIsHiddenEntryHolder: true,
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: '',
              $childDiscoveryHints: ['parent', 'work', 'complete'],
            },
          },
        }),
        resolveChildHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf: id === 'work' ? ['parent'] : [],
            workWaitsForSubgraphCompletionOf:
              id === 'complete' ? ['parent'] : [],
            vertexContentInput: {
              $vertexData: id,
              $childDiscoveryHints: id === 'parent' ? ['child'] : [],
            },
          },
        }),
      },
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, deferReady);
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    const settlementToken = runner
      .captureProgressSnapshot()
      .progressByVertexId.get('parent')!.settlementToken!;
    expect(
      runner.settleDeferredWork(
        'parent',
        { kind: 'workCompleted' },
        settlementToken,
      ),
    ).toBe(true);
    expect(
      runner.settleDeferredWork(
        'parent',
        { kind: 'workCompleted' },
        settlementToken,
      ),
    ).toBe(false);
    expect(
      runner.settleDeferredWork(
        'parent',
        { kind: 'workCompleted' },
        settlementToken,
      ),
    ).toBe(false);
    await runner.runUntilSuspendedOrTerminal();
    const partial = runner.captureProgressSnapshot();
    expect(partial.progressByVertexId.get('parent')!.workState).toBe(
      'workCompletionCommitted',
    );
    expect(
      partial.progressByVertexId.get('parent')!.subgraphCompletionCommitted,
    ).toBe(false);
    expect(partial.progressByVertexId.get('work')!.workState).toBe(
      'workCompletionDeferred',
    );
    expect(partial.progressByVertexId.get('complete')!.workState).toBe(
      'waitingForPrerequisiteMilestones',
    );
    runner.settleDeferredWork(
      'child',
      { kind: 'workCompleted' },
      partial.progressByVertexId.get('child')!.settlementToken!,
    );
    await runner.runUntilSuspendedOrTerminal();
    const complete = runner.captureProgressSnapshot();
    expect(
      complete.progressByVertexId.get('parent')!.subgraphCompletionCommitted,
    ).toBe(true);
    expect(complete.progressByVertexId.get('complete')!.workState).toBe(
      'workCompletionDeferred',
    );
  });

  test.each([undefined, null, { reason: 'stop traversal' }, NaN, 0, -0])(
    `${Constructor.name} canonical fatal feedback preserves %p and cross-form replay`,
    async (error) => {
      const traversal = new Constructor<G>({ dagDiscoverySource: rootOnly });
      traversal.registerVisitorCallbackForPhase(
        Order.ON_WORK_READY,
        deferReady,
      );
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      const settlementToken = runner
        .captureProgressSnapshot()
        .progressByVertexId.get('root')!.settlementToken!;
      expect(
        runner.settleDeferredWork(
          'root',
          { kind: 'traversalFailed', error },
          settlementToken,
        ),
      ).toBe(true);
      expect(
        runner.settleDeferredWork(
          'root',
          { kind: 'traversalFailed', error },
          settlementToken,
        ),
      ).toBe(false);
      expect(
        runner.settleDeferredWork(
          'root',
          { kind: 'traversalFailed', error },
          settlementToken,
        ),
      ).toBe(false);
      expect(() =>
        runner.settleDeferredWork(
          'root',
          { kind: 'workCompleted' },
          settlementToken,
        ),
      ).toThrow(/Conflicting/);
      expect(() =>
        runner.settleDeferredWork(
          'root',
          { kind: 'traversalFailed', error: {} },
          settlementToken,
        ),
      ).toThrow(/Conflicting/);
      if (typeof error === 'number' && error === 0) {
        expect(() =>
          runner.settleDeferredWork(
            'root',
            { kind: 'traversalFailed', error: -error },
            settlementToken,
          ),
        ).toThrow(/Conflicting/);
      }
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
      expect(
        runner.captureProgressSnapshot().progressByVertexId.get('root')!
          .workState,
      ).toBe('workCompletionDeferred');
      expect(
        runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual([]);
      await expect(async () => {
        await runner.runUntilSuspendedOrTerminal();
      }).rejects.toBe(error);
    },
  );

  test.each([true, false])(
    `${Constructor.name} tagged replay retains completion and exact failure equality %p`,
    async (ok) => {
      const traversal = new Constructor<G>({ dagDiscoverySource: rootOnly });
      traversal.registerVisitorCallbackForPhase(
        Order.ON_WORK_READY,
        deferReady,
      );
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      const settlementToken = runner
        .captureProgressSnapshot()
        .progressByVertexId.get('root')!.settlementToken!;
      const error = {};
      runner.settleDeferredWork(
        'root',
        ok ? { kind: 'workCompleted' } : { kind: 'traversalFailed', error },
        settlementToken,
      );
      expect(
        runner.settleDeferredWork(
          'root',
          ok ? { kind: 'workCompleted' } : { kind: 'traversalFailed', error },
          settlementToken,
        ),
      ).toBe(false);
    },
  );

  test.each([
    null,
    undefined,
    false,
    'completed',
    {},
    { kind: 'unresolved' },
    { kind: 'traversalFailed' },
    { kind: 'workCompleted', error: undefined },
    { kind: 'workCompleted', ok: true },
    { kind: 'workCompleted', ok: false, error: null },
    { kind: 'traversalFailed', ok: true, error: null },
    { kind: 'traversalFailed', ok: false, error: null },
    { kind: undefined, ok: true },
    { ok: 'true' },
    { ok: false },
    { ok: true, error: null },
  ])(
    `${Constructor.name} rejects malformed feedback %p without consuming its generation`,
    async (outcome) => {
      const traversal = new Constructor<G>({ dagDiscoverySource: rootOnly });
      traversal.registerVisitorCallbackForPhase(
        Order.ON_WORK_READY,
        deferReady,
      );
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      const settlementToken = runner
        .captureProgressSnapshot()
        .progressByVertexId.get('root')!.settlementToken!;
      expect(() =>
        runner.settleDeferredWork(
          'root',
          outcome as DagSettlementOutcome,
          settlementToken,
        ),
      ).toThrow(TypeError);
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
      expect(
        runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual([]);
      expect(
        runner.captureProgressSnapshot().progressByVertexId.get('root')!
          .settlementToken,
      ).toBe(settlementToken);
      runner.settleDeferredWork(
        'root',
        { kind: 'workCompleted' },
        settlementToken,
      );
      await runner.runUntilSuspendedOrTerminal();
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    },
  );

  test(`${Constructor.name} validates identity and generation before reading feedback`, async () => {
    const id = {
      toString: () => {
        throw new Error('ID stringified');
      },
    };
    const traversal = new Constructor<G>({
      dagDiscoverySource: {
        ...rootOnly,
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            ...rootOnly.resolveRootVertex().resolvedVertexInput,
            vertexId: id,
          },
        }),
      },
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, deferReady);
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    const settlementToken = runner
      .captureProgressSnapshot()
      .progressByVertexId.get(id)!.settlementToken!;
    const poison = {
      get kind(): 'workCompleted' {
        throw new Error('feedback read');
      },
    };
    expect(() =>
      runner.settleDeferredWork({}, poison, settlementToken),
    ).toThrow(/stale/);
    expect(() => runner.settleDeferredWork(id, poison, Symbol())).toThrow(
      /stale/,
    );
    expect(() =>
      runner.settleDeferredWork(id, poison, settlementToken),
    ).toThrow('feedback read');
    runner.settleDeferredWork(id, { kind: 'workCompleted' }, settlementToken);
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([id]);
  });
}

test('canonical async settlement wakes W consumers while physical callbacks retain capacity', async () => {
  const release = deferred<void>();
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
      resolveChildHint: (id) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: id,
          workWaitsForWorkOf: id === 'c' ? ['a'] : [],
          vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
        },
      }),
    },
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
    seen.push(vertex.getVertexData());
    return vertex.getVertexData() === 'b' ? release.promise : deferReady();
  });
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  await eventLoopTurn();
  runner.settleDeferredWork(
    'a',
    { kind: 'workCompleted' },
    runner.captureProgressSnapshot().progressByVertexId.get('a')!
      .settlementToken!,
  );
  await eventLoopTurn();
  expect(seen).toEqual(['a', 'b', 'c']);
  expect(runner.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);
  const rejected = expect(running).rejects.toBe(undefined);
  runner.settleDeferredWork(
    'c',
    { kind: 'traversalFailed', error: undefined },
    runner.captureProgressSnapshot().progressByVertexId.get('c')!
      .settlementToken!,
  );
  await rejected;
  expect(runner.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);
  release.resolve();
  await eventLoopTurn();
  expect(runner.captureExecutionSnapshot().inFlightInvocationCount).toBe(0);
});
