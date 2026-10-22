import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversalOrder as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { MakeVertexResult } from '../src/core/TraversableTree';
import type { TestGraph as G } from './helpers/graph-fixtures';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

const removed = { commands: [{ commandName: Command.DELETE_VERTEX as const }] };
const found = { vertexContent: { $d: 'external', $c: [] } };

test('held lookup respects halt and iterator return, stores its reply and resumes once', async () => {
  const gate = deferred<MakeVertexResult<G> | undefined>();
  const entered = deferred<void>();
  const calls: unknown[] = [];
  const traversal = new AsyncDagTraversal<G>({
    traversableGraph: {
      makeRoot: () => ({
        vertexId: 'root',
        dependsOn: ['external'],
        vertexContent: { $d: 'root', $c: [] },
      }),
      makeVertex: () => ({ vertexContent: null }),
      resolvePrerequisite: (id) => {
        calls.push(id);
        entered.resolve();
        return gate.promise;
      },
    },
  });
  const runner = traversal.makeRunner();
  const iterator = runner.getIterable({ iterateOver: [] });
  const running = iterator.next();
  await entered.promise;
  const before = runner.summary();
  expect(before.discovery.complete).toBe(false);
  expect(runner.summary()).toEqual(before);
  expect(runner.inspect().pendingRequests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: 'RESOLVE_PREREQUISITE',
        owner: expect.objectContaining({ kind: 'prerequisite' }),
      }),
    ]),
  );
  await iterator.return(undefined);
  await running;
  expect(() =>
    new AsyncDagTraversal<G>({
      traversableGraph: {
        makeRoot: () => ({ vertexContent: null }),
        makeVertex: () => ({ vertexContent: null }),
      },
      traversalRunnerInternalObjects: {
        resolvedGraphsContainer: runner.resolvedGraphsContainer,
      },
    }).makeRunner(),
  ).toThrow('Injected DAG objects belong to an active runner');
  gate.resolve(found);
  await eventLoopTurn();
  expect(runner.getResolvedGraph().getVertexById('external')).toBeNull();
  expect(runner.summary()).toEqual(before);
  await runner.run();
  expect(calls).toEqual(['external']);
  expect(runner.summary().counts.subtreeCompleted).toBe(2);
});

for (const removeAll of [false, true]) {
  test(`shared lookup survives only while retained original declarations demand it (${removeAll})`, async () => {
    const lookup = deferred<MakeVertexResult<G>>();
    const entered = deferred<void>();
    const a = deferred<void>();
    const b = deferred<void>();
    const calls: unknown[] = [];
    const traversal = new AsyncDagTraversal<G>({
      completedWork: new Set(['a', 'b']),
      concurrency: 4,
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          vertexContent: { $d: 'root', $c: ['a', 'b'] },
        }),
        makeVertex: (id) => ({
          vertexId: id,
          dependsOn: ['external'],
          vertexContent: { $d: id, $c: [] },
        }),
        resolvePrerequisite: (id) => {
          calls.push(id);
          entered.resolve();
          return lookup.promise;
        },
      },
    });
    traversal.addVisitorFor(Order.ON_COMPLETE, async (v) => {
      if (v.getData() === 'a') {
        await a.promise;
        return removed;
      }
      if (v.getData() === 'b') {
        await b.promise;
        return removeAll ? removed : undefined;
      }
      return undefined;
    });
    const runner = traversal.makeRunner();
    const running = runner.run();
    await entered.promise;
    a.resolve();
    if (removeAll) b.resolve();
    await eventLoopTurn();
    lookup.resolve(found);
    if (!removeAll) b.resolve();
    await running;
    expect(calls).toEqual(['external']);
    expect(runner.getResolvedGraph().getVertexById('external') === null).toBe(
      removeAll,
    );
    expect(runner.summary().counts.subtreeCompleted).toBe(removeAll ? 1 : 3);
  });
}

