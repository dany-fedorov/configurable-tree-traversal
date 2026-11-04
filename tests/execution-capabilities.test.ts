import * as publicApi from '../src';
import * as publicCore from '../src/core';
import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  BreadthFirstTreeVisitPhase as BFS,
  DagTraversalBuilder,
  DagVisitorPhase as DAG,
  DepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase as DFS,
  TraversalRunnerStatus as Status,
  type TraversalExecutionState,
  type VertexDataAndChildHintTypes,
} from '../src';
import {
  deferred,
  eventLoopTurn,
  graphAdapter,
} from './helpers/graph-fixtures';

type Tree = VertexDataAndChildHintTypes<string, string>;
function source(calls: string[]) {
  return {
    resolveRootVertex: () => {
      calls.push('root');
      return {
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['child'],
          },
        },
      };
    },
    resolveChildVertexFromHint: (hint: string) => {
      calls.push(hint);
      return {
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
        },
      };
    },
  };
}
const syncFamilies = [
  {
    name: 'DFS',
    make: (tree: ReturnType<typeof source>, visit: () => void) =>
      new DepthFirstTreeTraversalBuilder<Tree>({ treeDiscoverySource: tree })
        .registerVisitorForPhase(DFS.BEFORE_CHILD_EXPANSION, visit)
        .createIndependentRunnerFromCurrentOptions(),
  },
  {
    name: 'BFS',
    make: (tree: ReturnType<typeof source>, visit: () => void) =>
      new BreadthFirstTreeTraversalBuilder<Tree>({ treeDiscoverySource: tree })
        .registerVisitorForPhase(BFS.AT_LEVEL_ORDER_VERTEX, visit)
        .createIndependentRunnerFromCurrentOptions(),
  },
  {
    name: 'DAG tree',
    make: (tree: ReturnType<typeof source>, visit: () => void) =>
      new DagTraversalBuilder<Tree>({ treeDiscoverySource: tree })
        .registerVisitorForPhase(DAG.ON_WORK_READY, visit)
        .createIndependentRunnerFromCurrentOptions(),
  },
  {
    name: 'DAG graph',
    make: (tree: ReturnType<typeof source>, visit: () => void) =>
      new DagTraversalBuilder<Tree>({
        dagDiscoverySource: {
          resolveRootVertex: () => tree.resolveRootVertex(),
          resolveChildVertexFromHint: (hint) => tree.resolveChildVertexFromHint(hint),
        },
      })
        .registerVisitorForPhase(DAG.ON_WORK_READY, visit)
        .createIndependentRunnerFromCurrentOptions(),
  },
];
const asyncFamilies = [
  {
    name: 'DFS',
    make: (tree: ReturnType<typeof source>, visit: () => Promise<void>) =>
      new AsyncDepthFirstTreeTraversalBuilder<Tree>({
        treeDiscoverySource: tree,
      })
        .registerVisitorForPhase(DFS.BEFORE_CHILD_EXPANSION, visit)
        .createIndependentRunnerFromCurrentOptions(),
  },
  {
    name: 'BFS',
    make: (tree: ReturnType<typeof source>, visit: () => Promise<void>) =>
      new AsyncBreadthFirstTreeTraversalBuilder<Tree>({
        treeDiscoverySource: tree,
      })
        .registerVisitorForPhase(BFS.AT_LEVEL_ORDER_VERTEX, visit)
        .createIndependentRunnerFromCurrentOptions(),
  },
  {
    name: 'DAG tree',
    make: (tree: ReturnType<typeof source>, visit: () => Promise<void>) =>
      new AsyncDagTraversalBuilder<Tree>({ treeDiscoverySource: tree })
        .registerVisitorForPhase(DAG.ON_WORK_READY, visit)
        .createIndependentRunnerFromCurrentOptions(),
  },
  {
    name: 'DAG graph',
    make: (tree: ReturnType<typeof source>, visit: () => Promise<void>) =>
      new AsyncDagTraversalBuilder<Tree>({
        dagDiscoverySource: {
          resolveRootVertex: () => tree.resolveRootVertex(),
          resolveChildVertexFromHint: (hint) => tree.resolveChildVertexFromHint(hint),
        },
      })
        .registerVisitorForPhase(DAG.ON_WORK_READY, visit)
        .createIndependentRunnerFromCurrentOptions(),
  },
];

