import { MutableValueReference } from '../src/core/CTTRef';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { Vertex } from '../src/core/Vertex';
import { AsyncDagTraversalBuilder } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalInstanceConfig';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { DagTraversalRunnerState } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerState';
import type { TestGraph } from './helpers/graph-fixtures';
import {
  deferred,
  diamond,
  eventLoopTurn,
  graphAdapter,
} from './helpers/graph-fixtures';
import {
  createInternalAsyncDagTraversalRunner,
  runnerInternals,
} from './internal-runner-fixtures';

const rejectAfter = (milliseconds: number) =>
  new Promise<never>((_resolve, reject) => {
    setTimeout(
      () => reject(new Error('async traversal timed out')),
      milliseconds,
    );
  });

test('visits a shared join once after all deferred prerequisites complete', async () => {
  const aVisit = deferred<void>();
  const bVisit = deferred<void>();
  const visited: string[] = [];
  const traversal = new AsyncDagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter(diamond),
    maxConcurrentCallbackInvocations: 3,
  });
  traversal.registerVisitorForPhase(
    Order.ON_WORK_READY,
    async (vertex, options) => {
      const data = vertex.getVertexData();
      visited.push(data);
      expect(options.isVisibleSourceRoot).toBe(data === 'root');
      expect(options.isVisibleSourceRoot).toBe(data === 'root');
      if (data === 'A') await aVisit.promise;
      if (data === 'B') await bVisit.promise;
    },
  );
  const iterator = traversal
    .createIndependentRunnerFromCurrentOptions()
    .runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: ['workCompletionCommitted'],
    });

  await expect(iterator.next()).resolves.toMatchObject({
    done: false,
    value: { eventKind: 'workCompletionCommitted', isVisibleSourceRoot: true },
  });
  const aEvent = iterator.next();
  await eventLoopTurn();
  expect(visited).toEqual(['root', 'A', 'B']);

  aVisit.resolve();
  await expect(aEvent).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'A' } },
  });
  const bEvent = iterator.next();
  await eventLoopTurn();
  expect(visited).not.toContain('join');

  bVisit.resolve();
  await expect(bEvent).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'B' } },
  });
  await expect(iterator.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'join' } },
  });
  await expect(iterator.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });

  expect(visited.filter((data) => data === 'join')).toHaveLength(1);
  expect(visited).toEqual(['root', 'A', 'B', 'join']);
});

test('fails a hostile object-id stall without coercion, rejection, or hanging', async () => {
  let coercions = 0;
  const unhandled: unknown[] = [];
  const listener = (error: unknown) => unhandled.push(error);
  const hostileId = {
    toString() {
      coercions += 1;
      throw new Error('must not coerce vertex ids');
    },
  };
  process.on('unhandledRejection', listener);
  try {
    const runner = new AsyncDagTraversalBuilder<TestGraph>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['blocked'],
            },
            vertexId: 'root',
          },
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'blocked',
              $childDiscoveryHints: [],
            },
            vertexId: 'blocked',
            workWaitsForWorkOf: [hostileId],
          },
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();

    await expect(
      Promise.race([runner.runUntilSuspendedOrTerminal(), rejectAfter(100)]),
    ).rejects.toThrow(/DAG traversal stalled: "blocked", reference#1/);
    await eventLoopTurn();
    expect(coercions).toBe(0);
    expect(unhandled).toEqual([]);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
  } finally {
    process.off('unhandledRejection', listener);
  }
});

