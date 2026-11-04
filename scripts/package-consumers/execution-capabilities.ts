// Packed public contracts; exercise actual calls under both declaration loaders.
import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  AsyncGraphWalkBuilder,
  BreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  GraphWalkBuilder,
  GraphWalkObservationKind as WALK,
  BreadthFirstTreeVisitPhase as BFS,
  DagVisitorPhase as DAG,
  DepthFirstTreeVisitPhase as DFS,
  TraversalRunnerStatus,
  type TreeOrDagExecutionSnapshot,
  type GraphWalkEvent,
  type GraphWalkExecutionSnapshot,
  type GraphWalkDiscoverySource,
  type TraversalExecutionSnapshot,
  type TraversalExecutionState,
  type AsyncTraversalExecution,
  type SyncTraversalExecution,
  type TreeDiscoverySource,
  type VertexDataAndChildHintTypes,
} from 'configurable-tree-traversal';

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
// @ts-expect-error DFS abstraction rejects DAG phases.
precise.runUntilSuspendedOrTerminal({ deliveredEventKinds: ['workCompleted'] });
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
  import('configurable-tree-traversal').TreeTraversalEvent<DFS, Tree, Tree>,
  TreeOrDagExecutionSnapshot
> = syncConcrete;
sync.captureExecutionSnapshot();
sync.isSuspended();
sync.requestPauseAfterAdmittedCallbacksDrain();
const syncReturn: IteratorResult<unknown, void> = sync
  .runAndIterateObservationEventsUntilSuspendedOrTerminal()
  .return(undefined);
const treeEvents: Iterable<
  import('configurable-tree-traversal').TreeTraversalEvent<DFS, Tree, Tree>