describe.each(syncFamilies)('$name sync execution', ({ make }) => {
  test('requests pause from a callback without admitting another source, then resumes once', () => {
    const sources: string[] = [];
    let visits = 0;
    const runner = make(source(sources), () => {
      if (++visits === 1) {
        expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
        expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
        expect(runner.getTraversalLifecycleStatus()).toBe(Status.RUNNING);
      }
    });
    const state: TraversalExecutionState = runner;
    expect(state.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
    expect(sources).toEqual([]);
    expect(runner.runUntilSuspendedOrTerminal()).toBe(runner);
    expect(state.isSuspended()).toBe(true);
    expect(state.getTraversalStopReason()).toBe('paused');
    expect(state.captureExecutionSnapshot().pauseRequested).toBe(true);
    expect(state.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
    expect(sources).toEqual(['root']);
    runner.runUntilSuspendedOrTerminal();
    expect(sources).toEqual(['root', 'child']);
    expect(visits).toBe(2);
    expect(state.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    expect(state.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
  });

  test('does not throw a retained exact failure or take the iterator lease', () => {
    const error = { failed: true };
    const runner = make(source([]), () => {
      throw error;
    });
    const owner =
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
    expect(() => owner.next()).toThrow();
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
    try {
      runner.runUntilSuspendedOrTerminal();
      throw new Error('Expected retained failure');
    } catch (actual) {
      expect(actual).toBe(error);
    }
  });

  test('a suspended iterator retains ownership until the pause boundary is driven', () => {
    const runner = make(source([]), () => undefined);
    const owner =
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
    expect(owner.next().done).toBe(false);
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
    expect(() =>
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal().next(),
    ).toThrow(/active iterator/);
    expect(owner.next().done).toBe(true);
    expect(runner.isSuspended()).toBe(true);
    runner.runUntilSuspendedOrTerminal();
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
  });
});

describe.each(asyncFamilies)('$name async execution', ({ make }) => {
  test('wakes a running owner, safely drains its pending callback and resumes once', async () => {
    const sources: string[] = [];
    const entered = deferred<void>();
    const finish = deferred<void>();
    let visits = 0;
    const runner = make(source(sources), async () => {
      if (++visits === 1) {
        entered.resolve();
        await finish.promise;
      }
    });
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
    expect(sources).toEqual([]);
    const running = runner.runUntilSuspendedOrTerminal();
    await entered.promise;
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.RUNNING);
    await expect(runner.runUntilSuspendedOrTerminal()).rejects.toThrow(
      /active iterator/,
    );
    await eventLoopTurn();
    expect(sources).toEqual(['root']);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.RUNNING);
    finish.resolve();
    await expect(running).resolves.toBe(runner);
    expect(runner.isSuspended()).toBe(true);
    expect(runner.getTraversalStopReason()).toBe('paused');
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
    expect(sources).toEqual(['root']);
    await runner.runUntilSuspendedOrTerminal();
    expect(visits).toBe(2);
    expect(sources).toEqual(['root', 'child']);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
  });

  test('requests pause from a callback and retains committed iterator events across resume', async () => {
    let visits = 0;
    const runner = make(source([]), async () => {
      if (++visits === 1)
        expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
    });
    const events: string[] = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      events.push(event.vertex.getVertexData());
    expect(runner.isSuspended()).toBe(true);
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      events.push(event.vertex.getVertexData());
    // Each family may emit additional completion phases; work events are never lost.
    expect(events).toContain('root');
    expect(events).toContain('child');
    expect(visits).toBe(2);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
  });

  test('a pause does not mask an exact failure from its draining callback', async () => {
    const entered = deferred<void>();
    const finish = deferred<void>();
    const runner = make(source([]), async () => {
      entered.resolve();
      await finish.promise;
      throw undefined;
    });
    const running = runner.runUntilSuspendedOrTerminal();
    await entered.promise;
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
    finish.resolve();
    await expect(running).rejects.toBeUndefined();
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
    expect(runner.getTraversalStopReason()).toBe('failed');
    await expect(runner.runUntilSuspendedOrTerminal()).rejects.toBeUndefined();
  });
});

test('async pause drains admitted chains and retains undelivered events for the next owner', async () => {
  const startedA = deferred<void>();
  const startedB = deferred<void>();
  const finishA = deferred<void>();
  const finishB = deferred<void>();
  const visits: string[] = [];
  const traversal = new AsyncDagTraversalBuilder<Tree>({
    maxConcurrentCallbackInvocations: 2,
    dagDiscoverySource: graphAdapter({
      root: { children: ['A', 'B'], dependencies: [] },
      A: { children: [], dependencies: ['root'] },
      B: { children: [], dependencies: ['root'] },
    }),
  });
  traversal.registerVisitorForPhase(
    DAG.ON_WORK_READY,
    async (vertex) => {
      const id = vertex.getVertexData();
      visits.push(`${id}:first`);
      if (id === 'A') {
        startedA.resolve();
        await finishA.promise;
      }
      if (id === 'B') {
        startedB.resolve();
        await finishB.promise;
      }
    },
  );
  traversal.registerVisitorForPhase(DAG.ON_WORK_READY, (vertex) => {
    visits.push(`${vertex.getVertexData()}:second`);
  });
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const owner = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: ['workCompletionCommitted'],
  });
  expect((await owner.next()).value?.vertex.getVertexData()).toBe('root');
  const pending = owner.next();
  await Promise.all([startedA.promise, startedB.promise]);
  expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
  await expect(
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal().next(),
  ).rejects.toThrow(/active iterator/);
  finishA.resolve();
  expect((await pending).value?.vertex.getVertexData()).toBe('A');
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.RUNNING);
  finishB.resolve();
  await eventLoopTurn();
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  expect(runner.captureExecutionSnapshot().bufferedDeliveryEventCount).toBe(1);
  expect(visits).toEqual([
    'root:first',
    'root:second',
    'A:first',
    'B:first',
    'A:second',
    'B:second',
  ]);
  expect((await owner.next()).done).toBe(true);
  // Buffered observations use the resumed selector without replaying committed work.
  const resumed = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    { deliveredEventKinds: [] },
  );
  expect((await resumed.next()).done).toBe(true);
  expect(visits).toHaveLength(6);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
});

