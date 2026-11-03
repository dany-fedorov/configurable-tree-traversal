import type {
  AsyncBreadthFirstTreeRunner,
  AsyncDagTraversalRunner,
  AsyncDepthFirstTreeRunner,
  AsyncGraphWalkRunner,
  AsyncTraversalExecution,
  BreadthFirstTreeRunner,
  DagCommittedMilestoneEvent,
  DagTraversalRunner,
  DepthFirstTreeRunner,
  GraphWalkRunner,
  GraphWalkEvent,
  GraphWalkObservationKind,
  SyncTraversalExecution,
  TraversalExecutionSelectionPatch,
  TreeTraversalEvent,
  VertexDataAndChildHintTypes,
} from '../src';
import {
  BreadthFirstTreeVisitPhase as BFS,
  DagVisitorPhase as DAG,
  DepthFirstTreeVisitPhase as DFS,
} from '../src';

type Data = VertexDataAndChildHintTypes<{ value: string }, string>;
type ID = { readonly id: unique symbol };

type Events<E> = Iterable<E> | AsyncIterable<E>;
declare function expectEvents<E>(events: Events<E>): void;
declare const syncTree: DepthFirstTreeRunner<Data>;
declare const asyncTree: AsyncDepthFirstTreeRunner<Data>;
declare const syncTreeCapability: SyncTraversalExecution<
  DFS,
  TreeTraversalEvent<DFS, Data, Data>
>;
declare const asyncTreeCapability: AsyncTraversalExecution<
  DFS,
  TreeTraversalEvent<DFS, Data, Data>
>;
declare const syncBreadth: BreadthFirstTreeRunner<Data>;
declare const asyncBreadth: AsyncBreadthFirstTreeRunner<Data>;
declare const syncDag: DagTraversalRunner<Data, Data, ID>;
declare const asyncDag: AsyncDagTraversalRunner<Data, Data, ID>;
declare const syncDagCapability: SyncTraversalExecution<
  DAG,
  DagCommittedMilestoneEvent<Data, ID>
>;
declare const asyncDagCapability: AsyncTraversalExecution<
  DAG,
  DagCommittedMilestoneEvent<Data, ID>
>;
declare const syncWalk: GraphWalkRunner<Data, string, ID>;
declare const asyncWalk: AsyncGraphWalkRunner<Data, string, ID>;
declare const syncWalkCapability: SyncTraversalExecution<
  GraphWalkObservationKind,
  GraphWalkEvent<Data, string, ID>
>;
declare const asyncWalkCapability: AsyncTraversalExecution<
  GraphWalkObservationKind,
  GraphWalkEvent<Data, string, ID>
>;
expectEvents<TreeTraversalEvent<DFS.AFTER_CHILD_SUBTREES, Data, Data>>(
  syncTree.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [DFS.AFTER_CHILD_SUBTREES],
  }),
);
expectEvents<never>(
  syncTree.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  }),
);
expectEvents<{ eventKind: DFS.AFTER_CHILD_SUBTREES }>(
  // @ts-expect-error Omitted selectors retain policy and stay broad.
  syncTree.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
);
expectEvents<{ eventKind: DFS.AFTER_CHILD_SUBTREES }>(
  // @ts-expect-error Undefined selectors retain policy and stay broad.
  syncTree.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: undefined,
  }),
);
expectEvents<TreeTraversalEvent<DFS.AFTER_CHILD_SUBTREES, Data, Data>>(
  asyncTree.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [DFS.AFTER_CHILD_SUBTREES],
  }),
);
expectEvents<never>(
  asyncTree.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  }),
);
expectEvents<{ eventKind: DFS.AFTER_CHILD_SUBTREES }>(
  // @ts-expect-error Omitted selectors retain policy and stay broad.
  asyncTree.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
);
expectEvents<{ eventKind: DFS.AFTER_CHILD_SUBTREES }>(
  // @ts-expect-error Undefined selectors retain policy and stay broad.
  asyncTree.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: undefined,
  }),
);
expectEvents<TreeTraversalEvent<DFS.AFTER_CHILD_SUBTREES, Data, Data>>(
  syncTreeCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [DFS.AFTER_CHILD_SUBTREES],
  }),
);
expectEvents<never>(
  syncTreeCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  }),
);
expectEvents<{ eventKind: DFS.AFTER_CHILD_SUBTREES }>(
  // @ts-expect-error Omitted selectors retain policy and stay broad.
  syncTreeCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
);
expectEvents<{ eventKind: DFS.AFTER_CHILD_SUBTREES }>(
  // @ts-expect-error Undefined selectors retain policy and stay broad.
  syncTreeCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: undefined,
  }),
);
expectEvents<TreeTraversalEvent<DFS.AFTER_CHILD_SUBTREES, Data, Data>>(
  asyncTreeCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [DFS.AFTER_CHILD_SUBTREES],
  }),
);
expectEvents<never>(
  asyncTreeCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  }),
);
expectEvents<{ eventKind: DFS.AFTER_CHILD_SUBTREES }>(
  // @ts-expect-error Omitted selectors retain policy and stay broad.
  asyncTreeCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
);
expectEvents<{ eventKind: DFS.AFTER_CHILD_SUBTREES }>(
  // @ts-expect-error Undefined selectors retain policy and stay broad.
  asyncTreeCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: undefined,
  }),
);
const optional: TraversalExecutionSelectionPatch<DFS> = {
  deliveredEventKinds: [DFS.AFTER_CHILD_SUBTREES],
};
expectEvents<{ eventKind: DFS.AFTER_CHILD_SUBTREES }>(
  // @ts-expect-error An optional selection does not guarantee narrowing.
  syncTree.runAndIterateObservationEventsUntilSuspendedOrTerminal(optional),
);
expectEvents<never>(
  syncBreadth.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  }),
);
expectEvents<{ eventKind: BFS.AT_LEVEL_ORDER_VERTEX }>(
  syncBreadth.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [BFS.AT_LEVEL_ORDER_VERTEX],
  }),
);
expectEvents<never>(
  asyncBreadth.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  }),
);
expectEvents<{ eventKind: BFS.AT_LEVEL_ORDER_VERTEX }>(
  asyncBreadth.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [BFS.AT_LEVEL_ORDER_VERTEX],
  }),
);
expectEvents<
  DagCommittedMilestoneEvent<Data, ID> & {
    eventKind: 'subgraphCompletionCommitted';
  }
