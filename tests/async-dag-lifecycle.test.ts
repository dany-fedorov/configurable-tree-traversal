import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { VisitorCallbackReturnValue } from '../src/core/graph/types';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { AsyncDagTraversalBuilder } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { DagTraversalRunnerState } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerState';
import type { TestGraph } from './helpers/graph-fixtures';
import {
  deferred,
  eventLoopTurn,
  graphAdapter,
} from './helpers/graph-fixtures';
import { createInternalAsyncDagTraversal } from './internal-runner-fixtures';

function twoBranches() {
  return graphAdapter({
    root: { children: ['A', 'B'], dependencies: [] },
    A: { children: [], dependencies: ['root'] },
    B: { children: [], dependencies: ['root'] },
  });
}

test('halts the requester between visitors without repeating the first visitor', async () => {
  const halt = deferred<void>();
  const calls: string[] = [];
  const traversal = new AsyncDagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter({
      root: { children: [], dependencies: [] },
    }),
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, async () => {
    calls.push('first');
    await halt.promise;
    return {
      commands: [
        { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
      ],
    };
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, async () => {
    calls.push('second');
  });
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const first = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: ['workCompletionCommitted'],
  });
  const halted = first.next();
  await eventLoopTurn();
  expect(calls).toEqual(['first']);

  halt.resolve();
  await expect(halted).resolves.toEqual({ done: true, value: undefined });
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  const resumed = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    { deliveredEventKinds: ['workCompletionCommitted'] },
  );
  await expect(resumed.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'root' } },
  });
  expect(calls).toEqual(['first', 'second']);
  await expect(resumed.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
});

test('delivers another started chain once while the requester halts', async () => {
  const haltA = deferred<void>();
  const finishB = deferred<void>();
  const calls: string[] = [];
  const traversal = new AsyncDagTraversalBuilder<TestGraph>({
    dagDiscoverySource: twoBranches(),
    maxConcurrentCallbackInvocations: 2,
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    async (vertex) => {
      const data = vertex.getVertexData();
      calls.push(`${data}:first`);
      if (data === 'A') {
        await haltA.promise;
        return {
          commands: [
            { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
          ],
        };
      }
      if (data === 'B') await finishB.promise;
      return undefined;
    },
  );
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    async (vertex) => {
      calls.push(`${vertex.getVertexData()}:second`);
    },
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: ['workCompletionCommitted'],
    });

  expect((await iterator.next()).value?.vertex.getVertexData()).toBe('root');
  const drainingEvent = iterator.next();
  await eventLoopTurn();
  expect(calls).toEqual(['root:first', 'root:second', 'A:first', 'B:first']);

  haltA.resolve();
  await eventLoopTurn();
  expect(calls.filter((call) => call === 'A:first')).toHaveLength(1);
  expect(calls).not.toContain('A:second');

  finishB.resolve();
  await expect(drainingEvent).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'B' } },
  });
  await expect(iterator.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
  expect(calls.filter((call) => call === 'B:second')).toHaveLength(1);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);

  const resumed = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    { deliveredEventKinds: ['workCompletionCommitted'] },
  );
  await expect(resumed.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'A' } },
  });
  expect(calls.filter((call) => call === 'A:first')).toHaveLength(1);
  expect(calls.filter((call) => call === 'A:second')).toHaveLength(1);
  await expect(resumed.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
});

test('loop close waits for a pending visitor and preserves its buffered event', async () => {
  const childVisit = deferred<void>();
  const started = deferred<void>();
  const traversal = new AsyncDagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter({
      root: { children: ['child'], dependencies: [] },
      child: { children: [], dependencies: ['root'] },
    }),
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    async (vertex) => {
      if (vertex.getVertexData() === 'child') {
        started.resolve();
        await childVisit.promise;
      }
    },
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: ['workCompletionCommitted'],
    });
  expect((await iterator.next()).value?.vertex.getVertexData()).toBe('root');
  const pending = iterator.next();
  await started.promise;

  let closed = false;
  const closing = iterator.return(undefined).then((result) => {
    closed = true;
    return result;
  });
  await eventLoopTurn();
  expect(closed).toBe(false);
  const competing =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await expect(competing.next()).rejects.toThrow('Another active iterator');

  childVisit.resolve();
  await expect(closing).resolves.toEqual({ done: true, value: undefined });
  await expect(pending).resolves.toEqual({ done: true, value: undefined });
  const resumed = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    { deliveredEventKinds: ['workCompletionCommitted'] },
  );
  await expect(resumed.next()).resolves.toMatchObject({
    done: false,
    value: {
      vertex: { $vertexData: 'child' },
      eventKind: 'workCompletionCommitted',
    },
  });
  await expect(resumed.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
});

