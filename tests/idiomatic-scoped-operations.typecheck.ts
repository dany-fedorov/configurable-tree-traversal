import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  DagVisitorPhase,
  DepthFirstTreeVisitPhase,
  TraversalVisitorCommandName as Command,
  type TreeDiscoverySource,
  type VertexDataAndChildHintTypes,
  type TreeVertexPhaseVisitorCallback,
  type DagVisitor,
  type VertexDataReplacementOrDeletionCommand,
  type VertexDataMutationCommandBuilder,
  type VertexDataMutationCommandTools,
  type VisitorCommandsResult,
} from '../src';
type T = VertexDataAndChildHintTypes<string, string>;
declare const tree: TreeDiscoverySource<T>;
const treeDelete: TreeVertexPhaseVisitorCallback<
  T,
  T,
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION
> = () => ({
  commands: [
    {
      commandName: Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
    },
  ],
});
const dagDelete: DagVisitor<T, T, DagVisitorPhase.ON_WORK_READY> = () => ({
  commands: [
    {
      commandName:
        Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
    },
  ],
});
const badTree: TreeVertexPhaseVisitorCallback<
  T,
  T,
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION
> = () => ({
  commands: [
    {
      // @ts-expect-error Tree callbacks forbid DAG cascade deletion.
      commandName:
        Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
    },
  ],
});
const badDag: DagVisitor<T, T, DagVisitorPhase.ON_WORK_READY> = () => ({
  commands: [
    {
      // @ts-expect-error DAG callbacks forbid tree subtree deletion.
      commandName: Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
    },
  ],
});
new DagTraversalBuilder({
  treeDiscoverySource: tree,
}).registerVisitorCallbackForPhase(DagVisitorPhase.ON_WORK_READY, dagDelete);
new DepthFirstTreeTraversalBuilder({
  treeDiscoverySource: tree,
}).registerVisitorCallbackForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  treeDelete,
);
// @ts-expect-error Explicit graph policies are inapplicable to tree discovery.
new DagTraversalBuilder({
  treeDiscoverySource: tree,
  rootWorkPrerequisitePolicy: 'ignore',
});
// @ts-expect-error Explicit graph policies are inapplicable to async tree discovery.
new AsyncDagTraversalBuilder({
  treeDiscoverySource: tree,
  undeclaredWorkPrerequisitePolicy: 'none',
});
new DagTraversalBuilder({
  treeDiscoverySource: tree,
// @ts-expect-error Tree source patches cannot supply graph-only policies.
}).patchOptionsForFutureRunners({
  treeDiscoverySource: tree,
  undeclaredWorkPrerequisitePolicy: 'none',
});
const shared: VertexDataReplacementOrDeletionCommand<T> = {
  commandName:
    Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
};
const treeScoped: VertexDataReplacementOrDeletionCommand<
  T,
  Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS
> = {
  commandName: Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
};
declare const builder: VertexDataMutationCommandBuilder<
  T,
  string,
  Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS
>;
const builders: VertexDataMutationCommandTools<
  T,
  string,
  Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS
> = {
  makeVertexDataMutationCommand: builder,
};
const sharedResult: VisitorCommandsResult<T> = {
  commands: [shared, treeScoped],
};
void [badTree, badDag, builders, sharedResult];
type InvalidMutationScope = VertexDataReplacementOrDeletionCommand<
  T,
  // @ts-expect-error Mutation deletion scopes are limited to the two deletion names.
  Command.PAUSE_TRAVERSAL
>;
const badState: import('../src').TraversalVisitorCommand<
  T,
  Command.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE
> = {
  commandName: Command.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
  // @ts-expect-error The retired envelope field is not the canonical state field.
  commandArguments: { vertexVisitorsChainState: undefined },
};
// @ts-expect-error Removed store method has no alias.
declare const removedStoreMethod: import('../src').MutableResolvedTreeStore<T>['delete'];
void [badState, removedStoreMethod];
export type InvalidMutationScopeWitness = InvalidMutationScope;
