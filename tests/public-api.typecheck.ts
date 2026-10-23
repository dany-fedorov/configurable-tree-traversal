import {
  AsyncBreadthFirstTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTraversal,
  DagTraversal,
  DagTraversalOrder,
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
  TraversableObjectTree,
  Vertex,
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

// Canonical content is descriptive; input boundaries preserve legacy shapes.
const canonicalContent: import('../src').VertexContent<Tree> = {
  $data: 'canonical',
  $childHints: [],
};
const legacyContent: import('../src').LegacyVertexContent<Tree> = {
  $d: 'legacy',
  $c: [],
};
const canonicalInput: import('../src/core').VertexContentInput<Tree> =
  canonicalContent;
const legacyInput: import('../src').VertexContentInput<Tree> = legacyContent;
const canonicalVertex = new Vertex<Tree>(canonicalInput);
const copiedVertex = new Vertex<Tree>(canonicalVertex);
const canonicalData: string = canonicalVertex.$data;
const legacyData: string = canonicalVertex.$d;
const canonicalHints: Array<Node | null> = canonicalVertex.$childHints;
canonicalVertex.clone({ $data: 'changed', $childHints: [] });
canonicalVertex.clone({ $d: 'changed', $c: [] });
const optionalDataVertex = new Vertex<
  TreeTypeParameters<string | undefined, string>
>({ $data: 'root', $childHints: [] });
optionalDataVertex.clone({ $data: undefined });
// @ts-expect-error Clone updates cannot mix canonical data and legacy hints.
canonicalVertex.clone({ $data: 'changed', $c: [] });
// @ts-expect-error Canonical data retains its declared type.
canonicalVertex.clone({ $data: 42 });
// @ts-expect-error Canonical hints retain their declared type.
canonicalVertex.clone({ $childHints: ['wrong hint'] });
void copiedVertex;
void canonicalData;
void legacyData;
void canonicalHints;
void canonicalVertex;
void legacyInput;

// @ts-expect-error Content inputs cannot mix canonical data with legacy hints.
const mixedContent: import('../src').VertexContentInput<Tree> = {
  $data: 'root',
  $c: [],
};
// @ts-expect-error Complete canonical content cannot carry legacy data as well.
const duplicateContent: import('../src').VertexContentInput<Tree> = {
  $data: 'root',
  $childHints: [],
  $d: 'root',
};
// @ts-expect-error Complete legacy content cannot carry canonical hints as well.
const duplicateLegacy: import('../src').VertexContentInput<Tree> = {
  $d: 'root',
  $c: [],
  $childHints: [],
};
void mixedContent;
void duplicateContent;
void duplicateLegacy;