test('a committed buffered event obeys the resumed delivery selector', async () => {
  const childVisit = deferred<void>();
  const started = deferred<void>();
  const traversal = new AsyncDagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter({
      root: { children: ['child'], dependencies: [] },
      child: { children: [], dependencies: ['root'] },
    }),
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    async (vertex) => {
      if (vertex.getVertexData() === 'child') {
        started.resolve();
        await childVisit.promise;
      }
    },
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const first = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: ['workCompletionCommitted'],
  });
  await first.next();
  const pending = first.next();
  await started.promise;
  const closing = first.return(undefined);

  childVisit.resolve();
  await expect(closing).resolves.toEqual({ done: true, value: undefined });
  await expect(pending).resolves.toEqual({ done: true, value: undefined });
  const changedFilters =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [],
    });
  await expect(changedFilters.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
});

test('repeated halts across iterators do not duplicate visitors or events', async () => {
  const rootHalt = deferred<void>();
  const childHalt = deferred<void>();
  const childStarted = deferred<void>();
  const calls: string[] = [];
  const traversal = new AsyncDagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter({
      root: { children: ['child'], dependencies: [] },
      child: { children: [], dependencies: ['root'] },
    }),
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    async (vertex) => {
      const data = vertex.getVertexData();
      calls.push(`${data}:halt`);
      if (data === 'root') await rootHalt.promise;
      else {
        childStarted.resolve();
        await childHalt.promise;
      }
      return {
        commands: [
          { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
        ],
      };
    },
  );
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    async (vertex) => {
      calls.push(`${vertex.getVertexData()}:after`);
    },
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const events: string[] = [];

  const first = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: ['workCompletionCommitted'],
  });
  const firstNext = first.next();
  await eventLoopTurn();
  expect(calls).toEqual(['root:halt']);
  rootHalt.resolve();
  await expect(firstNext).resolves.toEqual({ done: true, value: undefined });
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);

  const closingIterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: ['workCompletionCommitted'],
    });
  const rootEvent = await closingIterator.next();
  expect(rootEvent.done).toBe(false);
  events.push(rootEvent.value!.vertex.getVertexData());
  const childEvent = closingIterator.next();
  await childStarted.promise;
  let closed = false;
  const closing = closingIterator.return(undefined).then((result) => {
    closed = true;
    return result;
  });
  await eventLoopTurn();
  expect(closed).toBe(false);
  const competing =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: ['workCompletionCommitted'],
    });
  await expect(competing.next()).rejects.toThrow('Another active iterator');

  childHalt.resolve();
  await expect(closing).resolves.toEqual({ done: true, value: undefined });
  await expect(childEvent).resolves.toEqual({ done: true, value: undefined });
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);

  const resumed = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    { deliveredEventKinds: ['workCompletionCommitted'] },
  );
  const resumedEvent = await resumed.next();
  expect(resumedEvent.done).toBe(false);
  events.push(resumedEvent.value!.vertex.getVertexData());
  await expect(resumed.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });

  expect(calls).toEqual([
    'root:halt',
    'root:after',
    'child:halt',
    'child:after',
  ]);
  expect(events).toEqual(['root', 'child']);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
});

test('shared DAG objects retain one runner owner through halt and release at finish', async () => {
  const halt = deferred<void>();
  const state = new DagTraversalRunnerState<TestGraph>();
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const source = graphAdapter({
    root: { children: [], dependencies: [] },
  });
  const makeTraversal = () =>
    createInternalAsyncDagTraversal<TestGraph>({
      dagDiscoverySource: source,
      traversalRunnerInternalObjects: {
        state,
        resolvedGraphsContainer: container,
      },
    });
  const ownerTraversal = makeTraversal();
  ownerTraversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    async () => {
      await halt.promise;
      return {
        commands: [
          { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
        ],
      };
    },
  );
  const owner = ownerTraversal.createIndependentRunnerFromCurrentOptions();
  const competitor =
    makeTraversal().createIndependentRunnerFromCurrentOptions();
  const ownerIterator =
    owner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const ownerNext = ownerIterator.next();
  await eventLoopTurn();

  const competitorConfig =
    competitor.captureExecutionSnapshot().executionOptions;
  await expect(
    competitor
      .runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [],
      })
      .next(),
  ).rejects.toThrow(/another active runner/i);
  expect(competitor.captureExecutionSnapshot().executionOptions).toEqual(
    competitorConfig,
  );
  expect(owner.getTraversalLifecycleStatus()).toBe(Status.RUNNING);
  halt.resolve();
  await expect(ownerNext).resolves.toEqual({ done: true, value: undefined });
  expect(owner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  await expect(
    competitor.runAndIterateObservationEventsUntilSuspendedOrTerminal().next(),
  ).rejects.toThrow(/another active runner/i);

  await owner.runUntilSuspendedOrTerminal();
  expect(owner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
  await expect(
    makeTraversal()
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal(),
  ).resolves.toBeDefined();
});

