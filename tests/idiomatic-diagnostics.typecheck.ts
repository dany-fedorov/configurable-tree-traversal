import type {
  AsyncBreadthFirstTreeRunner,
  AsyncDagTraversalRunner,
  AsyncDepthFirstTreeRunner,
  BreadthFirstTreeRunner,
  BreadthFirstTreeVisitPhase,
  DagTraversalRunner,
  DagVisitorPhase,
  DepthFirstTreeRunner,
  DepthFirstTreeVisitPhase,
  LiveResolvedGraphView,
  VertexVisitSchedulingStage,
  TreeOrDagExecutionSnapshot,
  VertexDataAndChildHintTypes,
} from '../src';

type G = VertexDataAndChildHintTypes<string, string>;
declare const dag: DagTraversalRunner<G>;
declare const asyncDag: AsyncDagTraversalRunner<G>;
declare const dfs: DepthFirstTreeRunner<G>;
declare const asyncDfs: AsyncDepthFirstTreeRunner<G>;
declare const bfs: BreadthFirstTreeRunner<G>;
declare const asyncBfs: AsyncBreadthFirstTreeRunner<G>;
const dagPhase: DagVisitorPhase =
  dag.captureExecutionSnapshot().dependencyEligiblePhaseVisits[0]!.visitorPhase;
const asyncDagPhase: DagVisitorPhase =
  asyncDag.captureExecutionSnapshot().vertexPhaseVisitorChains[0]!.visitorPhase;
const dfsPhase: DepthFirstTreeVisitPhase =
  dfs.captureExecutionSnapshot().vertexPhaseVisitorChains[0]!.visitorPhase;
const asyncDfsPhase: DepthFirstTreeVisitPhase =
  asyncDfs.captureExecutionSnapshot().dependencyEligiblePhaseVisits[0]!
    .visitorPhase;
const bfsPhase: BreadthFirstTreeVisitPhase =
  bfs.captureExecutionSnapshot().vertexPhaseVisitorChains[0]!.visitorPhase;
const asyncBfsPhase: BreadthFirstTreeVisitPhase =
  asyncBfs.captureExecutionSnapshot().dependencyEligiblePhaseVisits[0]!
    .visitorPhase;
const snapshot: TreeOrDagExecutionSnapshot<DagVisitorPhase> =
  dag.captureExecutionSnapshot();
const state:
  | 'active'
  | 'pausedAtCommandBoundary'
  | 'phaseChainFinished'
  | 'invalidated' = snapshot.vertexPhaseVisitorChains[0]!.state;
const index: number =
  snapshot.vertexPhaseVisitorChains[0]!.visitorCallbackIndexInPhaseChain;
const operation:
  | 'resolveRootVertex'
  | 'resolveChildVertexFromHint'
  | 'resolveChildVertexFromHint'
  | 'resolvePrerequisiteByVertexId'
  | 'transformChildHintsBeforeResolution'
  | 'tryGetVertexIdentityFromHint'
  | 'invokeVisitorCallback' = snapshot.pendingCallbackRequests[0]!.operation;
const options =
  snapshot.vertexPhaseVisitorChains[0]!.executionSelectionsAtAdmission;
// @ts-expect-error engine order is private
snapshot.dependencyEligiblePhaseVisits[0]!.order;
// @ts-expect-error chain phase is a callback phase, not its state
const oldPhase: 'running' = snapshot.vertexPhaseVisitorChains[0]!.visitorPhase;
// @ts-expect-error old callback protocol is private
snapshot.pendingCallbackRequests[0]!.kind;
// @ts-expect-error compatibility diagnostic is retired
snapshot.vertexPhaseVisitorChains[0]!.group;
// @ts-expect-error old chain position is retired
snapshot.vertexPhaseVisitorChains[0]!.position;
// @ts-expect-error old chain config is retired
snapshot.vertexPhaseVisitorChains[0]!.config;
declare const graph: LiveResolvedGraphView<G>;
const ref = graph.getVertexHandles()[0]!;
const stage: VertexVisitSchedulingStage | null =
  graph.getVertexVisitSchedulingStageOrNull(ref);
const vertexStage: VertexVisitSchedulingStage =
  graph.getVertexSnapshotOrNull(ref)!.schedulingVisitStage;
// @ts-expect-error graph status is retired
graph.getVertexSnapshotOrNull(ref)!.status;
// @ts-expect-error graph status query is retired
graph.getStatusOf(ref);
// @ts-expect-error retired stage vocabulary
const oldStage: VertexVisitSchedulingStage = 'READY';
// @ts-expect-error retired public alias
import type { ResolvedVertexStatus as _ResolvedVertexStatus } from '../src';
void [
  dagPhase,
  asyncDagPhase,
  dfsPhase,
  asyncDfsPhase,
  bfsPhase,
  asyncBfsPhase,
  snapshot,
  state,
  index,
  operation,
  options,
  stage,
  vertexStage,
  oldPhase,
  oldStage,
];
