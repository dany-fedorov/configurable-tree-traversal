// Packed public contracts; exercise actual calls under both declaration loaders.
import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  AsyncGraphWalk,
  BreadthFirstTreeTraversal,
  DagTraversal,
  DepthFirstTreeTraversal,
  GraphWalk,
  GraphWalkPhase as WALK,
  BreadthFirstPhase as BFS,
  DagVisitorPhase as DAG,
  DepthFirstPhase as DFS,
  TraversalRunnerStatus,
  type TreeDagExecutionInspection,
  type GraphWalkEvent,
  type GraphWalkInspection,
  type GraphWalkSource,
  type ExecutionInspection,
  type TraversalExecutionState,
  type AsyncTraversalExecution,
  type SyncTraversalExecution,
  type TreeSource,
  type VertexTypes,
} from 'configurable-tree-traversal';

type Tree = VertexTypes<string, string>;
const tree: TreeSource<Tree> = {
  resolveRoot: () => ({
    kind: 'found',
    vertex: { vertexContent: { $data: 'root', $childHints: [] } },
  }),
  resolveChild: () => ({ kind: 'omitted' }),
};
const dfs = new AsyncDepthFirstTreeTraversal({ traversableTree: tree });
const concrete = dfs.createRunner();
const common: AsyncTraversalExecution<never, unknown> = concrete;
common.run();
common.run({ emitEvents: [], visitorPhases: 'all' });
// @ts-expect-error Erasing the execution family cannot grant DAG phases.
common.run({ emitEvents: ['ON_WORK_READY'] });
// @ts-expect-error Erasing the execution family cannot grant even DFS phases.
common.iterateEvents({ visitorPhases: { include: [DFS.PRE_ORDER] } });
const precise: AsyncTraversalExecution<
  DFS,
  unknown,
  TreeDagExecutionInspection
> = concrete;
precise.run({ emitEvents: [DFS.PRE_ORDER] });
precise.inspect();
precise.requestPause();
const asyncReturn: Promise<IteratorResult<unknown, void>> = precise
  .iterateEvents()
  .return(undefined);
const asyncRun: Promise<typeof precise> = precise.run();
// @ts-expect-error DFS abstraction rejects DAG phases.
precise.run({ emitEvents: ['workCompleted'] });
// @ts-expect-error Function parameter variance prevents unsafe widening from a concrete runner.
const unsafeConcrete: AsyncTraversalExecution<DFS | DAG, unknown> = concrete;
// @ts-expect-error Function parameter variance prevents unsafe widening through an abstraction.
const unsafeAbstract: AsyncTraversalExecution<DFS | DAG, unknown> = precise;
// @ts-expect-error Erasing the family cannot recover broader execution phases.
const unsafeWidenedCapability: AsyncTraversalExecution<DFS | DAG, unknown> =
  common;
// @ts-expect-error Concrete API still rejects another family's phase.
concrete.iterateEvents({ emitEvents: [BFS.LEVEL_ORDER] });

const syncConcrete = new DepthFirstTreeTraversal({
  traversableTree: tree,
}).createRunner();
const sync: SyncTraversalExecution<
  DFS,
  import('configurable-tree-traversal').TreeTraversalEvent<DFS, Tree, Tree>,
  TreeDagExecutionInspection
> = syncConcrete;
sync.inspect();
sync.isHalted();
sync.requestPause();
const syncReturn: IteratorResult<unknown, void> = sync
  .iterateEvents()
  .return(undefined);
const treeEvents: Iterable<
  import('configurable-tree-traversal').TreeTraversalEvent<DFS, Tree, Tree>
> = sync.iterateEvents();
const syncPrecise: SyncTraversalExecution<DFS, unknown> = sync;
const syncRun: typeof syncPrecise = syncPrecise.run();
// @ts-expect-error Sync abstraction rejects DAG phases.
syncPrecise.run({ emitEvents: ['workCompleted'] });
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
  TreeDagExecutionInspection
> = new BreadthFirstTreeTraversal({ traversableTree: tree }).createRunner();
const dag: SyncTraversalExecution<
  DAG,
  unknown,
  TreeDagExecutionInspection,
  'workCompleted' | 'subgraphCompleted'
> = new DagTraversal({
  traversableTree: tree,
}).createRunner();
const asyncBreadth: AsyncTraversalExecution<
  BFS,
  unknown,
  TreeDagExecutionInspection
> = new AsyncBreadthFirstTreeTraversal({
  traversableTree: tree,
}).createRunner();
const asyncDag: AsyncTraversalExecution<
  DAG,
  unknown,
  TreeDagExecutionInspection,
  'workCompleted' | 'subgraphCompleted'
> = new AsyncDagTraversal({
  traversableTree: tree,
}).createRunner();
breadth.run({ emitEvents: [BFS.LEVEL_ORDER] });
dag.run({ emitEvents: ['workCompleted'] });
asyncBreadth.run({ emitEvents: [BFS.LEVEL_ORDER] });
asyncDag.run({ emitEvents: ['workCompleted'] });
// @ts-expect-error BFS abstraction rejects DFS phases.
breadth.iterateEvents({ emitEvents: [DFS.PRE_ORDER] });
// @ts-expect-error DAG abstraction rejects BFS phases.
dag.iterateEvents({ visitorPhases: { exclude: [BFS.LEVEL_ORDER] } });
// @ts-expect-error Async BFS abstraction rejects DFS phases.
asyncBreadth.run({ emitEvents: [DFS.PRE_ORDER] });
// @ts-expect-error Async DAG abstraction rejects DFS phases.
asyncDag.run({ emitEvents: [DFS.POST_ORDER] });
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