test('close does not await a pending resolver and reuses its result on resume', async () => {
  const child = deferred<{
    kind: 'vertexResolved';
    resolvedVertexInput: {
      vertexId: string;
      workWaitsForWorkOf: string[];
      vertexContentInput: {
        $vertexData: string;
        $childDiscoveryHints: string[];
      };
    };
  }>();
  let resolutions = 0;
  const runner = new AsyncDagTraversalBuilder<TestGraph>({
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'root',
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['child'],
          },
        },
      }),
      resolveChildHint: () => {
        resolutions++;
        return child.promise;
      },
    },
  }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: ['workCompletionCommitted'],
    });
  await iterator.next();
  const pending = iterator.next();
  await eventLoopTurn();
  expect(resolutions).toBe(1);

  await expect(iterator.return(undefined)).resolves.toEqual({
    done: true,
    value: undefined,
  });
  await expect(pending).resolves.toEqual({ done: true, value: undefined });
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  child.resolve({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'child',
      workWaitsForWorkOf: ['root'],
      vertexContentInput: { $vertexData: 'child', $childDiscoveryHints: [] },
    },
  });
  await eventLoopTurn();

  const resumed = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    { deliveredEventKinds: ['workCompletionCommitted'] },
  );
  await expect(resumed.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'child' } },
  });
  expect(resolutions).toBe(1);
  await resumed.return(undefined);
});

test('cascade deletion invalidates running dependents and all late outcomes', async () => {
  const deleteA = deferred<void>();
  const bVisit =
    deferred<VisitorCallbackReturnValue<TestGraph, 'ON_WORK_READY', 'dag'>>();
  const cVisit =
    deferred<VisitorCallbackReturnValue<TestGraph, 'ON_WORK_READY', 'dag'>>();
  const started: string[] = [];
  const traversal = new AsyncDagTraversalBuilder<TestGraph>({
    dagDiscoverySource: graphAdapter({
      root: { children: ['A', 'B', 'C'], dependencies: [] },
      A: { children: [], dependencies: ['root'] },
      B: { children: [], dependencies: ['A'] },
      C: { children: [], dependencies: ['A'] },
    }),
    maxConcurrentCallbackInvocations: 3,
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    async (vertex) => {
      const data = vertex.getVertexData();
      if (data === 'B' || data === 'C') started.push(data);
      if (data === 'B') return bVisit.promise;
      if (data === 'C') return cVisit.promise;
      return undefined;
    },
  );
  traversal.registerVisitorCallbackForPhase(
    Order.ON_SUBGRAPH_COMPLETION_READY,
    async (vertex) => {
      if (vertex.getVertexData() !== 'A') return undefined;
      await deleteA.promise;
      return {
        commands: [
          {
            commandName:
              Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
          },
        ],
      };
    },
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const events: string[] = [];
  const running = (async () => {
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
      events.push(`${event.eventKind}:${event.vertex.getVertexData()}`);
    }
  })();
  await eventLoopTurn();
  await eventLoopTurn();
  expect(started).toEqual(['B', 'C']);

  deleteA.resolve();
  await running;
  const beforeLate = runner
    .getLiveResolvedGraphView()
    .getVertexHandles()
    .map((ref) => ref.getCurrentVertexView().getVertexData());
  expect(beforeLate).toEqual(['root']);
  const eventsBeforeLate = events.slice();
  expect(eventsBeforeLate).not.toContain('workCompletionCommitted:B');
  expect(eventsBeforeLate).not.toContain('workCompletionCommitted:C');

  bVisit.resolve({
    commands: [
      {
        commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
        commandArguments: { replacementVertexData: 'late mutation' },
      },
    ],
  });
  const lateFailure = new Error('late invalid failure');
  cVisit.reject(lateFailure);
  await eventLoopTurn();
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
  await expect(runner.runUntilSuspendedOrTerminal()).resolves.toBe(runner);
  expect(events).toEqual(eventsBeforeLate);
  expect(
    runner
      .getLiveResolvedGraphView()
      .getVertexHandles()
      .map((ref) => ref.getCurrentVertexView().getVertexData()),
  ).toEqual(beforeLate);
});

test('retains the first live failure and ignores later sibling settlement', async () => {
  const failure = new Error('first live failure');
  const aVisit =
    deferred<VisitorCallbackReturnValue<TestGraph, 'ON_WORK_READY', 'dag'>>();
  const bVisit =
    deferred<VisitorCallbackReturnValue<TestGraph, 'ON_WORK_READY', 'dag'>>();
  const traversal = new AsyncDagTraversalBuilder<TestGraph>({
    dagDiscoverySource: twoBranches(),
    maxConcurrentCallbackInvocations: 2,
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
    if (vertex.getVertexData() === 'A') return aVisit.promise;
    if (vertex.getVertexData() === 'B') return bVisit.promise;
    return undefined;
  });
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  });
  await eventLoopTurn();
  await eventLoopTurn();

  aVisit.reject(failure);
  await expect(running).rejects.toBe(failure);
  const beforeLate = runner
    .getLiveResolvedGraphView()
    .getVertexHandles()
    .map((ref) => ref.getCurrentVertexView().getVertexData());
  bVisit.resolve({
    commands: [
      {
        commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
        commandArguments: { replacementVertexData: 'late mutation' },
      },
    ],
  });
  await eventLoopTurn();

  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
  await expect(runner.runUntilSuspendedOrTerminal()).rejects.toBe(failure);
  expect(
    runner
      .getLiveResolvedGraphView()
      .getVertexHandles()
      .map((ref) => ref.getCurrentVertexView().getVertexData()),
  ).toEqual(beforeLate);
});

