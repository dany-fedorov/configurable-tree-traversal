import { createVertexHandleFacet } from '../src/core/observationFacets';
import { internalTreeStore } from './internal-runner-fixtures';
import { treeResolution } from './source-result-fixtures';
import {
  DepthFirstTreeVisitPhase,
  DepthFirstTreeTraversalBuilder,
  MutableValueReference,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  Vertex,
} from '../src';
import type { TestGraph } from './helpers/graph-fixtures';
import {
  createInternalDepthFirstTreeRunner,
  runnerInternals,
  traversalInternals,
} from './internal-runner-fixtures';

test('DFS shared core preserves the callback, context, and event trace', () => {
  const trace: string[] = [];
  const traversal = new DepthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => {
        trace.push('adapter:root');
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['left', 'missing', 'right'],
            },
          },
        };
      },
      resolveChildVertexFromHint: (
        hint,
        { childDiscoveryContext, liveResolvedTreeView: resolvedTree },
      ) => {
        const root = resolvedTree.getRootVertexHandleOrNull();
        trace.push(
          `adapter:${hint}:parent=${childDiscoveryContext.parentVertexAtChildResolution.getVertexData()}:depth=${
            childDiscoveryContext.discoveryDepthInEdges
          }:index=${childDiscoveryContext.parentChildHintIndex}:children=${
            root === null
              ? ''
              : (resolvedTree.getChildVertexHandlesOrNull(root) ?? [])
                  .map((ref) => ref.getCurrentVertexView().getVertexData())
                  .join(',')
          }`,
        );
        return treeResolution(
          hint === 'missing'
            ? null
            : { $vertexData: hint, $childDiscoveryHints: [] },
        );
      },
    },
  });

  for (const order of Object.values(DepthFirstTreeVisitPhase)) {
    traversal.registerVisitorCallbackForPhase(order, (vertex, options) => {
      trace.push(
        `visitor:${order}:${vertex.getVertexData()}:visit=${
          options.phaseVisitorChainIndex
        }:current=${options.visitorCallbackIndexInPhaseChain}`,
      );
      return undefined;
    });
  }

  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const initialInspection = runner.captureExecutionSnapshot();
  expect(initialInspection).toMatchObject({
    traversalLifecycleStatus: TraversalRunnerStatus.NOT_STARTED,
    traversalAlgorithm: 'depth-first',
    callbackExecutionMode: 'sync',
    sourceTopologyKind: 'tree',
    bufferedDeliveryEventCount: 0,
    inFlightInvocationCount: 0,
  });
  expect(internalTreeStore(runner).getRootVertexReferenceOrNull()).toBeNull();

  for (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
    trace.push(`event:${event.eventKind}:${event.vertex.getVertexData()}`);
  }

  expect(trace).toEqual([
    'adapter:root',
    'visitor:BEFORE_CHILD_EXPANSION:root:visit=0:current=0',
    'event:BEFORE_CHILD_EXPANSION:root',
    'adapter:left:parent=root:depth=1:index=0:children=',
    'visitor:BEFORE_CHILD_EXPANSION:left:visit=1:current=0',
    'event:BEFORE_CHILD_EXPANSION:left',
    'visitor:AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES:left:visit=0:current=0',
    'event:AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES:left',
    'visitor:AFTER_CHILD_SUBTREES:left:visit=0:current=0',
    'event:AFTER_CHILD_SUBTREES:left',
    'visitor:AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES:root:visit=1:current=0',
    'event:AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES:root',
    'adapter:missing:parent=root:depth=1:index=1:children=left',
    'visitor:AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES:root:visit=2:current=0',
    'event:AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES:root',
    'adapter:right:parent=root:depth=1:index=2:children=left',
    'visitor:BEFORE_CHILD_EXPANSION:right:visit=2:current=0',
    'event:BEFORE_CHILD_EXPANSION:right',
    'visitor:AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES:right:visit=3:current=0',
    'event:AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES:right',
    'visitor:AFTER_CHILD_SUBTREES:right:visit=1:current=0',
    'event:AFTER_CHILD_SUBTREES:right',
    'visitor:AFTER_CHILD_SUBTREES:root:visit=2:current=0',
    'event:AFTER_CHILD_SUBTREES:root',
  ]);
  expect(runner.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
  expect(runner.getLiveResolvedGraphView()).toBe(
    internalTreeStore(runner).getLiveResolvedGraphView(),
  );
  const resolvedRoot = runner
    .getLiveResolvedGraphView()
    .getDesignatedRootHandleOrNull();
  expect(resolvedRoot).not.toBeNull();
  if (resolvedRoot === null) throw new Error('Expected a resolved root');
  expect(
    runner
      .getLiveResolvedGraphView()
      .getVertexVisitSchedulingStageOrNull(resolvedRoot),
  ).toBe('COMPLETION_VISIT_COMMITTED');
  expect(
    runner
      .getLiveResolvedGraphView()
      .getStructuralChildHandlesInSlotOrderOrNull(resolvedRoot)
      ?.map((ref) =>
        runner
          .getLiveResolvedGraphView()
          .getVertexVisitSchedulingStageOrNull(ref),
      ),
  ).toEqual(['COMPLETION_VISIT_COMMITTED', 'COMPLETION_VISIT_COMMITTED']);
  expect(runner.captureExecutionSnapshot()).toMatchObject({
    traversalLifecycleStatus: TraversalRunnerStatus.FINISHED,
    vertexTraversalFrames: [],
    vertexPhaseVisitorChains: [],
    pendingCallbackRequests: [],
    bufferedDeliveryEventCount: 0,
    inFlightInvocationCount: 0,
  });
});

