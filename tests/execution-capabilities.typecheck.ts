import {
  GraphWalkBuilder,
  AsyncGraphWalkBuilder,
  GraphWalkObservationKind as WALK,
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  BreadthFirstTreeVisitPhase as BFS,
  DagVisitorPhase as DAG,
  DepthFirstTreeVisitPhase as DFS,
  TraversalRunnerStatus,
  type TreeOrDagExecutionSnapshot,
  type TraversalExecutionSnapshot,
  type TraversalExecutionState,
  type AsyncTraversalExecution,
  type SyncTraversalExecution,
  type TreeDiscoverySource,
  type VertexDataAndChildHintTypes,
} from '../src';

type Tree = VertexDataAndChildHintTypes<string, string>;
const tree: TreeDiscoverySource<Tree> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
    },
  }),
  resolveChildVertexFromHint: () => ({ kind: 'vertexIntentionallyOmitted' }),
};
const dfs = new AsyncDepthFirstTreeTraversalBuilder({
  treeDiscoverySource: tree,
});
const concrete = dfs.createIndependentRunnerFromCurrentOptions();
const common: AsyncTraversalExecution<never, unknown> = concrete;
common.runUntilSuspendedOrTerminal();
common.runUntilSuspendedOrTerminal({
  deliveredEventKinds: [],
  admittedVisitorCallbackPhases: 'all',
});
// @ts-expect-error Erasing the execution family cannot grant DAG phases.
common.runUntilSuspendedOrTerminal({ deliveredEventKinds: ['ON_WORK_READY'] });
common.runAndIterateObservationEventsUntilSuspendedOrTerminal({
  // @ts-expect-error Erasing the execution family cannot grant even DFS phases.
  admittedVisitorCallbackPhases: { include: [DFS.BEFORE_CHILD_EXPANSION] },
});
const precise: AsyncTraversalExecution<
  DFS,
  unknown,
  TreeOrDagExecutionSnapshot
> = concrete;
precise.runUntilSuspendedOrTerminal({
  deliveredEventKinds: [DFS.BEFORE_CHILD_EXPANSION],
});
precise.captureExecutionSnapshot();
precise.requestPauseAfterAdmittedCallbacksDrain();
const asyncReturn: Promise<IteratorResult<unknown, void>> = precise
  .runAndIterateObservationEventsUntilSuspendedOrTerminal()
  .return(undefined);
const asyncRun: Promise<typeof precise> = precise.runUntilSuspendedOrTerminal();
precise.runUntilSuspendedOrTerminal({
  // @ts-expect-error DFS abstraction rejects DAG phases.
  deliveredEventKinds: ['workCompletionCommitted'],
});
// @ts-expect-error Function parameter variance prevents unsafe widening from a concrete runner.
const unsafeConcrete: AsyncTraversalExecution<DFS | DAG, unknown> = concrete;
// @ts-expect-error Function parameter variance prevents unsafe widening through an abstraction.
const unsafeAbstract: AsyncTraversalExecution<DFS | DAG, unknown> = precise;
// @ts-expect-error Erasing the family cannot recover broader execution phases.
const unsafeWidenedCapability: AsyncTraversalExecution<DFS | DAG, unknown> =
  common;
concrete.runAndIterateObservationEventsUntilSuspendedOrTerminal({
  // @ts-expect-error Concrete API still rejects another family's phase.
  deliveredEventKinds: [BFS.AT_LEVEL_ORDER_VERTEX],
});

const syncConcrete = new DepthFirstTreeTraversalBuilder({
  treeDiscoverySource: tree,
}).createIndependentRunnerFromCurrentOptions();
const sync: SyncTraversalExecution<
  DFS,
  import('../src').TreeTraversalEvent<DFS, Tree, Tree>,
  TreeOrDagExecutionSnapshot
> = syncConcrete;
sync.captureExecutionSnapshot();
sync.isSuspended();
sync.requestPauseAfterAdmittedCallbacksDrain();
const syncReturn: IteratorResult<unknown, void> = sync
  .runAndIterateObservationEventsUntilSuspendedOrTerminal()
  .return(undefined);
const treeEvents: Iterable<
  import('../src').TreeTraversalEvent<DFS, Tree, Tree>
