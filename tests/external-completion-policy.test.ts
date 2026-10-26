import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalOrder as Order,
} from '../src/traversals/dag-traversal';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';
import type { VertexTypes } from '../src/core/TreeTypeParameters';

type G = VertexTypes<string, string>;
const catalog = {
  resolveRoot: () => ({ vertexContent: { $data: '', $childHints: ['A', 'B'] } }),
  resolveChild: (id: string) => ({
    vertexId: id,
    dependsOn: id === 'B' ? ['A'] : [],
    vertexContent: { $data: id, $childHints: [] },
  }),
};
const external = { workCompletion: 'externalSettlement' as const };

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test.each(['lazy', 'eager'] as const)(
    `${Constructor.name} empty %s frontier requires guarded settlement`,
    async (discovery) => {
      const runner = new Constructor<G>({
        traversableGraph: catalog,
        syntheticRoot: true,
        discovery,
        ...external,
      }).createRunner();
      await runner.run();
      expect(runner.summary().completedWorkIds).toEqual([]);
      expect(runner.summary().deferredIds).toEqual(['A']);
      expect(runner.getStopReason()).toBe('awaitingSettlement');
      expect(runner.summary().vertices.get('B')!.work).toBe('pending');
      const generation = runner.summary().vertices.get('A')!.generation!;
      expect(() =>
        runner.settle('A', { kind: 'workCompleted' }, Symbol()),
      ).toThrow();
      runner.settle('A', { kind: 'workCompleted' }, generation);
      expect(runner.getStopReason()).toBe('awaitingSettlement');
      await runner.run();
      expect(runner.summary().completedWorkIds).toEqual(['A']);
      expect(runner.summary().deferredIds).toEqual(['B']);
      runner.settle(
        'B',
        { kind: 'workCompleted' },
        runner.summary().vertices.get('B')!.generation!,
      );
      await runner.run();
      expect(runner.summary().completedSubtreeIds).toEqual(['A', 'B']);
    },
  );

  test(`${Constructor.name} tree source defers parent work before admitting children`, async () => {
    const runner = new Constructor<G>({
      traversableTree: {
        resolveRoot: () => ({ vertexContent: { $data: 'A', $childHints: ['B'] } }),
        resolveChild: () => ({ vertexContent: { $data: 'B', $childHints: [] } }),
      },
      ...external,
    }).createRunner();
    await runner.run();
    expect(runner.summary().completedWorkIds).toEqual([]);
    expect(runner.summary().deferredIds).toHaveLength(1);
    const first = runner.summary().deferredIds[0];
    runner.settle(
      first,
      { kind: 'workCompleted' },
      runner.summary().vertices.get(first)!.generation!,
    );
    await runner.run();
    expect(runner.summary().completedWorkIds).toEqual([first]);
    expect(runner.summary().deferredIds).toHaveLength(1);
  });

  test(`${Constructor.name} external completion commits callbacks and commands before deferral`, async () => {
    const seen: string[] = [];
    const traversal = new Constructor<G>({
      traversableGraph: catalog,
      syntheticRoot: true,
      discovery: 'eager',
      ...external,
    });
    traversal.addVisitorFor(
      Order.ON_READY,
      (vertex) => {
        seen.push(vertex.getData());
        return {
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'committed' },
            },
          ],
        };
      },
      { commandCommitMode: 'afterGroup' },
    );
    const runner = traversal.createRunner();
    await runner.run();
    expect(seen).toEqual(['A']);
    expect(runner.summary().completedWorkIds).toEqual([]);
    const id = runner.summary().deferredIds[0];
    runner.settle(
      id,
      { kind: 'workCompleted' },
      runner.summary().vertices.get(id)!.generation!,
    );
    const events: string[] = [];
    for await (const event of runner.getIterable())
      events.push(`${event.order}:${event.vertex.getData()}`);
    expect(events).toContain('ON_READY:committed');
    expect(seen).toEqual(['A', 'B']);
  });

  test(`${Constructor.name} filtered callbacks cannot complete external work and seeds stay completed`, async () => {
    const traversal = new Constructor<G>({
      traversableGraph: catalog,
      syntheticRoot: true,
      discovery: 'eager',
      completedWork: new Set(['A']),
      ...external,
    });
    traversal.addVisitorFor(Order.ON_READY, () => {
      throw new Error('filtered callback ran');
    });
    const runner = traversal.createRunner();
    await runner.run({ visitorPhases: { include: [] } });
    expect(runner.summary().completedWorkIds).toEqual(['A']);
    expect(runner.summary().deferredIds).toEqual(['B']);
  });

  test(`${Constructor.name} rejects invalid completion policies before execution and preserves configure state`, () => {
    const invalid = { workCompletion: 'invalid' as 'visitorReturn' };
    expect(
      () => new Constructor<G>({ traversableGraph: catalog, ...invalid }),
    ).toThrow(TypeError);
    const traversal = new Constructor<G>({
      traversableGraph: catalog,
      ...external,
    });
    expect(() =>
      traversal.configure({ ...invalid, discovery: 'eager' }),
    ).toThrow(TypeError);
    expect(traversal.icfg.workCompletion).toBe('externalSettlement');
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} explicit deferral retains exclusive early-chain semantics in external mode`, async () => {
    const traversal = new Constructor<G>({
      traversableGraph: catalog,
      syntheticRoot: true,
      ...external,
    });
    traversal.addVisitorFor(
      Order.ON_READY,
      () => ({
        commands: [
          {
            commandName: Command.REWRITE_VERTEX_DATA,
            commandArguments: { newData: 'discarded' },
          },
        ],
      }),
      { commandCommitMode: 'afterGroup' },
    );
    traversal.addVisitorFor(
      Order.ON_READY,
      () => ({ commands: [{ commandName: Command.DEFER_READY }] }),
      { commandCommitMode: 'afterGroup' },
    );
    traversal.addVisitorFor(Order.ON_READY, () => {
      throw new Error('must skip later callback');
    });
    const runner = traversal.createRunner();
    await runner.run();
    const generation = runner.summary().vertices.get('A')!.generation!;
    await runner.run();
    expect(runner.summary().vertices.get('A')!.generation).toBe(generation);
    runner.settle('A', { kind: 'workCompleted' }, generation);
    const events: string[] = [];
    for await (const event of runner.getIterable())
      events.push(`${event.order}:${event.vertex.getData()}`);
    expect(events).toEqual(['ON_READY:A', 'ON_COMPLETE:A']);
    expect(runner.summary().deferredIds).toEqual(['B']);
    expect(runner.settle('A', { kind: 'workCompleted' }, generation)).toBe(
      false,
    );
  });

  test(`${Constructor.name} external W and C joins require their distinct milestones`, async () => {
    const traversal = new Constructor<G>({
      discovery: 'eager',
      syntheticRoot: true,
      ...external,
      traversableGraph: {
        resolveRoot: () => ({
          vertexContent: { $data: '', $childHints: ['A', 'W', 'C'] },
        }),
        resolveChild: (id) => ({
          vertexId: id,
          dependsOn: id === 'W' ? ['A'] : [],
          dependsOnComplete: id === 'C' ? ['A'] : [],
          vertexContent: {
            $data: id,
            $childHints: id === 'A' ? ['child'] : [],
          },
        }),
      },
    });
    const runner = traversal.createRunner();
    const settle = (id: string) =>
      runner.settle(
        id,
        { kind: 'workCompleted' },
        runner.summary().vertices.get(id)!.generation!,
      );
    await runner.run();
    expect(runner.summary().deferredIds).toEqual(['A', 'child']);
    settle('A');
    await runner.run();
    expect(runner.summary().deferredIds).toEqual(['W', 'child']);
    expect(runner.summary().vertices.get('C')!.work).toBe('pending');
    expect(runner.summary().vertices.get('A')!.subtreeComplete).toBe(false);
    settle('child');
    await runner.run();
    expect(runner.summary().vertices.get('A')!.subtreeComplete).toBe(true);
    expect(runner.summary().deferredIds).toEqual(['W', 'C']);
    settle('W');
    settle('C');
    await runner.run();
    expect(runner.getStopReason()).toBe('finished');
  });

  test(`${Constructor.name} halt preserves a normal command continuation before external deferral`, async () => {
    const seen: string[] = [];
    const traversal = new Constructor<G>({
      traversableGraph: catalog,
      syntheticRoot: true,
      ...external,
    });
    traversal.addVisitorFor(Order.ON_READY, (vertex) => ({
      commands: [
        {
          commandName: Command.REWRITE_VERTEX_DATA,
          commandArguments: { newData: vertex.getData() + '!' },
        },
        { commandName: Command.HALT_TRAVERSAL },
      ],
    }));
    traversal.addVisitorFor(Order.ON_READY, (vertex) => {
      seen.push(vertex.getData());
    });
    const runner = traversal.createRunner();
    await runner.run();
    expect(runner.getStopReason()).toBe('paused');
    expect(runner.summary().deferredIds).toEqual([]);
    expect(runner.summary().completedWorkIds).toEqual([]);
    await runner.run();
    expect(seen).toEqual(['A!']);
    expect(runner.summary().deferredIds).toEqual(['A']);
    expect(runner.getStopReason()).toBe('awaitingSettlement');
  });

  test(`${Constructor.name} deleted external work never receives a deferred generation`, async () => {
    const traversal = new Constructor<G>({
      traversableGraph: catalog,
      syntheticRoot: true,
      ...external,
    });
    traversal.addVisitorFor(Order.ON_READY, () => ({
      commands: [{ commandName: Command.DELETE_VERTEX }],
    }));
    const runner = traversal.createRunner();
    await runner.run();
    expect(runner.summary().deferredIds).toEqual([]);
    expect(runner.summary().vertices.size).toBe(0);
    expect(runner.getStopReason()).toBe('finished');
  });

  test.each([undefined, null, NaN, { cause: 'external' }])(
    `${Constructor.name} external failure settlement preserves exact error %p`,
    async (error) => {
      const runner = new Constructor<G>({
        traversableGraph: catalog,
        syntheticRoot: true,
        ...external,
      }).createRunner();
      await runner.run();
      runner.settle(
        'A',
        { kind: 'traversalFailed', error },
        runner.summary().vertices.get('A')!.generation!,
      );
      expect(runner.getStopReason()).toBe('failed');
      expect(runner.inspect().stopReason).toBe('failed');
      await expect(async () => {
        await runner.run();
      }).rejects.toBe(error);
    },
  );
}

test('async external settlement frees logical chain capacity while a physical callback remains active', async () => {
  const release = deferred<void>();
  const seen: string[] = [];
  const traversal = new AsyncDagTraversal<G>({
    concurrency: 2,
    discovery: 'eager',
    syntheticRoot: true,
    ...external,
    traversableGraph: {
      ...catalog,
      resolveRoot: () => ({
        vertexContent: { $data: '', $childHints: ['A', 'busy', 'B'] },
      }),
    },
  });
  traversal.addVisitorFor(Order.ON_READY, (vertex) => {
    seen.push(vertex.getData());
    return vertex.getData() === 'busy' ? release.promise : undefined;
  });
  const runner = traversal.createRunner();
  const running = runner.run();
  await eventLoopTurn();
  expect(seen).toEqual(['A', 'busy']);
  expect(runner.getStopReason()).toBeNull();
  runner.settle(
    'A',
    { kind: 'workCompleted' },
    runner.summary().vertices.get('A')!.generation!,
  );
  await eventLoopTurn();
  expect(seen).toEqual(['A', 'busy', 'B']);
  expect(runner.inspect().inFlightCallbackCount).toBe(1);
  expect(runner.getStopReason()).toBeNull();
  release.resolve();
  await running;
  expect(runner.summary().deferredIds).toEqual(['busy', 'B']);
  expect(runner.getStopReason()).toBe('awaitingSettlement');
});

test('external async close drains callbacks before recording pause and retains generations through settlement', async () => {
  const release = deferred<void>();
  const traversal = new AsyncDagTraversal<G>({
    concurrency: 2,
    discovery: 'eager',
    syntheticRoot: true,
    ...external,
    traversableGraph: {
      ...catalog,
      resolveRoot: () => ({
        vertexContent: { $data: '', $childHints: ['A', 'busy', 'B'] },
      }),
    },
  });
  traversal.addVisitorFor(Order.ON_READY, (vertex) =>
    vertex.getData() === 'busy' ? release.promise : undefined,
  );
  const runner = traversal.createRunner();
  const iterator = runner.getIterable();
  const pending = iterator.next();
  await eventLoopTurn();
  const generation = runner.summary().vertices.get('A')!.generation!;
  const closing = iterator.return();
  await eventLoopTurn();
  expect(runner.getStopReason()).toBeNull();
  expect(runner.inspect().inFlightCallbackCount).toBe(1);
  release.resolve();
  await closing;
  await pending;
  expect(runner.getStopReason()).toBe('paused');
  expect(runner.summary().vertices.get('A')!.generation).toBe(generation);
  runner.settle('A', { kind: 'workCompleted' }, generation);
  expect(runner.getStopReason()).toBe('paused');
  await runner.run();
  expect(runner.summary().deferredIds).toEqual(['busy', 'B']);
  expect(runner.getStopReason()).toBe('awaitingSettlement');
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} rejects an invalid retained policy before source execution`, () => {
    const traversal = new Constructor<G>({ traversableGraph: catalog });
    // JavaScript callers can mutate the advanced configuration record.
    Object.assign(traversal.icfg, { workCompletion: null });
    expect(() => traversal.createRunner()).toThrow(TypeError);
  });
}