test('supports promised graph callbacks, sorting, hint identity, and snapshots', async () => {
  const originalHints = ['b', 'a'];
  const traversal = new AsyncDagTraversalBuilder<TestGraph>({
    dagDiscoverySource: {
      resolveRootVertex: async () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'root',
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: originalHints,
          },
        },
      }),
      resolveChildVertexFromHint: async (hint, options) => {
        expect(
          options.liveResolvedGraphView.getDesignatedRootHandleOrNull(),
        ).not.toBeNull();
        expect(options.livePreCommandDiscoveredGraphView).not.toBeNull();
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: hint,
            workWaitsForWorkOf: ['root'],
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        };
      },
      tryGetVertexIdentityFromHint: async (hint) => ({ vertexId: hint }),
    },
    transformChildHintsBeforeResolution: async (hints) => hints.reverse(),
    retainDiscoveredGraphBeforeVisitorCommands: true,
    maxConcurrentCallbackInvocations: 2,
  });
  traversal.registerVisitorForPhase(
    Order.ON_WORK_READY,
    async (vertex) =>
      vertex.getVertexData() === 'a'
        ? {
            commands: [
              {
                commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
                commandArguments: { replacementVertexData: 'changed' },
              },
            ],
          }
        : undefined,
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const values: string[] = [];
  for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    {
      deliveredEventKinds: ['workCompletionCommitted'],
    },
  )) {
    values.push(event.vertex.getVertexData());
    expect(event.isVisibleSourceRoot).toBe(
      event.vertexHandle ===
        runner.getLiveResolvedGraphView().getDesignatedRootHandleOrNull(),
    );
  }

  expect(values).toEqual(['root', 'changed', 'b']);
  expect(originalHints).toEqual(['b', 'a']);
  expect(
    runner.livePreCommandDiscoveredGraphView
      ?.getVertexHandleByIdOrNull('a')
      ?.getCurrentVertexView()
      .getVertexData(),
  ).toBe('a');
  expect(
    runner
      .getLiveResolvedGraphView()
      .getVertexHandleByIdOrNull('a')
      ?.getCurrentVertexView()
      .getVertexData(),
  ).toBe('changed');
});

test('supports an asynchronous tree source through the graph visitor facade', async () => {
  const traversal = new AsyncDagTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: async () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['child'],
          },
        },
      }),
      resolveChildVertexFromHint: async (hint, options) => {
        expect(
          options.liveResolvedTreeView.getRootVertexHandleOrNull(),
        ).not.toBeNull();
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        };
      },
    },
  });
  const optionsSeen: string[] = [];
  traversal.registerVisitorForPhase(
    Order.ON_WORK_READY,
    async (vertex, options) => {
      optionsSeen.push(vertex.getVertexData());
      expect(options.liveResolvedGraphView).toBeDefined();
      expect(options).not.toHaveProperty('resolvedTree');
    },
  );

  await expect(
    traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal(),
  ).resolves.toBeDefined();
  expect(optionsSeen).toEqual(['root', 'child']);
});

test('requires one fixed source mode and validates concurrency', () => {
  expect(
    () =>
      new AsyncDagTraversalBuilder(
        {} as ConstructorParameters<typeof AsyncDagTraversalBuilder>[0],
      ),
  ).toThrow(/exactly one/i);
  expect(
    () =>
      new AsyncDagTraversalBuilder({
        dagDiscoverySource: graphAdapter(),
        treeDiscoverySource: graphAdapter(),
      } as unknown as ConstructorParameters<typeof AsyncDagTraversalBuilder>[0]),
  ).toThrow(/exactly one/i);
  expect(
    () =>
      new AsyncDagTraversalBuilder<TestGraph>({
        dagDiscoverySource: graphAdapter(),
        maxConcurrentCallbackInvocations: 0,
      }),
  ).toThrow(TypeError);
  const traversal = new AsyncDagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter(),
  });
  expect(
    traversal.patchOptionsForFutureRunners({
      dagDiscoverySource: graphAdapter(),
    }),
  ).toBe(traversal);
  expect(() =>
    traversal.patchOptionsForFutureRunners({
      treeDiscoverySource: graphAdapter(),
    } as unknown as Parameters<typeof traversal.patchOptionsForFutureRunners>[0]),
  ).toThrow(/source mode/i);
  expect(
    traversal
      .createIndependentRunnerFromCurrentOptions()
      .captureExecutionSnapshot(),
  ).toMatchObject({
    callbackExecutionMode: 'async',
    traversalAlgorithm: 'dag',
    sourceTopologyKind: 'graph',
    maxConcurrentCallbackInvocations: Infinity,
    inFlightInvocationCount: 0,
    bufferedDeliveryEventCount: 0,
    traversalLifecycleStatus: Status.NOT_STARTED,
  });
  expect(Object.isFrozen(ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG)).toBe(
    true,
  );
  expect(
    Object.isFrozen(ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.visitors),
  ).toBe(true);

  const treeTraversal = new AsyncDagTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexIntentionallyOmitted' as const,
      }),
      resolveChildVertexFromHint: () => ({
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    },
  });
  expect(
    treeTraversal.patchOptionsForFutureRunners({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
    }),
  ).toBe(treeTraversal);
  expect(() =>
    treeTraversal.patchOptionsForFutureRunners({
      dagDiscoverySource: graphAdapter(),
    } as unknown as Parameters<typeof treeTraversal.patchOptionsForFutureRunners>[0]),
  ).toThrow(/source mode/i);
});