test('consumer error escapes while a draining traversal failure is retained', async () => {
  const finishA = deferred<void>();
  const bVisit = deferred<void>();
  const bStarted = deferred<void>();
  const failure = new Error('draining traversal failure');
  const consumerError = new Error('consumer failure');
  const traversal = new AsyncDagTraversalBuilder<TestGraph>({
    dagDiscoverySource: twoBranches(),
    maxConcurrentCallbackInvocations: 2,
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    async (vertex) => {
      if (vertex.getVertexData() === 'A') await finishA.promise;
      if (vertex.getVertexData() === 'B') {
        bStarted.resolve();
        await bVisit.promise;
      }
    },
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  let caught: unknown;
  const consuming = (async () => {
    try {
      for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
        {
          deliveredEventKinds: ['workCompletionCommitted'],
        },
      )) {
        if (event.vertex.getVertexData() === 'A') throw consumerError;
      }
    } catch (error) {
      caught = error;
    }
  })();
  await bStarted.promise;
  finishA.resolve();
  await eventLoopTurn();
  expect(caught).toBeUndefined();

  bVisit.reject(failure);
  await consuming;
  expect(caught).toBe(consumerError);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
  await expect(runner.runUntilSuspendedOrTerminal()).rejects.toBe(failure);
});

test('inspection is detached and inert during pending, halting, and failed work', async () => {
  const pendingVisit = deferred<void>();
  const started = deferred<void>();
  const failure = new Error('inspection failure');
  let sourceCalls = 0;
  const traversal = new AsyncDagTraversalBuilder<TestGraph>({
    dagDiscoverySource: {
      resolveRootVertex: () => {
        sourceCalls++;
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: [],
            },
          },
        };
      },
      resolveChildHint: () => ({
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted' as const,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
      }),
    },
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, async () => {
    started.resolve();
    await pendingVisit.promise;
    throw failure;
  });
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const initial = runner.captureExecutionSnapshot();
  expect(sourceCalls).toBe(0);
  expect(Object.isFrozen(initial)).toBe(true);
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const next = iterator.next();
  await started.promise;

  const pending = runner.captureExecutionSnapshot();
  expect(pending.inFlightInvocationCount).toBe(1);
  const closing = iterator.return(undefined);
  const halting = runner.captureExecutionSnapshot();
  expect(halting.inFlightInvocationCount).toBe(1);
  expect(sourceCalls).toBe(1);
  expect(pending).not.toBe(halting);

  pendingVisit.resolve();
  await expect(closing).rejects.toBe(failure);
  await expect(next).rejects.toBe(failure);
  const failed = runner.captureExecutionSnapshot();
  expect(failed.traversalLifecycleStatus).toBe(Status.FAILED);
  expect(failed.inFlightInvocationCount).toBe(0);
  expect(sourceCalls).toBe(1);
  await expect(runner.runUntilSuspendedOrTerminal()).rejects.toBe(failure);
});

test('retains undefined as the exact traversal failure sentinel', async () => {
  const root = deferred<{
    kind: 'vertexIntentionallyOmitted';
    omittedVertexIdentity: null;
    satisfiesWorkAndSubgraphCompletionPrerequisites: true;
  }>();
  const runner = new AsyncDagTraversalBuilder<TestGraph>({
    dagDiscoverySource: {
      resolveRootVertex: () => root.promise,
      resolveChildHint: () => ({
        omittedVertexIdentity: null,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  await eventLoopTurn();
  root.reject(undefined);

  let caught = false;
  try {
    await running;
  } catch (error) {
    caught = true;
    expect(error).toBeUndefined();
  }
  expect(caught).toBe(true);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
});