const queuedSourceFamilies = [
  { name: 'DFS', TreeTraversal: AsyncDepthFirstTreeTraversalBuilder<Tree> },
  { name: 'BFS', TreeTraversal: AsyncBreadthFirstTreeTraversalBuilder<Tree> },
  { name: 'DAG tree', TreeTraversal: AsyncDagTraversalBuilder<Tree> },
  { name: 'DAG graph', TreeTraversal: AsyncDagTraversalBuilder<Tree> },
];

test.each(queuedSourceFamilies)(
  '$name stops queued source admission when a callback pauses within a scheduler batch',
  async ({ name, TreeTraversal }) => {
    const found = (data: string, hints: string[] = []) => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexContentInput: { $vertexData: data, $childDiscoveryHints: hints },
      },
    });
    const finishA = deferred<ReturnType<typeof found>>();
    const finishB = deferred<ReturnType<typeof found>>();
    const sources: string[] = [];
    const requests: boolean[] = [];
    const tree = {
      resolveRootVertex: () => found('root', ['A', 'B', 'C', 'D', 'E']),
      resolveChildVertexFromHint: (hint: string) => {
        sources.push(hint);
        if (hint === 'A') return finishA.promise;
        if (hint === 'B') return finishB.promise;
        if (hint === 'C')
          requests.push(runner.requestPauseAfterAdmittedCallbacksDrain());
        return found(hint);
      },
    };
    const runner =
      name === 'DAG graph'
        ? new AsyncDagTraversalBuilder<Tree>({
            maxConcurrentCallbackInvocations: 2,
            dagDiscoverySource: {
              resolveRootVertex: () => tree.resolveRootVertex(),
              resolveChildVertexFromHint: (hint) => tree.resolveChildVertexFromHint(hint),
            },
          }).createIndependentRunnerFromCurrentOptions()
        : new TreeTraversal({
            maxConcurrentCallbackInvocations: 2,
            treeDiscoverySource: tree,
          }).createIndependentRunnerFromCurrentOptions();
    const running = runner.runUntilSuspendedOrTerminal();
    await eventLoopTurn();
    expect(sources).toEqual(['A', 'B']);
    // Free both slots together so C and D would share an admission batch.
    finishA.resolve(found('A'));
    finishB.resolve(found('B'));
    await running;
    expect(requests).toEqual([true]);
    expect(sources).toEqual(['A', 'B', 'C']);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
    expect(runner.getTraversalStopReason()).toBe('paused');
    await runner.runUntilSuspendedOrTerminal();
    expect(sources).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(requests).toEqual([true]);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
  },
);

test('public namespaces omit retired empty runtime bases', () => {
  for (const name of [
    'TreeTraversal',
    'TreeTraversalRunner',
    'TreeTraversalIterable',
    'AbstractTreeSource',
  ]) {
    expect(publicApi).not.toHaveProperty(name);
    expect(publicCore).not.toHaveProperty(name);
  }
});
