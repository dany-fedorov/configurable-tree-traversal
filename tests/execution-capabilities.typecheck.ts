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
  BreadthFirstTraversalOrder as BFS,
  DagTraversalOrder as DAG,
  DepthFirstTraversalOrder as DFS,
  TraversalRunnerStatus,
  type CoreInspection,
  type ExecutionInspection,
  type TraversalExecutionState,
  type AsyncCoreExecution,
  type AsyncTraversalExecution,
  type SyncTraversalExecution,
  type TreeTraversalRunner,
  type TreeTraversalIterable,
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
const common: AsyncCoreExecution<unknown> = concrete;
common.run();
common.run({ emitPhases: [], visitorPhases: 'all' });
// @ts-expect-error Erasing the execution family cannot grant DAG phases.
common.run({ emitPhases: ['ON_READY'] });
// @ts-expect-error Erasing the execution family cannot grant even DFS phases.
common.getIterable({ visitorPhases: { include: [DFS.PRE_ORDER] } });
const precise: AsyncTraversalExecution<DFS, unknown> = concrete;
precise.run({ emitPhases: [DFS.PRE_ORDER] });
precise.inspect();
precise.requestPause();
const asyncReturn: Promise<IteratorResult<unknown, void>> = precise
  .getIterable()
  .return(undefined);
const asyncRun: Promise<typeof precise> = precise.run();
// @ts-expect-error DFS abstraction rejects DAG phases.
precise.run({ emitPhases: [DAG.ON_READY] });
// @ts-expect-error Function parameter variance prevents unsafe widening from a concrete runner.
const unsafeConcrete: AsyncTraversalExecution<DFS | DAG, unknown> = concrete;
// @ts-expect-error Function parameter variance prevents unsafe widening through an abstraction.
const unsafeAbstract: AsyncTraversalExecution<DFS | DAG, unknown> = precise;
// @ts-expect-error Historical name must also prevent unsafe phase widening.
const unsafeHistorical: AsyncCoreExecution<unknown, DFS | DAG> = precise;
// @ts-expect-error Concrete API still rejects another family's phase.
concrete.getIterable({ emitPhases: [BFS.LEVEL_ORDER] });

const syncConcrete = new DepthFirstTreeTraversal({
  traversableTree: tree,
}).createRunner();
const sync: TreeTraversalRunner<DFS, Tree, Tree> = syncConcrete;
sync.inspect();
sync.isHalted();
sync.requestPause();
const syncReturn: IteratorResult<unknown, void> = sync
  .getIterable()
  .return(undefined);
const historical: TreeTraversalIterable<DFS, Tree, Tree> = sync.getIterable();
const syncPrecise: SyncTraversalExecution<DFS, unknown> = sync;
const syncRun: typeof syncPrecise = syncPrecise.run();
// @ts-expect-error Sync abstraction rejects DAG phases.
syncPrecise.run({ emitPhases: [DAG.ON_READY] });
// @ts-expect-error Sync capability must reject unsafe phase widening.
const unsafeSync: SyncTraversalExecution<DFS | DAG, unknown> = syncPrecise;
// @ts-expect-error Historical sync class must reject unsafe phase widening.
const unsafeSyncHistorical: TreeTraversalRunner<DFS | DAG, Tree, Tree> = sync;
// @ts-expect-error Concrete sync source cannot be widened either.
const unsafeSyncConcrete: SyncTraversalExecution<DFS | DAG, unknown> =
  syncConcrete;
const breadth: SyncTraversalExecution<BFS, unknown> = new BreadthFirstTreeTraversal(
  { traversableTree: tree },
).createRunner();
const dag: SyncTraversalExecution<DAG, unknown> = new DagTraversal({
  traversableTree: tree,
}).createRunner();
const asyncBreadth: AsyncTraversalExecution<BFS, unknown> =
  new AsyncBreadthFirstTreeTraversal({ traversableTree: tree }).createRunner();
const asyncDag: AsyncTraversalExecution<DAG, unknown> = new AsyncDagTraversal({
  traversableTree: tree,
}).createRunner();
breadth.run({ emitPhases: [BFS.LEVEL_ORDER] });
dag.run({ emitPhases: [DAG.ON_READY] });
asyncBreadth.run({ emitPhases: [BFS.LEVEL_ORDER] });
asyncDag.run({ emitPhases: [DAG.ON_READY] });
// @ts-expect-error BFS abstraction rejects DFS phases.
breadth.getIterable({ emitPhases: [DFS.PRE_ORDER] });
// @ts-expect-error DAG abstraction rejects BFS phases.
dag.getIterable({ visitorPhases: { exclude: [BFS.LEVEL_ORDER] } });
// @ts-expect-error Async BFS abstraction rejects DFS phases.
asyncBreadth.run({ emitPhases: [DFS.PRE_ORDER] });
// @ts-expect-error Async DAG abstraction rejects DFS phases.
asyncDag.run({ iterateOver: [DFS.POST_ORDER] });
void [
  asyncReturn,
  asyncRun,
  syncReturn,
  syncRun,
  historical,
  unsafeConcrete,
  unsafeAbstract,
  unsafeHistorical,
  unsafeSync,
  unsafeSyncHistorical,
  unsafeSyncConcrete,
];

const closed = sync.getIterable().return(undefined);
// @ts-expect-error A closed generator must not expose an unchecked any value.
const invalidClosedValue: number = closed.value;
// @ts-expect-error Closing a sync generator accepts only its void completion value.
sync.getIterable().return(42);
// @ts-expect-error Closing an async generator accepts only its void completion value.
precise.getIterable().return(42);
void invalidClosedValue;

function paused(state: TraversalExecutionState<ExecutionInspection>): boolean {
  const inspection = state.inspect();
  return state.isHalted() && inspection.status === TraversalRunnerStatus.HALTED;
}
const oldShape: CoreInspection = syncConcrete.inspect();
paused(syncConcrete);
void oldShape;

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
const commonDag: SyncTraversalExecution<DAG, unknown, ExecutionInspection> =
  dag;
const commonAsyncBreadth: AsyncTraversalExecution<
  BFS,
  unknown,
  ExecutionInspection
> = asyncBreadth;
const commonAsyncDag: AsyncTraversalExecution<
  DAG,
  unknown,
  ExecutionInspection
> = asyncDag;
const oldInspections: CoreInspection[] = [
  syncConcrete.inspect(),
  concrete.inspect(),
  breadth.inspect(),
  dag.inspect(),
  asyncBreadth.inspect(),
  asyncDag.inspect(),
];
void oldInspections;
paused(commonBreadth);
paused(commonDag);
paused(commonAsyncBreadth);
paused(commonAsyncDag);

const walkingSource = { roots: () => [], outgoing: () => [] };
const walking = new GraphWalk({ source: walkingSource }).createRunner();
const asyncWalking = new AsyncGraphWalk({ source: walkingSource }).createRunner();
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
const oldWalkingInspection: CoreInspection = walking.inspect();
// @ts-expect-error Default inspection remains CoreInspection for existing callers.
const oldWalkingCapability: SyncTraversalExecution<WALK, unknown> = walking;
// @ts-expect-error Default async inspection remains CoreInspection.
const oldAsyncWalkingCapability: AsyncTraversalExecution<WALK, unknown> =
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
  oldWalkingInspection,
  oldWalkingCapability,
  oldAsyncWalkingCapability,
  unsafeWalking,
  unsafeAsyncWalking,
  walkingClose,
  asyncWalkingClose,
];
