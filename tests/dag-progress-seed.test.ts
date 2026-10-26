import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import type { DagDiscoverySource } from '../src/core/TraversableGraph';

type G = VertexTypes<string, string>;
const graph: DagDiscoverySource<G> = {
  resolveRoot: () => ({
    vertexId: 'root',
    vertexContent: { $d: 'root', $c: ['child'] },
  }),
  resolveChild: () => ({
    vertexId: 'child',
    vertexContent: { $d: 'child', $c: [] },
  }),
};
for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} seeded root expands without initial visitor`, async () => {
    const traversal = new Constructor<G>({
      traversableGraph: graph,
      ...{ completedWork: new Set(['root']) },
    });
    const seen: string[] = [];
    traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
      seen.push(vertex.getData());
    });
    await traversal.createRunner().run();
    expect(seen).toEqual(['child']);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} copies seeds at runner creation`, async () => {
    const completedWork = new Set(['root']);
    const traversal = new Constructor<G>({
      traversableGraph: graph,
      completedWork,
    });
    const seen: string[] = [];
    traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
      seen.push(vertex.getData());
    });
    const runner = traversal.createRunner();
    completedWork.clear();
    completedWork.add('child');
    await runner.run();
    expect(seen).toEqual(['child']);
  });

  test(`${Constructor.name} rejects unknown IDs without stringification`, async () => {
    const hostile = {
      toString: () => {
        throw new Error('stringified');
      },
    };
    const traversal = new Constructor<G>({
      traversableGraph: graph,
      completedWork: new Set([hostile]),
    });
    await expect(async () => {
      await traversal.createRunner().run();
    }).rejects.toThrow(TypeError);
  });

  test(`${Constructor.name} recognizes omitted seeds`, async () => {
    const traversal = new Constructor<G>({
      traversableGraph: {
        ...graph,
        resolveChild: () => ({ vertexId: 'child', vertexContent: null }),
      },
      completedWork: new Set(['child']),
    });
    await traversal.createRunner().run();
  });

  test(`${Constructor.name} rejects seeds on trees before callbacks`, () => {
    let calls = 0;
    const traversal = new Constructor<G>({
      traversableTree: {
        resolveRoot: () => {
          calls++;
          return { vertexContent: null };
        },
        resolveChild: () => ({ vertexContent: null }),
      },
      completedWork: new Set(),
    });
    expect(() => traversal.createRunner()).toThrow(TypeError);
    expect(calls).toBe(0);
  });

  test(`${Constructor.name} preserves arbitrary seed identity`, async () => {
    const objectId = {};
    const ids = [objectId, undefined, null, NaN];
    const traversal = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => ({
          vertexId: 'root',
          vertexContent: { $d: 'root', $c: ['0', '1', '2', '3'] },
        }),
        resolveChild: (context) => ({
          vertexId: ids[Number(context)],
          vertexContent: { $d: context, $c: [] },
        }),
      },
      completedWork: new Set(ids),
    });
    const seen: string[] = [];
    traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
      seen.push(vertex.getData());
    });
    await traversal.createRunner().run();
    expect(seen).toEqual(['root']);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} commits seeded work independently of its prerequisites`, async () => {
    const traversal = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => ({
          vertexId: 'root',
          vertexContent: { $d: 'root', $c: ['A', 'B', 'C'] },
        }),
        resolveChild: (id) => ({
          vertexId: id,
          dependsOnWork: id === 'A' ? ['B'] : id === 'C' ? ['A', 'B'] : [],
          vertexContent: { $d: id, $c: id === 'C' ? ['D'] : [] },
        }),
      },
      completedWork: new Set(['A', 'B']),
    });
    const seen: string[] = [];
    traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
      seen.push(vertex.getData());
    });
    await traversal.createRunner().run();
    expect(seen).toEqual(['root', 'C', 'D']);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} suppresses initial seed events and waits for child completion`, async () => {
    const traversal = new Constructor<G>({
      traversableGraph: graph,
      completedWork: new Set(['root']),
    });
    const events: string[] = [];
    for await (const event of traversal.createRunner().iterateEvents()) {
      events.push(`${event.kind}:${event.vertexRef.unref().getData()}`);
    }
    expect(events).toEqual([
      'workCompleted:child',
      'subgraphCompleted:child',
      'subgraphCompleted:root',
    ]);
  });

  test(`${Constructor.name} rejects seeds with injected state or container`, () => {
    const runner = new Constructor<G>({ traversableGraph: graph }).createRunner();
    for (const injected of [
      { state: runner.state },
      { resolvedGraphsContainer: runner.resolvedGraphsContainer },
    ]) {
      const traversal = new Constructor<G>({
        traversableGraph: graph,
        completedWork: new Set(),
        traversalRunnerInternalObjects: injected,
      });
      expect(() => traversal.createRunner()).toThrow(TypeError);
    }
  });
}
