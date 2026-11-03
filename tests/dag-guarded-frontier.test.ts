import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { DagTraversalBuilder } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversalBuilder } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';

type G = VertexDataAndChildHintTypes<string, string>;
for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} exposes atomic readiness separately from committed events`, async () => {
    const runner = new Constructor<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'a',
            vertexContentInput: {
              $vertexData: 'a',
              $childDiscoveryHints: ['b'],
            },
          },
        }),
        resolveChildHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf: ['a'],
            vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
          },
        }),
      },
      workCompletionPolicy: 'requireExternalWorkSettlement',
    }).createIndependentRunnerFromCurrentOptions();
    await runner.discoverValidateAndFreezeTopology();
    expect(runner.captureProgressSnapshot().workAwaitingSettlement).toEqual([]);
    await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
    const first = runner.captureProgressSnapshot().workAwaitingSettlement;
    expect(first).toEqual([
      { vertexId: 'a', settlementToken: expect.any(Symbol) },
    ]);
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([]);
    expect(
      runner.captureProgressSnapshot()
        .workVisitorReadyOrWorkCompletionDeferredVertexIds,
    ).toEqual(['a']);
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual(['a']);
    expect(
      runner.captureProgressSnapshot().admittedVisitorChainVertexIds,
    ).toEqual([]);
    expect(runner.captureProgressSnapshot().counts).toMatchObject({
      workVisitorReadyOrWorkCompletionDeferredVertices: 1,
      workCompletionDeferredVertices: 1,
      verticesWithAdmittedVisitorChains: 0,
    });
    expect(
      runner.settleDeferredWork(
        first[0]!.vertexId,
        { kind: 'workCompleted' },
        first[0]!.settlementToken,
      ),
    ).toBe(true);
    expect(runner.captureProgressSnapshot().workAwaitingSettlement).toEqual([]);
    // Successful settlement commits W immediately.
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual(['a']);
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual([]);
    expect(
      runner.captureProgressSnapshot()
        .workVisitorReadyOrWorkCompletionDeferredVertexIds,
    ).toEqual(['b']);
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('a'),
    ).toMatchObject({
      vertexId: 'a',
      workState: 'workCompletionCommitted',
      subgraphCompletionCommitted: false,
    });
    const events = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      {
        deliveredEventKinds: [
          'workCompletionCommitted',
          'subgraphCompletionCommitted',
        ],
      },
    ))
      events.push(event.eventKind);
    // Settlement records W independently of the old selector; delivery selects it now.
    expect(events).toEqual(['workCompletionCommitted']);
    expect(
      runner
        .captureProgressSnapshot()
        .workAwaitingSettlement.map((work) => work.vertexId),
    ).toEqual(['b']);
    const second = runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
    runner.settleDeferredWork(
      second.vertexId,
      { kind: 'workCompleted' },
      second.settlementToken,
    );
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      events.push(event.eventKind);
    expect(events).toEqual([
      'workCompletionCommitted',
      'workCompletionCommitted',
      'subgraphCompletionCommitted',
      'subgraphCompletionCommitted',
    ]);
    expect(first).toEqual([
      { vertexId: 'a', settlementToken: first[0]!.settlementToken },
    ]);
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  for (const discovery of [
    'incrementalDuringTraversal',
    'completeBeforeAnyVisitor',
  ] as const) {
    test(`${Constructor.name} ${discovery} frontier preserves opaque identity and discovery order`, async () => {
      const objectId = { omittedVertexIdentity: true };
      const ids = [objectId, Symbol('work'), undefined, NaN];
      const runner = new Constructor<G>({
        discoveryTiming: discovery,
        sourceRootIsHiddenEntryHolder: true,
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: 'hidden',
                $childDiscoveryHints: ['0', '1', '2', '3'],
              },
            },
          }),
          resolveChildHint: (index) => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: ids[Number(index)],
              vertexContentInput: {
                $vertexData: index,
                $childDiscoveryHints: [],
              },
            },
          }),
        },
        workCompletionPolicy: 'requireExternalWorkSettlement',
      }).createIndependentRunnerFromCurrentOptions();
      expect(runner.captureProgressSnapshot().workAwaitingSettlement).toEqual(
        [],
      );
      await runner.runUntilSuspendedOrTerminal({
        deliveredEventKinds: [],
        admittedVisitorCallbackPhases: { include: [] },
      });
      const snapshot = runner.captureProgressSnapshot().workAwaitingSettlement;
      expect(snapshot.map((work) => work.vertexId)).toEqual(ids);
      expect(new Set(snapshot.map((work) => work.settlementToken)).size).toBe(
        4,
      );
      expect(snapshot[0]!.vertexId).toBe(objectId);
      const original = { ...snapshot[0]! };
      Object.assign(snapshot[0]!, {
        vertexId: 'tampered',
        settlementToken: Symbol('tampered'),
      });
      expect(
        runner.captureProgressSnapshot().workAwaitingSettlement[0],
      ).toEqual(original);
      expect(
        runner.settleDeferredWork(
          original.vertexId,
          { kind: 'workCompleted' },
          original.settlementToken,
        ),
      ).toBe(true);
      expect(
        runner
          .captureProgressSnapshot()
          .workAwaitingSettlement.map((work) => work.vertexId),
      ).toEqual(ids.slice(1));
      for (const work of runner.captureProgressSnapshot()
        .workAwaitingSettlement)
        runner.settleDeferredWork(
          work.vertexId,
          { kind: 'workCompleted' },
          work.settlementToken,
        );
      await runner.runUntilSuspendedOrTerminal();
      expect(runner.captureProgressSnapshot().workAwaitingSettlement).toEqual(
        [],
      );
      expect(runner.getTraversalStopReason()).toBe('finished');
      expect(Object.isFrozen(objectId)).toBe(false);
    });
  }

  test(`${Constructor.name} rejected work is no longer in the unsettled frontier`, async () => {
    const runner = new Constructor<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'a',
            vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
          },
        }),
        resolveChildHint: () => ({
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted' as const,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        }),
      },
      workCompletionPolicy: 'requireExternalWorkSettlement',
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    const work = runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
    runner.settleDeferredWork(
      work.vertexId,
      { kind: 'traversalFailed', error: null },
      work.settlementToken,
    );
    expect(runner.captureProgressSnapshot().workAwaitingSettlement).toEqual([]);
    // Accepted failure leaves W uncommitted but removes dispatch eligibility.
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual(['a']);
    expect(
      runner.captureProgressSnapshot()
        .workVisitorReadyOrWorkCompletionDeferredVertexIds,
    ).toEqual(['a']);
    expect(
      runner.captureProgressSnapshot().admittedVisitorChainVertexIds,
    ).toEqual([]);
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([]);
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('a'),
    ).toMatchObject({
      vertexId: 'a',
      workState: 'workCompletionDeferred',
      subgraphCompletionCommitted: false,
    });
    await expect(async () =>
      runner.discoverValidateAndFreezeTopology(),
    ).rejects.toBe(null);
  });
}

test('async frontier excludes running and queued work until chains defer', async () => {
  let release!: () => void;
  let entered!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const runner = new AsyncDagTraversalBuilder<G>({
    maxConcurrentCallbackInvocations: 1,
    discoveryTiming: 'completeBeforeAnyVisitor',
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'a',
          vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: ['b'] },
        },
      }),
      resolveChildHint: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'b',
          vertexContentInput: { $vertexData: 'b', $childDiscoveryHints: [] },
        },
      }),
    },
    workCompletionPolicy: 'requireExternalWorkSettlement',
  })
    .registerVisitorCallbackForPhase(Order.ON_WORK_READY, async () => {
      entered();
      await gate;
    })
    .createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  await started;
  expect(
    runner.captureProgressSnapshot().admittedVisitorChainVertexIds,
  ).toEqual(['a']);
  expect(
    runner.captureProgressSnapshot()
      .workVisitorReadyOrWorkCompletionDeferredVertexIds,
  ).toEqual(['b']);
  expect(runner.captureProgressSnapshot().workAwaitingSettlement).toEqual([]);
  release();
  await running;
  expect(
    runner
      .captureProgressSnapshot()
      .workAwaitingSettlement.map((work) => work.vertexId),
  ).toEqual(['a', 'b']);
});

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} explicit deferral emits committed events and excludes deletion`, async () => {
    const runner = new Constructor<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['deleted', 'deferred'],
            },
          },
        }),
        resolveChildHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
          },
        }),
      },
    })
      .registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
        if (vertex.getVertexData() === 'deleted')
          return {
            commands: [
              {
                commandName:
                  Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
              },
            ],
          };
        if (vertex.getVertexData() === 'deferred')
          return {
            commands: [
              {
                commandName:
                  Command.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION,
              },
            ],
          };
        return undefined;
      })
      .createIndependentRunnerFromCurrentOptions();
    const events = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      events.push([event.vertex.getVertexData(), event.eventKind]);
    expect(events).toEqual([['root', 'workCompletionCommitted']]);
    expect(
      runner
        .captureProgressSnapshot()
        .workAwaitingSettlement.map((work) => work.vertexId),
    ).toEqual(['deferred']);
    const work = runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
    runner.settleDeferredWork(
      work.vertexId,
      { kind: 'workCompleted' },
      work.settlementToken,
    );
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
      events.push([event.vertex.getVertexData(), event.eventKind]);
    }
    expect(events).toEqual([
      ['root', 'workCompletionCommitted'],
      ['deferred', 'workCompletionCommitted'],
      ['deferred', 'subgraphCompletionCommitted'],
      ['root', 'subgraphCompletionCommitted'],
    ]);
    expect(runner.captureProgressSnapshot().workAwaitingSettlement).toEqual([]);
  });
}