> = sync.runAndIterateObservationEventsUntilSuspendedOrTerminal();
const syncPrecise: SyncTraversalExecution<DFS, unknown> = sync;
const syncRun: typeof syncPrecise = syncPrecise.runUntilSuspendedOrTerminal();
syncPrecise.runUntilSuspendedOrTerminal({
  // @ts-expect-error Sync abstraction rejects DAG phases.
  deliveredEventKinds: ['workCompletionCommitted'],
});
// @ts-expect-error Sync capability must reject unsafe phase widening.
const unsafeSync: SyncTraversalExecution<DFS | DAG, unknown> = syncPrecise;
// @ts-expect-error Sync family capability must reject unsafe phase widening.
const unsafeWidenedSyncCapability: SyncTraversalExecution<DFS | DAG, unknown> =
  sync;
// @ts-expect-error Concrete sync source cannot be widened either.
const unsafeSyncConcrete: SyncTraversalExecution<DFS | DAG, unknown> =
  syncConcrete;
const breadth: SyncTraversalExecution<
  BFS,
  unknown,
  TreeOrDagExecutionSnapshot
> = new BreadthFirstTreeTraversalBuilder({
  treeDiscoverySource: tree,
}).createIndependentRunnerFromCurrentOptions();
const dag: SyncTraversalExecution<
  DAG,
  unknown,
  TreeOrDagExecutionSnapshot,
  'workCompletionCommitted' | 'subgraphCompletionCommitted'
> = new DagTraversalBuilder({
  treeDiscoverySource: tree,
}).createIndependentRunnerFromCurrentOptions();
const asyncBreadth: AsyncTraversalExecution<
  BFS,
  unknown,
  TreeOrDagExecutionSnapshot
> = new AsyncBreadthFirstTreeTraversalBuilder({
  treeDiscoverySource: tree,
}).createIndependentRunnerFromCurrentOptions();
const asyncDag: AsyncTraversalExecution<
  DAG,
  unknown,
  TreeOrDagExecutionSnapshot,
  'workCompletionCommitted' | 'subgraphCompletionCommitted'
> = new AsyncDagTraversalBuilder({
  treeDiscoverySource: tree,
}).createIndependentRunnerFromCurrentOptions();
breadth.runUntilSuspendedOrTerminal({
  deliveredEventKinds: [BFS.AT_LEVEL_ORDER_VERTEX],
});
dag.runUntilSuspendedOrTerminal({
  deliveredEventKinds: ['workCompletionCommitted'],
});
asyncBreadth.runUntilSuspendedOrTerminal({
  deliveredEventKinds: [BFS.AT_LEVEL_ORDER_VERTEX],
});
asyncDag.runUntilSuspendedOrTerminal({
  deliveredEventKinds: ['workCompletionCommitted'],
});
breadth.runAndIterateObservationEventsUntilSuspendedOrTerminal({
  // @ts-expect-error BFS abstraction rejects DFS phases.
  deliveredEventKinds: [DFS.BEFORE_CHILD_EXPANSION],
});
dag.runAndIterateObservationEventsUntilSuspendedOrTerminal({
  // @ts-expect-error DAG abstraction rejects BFS phases.
  admittedVisitorCallbackPhases: { exclude: [BFS.AT_LEVEL_ORDER_VERTEX] },
});
asyncBreadth.runUntilSuspendedOrTerminal({
  // @ts-expect-error Async BFS abstraction rejects DFS phases.
  deliveredEventKinds: [DFS.BEFORE_CHILD_EXPANSION],
});
asyncDag.runUntilSuspendedOrTerminal({
  // @ts-expect-error Async DAG abstraction rejects DFS phases.
  deliveredEventKinds: [DFS.AFTER_CHILD_SUBTREES],
});
void [
  asyncReturn,
  asyncRun,
  syncReturn,
  syncRun,
  treeEvents,
  unsafeConcrete,
  unsafeAbstract,
  unsafeWidenedCapability,
  unsafeSync,
  unsafeWidenedSyncCapability,
  unsafeSyncConcrete,
];

const closed = sync
  .runAndIterateObservationEventsUntilSuspendedOrTerminal()
  .return(undefined);
// @ts-expect-error A closed generator must not expose an unchecked any value.
const invalidClosedValue: number = closed.value;
// @ts-expect-error Closing a sync generator accepts only its void completion value.
sync.runAndIterateObservationEventsUntilSuspendedOrTerminal().return(42);
// @ts-expect-error Closing an async generator accepts only its void completion value.
precise.runAndIterateObservationEventsUntilSuspendedOrTerminal().return(42);
void invalidClosedValue;

