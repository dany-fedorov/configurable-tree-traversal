import type { DagPrerequisiteResolution } from '../src/core/TraversableTree';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import type { TestGraph as G } from './helpers/graph-fixtures';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';
import {
  createInternalAsyncDagTraversalRunner,
  runnerInternals,
} from './internal-runner-fixtures';

const removed = { commands: [{ commandName: Command.DELETE_VERTEX as const }] };
const found = {
  kind: 'found' as const,
  vertex: { vertexContent: { $data: 'external', $childHints: [] } },
};

test('held lookup respects halt and iterator return, stores its reply and resumes once', async () => {
  const gate = deferred<DagPrerequisiteResolution<G>>();
  const entered = deferred<void>();
  const calls: unknown[] = [];
  const traversal = new AsyncDagTraversal<G>({
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'root',
          dependsOnWork: ['external'],
          vertexContent: { $data: 'root', $childHints: [] },
        },
      }),
      resolveChild: () => ({
        kind: 'omitted' as const,
        satisfiesDependencies: true as const,
      }),
      resolvePrerequisite: (id) => {
        calls.push(id);
        entered.resolve();
        return gate.promise;
      },
    },
  });
  const runner = traversal.createRunner();
  const iterator = runner.iterateEvents({ emitEvents: [] });
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
    createInternalAsyncDagTraversalRunner<G>({
      traversableGraph: {
        resolveRoot: () => ({
          satisfiesDependencies: true as const,
          kind: 'omitted' as const,
        }),
        resolveChild: () => ({
          satisfiesDependencies: true as const,
          kind: 'omitted' as const,
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
  expect(runner.getResolvedGraph().getVertexRefById('external')).toBeNull();
  expect(runner.summary()).toEqual(before);
  await runner.run();
  expect(calls).toEqual(['external']);
  expect(runner.summary().counts.subgraphCompleted).toBe(2);
});

for (const removeAll of [false, true]) {
  test(`shared lookup survives only while retained original declarations demand it (${removeAll})`, async () => {
    const lookup = deferred<DagPrerequisiteResolution<G>>();
    const entered = deferred<void>();
    const a = deferred<void>();
    const b = deferred<void>();
    const calls: unknown[] = [];
    const traversal = new AsyncDagTraversal<G>({
      completedWork: new Set(['a', 'b']),
      concurrency: 4,
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['a', 'b'] },
          },
        }),
        resolveChild: (id) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: id,
            dependsOnWork: ['external'],
            vertexContent: { $data: id, $childHints: [] },
          },
        }),
        resolvePrerequisite: (id) => {
          calls.push(id);
          entered.resolve();
          return lookup.promise;
        },
      },
    });
    traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, async (v) => {
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
    const runner = traversal.createRunner();
    const running = runner.run();
    await entered.promise;
    a.resolve();
    if (removeAll) b.resolve();
    await eventLoopTurn();
    lookup.resolve(found);
    if (!removeAll) b.resolve();
    await running;
    expect(calls).toEqual(['external']);
    expect(
      runner.getResolvedGraph().getVertexRefById('external') === null,
    ).toBe(removeAll);
    expect(runner.summary().counts.subgraphCompleted).toBe(removeAll ? 1 : 3);
  });
}

test('deleting the root invalidates held lookup errors without resurrecting detached work', async () => {
  const lookup = deferred<DagPrerequisiteResolution<G>>();
  const entered = deferred<void>();
  const remove = deferred<void>();
  const traversal = new AsyncDagTraversal<G>({
    completedWork: new Set(['root']),
    concurrency: 2,
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'root',
          dependsOnWork: ['external'],
          vertexContent: { $data: 'root', $childHints: [] },
        },
      }),
      resolveChild: () => ({
        kind: 'omitted' as const,
        satisfiesDependencies: true as const,
      }),
      resolvePrerequisite: () => {
        entered.resolve();
        return lookup.promise;
      },
    },
  });
  traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, async () => {
    await remove.promise;
    return removed;
  });
  const runner = traversal.createRunner();
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
    const second = deferred<DagPrerequisiteResolution<G>>();
    const calls: string[] = [];
    const events: string[] = [];
    const traversal = new AsyncDagTraversal<G>({
      discovery: 'eager',
      concurrency: 3,
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnWork: ['loader', 'external'],
            vertexContent: { $data: 'root', $childHints: [] },
          },
        }),
        ...(hinted
          ? { getVertexIdFromHint: (id: string) => ({ vertexId: id }) }
          : {}),
        resolveChild: (id) => {
          calls.push(id);
          return {
            kind: 'found' as const,
            vertex: {
              vertexId: id,
              dependsOnWork: [],
              vertexContent: { $data: 'ordinary', $childHints: [] },
            },
          };
        },
        resolvePrerequisite: (id) =>
          id === 'external'
            ? second.promise
            : Promise.resolve({
                kind: 'found' as const,
                vertex: {
                  vertexContent: { $data: 'loader', $childHints: ['external'] },
                },
              }),
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, (v) => {
      events.push(v.getData());
    });
    const runner = traversal.createRunner();
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
    deferred<DagPrerequisiteResolution<G>>(),
    deferred<DagPrerequisiteResolution<G>>(),
    deferred<DagPrerequisiteResolution<G>>(),
  ];
  const calls: unknown[] = [];
  const runner = new AsyncDagTraversal<G>({
    concurrency: 2,
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'root',
          dependsOnWork: [0, 1, 2],
          vertexContent: { $data: 'root', $childHints: [] },
        },
      }),
      resolveChild: () => ({
        kind: 'omitted' as const,
        satisfiesDependencies: true as const,
      }),
      resolvePrerequisite: (id) => {
        calls.push(id);
        return gates[id as number]!.promise;
      },
    },
  }).createRunner();
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
  expect(runner.summary().counts.subgraphCompleted).toBe(4);
});

