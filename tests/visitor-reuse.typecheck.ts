import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalOrder as D,
  DepthFirstTreeTraversal,
  AsyncDepthFirstTreeTraversal,
  DepthFirstTraversalOrder as F,
  BreadthFirstTreeTraversal,
  AsyncBreadthFirstTreeTraversal,
  BreadthFirstTraversalOrder as B,
  TraversalVisitorCommandName as C,
  traverseDag,
  traverseDagAsync,
  traverseTreeDepthFirst,
  traverseTreeDepthFirstAsync,
  traverseTreeBreadthFirst,
  traverseTreeBreadthFirstAsync,
} from '../src';
import type {
  VertexTypes,
  TraversalVisitor,
  AsyncTraversalVisitor,
  DagVisitor,
  AsyncDagVisitor,
  TreeSource,
  DagDiscoverySource,
} from '../src';

type T = VertexTypes<string, string>;
declare const tree: { traversableTree: TreeSource<T> };
declare const graph: { traversableGraph: DagDiscoverySource<T> };
const commonTree: TraversalVisitor<string, T, T> = () => ({
  commands: [{ commandName: C.NOOP }],
});
const asyncCommonTree: AsyncTraversalVisitor<string, T, T> = async () => ({
  commands: [{ commandName: C.NOOP }],
});
const commonDag: DagVisitor<T> = () => ({
  commands: [{ commandName: C.NOOP }],
});
const asyncCommonDag: AsyncDagVisitor<T> = async () => ({
  commands: [{ commandName: C.NOOP }],
});
const record = <V>(visitor: V) => ({ addedIndex: 0, priority: 100, visitor });

// The same broad common-command callback works through every public entry point.
const dag = new DagTraversal<T>({
  ...graph,
  visitors: { [D.ON_READY]: [record(commonDag)] },
});
dag.addVisitorFor(D.ON_READY, commonDag);
dag.configure({ visitors: { [D.ON_READY]: [record(commonDag)] } });
dag.setVisitorsFor(D.ON_READY, [record(commonDag)]);
traverseDag(graph, { onReadyVisitor: commonDag });

const asyncDag = new AsyncDagTraversal<T>({
  ...graph,
  visitors: { [D.ON_READY]: [record(asyncCommonDag)] },
});
asyncDag.addVisitorFor(D.ON_READY, asyncCommonDag);
asyncDag.configure({ visitors: { [D.ON_READY]: [record(asyncCommonDag)] } });
asyncDag.setVisitorsFor(D.ON_READY, [record(asyncCommonDag)]);
traverseDagAsync(graph, { onReadyVisitor: asyncCommonDag });

const dfs = new DepthFirstTreeTraversal<T>({
  ...tree,
  visitors: { [F.PRE_ORDER]: [record(commonTree)] },
});
dfs.addVisitorFor(F.PRE_ORDER, commonTree);
dfs.configure({ visitors: { [F.PRE_ORDER]: [record(commonTree)] } });
dfs.setVisitorsFor(F.PRE_ORDER, [record(commonTree)]);
traverseTreeDepthFirst(tree.traversableTree, { preOrderVisitor: commonTree });

const asyncDfs = new AsyncDepthFirstTreeTraversal<T>({
  ...tree,
  visitors: { [F.PRE_ORDER]: [record(asyncCommonTree)] },
});
asyncDfs.addVisitorFor(F.PRE_ORDER, asyncCommonTree);
asyncDfs.configure({ visitors: { [F.PRE_ORDER]: [record(asyncCommonTree)] } });
asyncDfs.setVisitorsFor(F.PRE_ORDER, [record(asyncCommonTree)]);
traverseTreeDepthFirstAsync(tree.traversableTree, {
  preOrderVisitor: asyncCommonTree,
});

const bfs = new BreadthFirstTreeTraversal<T>({
  ...tree,
  visitors: { [B.LEVEL_ORDER]: [record(commonTree)] },
});
bfs.addVisitorFor(B.LEVEL_ORDER, commonTree);
bfs.configure({ visitors: { [B.LEVEL_ORDER]: [record(commonTree)] } });
bfs.setVisitorsFor(B.LEVEL_ORDER, [record(commonTree)]);
traverseTreeBreadthFirst(tree.traversableTree, commonTree);

const asyncBfs = new AsyncBreadthFirstTreeTraversal<T>({
  ...tree,
  visitors: { [B.LEVEL_ORDER]: [record(asyncCommonTree)] },
});
asyncBfs.addVisitorFor(B.LEVEL_ORDER, asyncCommonTree);
asyncBfs.configure({
  visitors: { [B.LEVEL_ORDER]: [record(asyncCommonTree)] },
});
asyncBfs.setVisitorsFor(B.LEVEL_ORDER, [record(asyncCommonTree)]);
traverseTreeBreadthFirstAsync(tree.traversableTree, asyncCommonTree);