test('deleting the root invalidates held lookup errors without resurrecting detached work', async () => {
  const lookup = deferred<MakeVertexResult<G>>();
  const entered = deferred<void>();
  const remove = deferred<void>();
  const traversal = new AsyncDagTraversal<G>({
    completedWork: new Set(['root']),
    concurrency: 2,
    traversableGraph: {
      makeRoot: () => ({
        vertexId: 'root',
        dependsOn: ['external'],
        vertexContent: { $d: 'root', $c: [] },
      }),
      makeVertex: () => ({ vertexContent: null }),
      resolvePrerequisite: () => {
        entered.resolve();
        return lookup.promise;
      },
    },
  });
  traversal.addVisitorFor(Order.ON_COMPLETE, async () => {
    await remove.promise;
    return removed;
  });
  const runner = traversal.makeRunner();
  const running = runner.run();
  await entered.promise;
  remove.resolve();
  await eventLoopTurn();
  lookup.reject(undefined);
  await running;
  expect(runner.getResolvedGraph().getVertexRefs()).toEqual([]);
  expect(runner.summary().counts.discovered).toBe(0);
});

for (const hinted of [false, true]) {
  test(`eager lookup closure waits for racing lookup and ordinary discovery (${hinted})`, async () => {
    const second = deferred<MakeVertexResult<G>>();
    const calls: string[] = [];
    const events: string[] = [];
    const traversal = new AsyncDagTraversal<G>({
      discovery: 'eager',
      concurrency: 3,
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          dependsOn: ['loader', 'external'],
          vertexContent: { $d: 'root', $c: [] },
        }),
        ...(hinted
          ? { getVertexIdFromHint: (id: string) => ({ vertexId: id }) }
          : {}),
        makeVertex: (id) => {
          calls.push(id);
          return {
            vertexId: id,
            dependsOn: [],
            vertexContent: { $d: 'ordinary', $c: [] },
          };
        },
        resolvePrerequisite: (id) =>
          id === 'external'
            ? second.promise
            : Promise.resolve({
                vertexContent: { $d: 'loader', $c: ['external'] },
              }),
      },
    });
    traversal.addVisitorFor(Order.ON_READY, (v) => {
      events.push(v.getData());
    });
    const runner = traversal.makeRunner();
    const running = runner.run();
    await eventLoopTurn();
    expect(events).toEqual([]);
    expect(runner.summary().discovery.complete).toBe(false);
    expect(calls).toEqual(hinted ? [] : ['external']);
    second.resolve(found);
    await running;
    expect(runner.summary().counts.discovered).toBe(3);
    expect(
      events.filter((id) => id === 'external' || id === 'ordinary'),
    ).toEqual([hinted ? 'external' : 'ordinary']);
  });
}

test('resolver calls share the finite callback concurrency ceiling', async () => {
  const gates = [
    deferred<MakeVertexResult<G>>(),
    deferred<MakeVertexResult<G>>(),
    deferred<MakeVertexResult<G>>(),
  ];
  const calls: unknown[] = [];
  const runner = new AsyncDagTraversal<G>({
    concurrency: 2,
    traversableGraph: {
      makeRoot: () => ({
        vertexId: 'root',
        dependsOn: [0, 1, 2],
        vertexContent: { $d: 'root', $c: [] },
      }),
      makeVertex: () => ({ vertexContent: null }),
      resolvePrerequisite: (id) => {
        calls.push(id);
        return gates[id as number]!.promise;
      },
    },
  }).makeRunner();
  const running = runner.run();
  await eventLoopTurn();
  expect(calls).toEqual([0, 1]);
  expect(runner.inspect().inFlightCallbackCount).toBe(2);
  gates[0]!.resolve(found);
  await eventLoopTurn();
  expect(calls).toEqual([0, 1, 2]);
  gates[1]!.resolve(found);
  gates[2]!.resolve(found);
  await running;
  expect(runner.summary().counts.subtreeCompleted).toBe(4);
});

for (const error of [undefined, null, { rejected: true }]) {
  test(`stored async resolver rejection survives resume (${String(
    error,
  )})`, async () => {
    const gate = deferred<MakeVertexResult<G>>();
    const runner = new AsyncDagTraversal<G>({
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          dependsOn: ['external'],
          vertexContent: { $d: 'root', $c: [] },
        }),
        makeVertex: () => ({ vertexContent: null }),
        resolvePrerequisite: () => gate.promise,
      },
    }).makeRunner();
    const iterator = runner.getIterable({ iterateOver: [] });
    const next = iterator.next();
    await eventLoopTurn();
    await iterator.return(undefined);
    await next;
    gate.reject(error);
    await eventLoopTurn();
    expect(runner.getResolvedGraph().getVertexById('external')).toBeNull();
    await expect(runner.run()).rejects.toBe(error);
  });
}

