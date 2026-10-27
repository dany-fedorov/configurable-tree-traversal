import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { runnerInternals } from './internal-runner-fixtures';

type G = VertexTypes<string, string>;
for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} hides synthetic roots from visits, events and graph paths`, async () => {
    const traversal = new Constructor<G>({
      ...{ discovery: 'eager' as const, syntheticRoot: true },
      retainOriginalGraphStructure: true,
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'a',
            vertexContent: { $data: 'catalog', $childHints: ['a', 'b'] },
          },
        }),
        resolveChild: (hint) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: hint,
            vertexContent: { $data: hint, $childHints: [] },
          },
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
        expect(
          options.resolvedGraph.get(options.vertexRef)!.dependsOnWork,
        ).toEqual([]);
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
      runner.originalGraphView!,
    ]) {
      expect(graph.getRoot()).toBeNull();
      expect(
        graph.getVertexRefs().map((ref) => graph.getVertexId(ref)),
      ).toEqual(['a', 'b']);
      const a = graph.getVertexRefById('a')!;
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
            kind: 'found' as const,
            vertex: {
              vertexContent: { $data: 'catalog', $childHints: ['a', 'a'] },
            },
          }),
          resolveChild: (hint) => ({
            kind: 'found' as const,
            vertex: {
              ...(invalid === 'duplicate' ? { vertexId: hint } : {}),
              vertexContent: { $data: hint, $childHints: [] },
            },
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
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: { vertexContent: { $data: 'catalog', $childHints: [] } },
        }),
        resolveChild: () => ({
          satisfiesDependencies: true as const,
          kind: 'omitted' as const,
        }),
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
        retainOriginalGraphStructure: true,
        sortChildrenHints: (hints) => hints.slice(),
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found' as const,
            vertex: {
              vertexContent: {
                $data: 'catalog',
                $childHints: ['a', 'b', 'shared'],
              },
            },
          }),
          resolveChild: (hint, options) => {
            expect(options.resolvedGraph.getRoot()).toBeNull();
            resolved.push(hint);
            return {
              kind: 'found' as const,
              vertex: {
                vertexId: hint,
                dependsOnWork: [],
                vertexContent: {
                  $data: hint,
                  $childHints: hint === 'shared' ? [] : ['shared'],
                },
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
        runner.originalGraphView!,
      ]) {
        const shared = graph.getVertexRefById('shared')!;
        const a = graph.getVertexRefById('a')!;
        const b = graph.getVertexRefById('b')!;
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
      const shared = graph.getVertexRefById('shared')!;
      expect(
        graph
          .get(shared)!
          .incoming.map((edge) => graph.getVertexId(edge.parentRef)),
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
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexContent: { $data: 'catalog', $childHints: ['a', 'a'] },
          },
        }),
        getVertexIdFromHint: (hint) => ({ vertexId: hint }),
        resolveChild: () => ({
          kind: 'found' as const,
          vertex: { vertexContent: { $data: 'a', $childHints: [] } },
        }),
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
          kind: 'found' as const,
          vertex: {
            vertexContent: {
              $data: 'catalog',
              $childHints: ['source', 'a', 'b'],
            },
          },
        }),
        resolveChild: (hint) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: hint,
            dependsOnWork: hint === 'source' ? [] : [hint === 'a' ? 'b' : 'a'],
            vertexContent: { $data: hint, $childHints: [] },
          },
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
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: { vertexContent: { $data: 'catalog', $childHints: ['a'] } },
        }),
        resolveChild: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'a',
            vertexContent: { $data: 'a', $childHints: [] },
          },
        }),
      },
    }).createRunner();
    await runner.run();
    const graph = runner.getResolvedGraph();
    const internal =
      runnerInternals(runner).resolvedGraphsContainer.resolvedGraph;
    const hidden = internal.getRoot()!;
    expect(graph.get(hidden)).toBeNull();
    expect(graph.has(hidden)).toBe(false);
    expect(graph.getVertexRefById(internal.getVertexId(hidden))).toBeNull();
    expect(graph.getVertexRefById('absent')).toBeNull();
    expect(() => graph.getVertexId(hidden)).toThrow();
    expect(() => graph.getPathsTo(hidden)).toThrow();
    expect(graph.getParentsOf(hidden)).toBeNull();
    expect(graph.getChildrenOf(hidden)).toBeNull();
    expect(graph.getStatusOf(hidden)).toBeNull();
    const foreign = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: { vertexContent: { $data: 'foreign', $childHints: [] } },
        }),
        resolveChild: () => ({
          satisfiesDependencies: true as const,
          kind: 'omitted' as const,
        }),
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
        kind: 'found' as const,
        vertex: {
          vertexId: objectId,
          vertexContent: {
            $data: 'catalog',
            $childHints: ['0', '1', '2', '3', '4'],
          },
        },
      }),
      getVertexIdFromHint: async (hint) => ({ vertexId: ids[Number(hint)] }),
      resolveChild: async (hint) => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: hint, $childHints: [] } },
      }),
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
      .map((ref) => runner.getResolvedGraph().getVertexId(ref)),
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
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexContent: { $data: 'catalog', $childHints: ['a', 'b'] },
          },
        }),
        getVertexIdFromHint: () => ({ vertexId: id }),
        resolveChild: () => ({
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        }),
      },
    }).createRunner();
    expect(() => runner.run()).toThrow(/Duplicate catalog/);
  },
);
