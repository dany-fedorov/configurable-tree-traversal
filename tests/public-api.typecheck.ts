import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  DagTraversal,
  DagVisitorPhase,
  DepthFirstPhase,
  DepthFirstTreeTraversal,
  ObjectTreeSource,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  traverseDag,
  traverseDagAsync,
  traverseTreeBreadthFirstAsync,
  traverseTreeDepthFirst,
  traverseTreeDepthFirstAsync,
  Vertex,
  type AsyncTraversalExecution,
  type ChildSlot,
  type TreeDagExecutionInspection,
  type DagDiscoverySource,
  type HintVertexId,
  type MaybePromise,
  type ResolvedGraphView,
  type ResolvedGraphVertex,
  type ResolvedVisitStage,
  type StructuralChildEdge,
  type TreeSource,
  type DepthFirstTreeRunner,
  type VertexId,
  type VertexTypes,
} from '../src';
import type {
  ChildSlot as CoreChildSlot,
  HintVertexId as CoreHintVertexId,
  MaybePromise as CoreMaybePromise,
  ResolvedGraphVertex as CoreGraphVertex,
  ResolvedVisitStage as CoreGraphVertexStatus,
  StructuralChildEdge as CoreGraphEdge,
  VertexId as CoreVertexId,
} from '../src/core';
import {
  hasSingleStructuralSink as hasSingleSinkFromDagSubpath,
  traverseDagAsync as traverseDagAsyncFromDagSubpath,
} from '../src/traversals/dag-traversal';

type Node = { $data: string; $childHints: (Node | null)[] };
type Tree = VertexTypes<string, Node | null>;
const root: Node = {
  $data: 'root',
  $childHints: [{ $data: 'leaf', $childHints: [] }],
};
const tree: TreeSource<Tree> = {
  resolveRoot: () => ({ kind: 'found', vertex: { vertexContent: root } }),
  resolveChild: (hint) =>
    hint === null
      ? { kind: 'omitted' }
      : { kind: 'found', vertex: { vertexContent: hint } },
};
const graph: DagDiscoverySource<Tree> = {
  resolveRoot: () => ({
    kind: 'found',
    vertex: { vertexId: 'root', vertexContent: root },
  }),
  resolveChild: (hint) =>
    hint === null
      ? { identity: null, kind: 'omitted', satisfiesDependencies: true }
      : {
          kind: 'found',
          vertex: { vertexId: hint.$data, vertexContent: hint },
        },
};

const traversal = new DepthFirstTreeTraversal({ traversableTree: tree });
traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, () => ({
  commands: [
    {
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: { newData: 'rewritten' },
    },
  ],
}));

const concreteRunner = traversal.createRunner();
for (const event of concreteRunner.iterateEvents()) {
  const data: string = event.vertex.getData();
  void data;
}

const interfaceRunner: DepthFirstTreeRunner<Tree, Tree> =
  traversal.createRunner();
interfaceRunner.iterateEvents();
interfaceRunner.run({ emitEvents: [] });
const failedStatus: TraversalRunnerStatus = TraversalRunnerStatus.FAILED;

const convenienceRunner = traverseTreeDepthFirst({
  traversableTree: tree,
  visitors: {
    POST_ORDER: (vertex) => {
      const data: string = vertex.getData();
      void data;
    },
  },
});
const convenienceData: string = convenienceRunner
  .getResolvedTreeView()
  .getRoot()!
  .getValue()
  .getData();

const objectTree = new ObjectTreeSource({ answer: 42 });
const objectRunner = new DepthFirstTreeTraversal({
  traversableTree: objectTree,
}).createRunner();
for (const event of objectRunner.iterateEvents()) {
  const key: string | number | symbol = event.vertex.getData().key;
  void key;
}

const asyncDepthResult: Promise<
  ReturnType<AsyncDepthFirstTreeTraversal<Tree>['createRunner']>
> = traverseTreeDepthFirstAsync({ traversableTree: tree });
const asyncBreadthResult: Promise<
  ReturnType<AsyncBreadthFirstTreeTraversal<Tree>['createRunner']>
> = traverseTreeBreadthFirstAsync({ traversableTree: tree });
const dagResult: ReturnType<DagTraversal<Tree>['createRunner']> = traverseDag({
  traversableGraph: graph,
});
const asyncDagResult: Promise<
  ReturnType<AsyncDagTraversal<Tree>['createRunner']>
> = traverseDagAsyncFromDagSubpath({ traversableGraph: graph });
const asyncExecution: AsyncTraversalExecution<DagVisitorPhase, unknown> =
  new AsyncDagTraversal({
    traversableGraph: graph,
  }).createRunner();
const resolvedGraphView: ResolvedGraphView<Tree> =
  dagResult.getResolvedGraphView();
const rootRef = resolvedGraphView.getRoot();
const children =
  rootRef === null ? null : resolvedGraphView.getChildrenOf(rootRef);
const inspection: TreeDagExecutionInspection = dagResult.inspect();
const oneSink: boolean = hasSingleSinkFromDagSubpath(resolvedGraphView);
const order: DagVisitorPhase = DagVisitorPhase.ON_WORK_READY;
const publicTypes: [
  VertexId,
  HintVertexId,
  MaybePromise<string>,
  ResolvedVisitStage,
  StructuralChildEdge<Tree> | null,
  ChildSlot<Tree> | null,
  ResolvedGraphVertex<Tree> | null,
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
  'INITIAL_VISIT_ELIGIBLE',
  null,
  null,
  rootRef === null ? null : resolvedGraphView.get(rootRef),
  'core-id',
  { vertexId: 'core-id' },
  'value',
  'COMPLETE',
  null,
  null,
  rootRef === null ? null : resolvedGraphView.get(rootRef),
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
  resolvedGraphView,
  children,
  inspection,
  oneSink,
  order,
  publicTypes,
];

