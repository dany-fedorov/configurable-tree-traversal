import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase,
  DepthFirstTreeVisitPhase,
  DepthFirstTreeTraversalBuilder,
  ObjectPropertyTreeSource,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  traverseDag,
  traverseDagAsync,
  runTreeBreadthFirstUntilSuspendedOrTerminalAsync,
  runTreeDepthFirstUntilSuspendedOrTerminal,
  runTreeDepthFirstUntilSuspendedOrTerminalAsync,
  Vertex,
  type AsyncTraversalExecution,
  type ChildDiscoverySlot,
  type TreeOrDagExecutionSnapshot,
  type DagDiscoverySource,
  type ChildHintVertexIdentity,
  type MaybePromise,
  type LiveResolvedGraphView,
  type ResolvedGraphVertexSnapshot,
  type VertexVisitSchedulingStage,
  type StructuralChildEdge,
  type TreeDiscoverySource,
  type DepthFirstTreeRunner,
  type VertexId,
  type VertexDataAndChildHintTypes,
} from '../src';
import type {
  ChildDiscoverySlot as CoreChildSlot,
  ChildHintVertexIdentity as CoreHintVertexId,
  MaybePromise as CoreMaybePromise,
  ResolvedGraphVertexSnapshot as CoreGraphVertex,
  VertexVisitSchedulingStage as CoreGraphVertexStatus,
  StructuralChildEdge as CoreGraphEdge,
  VertexId as CoreVertexId,
} from '../src/core';
import {
  hasExactlyOneResolvedStructuralLeaf as hasSingleSinkFromDagSubpath,
  traverseDagAsync as traverseDagAsyncFromDagSubpath,
} from '../src/traversals/dag-traversal';

type Node = { $vertexData: string; $childDiscoveryHints: (Node | null)[] };
type Tree = VertexDataAndChildHintTypes<string, Node | null>;
const root: Node = {
  $vertexData: 'root',
  $childDiscoveryHints: [{ $vertexData: 'leaf', $childDiscoveryHints: [] }],
};
const tree: TreeDiscoverySource<Tree> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved',
    resolvedVertexInput: { vertexContentInput: root },
  }),
  resolveChildVertexFromHint: (hint) =>
    hint === null
      ? { kind: 'vertexIntentionallyOmitted' }
      : {
          kind: 'vertexResolved',
          resolvedVertexInput: { vertexContentInput: hint },
        },
};
const graph: DagDiscoverySource<Tree> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved',
    resolvedVertexInput: { vertexId: 'root', vertexContentInput: root },
  }),
  resolveChildVertexFromHint: (hint) =>
    hint === null
      ? {
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted',
          satisfiesWorkAndSubgraphCompletionPrerequisites: true,
        }
      : {
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexId: hint.$vertexData,
            vertexContentInput: hint,
          },
        },
};

const traversal = new DepthFirstTreeTraversalBuilder({
  treeDiscoverySource: tree,
});
traversal.registerVisitorForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  () => ({
    commands: [
      {
        commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
        commandArguments: { replacementVertexData: 'rewritten' },
      },
    ],
  }),
);

const concreteRunner = traversal.createIndependentRunnerFromCurrentOptions();
for (const event of concreteRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
  const data: string = event.vertex.getVertexData();
  void data;
}

const interfaceRunner: DepthFirstTreeRunner<Tree, Tree> =
  traversal.createIndependentRunnerFromCurrentOptions();
interfaceRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
interfaceRunner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
const failedStatus: TraversalRunnerStatus = TraversalRunnerStatus.FAILED;

const convenienceRunner = runTreeDepthFirstUntilSuspendedOrTerminal({
  treeDiscoverySource: tree,
  visitors: {
    AFTER_CHILD_SUBTREES: (vertex) => {
      const data: string = vertex.getVertexData();
      void data;
    },
  },
});
const convenienceData: string = convenienceRunner
  .getLiveResolvedTreeView()
  .getRootVertexHandleOrNull()!
  .getCurrentVertexView()
  .getVertexData();

const objectTree = new ObjectPropertyTreeSource({ answer: 42 });
const objectRunner = new DepthFirstTreeTraversalBuilder({
  treeDiscoverySource: objectTree,
}).createIndependentRunnerFromCurrentOptions();
for (const event of objectRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
  const key: string | number | symbol =
    event.vertex.getVertexData().propertyKey;
  void key;
}

const asyncDepthResult: Promise<
  ReturnType<
    AsyncDepthFirstTreeTraversalBuilder<Tree>['createIndependentRunnerFromCurrentOptions']
  >
> = runTreeDepthFirstUntilSuspendedOrTerminalAsync({
  treeDiscoverySource: tree,
});
const asyncBreadthResult: Promise<
  ReturnType<
    AsyncBreadthFirstTreeTraversalBuilder<Tree>['createIndependentRunnerFromCurrentOptions']
  >
> = runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
  treeDiscoverySource: tree,
});
const dagResult: ReturnType<
  DagTraversalBuilder<Tree>['createIndependentRunnerFromCurrentOptions']
> = traverseDag({
  dagDiscoverySource: graph,
});
const asyncDagResult: Promise<
  ReturnType<
    AsyncDagTraversalBuilder<Tree>['createIndependentRunnerFromCurrentOptions']
  >
> = traverseDagAsyncFromDagSubpath({ dagDiscoverySource: graph });
const asyncExecution: AsyncTraversalExecution<DagVisitorPhase, unknown> =
  new AsyncDagTraversalBuilder({
    dagDiscoverySource: graph,
  }).createIndependentRunnerFromCurrentOptions();
const liveResolvedGraphView: LiveResolvedGraphView<Tree> =
  dagResult.getLiveResolvedGraphView();
const rootRef = liveResolvedGraphView.getDesignatedRootHandleOrNull();
const children =
  rootRef === null
    ? null
    : liveResolvedGraphView.getStructuralChildHandlesInSlotOrderOrNull(rootRef);
const inspection: TreeOrDagExecutionSnapshot =
  dagResult.captureExecutionSnapshot();
const oneSink: boolean = hasSingleSinkFromDagSubpath(liveResolvedGraphView);
const order: DagVisitorPhase = DagVisitorPhase.ON_WORK_READY;
const publicTypes: [
  VertexId,
  ChildHintVertexIdentity,
  MaybePromise<string>,
  VertexVisitSchedulingStage,
  StructuralChildEdge<Tree> | null,
  ChildDiscoverySlot<Tree> | null,
  ResolvedGraphVertexSnapshot<Tree> | null,
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
  rootRef === null
    ? null
    : liveResolvedGraphView.getVertexSnapshotOrNull(rootRef),
  'core-id',
  { vertexId: 'core-id' },
  'value',
  'COMPLETION_VISIT_COMMITTED',
  null,
  null,
  rootRef === null
    ? null
    : liveResolvedGraphView.getVertexSnapshotOrNull(rootRef),
];

// @ts-expect-error DAG helper configuration cannot replace its explicit source.
traverseDag({ dagDiscoverySource: graph }, null, { dagDiscoverySource: graph });
// @ts-expect-error Async DAG helper configuration cannot replace its explicit source.
traverseDagAsync({ dagDiscoverySource: graph }, null, {
  treeDiscoverySource: tree,
});

void [
  interfaceRunner,
  convenienceData,
  failedStatus,
  asyncDepthResult,
  asyncBreadthResult,
  dagResult,
  asyncDagResult,
  asyncExecution,
  liveResolvedGraphView,
  children,
  inspection,
  oneSink,
  order,
  publicTypes,
];

