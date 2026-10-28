import type {
  AsyncBreadthFirstTreeRunner,
  AsyncDagTraversalRunner,
  AsyncDepthFirstTreeRunner,
  BreadthFirstTreeRunner,
  BreadthFirstPhase,
  DagTraversalRunner,
  DagVisitorPhase,
  DepthFirstTreeRunner,
  DepthFirstPhase,
  ResolvedGraph,
  ResolvedVisitStage,
  TreeDagExecutionInspection,
  VertexTypes,
} from 'configurable-tree-traversal';

type G = VertexTypes<string, string>;
declare const dag: DagTraversalRunner<G>;
declare const asyncDag: AsyncDagTraversalRunner<G>;
declare const dfs: DepthFirstTreeRunner<G>;
declare const asyncDfs: AsyncDepthFirstTreeRunner<G>;
declare const bfs: BreadthFirstTreeRunner<G>;
declare const asyncBfs: AsyncBreadthFirstTreeRunner<G>;
const dagPhase: DagVisitorPhase = dag.inspect().readyVisits[0]!.phase;
const asyncDagPhase: DagVisitorPhase = asyncDag.inspect().chains[0]!.phase;
const dfsPhase: DepthFirstPhase = dfs.inspect().chains[0]!.phase;
const asyncDfsPhase: DepthFirstPhase = asyncDfs.inspect().readyVisits[0]!.phase;
const bfsPhase: BreadthFirstPhase = bfs.inspect().chains[0]!.phase;
const asyncBfsPhase: BreadthFirstPhase =
  asyncBfs.inspect().readyVisits[0]!.phase;
const snapshot: TreeDagExecutionInspection<DagVisitorPhase> = dag.inspect();
const state: 'running' | 'paused' | 'done' | 'invalid' =
  snapshot.chains[0]!.state;
const index: number = snapshot.chains[0]!.visitorIndex;
const operation:
  | 'resolveRoot'
  | 'resolveChild'
  | 'resolvePrerequisite'
  | 'sortChildrenHints'
  | 'getVertexIdFromHint'
  | 'visit' = snapshot.pendingRequests[0]!.operation;
const options = snapshot.chains[0]!.executionOptions;
// @ts-expect-error engine order is private
snapshot.readyVisits[0]!.order;
// @ts-expect-error chain phase is a callback phase, not its state
const oldPhase: 'running' = snapshot.chains[0]!.phase;
// @ts-expect-error old callback protocol is private
snapshot.pendingRequests[0]!.kind;
// @ts-expect-error compatibility diagnostic is retired
snapshot.chains[0]!.group;
// @ts-expect-error old chain position is retired
snapshot.chains[0]!.position;
// @ts-expect-error old chain config is retired
snapshot.chains[0]!.config;
declare const graph: ResolvedGraph<G>;
const ref = graph.getVertexRefs()[0]!;
const stage: ResolvedVisitStage | null = graph.getVisitStageOf(ref);
const vertexStage: ResolvedVisitStage = graph.get(ref)!.visitStage;
// @ts-expect-error graph status is retired
graph.get(ref)!.status;
// @ts-expect-error graph status query is retired
graph.getStatusOf(ref);
// @ts-expect-error retired stage vocabulary
const oldStage: ResolvedVisitStage = 'READY';
// @ts-expect-error retired public alias
import type { ResolvedVertexStatus as _ResolvedVertexStatus } from 'configurable-tree-traversal';
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