// Canonical inputs reject retired content spelling.
const canonicalContent: import('../src').VertexContent<Tree> = {
  $data: 'canonical',
  $childHints: [],
};
const legacyContent: import('../src').VertexContentInput<Tree> = {
  // @ts-expect-error Legacy content has been removed.
  $d: 'legacy',
  // @ts-expect-error Legacy content has been removed.
  $c: [],
};
const canonicalInput: import('../src/core').VertexContentInput<Tree> =
  canonicalContent;
const legacyInput: import('../src').VertexContentInput<Tree> = legacyContent;
const canonicalVertex = new Vertex<Tree>(canonicalInput);
const copiedVertex = new Vertex<Tree>(canonicalVertex);
const canonicalData: string = canonicalVertex.$data;
// @ts-expect-error Legacy accessors have been removed.
const legacyData: string = canonicalVertex.$d;
const canonicalHints: Array<Node | null> = canonicalVertex.$childHints;
canonicalVertex.clone({ $data: 'changed', $childHints: [] });
// @ts-expect-error Legacy clone patches have been removed.
canonicalVertex.clone({ $d: 'changed', $c: [] });
const cloneFromVertex: Vertex<Tree> = canonicalVertex.clone(copiedVertex);
void cloneFromVertex;
const optionalDataVertex = new Vertex<VertexTypes<string | undefined, string>>({
  $data: 'root',
  $childHints: [],
});
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

const mixedContent: import('../src').VertexContentInput<Tree> = {
  $data: 'root',
  // @ts-expect-error Content inputs cannot mix canonical data with legacy hints.
  $c: [],
};
const duplicateContent: import('../src').VertexContentInput<Tree> = {
  $data: 'root',
  $childHints: [],
  // @ts-expect-error Complete canonical content cannot carry legacy data as well.
  $d: 'root',
};
const duplicateLegacy: import('../src').VertexContentInput<Tree> = {
  // @ts-expect-error Complete legacy content cannot carry canonical hints as well.
  $d: 'root',
  // @ts-expect-error Complete legacy content cannot carry canonical hints as well.
  $c: [],
  $childHints: [],
};
void mixedContent;
void duplicateContent;
void duplicateLegacy;

const canonicalFound: import('../src').DagVertexFound<Tree> = {
  kind: 'found',
  vertex: {
    vertexId: undefined,
    vertexContent: { $data: 'root', $childHints: [] },
  },
};
const canonicalOmitted: import('../src').DagVertexOmitted = {
  identity: null,
  kind: 'omitted',
  satisfiesDependencies: true,
};
const canonicalMissing: import('../src').DagPrerequisiteResolution<Tree> = {
  kind: 'missing',
};
const canonicalSource: import('../src').DagDiscoverySource<Tree> = {
  resolveRoot: () => canonicalFound,
  resolveChild: () => canonicalOmitted,
  resolvePrerequisite: () => canonicalMissing,
};
const missingRoot: import('../src').DagVertexResolution<Tree> = {
  // @ts-expect-error A missing lookup is not a root/hint source result.
  kind: 'missing',
};
const nullFound: import('../src').DagVertexFound<Tree> = {
  kind: 'found',
  // @ts-expect-error Found content must be non-null.
  vertex: { vertexContent: null },
};
// @ts-expect-error Omission must explicitly satisfy dependencies.
const incompleteOmission: import('../src').DagVertexOmitted = {
  kind: 'omitted',
};
// @ts-expect-error A bare null is not a resolution result.
const nullResolution: import('../src').DagPrerequisiteResolution<Tree> = null;
void canonicalSource;
void missingRoot;
void nullFound;
void incompleteOmission;
void nullResolution;

const completionPolicyRunner = new DagTraversal({
  traversableGraph: graph,
  workCompletion: 'externalSettlement',
}).createRunner();
const stopReason: import('../src').TraversalStopReason | null =
  completionPolicyRunner.getStopReason();
const coreStopReason: import('../src/core').TraversalStopReason | null =
  asyncExecution.getStopReason();
const inspectionStopReason: import('../src').TraversalStopReason | null =
  inspection.stopReason;
new AsyncDagTraversal({
  traversableGraph: graph,
  workCompletion: 'afterWorkReadyChain',
}).configure({ workCompletion: 'externalSettlement' });
new DagTraversal({ traversableGraph: graph }).configure({
  workCompletion: 'afterWorkReadyChain',
});
// @ts-expect-error Completion policy accepts only the two explicit ownership modes.
new DagTraversal({ traversableGraph: graph, workCompletion: 'automatic' });
// @ts-expect-error Async DAG configuration has the same completion policy contract.
new AsyncDagTraversal({ traversableGraph: graph, workCompletion: true });
new DagTraversal({ traversableGraph: graph }).configure({
  // @ts-expect-error Null is not an explicit completion policy.
  workCompletion: null,
});
void [stopReason, coreStopReason, inspectionStopReason];

const canonicalTreeOmitted: import('../src').TreeVertexOmitted = {
  kind: 'omitted',
};
const canonicalCoreTreeOmitted: import('../src/core').TreeVertexOmitted =
  canonicalTreeOmitted;
// @ts-expect-error Graph callbacks must explicitly acknowledge milestone satisfaction.
const treeOmittedAsGraph: import('../src').DagVertexOmitted =
  canonicalTreeOmitted;
// @ts-expect-error Graph acknowledgement is unsupported tree metadata.
const graphOmittedAsTree: import('../src').TreeVertexOmitted = canonicalOmitted;
void [canonicalCoreTreeOmitted, treeOmittedAsGraph, graphOmittedAsTree];
