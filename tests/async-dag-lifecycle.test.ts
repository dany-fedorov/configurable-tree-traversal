import type { VisitResult } from '../src/core/graph/types';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversalOrder as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { DagTraversalRunnerState } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerState';
import type { TestGraph } from './helpers/graph-fixtures';
import {
  deferred,
  eventLoopTurn,
  graphAdapter,
} from './helpers/graph-fixtures';

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
  const traversal = new AsyncDagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { children: [], dependencies: [] },
    }),
  });
  traversal.addVisitorFor(Order.ON_READY, async () => {
    calls.push('first');
    await halt.promise;
    return { commands: [{ commandName: Command.HALT_TRAVERSAL }] };
  });
  traversal.addVisitorFor(Order.ON_READY, async () => {
    calls.push('second');
  });
  const runner = traversal.makeRunner();
  const first = runner.getIterable({ iterateOver: [Order.ON_READY] });
  const halted = first.next();
  await eventLoopTurn();
  expect(calls).toEqual(['first']);

  halt.resolve();
  await expect(halted).resolves.toEqual({ done: true, value: undefined });
  expect(runner.getStatus()).toBe(Status.HALTED);
  const resumed = runner.getIterable({ iterateOver: [Order.ON_READY] });
  await expect(resumed.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'root' } },
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
  const traversal = new AsyncDagTraversal<TestGraph>({
    traversableGraph: twoBranches(),
    concurrency: 2,
  });
  traversal.addVisitorFor(Order.ON_READY, async (vertex) => {
    const data = vertex.getData();
    calls.push(`${data}:first`);
    if (data === 'A') {
      await haltA.promise;
      return { commands: [{ commandName: Command.HALT_TRAVERSAL }] };
    }
    if (data === 'B') await finishB.promise;
    return undefined;
  });
  traversal.addVisitorFor(Order.ON_READY, async (vertex) => {
    calls.push(`${vertex.getData()}:second`);
  });
  const runner = traversal.makeRunner();
  const iterator = runner.getIterable({ iterateOver: [Order.ON_READY] });

  expect((await iterator.next()).value?.vertex.getData()).toBe('root');
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
    value: { vertex: { $d: 'B' } },
  });
  await expect(iterator.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
  expect(calls.filter((call) => call === 'B:second')).toHaveLength(1);
  expect(runner.getStatus()).toBe(Status.HALTED);

  const resumed = runner.getIterable({ iterateOver: [Order.ON_READY] });
  await expect(resumed.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'A' } },
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
  const traversal = new AsyncDagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { children: ['child'], dependencies: [] },
      child: { children: [], dependencies: ['root'] },
    }),
  });
  traversal.addVisitorFor(Order.ON_READY, async (vertex) => {
    if (vertex.getData() === 'child') {
      started.resolve();
      await childVisit.promise;
    }
  });
  const runner = traversal.makeRunner();
  const iterator = runner.getIterable({ iterateOver: [Order.ON_READY] });
  expect((await iterator.next()).value?.vertex.getData()).toBe('root');
  const pending = iterator.next();
  await started.promise;

  let closed = false;
  const closing = iterator.return(undefined).then((result) => {
    closed = true;
    return result;
  });
  await eventLoopTurn();
  expect(closed).toBe(false);
  const competing = runner.getIterable();
  await expect(competing.next()).rejects.toThrow('Another active iterator');

  childVisit.resolve();
  await expect(closing).resolves.toEqual({ done: true, value: undefined });
  await expect(pending).resolves.toEqual({ done: true, value: undefined });
  const resumed = runner.getIterable({ iterateOver: [Order.ON_READY] });
  await expect(resumed.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'child' }, order: Order.ON_READY },
  });
  await expect(resumed.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
});

