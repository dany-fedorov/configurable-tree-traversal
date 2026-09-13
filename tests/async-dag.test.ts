import type { TestGraph } from './helpers/graph-fixtures';
import {
  deferred,
  diamond,
  eventLoopTurn,
  graphAdapter,
} from './helpers/graph-fixtures';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { CTTRef } from '../src/core/CTTRef';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import {
  TraversalVisitorCommandName as Command,
  TraversalVisitorFunctionResolutionStyle as Style,
} from '../src/core/TraversalVisitor';
import { Vertex } from '../src/core/Vertex';
import { ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalInstanceConfig';
import { DagTraversalOrder as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { DagTraversalRunnerState } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerState';

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
  const traversal = new AsyncDagTraversal<TestGraph>({
    traversableGraph: graphAdapter(diamond),
    concurrency: 3,
  });
  traversal.addVisitorFor(Order.ON_READY, async (vertex, options) => {
    const data = vertex.getData();
    visited.push(data);
    expect(options.isGraphRoot).toBe(data === 'root');
    expect(options.isTraversalRoot).toBe(data === 'root');
    if (data === 'A') await aVisit.promise;
    if (data === 'B') await bVisit.promise;
  });
  const iterator = traversal.makeRunner().getIterable({
    iterateOver: [Order.ON_READY],
  });

  await expect(iterator.next()).resolves.toMatchObject({
    done: false,
    value: { order: Order.ON_READY, isGraphRoot: true },
  });
  const aEvent = iterator.next();
  await eventLoopTurn();
  expect(visited).toEqual(['root', 'A', 'B']);

  aVisit.resolve();
  await expect(aEvent).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'A' } },
  });
  const bEvent = iterator.next();
  await eventLoopTurn();
  expect(visited).not.toContain('join');

  bVisit.resolve();
  await expect(bEvent).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'B' } },
  });
  await expect(iterator.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'join' } },
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
    const runner = new AsyncDagTraversal<TestGraph>({
      traversableGraph: {
        makeRoot: () => ({
          vertexContent: { $d: 'root', $c: ['blocked'] },
          vertexId: 'root',
        }),
        makeVertex: () => ({
          vertexContent: { $d: 'blocked', $c: [] },
          vertexId: 'blocked',
          dependsOn: [hostileId],
        }),
      },
    }).makeRunner();

    await expect(
      Promise.race([runner.run(), rejectAfter(100)]),
    ).rejects.toThrow(/DAG traversal stalled: "blocked", reference#1/);
    await eventLoopTurn();
    expect(coercions).toBe(0);
    expect(unhandled).toEqual([]);
    expect(runner.getStatus()).toBe(Status.FAILED);
  } finally {
    process.off('unhandledRejection', listener);
  }
});

test('supports promised graph callbacks, sorting, hint identity, and snapshots', async () => {
  const originalHints = ['b', 'a'];
  const traversal = new AsyncDagTraversal<TestGraph>({
    traversableGraph: {
      makeRoot: async () => ({
        vertexId: 'root',
        vertexContent: { $d: 'root', $c: originalHints },
      }),
      makeVertex: async (hint, options) => {
        expect(options.resolvedGraph.getRoot()).not.toBeNull();
        expect(options.notMutatedResolvedGraph).not.toBeNull();
        return {
          vertexId: hint,
          dependsOn: ['root'],
          vertexContent: { $d: hint, $c: [] },
        };
      },
      getVertexIdFromHint: async (hint) => ({ vertexId: hint }),
    },
    sortChildrenHints: async (hints) => hints.reverse(),
    saveNotMutatedResolvedGraph: true,
    concurrency: 2,
  });
  traversal.addVisitorFor(Order.ON_READY, async (vertex) =>
    vertex.getData() === 'a'
      ? {
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'changed' },
            },
          ],
        }
      : undefined,
  );
  const runner = traversal.makeRunner();
  const values: string[] = [];
  for await (const event of runner.getIterable({
    iterateOver: [Order.ON_READY],
  })) {
    values.push(event.vertex.getData());
    expect(event.isGraphRoot).toBe(
      event.vertexRef === runner.getResolvedGraph().getRoot(),
    );
  }

  expect(values).toEqual(['root', 'changed', 'b']);
  expect(originalHints).toEqual(['b', 'a']);
  expect(
    runner.notMutatedResolvedGraph?.getVertexById('a')?.unref().getData(),
  ).toBe('a');
  expect(runner.getResolvedGraph().getVertexById('a')?.unref().getData()).toBe(
    'changed',
  );
});

