import {
  AsyncBreadthFirstTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTraversal,
  BreadthFirstTraversal,
  BreadthFirstTraversalOrder as BFS,
  DagTraversal,
  DagTraversalOrder as DAG,
  DepthFirstTraversal,
  DepthFirstTraversalOrder as DFS,
  TraversalRunnerStatus as Status,
  type TraversalExecutionState,
  type TreeTypeParameters,
} from '../src';
import {
  deferred,
  eventLoopTurn,
  graphAdapter,
} from './helpers/graph-fixtures';

type Tree = TreeTypeParameters<string, string>;
function source(calls: string[]) {
  return {
    makeRoot: () => {
      calls.push('root');
      return {
        kind: 'found' as const,
        vertex: { vertexContent: { $data: 'root', $childHints: ['child'] } },
      };
    },
    makeVertex: (hint: string) => {
      calls.push(hint);
      return {
        kind: 'found' as const,
        vertex: { vertexContent: { $data: hint, $childHints: [] } },
      };
    },
  };
}
const syncFamilies = [
  {
    name: 'DFS',
    make: (tree: ReturnType<typeof source>, visit: () => void) =>
      new DepthFirstTraversal<Tree>({ traversableTree: tree })
        .addVisitorFor(DFS.PRE_ORDER, visit)
        .makeRunner(),
  },
  {
    name: 'BFS',
    make: (tree: ReturnType<typeof source>, visit: () => void) =>
      new BreadthFirstTraversal<Tree>({ traversableTree: tree })
        .addVisitorFor(BFS.LEVEL_ORDER, visit)
        .makeRunner(),
  },
  {
    name: 'DAG tree',
    make: (tree: ReturnType<typeof source>, visit: () => void) =>
      new DagTraversal<Tree>({ traversableTree: tree })
        .addVisitorFor(DAG.ON_READY, visit)
        .makeRunner(),
  },
  {
    name: 'DAG graph',
    make: (tree: ReturnType<typeof source>, visit: () => void) =>
      new DagTraversal<Tree>({ traversableGraph: tree })
        .addVisitorFor(DAG.ON_READY, visit)
        .makeRunner(),
  },
];
const asyncFamilies = [
  {
    name: 'DFS',
    make: (tree: ReturnType<typeof source>, visit: () => Promise<void>) =>
      new AsyncDepthFirstTraversal<Tree>({ traversableTree: tree })
        .addVisitorFor(DFS.PRE_ORDER, visit)
        .makeRunner(),
  },
  {
    name: 'BFS',
    make: (tree: ReturnType<typeof source>, visit: () => Promise<void>) =>
      new AsyncBreadthFirstTraversal<Tree>({ traversableTree: tree })
        .addVisitorFor(BFS.LEVEL_ORDER, visit)
        .makeRunner(),
  },
  {
    name: 'DAG tree',
    make: (tree: ReturnType<typeof source>, visit: () => Promise<void>) =>
      new AsyncDagTraversal<Tree>({ traversableTree: tree })
        .addVisitorFor(DAG.ON_READY, visit)
        .makeRunner(),
  },
  {
    name: 'DAG graph',
    make: (tree: ReturnType<typeof source>, visit: () => Promise<void>) =>
      new AsyncDagTraversal<Tree>({ traversableGraph: tree })
        .addVisitorFor(DAG.ON_READY, visit)
        .makeRunner(),
  },
];

