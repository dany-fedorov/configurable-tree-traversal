import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversalOrder as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import type { TraversableGraph } from '../src/core/TraversableGraph';

type G = TreeTypeParameters<string, string>;
const graph: TraversableGraph<G> = {
  makeRoot: () => ({
    vertexId: 'root',
    vertexContent: { $d: 'root', $c: ['child'] },
  }),
  makeVertex: () => ({
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
    traversal.addVisitorFor(Order.ON_READY, (vertex) => {
      seen.push(vertex.getData());
    });
    await traversal.makeRunner().run();
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
    traversal.addVisitorFor(Order.ON_READY, (vertex) => {
      seen.push(vertex.getData());
    });
    const runner = traversal.makeRunner();
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
      await traversal.makeRunner().run();
    }).rejects.toThrow(TypeError);
  });

  test(`${Constructor.name} recognizes omitted seeds`, async () => {
    const traversal = new Constructor<G>({
      traversableGraph: {
        ...graph,
        makeVertex: () => ({ vertexId: 'child', vertexContent: null }),
      },
      completedWork: new Set(['child']),
    });
    await traversal.makeRunner().run();
  });

  test(`${Constructor.name} rejects seeds on trees before callbacks`, () => {
    let calls = 0;
    const traversal = new Constructor<G>({
      traversableTree: {
        makeRoot: () => {
          calls++;
          return { vertexContent: null };
        },
        makeVertex: () => ({ vertexContent: null }),
      },
      completedWork: new Set(),
    });
    expect(() => traversal.makeRunner()).toThrow(TypeError);
    expect(calls).toBe(0);
  });

  test(`${Constructor.name} preserves arbitrary seed identity`, async () => {
    const objectId = {};
    const ids = [objectId, undefined, null, NaN];
    const traversal = new Constructor<G>({
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          vertexContent: { $d: 'root', $c: ['0', '1', '2', '3'] },
        }),
        makeVertex: (context) => ({
          vertexId: ids[Number(context)],
          vertexContent: { $d: context, $c: [] },
        }),
      },
      completedWork: new Set(ids),
    });
    const seen: string[] = [];
    traversal.addVisitorFor(Order.ON_READY, (vertex) => {
      seen.push(vertex.getData());
    });
    await traversal.makeRunner().run();
    expect(seen).toEqual(['root']);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} commits seeded work independently of its prerequisites`, async () => {
    const traversal = new Constructor<G>({
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          vertexContent: { $d: 'root', $c: ['A', 'B', 'C'] },
        }),
        makeVertex: (id) => ({
          vertexId: id,
          dependsOn: id === 'A' ? ['B'] : id === 'C' ? ['A', 'B'] : [],
          vertexContent: { $d: id, $c: id === 'C' ? ['D'] : [] },
        }),
      },
      completedWork: new Set(['A', 'B']),
    });
    const seen: string[] = [];
    traversal.addVisitorFor(Order.ON_READY, (vertex) => {
      seen.push(vertex.getData());
    });
    await traversal.makeRunner().run();
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
    for await (const event of traversal.makeRunner().getIterable()) {
      events.push(`${event.order}:${event.vertexRef.unref().getData()}`);
    }
    expect(events).toEqual([
      'ON_READY:child',
      'ON_COMPLETE:child',
      'ON_COMPLETE:root',
    ]);
  });

  test(`${Constructor.name} rejects seeds with injected state or container`, () => {
    const runner = new Constructor<G>({ traversableGraph: graph }).makeRunner();
    for (const injected of [
      { state: runner.state },
      { resolvedGraphsContainer: runner.resolvedGraphsContainer },
    ]) {
      const traversal = new Constructor<G>({
        traversableGraph: graph,
        completedWork: new Set(),
        traversalRunnerInternalObjects: injected,
      });
      expect(() => traversal.makeRunner()).toThrow(TypeError);
    }
  });
}
