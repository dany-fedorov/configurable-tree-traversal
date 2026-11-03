import {
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  DagVisitorPhase as D,
  DepthFirstTreeTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase as F,
  BreadthFirstTreeTraversalBuilder,
  AsyncBreadthFirstTreeTraversalBuilder,
  BreadthFirstTreeVisitPhase as B,
  TraversalVisitorCommandName as C,
  traverseDag,
  traverseDagAsync,
  runTreeDepthFirstUntilSuspendedOrTerminal,
  runTreeDepthFirstUntilSuspendedOrTerminalAsync,
  runTreeBreadthFirstUntilSuspendedOrTerminal,
  runTreeBreadthFirstUntilSuspendedOrTerminalAsync,
} from '../src';
import type {
  VertexDataAndChildHintTypes,
  TreeVertexPhaseVisitorCallback,
  AsyncTreeVertexPhaseVisitorCallback,
  DagVisitor,
  AsyncDagVisitor,
  TreeDiscoverySource,
  DagDiscoverySource,
} from '../src';
type T = VertexDataAndChildHintTypes<string, string>;
declare const tree: {
  treeDiscoverySource: TreeDiscoverySource<T>;
};
declare const graph: {
  dagDiscoverySource: DagDiscoverySource<T>;
};
const commonTree: TreeVertexPhaseVisitorCallback<T, T, string> = () => ({
  commands: [{ commandName: C.NO_OPERATION }],
});
const asyncCommonTree: AsyncTreeVertexPhaseVisitorCallback<
  T,
  T,
  string
> = async () => ({
  commands: [{ commandName: C.NO_OPERATION }],
});
const commonDag: DagVisitor<T> = () => ({
  commands: [{ commandName: C.NO_OPERATION }],
});
const asyncCommonDag: AsyncDagVisitor<T> = async () => ({
  commands: [{ commandName: C.NO_OPERATION }],
});
const record = <V>(visitor: V) => ({
  phaseRegistrationInsertionIndex: 0,
  descendingExecutionPriorityWithinGroup: 100,
  visitor,
});
// The same broad common-command callback works through every public entry point.
const dag = new DagTraversalBuilder<T>({
  ...graph,
  visitors: { [D.ON_WORK_READY]: [record(commonDag)] },
});
dag.registerVisitorCallbackForPhase(D.ON_WORK_READY, commonDag);
dag.patchOptionsForFutureRunners({
  visitors: { [D.ON_WORK_READY]: [record(commonDag)] },
});
dag.replaceVisitorDefinitionsForPhase(D.ON_WORK_READY, [record(commonDag)]);
traverseDag({ ...graph, visitors: { ON_WORK_READY: commonDag } });
const asyncDag = new AsyncDagTraversalBuilder<T>({
  ...graph,
  visitors: { [D.ON_WORK_READY]: [record(asyncCommonDag)] },
});
asyncDag.registerVisitorCallbackForPhase(D.ON_WORK_READY, asyncCommonDag);
asyncDag.patchOptionsForFutureRunners({
  visitors: { [D.ON_WORK_READY]: [record(asyncCommonDag)] },
});
asyncDag.replaceVisitorDefinitionsForPhase(D.ON_WORK_READY, [
  record(asyncCommonDag),
]);
traverseDagAsync({ ...graph, visitors: { ON_WORK_READY: asyncCommonDag } });
const dfs = new DepthFirstTreeTraversalBuilder<T>({
  ...tree,
  visitors: { [F.BEFORE_CHILD_EXPANSION]: [record(commonTree)] },
});
dfs.registerVisitorCallbackForPhase(F.BEFORE_CHILD_EXPANSION, commonTree);
dfs.patchOptionsForFutureRunners({
  visitors: { [F.BEFORE_CHILD_EXPANSION]: [record(commonTree)] },
});
dfs.replaceVisitorDefinitionsForPhase(F.BEFORE_CHILD_EXPANSION, [
  record(commonTree),
]);
runTreeDepthFirstUntilSuspendedOrTerminal({
  treeDiscoverySource: tree.treeDiscoverySource,
  visitors: { BEFORE_CHILD_EXPANSION: commonTree },
});
const asyncDfs = new AsyncDepthFirstTreeTraversalBuilder<T>({
  ...tree,
  visitors: { [F.BEFORE_CHILD_EXPANSION]: [record(asyncCommonTree)] },
});
asyncDfs.registerVisitorCallbackForPhase(
  F.BEFORE_CHILD_EXPANSION,
  asyncCommonTree,
);
asyncDfs.patchOptionsForFutureRunners({
  visitors: { [F.BEFORE_CHILD_EXPANSION]: [record(asyncCommonTree)] },
});
asyncDfs.replaceVisitorDefinitionsForPhase(F.BEFORE_CHILD_EXPANSION, [
  record(asyncCommonTree),
]);
runTreeDepthFirstUntilSuspendedOrTerminalAsync({
  treeDiscoverySource: tree.treeDiscoverySource,
  visitors: { BEFORE_CHILD_EXPANSION: asyncCommonTree },
});
const bfs = new BreadthFirstTreeTraversalBuilder<T>({
  ...tree,
  visitors: { [B.AT_LEVEL_ORDER_VERTEX]: [record(commonTree)] },
});
bfs.registerVisitorCallbackForPhase(B.AT_LEVEL_ORDER_VERTEX, commonTree);
bfs.patchOptionsForFutureRunners({
  visitors: { [B.AT_LEVEL_ORDER_VERTEX]: [record(commonTree)] },
});
bfs.replaceVisitorDefinitionsForPhase(B.AT_LEVEL_ORDER_VERTEX, [
  record(commonTree),
]);
runTreeBreadthFirstUntilSuspendedOrTerminal({
  treeDiscoverySource: tree.treeDiscoverySource,
  visitors: { AT_LEVEL_ORDER_VERTEX: commonTree },
});
const asyncBfs = new AsyncBreadthFirstTreeTraversalBuilder<T>({
  ...tree,
  visitors: { [B.AT_LEVEL_ORDER_VERTEX]: [record(asyncCommonTree)] },
});
asyncBfs.registerVisitorCallbackForPhase(
  B.AT_LEVEL_ORDER_VERTEX,
  asyncCommonTree,
);
asyncBfs.patchOptionsForFutureRunners({
  visitors: { [B.AT_LEVEL_ORDER_VERTEX]: [record(asyncCommonTree)] },
});
asyncBfs.replaceVisitorDefinitionsForPhase(B.AT_LEVEL_ORDER_VERTEX, [
  record(asyncCommonTree),
]);
runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
  treeDiscoverySource: tree.treeDiscoverySource,
  visitors: { AT_LEVEL_ORDER_VERTEX: asyncCommonTree },
});
// Callback contexts expose readonly registration metadata, not a callable entry.
const inspectTree: TreeVertexPhaseVisitorCallback<T, T, string> = (
  _vertex,
  options,
) => {
  const metadata: import('../src').VisitorRegistrationMetadata =
    options.visitorRegistrationMetadata;
  void [
    metadata.phaseRegistrationInsertionIndex,
    metadata.descendingExecutionPriorityWithinGroup,
    metadata.visitorCommandCommitTiming,
    metadata.visitorCommandCommitTiming,
  ];
  // @ts-expect-error Context metadata is not an executable visitor record.
  options.visitorRegistrationMetadata.visitor;
  // @ts-expect-error Context metadata is readonly.
  options.visitorRegistrationMetadata.descendingExecutionPriorityWithinGroup = 1;
};
const inspectAsyncTree: AsyncTreeVertexPhaseVisitorCallback<
  T,
  T,
  string