test('supports an asynchronous tree source through the graph visitor facade', async () => {
  const traversal = new AsyncDagTraversal<TestGraph>({
    traversableTree: {
      makeRoot: async () => ({
        vertexContent: { $d: 'root', $c: ['child'] },
      }),
      makeVertex: async (hint, options) => {
        expect(options.resolvedTree.getRoot()).not.toBeNull();
        return { vertexContent: { $d: hint, $c: [] } };
      },
    },
  });
  const optionsSeen: string[] = [];
  traversal.addVisitorFor(Order.ON_READY, async (vertex, options) => {
    optionsSeen.push(vertex.getData());
    expect(options.resolvedGraph).toBeDefined();
    expect(options).not.toHaveProperty('resolvedTree');
  });

  await expect(traversal.makeRunner().run()).resolves.toBeDefined();
  expect(optionsSeen).toEqual(['root', 'child']);
});

test('requires one fixed source mode and validates concurrency', () => {
  expect(
    () =>
      new AsyncDagTraversal(
        {} as ConstructorParameters<typeof AsyncDagTraversal>[0],
      ),
  ).toThrow(/exactly one/i);
  expect(
    () =>
      new AsyncDagTraversal({
        traversableGraph: graphAdapter(),
        traversableTree: graphAdapter(),
      } as unknown as ConstructorParameters<typeof AsyncDagTraversal>[0]),
  ).toThrow(/exactly one/i);
  expect(
    () =>
      new AsyncDagTraversal<TestGraph>({
        traversableGraph: graphAdapter(),
        concurrency: 0,
      }),
  ).toThrow(TypeError);
  const traversal = new AsyncDagTraversal<TestGraph>({
    traversableGraph: graphAdapter(),
  });
  expect(traversal.configure({ traversableGraph: graphAdapter() })).toBe(
    traversal,
  );
  expect(() =>
    traversal.configure({
      traversableTree: graphAdapter(),
    } as unknown as Parameters<typeof traversal.configure>[0]),
  ).toThrow(/source mode/i);
  expect(traversal.makeRunner().inspect()).toMatchObject({
    execution: 'async',
    kind: 'dag',
    sourceMode: 'graph',
    concurrency: Infinity,
    inFlightCallbackCount: 0,
    bufferedEventCount: 0,
    status: Status.INITIAL,
  });
  expect(Object.isFrozen(ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG)).toBe(
    true,
  );
  expect(
    Object.isFrozen(ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.visitors),
  ).toBe(true);

  const treeTraversal = new AsyncDagTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: null }),
      makeVertex: () => ({ vertexContent: null }),
    },
  });
  expect(
    treeTraversal.configure({
      traversableTree: {
        makeRoot: () => ({ vertexContent: null }),
        makeVertex: () => ({ vertexContent: null }),
      },
    }),
  ).toBe(treeTraversal);
  expect(() =>
    treeTraversal.configure({
      traversableGraph: graphAdapter(),
    } as unknown as Parameters<typeof treeTraversal.configure>[0]),
  ).toThrow(/source mode/i);
});

test('isolates visitor configuration when making a runner', async () => {
  const seen: string[] = [];
  const traversal = new AsyncDagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { children: [], dependencies: [] },
    }),
  });
  traversal.setVisitorsFor(Order.ON_READY, [
    {
      addedIndex: 10,
      priority: 2,
      resolutionStyle: Style.SEQUENTIAL,
      visitor: async () => void seen.push('first'),
    },
  ]);
  traversal.addVisitorFor(
    Order.ON_READY,
    async () => void seen.push('second'),
    {
      priority: 1,
    },
  );
  expect(traversal.listVisitorsFor(Order.ON_READY)).toHaveLength(2);
  const runner = traversal.makeRunner();
  traversal.setVisitorsFor(Order.ON_READY, []);

  await runner.run({ iterateOver: [] });
  expect(seen).toEqual(['first', 'second']);
});