// Callback contexts expose readonly registration metadata, not a callable entry.
const inspectTree: TraversalVisitor<string, T, T> = (_vertex, options) => {
  const metadata: import('../src').VisitorRegistrationMetadata =
    options.visitorRecord;
  void [
    metadata.addedIndex,
    metadata.priority,
    metadata.commandCommitMode,
    metadata.resolutionStyle,
  ];
  // @ts-expect-error Context metadata is not an executable visitor record.
  options.visitorRecord.visitor;
  // @ts-expect-error Context metadata is readonly.
  options.visitorRecord.priority = 1;
};
const inspectAsyncTree: AsyncTraversalVisitor<string, T, T> = async (
  _vertex,
  options,
) => {
  // @ts-expect-error Async tree context metadata is not executable.
  options.visitorRecord.visitor;
};
const inspectDagVisitor: DagVisitor<T> = (_vertex, options) => {
  // @ts-expect-error DAG context metadata is not executable.
  options.visitorRecord.visitor;
};
const inspectAsyncDag: AsyncDagVisitor<T> = async (_vertex, options) => {
  // @ts-expect-error Async DAG context metadata is not executable.
  options.visitorRecord.visitor;
};
// Complete records remain available to the host, with phase-specific callbacks.
const listed: DagVisitor<T, T, D.ON_READY> = dag.listVisitorsFor(D.ON_READY)[0]!
  .visitor;
void [inspectTree, inspectAsyncTree, inspectDagVisitor, inspectAsyncDag, listed];

// Reading with a union key preserves the union of executable phase records.
// Each concrete family is checked separately so sync/async incompatibility
// cannot mask an accidental phase erasure.
declare const dagPhase: D;
declare const dfsPhase: F;
const dagRecords = dag.listVisitorsFor(dagPhase);
// @ts-expect-error The producer may contain callbacks requiring an initial phase.
dag.setVisitorsFor(D.ON_COMPLETE, dagRecords);
// @ts-expect-error The producer may contain callbacks requiring an initial phase.
dag.configure({ visitors: { [D.ON_COMPLETE]: dagRecords } });
dag.setVisitorsFor(D.ON_READY, dag.listVisitorsFor(D.ON_READY));
dag.setVisitorsFor(D.ON_COMPLETE, dag.listVisitorsFor(D.ON_COMPLETE));
const asyncDagRecords = asyncDag.listVisitorsFor(dagPhase);
// @ts-expect-error The producer may contain callbacks requiring an initial phase.
asyncDag.setVisitorsFor(D.ON_COMPLETE, asyncDagRecords);
// @ts-expect-error The producer may contain callbacks requiring an initial phase.
asyncDag.configure({ visitors: { [D.ON_COMPLETE]: asyncDagRecords } });
asyncDag.setVisitorsFor(D.ON_READY, asyncDag.listVisitorsFor(D.ON_READY));
asyncDag.setVisitorsFor(D.ON_COMPLETE, asyncDag.listVisitorsFor(D.ON_COMPLETE));
const dfsRecords = dfs.listVisitorsFor(dfsPhase);
// @ts-expect-error The producer may contain callbacks requiring an initial phase.
dfs.setVisitorsFor(F.POST_ORDER, dfsRecords);
// @ts-expect-error The producer may contain callbacks requiring an initial phase.
dfs.configure({ visitors: { [F.POST_ORDER]: dfsRecords } });
dfs.setVisitorsFor(F.PRE_ORDER, dfs.listVisitorsFor(F.PRE_ORDER));
dfs.setVisitorsFor(F.POST_ORDER, dfs.listVisitorsFor(F.POST_ORDER));
const asyncDfsRecords = asyncDfs.listVisitorsFor(dfsPhase);
// @ts-expect-error The producer may contain callbacks requiring an initial phase.
asyncDfs.setVisitorsFor(F.POST_ORDER, asyncDfsRecords);
// @ts-expect-error The producer may contain callbacks requiring an initial phase.
asyncDfs.configure({ visitors: { [F.POST_ORDER]: asyncDfsRecords } });
asyncDfs.setVisitorsFor(F.PRE_ORDER, asyncDfs.listVisitorsFor(F.PRE_ORDER));
asyncDfs.setVisitorsFor(F.POST_ORDER, asyncDfs.listVisitorsFor(F.POST_ORDER));
bfs.setVisitorsFor(B.LEVEL_ORDER, bfs.listVisitorsFor(B.LEVEL_ORDER));
asyncBfs.setVisitorsFor(B.LEVEL_ORDER, asyncBfs.listVisitorsFor(B.LEVEL_ORDER));

// Explicitly typed common-command records are reusable too.
const commonTreeRecord: import('../src').TraversalVisitorRecord<string, T, T> =
  record(commonTree);
dfs.configure({ visitors: { [F.PRE_ORDER]: [commonTreeRecord] } });
dfs.setVisitorsFor(F.PRE_ORDER, [commonTreeRecord]);
bfs.configure({ visitors: { [B.LEVEL_ORDER]: [commonTreeRecord] } });
bfs.setVisitorsFor(B.LEVEL_ORDER, [commonTreeRecord]);

// The exported abstract tree contract uses the same consumer/producer rules.
declare const abstractDfs: import('../src').TreeTraversal<F, T, T>;
abstractDfs.addVisitorFor(F.PRE_ORDER, commonTree, {
  commandCommitMode: 'afterGroup',
});
abstractDfs.setVisitorsFor(
  F.PRE_ORDER,
  abstractDfs.listVisitorsFor(F.PRE_ORDER),
);
// @ts-expect-error Abstract lookup also preserves potentially phase-specific callbacks.
abstractDfs.setVisitorsFor(F.POST_ORDER, abstractDfs.listVisitorsFor(dfsPhase));