> = async (_vertex, options) => {
  // @ts-expect-error Async tree context metadata is not executable.
  options.visitorRegistrationMetadata.visitor;
};
const inspectDagVisitor: DagVisitor<T> = (_vertex, options) => {
  // @ts-expect-error DAG context metadata is not executable.
  options.visitorRegistrationMetadata.visitor;
};
const inspectAsyncDag: AsyncDagVisitor<T> = async (_vertex, options) => {
  // @ts-expect-error Async DAG context metadata is not executable.
  options.visitorRegistrationMetadata.visitor;
};
// Complete records remain available to the host, with phase-specific callbacks.
const listed: DagVisitor<T, T, D.ON_WORK_READY> =
  dag.getDetachedVisitorRegistrationRecordsForPhase(D.ON_WORK_READY)[0]!
    .visitor;
void [
  inspectTree,
  inspectAsyncTree,
  inspectDagVisitor,
  inspectAsyncDag,
  listed,
];
// Reading with a union key preserves the union of executable phase records.
// Each concrete family is checked separately so sync/async incompatibility
// cannot mask an accidental phase erasure.
declare const dagPhase: D;
declare const dfsPhase: F;
const dagRecords = dag.getDetachedVisitorRegistrationRecordsForPhase(dagPhase);
dag.replaceVisitorDefinitionsForPhase(
  D.ON_SUBGRAPH_COMPLETION_READY,
  // @ts-expect-error The producer may contain callbacks requiring an initial phase.
  dagRecords,
);
dag.patchOptionsForFutureRunners({
  // @ts-expect-error The producer may contain callbacks requiring an initial phase.
  visitors: { [D.ON_SUBGRAPH_COMPLETION_READY]: dagRecords },
});
dag.replaceVisitorDefinitionsForPhase(
  D.ON_WORK_READY,
  dag.getDetachedVisitorRegistrationRecordsForPhase(D.ON_WORK_READY),
);
dag.replaceVisitorDefinitionsForPhase(
  D.ON_SUBGRAPH_COMPLETION_READY,
  dag.getDetachedVisitorRegistrationRecordsForPhase(
    D.ON_SUBGRAPH_COMPLETION_READY,
  ),
);
const asyncDagRecords =
  asyncDag.getDetachedVisitorRegistrationRecordsForPhase(dagPhase);
