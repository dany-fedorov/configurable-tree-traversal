import {
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  DagTraversalStallError,
  type DagMilestone,
  type DagMilestoneConstraint,
  type DagProgressSnapshot,
  type DagTraversalStallDiagnostics,
  type VertexDataAndChildHintTypes,
  type DagDiscoverySource,
} from '../src';
import type { DagMilestoneConstraint as CoreEdge } from '../src/core';
import type { DagMilestone as SubpathMilestone } from '../src/traversals/dag-traversal';
type ID = 'root' | 'child';
type G = VertexDataAndChildHintTypes<string, ID>;
const milestone: DagMilestone<ID> = {
  vertexId: 'root',
  milestone: 'workCompletion',
};
const sameMilestone: SubpathMilestone<ID> = milestone;
const edge: DagMilestoneConstraint<ID> = {
  waitingMilestone: milestone,
  prerequisiteMilestone: { vertexId: 'child', milestone: 'subgraphCompletion' },
  reason: 'subgraphCompletionDependency',
};
const sameEdge: CoreEdge<ID> = edge;
const source: DagDiscoverySource<G, G, ID> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'root',
      vertexContentInput: { $vertexData: '', $childDiscoveryHints: [] },
    },
  }),
  resolveChildHint: (vertexId) => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId,
      vertexContentInput: { $vertexData: '', $childDiscoveryHints: [] },
    },
  }),
};
for (const Constructor of [
  DagTraversalBuilder<G, G, ID>,
  AsyncDagTraversalBuilder<G, G, ID>,
]) {
  const runner = new Constructor({
    dagDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  const captureProgressSnapshot: DagProgressSnapshot<ID> =
    runner.captureProgressSnapshot();
  const diagnostics: DagTraversalStallDiagnostics<ID> | null =
    captureProgressSnapshot.invalidDependencyTopologyDiagnostics;
  if (diagnostics) {
    const edges: DagMilestoneConstraint<ID>[] =
      diagnostics.originalMilestoneConstraints;
    const vertexId: ID = edges[0]!.prerequisiteMilestone.vertexId;
    // @ts-expect-error Edges preserve the selected ID domain.
    const other: 'other' = vertexId;
    void other;
  }
}
// @ts-expect-error Diagnostics output always has an edge list.
const incomplete: DagTraversalStallDiagnostics<ID> = {
  blockedVertexPrerequisiteReports: [],
  unresolvedPrerequisiteVertexIds: [],
  milestoneCycleVertexIdComponents: [],
  nonCyclePrerequisiteBlockedVertexIds: [],
  incompleteVertexIdsWithoutUnmetPrerequisites: [],
};
const wrongPhase: DagMilestone<ID> = {
  vertexId: 'root',
  // @ts-expect-error Milestone names are restricted.
  milestone: 'ready',
};
const wrongReason: DagMilestoneConstraint<ID> = {
  waitingMilestone: milestone,
  prerequisiteMilestone: milestone,
  // @ts-expect-error Edge reasons are restricted.
  reason: 'child',
};
const legacy = new DagTraversalStallError({
  blockedVertexPrerequisiteReports: [],
  unresolvedPrerequisiteVertexIds: [],
  milestoneCycleVertexIdComponents: [],
  nonCyclePrerequisiteBlockedVertexIds: [],
  incompleteVertexIdsWithoutUnmetPrerequisites: [],
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