test('a committed buffered event retains its original filter eligibility', async () => {
  const childVisit = deferred<void>();
  const started = deferred<void>();
  const traversal = new AsyncDagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { children: ['child'], dependencies: [] },
      child: { children: [], dependencies: ['root'] },
    }),
  });
  traversal.addVisitorFor(Order.ON_READY, async (vertex) => {
    if (vertex.getData() === 'child') {
      started.resolve();
      await childVisit.promise;
    }
  });
  const runner = traversal.makeRunner();
  const first = runner.getIterable({ iterateOver: [Order.ON_READY] });
  await first.next();
  const pending = first.next();
  await started.promise;
  const closing = first.return(undefined);

  childVisit.resolve();
  await expect(closing).resolves.toEqual({ done: true, value: undefined });
  await expect(pending).resolves.toEqual({ done: true, value: undefined });
  const changedFilters = runner.getIterable({ iterateOver: [] });
  await expect(changedFilters.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'child' }, order: Order.ON_READY },
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
  const traversal = new AsyncDagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { children: ['child'], dependencies: [] },
      child: { children: [], dependencies: ['root'] },
    }),
  });
  traversal.addVisitorFor(Order.ON_READY, async (vertex) => {
    const data = vertex.getData();
    calls.push(`${data}:halt`);
    if (data === 'root') await rootHalt.promise;
    else {
      childStarted.resolve();
      await childHalt.promise;
    }
    return { commands: [{ commandName: Command.HALT_TRAVERSAL }] };
  });
  traversal.addVisitorFor(Order.ON_READY, async (vertex) => {
    calls.push(`${vertex.getData()}:after`);
  });
  const runner = traversal.makeRunner();
  const events: string[] = [];

  const first = runner.getIterable({ iterateOver: [Order.ON_READY] });
  const firstNext = first.next();
  await eventLoopTurn();
  expect(calls).toEqual(['root:halt']);
  rootHalt.resolve();
  await expect(firstNext).resolves.toEqual({ done: true, value: undefined });
  expect(runner.getStatus()).toBe(Status.HALTED);

  const closingIterator = runner.getIterable({ iterateOver: [Order.ON_READY] });
  const rootEvent = await closingIterator.next();
  expect(rootEvent.done).toBe(false);
  events.push(rootEvent.value!.vertex.getData());
  const childEvent = closingIterator.next();
  await childStarted.promise;
  let closed = false;
  const closing = closingIterator.return(undefined).then((result) => {
    closed = true;
    return result;
  });
  await eventLoopTurn();
  expect(closed).toBe(false);
  const competing = runner.getIterable({ iterateOver: [Order.ON_READY] });
  await expect(competing.next()).rejects.toThrow('Another active iterator');

  childHalt.resolve();
  await expect(closing).resolves.toEqual({ done: true, value: undefined });
  await expect(childEvent).resolves.toEqual({ done: true, value: undefined });
  expect(runner.getStatus()).toBe(Status.HALTED);

  const resumed = runner.getIterable({ iterateOver: [Order.ON_READY] });
  const resumedEvent = await resumed.next();
  expect(resumedEvent.done).toBe(false);
  events.push(resumedEvent.value!.vertex.getData());
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
  expect(runner.getStatus()).toBe(Status.FINISHED);
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
    new AsyncDagTraversal<TestGraph>({
      traversableGraph: source,
      traversalRunnerInternalObjects: {
        state,
        resolvedGraphsContainer: container,
      },
    });
  const ownerTraversal = makeTraversal();
  ownerTraversal.addVisitorFor(Order.ON_READY, async () => {
    await halt.promise;
    return { commands: [{ commandName: Command.HALT_TRAVERSAL }] };
  });
  const owner = ownerTraversal.makeRunner();
  const competitor = makeTraversal().makeRunner();
  const ownerIterator = owner.getIterable();
  const ownerNext = ownerIterator.next();
  await eventLoopTurn();

  await expect(competitor.getIterable().next()).rejects.toThrow(
    /another active runner/i,
  );
  halt.resolve();
  await expect(ownerNext).resolves.toEqual({ done: true, value: undefined });
  expect(owner.getStatus()).toBe(Status.HALTED);
  await expect(competitor.getIterable().next()).rejects.toThrow(
    /another active runner/i,
  );

  await owner.run();
  expect(owner.getStatus()).toBe(Status.FINISHED);
  await expect(makeTraversal().makeRunner().run()).resolves.toBeDefined();
});

