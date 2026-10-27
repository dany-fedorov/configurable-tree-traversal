import {
  GraphWalk,
  AsyncGraphWalk,
  GraphWalkPhase as WALK,
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  DagTraversal,
  DepthFirstTreeTraversal,
  BreadthFirstPhase as BFS,
  DagVisitorPhase as DAG,
  DepthFirstPhase as DFS,
  TraversalRunnerStatus,
  type TreeDagExecutionInspection,
  type ExecutionInspection,
  type TraversalExecutionState,
  type AsyncTraversalExecution,
  type SyncTraversalExecution,
  type TreeSource,
  type VertexTypes,
} from '../src';

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
  import('../src').TreeTraversalEvent<DFS, Tree, Tree>,
  TreeDagExecutionInspection
> = syncConcrete;
sync.inspect();
sync.isHalted();
sync.requestPause();
const syncReturn: IteratorResult<unknown, void> = sync
  .iterateEvents()
  .return(undefined);
const treeEvents: Iterable<
  import('../src').TreeTraversalEvent<DFS, Tree, Tree>
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

// Common-inspection wrappers preserve each family's phase domain across all eight runners.
const commonBreadth: SyncTraversalExecution<BFS, unknown, ExecutionInspection> =
  breadth;
const commonDag: SyncTraversalExecution<
  DAG,
  unknown,
  ExecutionInspection,
  'workCompleted' | 'subgraphCompleted'
> = dag;
const commonAsyncBreadth: AsyncTraversalExecution<
  BFS,
  unknown,
  ExecutionInspection
> = asyncBreadth;
const commonAsyncDag: AsyncTraversalExecution<
  DAG,
  unknown,
  ExecutionInspection,
  'workCompleted' | 'subgraphCompleted'
> = asyncDag;
const detailedInspections: TreeDagExecutionInspection[] = [
  syncConcrete.inspect(),
  concrete.inspect(),
  breadth.inspect(),
  dag.inspect(),
  asyncBreadth.inspect(),
  asyncDag.inspect(),
];
void detailedInspections;
paused(commonBreadth);
paused(commonDag);
paused(commonAsyncBreadth);
paused(commonAsyncDag);

const walkingSource = { roots: () => [], outgoing: () => [] };
const walking = new GraphWalk({ source: walkingSource }).createRunner();
const asyncWalking = new AsyncGraphWalk({
  source: walkingSource,
}).createRunner();
const commonWalking: SyncTraversalExecution<
  WALK,
  unknown,
  ExecutionInspection
> = walking;
const commonAsyncWalking: AsyncTraversalExecution<
  WALK,
  unknown,
  ExecutionInspection
> = asyncWalking;
paused(commonWalking);
paused(commonAsyncWalking);
// @ts-expect-error Walking does not promise detailed old tree/DAG inspection.
const invalidWalkingDetail: TreeDagExecutionInspection = walking.inspect();
const walkingCapability: SyncTraversalExecution<WALK, unknown> = walking;
const asyncWalkingCapability: AsyncTraversalExecution<WALK, unknown> =
  asyncWalking;
// @ts-expect-error A common-inspection walker cannot accept tree phases.
const unsafeWalking: SyncTraversalExecution<
  WALK | DFS,
  unknown,
  ExecutionInspection
> = walking;
// @ts-expect-error Async phase variance is retained with common inspection.
const unsafeAsyncWalking: AsyncTraversalExecution<
  WALK | DAG,
  unknown,
  ExecutionInspection
> = asyncWalking;
const walkingClose: void = walking.close();
const asyncWalkingClose: Promise<void> = asyncWalking.close();
void [
  invalidWalkingDetail,
  walkingCapability,
  asyncWalkingCapability,
  unsafeWalking,
  unsafeAsyncWalking,
  walkingClose,
  asyncWalkingClose,
];
