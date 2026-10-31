import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import type { VertexTypes } from '../src/core/TreeTypeParameters';

type G = VertexTypes<string, string>;
for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} exposes atomic readiness separately from committed events`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'a',
            vertexContent: { $data: 'a', $childHints: ['b'] },
          },
        }),
        resolveChild: (id) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: id,
            dependsOnWork: ['a'],
            vertexContent: { $data: id, $childHints: [] },
          },
        }),
      },
      workCompletion: 'externalSettlement',
    }).createRunner();
    await runner.prepare();
    expect(runner.summary().awaitingSettlement).toEqual([]);
    await runner.run({ emitEvents: [] });
    const first = runner.summary().awaitingSettlement;
    expect(first).toEqual([{ vertexId: 'a', generation: expect.any(Symbol) }]);
    expect(runner.summary().completedWorkIds).toEqual([]);
    expect(runner.summary().readyOrDeferredIds).toEqual(['a']);
    expect(runner.summary().deferredWorkIds).toEqual(['a']);
    expect(runner.summary().activeVisitorVertexIds).toEqual([]);
    expect(runner.summary().counts).toMatchObject({
      readyOrDeferred: 1,
      deferredWork: 1,
      activeVisitorVertices: 0,
    });
    expect(
      runner.settle(
        first[0]!.vertexId,
        { kind: 'workCompleted' },
        first[0]!.generation,
      ),
    ).toBe(true);
    expect(runner.summary().awaitingSettlement).toEqual([]);
    // Successful settlement commits W immediately.
    expect(runner.summary().completedWorkIds).toEqual(['a']);
    expect(runner.summary().deferredWorkIds).toEqual([]);
    expect(runner.summary().readyOrDeferredIds).toEqual(['b']);
    expect(runner.summary().vertices.get('a')).toMatchObject({
      vertexId: 'a',
      work: 'completed',
      subgraphComplete: false,
    });
    const events = [];
    for await (const event of runner.iterateEvents({
      emitEvents: ['workCompleted', 'subgraphCompleted'],
    }))
      events.push(event.kind);
    // Settlement records W independently of the old selector; delivery selects it now.
    expect(events).toEqual(['workCompleted']);
    expect(
      runner.summary().awaitingSettlement.map((work) => work.vertexId),
    ).toEqual(['b']);
    const second = runner.summary().awaitingSettlement[0]!;
    runner.settle(
      second.vertexId,
      { kind: 'workCompleted' },
      second.generation,
    );
    for await (const event of runner.iterateEvents()) events.push(event.kind);
    expect(events).toEqual([
      'workCompleted',
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
          resolveRoot: () => ({
            kind: 'found' as const,
            vertex: {
              vertexContent: {
                $data: 'hidden',
                $childHints: ['0', '1', '2', '3'],
              },
            },
          }),
          resolveChild: (index) => ({
            kind: 'found' as const,
            vertex: {
              vertexId: ids[Number(index)],
              vertexContent: { $data: index, $childHints: [] },
            },
          }),
        },
        workCompletion: 'externalSettlement',
      }).createRunner();
      expect(runner.summary().awaitingSettlement).toEqual([]);
      await runner.run({ emitEvents: [], visitorPhases: { include: [] } });
      const snapshot = runner.summary().awaitingSettlement;
      expect(snapshot.map((work) => work.vertexId)).toEqual(ids);
      expect(new Set(snapshot.map((work) => work.generation)).size).toBe(4);
      expect(snapshot[0]!.vertexId).toBe(objectId);
      const original = { ...snapshot[0]! };
      Object.assign(snapshot[0]!, {
        vertexId: 'tampered',
        generation: Symbol('tampered'),
      });
      expect(runner.summary().awaitingSettlement[0]).toEqual(original);
      expect(
        runner.settle(
          original.vertexId,
          { kind: 'workCompleted' },
          original.generation,
        ),
      ).toBe(true);
      expect(
        runner.summary().awaitingSettlement.map((work) => work.vertexId),
      ).toEqual(ids.slice(1));
      for (const work of runner.summary().awaitingSettlement)
        runner.settle(
          work.vertexId,
          { kind: 'workCompleted' },
          work.generation,
        );
      await runner.run();
      expect(runner.summary().awaitingSettlement).toEqual([]);
      expect(runner.getStopReason()).toBe('finished');
      expect(Object.isFrozen(objectId)).toBe(false);
    });
  }

  test(`${Constructor.name} rejected work is no longer in the unsettled frontier`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'a',
            vertexContent: { $data: 'a', $childHints: [] },
          },
        }),
        resolveChild: () => ({
          identity: null,
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        }),
      },
      workCompletion: 'externalSettlement',
    }).createRunner();
    await runner.run();
    const work = runner.summary().awaitingSettlement[0]!;
    runner.settle(
      work.vertexId,
      { kind: 'traversalFailed', error: null },
      work.generation,
    );
    expect(runner.summary().awaitingSettlement).toEqual([]);
    // Accepted failure leaves W uncommitted but removes dispatch eligibility.
    expect(runner.summary().deferredWorkIds).toEqual(['a']);
    expect(runner.summary().readyOrDeferredIds).toEqual(['a']);
    expect(runner.summary().activeVisitorVertexIds).toEqual([]);
    expect(runner.summary().completedWorkIds).toEqual([]);
    expect(runner.summary().vertices.get('a')).toMatchObject({
      vertexId: 'a',
      work: 'deferred',
      subgraphComplete: false,
    });
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
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'a',
          vertexContent: { $data: 'a', $childHints: ['b'] },
        },
      }),
      resolveChild: () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'b',
          vertexContent: { $data: 'b', $childHints: [] },
        },
      }),
    },
    workCompletion: 'externalSettlement',
  })
    .addVisitorFor(Order.ON_WORK_READY, async () => {
      entered();
      await gate;
    })
    .createRunner();
  const running = runner.run();
  await started;
  expect(runner.summary().activeVisitorVertexIds).toEqual(['a']);
  expect(runner.summary().readyOrDeferredIds).toEqual(['b']);
  expect(runner.summary().awaitingSettlement).toEqual([]);
  release();
  await running;
  expect(
    runner.summary().awaitingSettlement.map((work) => work.vertexId),
  ).toEqual(['a', 'b']);
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} explicit deferral emits committed events and excludes deletion`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            vertexContent: {
              $data: 'root',
              $childHints: ['deleted', 'deferred'],
            },
          },
        }),
        resolveChild: (id) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: id,
            vertexContent: { $data: id, $childHints: [] },
          },
        }),
      },
    })
      .addVisitorFor(Order.ON_WORK_READY, (vertex) => {
        if (vertex.getData() === 'deleted')
          return {
            commands: [{ commandName: Command.DELETE_DAG_VERTEX_CASCADE }],
          };
        if (vertex.getData() === 'deferred')
          return { commands: [{ commandName: Command.DEFER_WORK_COMPLETION }] };
        return undefined;
      })
      .createRunner();
    const events = [];
    for await (const event of runner.iterateEvents())
      events.push([event.vertex.getData(), event.kind]);
    expect(events).toEqual([['root', 'workCompleted']]);
    expect(
      runner.summary().awaitingSettlement.map((work) => work.vertexId),
    ).toEqual(['deferred']);
    const work = runner.summary().awaitingSettlement[0]!;
    runner.settle(work.vertexId, { kind: 'workCompleted' }, work.generation);
    for await (const event of runner.iterateEvents()) {
      events.push([event.vertex.getData(), event.kind]);
    }
    expect(events).toEqual([
      ['root', 'workCompleted'],
      ['deferred', 'workCompleted'],
      ['deferred', 'subgraphCompleted'],
      ['root', 'subgraphCompleted'],
    ]);
    expect(runner.summary().awaitingSettlement).toEqual([]);
  });
}
