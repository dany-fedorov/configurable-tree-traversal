import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversalOrder as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';

type G = TreeTypeParameters<string, string>;
for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} exposes atomic readiness separately from committed events`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'a',
          vertexContent: { $data: 'a', $childHints: ['b'] },
        }),
        makeVertex: (id) => ({
          vertexId: id,
          dependsOn: ['a'],
          vertexContent: { $data: id, $childHints: [] },
        }),
      },
      workCompletion: 'externalSettlement',
    }).makeRunner();
    await runner.prepare();
    expect(runner.summary().deferredFrontier).toEqual([]);
    await runner.run({ emitPhases: [] });
    const first = runner.summary().deferredFrontier;
    expect(first).toEqual([{ vertexId: 'a', generation: expect.any(Symbol) }]);
    expect(runner.summary().completedWorkIds).toEqual([]);
    expect(
      runner.settle(
        first[0]!.vertexId,
        { kind: 'workCompleted' },
        first[0]!.generation,
      ),
    ).toBe(true);
    expect(runner.summary().deferredFrontier).toEqual([]);
    const events = [];
    for await (const event of runner.getIterable({
      emitPhases: [Order.ON_READY, Order.ON_COMPLETE],
    }))
      events.push(event.kind);
    // The first chain captured its suppressed event selection before settlement.
    expect(events).toEqual([]);
    expect(
      runner.summary().deferredFrontier.map((work) => work.vertexId),
    ).toEqual(['b']);
    const second = runner.summary().deferredFrontier[0]!;
    runner.settle(
      second.vertexId,
      { kind: 'workCompleted' },
      second.generation,
    );
    for await (const event of runner.getIterable()) events.push(event.kind);
    expect(events).toEqual([
      'workCompleted',
      'subgraphCompleted',
      'subgraphCompleted',
    ]);
    expect(first).toEqual([
      { vertexId: 'a', generation: first[0]!.generation },
    ]);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  for (const discovery of ['lazy', 'eager'] as const) {
    test(`${Constructor.name} ${discovery} frontier preserves opaque identity and discovery order`, async () => {
      const objectId = { identity: true };
      const ids = [objectId, Symbol('work'), undefined, NaN];
      const runner = new Constructor<G>({
        discovery,
        syntheticRoot: true,
        traversableGraph: {
          makeRoot: () => ({
            vertexContent: {
              $data: 'hidden',
              $childHints: ['0', '1', '2', '3'],
            },
          }),
          makeVertex: (index) => ({
            vertexId: ids[Number(index)],
            vertexContent: { $data: index, $childHints: [] },
          }),
        },
        workCompletion: 'externalSettlement',
      }).makeRunner();
      expect(runner.summary().deferredFrontier).toEqual([]);
      await runner.run({ emitPhases: [], visitorPhases: { include: [] } });
      const snapshot = runner.summary().deferredFrontier;
      expect(snapshot.map((work) => work.vertexId)).toEqual(ids);
      expect(new Set(snapshot.map((work) => work.generation)).size).toBe(4);
      expect(snapshot[0]!.vertexId).toBe(objectId);
      const original = { ...snapshot[0]! };
      Object.assign(snapshot[0]!, {
        vertexId: 'tampered',
        generation: Symbol('tampered'),
      });
      expect(runner.summary().deferredFrontier[0]).toEqual(original);
      expect(
        runner.settle(
          original.vertexId,
          { kind: 'workCompleted' },
          original.generation,
        ),
      ).toBe(true);
      expect(
        runner.summary().deferredFrontier.map((work) => work.vertexId),
      ).toEqual(ids.slice(1));
      for (const work of runner.summary().deferredFrontier)
        runner.settle(
          work.vertexId,
          { kind: 'workCompleted' },
          work.generation,
        );
      await runner.run();
      expect(runner.summary().deferredFrontier).toEqual([]);
      expect(runner.getStopReason()).toBe('finished');
      expect(Object.isFrozen(objectId)).toBe(false);
    });
  }

  test(`${Constructor.name} rejected work is no longer in the unsettled frontier`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'a',
          vertexContent: { $data: 'a', $childHints: [] },
        }),
        makeVertex: () => ({ vertexContent: null }),
      },
      workCompletion: 'externalSettlement',
    }).makeRunner();
    await runner.run();
    const work = runner.summary().deferredFrontier[0]!;
    runner.settle(
      work.vertexId,
      { kind: 'traversalFailed', error: null },
      work.generation,
    );
    expect(runner.summary().deferredFrontier).toEqual([]);
    await expect(async () => runner.prepare()).rejects.toBe(null);
  });
}

test('async frontier excludes running and queued work until chains defer', async () => {
  let release!: () => void;
  let entered!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const runner = new AsyncDagTraversal<G>({
    concurrency: 1,
    discovery: 'eager',
    traversableGraph: {
      makeRoot: () => ({
        vertexId: 'a',
        vertexContent: { $data: 'a', $childHints: ['b'] },
      }),
      makeVertex: () => ({
        vertexId: 'b',
        vertexContent: { $data: 'b', $childHints: [] },
      }),
    },
    workCompletion: 'externalSettlement',
  })
    .addVisitorFor(Order.ON_READY, async () => {
      entered();
      await gate;
    })
    .makeRunner();
  const running = runner.run();
  await started;
  expect(runner.summary().inFlightIds).toEqual(['a']);
  expect(runner.summary().readyIds).toEqual(['b']);
  expect(runner.summary().deferredFrontier).toEqual([]);
  release();
  await running;
  expect(
    runner.summary().deferredFrontier.map((work) => work.vertexId),
  ).toEqual(['a', 'b']);
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} explicit deferral emits committed events and excludes deletion`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          vertexContent: {
            $data: 'root',
            $childHints: ['deleted', 'deferred'],
          },
        }),
        makeVertex: (id) => ({
          vertexId: id,
          vertexContent: { $data: id, $childHints: [] },
        }),
      },
    })
      .addVisitorFor(Order.ON_READY, (vertex) => {
        if (vertex.getData() === 'deleted')
          return { commands: [{ commandName: Command.DELETE_VERTEX }] };
        if (vertex.getData() === 'deferred')
          return { commands: [{ commandName: Command.DEFER_READY }] };
        return undefined;
      })
      .makeRunner();
    const events = [];
    for await (const event of runner.getIterable())
      events.push([event.vertex.getData(), event.kind]);
    expect(events).toEqual([['root', 'workCompleted']]);
    expect(
      runner.summary().deferredFrontier.map((work) => work.vertexId),
    ).toEqual(['deferred']);
    const work = runner.summary().deferredFrontier[0]!;
    runner.settle(work.vertexId, { kind: 'workCompleted' }, work.generation);
    for await (const event of runner.getIterable()) {
      expect(event.kind).toBe(
        event.order === Order.ON_READY ? 'workCompleted' : 'subgraphCompleted',
      );
      events.push([event.vertex.getData(), event.kind]);
    }
    expect(events).toEqual([
      ['root', 'workCompleted'],
      ['deferred', 'workCompleted'],
      ['deferred', 'subgraphCompleted'],
      ['root', 'subgraphCompleted'],
    ]);
    expect(runner.summary().deferredFrontier).toEqual([]);
  });
}