asyncDag.replaceVisitorDefinitionsForPhase(
  D.ON_SUBGRAPH_COMPLETION_READY,
  // @ts-expect-error The producer may contain callbacks requiring an initial phase.
  asyncDagRecords,
);
asyncDag.patchOptionsForFutureRunners({
  // @ts-expect-error The producer may contain callbacks requiring an initial phase.
  visitors: { [D.ON_SUBGRAPH_COMPLETION_READY]: asyncDagRecords },
});
asyncDag.replaceVisitorDefinitionsForPhase(
  D.ON_WORK_READY,
  asyncDag.getDetachedVisitorRegistrationRecordsForPhase(D.ON_WORK_READY),
);
asyncDag.replaceVisitorDefinitionsForPhase(
  D.ON_SUBGRAPH_COMPLETION_READY,
  asyncDag.getDetachedVisitorRegistrationRecordsForPhase(
    D.ON_SUBGRAPH_COMPLETION_READY,
  ),
);
const dfsRecords = dfs.getDetachedVisitorRegistrationRecordsForPhase(dfsPhase);
// @ts-expect-error The producer may contain callbacks requiring an initial phase.
dfs.replaceVisitorDefinitionsForPhase(F.AFTER_CHILD_SUBTREES, dfsRecords);
dfs.patchOptionsForFutureRunners({
  // @ts-expect-error The producer may contain callbacks requiring an initial phase.
  visitors: { [F.AFTER_CHILD_SUBTREES]: dfsRecords },
});
dfs.replaceVisitorDefinitionsForPhase(
  F.BEFORE_CHILD_EXPANSION,
  dfs.getDetachedVisitorRegistrationRecordsForPhase(F.BEFORE_CHILD_EXPANSION),
);
dfs.replaceVisitorDefinitionsForPhase(
  F.AFTER_CHILD_SUBTREES,
  dfs.getDetachedVisitorRegistrationRecordsForPhase(F.AFTER_CHILD_SUBTREES),
);
const asyncDfsRecords =
  asyncDfs.getDetachedVisitorRegistrationRecordsForPhase(dfsPhase);
asyncDfs.replaceVisitorDefinitionsForPhase(
  F.AFTER_CHILD_SUBTREES,
  // @ts-expect-error The producer may contain callbacks requiring an initial phase.
  asyncDfsRecords,
);
asyncDfs.patchOptionsForFutureRunners({
  // @ts-expect-error The producer may contain callbacks requiring an initial phase.
  visitors: { [F.AFTER_CHILD_SUBTREES]: asyncDfsRecords },
});
asyncDfs.replaceVisitorDefinitionsForPhase(
  F.BEFORE_CHILD_EXPANSION,
  asyncDfs.getDetachedVisitorRegistrationRecordsForPhase(
    F.BEFORE_CHILD_EXPANSION,
  ),
);
asyncDfs.replaceVisitorDefinitionsForPhase(
  F.AFTER_CHILD_SUBTREES,
  asyncDfs.getDetachedVisitorRegistrationRecordsForPhase(
    F.AFTER_CHILD_SUBTREES,
  ),
);
bfs.replaceVisitorDefinitionsForPhase(
  B.AT_LEVEL_ORDER_VERTEX,
  bfs.getDetachedVisitorRegistrationRecordsForPhase(B.AT_LEVEL_ORDER_VERTEX),
);
asyncBfs.replaceVisitorDefinitionsForPhase(
  B.AT_LEVEL_ORDER_VERTEX,
  asyncBfs.getDetachedVisitorRegistrationRecordsForPhase(
    B.AT_LEVEL_ORDER_VERTEX,
  ),
);
// Explicitly typed common-command records are reusable too.
const commonTreeRecord: import('../src').TreePhaseVisitorRegistrationRecord<
  string,
  T,
  T
> = record(commonTree);
dfs.patchOptionsForFutureRunners({
  visitors: { [F.BEFORE_CHILD_EXPANSION]: [commonTreeRecord] },
});
dfs.replaceVisitorDefinitionsForPhase(F.BEFORE_CHILD_EXPANSION, [
  commonTreeRecord,
]);
bfs.patchOptionsForFutureRunners({
  visitors: { [B.AT_LEVEL_ORDER_VERTEX]: [commonTreeRecord] },
});
bfs.replaceVisitorDefinitionsForPhase(B.AT_LEVEL_ORDER_VERTEX, [
  commonTreeRecord,
]);
// The concrete tree builder contract uses the same consumer/producer rules.
declare const abstractDfs: import('../src').DepthFirstTreeTraversalBuilder<
  T,
  T
>;
abstractDfs.registerVisitorCallbackForPhase(
  F.BEFORE_CHILD_EXPANSION,
  commonTree,
  {
    visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
  },
);
abstractDfs.replaceVisitorDefinitionsForPhase(
  F.BEFORE_CHILD_EXPANSION,
  abstractDfs.getDetachedVisitorRegistrationRecordsForPhase(
    F.BEFORE_CHILD_EXPANSION,
  ),
);
abstractDfs.replaceVisitorDefinitionsForPhase(
  F.AFTER_CHILD_SUBTREES,
  // @ts-expect-error Builder lookup also preserves potentially phase-specific callbacks.
  abstractDfs.getDetachedVisitorRegistrationRecordsForPhase(dfsPhase),
);
