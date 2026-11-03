import {
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  DagVisitorPhase as Order,
} from '../src/traversals/dag-traversal';
import {
  bindDagExternalWorkSession,
  bindAsyncDagExternalWorkSession,
  type DagExternalWorkRunBoundary,
  type DagWorkSettlementTicket,
} from '../src/traversals/dag-traversal/coordinateDag';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import {
  materializeMultiEntryDagInputFromRecordCatalog,
  discoverValidateAndCaptureDag,
} from '../src';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

type G = VertexDataAndChildHintTypes<string, string>;
const source = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'holder',
      vertexContentInput: { $vertexData: '', $childDiscoveryHints: ['a', 'b'] },
    },
  }),
  resolveChildHint: (id: string) => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: id,
      workWaitsForWorkOf: id === 'b' ? ['a'] : [],
      vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
    },
  }),
};
const options = {
  dagDiscoverySource: source,
  sourceRootIsHiddenEntryHolder: true,
  workCompletionPolicy: 'requireExternalWorkSettlement' as const,
};
function frontier<ID>(boundary: DagExternalWorkRunBoundary<ID>) {
  if (boundary.kind !== 'awaitingSettlement') throw Error('Expected work');
  return boundary.workSettlementTickets;
}

for (const async of [false, true]) {
  const label = async ? 'async' : 'sync';
  const create = (input = options) =>
    async
      ? bindAsyncDagExternalWorkSession(
          new AsyncDagTraversalBuilder<G, G, string>(
            input,
          ).createIndependentRunnerFromCurrentOptions(),
        )
      : bindDagExternalWorkSession(
          new DagTraversalBuilder<G, G, string>(
            input,
          ).createIndependentRunnerFromCurrentOptions(),
        );

  test(`${label} observes work and accepts repeated completions without advancing it`, async () => {
    const coordinator = create();
    expect(
      coordinator.captureProgressSnapshot().counts.retainedLiveVertices,
    ).toBe(0);
    const ticket = frontier(await coordinator.runUntilWorkBoundary())[0]!;
    expect(ticket.vertexId).toBe('a');
    const repeated = frontier(await coordinator.runUntilWorkBoundary())[0]!;
    expect(coordinator.acceptCompletedWork(ticket)).toEqual({
      kind: 'accepted',
    });
    expect(coordinator.acceptCompletedWork(repeated)).toEqual({
      kind: 'alreadyAccepted',
    });
    expect(
      coordinator.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual([]);
    const second = frontier(await coordinator.runUntilWorkBoundary())[0]!;
    expect(second.vertexId).toBe('b');
    expect(coordinator.acceptCompletedWork(second)).toEqual({
      kind: 'accepted',
    });
    expect(await coordinator.runUntilWorkBoundary()).toEqual({
      kind: 'finished',
    });
    expect(await coordinator.runUntilWorkBoundary()).toEqual({
      kind: 'finished',
    });
    expect(coordinator.acceptCompletedWork(ticket)).toEqual({
      kind: 'alreadyAccepted',
    });
  });

  test(`${label} rejects foreign and forged tickets without consuming work`, async () => {
    const first = create();
    const second = create();
    const ticket = frontier(await first.runUntilWorkBoundary())[0]!;
    await second.runUntilWorkBoundary();
    for (const forged of [ticket, { ...ticket }, null, 0]) {
      expect(() =>
        second.acceptCompletedWork(forged as DagWorkSettlementTicket<string>),
      ).toThrow(TypeError);
      expect(() =>
        second.failTraversal(forged as DagWorkSettlementTicket<string>, null),
      ).toThrow(TypeError);
    }
    expect(
      second.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual(['a']);
    expect(first.acceptCompletedWork(ticket)).toEqual({ kind: 'accepted' });
    expect(() => first.failTraversal(ticket, null)).toThrow(/Conflicting/);
  });

  test.each([undefined, null, NaN, { reason: 'failed' }])(
    `${label} preserves exact fatal errors and repeated failure acceptance: %p`,
    async (error) => {
      const coordinator = create();
      const ticket = frontier(await coordinator.runUntilWorkBoundary())[0]!;
      expect(coordinator.failTraversal(ticket, error)).toEqual({
        kind: 'accepted',
      });
      expect(coordinator.failTraversal(ticket, error)).toEqual({
        kind: 'alreadyAccepted',
      });
      expect(() => coordinator.acceptCompletedWork(ticket)).toThrow(
        /Conflicting/,
      );
      expect(() => coordinator.failTraversal(ticket, {})).toThrow(
        /Conflicting/,
      );
      await expect(async () => coordinator.runUntilWorkBoundary()).rejects.toBe(
        error,
      );
      await expect(async () => coordinator.runUntilWorkBoundary()).rejects.toBe(
        error,
      );
    },
  );

  test(`${label} exposes detached summaries and empty finished boundaries`, async () => {
    const coordinator = create();
    const before = coordinator.captureProgressSnapshot();
    await coordinator.runUntilWorkBoundary();
    expect(before.workCompletionDeferredVertexIds).toEqual([]);
    const observed = coordinator.captureProgressSnapshot();
    (observed.workCompletionDeferredVertexIds as string[]).push('forged');
    (observed.progressByVertexId as Map<string, unknown>).clear();
    expect(
      coordinator.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual(['a']);
    expect(coordinator.captureProgressSnapshot().progressByVertexId.size).toBe(
      2,
    );
    const empty = create({
      ...options,
      dagDiscoverySource: {
        ...source,
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'holder',
            vertexContentInput: { $vertexData: '', $childDiscoveryHints: [] },
          },
        }),
      },
    });
    expect(empty.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
    expect(await empty.runUntilWorkBoundary()).toEqual({ kind: 'finished' });
    expect(empty.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
  });
}

test('wrapping requires external settlement and does not claim or run the runner', () => {
  for (const workCompletionPolicy of [
    undefined,
    'afterWorkReadyVisitorChain',
  ] as const) {
    const input = {
      dagDiscoverySource: source,
      sourceRootIsHiddenEntryHolder: true,
      ...(workCompletionPolicy === undefined ? {} : { workCompletionPolicy }),
    };
    expect(() =>
      bindDagExternalWorkSession(
        new DagTraversalBuilder<G>(
          input,
        ).createIndependentRunnerFromCurrentOptions(),
      ),
    ).toThrow(TypeError);
    expect(() =>
      bindAsyncDagExternalWorkSession(
        new AsyncDagTraversalBuilder<G>(
          input,
        ).createIndependentRunnerFromCurrentOptions(),
      ),
    ).toThrow(TypeError);
  }
  const runner = new DagTraversalBuilder<G, G, string>(
    options,
  ).createIndependentRunnerFromCurrentOptions();
  const first = bindDagExternalWorkSession(runner);
  const second = bindDagExternalWorkSession(runner);
  expect(runner.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.NOT_STARTED,
  );
  runner.discoverValidateAndFreezeTopology();
  const ticket = frontier(first.runUntilWorkBoundary())[0]!;
  expect(() => second.acceptCompletedWork(ticket)).toThrow(TypeError);
  const other = frontier(second.runUntilWorkBoundary())[0]!;
  expect(second.acceptCompletedWork(other)).toEqual({ kind: 'accepted' });
  expect(first.acceptCompletedWork(ticket)).toEqual({
    kind: 'alreadyAccepted',
  });
});

test('sync cooperative pause preserves callback continuation', () => {
  const traversal = new DagTraversalBuilder<G, G, string>(options);
  const visited: string[] = [];
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
    visited.push(vertex.getVertexData());
    expect(coordinator.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
    expect(coordinator.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
  });
  const coordinator = bindDagExternalWorkSession(
    traversal.createIndependentRunnerFromCurrentOptions(),
  );
  expect(coordinator.runUntilWorkBoundary()).toEqual({ kind: 'paused' });
  expect(visited).toEqual(['a']);
  expect(frontier(coordinator.runUntilWorkBoundary())[0]!.vertexId).toBe('a');
});

test('async pause drains admitted callbacks and concurrent advance keeps runner ownership', async () => {
  const entered = deferred<void>();
  const release = deferred<void>();
  const traversal = new AsyncDagTraversalBuilder<G, G, string>(options);
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, async () => {
    entered.resolve();
    await release.promise;
  });
  const coordinator = bindAsyncDagExternalWorkSession(
    traversal.createIndependentRunnerFromCurrentOptions(),
  );
  const advancing = coordinator.runUntilWorkBoundary();
  await entered.promise;
  await expect(coordinator.runUntilWorkBoundary()).rejects.toThrow(/active/);
  expect(coordinator.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
  let ended = false;
  void advancing.then(() => {
    ended = true;
  });
  await eventLoopTurn();
  expect(ended).toBe(false);
  release.resolve();
  expect(await advancing).toEqual({ kind: 'paused' });
  expect(frontier(await coordinator.runUntilWorkBoundary())[0]!.vertexId).toBe(
    'a',
  );
});

test('deleted work rejects previously issued tickets as stale', () => {
  const traversal = new DagTraversalBuilder<G, G, string>({
    ...options,
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'holder',
          vertexContentInput: {
            $vertexData: '',
            $childDiscoveryHints: ['parent', 'gate'],
          },
        },
      }),
      resolveChildHint: (id) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: id,
          workWaitsForWorkOf: id === 'parent' ? ['gate'] : [],
          vertexContentInput: {
            $vertexData: id,
            $childDiscoveryHints: id === 'parent' ? ['child'] : [],
          },
        },
      }),
    },
    discoveryTiming: 'completeBeforeAnyVisitor',
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) =>
    vertex.getVertexData() === 'parent'
      ? {
          commands: [
            {
              commandName:
                Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
            },
          ],
        }
      : undefined,
  );
  const coordinator = bindDagExternalWorkSession(
    traversal.createIndependentRunnerFromCurrentOptions(),
  );
  const tickets = frontier(coordinator.runUntilWorkBoundary());
  const child = tickets.find((ticket) => ticket.vertexId === 'child')!;
  coordinator.acceptCompletedWork(
    tickets.find((ticket) => ticket.vertexId === 'gate')!,
  );
  expect(coordinator.runUntilWorkBoundary()).toEqual({ kind: 'finished' });
  expect(() => coordinator.acceptCompletedWork(child)).toThrow(/stale/);
});

