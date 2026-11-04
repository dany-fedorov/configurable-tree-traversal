import {
  AsyncDagTraversalBuilder,
  AsyncGraphWalkBuilder,
  DagTraversalBuilder,
  DagVisitorPhase,
  DepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase,
  GraphWalkBuilder,
  type AsyncTraversalExecution,
  type DagCommittedMilestoneEvent,
  type SyncTraversalExecution,
  type TraversalExecutionState,
  type VertexDataAndChildHintTypes,
  type TreeVertexPhaseVisitorCallback,
  type AsyncTreeVertexPhaseVisitorCallback,
  type TreePhaseVisitorRegistrationRecord,
  type TreeVisitorVertexDataMutationToolsBinder,
  type TreeVisitorVertexDataMutationToolsBinderFactory,
  type TreeOrDagExecutionSnapshot,
} from 'configurable-tree-traversal';
// @ts-expect-error Removed compatibility capability.
import type { AsyncCoreExecution } from 'configurable-tree-traversal';
// @ts-expect-error Detailed tree/DAG inspection has an explicit name.
import type { CoreInspection } from 'configurable-tree-traversal';
// @ts-expect-error Removed empty runtime base.
import { TreeTraversal } from 'configurable-tree-traversal';
// @ts-expect-error Removed empty runtime base.
import { TreeTraversalRunner } from 'configurable-tree-traversal';
// @ts-expect-error Removed empty runtime base.
import { TreeTraversalIterable } from 'configurable-tree-traversal';
// @ts-expect-error Sources implement TreeSource structurally.
import { AbstractTreeSource } from 'configurable-tree-traversal';
// @ts-expect-error Tree callback names state their family.
import type { TraversalVisitor } from 'configurable-tree-traversal';
// @ts-expect-error Tree callback names state their family.
import type { AsyncTraversalVisitor } from 'configurable-tree-traversal';
// @ts-expect-error Tree callback names state their family.
import type { TraversalVisitorRecord } from 'configurable-tree-traversal';
// @ts-expect-error Tree binder names state their family.
import type { MutationCommandBinder } from 'configurable-tree-traversal';
// @ts-expect-error Tree binder names state their family.
import type { MutationCommandBinderFactory } from 'configurable-tree-traversal';
type Tree = VertexDataAndChildHintTypes<string, string>;
const source = {
  resolveRootVertex: () => ({ kind: 'vertexIntentionallyOmitted' as const }),
  resolveChildVertexFromHint: () => ({
    kind: 'vertexIntentionallyOmitted' as const,
  }),
};
const tree = new DepthFirstTreeTraversalBuilder<Tree>({
  treeDiscoverySource: source,
}).createIndependentRunnerFromCurrentOptions();
const dag = new DagTraversalBuilder<Tree>({
  treeDiscoverySource: source,
}).createIndependentRunnerFromCurrentOptions();
const asyncDag = new AsyncDagTraversalBuilder<Tree>({
  treeDiscoverySource: source,
}).createIndependentRunnerFromCurrentOptions();
const walker = new GraphWalkBuilder({
  graphWalkDiscoverySource: {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
    enumerateRootTargets: () => [],
    enumerateOutgoingLinks: () => [],
  },
}).createIndependentRunnerFromCurrentOptions();
const asyncWalker = new AsyncGraphWalkBuilder({
  graphWalkDiscoverySource: {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
    enumerateRootTargets: () => [],
    enumerateOutgoingLinks: () => [],
  },
}).createIndependentRunnerFromCurrentOptions();
function captureExecutionSnapshot(execution: TraversalExecutionState) {
  return execution.captureExecutionSnapshot().traversalLifecycleStatus;
}
[tree, dag, asyncDag, walker, asyncWalker].forEach(captureExecutionSnapshot);
const genericDag: SyncTraversalExecution<
  DagVisitorPhase,
  DagCommittedMilestoneEvent<Tree>
> = dag;
const genericAsyncDag: AsyncTraversalExecution<
  DagVisitorPhase,
  DagCommittedMilestoneEvent<Tree>
> = asyncDag;
genericDag.runUntilSuspendedOrTerminal({
  deliveredEventKinds: [
    'workCompletionCommitted',
    'subgraphCompletionCommitted',
  ],
});
genericAsyncDag.runUntilSuspendedOrTerminal({
  deliveredEventKinds: ['workCompletionCommitted'],
  admittedVisitorCallbackPhases: { include: [DagVisitorPhase.ON_WORK_READY] },
});
genericDag.runUntilSuspendedOrTerminal({
  // @ts-expect-error Callback readiness is not a committed event kind.
  deliveredEventKinds: [DagVisitorPhase.ON_WORK_READY],
});
genericAsyncDag.runUntilSuspendedOrTerminal({
  // @ts-expect-error Async callback readiness is not a committed event kind.
  deliveredEventKinds: [DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY],
});
// @ts-expect-error Generic inspection preserves family phase variance.
const widened: SyncTraversalExecution<
  DepthFirstTreeVisitPhase | DagVisitorPhase,
  unknown
> = tree;
const detail: TreeOrDagExecutionSnapshot = tree.captureExecutionSnapshot();
const callback: TreeVertexPhaseVisitorCallback<
  Tree,
  Tree,
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION
> = () => undefined;
const asyncCallback: AsyncTreeVertexPhaseVisitorCallback<
  Tree,
  Tree,
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION
> = callback;
const record: TreePhaseVisitorRegistrationRecord<
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  Tree,
  Tree
>['visitor'] = callback;
type Binder = TreeVisitorVertexDataMutationToolsBinder<
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  Tree,
  Tree
>;
type Factory = TreeVisitorVertexDataMutationToolsBinderFactory;
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
// Scoped operations retain family safety through the packed declarations.
import {
  TraversalVisitorCommandName as ScopedCommand,
  DagTraversalBuilder as ScopedDagTraversal,
  AsyncDagTraversalBuilder as ScopedAsyncDagTraversal,
  type VertexDataReplacementOrDeletionCommand as ScopedMutationCommand,
} from 'configurable-tree-traversal';
declare const scopedTree: import('configurable-tree-traversal').TreeDiscoverySource<Tree>;
const wrongTreeDeletion: TreeVertexPhaseVisitorCallback<
  Tree,
  Tree,
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION
> = () => ({
  commands: [
    {
      // @ts-expect-error Graph cascade is not a tree command.
      commandName:
        ScopedCommand.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
    },
  ],
});
const wrongDagDeletion: import('configurable-tree-traversal').DagVisitor<
  Tree
> = () => ({
  commands: [
    {
      // @ts-expect-error Tree subtree deletion is not a DAG command.
      commandName:
        ScopedCommand.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
    },
  ],
});
// @ts-expect-error Graph work policies cannot apply to tree discovery.
new ScopedDagTraversal({
  treeDiscoverySource: scopedTree,
  rootWorkToWorkPrerequisitePolicy: 'ignore',
});
// @ts-expect-error Async synchronous-source inference preserves policy restrictions.
new ScopedAsyncDagTraversal({
  treeDiscoverySource: scopedTree,
  undeclaredWorkToWorkPrerequisitePolicy: 'none',
});
const scopedMutation: ScopedMutationCommand<
  Tree,
  ScopedCommand.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS
> = {
  commandName:
    ScopedCommand.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
};
// @ts-expect-error Retired command name has no compatibility alias.
ScopedCommand.DELETE_VERTEX;
void [wrongTreeDeletion, wrongDagDeletion, scopedMutation];
