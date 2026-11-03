import type { DagPrerequisiteLookupResult } from '../src/core/TraversableTree';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { AsyncDagTraversalBuilder } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import type { TestGraph as G } from './helpers/graph-fixtures';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';
import {
  createInternalAsyncDagTraversalRunner,
  runnerInternals,
} from './internal-runner-fixtures';

const removed = {
  commands: [
    {
      commandName:
        Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS as const,
    },
  ],
};
const found = {
  kind: 'vertexResolved' as const,
  resolvedVertexInput: {
    vertexContentInput: { $vertexData: 'external', $childDiscoveryHints: [] },
  },
};

test('held lookup respects halt and iterator return, stores its reply and resumes once', async () => {
  const gate = deferred<DagPrerequisiteLookupResult<G>>();
  const entered = deferred<void>();
  const calls: unknown[] = [];
  const traversal = new AsyncDagTraversalBuilder<G>({
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'root',
          workWaitsForWorkOf: ['external'],
          vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
        },
      }),
      resolveChildHint: () => ({
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted' as const,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
      }),
      resolvePrerequisiteByVertexId: (id) => {
        calls.push(id);
        entered.resolve();
        return gate.promise;
      },
    },
  });
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [],
    });
  const running = iterator.next();
  await entered.promise;
  const before = runner.captureProgressSnapshot();
  expect(before.discovery.complete).toBe(false);
  expect(runner.captureProgressSnapshot()).toEqual(before);
  expect(runner.captureExecutionSnapshot().pendingCallbackRequests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        operation: 'resolvePrerequisiteByVertexId',
        owner: expect.objectContaining({ ownerKind: 'prerequisiteResolution' }),
      }),
    ]),
  );
  await iterator.return(undefined);
  await running;
  expect(() =>
    createInternalAsyncDagTraversalRunner<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildHint: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
      traversalRunnerInternalObjects: {
        resolvedGraphsContainer:
          runnerInternals(runner).resolvedGraphsContainer,
      },
    }),
  ).toThrow('Injected DAG objects belong to an active runner');
  gate.resolve(found);
  await eventLoopTurn();
  expect(
    runner.getLiveResolvedGraphView().getVertexHandleByIdOrNull('external'),
  ).toBeNull();
  expect(runner.captureProgressSnapshot()).toEqual(before);
  await runner.runUntilSuspendedOrTerminal();
  expect(calls).toEqual(['external']);
  expect(
    runner.captureProgressSnapshot().counts.subgraphCompletionCommittedVertices,
  ).toBe(2);
});

for (const removeAll of [false, true]) {
  test(`shared lookup survives only while retained original declarations demand it (${removeAll})`, async () => {
    const lookup = deferred<DagPrerequisiteLookupResult<G>>();
    const entered = deferred<void>();
    const a = deferred<void>();
    const b = deferred<void>();
    const calls: unknown[] = [];
    const traversal = new AsyncDagTraversalBuilder<G>({
      acceptedCompletedWorkVertexIds: new Set(['a', 'b']),
      maxConcurrentCallbackInvocations: 4,
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
        resolveChildHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf: ['external'],
            vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
          },
        }),
        resolvePrerequisiteByVertexId: (id) => {
          calls.push(id);
          entered.resolve();
          return lookup.promise;
        },
      },
    });
    traversal.registerVisitorCallbackForPhase(
      Order.ON_SUBGRAPH_COMPLETION_READY,
      async (v) => {
        if (v.getVertexData() === 'a') {
          await a.promise;
          return removed;
        }
        if (v.getVertexData() === 'b') {
          await b.promise;
          return removeAll ? removed : undefined;
        }
        return undefined;
      },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    const running = runner.runUntilSuspendedOrTerminal();
    await entered.promise;
    a.resolve();
    if (removeAll) b.resolve();
    await eventLoopTurn();
    lookup.resolve(found);
    if (!removeAll) b.resolve();
    await running;
    expect(calls).toEqual(['external']);
    expect(
      runner
        .getLiveResolvedGraphView()
        .getVertexHandleByIdOrNull('external') === null,
    ).toBe(removeAll);
    expect(
      runner.captureProgressSnapshot().counts
        .subgraphCompletionCommittedVertices,
    ).toBe(removeAll ? 1 : 3);
  });
}

test('deleting the root invalidates held lookup errors without resurrecting detached work', async () => {
  const lookup = deferred<DagPrerequisiteLookupResult<G>>();
  const entered = deferred<void>();
  const remove = deferred<void>();
  const traversal = new AsyncDagTraversalBuilder<G>({
    acceptedCompletedWorkVertexIds: new Set(['root']),
    maxConcurrentCallbackInvocations: 2,
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'root',
          workWaitsForWorkOf: ['external'],
          vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
        },
      }),
      resolveChildHint: () => ({
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted' as const,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
      }),
      resolvePrerequisiteByVertexId: () => {
        entered.resolve();
        return lookup.promise;
      },
    },
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_SUBGRAPH_COMPLETION_READY,
    async () => {
      await remove.promise;
      return removed;
    },
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  await entered.promise;
  remove.resolve();
  await eventLoopTurn();
  lookup.reject(undefined);
  await running;
  expect(runner.getLiveResolvedGraphView().getVertexHandles()).toEqual([]);
  expect(runner.captureProgressSnapshot().counts.retainedLiveVertices).toBe(0);
});

