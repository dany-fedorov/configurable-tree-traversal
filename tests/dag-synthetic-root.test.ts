import { createVertexHandleFacet } from '../src/core/observationFacets';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { AsyncDagTraversalBuilder } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversalBuilder } from '../src/traversals/dag-traversal/DagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { runnerInternals } from './internal-runner-fixtures';

type G = VertexDataAndChildHintTypes<string, string>;
for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} hides synthetic roots from visits, events and graph paths`, async () => {
    const traversal = new Constructor<G>({
      ...{
        discoveryTiming: 'completeBeforeAnyVisitor' as const,
        sourceRootIsHiddenEntryHolder: true,
      },
      retainDiscoveredGraphBeforeVisitorCommands: true,
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'a',
            vertexContentInput: {
              $vertexData: 'catalog',
              $childDiscoveryHints: ['a', 'b'],
            },
          },
        }),
        resolveChildVertexFromHint: (hint) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: hint,
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        }),
      },
    });
    const seen: string[] = [];
    for (const order of [
      Order.ON_WORK_READY,
      Order.ON_SUBGRAPH_COMPLETION_READY,
    ])
      traversal.registerVisitorForPhase(order, (vertex, options) => {
        seen.push(vertex.getVertexData());
        expect(options.isVisibleSourceRoot).toBe(false);
        expect(options.isVisibleSourceRoot).toBe(false);
        expect(
          options.liveResolvedGraphView.getDesignatedRootHandleOrNull(),
        ).toBeNull();
        expect(
          options.liveResolvedGraphView.getVertexSnapshotOrNull(
            options.vertexHandle,
          )!.workWaitsForWorkOf,
        ).toEqual([]);
        expect(
          options.liveResolvedGraphView.getVertexSnapshotOrNull(
            options.vertexHandle,
          )!.incomingStructuralChildEdges,
        ).toEqual([]);
      });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    const events: string[] = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      events.push(event.vertex.getVertexData());
    expect(events.sort()).toEqual(['a', 'a', 'b', 'b']);
    expect(seen.sort()).toEqual(events);
    for (const graph of [
      runner.getLiveResolvedGraphView(),
      runner.livePreCommandDiscoveredGraphView!,
    ]) {
      expect(graph.getDesignatedRootHandleOrNull()).toBeNull();
      expect(
        graph.getVertexHandles().map((ref) => graph.requireVertexId(ref)),
      ).toEqual(['a', 'b']);
      const a = graph.getVertexHandleByIdOrNull('a')!;
      expect(graph.getDistinctStructuralParentHandlesOrNull(a)).toEqual([]);
      expect(graph.requireAllStructuralAncestorPathsTo(a)).toEqual([[a]]);
      expect(
        graph.requireAllStructuralAncestorPathsTo(a, {
          includeDesignatedRoot: false,
        }),
      ).toEqual([[a]]);
      expect(
        graph.requireAllStructuralAncestorPathsTo(a, {
          includeTargetVertex: false,
        }),
      ).toEqual([[]]);
    }
  });

  test.each(['duplicate', 'anonymous'])(
    `${Constructor.name} rejects %s catalog entries`,
    async (invalid) => {
      const traversal = new Constructor<G>({
        ...{
          discoveryTiming: 'completeBeforeAnyVisitor' as const,
          sourceRootIsHiddenEntryHolder: true,
        },
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: 'catalog',
                $childDiscoveryHints: ['a', 'a'],
              },
            },
          }),
          resolveChildVertexFromHint: (hint) => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              ...(invalid === 'duplicate' ? { vertexId: hint } : {}),
              vertexContentInput: {
                $vertexData: hint,
                $childDiscoveryHints: [],
              },
            },
          }),
        },
      });
      await expect(async () => {
        await traversal
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
      }).rejects.toThrow(/catalog/i);
    },
  );

  test(`${Constructor.name} empty catalog produces no events`, async () => {
    const runner = new Constructor<G>({
      ...{ sourceRootIsHiddenEntryHolder: true },
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'catalog',
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    const events = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      events.push(event);
    expect(events).toEqual([]);
    expect(runner.getLiveResolvedGraphView().getVertexHandles()).toEqual([]);
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test.each([false, true])(
    `${Constructor.name} preserves shared descendants with hint identity %s`,
    async (identify) => {
      const resolved: string[] = [];
      const traversal = new Constructor<G>({
        sourceRootIsHiddenEntryHolder: true,
        discoveryTiming: 'completeBeforeAnyVisitor',
        retainDiscoveredGraphBeforeVisitorCommands: true,
        transformChildHintsBeforeResolution: (hints) => hints.slice(),
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: 'catalog',
                $childDiscoveryHints: ['a', 'b', 'shared'],
              },
            },
          }),
          resolveChildVertexFromHint: (hint, options) => {
            expect(
              options.liveResolvedGraphView.getDesignatedRootHandleOrNull(),
            ).toBeNull();
            resolved.push(hint);
            return {
              kind: 'vertexResolved' as const,
              resolvedVertexInput: {
                vertexId: hint,
                workWaitsForWorkOf: [],
                vertexContentInput: {
                  $vertexData: hint,
                  $childDiscoveryHints: hint === 'shared' ? [] : ['shared'],
                },
              },
            };
          },
          ...(identify
            ? {
                tryGetVertexIdentityFromHint: (hint: string) => ({
                  vertexId: hint,
                }),
              }
            : {}),
        },
      });
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      expect(resolved.filter((id) => id === 'shared').length).toBe(
        identify ? 1 : 3,
      );
      for (const graph of [
        runner.getLiveResolvedGraphView(),
        runner.livePreCommandDiscoveredGraphView!,
      ]) {
        const shared = graph.getVertexHandleByIdOrNull('shared')!;
        const a = graph.getVertexHandleByIdOrNull('a')!;
        const b = graph.getVertexHandleByIdOrNull('b')!;
        expect(graph.getDistinctStructuralParentHandlesOrNull(shared)).toEqual([
          a,
          b,
        ]);
        expect(graph.getStructuralChildHandlesInSlotOrderOrNull(a)).toEqual([
          shared,
        ]);
        expect(graph.requireAllStructuralAncestorPathsTo(shared)).toEqual([
          [a, shared],
          [b, shared],
        ]);
        expect(
          graph.requireAllStructuralAncestorPathsTo(shared, {
            includeTargetVertex: false,
            includeDesignatedRoot: false,
          }),
        ).toEqual([[a], [b]]);
      }
      const graph = runner.getLiveResolvedGraphView();
      const shared = graph.getVertexHandleByIdOrNull('shared')!;
      expect(
        graph
          .getVertexSnapshotOrNull(shared)!
          .incomingStructuralChildEdges.map((edge) =>
            graph.requireVertexId(edge.parentVertexHandle),
          ),
      ).toEqual(['a', 'b']);
      expect(graph.containsVertexHandle(shared)).toBe(true);
      expect(graph.getVertexVisitSchedulingStageOrNull(shared)).toBe(
        'COMPLETION_VISIT_COMMITTED',
      );
    },
  );

  test(`${Constructor.name} duplicate identified catalog entries fail before any work`, async () => {
    let visited = false;
    const traversal = new Constructor<G>({
      sourceRootIsHiddenEntryHolder: true,
      discoveryTiming: 'completeBeforeAnyVisitor',
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'catalog',
              $childDiscoveryHints: ['a', 'a'],
            },
          },
        }),
        tryGetVertexIdentityFromHint: (hint) => ({ vertexId: hint }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
          },
        }),
      },
    });
    traversal.registerVisitorForPhase(Order.ON_WORK_READY, () => {
      visited = true;
    });
    await expect(async () => {
      await traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal();
    }).rejects.toThrow(/catalog/);
    expect(visited).toBe(false);
  });

  test(`${Constructor.name} disconnected seeded catalog cycles fail before visitors`, async () => {
    let visited = false;
    const traversal = new Constructor<G>({
      sourceRootIsHiddenEntryHolder: true,
      discoveryTiming: 'completeBeforeAnyVisitor',
      acceptedCompletedWorkVertexIds: new Set(['a', 'b']),
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'catalog',
              $childDiscoveryHints: ['source', 'a', 'b'],
            },
          },
        }),
        resolveChildVertexFromHint: (hint) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: hint,
            workWaitsForWorkOf:
              hint === 'source' ? [] : [hint === 'a' ? 'b' : 'a'],
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        }),
      },
    });
    traversal.registerVisitorForPhase(Order.ON_WORK_READY, () => {
      visited = true;
    });
    await expect(async () => {
      await traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal();
    }).rejects.toMatchObject({
      diagnostics: { milestoneCycleVertexIdComponents: [['a', 'b']] },
    });
    expect(visited).toBe(false);
  });

  test(`${Constructor.name} synthetic views reject hidden and unknown references`, async () => {
    const runner = new Constructor<G>({
      sourceRootIsHiddenEntryHolder: true,
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'catalog',
              $childDiscoveryHints: ['a'],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'a',
            vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
          },
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    const graph = runner.getLiveResolvedGraphView();
    const internal =
      runnerInternals(runner).resolvedGraphsContainer.liveResolvedGraphView;
    const hidden = createVertexHandleFacet(internal.getRoot()!);
    expect(graph.getVertexSnapshotOrNull(hidden)).toBeNull();
    expect(graph.containsVertexHandle(hidden)).toBe(false);
    expect(
      graph.getVertexHandleByIdOrNull(
        internal.requireVertexId(internal.getRoot()!),
      ),
    ).toBeNull();
    expect(graph.getVertexHandleByIdOrNull('absent')).toBeNull();
    expect(() => graph.requireVertexId(hidden)).toThrow();
    expect(() => graph.requireAllStructuralAncestorPathsTo(hidden)).toThrow();
    expect(graph.getDistinctStructuralParentHandlesOrNull(hidden)).toBeNull();
    expect(graph.getStructuralChildHandlesInSlotOrderOrNull(hidden)).toBeNull();
    expect(graph.getVertexVisitSchedulingStageOrNull(hidden)).toBeNull();
    const foreign = new Constructor<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'foreign',
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await foreign.runUntilSuspendedOrTerminal();
    const unknown = foreign
      .getLiveResolvedGraphView()
      .getDesignatedRootHandleOrNull()!;
    expect(graph.getVertexSnapshotOrNull(unknown)).toBeNull();
    expect(graph.containsVertexHandle(unknown)).toBe(false);
    expect(graph.getDistinctStructuralParentHandlesOrNull(unknown)).toBeNull();
    expect(
      graph.getStructuralChildHandlesInSlotOrderOrNull(unknown),
    ).toBeNull();
    expect(graph.getVertexVisitSchedulingStageOrNull(unknown)).toBeNull();
  });
}

test('synthetic catalog preserves arbitrary IDs without freezing or consuming its supplied ID', async () => {
  const objectId = { mutable: true };
  const ids = [undefined, null, NaN, objectId, Symbol('real')];
  const traversal = new AsyncDagTraversalBuilder<G>({
    sourceRootIsHiddenEntryHolder: true,
    discoveryTiming: 'completeBeforeAnyVisitor',
    acceptedCompletedWorkVertexIds: new Set(ids),
    dagDiscoverySource: {
      resolveRootVertex: async () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: objectId,
          vertexContentInput: {
            $vertexData: 'catalog',
            $childDiscoveryHints: ['0', '1', '2', '3', '4'],
          },
        },
      }),
      tryGetVertexIdentityFromHint: async (hint) => ({
        vertexId: ids[Number(hint)],
      }),
      resolveChildVertexFromHint: async (hint) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
        },
      }),
    },
  });
  const seen: string[] = [];
  traversal.registerVisitorForPhase(Order.ON_WORK_READY, (vertex) => {
    seen.push(vertex.getVertexData());
  });
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  await runner.runUntilSuspendedOrTerminal();
  expect(seen).toEqual([]);
  expect(
    runner
      .getLiveResolvedGraphView()
      .getVertexHandles()
      .map((ref) => runner.getLiveResolvedGraphView().requireVertexId(ref)),
  ).toEqual(ids);
  expect(Object.isFrozen(objectId)).toBe(false);
});

test.each([undefined, null, NaN])(
  'catalog rejects duplicate SameValueZero IDs %s',
  (id) => {
    const runner = new DagTraversalBuilder<G>({
      sourceRootIsHiddenEntryHolder: true,
      discoveryTiming: 'completeBeforeAnyVisitor',
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'catalog',
              $childDiscoveryHints: ['a', 'b'],
            },
          },
        }),
        tryGetVertexIdentityFromHint: () => ({ vertexId: id }),
        resolveChildVertexFromHint: () => ({
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted' as const,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(
      /Duplicate catalog/,
    );
  },
);
