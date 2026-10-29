import * as publicApi from '../src';
import * as publicCore from '../src/core';
import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  BreadthFirstPhase as BFS,
  DagTraversal,
  DagVisitorPhase as DAG,
  DepthFirstTreeTraversal,
  DepthFirstPhase as DFS,
  TraversalRunnerStatus as Status,
  type TraversalExecutionState,
  type VertexTypes,
} from '../src';
import {
  deferred,
  eventLoopTurn,
  graphAdapter,
} from './helpers/graph-fixtures';

type Tree = VertexTypes<string, string>;
function source(calls: string[]) {
  return {
    resolveRoot: () => {
      calls.push('root');
      return {
        kind: 'found' as const,
        vertex: { vertexContent: { $data: 'root', $childHints: ['child'] } },
      };
    },
    resolveChild: (hint: string) => {
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
      new DepthFirstTreeTraversal<Tree>({ traversableTree: tree })
        .addVisitorFor(DFS.PRE_ORDER, visit)
        .createRunner(),
  },
  {
    name: 'BFS',
    make: (tree: ReturnType<typeof source>, visit: () => void) =>
      new BreadthFirstTreeTraversal<Tree>({ traversableTree: tree })
        .addVisitorFor(BFS.LEVEL_ORDER, visit)
        .createRunner(),
  },
  {
    name: 'DAG tree',
    make: (tree: ReturnType<typeof source>, visit: () => void) =>
      new DagTraversal<Tree>({ traversableTree: tree })
        .addVisitorFor(DAG.ON_WORK_READY, visit)
        .createRunner(),
  },
  {
    name: 'DAG graph',
    make: (tree: ReturnType<typeof source>, visit: () => void) =>
      new DagTraversal<Tree>({ traversableGraph: tree })
        .addVisitorFor(DAG.ON_WORK_READY, visit)
        .createRunner(),
  },
];
const asyncFamilies = [
  {
    name: 'DFS',
    make: (tree: ReturnType<typeof source>, visit: () => Promise<void>) =>
      new AsyncDepthFirstTreeTraversal<Tree>({ traversableTree: tree })
        .addVisitorFor(DFS.PRE_ORDER, visit)
        .createRunner(),
  },
  {
    name: 'BFS',
    make: (tree: ReturnType<typeof source>, visit: () => Promise<void>) =>
      new AsyncBreadthFirstTreeTraversal<Tree>({ traversableTree: tree })
        .addVisitorFor(BFS.LEVEL_ORDER, visit)
        .createRunner(),
  },
  {
    name: 'DAG tree',
    make: (tree: ReturnType<typeof source>, visit: () => Promise<void>) =>
      new AsyncDagTraversal<Tree>({ traversableTree: tree })
        .addVisitorFor(DAG.ON_WORK_READY, visit)
        .createRunner(),
  },
  {
    name: 'DAG graph',
    make: (tree: ReturnType<typeof source>, visit: () => Promise<void>) =>
      new AsyncDagTraversal<Tree>({ traversableGraph: tree })
        .addVisitorFor(DAG.ON_WORK_READY, visit)
        .createRunner(),
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
    expect(state.inspect().pauseRequested).toBe(true);
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
    const owner = runner.iterateEvents();
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
    const owner = runner.iterateEvents();
    expect(owner.next().done).toBe(false);
    expect(runner.requestPause()).toBe(true);
    expect(() => runner.iterateEvents().next()).toThrow(/active iterator/);
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
    for await (const event of runner.iterateEvents())
      events.push(event.vertex.getData());
    expect(runner.isHalted()).toBe(true);
    for await (const event of runner.iterateEvents())
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
  traversal.addVisitorFor(DAG.ON_WORK_READY, async (vertex) => {
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
  traversal.addVisitorFor(DAG.ON_WORK_READY, (vertex) => {
    visits.push(`${vertex.getData()}:second`);
  });
  const runner = traversal.createRunner();
  const owner = runner.iterateEvents({ emitEvents: ['workCompleted'] });
  expect((await owner.next()).value?.vertex.getData()).toBe('root');
  const pending = owner.next();
  await Promise.all([startedA.promise, startedB.promise]);
  expect(runner.requestPause()).toBe(true);
  await expect(runner.iterateEvents().next()).rejects.toThrow(
    /active iterator/,
  );
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
  // Buffered observations use the resumed selector without replaying committed work.
  const resumed = runner.iterateEvents({ emitEvents: [] });
  expect((await resumed.next()).done).toBe(true);
  expect(visits).toHaveLength(6);
  expect(runner.getStatus()).toBe(Status.FINISHED);
});

const queuedSourceFamilies = [
  { name: 'DFS', TreeTraversal: AsyncDepthFirstTreeTraversal<Tree> },
  { name: 'BFS', TreeTraversal: AsyncBreadthFirstTreeTraversal<Tree> },
  { name: 'DAG tree', TreeTraversal: AsyncDagTraversal<Tree> },
  { name: 'DAG graph', TreeTraversal: AsyncDagTraversal<Tree> },
];

test.each(queuedSourceFamilies)(
  '$name stops queued source admission when a callback pauses within a scheduler batch',
  async ({ name, TreeTraversal }) => {
    const found = (data: string, hints: string[] = []) => ({
      kind: 'found' as const,
      vertex: { vertexContent: { $data: data, $childHints: hints } },
    });
    const finishA = deferred<ReturnType<typeof found>>();
    const finishB = deferred<ReturnType<typeof found>>();
    const sources: string[] = [];
    const requests: boolean[] = [];
    const tree = {
      resolveRoot: () => found('root', ['A', 'B', 'C', 'D', 'E']),
      resolveChild: (hint: string) => {
        sources.push(hint);
        if (hint === 'A') return finishA.promise;
        if (hint === 'B') return finishB.promise;
        if (hint === 'C') requests.push(runner.requestPause());
        return found(hint);
      },
    };
    const runner =
      name === 'DAG graph'
        ? new AsyncDagTraversal<Tree>({
            concurrency: 2,
            traversableGraph: tree,
          }).createRunner()
        : new TreeTraversal({
            concurrency: 2,
            traversableTree: tree,
          }).createRunner();
    const running = runner.run();
    await eventLoopTurn();
    expect(sources).toEqual(['A', 'B']);
    // Free both slots together so C and D would share an admission batch.
    finishA.resolve(found('A'));
    finishB.resolve(found('B'));
    await running;
    expect(requests).toEqual([true]);
    expect(sources).toEqual(['A', 'B', 'C']);
    expect(runner.getStatus()).toBe(Status.HALTED);
    expect(runner.getStopReason()).toBe('paused');
    await runner.run();
    expect(sources).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(requests).toEqual([true]);
    expect(runner.getStatus()).toBe(Status.FINISHED);
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