test('fatal lookup failure invalidates queued and started sibling lookups', async () => {
  const first = deferred<MakeVertexResult<G>>();
  const second = deferred<MakeVertexResult<G>>();
  const calls: unknown[] = [];
  const error = {};
  const runner = new AsyncDagTraversal<G>({
    concurrency: 2,
    traversableGraph: {
      makeRoot: () => ({
        vertexId: 'root',
        dependsOn: ['a', 'b', 'c'],
        vertexContent: { $d: 'root', $c: [] },
      }),
      makeVertex: () => ({ vertexContent: null }),
      resolvePrerequisite: (id) => {
        calls.push(id);
        return id === 'a' ? first.promise : second.promise;
      },
    },
  }).makeRunner();
  const running = runner.run();
  const rejected = expect(running).rejects.toBe(error);
  await eventLoopTurn();
  first.reject(error);
  second.resolve(found);
  await rejected;
  expect(calls).toEqual(['a', 'b']);
  expect(runner.getResolvedGraph().getVertexRefs()).toHaveLength(1);
});

for (const lookupSource of [false, true]) {
  for (const reject of [false, true]) {
    test(`acceptance-triggered deletion invalidates consumer callbacks (${lookupSource}, ${reject})`, async () => {
      const acceptance = deferred<MakeVertexResult<G>>();
      const consumer = deferred<void>();
      const consumerEntered = deferred<void>();
      const traversal = new AsyncDagTraversal<G>({
        completedWork: new Set(['consumer']),
        concurrency: 4,
        traversableGraph: {
          makeRoot: () => ({
            vertexId: 'root',
            vertexContent: {
              $d: 'root',
              $c: ['dead', 'consumer', ...(lookupSource ? [] : ['external'])],
            },
          }),
          makeVertex: (id) =>
            id === 'external'
              ? acceptance.promise
              : {
                  vertexId: id,
                  dependsOn: id === 'consumer' ? ['external'] : [],
                  vertexContent: { $d: id, $c: [] },
                },
          ...(lookupSource
            ? { resolvePrerequisite: () => acceptance.promise }
            : {}),
        },
      });
      traversal.addVisitorFor(Order.ON_READY, (v) =>
        v.getData() === 'dead' ? removed : undefined,
      );
      traversal.addVisitorFor(Order.ON_COMPLETE, async (v) => {
        if (v.getData() === 'consumer') {
          consumerEntered.resolve();
          await consumer.promise;
        }
      });
      const runner = traversal.makeRunner();
      const running = runner.run();
      await consumerEntered.promise;
      acceptance.resolve({
        vertexId: 'external',
        dependsOn: ['dead'],
        vertexContent: { $d: 'external', $c: [] },
      });
      await eventLoopTurn();
      if (reject) consumer.reject(undefined);
      else consumer.resolve();
      await running;
      expect(
        runner
          .getResolvedGraph()
          .getVertexRefs()
          .map((ref) => ref.unref().getData()),
      ).toEqual(['root']);
      expect(runner.summary().counts.subtreeCompleted).toBe(1);
    });
  }
}

for (const omittedFirst of [false, true]) {
  test(`lookup races preserve first-accepted omission/content precedence (${omittedFirst})`, async () => {
    const second = deferred<MakeVertexResult<G>>();
    const runner = new AsyncDagTraversal<G>({
      discovery: 'eager',
      concurrency: 2,
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          dependsOn: ['loader', 'external'],
          vertexContent: { $d: 'root', $c: [] },
        }),
        makeVertex: (id) => ({
          vertexId: id,
          dependsOn: [],
          vertexContent: omittedFirst ? null : { $d: 'ordinary', $c: [] },
        }),
        resolvePrerequisite: (id) =>
          id === 'external'
            ? second.promise
            : { vertexContent: { $d: 'loader', $c: ['external'] } },
      },
    }).makeRunner();
    const running = runner.run();
    await eventLoopTurn();
    second.resolve(omittedFirst ? found : { vertexContent: null });
    if (omittedFirst) {
      await expect(running).rejects.toThrow(
        'Vertex omission conflicts with supplied content',
      );
      expect(runner.getResolvedGraph().getVertexById('external')).toBeNull();
    } else {
      await running;
      expect(
        runner.getResolvedGraph().getVertexById('external')!.unref().getData(),
      ).toBe('ordinary');
      expect(runner.summary().counts.subtreeCompleted).toBe(3);
    }
  });
}