> = sync.runAndIterateObservationEventsUntilSuspendedOrTerminal();
const syncPrecise: SyncTraversalExecution<DFS, unknown> = sync;
const syncRun: typeof syncPrecise = syncPrecise.runUntilSuspendedOrTerminal();
syncPrecise.runUntilSuspendedOrTerminal({
  // @ts-expect-error Sync abstraction rejects DAG phases.
  deliveredEventKinds: ['workCompleted'],
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

// Concrete inspection stays detailed while default state wrappers accept all families.
const asyncTreeDagInspection: TreeOrDagExecutionSnapshot =
  concrete.captureExecutionSnapshot();
const treeState: TraversalExecutionState = syncConcrete;
const asyncTreeState: TraversalExecutionState = concrete;
const walkSource: GraphWalkDiscoverySource<string, number, undefined> = {
  vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
  enumerateRootTargets: () => [
    {
      kind: 'inlineResolution' as const,
      vertexId: undefined,
      resolutionIfNotPreviouslyAdmitted: { kind: 'found', vertexData: 'root' },
    },
  ],
  enumerateOutgoingLinks: () => [],
};
const walkingSync = new GraphWalkBuilder({
  graphWalkDiscoverySource: walkSource,
}).createIndependentRunnerFromCurrentOptions();
const walkingAsync = new AsyncGraphWalkBuilder({
  graphWalkDiscoverySource: walkSource,
}).createIndependentRunnerFromCurrentOptions();
type WalkEvent = GraphWalkEvent<string, number, undefined>;
const detailedWalk: SyncTraversalExecution<
  WALK,
  WalkEvent,
  GraphWalkExecutionSnapshot
> = walkingSync;
const detailedAsyncWalk: AsyncTraversalExecution<
  WALK,
  WalkEvent,
  GraphWalkExecutionSnapshot
> = walkingAsync;
const commonWalk: SyncTraversalExecution<
  WALK,
  WalkEvent,
  TraversalExecutionSnapshot
> = detailedWalk;
const commonAsyncWalk: AsyncTraversalExecution<
  WALK,
  WalkEvent,
  TraversalExecutionSnapshot
> = detailedAsyncWalk;
const detailedState: TraversalExecutionState<GraphWalkExecutionSnapshot> = walkingSync;
const detailedAsyncState: TraversalExecutionState<GraphWalkExecutionSnapshot> =
  walkingAsync;
const walkKind: 'graph-walk' =
  detailedWalk.captureExecutionSnapshot().traversalAlgorithm;
const graphMode: 'graph' =
  detailedAsyncWalk.captureExecutionSnapshot().sourceMode;
const commonKind: string =
  commonWalk.captureExecutionSnapshot().traversalAlgorithm;
const syncWalkRun: typeof commonWalk = commonWalk.runUntilSuspendedOrTerminal({
  deliveredEventKinds: [WALK.ADMITTED_EDGE_OCCURRENCE],
});
const asyncWalkRun: Promise<typeof commonAsyncWalk> =
  commonAsyncWalk.runUntilSuspendedOrTerminal({
    deliveredEventKinds: [WALK.VERTEX_OCCURRENCE],
  });
const syncWalkReturn: IteratorResult<WalkEvent, void> = detailedWalk
  .runAndIterateObservationEventsUntilSuspendedOrTerminal()
  .return(undefined);
const asyncWalkReturn: Promise<IteratorResult<WalkEvent, void>> =
  detailedAsyncWalk
    .runAndIterateObservationEventsUntilSuspendedOrTerminal()
    .return(undefined);
for (const execution of [
  syncConcrete,
  concrete,
  breadth,
  asyncBreadth,
  dag,
  asyncDag,
  walkingSync,
  walkingAsync,
])
  paused(execution);
const defaultWalkingState: TraversalExecutionState = walkingSync;
const defaultAsyncWalkingState: TraversalExecutionState = walkingAsync;
const defaultWalkingExecution: SyncTraversalExecution<WALK, WalkEvent> =
  walkingSync;
const defaultAsyncWalkingExecution: AsyncTraversalExecution<WALK, WalkEvent> =
  walkingAsync;
// @ts-expect-error The explicit detailed capability promises TreeDagExecutionInspection.
const invalidDetailedWalk: AsyncTraversalExecution<
  WALK,
  WalkEvent,
  TreeOrDagExecutionSnapshot
> = walkingAsync;
// @ts-expect-error Walking inspection has no DAG frames.
detailedWalk.captureExecutionSnapshot().frames;
// @ts-expect-error Generalized inspection does not promise walking counters.
commonAsyncWalk.captureExecutionSnapshot().counts;
// @ts-expect-error Generalizing inspection cannot widen the phase domain.
const unsafeWalk: SyncTraversalExecution<
  WALK | DAG,
  WalkEvent,
  TraversalExecutionSnapshot
> = commonWalk;
// @ts-expect-error Async phase domains also remain contravariant.
const unsafeAsyncWalk: AsyncTraversalExecution<
  WALK | DFS,
  WalkEvent,
  TraversalExecutionSnapshot
> = walkingAsync;
commonWalk.runUntilSuspendedOrTerminal({
  // @ts-expect-error Family-safe capabilities reject DAG phases.
  deliveredEventKinds: ['workCompleted'],
});
commonAsyncWalk.runAndIterateObservationEventsUntilSuspendedOrTerminal({
  // @ts-expect-error Async generalized capabilities reject DFS phases.
  admittedVisitorCallbackPhases: [DFS.BEFORE_CHILD_EXPANSION],
});
void [
  asyncTreeDagInspection,
  treeState,
  asyncTreeState,
  detailedState,
  detailedAsyncState,
  walkKind,
  graphMode,
  commonKind,
  syncWalkRun,
  asyncWalkRun,
  syncWalkReturn,
  asyncWalkReturn,
  defaultWalkingState,
  defaultAsyncWalkingState,
  defaultWalkingExecution,
  defaultAsyncWalkingExecution,
  invalidDetailedWalk,
  unsafeWalk,
  unsafeAsyncWalk,
];