const closed = sync.iterateEvents().return(undefined);
// @ts-expect-error A closed generator must not expose an unchecked any value.
const invalidClosedValue: number = closed.value;
// @ts-expect-error Closing a sync generator accepts only its void completion value.
sync.iterateEvents().return(42);
// @ts-expect-error Closing an async generator accepts only its void completion value.
precise.iterateEvents().return(42);
void invalidClosedValue;

function paused(state: TraversalExecutionState<ExecutionInspection>): boolean {
  const inspection = state.inspect();
  return state.isHalted() && inspection.status === TraversalRunnerStatus.HALTED;
}
const treeDagInspection: TreeDagExecutionInspection = syncConcrete.inspect();
paused(syncConcrete);
void treeDagInspection;

const observedSync: SyncTraversalExecution<DFS, unknown, ExecutionInspection> =
  syncConcrete;
const observedAsync: AsyncTraversalExecution<
  DFS,
  unknown,
  ExecutionInspection
> = concrete;
paused(observedSync);
paused(observedAsync);
// @ts-expect-error Common inspection does not promise tree/DAG frames.
observedSync.inspect().frames;
// @ts-expect-error Generalizing inspection cannot widen supported phases.
const unsafeObserved: SyncTraversalExecution<
  DFS | DAG,
  unknown,
  ExecutionInspection
> = syncConcrete;
void unsafeObserved;

// Concrete inspection stays detailed while default state wrappers accept all families.
const asyncTreeDagInspection: TreeDagExecutionInspection = concrete.inspect();
const treeState: TraversalExecutionState = syncConcrete;
const asyncTreeState: TraversalExecutionState = concrete;
const walkSource: GraphWalkSource<string, number, undefined> = {
  hydration: 'inlineOrCached' as const,
  roots: () => [
    {
      kind: 'inline' as const,
      vertexId: undefined,
      resolution: { kind: 'found', data: 'root' },
    },
  ],
  outgoing: () => [],
};
const walkingSync = new GraphWalk({ source: walkSource }).createRunner();
const walkingAsync = new AsyncGraphWalk({ source: walkSource }).createRunner();
type WalkEvent = GraphWalkEvent<string, number, undefined>;
const detailedWalk: SyncTraversalExecution<
  WALK,
  WalkEvent,
  GraphWalkInspection
> = walkingSync;
const detailedAsyncWalk: AsyncTraversalExecution<
  WALK,
  WalkEvent,
  GraphWalkInspection
> = walkingAsync;
const commonWalk: SyncTraversalExecution<WALK, WalkEvent, ExecutionInspection> =
  detailedWalk;
const commonAsyncWalk: AsyncTraversalExecution<
  WALK,
  WalkEvent,
  ExecutionInspection
> = detailedAsyncWalk;
const detailedState: TraversalExecutionState<GraphWalkInspection> = walkingSync;
const detailedAsyncState: TraversalExecutionState<GraphWalkInspection> =
  walkingAsync;
const walkKind: 'graph-walk' = detailedWalk.inspect().kind;
const graphMode: 'graph' = detailedAsyncWalk.inspect().sourceMode;
const commonKind: string = commonWalk.inspect().kind;
const syncWalkRun: typeof commonWalk = commonWalk.run({
  emitEvents: [WALK.EDGE],
});
const asyncWalkRun: Promise<typeof commonAsyncWalk> = commonAsyncWalk.run({
  emitEvents: [WALK.VERTEX],
});
const syncWalkReturn: IteratorResult<WalkEvent, void> = detailedWalk
  .iterateEvents()
  .return(undefined);
const asyncWalkReturn: Promise<IteratorResult<WalkEvent, void>> =
  detailedAsyncWalk.iterateEvents().return(undefined);
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
  TreeDagExecutionInspection
> = walkingAsync;
// @ts-expect-error Walking inspection has no DAG frames.
detailedWalk.inspect().frames;
// @ts-expect-error Generalized inspection does not promise walking counters.
commonAsyncWalk.inspect().counts;
// @ts-expect-error Generalizing inspection cannot widen the phase domain.
const unsafeWalk: SyncTraversalExecution<
  WALK | DAG,
  WalkEvent,
  ExecutionInspection
> = commonWalk;
// @ts-expect-error Async phase domains also remain contravariant.
const unsafeAsyncWalk: AsyncTraversalExecution<
  WALK | DFS,
  WalkEvent,
  ExecutionInspection
> = walkingAsync;
// @ts-expect-error Family-safe capabilities reject DAG phases.
commonWalk.run({ emitEvents: ['workCompleted'] });
// @ts-expect-error Async generalized capabilities reject DFS phases.
commonAsyncWalk.iterateEvents({ visitorPhases: [DFS.PRE_ORDER] });
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