// Canonical inputs reject retired content spelling.
const canonicalContent: import('../src').VertexContent<Tree> = {
  $vertexData: 'canonical',
  $childDiscoveryHints: [],
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
const canonicalData: string = canonicalVertex.$vertexData;
// @ts-expect-error Legacy accessors have been removed.
const legacyData: string = canonicalVertex.$d;
const canonicalHints: Array<Node | null> = canonicalVertex.$childDiscoveryHints;
canonicalVertex.createEditableShallowCloneWithContentOverrides({
  $vertexData: 'changed',
  $childDiscoveryHints: [],
});
canonicalVertex.createEditableShallowCloneWithContentOverrides({
  // @ts-expect-error Legacy clone patches have been removed.
  $d: 'changed',
  // @ts-expect-error Legacy clone patches have been removed.
  $c: [],
});
const cloneFromVertex: Vertex<Tree> =
  canonicalVertex.createEditableShallowCloneWithContentOverrides(copiedVertex);
void cloneFromVertex;
const optionalDataVertex = new Vertex<
  VertexDataAndChildHintTypes<string | undefined, string>
>({
  $vertexData: 'root',
  $childDiscoveryHints: [],
});
optionalDataVertex.createEditableShallowCloneWithContentOverrides({
  $vertexData: undefined,
});
canonicalVertex.createEditableShallowCloneWithContentOverrides({
  $vertexData: 'changed',
  // @ts-expect-error Clone updates cannot mix canonical data and legacy hints.
  $c: [],
});
canonicalVertex.createEditableShallowCloneWithContentOverrides({
  // @ts-expect-error Canonical data retains its declared type.
  $vertexData: 42,
});
canonicalVertex.createEditableShallowCloneWithContentOverrides({
  // @ts-expect-error Canonical hints retain their declared type.
  $childDiscoveryHints: ['wrong hint'],
});
void copiedVertex;
void canonicalData;
void legacyData;
void canonicalHints;
void canonicalVertex;
void legacyInput;

const mixedContent: import('../src').VertexContentInput<Tree> = {
  $vertexData: 'root',
  // @ts-expect-error Content inputs cannot mix canonical data with legacy hints.
  $c: [],
};
const duplicateContent: import('../src').VertexContentInput<Tree> = {
  $vertexData: 'root',
  $childDiscoveryHints: [],
  // @ts-expect-error Complete canonical content cannot carry legacy data as well.
  $d: 'root',
};
const duplicateLegacy: import('../src').VertexContentInput<Tree> = {
  // @ts-expect-error Complete legacy content cannot carry canonical hints as well.
  $d: 'root',
  // @ts-expect-error Complete legacy content cannot carry canonical hints as well.
  $c: [],
  $childDiscoveryHints: [],
};
void mixedContent;
void duplicateContent;
void duplicateLegacy;

const canonicalFound: import('../src').ResolvedDagSourceVertex<Tree> = {
  kind: 'vertexResolved',
  resolvedVertexInput: {
    vertexId: undefined,
    vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
  },
};
const canonicalOmitted: import('../src').OmittedDagSourceVertex = {
  omittedVertexIdentity: null,
  kind: 'vertexIntentionallyOmitted',
  satisfiesWorkAndSubgraphCompletionPrerequisites: true,
};
const canonicalMissing: import('../src').DagPrerequisiteLookupResult<Tree> = {
  kind: 'missing',
};
const canonicalSource: import('../src').DagDiscoverySource<Tree> = {
  resolveRootVertex: () => canonicalFound,
  resolveChildVertexFromHint: () => canonicalOmitted,
  resolvePrerequisiteByVertexId: () => canonicalMissing,
};
const missingRoot: import('../src').DagSourceVertexResolution<Tree> = {
  // @ts-expect-error A missing lookup is not a root/hint source result.
  kind: 'missing',
};
const nullFound: import('../src').ResolvedDagSourceVertex<Tree> = {
  kind: 'vertexResolved',
  // @ts-expect-error Found content must be non-null.
  resolvedVertexInput: { vertexContentInput: null },
};
// @ts-expect-error Omission must explicitly satisfy dependencies.
const incompleteOmission: import('../src').OmittedDagSourceVertex = {
  kind: 'vertexIntentionallyOmitted',
};
// @ts-expect-error A bare null is not a resolution result.
const nullResolution: import('../src').DagPrerequisiteLookupResult<Tree> = null;
void canonicalSource;
void missingRoot;
void nullFound;
void incompleteOmission;
void nullResolution;

const completionPolicyRunner = new DagTraversalBuilder({
  dagDiscoverySource: graph,
  workCompletionPolicy: 'requireExternalWorkSettlement',
}).createIndependentRunnerFromCurrentOptions();
const stopReason: import('../src').TraversalStopReason | null =
  completionPolicyRunner.getTraversalStopReason();
const coreStopReason: import('../src/core').TraversalStopReason | null =
  asyncExecution.getTraversalStopReason();
const inspectionStopReason: import('../src').TraversalStopReason | null =
  inspection.traversalStopReason;
new AsyncDagTraversalBuilder({
  dagDiscoverySource: graph,
  workCompletionPolicy: 'afterWorkReadyVisitorChain',
}).patchOptionsForFutureRunners({
  workCompletionPolicy: 'requireExternalWorkSettlement',
});
new DagTraversalBuilder({
  dagDiscoverySource: graph,
}).patchOptionsForFutureRunners({
  workCompletionPolicy: 'afterWorkReadyVisitorChain',
});
new DagTraversalBuilder({
  dagDiscoverySource: graph,
  // @ts-expect-error Completion policy accepts only the two explicit ownership modes.
  workCompletionPolicy: 'automatic',
});
new AsyncDagTraversalBuilder({
  dagDiscoverySource: graph,
  // @ts-expect-error Async DAG configuration has the same completion policy contract.
  workCompletionPolicy: true,
});
new DagTraversalBuilder({
  dagDiscoverySource: graph,
}).patchOptionsForFutureRunners({
  // @ts-expect-error Null is not an explicit completion policy.
  workCompletionPolicy: null,
});
void [stopReason, coreStopReason, inspectionStopReason];

const canonicalTreeOmitted: import('../src').OmittedTreeSourceVertex = {
  kind: 'vertexIntentionallyOmitted',
};
const canonicalCoreTreeOmitted: import('../src/core').OmittedTreeSourceVertex =
  canonicalTreeOmitted;
// @ts-expect-error Graph callbacks must explicitly acknowledge milestone satisfaction.
const treeOmittedAsGraph: import('../src').OmittedDagSourceVertex =
  canonicalTreeOmitted;
// @ts-expect-error Graph acknowledgement is unsupported tree metadata.
const graphOmittedAsTree: import('../src').OmittedTreeSourceVertex =
  canonicalOmitted;
void [canonicalCoreTreeOmitted, treeOmittedAsGraph, graphOmittedAsTree];