test('isolates visitor configuration when making a runner', async () => {
  const seen: string[] = [];
  const traversal = new AsyncDagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter({
      root: { children: [], dependencies: [] },
    }),
  });
  traversal.replaceVisitorDefinitionsForPhase(Order.ON_WORK_READY, [
    {
      descendingExecutionPriorityWithinGroup: 2,
      visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
      visitor: async () => void seen.push('first'),
    },
  ]);
  traversal.registerVisitorForPhase(
    Order.ON_WORK_READY,
    async () => void seen.push('second'),
    {
      descendingExecutionPriorityWithinGroup: 1,
    },
  );
  expect(
    traversal.getDetachedVisitorRegistrationRecordsForPhase(
      Order.ON_WORK_READY,
    ),
  ).toHaveLength(2);
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  traversal.replaceVisitorDefinitionsForPhase(Order.ON_WORK_READY, []);

  await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
  expect(seen).toEqual(['first', 'second']);
});

test('accepts initial and empty quiescent state but rejects active injection', async () => {
  for (const status of [Status.NOT_STARTED, Status.SUSPENDED]) {
    const state = new DagTraversalRunnerState<TestGraph>({ status });
    const container = new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    });
    const runner = createInternalAsyncDagTraversalRunner<TestGraph>({
      dagDiscoverySource: graphAdapter({
        root: { children: [], dependencies: [] },
      }),
      traversalRunnerInternalObjects: {
        state,
        resolvedGraphsContainer: container,
      },
    });
    expect(runnerInternals(runner).state).toBe(state);
    expect(runnerInternals(runner).resolvedGraphsContainer).toBe(container);
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
  }

  const active = new DagTraversalRunnerState<TestGraph>({
    status: Status.RUNNING,
    traversalRootVertexRef: new MutableValueReference(
      new Vertex<TestGraph>({ $vertexData: 'stale', $childDiscoveryHints: [] }),
    ),
  });
  expect(() =>
    createInternalAsyncDagTraversalRunner<TestGraph>({
      dagDiscoverySource: graphAdapter(),
      traversalRunnerInternalObjects: { state: active },
    }),
  ).toThrow(/quiescent|running/i);
});

test('validates injected container mode and snapshot compatibility', () => {
  const graphContainer = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  expect(() =>
    createInternalAsyncDagTraversalRunner<TestGraph>({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
      traversalRunnerInternalObjects: {
        resolvedGraphsContainer: graphContainer,
      },
    }),
  ).toThrow(/source mode/i);

  const snapshotContainer = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: true,
  });
  expect(() =>
    createInternalAsyncDagTraversalRunner<TestGraph>({
      dagDiscoverySource: graphAdapter(),
      traversalRunnerInternalObjects: {
        resolvedGraphsContainer: snapshotContainer,
      },
    }),
  ).toThrow(/snapshot mode/i);
});

