import { createVertexIdLabeler } from '@core/graph/identity';

/** A vertex milestone in the original declared dependency constraints. */
export type DagDependencyMilestone<ID = unknown> = {
  vertexId: ID;
  milestone: 'work' | 'completion';
};

/** Direction means from waits for to, independently of accepted work seeds. */
export type DagDependencyEdge<ID = unknown> = {
  from: DagDependencyMilestone<ID>;
  to: DagDependencyMilestone<ID>;
  reason:
    | 'workDependency'
    | 'completionDependency'
    | 'ownWork'
    | 'structuralChild';
};

export type DagTraversalStallDiagnostics<ID = unknown> = {
  dependencies: Array<{ id: ID; unmet: ID[] }>;
  unknownPrerequisiteIds: ID[];
  /** Strongly connected component membership, not ordered cycle witnesses. */
  dependencyCycles: ID[][];
  dependencyEdges: DagDependencyEdge<ID>[];
  dependencyBlockedIds: ID[];
  structurallyIncompleteIds: ID[];
};

export class DagTraversalStallError extends Error {
  readonly diagnostics: DagTraversalStallDiagnostics;

  constructor(
    diagnostics: Omit<DagTraversalStallDiagnostics, 'dependencyEdges'> &
      Partial<Pick<DagTraversalStallDiagnostics, 'dependencyEdges'>>,
  ) {
    const ids = diagnostics.dependencies.flatMap(({ id, unmet }) => [
      id,
      ...unmet,
    ]);
    const detail =
      ids.length > 0
        ? ids.map(createVertexIdLabeler()).join(', ')
        : 'incomplete work';
    super(`DAG traversal stalled: ${detail}`);
    this.name = 'DagTraversalStallError';
    this.diagnostics = {
      dependencies: diagnostics.dependencies.map(({ id, unmet }) => ({
        id,
        unmet: unmet.slice(),
      })),
      unknownPrerequisiteIds: diagnostics.unknownPrerequisiteIds.slice(),
      dependencyCycles: diagnostics.dependencyCycles.map((ids) => ids.slice()),
      dependencyEdges: (diagnostics.dependencyEdges ?? []).map((edge) => ({
        from: { ...edge.from },
        to: { ...edge.to },
        reason: edge.reason,
      })),
      dependencyBlockedIds: diagnostics.dependencyBlockedIds.slice(),
      structurallyIncompleteIds: diagnostics.structurallyIncompleteIds.slice(),
    };
  }
}