function paused(
  state: TraversalExecutionState<TraversalExecutionSnapshot>,
): boolean {
  const inspection = state.captureExecutionSnapshot();
  return (
    state.isSuspended() &&
    inspection.traversalLifecycleStatus === TraversalRunnerStatus.SUSPENDED
  );
}
const treeDagInspection: TreeOrDagExecutionSnapshot =
  syncConcrete.captureExecutionSnapshot();
paused(syncConcrete);
void treeDagInspection;

const observedSync: SyncTraversalExecution<
  DFS,
  unknown,
  TraversalExecutionSnapshot
> = syncConcrete;
const observedAsync: AsyncTraversalExecution<
  DFS,
  unknown,
  TraversalExecutionSnapshot
> = concrete;
paused(observedSync);
paused(observedAsync);
// @ts-expect-error Common inspection does not promise tree/DAG frames.
observedSync.captureExecutionSnapshot().frames;
// @ts-expect-error Generalizing inspection cannot widen supported phases.
const unsafeObserved: SyncTraversalExecution<
  DFS | DAG,
  unknown,
  TraversalExecutionSnapshot
> = syncConcrete;
void unsafeObserved;

// Common-inspection wrappers preserve each family's phase domain across all eight runners.
const commonBreadth: SyncTraversalExecution<
  BFS,
  unknown,
  TraversalExecutionSnapshot
> = breadth;
const commonDag: SyncTraversalExecution<
  DAG,
  unknown,
  TraversalExecutionSnapshot,
  'workCompletionCommitted' | 'subgraphCompletionCommitted'
> = dag;
const commonAsyncBreadth: AsyncTraversalExecution<
  BFS,
  unknown,
  TraversalExecutionSnapshot
> = asyncBreadth;
const commonAsyncDag: AsyncTraversalExecution<
  DAG,
  unknown,
  TraversalExecutionSnapshot,
  'workCompletionCommitted' | 'subgraphCompletionCommitted'
> = asyncDag;
const detailedInspections: TreeOrDagExecutionSnapshot[] = [
  syncConcrete.captureExecutionSnapshot(),
  concrete.captureExecutionSnapshot(),
  breadth.captureExecutionSnapshot(),
  dag.captureExecutionSnapshot(),
  asyncBreadth.captureExecutionSnapshot(),
  asyncDag.captureExecutionSnapshot(),
];
void detailedInspections;
paused(commonBreadth);
paused(commonDag);
paused(commonAsyncBreadth);
paused(commonAsyncDag);

const walkingSource = {
  vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
  enumerateRootTargets: () => [],
  enumerateOutgoingLinks: () => [],
};
const walking = new GraphWalkBuilder({
  graphWalkDiscoverySource: walkingSource,
}).createIndependentRunnerFromCurrentOptions();
const asyncWalking = new AsyncGraphWalkBuilder({
  graphWalkDiscoverySource: walkingSource,
}).createIndependentRunnerFromCurrentOptions();
const commonWalking: SyncTraversalExecution<
  WALK,
  unknown,
  TraversalExecutionSnapshot
> = walking;
const commonAsyncWalking: AsyncTraversalExecution<
  WALK,
  unknown,
  TraversalExecutionSnapshot
> = asyncWalking;
paused(commonWalking);
paused(commonAsyncWalking);
// @ts-expect-error Walking does not promise detailed old tree/DAG inspection.
const invalidWalkingDetail: TreeOrDagExecutionSnapshot =
  walking.captureExecutionSnapshot();
const walkingCapability: SyncTraversalExecution<WALK, unknown> = walking;
const asyncWalkingCapability: AsyncTraversalExecution<WALK, unknown> =
  asyncWalking;
// @ts-expect-error A common-inspection walker cannot accept tree phases.
const unsafeWalking: SyncTraversalExecution<
  WALK | DFS,
  unknown,
  TraversalExecutionSnapshot
> = walking;
// @ts-expect-error Async phase variance is retained with common inspection.
const unsafeAsyncWalking: AsyncTraversalExecution<
  WALK | DAG,
  unknown,
  TraversalExecutionSnapshot
> = asyncWalking;
const walkingClose: void = walking.closePermanentlyAndDisposeSourceIterators();
const asyncWalkingClose: Promise<void> =
  asyncWalking.closePermanentlyAndDisposeSourceIterators();
void [
  invalidWalkingDetail,
  walkingCapability,
  asyncWalkingCapability,
  unsafeWalking,
  unsafeAsyncWalking,
  walkingClose,
  asyncWalkingClose,
];