test('DFS inspection during a visitor halt preserves the next visitor', () => {
  const visits: string[] = [];
  const traversal = new DepthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
        },
      }),
      resolveChildVertexFromHint: () => ({
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    },
  });
  traversal.registerVisitorCallbackForPhase(
    DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    () => ({
      commands: [
        {
          commandName:
            TraversalVisitorCommandName.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
        },
      ],
    }),
  );
  traversal.registerVisitorCallbackForPhase(
    DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    (vertex) => {
      visits.push(vertex.getVertexData());
    },
  );

  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  expect(
    Array.from(runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()),
  ).toEqual([]);
  expect(runner.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.SUSPENDED,
  );
  const halted = runner.captureExecutionSnapshot();
  expect(halted.vertexPhaseVisitorChains).toHaveLength(1);
  expect(halted.vertexPhaseVisitorChains[0]).toMatchObject({
    visitorPhase: DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    state: 'pausedAtCommandBoundary',
    visitorCallbackIndexInPhaseChain: 1,
  });
  expect(
    runnerInternals(runner).state.visitorsState[
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION
    ],
  ).toMatchObject({
    phaseVisitorChainIndex: 0,
    visitorCallbackIndexInPhaseChain: 1,
    previousCommittedVisitVertexHandleForSamePhase: null,
  });
  expect(visits).toEqual([]);

  runner.runUntilSuspendedOrTerminal();
  expect(visits).toEqual(['root']);
  expect(runner.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
});

test('DFS can traverse a completed injected resolved-tree container again', () => {
  const adapter = {
    resolveRootVertex: () => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexContentInput: {
          $vertexData: 'root',
          $childDiscoveryHints: ['missing', 'child'],
        },
      },
    }),
    resolveChildVertexFromHint: (hint: string) =>
      treeResolution(
        hint === 'missing'
          ? null
          : { $vertexData: hint, $childDiscoveryHints: [] },
      ),
  };
  const first = new DepthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: adapter,
  }).createIndependentRunnerFromCurrentOptions();
  first.runUntilSuspendedOrTerminal();
  const root = internalTreeStore(first).getRootVertexReferenceOrNull();
  if (root === null) throw new Error('Expected a resolved root');
  const rootRecord =
    internalTreeStore(first).getMutableVertexRecordOrNull(root);
  const originalChildren = internalTreeStore(first)
    .getMutableVertexRecordOrNull(root)
    ?.getMutableChildReferenceList();
  const originalChild = originalChildren?.[0];
  if (originalChild === undefined) throw new Error('Expected a resolved child');
  const childRecord =
    internalTreeStore(first).getMutableVertexRecordOrNull(originalChild);

  const second = createInternalDepthFirstTreeRunner<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChildVertexFromHint: adapter.resolveChildVertexFromHint,
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: runnerInternals(first).resolvedTreesContainer,
    },
  });

  const events = Array.from(
    second.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION],
    }),
  );
  expect(events.map((event) => event.vertex.getVertexData())).toEqual([
    'root',
    'child',
  ]);
  expect(events[1]?.vertexHandle).toBe(createVertexHandleFacet(originalChild));
  expect(internalTreeStore(second).getRootVertexReferenceOrNull()).toBe(root);
  expect(internalTreeStore(second).getMutableVertexRecordOrNull(root)).toBe(
    rootRecord,
  );
  expect(
    internalTreeStore(second)
      .getMutableVertexRecordOrNull(root)
      ?.getMutableChildReferenceList(),
  ).toBe(originalChildren);
  expect(
    internalTreeStore(second).getDetachedChildReferenceListOrNull(root),
  ).not.toBe(originalChildren);
  expect(
    internalTreeStore(second).getDetachedChildReferenceListOrNull(root),
  ).toEqual([originalChild]);
  expect(
    internalTreeStore(second).getMutableVertexRecordOrNull(originalChild),
  ).toBe(childRecord);
  expect(second.getLiveResolvedGraphView().getVertexHandles()).toEqual([
    createVertexHandleFacet(root),
    createVertexHandleFacet(originalChild),
  ]);
});