for (const async of [false, true]) {
  test.each([undefined, null, NaN, Symbol('id'), { id: 'object' }])(
    `${async ? 'async' : 'sync'} tickets preserve arbitrary ID identity: %p`,
    async (id) => {
      const input = {
        workCompletionPolicy: 'requireExternalWorkSettlement' as const,
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: id,
              vertexContentInput: {
                $vertexData: 'work',
                $childDiscoveryHints: [],
              },
            },
          }),
          resolveChildHint: () => ({
            omittedVertexIdentity: null,
            kind: 'vertexIntentionallyOmitted' as const,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          }),
        },
      };
      const coordinator = async
        ? bindAsyncDagExternalWorkSession(
            new AsyncDagTraversalBuilder<G>(
              input,
            ).createIndependentRunnerFromCurrentOptions(),
          )
        : bindDagExternalWorkSession(
            new DagTraversalBuilder<G>(
              input,
            ).createIndependentRunnerFromCurrentOptions(),
          );
      const ticket = frontier(await coordinator.runUntilWorkBoundary())[0]!;
      expect(ticket.vertexId).toBe(id);
      expect(Object.isFrozen(ticket)).toBe(true);
      if (typeof id === 'object' && id !== null)
        expect(Object.isFrozen(id)).toBe(false);
      expect(() => {
        // @ts-expect-error A copied ticket has no nominal ownership.
        coordinator.acceptCompletedWork({ ...ticket });
      }).toThrow(TypeError);
      expect(coordinator.acceptCompletedWork(ticket)).toEqual({
        kind: 'accepted',
      });
      expect(await coordinator.runUntilWorkBoundary()).toEqual({
        kind: 'finished',
      });
    },
  );

  test(`${
    async ? 'async' : 'sync'
  } forwards source and callback failures exactly`, async () => {
    const error = { failed: 'callback' };
    for (const fromSource of [true, false]) {
      const input = {
        ...options,
        dagDiscoverySource: {
          ...source,
          resolveRootVertex: () => {
            if (fromSource) throw error;
            return source.resolveRootVertex();
          },
        },
      };
      const traversal = async
        ? new AsyncDagTraversalBuilder<G>(input)
        : new DagTraversalBuilder<G>(input);
      traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, () => {
        throw error;
      });
      const coordinator =
        traversal instanceof AsyncDagTraversalBuilder
          ? bindAsyncDagExternalWorkSession(
              traversal.createIndependentRunnerFromCurrentOptions(),
            )
          : bindDagExternalWorkSession(
              traversal.createIndependentRunnerFromCurrentOptions(),
            );
      await expect(async () => coordinator.runUntilWorkBoundary()).rejects.toBe(
        error,
      );
    }
  });
}

