import {
  AsyncBreadthFirstTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTraversal,
  DagTraversal,
  DagTraversalOrder,
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
  TraversableObjectTree,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  traverseDepthFirst,
  traverseBreadthFirstAsync,
  traverseDag,
  traverseDagAsync,
  traverseDepthFirstAsync,
  type AsyncCoreExecution,
  type ChildSlot,
  type CoreInspection,
  type GraphEdge,
  type GraphVertex,
  type GraphVertexStatus,
  type HintVertexId,
  type KernelInspection,
  type MaybePromise,
  type ResolvedGraph,
  type TraversableGraph,
  type TraversalRunner,
  type TreeTypeParameters,
  type TraversableTree,
  type VertexId,
} from '../src';
import type {
  ChildSlot as CoreChildSlot,
  GraphEdge as CoreGraphEdge,
  GraphVertex as CoreGraphVertex,
  GraphVertexStatus as CoreGraphVertexStatus,
  HintVertexId as CoreHintVertexId,
  MaybePromise as CoreMaybePromise,
  VertexId as CoreVertexId,
} from '../src/core';
import {
  hasSingleSink as hasSingleSinkFromDagSubpath,
  traverseDagAsync as traverseDagAsyncFromDagSubpath,
} from '../src/traversals/dag-traversal';

type Node = { $d: string; $c: (Node | null)[] };
type Tree = TreeTypeParameters<string, Node | null>;

const root: Node = { $d: 'root', $c: [{ $d: 'leaf', $c: [] }] };
const tree: TraversableTree<Tree> = {
  makeRoot: () => ({ vertexContent: root }),
  makeVertex: (hint) => ({ vertexContent: hint }),
};
const graph: TraversableGraph<Tree> = {
  makeRoot: () => ({ vertexId: 'root', vertexContent: root }),
  makeVertex: (hint) => ({ vertexId: hint?.$d, vertexContent: hint }),
};

const traversal = new DepthFirstTraversal({ traversableTree: tree });
traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, () => ({
  commands: [
    {
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: { newData: 'rewritten' },
    },
  ],
}));

const concreteRunner = traversal.makeRunner();
for (const event of concreteRunner.getIterable()) {
  const data: string = event.vertex.getData();
  void data;
}

const interfaceRunner: TraversalRunner<DepthFirstTraversalOrder, Tree, Tree> =
  traversal.makeRunner();
interfaceRunner.getIterable();
interfaceRunner.run({ iterateOver: [] });
const failedStatus: TraversalRunnerStatus = TraversalRunnerStatus.FAILED;

const convenienceRunner = traverseDepthFirst(tree, {
  postOrderVisitor: (vertex) => {
    const data: string = vertex.getData();
    void data;
  },
});
const convenienceData: string = convenienceRunner
  .getResolvedTree()
  .getRoot()!
  .unref()
  .getData();

const objectTree = new TraversableObjectTree({ answer: 42 });
const objectRunner = new DepthFirstTraversal({
  traversableTree: objectTree,
}).makeRunner();
for (const event of objectRunner.getIterable()) {
  const key: string | number | symbol = event.vertex.getData().key;
  void key;
}

const asyncDepthResult: Promise<
  ReturnType<AsyncDepthFirstTraversal<Tree>['makeRunner']>
> = traverseDepthFirstAsync(tree, null);
const asyncBreadthResult: Promise<
  ReturnType<AsyncBreadthFirstTraversal<Tree>['makeRunner']>
> = traverseBreadthFirstAsync(tree, null);
const dagResult: ReturnType<DagTraversal<Tree>['makeRunner']> = traverseDag(
  { traversableGraph: graph },
  null,
);
const asyncDagResult: Promise<
  ReturnType<AsyncDagTraversal<Tree>['makeRunner']>
> = traverseDagAsyncFromDagSubpath({ traversableGraph: graph }, null);
const asyncExecution: AsyncCoreExecution<unknown> = new AsyncDagTraversal({
  traversableGraph: graph,
}).makeRunner();
const resolvedGraph: ResolvedGraph<Tree> = dagResult.getResolvedGraph();
const rootRef = resolvedGraph.getRoot();
const children = rootRef === null ? null : resolvedGraph.getChildrenOf(rootRef);
const inspection: CoreInspection = dagResult.inspect();
const kernelInspection: KernelInspection = inspection;
const oneSink: boolean = hasSingleSinkFromDagSubpath(resolvedGraph);
const order: DagTraversalOrder = DagTraversalOrder.ON_READY;
const publicTypes: [
  VertexId,
  HintVertexId,
  MaybePromise<string>,
  GraphVertexStatus,
  GraphEdge<Tree> | null,
  ChildSlot<Tree> | null,
  GraphVertex<Tree> | null,
  CoreVertexId,
  CoreHintVertexId,
  CoreMaybePromise<string>,
  CoreGraphVertexStatus,
  CoreGraphEdge<Tree> | null,
  CoreChildSlot<Tree> | null,
  CoreGraphVertex<Tree> | null,
] = [
  'id',
  { vertexId: 'id' },
  Promise.resolve('value'),
  'READY',
  null,
  null,
  rootRef === null ? null : resolvedGraph.get(rootRef),
  'core-id',
  { vertexId: 'core-id' },
  'value',
  'COMPLETE',
  null,
  null,
  rootRef === null ? null : resolvedGraph.get(rootRef),
];

// @ts-expect-error DAG helper configuration cannot replace its explicit source.
traverseDag({ traversableGraph: graph }, null, { traversableGraph: graph });
// @ts-expect-error Async DAG helper configuration cannot replace its explicit source.
traverseDagAsync({ traversableGraph: graph }, null, { traversableTree: tree });

void [
  interfaceRunner,
  convenienceData,
  failedStatus,
  asyncDepthResult,
  asyncBreadthResult,
  dagResult,
  asyncDagResult,
  asyncExecution,
  resolvedGraph,
  children,
  inspection,
  kernelInspection,
  oneSink,
  order,
  publicTypes,
];