test('close does not await a pending resolver and reuses its result on resume', async () => {
  const child = deferred<{
    vertexId: string;
    dependsOn: string[];
    vertexContent: { $d: string; $c: string[] };
  }>();
  let resolutions = 0;
  const runner = new AsyncDagTraversal<TestGraph>({
    traversableGraph: {
      makeRoot: () => ({
        vertexId: 'root',
        vertexContent: { $d: 'root', $c: ['child'] },
      }),
      makeVertex: () => {
        resolutions++;
        return child.promise;
      },
    },
  }).makeRunner();
  const iterator = runner.getIterable({ iterateOver: [Order.ON_READY] });
  await iterator.next();
  const pending = iterator.next();
  await eventLoopTurn();
  expect(resolutions).toBe(1);

  await expect(iterator.return(undefined)).resolves.toEqual({
    done: true,
    value: undefined,
  });
  await expect(pending).resolves.toEqual({ done: true, value: undefined });
  expect(runner.getStatus()).toBe(Status.HALTED);
  child.resolve({
    vertexId: 'child',
    dependsOn: ['root'],
    vertexContent: { $d: 'child', $c: [] },
  });
  await eventLoopTurn();

  const resumed = runner.getIterable({ iterateOver: [Order.ON_READY] });
  await expect(resumed.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'child' } },
  });
  expect(resolutions).toBe(1);
  await resumed.return(undefined);
});

test('cascade deletion invalidates running dependents and all late outcomes', async () => {
  const deleteA = deferred<void>();
  const bVisit = deferred<VisitResult<TestGraph>>();
  const cVisit = deferred<VisitResult<TestGraph>>();
  const started: string[] = [];
  const traversal = new AsyncDagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { children: ['A', 'B', 'C'], dependencies: [] },
      A: { children: [], dependencies: ['root'] },
      B: { children: [], dependencies: ['A'] },
      C: { children: [], dependencies: ['A'] },
    }),
    concurrency: 3,
  });
  traversal.addVisitorFor(Order.ON_READY, async (vertex) => {
    const data = vertex.getData();
    if (data === 'B' || data === 'C') started.push(data);
    if (data === 'B') return bVisit.promise;
    if (data === 'C') return cVisit.promise;
    return undefined;
  });
  traversal.addVisitorFor(Order.ON_COMPLETE, async (vertex) => {
    if (vertex.getData() !== 'A') return undefined;
    await deleteA.promise;
    return { commands: [{ commandName: Command.DELETE_VERTEX }] };
  });
  const runner = traversal.makeRunner();
  const events: string[] = [];
  const running = (async () => {
    for await (const event of runner.getIterable()) {
      events.push(`${event.order}:${event.vertex.getData()}`);
    }
  })();
  await eventLoopTurn();
  await eventLoopTurn();
  expect(started).toEqual(['B', 'C']);

  deleteA.resolve();
  await running;
  const beforeLate = runner
    .getResolvedGraph()
    .getVertexRefs()
    .map((ref) => ref.unref().getData());
  expect(beforeLate).toEqual(['root']);
  const eventsBeforeLate = events.slice();
  expect(eventsBeforeLate).not.toContain('ON_READY:B');
  expect(eventsBeforeLate).not.toContain('ON_READY:C');

  bVisit.resolve({
    commands: [
      {
        commandName: Command.REWRITE_VERTEX_DATA,
        commandArguments: { newData: 'late mutation' },
      },
    ],
  });
  const lateFailure = new Error('late invalid failure');
  cVisit.reject(lateFailure);
  await eventLoopTurn();
  expect(runner.getStatus()).toBe(Status.FINISHED);
  await expect(runner.run()).resolves.toBe(runner);
  expect(events).toEqual(eventsBeforeLate);
  expect(
    runner
      .getResolvedGraph()
      .getVertexRefs()
      .map((ref) => ref.unref().getData()),
  ).toEqual(beforeLate);
});