for (const hinted of [false, true]) {
  test(`eager lookup closure waits for racing lookup and ordinary discovery (${hinted})`, async () => {
    const second = deferred<DagPrerequisiteLookupResult<G>>();
    const calls: string[] = [];
    const events: string[] = [];
    const traversal = new AsyncDagTraversalBuilder<G>({
      discoveryTiming: 'completeBeforeAnyVisitor',
      maxConcurrentCallbackInvocations: 3,
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['loader', 'external'],
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: [],
            },
          },
        }),
        ...(hinted
          ? { tryGetVertexIdentityFromHint: (id: string) => ({ vertexId: id }) }
          : {}),
        resolveChildHint: (id) => {
          calls.push(id);
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: id,
              workWaitsForWorkOf: [],
              vertexContentInput: {
                $vertexData: 'ordinary',
                $childDiscoveryHints: [],
              },
            },
          };
        },
        resolvePrerequisiteByVertexId: (id) =>
          id === 'external'
            ? second.promise
            : Promise.resolve({
                kind: 'vertexResolved' as const,
                resolvedVertexInput: {
                  vertexContentInput: {
                    $vertexData: 'loader',
                    $childDiscoveryHints: ['external'],
                  },
                },
              }),
      },
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (v) => {
      events.push(v.getVertexData());
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    const running = runner.runUntilSuspendedOrTerminal();
    await eventLoopTurn();
    expect(events).toEqual([]);
    expect(runner.captureProgressSnapshot().discovery.complete).toBe(false);
    expect(calls).toEqual(hinted ? [] : ['external']);
    second.resolve(found);
    await running;
    expect(runner.captureProgressSnapshot().counts.retainedLiveVertices).toBe(
      3,
    );
    expect(
      events.filter((id) => id === 'external' || id === 'ordinary'),
    ).toEqual([hinted ? 'external' : 'ordinary']);
  });
}

test('resolver calls share the finite callback concurrency ceiling', async () => {
  const gates = [
    deferred<DagPrerequisiteLookupResult<G>>(),
    deferred<DagPrerequisiteLookupResult<G>>(),
    deferred<DagPrerequisiteLookupResult<G>>(),
  ];
  const calls: unknown[] = [];
  const runner = new AsyncDagTraversalBuilder<G>({
    maxConcurrentCallbackInvocations: 2,
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'root',
          workWaitsForWorkOf: [0, 1, 2],
          vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
        },
      }),
      resolveChildHint: () => ({
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted' as const,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
      }),
      resolvePrerequisiteByVertexId: (id) => {
        calls.push(id);
        return gates[id as number]!.promise;
      },
    },
  }).createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  await eventLoopTurn();
  expect(calls).toEqual([0, 1]);
  expect(runner.captureExecutionSnapshot().inFlightInvocationCount).toBe(2);
  gates[0]!.resolve(found);
  await eventLoopTurn();
  expect(calls).toEqual([0, 1, 2]);
  gates[1]!.resolve(found);
  gates[2]!.resolve(found);
  await running;
  expect(
    runner.captureProgressSnapshot().counts.subgraphCompletionCommittedVertices,
  ).toBe(4);
});

for (const error of [undefined, null, { rejected: true }]) {
  test(`stored async resolver rejection survives resume (${String(
    error,
  )})`, async () => {
    const gate = deferred<DagPrerequisiteLookupResult<G>>();
    const runner = new AsyncDagTraversalBuilder<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['external'],
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildHint: () => ({
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted' as const,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        }),
        resolvePrerequisiteByVertexId: () => gate.promise,
      },
    }).createIndependentRunnerFromCurrentOptions();
    const iterator =
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [],
      });
    const next = iterator.next();
    await eventLoopTurn();
    await iterator.return(undefined);
    await next;
    gate.reject(error);
    await eventLoopTurn();
    expect(
      runner.getLiveResolvedGraphView().getVertexHandleByIdOrNull('external'),
    ).toBeNull();
    await expect(runner.runUntilSuspendedOrTerminal()).rejects.toBe(error);
  });
}

test('fatal lookup failure invalidates queued and started sibling lookups', async () => {
  const first = deferred<DagPrerequisiteLookupResult<G>>();
  const second = deferred<DagPrerequisiteLookupResult<G>>();
  const calls: unknown[] = [];
  const error = {};
  const runner = new AsyncDagTraversalBuilder<G>({
    maxConcurrentCallbackInvocations: 2,
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'root',
          workWaitsForWorkOf: ['a', 'b', 'c'],
          vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
        },
      }),
      resolveChildHint: () => ({
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted' as const,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
      }),
      resolvePrerequisiteByVertexId: (id) => {
        calls.push(id);
        return id === 'a' ? first.promise : second.promise;
      },
    },
  }).createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  const rejected = expect(running).rejects.toBe(error);
  await eventLoopTurn();
  first.reject(error);
  second.resolve(found);
  await rejected;
  expect(calls).toEqual(['a', 'b']);
  expect(runner.getLiveResolvedGraphView().getVertexHandles()).toHaveLength(1);
});

