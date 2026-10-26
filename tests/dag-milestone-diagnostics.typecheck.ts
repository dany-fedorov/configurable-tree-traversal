import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalStallError,
  type DagMilestone,
  type DagWaitEdge,
  type DagSummary,
  type DagTraversalStallDiagnostics,
  type VertexTypes,
  type DagDiscoverySource,
} from '../src';
import type { DagWaitEdge as CoreEdge } from '../src/core';
import type { DagMilestone as SubpathMilestone } from '../src/traversals/dag-traversal';
type ID = 'root' | 'child';
type G = VertexTypes<string, ID>;
const milestone: DagMilestone<ID> = {
  vertexId: 'root',
  milestone: 'work',
};
const sameMilestone: SubpathMilestone<ID> = milestone;
const edge: DagWaitEdge<ID> = {
  waiter: milestone,
  prerequisite: { vertexId: 'child', milestone: 'subgraphCompletion' },
  reason: 'subgraphCompletionDependency',
};
const sameEdge: CoreEdge<ID> = edge;
const source: DagDiscoverySource<G, G, ID> = {
  resolveRoot: () => ({
    vertexId: 'root',
    vertexContent: { $data: '', $childHints: [] },
  }),
  resolveChild: (vertexId) => ({
    vertexId,
    vertexContent: { $data: '', $childHints: [] },
  }),
};
for (const Constructor of [
  DagTraversal<G, G, ID>,
  AsyncDagTraversal<G, G, ID>,
]) {
  const runner = new Constructor({ traversableGraph: source }).createRunner();
  const summary: DagSummary<ID> = runner.summary();
  const diagnostics: DagTraversalStallDiagnostics<ID> | null =
    summary.diagnostics;
  if (diagnostics) {
    const edges: DagWaitEdge<ID>[] = diagnostics.dependencyEdges;
    const vertexId: ID = edges[0]!.prerequisite.vertexId;
    // @ts-expect-error Edges preserve the selected ID domain.
    const other: 'other' = vertexId;
    void other;
  }
}
// @ts-expect-error Diagnostics output always has an edge list.
const incomplete: DagTraversalStallDiagnostics<ID> = {
  dependencies: [],
  unknownPrerequisiteIds: [],
  dependencyCycleComponents: [],
  dependencyBlockedIds: [],
  structurallyIncompleteIds: [],
};
const wrongPhase: DagMilestone<ID> = {
  vertexId: 'root',
  // @ts-expect-error Milestone names are restricted.
  milestone: 'ready',
};
const wrongReason: DagWaitEdge<ID> = {
  waiter: milestone,
  prerequisite: milestone,
  // @ts-expect-error Edge reasons are restricted.
  reason: 'child',
};
const legacy = new DagTraversalStallError({
  dependencies: [],
  unknownPrerequisiteIds: [],
  dependencyCycleComponents: [],
  dependencyBlockedIds: [],
  structurallyIncompleteIds: [],
});
const nongenericError: DagTraversalStallError = legacy;
void [
  sameMilestone,
  sameEdge,
  incomplete,
  wrongPhase,
  wrongReason,
  nongenericError,
];