test('accepts a non-empty quiescent ready seed without scheduling during construction', () => {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const root = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: 'root', $childDiscoveryHints: [] }),
  );
  container.acceptRoot(root, 'root');
  container.store.setVisitStage(root, 'INITIAL_VISIT_ELIGIBLE');
  const state = new DagTraversalRunnerState<TestGraph>({
    status: Status.SUSPENDED,
    traversalRootVertexRef: root,
    dependencyEligiblePhaseVisits: [
      { vertexHandle: root, order: Order.ON_WORK_READY },
    ],
  });
  let sourceCalls = 0;
  const runner = createInternalAsyncDagTraversalRunner<TestGraph>({
    dagDiscoverySource: {
      resolveRootVertex: () => {
        sourceCalls++;
        return {
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
        };
      },
      resolveChildVertexFromHint: () => ({
        omittedVertexIdentity: null,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    },
    traversalRunnerInternalObjects: {
      state,
      resolvedGraphsContainer: container,
    },
  });

  expect(runner.isSuspended()).toBe(true);
  expect(sourceCalls).toBe(0);
  expect(
    runner.captureExecutionSnapshot().dependencyEligiblePhaseVisits,
  ).toEqual([
    {
      vertexReferenceIdentity: root.getReferenceIdentity(),
      visitorPhase: Order.ON_WORK_READY,
    },
  ]);
});

test.each([new Error('injected failure'), undefined])(
  'preserves an injected FAILED state with exact error %#',
  async (failure) => {
    const state = new DagTraversalRunnerState<TestGraph>({
      status: Status.FAILED,
      failure: { error: failure },
    });
    let sourceCalls = 0;
    const runner = createInternalAsyncDagTraversalRunner<TestGraph>({
      dagDiscoverySource: {
        resolveRootVertex: () => {
          sourceCalls++;
          return {
            omittedVertexIdentity: null,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
            kind: 'vertexIntentionallyOmitted' as const,
          };
        },
        resolveChildVertexFromHint: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
      traversalRunnerInternalObjects: { state },
    });

    for (const attempt of [
      () => runner.runUntilSuspendedOrTerminal(),
      () =>
        runner.runAndIterateObservationEventsUntilSuspendedOrTerminal().next(),
    ]) {
      let caught = false;
      try {
        await attempt();
      } catch (error) {
        caught = true;
        expect(error).toBe(failure);
      }
      expect(caught).toBe(true);
    }
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
    expect(state.failure).toEqual({ error: failure });
    expect(sourceCalls).toBe(0);
  },
);

test.each([new Error('live failure'), undefined])(
  'stores a live failure for exact terminal reconstruction %#',
  async (failure) => {
    const root = deferred<{
      kind: 'vertexIntentionallyOmitted';
      omittedVertexIdentity: null;
      satisfiesWorkAndSubgraphCompletionPrerequisites: true;
    }>();
    const state = new DagTraversalRunnerState<TestGraph>();
    const container = new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    });
    const source = {
      resolveRootVertex: () => root.promise,
      resolveChildVertexFromHint: () => ({
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted' as const,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
      }),
    };
    const runner = createInternalAsyncDagTraversalRunner<TestGraph>({
      dagDiscoverySource: source,
      traversalRunnerInternalObjects: {
        state,
        resolvedGraphsContainer: container,
      },
    });
    const running = runner.runUntilSuspendedOrTerminal();
    await eventLoopTurn();
    root.reject(failure);
    let caught = false;
    try {
      await running;
    } catch (error) {
      caught = true;
      expect(error).toBe(failure);
    }
    expect(caught).toBe(true);
    expect(state.failure).toEqual({ error: failure });

    const reconstructed = createInternalAsyncDagTraversalRunner<TestGraph>({
      dagDiscoverySource: {
        resolveRootVertex: () => {
          throw new Error('terminal reconstruction must not resolve source');
        },
        resolveChildVertexFromHint: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
      traversalRunnerInternalObjects: {
        state,
        resolvedGraphsContainer: container,
      },
    });
    caught = false;
    try {
      await reconstructed.runUntilSuspendedOrTerminal();
    } catch (error) {
      caught = true;
      expect(error).toBe(failure);
    }
    expect(caught).toBe(true);
    expect(reconstructed.getTraversalLifecycleStatus()).toBe(Status.FAILED);
  },
);