for (const lookupSource of [false, true]) {
  for (const reject of [false, true]) {
    test(`acceptance-triggered deletion invalidates consumer callbacks (${lookupSource}, ${reject})`, async () => {
      const acceptance =
        deferred<import('../src').DagSourceVertexResolution<G>>();
      const consumer = deferred<void>();
      const consumerEntered = deferred<void>();
      const traversal = new AsyncDagTraversalBuilder<G>({
        acceptedCompletedWorkVertexIds: new Set(['consumer']),
        maxConcurrentCallbackInvocations: 4,
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'root',
              vertexContentInput: {
                $vertexData: 'root',
                $childDiscoveryHints: [
                  'dead',
                  'consumer',
                  ...(lookupSource ? [] : ['external']),
                ],
              },
            },
          }),
          resolveChildHint: (id) =>
            id === 'external'
              ? acceptance.promise
              : {
                  kind: 'vertexResolved' as const,
                  resolvedVertexInput: {
                    vertexId: id,
                    workWaitsForWorkOf: id === 'consumer' ? ['external'] : [],
                    vertexContentInput: {
                      $vertexData: id,
                      $childDiscoveryHints: [],
                    },
                  },
                },
          ...(lookupSource
            ? { resolvePrerequisiteByVertexId: () => acceptance.promise }
            : {}),
        },
      });
      traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (v) =>
        v.getVertexData() === 'dead' ? removed : undefined,
      );
      traversal.registerVisitorCallbackForPhase(
        Order.ON_SUBGRAPH_COMPLETION_READY,
        async (v) => {
          if (v.getVertexData() === 'consumer') {
            consumerEntered.resolve();
            await consumer.promise;
          }
        },
      );
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      const running = runner.runUntilSuspendedOrTerminal();
      await consumerEntered.promise;
      acceptance.resolve({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'external',
          workWaitsForWorkOf: ['dead'],
          vertexContentInput: {
            $vertexData: 'external',
            $childDiscoveryHints: [],
          },
        },
      });
      await eventLoopTurn();
      if (reject) consumer.reject(undefined);
      else consumer.resolve();
      await running;
      expect(
        runner
          .getLiveResolvedGraphView()
          .getVertexHandles()
          .map((ref) => ref.getCurrentVertexView().getVertexData()),
      ).toEqual(['root']);
      expect(
        runner.captureProgressSnapshot().counts
          .subgraphCompletionCommittedVertices,
      ).toBe(1);
    });
  }
}

for (const omittedFirst of [false, true]) {
  test(`lookup races preserve first-accepted omission/content precedence (${omittedFirst})`, async () => {
    const second = deferred<DagPrerequisiteLookupResult<G>>();
    const runner = new AsyncDagTraversalBuilder<G>({
      discoveryTiming: 'completeBeforeAnyVisitor',
      maxConcurrentCallbackInvocations: 2,
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['loader', 'external'],
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildHint: (id) =>
          omittedFirst
            ? {
                kind: 'vertexIntentionallyOmitted',
                omittedVertexIdentity: { vertexId: id },
                satisfiesWorkAndSubgraphCompletionPrerequisites: true,
              }
            : {
                kind: 'vertexResolved',
                resolvedVertexInput: {
                  vertexId: id,
                  workWaitsForWorkOf: [],
                  vertexContentInput: {
                    $vertexData: 'ordinary',
                    $childDiscoveryHints: [],
                  },
                },
              },
        resolvePrerequisiteByVertexId: (id) =>
          id === 'external'
            ? second.promise
            : {
                kind: 'vertexResolved' as const,
                resolvedVertexInput: {
                  vertexContentInput: {
                    $vertexData: 'loader',
                    $childDiscoveryHints: ['external'],
                  },
                },
              },
      },
    }).createIndependentRunnerFromCurrentOptions();
    const running = runner.runUntilSuspendedOrTerminal();
    await eventLoopTurn();
    second.resolve(
      omittedFirst
        ? found
        : {
            omittedVertexIdentity: null,
            kind: 'vertexIntentionallyOmitted' as const,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          },
    );
    if (omittedFirst) {
      await expect(running).rejects.toThrow(
        'Vertex omission conflicts with supplied content',
      );
      expect(
        runner.getLiveResolvedGraphView().getVertexHandleByIdOrNull('external'),
      ).toBeNull();
    } else {
      await running;
      expect(
        runner
          .getLiveResolvedGraphView()
          .getVertexHandleByIdOrNull('external')!
          .getCurrentVertexView()
          .getVertexData(),
      ).toBe('ordinary');
      expect(
        runner.captureProgressSnapshot().counts
          .subgraphCompletionCommittedVertices,
      ).toBe(3);
    }
  });
}
