import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalOrder as Order,
} from '../src/traversals/dag-traversal';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';

const identities = [undefined, null, NaN, { name: 'task' }, Symbol('task')];

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test.each(identities)(
    `${Constructor.name} keeps exact event identity %p and committed phase timing`,
    async (id) => {
      type G = TreeTypeParameters<string, never>;
      const runner = new Constructor<G, G, typeof id>({
        workCompletion: 'externalSettlement',
        traversableGraph: {
          makeRoot: () => ({
            kind: 'found',
            vertex: {
              vertexId: id,
              vertexContent: { $data: 'task', $childHints: [] },
            },
          }),
          makeVertex: () => ({ kind: 'omitted', satisfiesDependencies: true }),
        },
      }).makeRunner();
      const before = [];
      for await (const event of runner.getIterable()) before.push(event);
      expect(before).toEqual([]);
      const record = runner.summary().deferredFrontier[0]!;
      runner.settle(id, { ok: true }, record.generation);
      const events = [];
      for await (const event of runner.getIterable()) {
        expect(event).toHaveProperty('vertexId');
        expect(event.vertexId).toBe(id);
        expect(event.vertexRef.unref()).toBe(event.vertex);
        expect(runner.getResolvedGraph().getVertexId(event.vertexRef)).toBe(id);
        events.push([event.kind, event.order]);
      }
      expect(events).toEqual([
        ['workCompleted', Order.ON_READY],
        ['subgraphCompleted', Order.ON_COMPLETE],
      ]);
    },
  );

  test(`${Constructor.name} seeded work emits only the selected completion event`, async () => {
    type G = TreeTypeParameters<string, never>;
    const runner = new Constructor<G, G, string>({
      completedWork: new Set(['task']),
      traversableGraph: {
        makeRoot: () => ({
          kind: 'found',
          vertex: {
            vertexId: 'task',
            vertexContent: { $data: 'task', $childHints: [] },
          },
        }),
        makeVertex: () => ({ kind: 'omitted', satisfiesDependencies: true }),
      },
    }).makeRunner();
    const events = [];
    for await (const event of runner.getIterable({
      emitPhases: [Order.ON_COMPLETE],
    })) {
      events.push([event.vertexId, event.kind, event.order]);
    }
    expect(events).toEqual([['task', 'subgraphCompleted', Order.ON_COMPLETE]]);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} tree-source events retain generated identity`, async () => {
    type G = TreeTypeParameters<string, never>;
    const runner = new Constructor<G>({
      traversableTree: {
        makeRoot: () => ({
          kind: 'found',
          vertex: { vertexContent: { $data: 'task', $childHints: [] } },
        }),
        makeVertex: () => ({ kind: 'omitted' }),
      },
    }).makeRunner();
    const ids = [];
    for await (const event of runner.getIterable()) {
      expect(event.vertexId).toBe(
        runner.getResolvedGraph().getVertexId(event.vertexRef),
      );
      ids.push(event.vertexId);
    }
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
  });
}