test('deleting the current vertex still advances visitor metadata for its sibling', () => {
  const siblingMetadata: unknown[] = [];
  const traversal = new DepthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['deleted', 'sibling'],
          },
        },
      }),
      resolveChildVertexFromHint: (hint) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
        },
      }),
    },
  });
  traversal.registerVisitorCallbackForPhase(
    DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    (vertex, options) => {
      if (vertex.getVertexData() === 'deleted') {
        return {
          commands: [
            {
              commandName:
                TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
            },
          ],
        };
      }
      if (vertex.getVertexData() === 'sibling') {
        siblingMetadata.push(
          options.phaseVisitorChainIndex,
          options.previousCommittedVisitVertexHandleForSamePhase
            ?.getCurrentVertexView()
            .getVertexData(),
        );
      }
      return undefined;
    },
  );

  traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(siblingMetadata).toEqual([2, 'deleted']);
});

test('hint rewrites clone the command payload before a later visitor mutates it', () => {
  const hints = ['first'];
  const traversal = new DepthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['original'],
          },
        },
      }),
      resolveChildVertexFromHint: (hint) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
        },
      }),
    },
  });
  traversal.registerVisitorCallbackForPhase(
    DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    (vertex) =>
      vertex.getVertexData() === 'root'
        ? {
            commands: [
              {
                commandName:
                  TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
                commandArguments: { replacementChildHints: hints },
              },
            ],
          }
        : undefined,
  );
  traversal.registerVisitorCallbackForPhase(
    DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    (vertex) => {
      if (vertex.getVertexData() === 'root') hints.push('late');
    },
  );

  expect(
    Array.from(
      traversal
        .createIndependentRunnerFromCurrentOptions()
        .runAndIterateObservationEventsUntilSuspendedOrTerminal({
          deliveredEventKinds: [
            DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
          ],
        }),
    ).map((event) => event.vertex.getVertexData()),
  ).toEqual(['root', 'first']);
});

test('disabled visitor execution leaves injected per-order state unchanged', () => {
  const traversal = new DepthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
        },
      }),
      resolveChildVertexFromHint: () => ({
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    },
  });
  const seed = runnerInternals(
    traversal.createIndependentRunnerFromCurrentOptions(),
  ).state;
  const previous = new MutableValueReference(
    new Vertex<TestGraph>({
      $vertexData: 'previous',
      $childDiscoveryHints: [],
    }),
  );
  seed.visitorsState[DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION] = {
    phaseVisitorChainIndex: 41,
    visitorCallbackIndexInPhaseChain: 42,
    previousCommittedVisitVertexHandleForSamePhase: previous,
  };
  let visitorCalls = 0;
  traversal.registerVisitorCallbackForPhase(
    DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    () => {
      visitorCalls += 1;
    },
  );
  const runner = createInternalDepthFirstTreeRunner<TestGraph>({
    treeDiscoverySource: traversalInternals(traversal).icfg.treeDiscoverySource,
    visitors: traversalInternals(traversal).visitors,
    traversalRunnerInternalObjects: { state: seed },
  });

  expect(
    Array.from(
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION],
        admittedVisitorCallbackPhases: {
          exclude: [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION],
        },
      }),
    ).map((event) => event.vertex.getVertexData()),
  ).toEqual(['root']);
  expect(visitorCalls).toBe(0);
  expect(
    seed.visitorsState[DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION],
  ).toEqual({
    phaseVisitorChainIndex: 41,
    visitorCallbackIndexInPhaseChain: 42,
    previousCommittedVisitVertexHandleForSamePhase: previous,
  });
  const root = runner
    .getLiveResolvedGraphView()
    .getDesignatedRootHandleOrNull();
  if (root === null) throw new Error('Expected a resolved root');
  expect(
    runner.getLiveResolvedGraphView().getVertexVisitSchedulingStageOrNull(root),
  ).toBe('COMPLETION_VISIT_COMMITTED');
  expect(runner.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.FINISHED,
  );
});

test.each(['sorter', 'resolver', 'visitor'] as const)(
  'DFS %s failure clears policy frames from inspection',
  (failureAt) => {
    const failure = new Error(`${failureAt} failed`);
    const traversal = new DepthFirstTreeTraversalBuilder<TestGraph>({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['child'],
            },
          },
        }),
        resolveChildVertexFromHint: () => {
          if (failureAt === 'resolver') throw failure;
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: 'child',
                $childDiscoveryHints: [],
              },
            },
          };
        },
      },
      transformChildHintsBeforeResolution:
        failureAt === 'sorter'
          ? () => {
              throw failure;
            }
          : null,
    });
    if (failureAt === 'visitor') {
      traversal.registerVisitorCallbackForPhase(
        DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
        () => {
          throw failure;
        },
      );
    }
    const runner = traversal.createIndependentRunnerFromCurrentOptions();

    expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(failure);
    expect(runner.captureExecutionSnapshot()).toMatchObject({
      traversalLifecycleStatus: TraversalRunnerStatus.FAILED,
      vertexTraversalFrames: [],
      vertexPhaseVisitorChains: [],
      pendingCallbackRequests: [],
    });
  },
);