for (const async of [false, true]) {
  test(`${
    async ? 'async' : 'sync'
  } prepared sessions explain blockers without advancing or exposing tickets`, async () => {
    const result = discoverValidateAndCaptureDag(
      materializeMultiEntryDagInputFromRecordCatalog(
        [
          { id: 'a', dependencies: [] as string[] },
          { id: 'b', dependencies: ['a'] },
        ],
        {
          selectVertexId: (item) => item.id,
          selectWorkPrerequisiteVertexIds: (item) => item.dependencies,
        },
      ),
    );
    if (result.kind !== 'valid') throw Error('Expected prepared DAG');
    const session = async
      ? await result.validatedTopology.createAsyncExternalWorkSession()
      : result.validatedTopology.createExternalWorkSession();
    const before = session.captureProgressSnapshot();
    expect(session.getTraversalLifecycleStatus()).toBe(
      TraversalRunnerStatus.SUSPENDED,
    );
    expect(session.getTraversalStopReason()).toBe('prepared');
    expect(session.isSuspended()).toBe(true);
    expect(session.captureExecutionSnapshot().traversalLifecycleStatus).toBe(
      TraversalRunnerStatus.SUSPENDED,
    );
    const captured = session.captureMilestoneSnapshot();
    expect(
      captured.queryOriginalPrerequisiteMilestonesOf({
        vertexId: 'b',
        milestone: 'workCompletion',
      }).reachedMilestones,
    ).toContainEqual({ vertexId: 'a', milestone: 'workCompletion' });
    expect(session.captureProgressSnapshot()).toEqual(before);
    const ticket = frontier(await session.runUntilWorkBoundary())[0]!;
    expect(session.getTraversalStopReason()).toBe('awaitingSettlement');
    expect(session.isSuspended()).toBe(true);
    expect(
      session
        .captureMilestoneSnapshot()
        .explainMilestone({ vertexId: 'b', milestone: 'workCompletion' }),
    ).toMatchObject({ kind: 'live', milestoneSatisfied: false });
    session.acceptCompletedWork(ticket);
    expect(
      session
        .captureMilestoneSnapshot()
        .explainMilestone({ vertexId: 'a', milestone: 'workCompletion' }),
    ).toMatchObject({ kind: 'live', milestoneSatisfied: true });
    expect(
      captured.explainMilestone({ vertexId: 'a', milestone: 'workCompletion' }),
    ).toMatchObject({ kind: 'live', milestoneSatisfied: false });
  });

  test.each([null, undefined, { fatal: true }])(
    `${
      async ? 'async' : 'sync'
    } failTraversal is the sole fatal settlement method: %p`,
    async (error) => {
      const session = async
        ? bindAsyncDagExternalWorkSession(
            new AsyncDagTraversalBuilder<G, G, string>(
              options,
            ).createIndependentRunnerFromCurrentOptions(),
          )
        : bindDagExternalWorkSession(
            new DagTraversalBuilder<G, G, string>(
              options,
            ).createIndependentRunnerFromCurrentOptions(),
          );
      const ticket = frontier(await session.runUntilWorkBoundary())[0]!;
      expect('fail' in session).toBe(false);
      expect(session.failTraversal(ticket, error)).toEqual({
        kind: 'accepted',
      });
      expect(session.failTraversal(ticket, error)).toEqual({
        kind: 'alreadyAccepted',
      });
      await expect(async () => session.runUntilWorkBoundary()).rejects.toBe(
        error,
      );
      expect(session.getTraversalLifecycleStatus()).toBe(
        TraversalRunnerStatus.FAILED,
      );
      expect(session.captureExecutionSnapshot().traversalLifecycleStatus).toBe(
        TraversalRunnerStatus.FAILED,
      );
    },
  );
}
