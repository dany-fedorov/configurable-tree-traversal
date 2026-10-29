import { createVertexIdLabeler } from '@core/graph/identity';

/** A vertex milestone in the original declared dependency constraints. */
export type DagMilestone<ID = unknown> = {
  vertexId: ID;
  milestone: 'work' | 'subgraphCompletion';
};

/** Direction means waiter waits for prerequisite, independently of accepted work seeds. */
export type DagWaitEdge<ID = unknown> = {
  waiter: DagMilestone<ID>;
  prerequisite: DagMilestone<ID>;
  reason:
    | 'workDependency'
    | 'subgraphCompletionDependency'
    | 'ownWork'
    | 'structuralChild';
};

export type DagTraversalStallDiagnostics<ID = unknown> = {
  dependencies: Array<{ id: ID; unmet: ID[] }>;
  unknownPrerequisiteIds: ID[];
  /** Strongly connected component membership, not ordered cycle witnesses. */
  dependencyCycleComponents: ID[][];
  dependencyEdges: DagWaitEdge<ID>[];
  dependencyBlockedIds: ID[];
  structurallyIncompleteIds: ID[];
};

// Keep legacy constructor calls in the unknown domain (including heterogeneous
// IDs); explicit type arguments validate diagnostics on TypeScript 4.7 too.
type DiagnosticId<ID> = [ID][ID extends unknown ? 0 : never];

/** Explicit ID annotations type diagnostics; arbitrary catches retain the unknown ID domain. */
export class DagTraversalStallError<ID = unknown> extends Error {
  readonly diagnostics: DagTraversalStallDiagnostics<ID>;

  constructor(
    diagnostics: Omit<
      DagTraversalStallDiagnostics<DiagnosticId<ID>>,
      'dependencyEdges'
    > &
      Partial<
        Pick<DagTraversalStallDiagnostics<DiagnosticId<ID>>, 'dependencyEdges'>
      >,
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
      dependencyCycleComponents: diagnostics.dependencyCycleComponents.map((ids) => ids.slice()),
      dependencyEdges: (diagnostics.dependencyEdges ?? []).map((edge) => ({
        waiter: { ...edge.waiter },
        prerequisite: { ...edge.prerequisite },
        reason: edge.reason,
      })),
      dependencyBlockedIds: diagnostics.dependencyBlockedIds.slice(),
      structurallyIncompleteIds: diagnostics.structurallyIncompleteIds.slice(),
    };
  }
}
