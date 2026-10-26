import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalStallError,
  type DagDependencyMilestone,
  type DagDependencyEdge,
  type DagSummary,
  type DagTraversalStallDiagnostics,
  type VertexTypes,
  type DagDiscoverySource,
} from '../src';
import type { DagDependencyEdge as CoreEdge } from '../src/core';
import type { DagDependencyMilestone as DagMilestone } from '../src/traversals/dag-traversal';
type ID = 'root' | 'child';
type G = VertexTypes<string, ID>;
const milestone: DagDependencyMilestone<ID> = {
  vertexId: 'root',
  milestone: 'work',
};
const sameMilestone: DagMilestone<ID> = milestone;
const edge: DagDependencyEdge<ID> = {
  from: milestone,
  to: { vertexId: 'child', milestone: 'completion' },
  reason: 'completionDependency',
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
    const edges: DagDependencyEdge<ID>[] = diagnostics.dependencyEdges;
    const vertexId: ID = edges[0]!.to.vertexId;
    // @ts-expect-error Edges preserve the selected ID domain.
    const other: 'other' = vertexId;
    void other;
  }
}
// @ts-expect-error Diagnostics output always has an edge list.
const incomplete: DagTraversalStallDiagnostics<ID> = {
  dependencies: [],
  unknownPrerequisiteIds: [],
  dependencyCycles: [],
  dependencyBlockedIds: [],
  structurallyIncompleteIds: [],
};
const wrongPhase: DagDependencyMilestone<ID> = {
  vertexId: 'root',
  // @ts-expect-error Milestone names are restricted.
  milestone: 'ready',
};
const wrongReason: DagDependencyEdge<ID> = {
  from: milestone,
  to: milestone,
  // @ts-expect-error Edge reasons are restricted.
  reason: 'child',
};
const legacy = new DagTraversalStallError({
  dependencies: [],
  unknownPrerequisiteIds: [],
  dependencyCycles: [],
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
