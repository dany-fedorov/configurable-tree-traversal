import type { DagDiscoverySource } from '../src/core/TraversableGraph';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import {
  createInternalAsyncDagTraversal,
  createInternalDagTraversal,
  runnerInternals,
} from './internal-runner-fixtures';

type G = VertexTypes<string, string>;
const graph: DagDiscoverySource<G> = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: {
      vertexId: 'root',
      vertexContent: { $data: 'root', $childHints: ['child'] },
    },
  }),
  resolveChild: () => ({
    kind: 'found' as const,
    vertex: {
      vertexId: 'child',
      vertexContent: { $data: 'child', $childHints: [] },
    },
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
        resolveChild: () => ({
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
          vertexId: 'child',
        }),
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
          return { kind: 'omitted' as const };
        },
        resolveChild: () => ({ kind: 'omitted' as const }),
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
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['0', '1', '2', '3'] },
          },
        }),
        resolveChild: (context) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: ids[Number(context)],
            vertexContent: { $data: context, $childHints: [] },
          },
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
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['A', 'B', 'C'] },
          },
        }),
        resolveChild: (id) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: id,
            dependsOnWork: id === 'A' ? ['B'] : id === 'C' ? ['A', 'B'] : [],
            vertexContent: { $data: id, $childHints: id === 'C' ? ['D'] : [] },
          },
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
      events.push(`${event.kind}:${event.vertexRef.getValue().getData()}`);
    }
    expect(events).toEqual([
      'workCompleted:child',
      'subgraphCompleted:child',
      'subgraphCompleted:root',
    ]);
  });

  test(`${Constructor.name} rejects seeds with injected state or container`, () => {
    const runner = new Constructor<G>({
      traversableGraph: graph,
    }).createRunner();
    for (const injected of [
      { state: runnerInternals(runner).state },
      {
        resolvedGraphsContainer:
          runnerInternals(runner).resolvedGraphsContainer,
      },
    ]) {
      const traversal = (
        Constructor === DagTraversal
          ? createInternalDagTraversal
          : createInternalAsyncDagTraversal
      )<G>({
        traversableGraph: graph,
        completedWork: new Set(),
        traversalRunnerInternalObjects: injected,
      });
      expect(() => traversal.createRunner()).toThrow(TypeError);
    }
  });
}