for (const error of [undefined, null, { rejected: true }]) {
  test(`stored async resolver rejection survives resume (${String(
    error,
  )})`, async () => {
    const gate = deferred<DagPrerequisiteResolution<G>>();
    const runner = new AsyncDagTraversal<G>({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnWork: ['external'],
            vertexContent: { $data: 'root', $childHints: [] },
          },
        }),
        resolveChild: () => ({
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        }),
        resolvePrerequisite: () => gate.promise,
      },
    }).createRunner();
    const iterator = runner.iterateEvents({ emitEvents: [] });
    const next = iterator.next();
    await eventLoopTurn();
    await iterator.return(undefined);
    await next;
    gate.reject(error);
    await eventLoopTurn();
    expect(runner.getResolvedGraph().getVertexRefById('external')).toBeNull();
    await expect(runner.run()).rejects.toBe(error);
  });
}

test('fatal lookup failure invalidates queued and started sibling lookups', async () => {
  const first = deferred<DagPrerequisiteResolution<G>>();
  const second = deferred<DagPrerequisiteResolution<G>>();
  const calls: unknown[] = [];
  const error = {};
  const runner = new AsyncDagTraversal<G>({
    concurrency: 2,
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'root',
          dependsOnWork: ['a', 'b', 'c'],
          vertexContent: { $data: 'root', $childHints: [] },
        },
      }),
      resolveChild: () => ({
        kind: 'omitted' as const,
        satisfiesDependencies: true as const,
      }),
      resolvePrerequisite: (id) => {
        calls.push(id);
        return id === 'a' ? first.promise : second.promise;
      },
    },
  }).createRunner();
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
      const acceptance = deferred<import('../src').DagVertexResolution<G>>();
      const consumer = deferred<void>();
      const consumerEntered = deferred<void>();
      const traversal = new AsyncDagTraversal<G>({
        completedWork: new Set(['consumer']),
        concurrency: 4,
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found' as const,
            vertex: {
              vertexId: 'root',
              vertexContent: {
                $data: 'root',
                $childHints: [
                  'dead',
                  'consumer',
                  ...(lookupSource ? [] : ['external']),
                ],
              },
            },
          }),
          resolveChild: (id) =>
            id === 'external'
              ? acceptance.promise
              : {
                  kind: 'found' as const,
                  vertex: {
                    vertexId: id,
                    dependsOnWork: id === 'consumer' ? ['external'] : [],
                    vertexContent: { $data: id, $childHints: [] },
                  },
                },
          ...(lookupSource
            ? { resolvePrerequisite: () => acceptance.promise }
            : {}),
        },
      });
      traversal.addVisitorFor(Order.ON_WORK_READY, (v) =>
        v.getData() === 'dead' ? removed : undefined,
      );
      traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, async (v) => {
        if (v.getData() === 'consumer') {
          consumerEntered.resolve();
          await consumer.promise;
        }
      });
      const runner = traversal.createRunner();
      const running = runner.run();
      await consumerEntered.promise;
      acceptance.resolve({
        kind: 'found' as const,
        vertex: {
          vertexId: 'external',
          dependsOnWork: ['dead'],
          vertexContent: { $data: 'external', $childHints: [] },
        },
      });
      await eventLoopTurn();
      if (reject) consumer.reject(undefined);
      else consumer.resolve();
      await running;
      expect(
        runner
          .getResolvedGraph()
          .getVertexRefs()
          .map((ref) => ref.getValue().getData()),
      ).toEqual(['root']);
      expect(runner.summary().counts.subgraphCompleted).toBe(1);
    });
  }
}

for (const omittedFirst of [false, true]) {
  test(`lookup races preserve first-accepted omission/content precedence (${omittedFirst})`, async () => {
    const second = deferred<DagPrerequisiteResolution<G>>();
    const runner = new AsyncDagTraversal<G>({
      discovery: 'eager',
      concurrency: 2,
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnWork: ['loader', 'external'],
            vertexContent: { $data: 'root', $childHints: [] },
          },
        }),
        resolveChild: (id) =>
          omittedFirst
            ? { kind: 'omitted', vertexId: id, satisfiesDependencies: true }
            : {
                kind: 'found',
                vertex: {
                  vertexId: id,
                  dependsOnWork: [],
                  vertexContent: { $data: 'ordinary', $childHints: [] },
                },
              },
        resolvePrerequisite: (id) =>
          id === 'external'
            ? second.promise
            : {
                kind: 'found' as const,
                vertex: {
                  vertexContent: { $data: 'loader', $childHints: ['external'] },
                },
              },
      },
    }).createRunner();
    const running = runner.run();
    await eventLoopTurn();
    second.resolve(
      omittedFirst
        ? found
        : { kind: 'omitted' as const, satisfiesDependencies: true as const },
    );
    if (omittedFirst) {
      await expect(running).rejects.toThrow(
        'Vertex omission conflicts with supplied content',
      );
      expect(runner.getResolvedGraph().getVertexRefById('external')).toBeNull();
    } else {
      await running;
      expect(
        runner
          .getResolvedGraph()
          .getVertexRefById('external')!
          .getValue()
          .getData(),
      ).toBe('ordinary');
      expect(runner.summary().counts.subgraphCompleted).toBe(3);
    }
  });
}
