import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalOrder as Order,
  DEFER_READY,
} from '../src/traversals/dag-traversal';
import {
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
} from '../src/traversals/depth-first-traversal';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import {
  TraversalVisitorCommandName as Command,
  TraversalVisitorFunctionResolutionStyle as Style,
} from '../src/core/TraversalVisitor';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

type G = TreeTypeParameters<string, string>;
const rootOnly = {
  makeRoot: () => ({ vertexId: 'a', vertexContent: { $d: 'a', $c: [] } }),
  makeVertex: () => ({ vertexContent: null }),
};
for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} settlement preserves configured event once and discards buffered commands and remaining visitors`, async () => {
    const traversal = new Constructor<G>({ traversableGraph: rootOnly });
    let visits = 0;
    traversal.addVisitorFor(
      Order.ON_READY,
      () => ({
        commands: [
          {
            commandName: Command.REWRITE_VERTEX_DATA,
            commandArguments: { newData: 'wrong' },
          },
        ],
      }),
      { resolutionStyle: Style.CONCURRENT },
    );
    traversal.addVisitorFor(
      Order.ON_READY,
      () => {
        visits++;
        return DEFER_READY;
      },
      { resolutionStyle: Style.CONCURRENT },
    );
    traversal.addVisitorFor(Order.ON_READY, () => {
      throw Error('must skip');
    });
    const runner = traversal.makeRunner();
    await runner.run({ iterateOver: [Order.ON_READY] });
    const token = runner.summary().vertices.get('a')!.generation!;
    expect(() => runner.settle('missing', { ok: true }, token)).toThrow();
    expect(() => runner.settle('a', { ok: true }, Symbol())).toThrow();
    const other = traversal.makeRunner();
    await other.run();
    expect(() => other.settle('a', { ok: true }, token)).toThrow();
    runner.settle('a', { ok: true }, token);
    runner.settle('a', { ok: true }, token);
    const events: string[] = [];
    for await (const event of runner.getIterable({
      iterateOver: [Order.ON_COMPLETE],
    }))
      events.push(`${event.order}:${event.vertex.getData()}`);
    expect(events).toEqual(['ON_READY:a', 'ON_COMPLETE:a']);
    expect(visits).toBe(2);
  });

  test.each([undefined, null, { reason: 'business failure' }, NaN])(
    `${Constructor.name} preserves settlement error %p and guards replay`,
    async (error) => {
      const traversal = new Constructor<G>({ traversableGraph: rootOnly });
      traversal.addVisitorFor(Order.ON_READY, () => DEFER_READY);
      const runner = traversal.makeRunner();
      await runner.run();
      const token = runner.summary().vertices.get('a')!.generation!;
      expect(runner.settle('a', { ok: false, error }, token)).toBe(true);
      expect(runner.settle('a', { ok: false, error }, token)).toBe(false);
      expect(() => runner.settle('a', { ok: true }, token)).toThrow();
      expect(() =>
        runner.settle('a', { ok: false, error: {} }, token),
      ).toThrow();
      expect(runner.getStatus()).toBe(Status.FAILED);
      expect(runner.summary().completedWorkIds).toEqual([]);
      await expect(async () => {
        await runner.run();
      }).rejects.toBe(error);
    },
  );

  test(`${Constructor.name} rejects completion deferral`, async () => {
    const traversal = new Constructor<G>({ traversableGraph: rootOnly });
    traversal.addVisitorFor(Order.ON_COMPLETE, () => DEFER_READY);
    await expect(async () => {
      await traversal.makeRunner().run();
    }).rejects.toThrow(/ON_READY/);
  });

  test(`${Constructor.name} lazy deferred discovery reports a partial frontier until settlement`, async () => {
    const traversal = new Constructor<G>({
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          vertexContent: { $d: 'root', $c: ['a', 'b'] },
        }),
        makeVertex: (id) => ({
          vertexId: id,
          dependsOn: id === 'a' ? ['c'] : id === 'b' ? ['root'] : [],
          vertexContent: { $d: id, $c: id === 'b' ? ['c'] : [] },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_READY, () => DEFER_READY);
    const runner = traversal.makeRunner();
    await runner.run();
    expect(runner.summary().discovery).toEqual({
      mode: 'lazy',
      complete: false,
    });
    expect(runner.summary().diagnostics).toBeNull();
    runner.settle(
      'root',
      { ok: true },
      runner.summary().vertices.get('root')!.generation!,
    );
    await runner.run();
    expect(runner.summary().deferredIds).toEqual(['b', 'c']);
    runner.settle(
      'c',
      { ok: true },
      runner.summary().vertices.get('c')!.generation!,
    );
    await runner.run();
    expect(runner.summary().discovery.complete).toBe(true);
    expect(runner.summary().readyIds).toEqual(['a', 'b']);
  });
}

test('tree visitors cannot use the DAG deferral sentinel', () => {
  const traversal = new DepthFirstTraversal<G>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: { $d: 'a', $c: [] } }),
      makeVertex: () => ({ vertexContent: null }),
    },
  });
  traversal.addVisitorFor(
    DepthFirstTraversalOrder.PRE_ORDER,
    () => DEFER_READY as never,
  );
  expect(() => traversal.makeRunner().run()).toThrow(/ON_READY/);
});

test('settlement wakes an active async consumer while another physical callback is pending', async () => {
  const waitB = deferred<typeof DEFER_READY>();
  const seen: string[] = [];
  const traversal = new AsyncDagTraversal<G>({
    concurrency: 2,
    discovery: 'eager',
    syntheticRoot: true,
    traversableGraph: {
      makeRoot: () => ({ vertexContent: { $d: '', $c: ['a', 'b', 'c'] } }),
      makeVertex: (id) => ({
        vertexId: id,
        dependsOn: id === 'c' ? ['a'] : [],
        vertexContent: { $d: id, $c: [] },
      }),
    },
  });
  traversal.addVisitorFor(Order.ON_READY, (vertex) => {
    const id = vertex.getData();
    seen.push(id);
    return id === 'b' ? waitB.promise : DEFER_READY;
  });
  const runner = traversal.makeRunner();
  const running = runner.run();
  await eventLoopTurn();
  expect(runner.summary().inFlightIds).toEqual(['b']);
  expect(runner.summary().vertices.get('b')!.work).toBe('running');
  runner.settle(
    'a',
    { ok: true },
    runner.summary().vertices.get('a')!.generation!,
  );
  await eventLoopTurn();
  expect(seen).toEqual(['a', 'b', 'c']);
  expect(runner.inspect().inFlightCallbackCount).toBe(1);
  waitB.resolve(DEFER_READY);
  await running;
  expect(runner.getStatus()).toBe(Status.HALTED);
});

test('deleted orphan refuses a previously issued deferred generation', async () => {
  const finishP = deferred<void>();
  const traversal = new AsyncDagTraversal<G>({
    concurrency: 2,
    discovery: 'eager',
    traversableGraph: {
      makeRoot: () => ({
        vertexId: 'root',
        vertexContent: { $d: 'root', $c: ['p'] },
      }),
      makeVertex: (id) => ({
        vertexId: id,
        dependsOn: [],
        vertexContent: { $d: id, $c: id === 'p' ? ['a'] : [] },
      }),
    },
  });
  traversal.addVisitorFor(Order.ON_READY, async (vertex) => {
    if (vertex.getData() === 'p') {
      await finishP.promise;
      return { commands: [{ commandName: Command.DELETE_VERTEX }] };
    }
    if (vertex.getData() === 'a') return DEFER_READY;
    return undefined;
  });
  const runner = traversal.makeRunner();
  const running = runner.run();
  await eventLoopTurn();
  const token = runner.summary().vertices.get('a')!.generation!;
  finishP.resolve();
  await running;
  expect(runner.summary().vertices.has('a')).toBe(false);
  expect(() => runner.settle('a', { ok: true }, token)).toThrow();
  expect(runner.getStatus()).toBe(Status.FINISHED);
});

test('halt waits for a physical callback and retains deferred handles across resume', async () => {
  const release = deferred<typeof DEFER_READY>();
  const traversal = new AsyncDagTraversal<G>({
    concurrency: 2,
    discovery: 'eager',
    syntheticRoot: true,
    traversableGraph: {
      makeRoot: () => ({ vertexContent: { $d: '', $c: ['a', 'b'] } }),
      makeVertex: (id) => ({ vertexId: id, vertexContent: { $d: id, $c: [] } }),
    },
  });
  traversal.addVisitorFor(Order.ON_READY, (vertex) =>
    vertex.getData() === 'a' ? DEFER_READY : release.promise,
  );
  const runner = traversal.makeRunner();
  const iterator = runner.getIterable({ iterateOver: [Order.ON_READY] });
  const next = iterator.next();
  await eventLoopTurn();
  const token = runner.summary().vertices.get('a')!.generation!;
  let closed = false;
  const closing = iterator.return().then(() => {
    closed = true;
  });
  await eventLoopTurn();
  expect(closed).toBe(false);
  expect(runner.inspect().inFlightCallbackCount).toBe(1);
  release.resolve(DEFER_READY);
  await closing;
  await next;
  expect(runner.getStatus()).toBe(Status.HALTED);
  expect(runner.summary().vertices.get('a')!.generation).toBe(token);
  runner.settle('a', { ok: true }, token);
  await runner.run();
  expect(runner.summary().completedWorkIds).toEqual(['a']);
  expect(runner.summary().readyIds).toEqual(['b']);
});

test('failure settlement cannot free a still-running callback permit or accept another deferred result', async () => {
  const release = deferred<void>();
  const traversal = new AsyncDagTraversal<G>({
    concurrency: 3,
    discovery: 'eager',
    syntheticRoot: true,
    traversableGraph: {
      makeRoot: () => ({ vertexContent: { $d: '', $c: ['a', 'b', 'c'] } }),
      makeVertex: (id) => ({ vertexId: id, vertexContent: { $d: id, $c: [] } }),
    },
  });
  traversal.addVisitorFor(Order.ON_READY, (vertex) =>
    vertex.getData() === 'b' ? release.promise : DEFER_READY,
  );
  const runner = traversal.makeRunner();
  const running = runner.run();
  const rejected = expect(running).rejects.toBe(null);
  await eventLoopTurn();
  const snapshot = runner.summary();
  runner.settle(
    'a',
    { ok: false, error: null },
    snapshot.vertices.get('a')!.generation!,
  );
  await rejected;
  expect(runner.inspect().inFlightCallbackCount).toBe(1);
  expect(() =>
    runner.settle('c', { ok: true }, snapshot.vertices.get('c')!.generation!),
  ).toThrow(/failed/);
  release.resolve();
  await eventLoopTurn();
  expect(runner.inspect().inFlightCallbackCount).toBe(0);
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test.each([
    ['backend', 'frontend'],
    ['frontend', 'backend'],
  ])(
    `${Constructor.name} reconstructed completed facts agree with settlement order %j`,
    async (first, second) => {
      const make = (completedWork: Set<string>) => {
        const traversal = new Constructor<G>({
          discovery: 'eager',
          syntheticRoot: true,
          completedWork,
          traversableGraph: {
            makeRoot: () => ({
              vertexContent: {
                $d: '',
                $c: ['design', 'backend', 'frontend', 'verify'],
              },
            }),
            makeVertex: (id) => ({
              vertexId: id,
              dependsOn:
                id === 'design'
                  ? []
                  : id === 'verify'
                  ? ['backend', 'frontend']
                  : ['design'],
              vertexContent: { $d: id, $c: [] },
            }),
          },
        });
        traversal.addVisitorFor(Order.ON_READY, () => DEFER_READY);
        return traversal.makeRunner();
      };
      const completed = new Set(['design']);
      const retained = make(completed);
      await retained.run();
      for (const id of [first, second]) {
        const token = retained.summary().vertices.get(id)!.generation!;
        retained.settle(id, { ok: true }, token);
        await retained.run();
        completed.add(id);
        const rebuilt = make(completed);
        await rebuilt.run();
        expect(rebuilt.summary().readyIds).toEqual(retained.summary().readyIds);
        expect(rebuilt.summary().completedWorkIds).toEqual(
          retained.summary().completedWorkIds,
        );
        expect(rebuilt.summary().counts).toEqual(retained.summary().counts);
        expect(() => rebuilt.settle(id, { ok: true }, token)).toThrow();
      }
      expect(retained.summary().readyIds).toEqual(['verify']);
    },
  );
}
