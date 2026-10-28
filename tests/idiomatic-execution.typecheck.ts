import {
  AsyncDagTraversal,
  AsyncGraphWalk,
  DagTraversal,
  DagVisitorPhase,
  DepthFirstTreeTraversal,
  DepthFirstPhase,
  GraphWalk,
  type AsyncTraversalExecution,
  type DagEvent,
  type SyncTraversalExecution,
  type TraversalExecutionState,
  type VertexTypes,
  type TreeVisitor,
  type AsyncTreeVisitor,
  type TreeVisitorRecord,
  type TreeMutationCommandBinder,
  type TreeMutationCommandBinderFactory,
  type TreeDagExecutionInspection,
} from '../src';
// @ts-expect-error Removed compatibility capability.
import type { AsyncCoreExecution } from '../src';
// @ts-expect-error Detailed tree/DAG inspection has an explicit name.
import type { CoreInspection } from '../src';
// @ts-expect-error Removed empty runtime base.
import { TreeTraversal } from '../src';
// @ts-expect-error Removed empty runtime base.
import { TreeTraversalRunner } from '../src';
// @ts-expect-error Removed empty runtime base.
import { TreeTraversalIterable } from '../src';
// @ts-expect-error Sources implement TreeSource structurally.
import { AbstractTreeSource } from '../src';
// @ts-expect-error Tree callback names state their family.
import type { TraversalVisitor } from '../src';
// @ts-expect-error Tree callback names state their family.
import type { AsyncTraversalVisitor } from '../src';
// @ts-expect-error Tree callback names state their family.
import type { TraversalVisitorRecord } from '../src';
// @ts-expect-error Tree binder names state their family.
import type { MutationCommandBinder } from '../src';
// @ts-expect-error Tree binder names state their family.
import type { MutationCommandBinderFactory } from '../src';

type Tree = VertexTypes<string, string>;
const source = {
  resolveRoot: () => ({ kind: 'omitted' as const }),
  resolveChild: () => ({ kind: 'omitted' as const }),
};
const tree = new DepthFirstTreeTraversal<Tree>({
  traversableTree: source,
}).createRunner();
const dag = new DagTraversal<Tree>({ traversableTree: source }).createRunner();
const asyncDag = new AsyncDagTraversal<Tree>({
  traversableTree: source,
}).createRunner();
const walker = new GraphWalk({
  source: {
    hydration: 'inlineOrCached' as const,
    roots: () => [],
    outgoing: () => [],
  },
}).createRunner();
const asyncWalker = new AsyncGraphWalk({
  source: {
    hydration: 'inlineOrCached' as const,
    roots: () => [],
    outgoing: () => [],
  },
}).createRunner();
function inspect(execution: TraversalExecutionState) {
  return execution.inspect().status;
}
[tree, dag, asyncDag, walker, asyncWalker].forEach(inspect);
const genericDag: SyncTraversalExecution<DagVisitorPhase, DagEvent<Tree>> = dag;
const genericAsyncDag: AsyncTraversalExecution<
  DagVisitorPhase,
  DagEvent<Tree>
> = asyncDag;
genericDag.run({ emitEvents: ['workCompleted', 'subgraphCompleted'] });
genericAsyncDag.run({
  emitEvents: ['workCompleted'],
  visitorPhases: { include: [DagVisitorPhase.ON_WORK_READY] },
});
// @ts-expect-error Callback readiness is not a committed event kind.
genericDag.run({ emitEvents: [DagVisitorPhase.ON_WORK_READY] });
// @ts-expect-error Async callback readiness is not a committed event kind.
genericAsyncDag.run({ emitEvents: [DagVisitorPhase.ON_SUBGRAPH_READY] });
// @ts-expect-error Generic inspection preserves family phase variance.
const widened: SyncTraversalExecution<
  DepthFirstPhase | DagVisitorPhase,
  unknown
> = tree;
const detail: TreeDagExecutionInspection = tree.inspect();
const callback: TreeVisitor<DepthFirstPhase.PRE_ORDER, Tree, Tree> = () =>
  undefined;
const asyncCallback: AsyncTreeVisitor<DepthFirstPhase.PRE_ORDER, Tree, Tree> =
  callback;
const record: TreeVisitorRecord<
  DepthFirstPhase.PRE_ORDER,
  Tree,
  Tree
>['visitor'] = callback;
type Binder = TreeMutationCommandBinder<DepthFirstPhase.PRE_ORDER, Tree, Tree>;
type Factory = TreeMutationCommandBinderFactory;
void [detail, asyncCallback, record, widened];
export type Binders = [Binder, Factory];

export type RemovedTypes = [
  AsyncCoreExecution<unknown>,
  CoreInspection,
  TraversalVisitor,
  AsyncTraversalVisitor,
  TraversalVisitorRecord<never, Tree, Tree>,
  MutationCommandBinder<never, Tree, Tree>,
  MutationCommandBinderFactory,
];
void [
  TreeTraversal,
  TreeTraversalRunner,
  TreeTraversalIterable,
  AbstractTreeSource,
];