describe.each(syncFamilies)('$name sync execution', ({ make }) => {
  test('requests pause from a callback without admitting another source, then resumes once', () => {
    const sources: string[] = [];
    let visits = 0;
    const runner = make(source(sources), () => {
      if (++visits === 1) {
        expect(runner.requestPause()).toBe(true);
        expect(runner.requestPause()).toBe(false);
        expect(runner.getStatus()).toBe(Status.RUNNING);
      }
    });
    const state: TraversalExecutionState = runner;
    expect(state.requestPause()).toBe(false);
    expect(sources).toEqual([]);
    expect(runner.run()).toBe(runner);
    expect(state.isHalted()).toBe(true);
    expect(state.getStopReason()).toBe('paused');
    expect(state.inspect().haltRequested).toBe(true);
    expect(state.requestPause()).toBe(false);
    expect(sources).toEqual(['root']);
    runner.run();
    expect(sources).toEqual(['root', 'child']);
    expect(visits).toBe(2);
    expect(state.getStatus()).toBe(Status.FINISHED);
    expect(state.requestPause()).toBe(false);
  });

  test('does not throw a retained exact failure or take the iterator lease', () => {
    const error = { failed: true };
    const runner = make(source([]), () => {
      throw error;
    });
    const owner = runner.getIterable();
    expect(() => owner.next()).toThrow();
    expect(runner.getStatus()).toBe(Status.FAILED);
    expect(runner.requestPause()).toBe(false);
    try {
      runner.run();
      throw new Error('Expected retained failure');
    } catch (actual) {
      expect(actual).toBe(error);
    }
  });

  test('a suspended iterator retains ownership until the pause boundary is driven', () => {
    const runner = make(source([]), () => undefined);
    const owner = runner.getIterable();
    expect(owner.next().done).toBe(false);
    expect(runner.requestPause()).toBe(true);
    expect(() => runner.getIterable().next()).toThrow(/active iterator/);
    expect(owner.next().done).toBe(true);
    expect(runner.isHalted()).toBe(true);
    runner.run();
    expect(runner.getStatus()).toBe(Status.FINISHED);
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
    expect(runner.requestPause()).toBe(false);
    expect(sources).toEqual([]);
    const running = runner.run();
    await entered.promise;
    expect(runner.requestPause()).toBe(true);
    expect(runner.requestPause()).toBe(false);
    expect(runner.getStatus()).toBe(Status.RUNNING);
    await expect(runner.run()).rejects.toThrow(/active iterator/);
    await eventLoopTurn();
    expect(sources).toEqual(['root']);
    expect(runner.getStatus()).toBe(Status.RUNNING);
    finish.resolve();
    await expect(running).resolves.toBe(runner);
    expect(runner.isHalted()).toBe(true);
    expect(runner.getStopReason()).toBe('paused');
    expect(runner.requestPause()).toBe(false);
    expect(sources).toEqual(['root']);
    await runner.run();
    expect(visits).toBe(2);
    expect(sources).toEqual(['root', 'child']);
    expect(runner.getStatus()).toBe(Status.FINISHED);
    expect(runner.requestPause()).toBe(false);
  });

  test('requests pause from a callback and retains committed iterator events across resume', async () => {
    let visits = 0;
    const runner = make(source([]), async () => {
      if (++visits === 1) expect(runner.requestPause()).toBe(true);
    });
    const events: string[] = [];
    for await (const event of runner.getIterable())
      events.push(event.vertex.getData());
    expect(runner.isHalted()).toBe(true);
    for await (const event of runner.getIterable())
      events.push(event.vertex.getData());
    // Each family may emit additional completion phases; work events are never lost.
    expect(events).toContain('root');
    expect(events).toContain('child');
    expect(visits).toBe(2);
    expect(runner.getStatus()).toBe(Status.FINISHED);
  });

  test('a pause does not mask an exact failure from its draining callback', async () => {
    const entered = deferred<void>();
    const finish = deferred<void>();
    const runner = make(source([]), async () => {
      entered.resolve();
      await finish.promise;
      throw undefined;
    });
    const running = runner.run();
    await entered.promise;
    expect(runner.requestPause()).toBe(true);
    finish.resolve();
    await expect(running).rejects.toBeUndefined();
    expect(runner.requestPause()).toBe(false);
    expect(runner.getStopReason()).toBe('failed');
    await expect(runner.run()).rejects.toBeUndefined();
  });
});

test('async pause drains admitted chains and retains undelivered events for the next owner', async () => {
  const startedA = deferred<void>();
  const startedB = deferred<void>();
  const finishA = deferred<void>();
  const finishB = deferred<void>();
  const visits: string[] = [];
  const traversal = new AsyncDagTraversal<Tree>({
    concurrency: 2,
    traversableGraph: graphAdapter({
      root: { children: ['A', 'B'], dependencies: [] },
      A: { children: [], dependencies: ['root'] },
      B: { children: [], dependencies: ['root'] },
    }),
  });
  traversal.addVisitorFor(DAG.ON_READY, async (vertex) => {
    const id = vertex.getData();
    visits.push(`${id}:first`);
    if (id === 'A') {
      startedA.resolve();
      await finishA.promise;
    }
    if (id === 'B') {
      startedB.resolve();
      await finishB.promise;
    }
  });
  traversal.addVisitorFor(DAG.ON_READY, (vertex) => {
    visits.push(`${vertex.getData()}:second`);
  });
  const runner = traversal.makeRunner();
  const owner = runner.getIterable({ emitPhases: [DAG.ON_READY] });
  expect((await owner.next()).value?.vertex.getData()).toBe('root');
  const pending = owner.next();
  await Promise.all([startedA.promise, startedB.promise]);
  expect(runner.requestPause()).toBe(true);
  await expect(runner.getIterable().next()).rejects.toThrow(/active iterator/);
  finishA.resolve();
  expect((await pending).value?.vertex.getData()).toBe('A');
  expect(runner.getStatus()).toBe(Status.RUNNING);
  finishB.resolve();
  await eventLoopTurn();
  expect(runner.getStatus()).toBe(Status.HALTED);
  expect(runner.inspect().bufferedEventCount).toBe(1);
  expect(visits).toEqual([
    'root:first',
    'root:second',
    'A:first',
    'B:first',
    'A:second',
    'B:second',
  ]);
  expect((await owner.next()).done).toBe(true);
  // Changing filters must not discard an event already committed while draining.
  const resumed = runner.getIterable({ emitPhases: [] });
  expect((await resumed.next()).value?.vertex.getData()).toBe('B');
  expect((await resumed.next()).done).toBe(true);
  expect(visits).toHaveLength(6);
  expect(runner.getStatus()).toBe(Status.FINISHED);
});
