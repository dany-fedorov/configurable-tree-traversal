import {
  AsyncDagTraversal,
  DagTraversal,
  DepthFirstTreeTraversal,
  DagVisitorPhase,
  DepthFirstPhase,
  TraversalVisitorCommandName as Command,
  type TreeSource,
  type VertexTypes,
  type TreeVisitor,
  type DagVisitor,
  type MutationCommand,
  type MutationCommandBuilder,
  type MutationCommands,
  type TraversalVisitorResult,
} from '../src';
type T = VertexTypes<string, string>;
declare const tree: TreeSource<T>;
const treeDelete: TreeVisitor<DepthFirstPhase.PRE_ORDER, T> = () => ({
  commands: [{ commandName: Command.DELETE_TREE_SUBTREE }],
});
const dagDelete: DagVisitor<T, T, DagVisitorPhase.ON_WORK_READY> = () => ({
  commands: [{ commandName: Command.DELETE_DAG_VERTEX_CASCADE }],
});
const badTree: TreeVisitor<DepthFirstPhase.PRE_ORDER, T> = () => ({
  // @ts-expect-error Tree callbacks forbid DAG cascade deletion.
  commands: [{ commandName: Command.DELETE_DAG_VERTEX_CASCADE }],
});
const badDag: DagVisitor<T, T, DagVisitorPhase.ON_WORK_READY> = () => ({
  // @ts-expect-error DAG callbacks forbid tree subtree deletion.
  commands: [{ commandName: Command.DELETE_TREE_SUBTREE }],
});
new DagTraversal({ traversableTree: tree }).addVisitorFor(
  DagVisitorPhase.ON_WORK_READY,
  dagDelete,
);
new DepthFirstTreeTraversal({ traversableTree: tree }).addVisitorFor(
  DepthFirstPhase.PRE_ORDER,
  treeDelete,
);
// @ts-expect-error Explicit graph policies are inapplicable to tree discovery.
new DagTraversal({ traversableTree: tree, rootWorkDependencies: 'ignore' });
// @ts-expect-error Explicit graph policies are inapplicable to async tree discovery.
new AsyncDagTraversal({
  traversableTree: tree,
  dependsOnWorkDefault: 'none',
});
// @ts-expect-error Tree source patches cannot supply graph-only policies.
new DagTraversal({ traversableTree: tree }).configure({
  traversableTree: tree,
  dependsOnWorkDefault: 'none',
});
const shared: MutationCommand<T> = {
  commandName: Command.DELETE_DAG_VERTEX_CASCADE,
};
const treeScoped: MutationCommand<T, Command.DELETE_TREE_SUBTREE> = {
  commandName: Command.DELETE_TREE_SUBTREE,
};
declare const builder: MutationCommandBuilder<
  T,
  string,
  Command.DELETE_TREE_SUBTREE
>;
const builders: MutationCommands<T, string, Command.DELETE_TREE_SUBTREE> = {
  makeMutationCommand: builder,
};
const sharedResult: TraversalVisitorResult<T> = {
  commands: [shared, treeScoped],
};
void [badTree, badDag, builders, sharedResult];

// @ts-expect-error Mutation deletion scopes are limited to the two deletion names.
type InvalidMutationScope = MutationCommand<T, Command.PAUSE_TRAVERSAL>;
const badState: import('../src').TraversalVisitorCommand<
  T,
  Command.SET_VISITOR_CHAIN_STATE
> = {
  commandName: Command.SET_VISITOR_CHAIN_STATE,
  // @ts-expect-error The retired envelope field is not the canonical state field.
  commandArguments: { vertexVisitorsChainState: undefined },
};
// @ts-expect-error Removed store method has no alias.
declare const removedStoreMethod: import('../src').ResolvedTreeStore<T>['delete'];
void [badState, removedStoreMethod];
export type InvalidMutationScopeWitness = InvalidMutationScope;