test('accepts initial and empty quiescent state but rejects active injection', async () => {
  for (const status of [Status.INITIAL, Status.HALTED]) {
    const state = new DagTraversalRunnerState<TestGraph>({ status });
    const container = new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    });
    const runner = new AsyncDagTraversal<TestGraph>({
      traversableGraph: graphAdapter({
        root: { children: [], dependencies: [] },
      }),
      traversalRunnerInternalObjects: {
        state,
        resolvedGraphsContainer: container,
      },
    }).makeRunner();
    expect(runner.state).toBe(state);
    expect(runner.resolvedGraphsContainer).toBe(container);
    await runner.run();
    expect(runner.getStatus()).toBe(Status.FINISHED);
  }

  const active = new DagTraversalRunnerState<TestGraph>({
    status: Status.RUNNING,
    traversalRootVertexRef: new CTTRef(
      new Vertex<TestGraph>({ $d: 'stale', $c: [] }),
    ),
  });
  expect(() =>
    new AsyncDagTraversal<TestGraph>({
      traversableGraph: graphAdapter(),
      traversalRunnerInternalObjects: { state: active },
    }).makeRunner(),
  ).toThrow(/quiescent|running/i);
});

test('validates injected container mode and snapshot compatibility', () => {
  const graphContainer = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  expect(() =>
    new AsyncDagTraversal<TestGraph>({
      traversableTree: {
        makeRoot: () => ({ vertexContent: null }),
        makeVertex: () => ({ vertexContent: null }),
      },
      traversalRunnerInternalObjects: {
        resolvedGraphsContainer: graphContainer,
      },
    }).makeRunner(),
  ).toThrow(/source mode/i);

  const snapshotContainer = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: true,
  });
  expect(() =>
    new AsyncDagTraversal<TestGraph>({
      traversableGraph: graphAdapter(),
      traversalRunnerInternalObjects: {
        resolvedGraphsContainer: snapshotContainer,
      },
    }).makeRunner(),
  ).toThrow(/snapshot mode/i);
});

test('accepts a non-empty quiescent ready seed without scheduling during construction', () => {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const root = new CTTRef(new Vertex<TestGraph>({ $d: 'root', $c: [] }));
  container.acceptRoot(root, 'root');
  container.store.setStatus(root, 'READY');
  const state = new DagTraversalRunnerState<TestGraph>({
    status: Status.HALTED,
    traversalRootVertexRef: root,
    readyVisits: [{ vertexRef: root, order: Order.ON_READY }],
  });
  let sourceCalls = 0;
  const runner = new AsyncDagTraversal<TestGraph>({
    traversableGraph: {
      makeRoot: () => {
        sourceCalls++;
        return { vertexContent: null };
      },
      makeVertex: () => ({ vertexContent: null }),
    },
    traversalRunnerInternalObjects: {
      state,
      resolvedGraphsContainer: container,
    },
  }).makeRunner();

  expect(runner.isHalted()).toBe(true);
  expect(sourceCalls).toBe(0);
  expect(runner.inspect().readyVisits).toEqual([
    { vertexRefId: root.getId(), order: Order.ON_READY },
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
    const runner = new AsyncDagTraversal<TestGraph>({
      traversableGraph: {
        makeRoot: () => {
          sourceCalls++;
          return { vertexContent: null };
        },
        makeVertex: () => ({ vertexContent: null }),
      },
      traversalRunnerInternalObjects: { state },
    }).makeRunner();

    for (const attempt of [
      () => runner.run(),
      () => runner.getIterable().next(),
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
    expect(runner.getStatus()).toBe(Status.FAILED);
    expect(state.failure).toEqual({ error: failure });
    expect(sourceCalls).toBe(0);
  },
);

test.each([new Error('live failure'), undefined])(
  'stores a live failure for exact terminal reconstruction %#',
  async (failure) => {
    const root = deferred<{ vertexContent: null }>();
    const state = new DagTraversalRunnerState<TestGraph>();
    const container = new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    });
    const source = {
      makeRoot: () => root.promise,
      makeVertex: () => ({ vertexContent: null }),
    };
    const runner = new AsyncDagTraversal<TestGraph>({
      traversableGraph: source,
      traversalRunnerInternalObjects: {
        state,
        resolvedGraphsContainer: container,
      },
    }).makeRunner();
    const running = runner.run();
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

    const reconstructed = new AsyncDagTraversal<TestGraph>({
      traversableGraph: {
        makeRoot: () => {
          throw new Error('terminal reconstruction must not resolve source');
        },
        makeVertex: () => ({ vertexContent: null }),
      },
      traversalRunnerInternalObjects: {
        state,
        resolvedGraphsContainer: container,
      },
    }).makeRunner();
    caught = false;
    try {
      await reconstructed.run();
    } catch (error) {
      caught = true;
      expect(error).toBe(failure);
    }
    expect(caught).toBe(true);
    expect(reconstructed.getStatus()).toBe(Status.FAILED);
  },
);
