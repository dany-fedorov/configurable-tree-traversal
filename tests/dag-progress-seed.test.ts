import type { DagDiscoverySource } from '../src/core/TraversableGraph';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { AsyncDagTraversalBuilder } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversalBuilder } from '../src/traversals/dag-traversal/DagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import {
  createInternalAsyncDagTraversal,
  createInternalDagTraversal,
  runnerInternals,
} from './internal-runner-fixtures';

type G = VertexDataAndChildHintTypes<string, string>;
const graph: DagDiscoverySource<G> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'root',
      vertexContentInput: {
        $vertexData: 'root',
        $childDiscoveryHints: ['child'],
      },
    },
  }),
  resolveChildHint: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'child',
      vertexContentInput: { $vertexData: 'child', $childDiscoveryHints: [] },
    },
  }),
};
for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} seeded root expands without initial visitor`, async () => {
    const traversal = new Constructor<G>({
      dagDiscoverySource: graph,
      ...{ acceptedCompletedWorkVertexIds: new Set(['root']) },
    });
    const seen: string[] = [];
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
      seen.push(vertex.getVertexData());
    });
    await traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['child']);
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} copies seeds at runner creation`, async () => {
    const acceptedCompletedWorkVertexIds = new Set(['root']);
    const traversal = new Constructor<G>({
      dagDiscoverySource: graph,
      acceptedCompletedWorkVertexIds,
    });
    const seen: string[] = [];
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
      seen.push(vertex.getVertexData());
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    acceptedCompletedWorkVertexIds.clear();
    acceptedCompletedWorkVertexIds.add('child');
    await runner.runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['child']);
  });

  test(`${Constructor.name} rejects unknown IDs without stringification`, async () => {
    const hostile = {
      toString: () => {
        throw new Error('stringified');
      },
    };
    const traversal = new Constructor<G>({
      dagDiscoverySource: graph,
      acceptedCompletedWorkVertexIds: new Set([hostile]),
    });
    await expect(async () => {
      await traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal();
    }).rejects.toThrow(TypeError);
  });

  test(`${Constructor.name} recognizes omitted seeds`, async () => {
    const traversal = new Constructor<G>({
      dagDiscoverySource: {
        ...graph,
        resolveChildHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          omittedVertexIdentity: { vertexId: 'child' },
        }),
      },
      acceptedCompletedWorkVertexIds: new Set(['child']),
    });
    await traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
  });

  test(`${Constructor.name} rejects seeds on trees before callbacks`, () => {
    let calls = 0;
    const traversal = new Constructor<G>({
      treeDiscoverySource: {
        resolveRootVertex: () => {
          calls++;
          return { kind: 'vertexIntentionallyOmitted' as const };
        },
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
      acceptedCompletedWorkVertexIds: new Set(),
    });
    expect(() => traversal.createIndependentRunnerFromCurrentOptions()).toThrow(
      TypeError,
    );
    expect(calls).toBe(0);
  });

  test(`${Constructor.name} preserves arbitrary seed identity`, async () => {
    const objectId = {};
    const ids = [objectId, undefined, null, NaN];
    const traversal = new Constructor<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['0', '1', '2', '3'],
            },
          },
        }),
        resolveChildHint: (context) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: ids[Number(context)],
            vertexContentInput: {
              $vertexData: context,
              $childDiscoveryHints: [],
            },
          },
        }),
      },
      acceptedCompletedWorkVertexIds: new Set(ids),
    });
    const seen: string[] = [];
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
      seen.push(vertex.getVertexData());
    });
    await traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['root']);
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} commits seeded work independently of its prerequisites`, async () => {
    const traversal = new Constructor<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['A', 'B', 'C'],
            },
          },
        }),
        resolveChildHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf:
              id === 'A' ? ['B'] : id === 'C' ? ['A', 'B'] : [],
            vertexContentInput: {
              $vertexData: id,
              $childDiscoveryHints: id === 'C' ? ['D'] : [],
            },
          },
        }),
      },
      acceptedCompletedWorkVertexIds: new Set(['A', 'B']),
    });
    const seen: string[] = [];
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
      seen.push(vertex.getVertexData());
    });
    await traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['root', 'C', 'D']);
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} suppresses initial seed events and waits for child completion`, async () => {
    const traversal = new Constructor<G>({
      dagDiscoverySource: graph,
      acceptedCompletedWorkVertexIds: new Set(['root']),
    });
    const events: string[] = [];
    for await (const event of traversal
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
      events.push(
        `${event.eventKind}:${event.vertexHandle
          .getCurrentVertexView()
          .getVertexData()}`,
      );
    }
    expect(events).toEqual([
      'workCompletionCommitted:child',
      'subgraphCompletionCommitted:child',
      'subgraphCompletionCommitted:root',
    ]);
  });

  test(`${Constructor.name} rejects seeds with injected state or container`, () => {
    const runner = new Constructor<G>({
      dagDiscoverySource: graph,
    }).createIndependentRunnerFromCurrentOptions();
    for (const injected of [
      { state: runnerInternals(runner).state },
      {
        resolvedGraphsContainer:
          runnerInternals(runner).resolvedGraphsContainer,
      },
    ]) {
      const traversal = (
        Constructor === DagTraversalBuilder
          ? createInternalDagTraversal
          : createInternalAsyncDagTraversal
      )<G>({
        dagDiscoverySource: graph,
        acceptedCompletedWorkVertexIds: new Set(),
        traversalRunnerInternalObjects: injected,
      });
      expect(() =>
        traversal.createIndependentRunnerFromCurrentOptions(),
      ).toThrow(TypeError);
    }
  });
}