test('retains the first live failure and ignores later sibling settlement', async () => {
  const failure = new Error('first live failure');
  const aVisit = deferred<VisitResult<TestGraph>>();
  const bVisit = deferred<VisitResult<TestGraph>>();
  const traversal = new AsyncDagTraversal<TestGraph>({
    traversableGraph: twoBranches(),
    concurrency: 2,
  });
  traversal.addVisitorFor(Order.ON_READY, (vertex) => {
    if (vertex.getData() === 'A') return aVisit.promise;
    if (vertex.getData() === 'B') return bVisit.promise;
    return undefined;
  });
  const runner = traversal.makeRunner();
  const running = runner.run({ iterateOver: [] });
  await eventLoopTurn();
  await eventLoopTurn();

  aVisit.reject(failure);
  await expect(running).rejects.toBe(failure);
  const beforeLate = runner
    .getResolvedGraph()
    .getVertexRefs()
    .map((ref) => ref.unref().getData());
  bVisit.resolve({
    commands: [
      {
        commandName: Command.REWRITE_VERTEX_DATA,
        commandArguments: { newData: 'late mutation' },
      },
    ],
  });
  await eventLoopTurn();

  expect(runner.getStatus()).toBe(Status.FAILED);
  await expect(runner.run()).rejects.toBe(failure);
  expect(
    runner
      .getResolvedGraph()
      .getVertexRefs()
      .map((ref) => ref.unref().getData()),
  ).toEqual(beforeLate);
});

test('consumer error escapes while a draining traversal failure is retained', async () => {
  const finishA = deferred<void>();
  const bVisit = deferred<void>();
  const bStarted = deferred<void>();
  const failure = new Error('draining traversal failure');
  const consumerError = new Error('consumer failure');
  const traversal = new AsyncDagTraversal<TestGraph>({
    traversableGraph: twoBranches(),
    concurrency: 2,
  });
  traversal.addVisitorFor(Order.ON_READY, async (vertex) => {
    if (vertex.getData() === 'A') await finishA.promise;
    if (vertex.getData() === 'B') {
      bStarted.resolve();
      await bVisit.promise;
    }
  });
  const runner = traversal.makeRunner();
  let caught: unknown;
  const consuming = (async () => {
    try {
      for await (const event of runner.getIterable({
        iterateOver: [Order.ON_READY],
      })) {
        if (event.vertex.getData() === 'A') throw consumerError;
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
  expect(runner.getStatus()).toBe(Status.FAILED);
  await expect(runner.run()).rejects.toBe(failure);
});

test('inspection is detached and inert during pending, halting, and failed work', async () => {
  const pendingVisit = deferred<void>();
  const started = deferred<void>();
  const failure = new Error('inspection failure');
  let sourceCalls = 0;
  const traversal = new AsyncDagTraversal<TestGraph>({
    traversableGraph: {
      makeRoot: () => {
        sourceCalls++;
        return {
          vertexId: 'root',
          vertexContent: { $d: 'root', $c: [] },
        };
      },
      makeVertex: () => ({ vertexContent: null }),
    },
  });
  traversal.addVisitorFor(Order.ON_READY, async () => {
    started.resolve();
    await pendingVisit.promise;
    throw failure;
  });
  const runner = traversal.makeRunner();
  const initial = runner.inspect();
  expect(sourceCalls).toBe(0);
  expect(Object.isFrozen(initial)).toBe(true);
  const iterator = runner.getIterable();
  const next = iterator.next();
  await started.promise;

  const pending = runner.inspect();
  expect(pending.inFlightCallbackCount).toBe(1);
  const closing = iterator.return(undefined);
  const halting = runner.inspect();
  expect(halting.inFlightCallbackCount).toBe(1);
  expect(sourceCalls).toBe(1);
  expect(pending).not.toBe(halting);

  pendingVisit.resolve();
  await expect(closing).rejects.toBe(failure);
  await expect(next).rejects.toBe(failure);
  const failed = runner.inspect();
  expect(failed.status).toBe(Status.FAILED);
  expect(failed.inFlightCallbackCount).toBe(0);
  expect(sourceCalls).toBe(1);
  await expect(runner.run()).rejects.toBe(failure);
});

test('retains undefined as the exact traversal failure sentinel', async () => {
  const root = deferred<{ vertexContent: null }>();
  const runner = new AsyncDagTraversal<TestGraph>({
    traversableGraph: {
      makeRoot: () => root.promise,
      makeVertex: () => ({ vertexContent: null }),
    },
  }).makeRunner();
  const running = runner.run();
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
  expect(runner.getStatus()).toBe(Status.FAILED);
});
