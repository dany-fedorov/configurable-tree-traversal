// Packed public contracts; exercise actual calls under both declaration loaders.
import {
  AsyncBreadthFirstTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTraversal,
  BreadthFirstTraversal,
  DagTraversal,
  DepthFirstTraversal,
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
  type TraversalRunner,
  type TraversalRunnerIterable,
  type TraversableTree,
  type TreeTypeParameters,
} from 'configurable-tree-traversal';

type Tree = TreeTypeParameters<string, string>;
const tree: TraversableTree<Tree> = {
  makeRoot: () => ({
    kind: 'found',
    vertex: { vertexContent: { $data: 'root', $childHints: [] } },
  }),
  makeVertex: () => ({ kind: 'omitted', satisfiesDependencies: true }),
};
const dfs = new AsyncDepthFirstTraversal({ traversableTree: tree });
const concrete = dfs.makeRunner();
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

const syncConcrete = new DepthFirstTraversal({
  traversableTree: tree,
}).makeRunner();
const sync: TraversalRunner<DFS, Tree, Tree> = syncConcrete;
sync.inspect();
sync.isHalted();
sync.requestPause();
const syncReturn: IteratorResult<unknown, void> = sync
  .getIterable()
  .return(undefined);
const historical: TraversalRunnerIterable<DFS, Tree, Tree> = sync.getIterable();
const syncPrecise: SyncTraversalExecution<DFS, unknown> = sync;
const syncRun: typeof syncPrecise = syncPrecise.run();
// @ts-expect-error Sync abstraction rejects DAG phases.
syncPrecise.run({ emitPhases: [DAG.ON_READY] });
// @ts-expect-error Sync capability must reject unsafe phase widening.
const unsafeSync: SyncTraversalExecution<DFS | DAG, unknown> = syncPrecise;
// @ts-expect-error Historical sync class must reject unsafe phase widening.
const unsafeSyncHistorical: TraversalRunner<DFS | DAG, Tree, Tree> = sync;
// @ts-expect-error Concrete sync source cannot be widened either.
const unsafeSyncConcrete: SyncTraversalExecution<DFS | DAG, unknown> =
  syncConcrete;
const breadth: SyncTraversalExecution<BFS, unknown> = new BreadthFirstTraversal(
  { traversableTree: tree },
).makeRunner();
const dag: SyncTraversalExecution<DAG, unknown> = new DagTraversal({
  traversableTree: tree,
}).makeRunner();
const asyncBreadth: AsyncTraversalExecution<BFS, unknown> =
  new AsyncBreadthFirstTraversal({ traversableTree: tree }).makeRunner();
const asyncDag: AsyncTraversalExecution<DAG, unknown> = new AsyncDagTraversal({
  traversableTree: tree,
}).makeRunner();
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