>(
  syncDag.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: ['subgraphCompletionCommitted'],
  }),
);
expectEvents<{ eventKind: 'subgraphCompletionCommitted' }>(
  // @ts-expect-error Omitted selection stays broad.
  syncDag.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
);
expectEvents<never>(
  syncDag.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  }),
);
expectEvents<
  DagCommittedMilestoneEvent<Data, ID> & {
    eventKind: 'subgraphCompletionCommitted';
  }
>(
  asyncDag.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: ['subgraphCompletionCommitted'],
  }),
);
expectEvents<{ eventKind: 'subgraphCompletionCommitted' }>(
  // @ts-expect-error Omitted selection stays broad.
  asyncDag.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
);
expectEvents<never>(
  asyncDag.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  }),
);
expectEvents<
  DagCommittedMilestoneEvent<Data, ID> & {
    eventKind: 'subgraphCompletionCommitted';
  }
>(
  syncDagCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: ['subgraphCompletionCommitted'],
  }),
);
expectEvents<{ eventKind: 'subgraphCompletionCommitted' }>(
  // @ts-expect-error Omitted selection stays broad.
  syncDagCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
);
expectEvents<never>(
  syncDagCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  }),
);
expectEvents<
  DagCommittedMilestoneEvent<Data, ID> & {
    eventKind: 'subgraphCompletionCommitted';
  }
>(
  asyncDagCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: ['subgraphCompletionCommitted'],
  }),
);
expectEvents<{ eventKind: 'subgraphCompletionCommitted' }>(
  // @ts-expect-error Omitted selection stays broad.
  asyncDagCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
);
expectEvents<never>(
  asyncDagCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  }),
);
expectEvents<
  Extract<
    GraphWalkEvent<Data, string, ID>,
    { eventKind: 'admittedEdgeOccurrence' }
  >
>(
  syncWalk.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: ['admittedEdgeOccurrence'],
  }),
);
expectEvents<never>(
  syncWalk.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  }),
);
expectEvents<
  Extract<
    GraphWalkEvent<Data, string, ID>,
    { eventKind: 'admittedEdgeOccurrence' }
  >
>(
  asyncWalk.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: ['admittedEdgeOccurrence'],
  }),
);
expectEvents<never>(
  asyncWalk.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  }),
);
expectEvents<
  Extract<
    GraphWalkEvent<Data, string, ID>,
    { eventKind: 'admittedEdgeOccurrence' }
  >
>(
  syncWalkCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: ['admittedEdgeOccurrence'],
  }),
);
expectEvents<never>(
  syncWalkCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  }),
);
expectEvents<
  Extract<
    GraphWalkEvent<Data, string, ID>,
    { eventKind: 'admittedEdgeOccurrence' }
  >
>(
  asyncWalkCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: ['admittedEdgeOccurrence'],
  }),
);
expectEvents<never>(
  asyncWalkCapability.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  }),
);

for (const event of syncTree.runAndIterateObservationEventsUntilSuspendedOrTerminal(
  { deliveredEventKinds: [DFS.AFTER_CHILD_SUBTREES] },
)) {
  // @ts-expect-error Narrowing must not restore editing authority.
  event.vertexHandle.replaceReferencedValue(
    event.vertex.createEditableShallowCloneWithContentOverrides(),
  );
}
for (const event of syncWalk.runAndIterateObservationEventsUntilSuspendedOrTerminal(
  { deliveredEventKinds: ['admittedEdgeOccurrence'] },
)) {
  // @ts-expect-error Narrowing preserves readonly discriminants.
  event.eventKind = 'admittedEdgeOccurrence';
  const data: string = event.edge.edgeData;
  void data;
}
// Heterogeneous families retain no-argument and empty-selection iteration.
declare const mixed: typeof syncTree | typeof asyncDag | typeof syncWalk;
mixed.runAndIterateObservationEventsUntilSuspendedOrTerminal();
mixed.runAndIterateObservationEventsUntilSuspendedOrTerminal({
  deliveredEventKinds: [],
});
