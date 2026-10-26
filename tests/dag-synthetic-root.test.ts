import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import type { VertexTypes } from '../src/core/TreeTypeParameters';

type G = VertexTypes<string, string>;
for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} hides synthetic roots from visits, events and graph paths`, async () => {
    const traversal = new Constructor<G>({
      ...{ discovery: 'eager' as const, syntheticRoot: true },
      saveNotMutatedResolvedGraph: true,
      traversableGraph: {
        resolveRoot: () => ({
          vertexId: 'a',
          vertexContent: { $d: 'catalog', $c: ['a', 'b'] },
        }),
        resolveChild: (hint) => ({
          vertexId: hint,
          vertexContent: { $d: hint, $c: [] },
        }),
      },
    });
    const seen: string[] = [];
    for (const order of [Order.ON_WORK_READY, Order.ON_SUBGRAPH_READY])
      traversal.addVisitorFor(order, (vertex, options) => {
        seen.push(vertex.getData());
        expect(options.isGraphRoot).toBe(false);
        expect(options.isTraversalRoot).toBe(false);
        expect(options.resolvedGraph.getRoot()).toBeNull();
        expect(options.resolvedGraph.get(options.vertexRef)!.dependsOnWork).toEqual(
          [],
        );
        expect(options.resolvedGraph.get(options.vertexRef)!.incoming).toEqual(
          [],
        );
      });
    const runner = traversal.createRunner();
    const events: string[] = [];
    for await (const event of runner.iterateEvents())
      events.push(event.vertex.getData());
    expect(events.sort()).toEqual(['a', 'a', 'b', 'b']);
    expect(seen.sort()).toEqual(events);
    for (const graph of [
      runner.getResolvedGraph(),
      runner.notMutatedResolvedGraph!,
    ]) {
      expect(graph.getRoot()).toBeNull();
      expect(graph.getVertexRefs().map((ref) => graph.getIdOf(ref))).toEqual([
        'a',
        'b',
      ]);
      const a = graph.getVertexById('a')!;
      expect(graph.getParentsOf(a)).toEqual([]);
      expect(graph.getPathsTo(a)).toEqual([[a]]);
      expect(graph.getPathsTo(a, { noRoot: true })).toEqual([[a]]);
      expect(graph.getPathsTo(a, { noSelf: true })).toEqual([[]]);
    }
  });

  test.each(['duplicate', 'anonymous'])(
    `${Constructor.name} rejects %s catalog entries`,
    async (invalid) => {
      const traversal = new Constructor<G>({
        ...{ discovery: 'eager' as const, syntheticRoot: true },
        traversableGraph: {
          resolveRoot: () => ({
            vertexContent: { $d: 'catalog', $c: ['a', 'a'] },
          }),
          resolveChild: (hint) => ({
            ...(invalid === 'duplicate' ? { vertexId: hint } : {}),
            vertexContent: { $d: hint, $c: [] },
          }),
        },
      });
      await expect(async () => {
        await traversal.createRunner().run();
      }).rejects.toThrow(/catalog/i);
    },
  );

  test(`${Constructor.name} empty catalog produces no events`, async () => {
    const runner = new Constructor<G>({
      ...{ syntheticRoot: true },
      traversableGraph: {
        resolveRoot: () => ({ vertexContent: { $d: 'catalog', $c: [] } }),
        resolveChild: () => ({ vertexContent: null }),
      },
    }).createRunner();
    const events = [];
    for await (const event of runner.iterateEvents()) events.push(event);
    expect(events).toEqual([]);
    expect(runner.getResolvedGraph().getVertexRefs()).toEqual([]);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test.each([false, true])(
    `${Constructor.name} preserves shared descendants with hint identity %s`,
    async (identify) => {
      const resolved: string[] = [];
      const traversal = new Constructor<G>({
        syntheticRoot: true,
        discovery: 'eager',
        saveNotMutatedResolvedGraph: true,
        sortChildrenHints: (hints) => hints.slice(),
        traversableGraph: {
          resolveRoot: () => ({
            vertexContent: { $d: 'catalog', $c: ['a', 'b', 'shared'] },
          }),
          resolveChild: (hint, options) => {
            expect(options.resolvedGraph.getRoot()).toBeNull();
            resolved.push(hint);
            return {
              vertexId: hint,
              dependsOnWork: [],
              vertexContent: {
                $d: hint,
                $c: hint === 'shared' ? [] : ['shared'],
              },
            };
          },
          ...(identify
            ? { getVertexIdFromHint: (hint: string) => ({ vertexId: hint }) }
            : {}),
        },
      });
      const runner = traversal.createRunner();
      await runner.run();
      expect(resolved.filter((id) => id === 'shared').length).toBe(
        identify ? 1 : 3,
      );
      for (const graph of [
        runner.getResolvedGraph(),
        runner.notMutatedResolvedGraph!,
      ]) {
        const shared = graph.getVertexById('shared')!;
        const a = graph.getVertexById('a')!;
        const b = graph.getVertexById('b')!;
        expect(graph.getParentsOf(shared)).toEqual([a, b]);
        expect(graph.getChildrenOf(a)).toEqual([shared]);
        expect(graph.getPathsTo(shared)).toEqual([
          [a, shared],
          [b, shared],
        ]);
        expect(
          graph.getPathsTo(shared, { noSelf: true, noRoot: true }),
        ).toEqual([[a], [b]]);
      }
      const graph = runner.getResolvedGraph();
      const shared = graph.getVertexById('shared')!;
      expect(
        graph
          .get(shared)!
          .incoming.map((edge) => graph.getIdOf(edge.parentRef)),
      ).toEqual(['a', 'b']);
      expect(graph.has(shared)).toBe(true);
      expect(graph.getStatusOf(shared)).toBe('COMPLETE');
    },
  );

  test(`${Constructor.name} duplicate identified catalog entries fail before any work`, async () => {
    let visited = false;
    const traversal = new Constructor<G>({
      syntheticRoot: true,
      discovery: 'eager',
      traversableGraph: {
        resolveRoot: () => ({ vertexContent: { $d: 'catalog', $c: ['a', 'a'] } }),
        getVertexIdFromHint: (hint) => ({ vertexId: hint }),
        resolveChild: () => ({ vertexContent: { $d: 'a', $c: [] } }),
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, () => {
      visited = true;
    });
    await expect(async () => {
      await traversal.createRunner().run();
    }).rejects.toThrow(/catalog/);
    expect(visited).toBe(false);
  });

  test(`${Constructor.name} disconnected seeded catalog cycles fail before visitors`, async () => {
    let visited = false;
    const traversal = new Constructor<G>({
      syntheticRoot: true,
      discovery: 'eager',
      completedWork: new Set(['a', 'b']),
      traversableGraph: {
        resolveRoot: () => ({
          vertexContent: { $d: 'catalog', $c: ['source', 'a', 'b'] },
        }),
        resolveChild: (hint) => ({
          vertexId: hint,
          dependsOnWork: hint === 'source' ? [] : [hint === 'a' ? 'b' : 'a'],
          vertexContent: { $d: hint, $c: [] },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, () => {
      visited = true;
    });
    await expect(async () => {
      await traversal.createRunner().run();
    }).rejects.toMatchObject({
      diagnostics: { dependencyCycleComponents: [['a', 'b']] },
    });
    expect(visited).toBe(false);
  });

  test(`${Constructor.name} synthetic views reject hidden and unknown references`, async () => {
    const runner = new Constructor<G>({
      syntheticRoot: true,
      traversableGraph: {
        resolveRoot: () => ({ vertexContent: { $d: 'catalog', $c: ['a'] } }),
        resolveChild: () => ({
          vertexId: 'a',
          vertexContent: { $d: 'a', $c: [] },
        }),
      },
    }).createRunner();
    await runner.run();
    const graph = runner.getResolvedGraph();
    const internal = runner.resolvedGraphsContainer.resolvedGraph;
    const hidden = internal.getRoot()!;
    expect(graph.get(hidden)).toBeNull();
    expect(graph.has(hidden)).toBe(false);
    expect(graph.getVertexById(internal.getIdOf(hidden))).toBeNull();
    expect(graph.getVertexById('absent')).toBeNull();
    expect(() => graph.getIdOf(hidden)).toThrow();
    expect(() => graph.getPathsTo(hidden)).toThrow();
    expect(graph.getParentsOf(hidden)).toBeNull();
    expect(graph.getChildrenOf(hidden)).toBeNull();
    expect(graph.getStatusOf(hidden)).toBeNull();
    const foreign = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => ({ vertexContent: { $d: 'foreign', $c: [] } }),
        resolveChild: () => ({ vertexContent: null }),
      },
    }).createRunner();
    await foreign.run();
    const unknown = foreign.getResolvedGraph().getRoot()!;
    expect(graph.get(unknown)).toBeNull();
    expect(graph.has(unknown)).toBe(false);
    expect(graph.getParentsOf(unknown)).toBeNull();
    expect(graph.getChildrenOf(unknown)).toBeNull();
    expect(graph.getStatusOf(unknown)).toBeNull();
  });
}

test('synthetic catalog preserves arbitrary IDs without freezing or consuming its supplied ID', async () => {
  const objectId = { mutable: true };
  const ids = [undefined, null, NaN, objectId, Symbol('real')];
  const traversal = new AsyncDagTraversal<G>({
    syntheticRoot: true,
    discovery: 'eager',
    completedWork: new Set(ids),
    traversableGraph: {
      resolveRoot: async () => ({
        vertexId: objectId,
        vertexContent: { $d: 'catalog', $c: ['0', '1', '2', '3', '4'] },
      }),
      getVertexIdFromHint: async (hint) => ({ vertexId: ids[Number(hint)] }),
      resolveChild: async (hint) => ({ vertexContent: { $d: hint, $c: [] } }),
    },
  });
  const seen: string[] = [];
  traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
    seen.push(vertex.getData());
  });
  const runner = traversal.createRunner();
  await runner.run();
  expect(seen).toEqual([]);
  expect(
    runner
      .getResolvedGraph()
      .getVertexRefs()
      .map((ref) => runner.getResolvedGraph().getIdOf(ref)),
  ).toEqual(ids);
  expect(Object.isFrozen(objectId)).toBe(false);
});

test.each([undefined, null, NaN])(
  'catalog rejects duplicate SameValueZero IDs %s',
  (id) => {
    const runner = new DagTraversal<G>({
      syntheticRoot: true,
      discovery: 'eager',
      traversableGraph: {
        resolveRoot: () => ({ vertexContent: { $d: 'catalog', $c: ['a', 'b'] } }),
        getVertexIdFromHint: () => ({ vertexId: id }),
        resolveChild: () => ({ vertexContent: null }),
      },
    }).createRunner();
    expect(() => runner.run()).toThrow(/Duplicate catalog/);
  },
);
