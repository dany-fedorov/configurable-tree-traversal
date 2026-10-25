import { createVertexIdLabeler } from '@core/graph/identity';

export type DagTraversalStallDiagnostics<ID = unknown> = {
  dependencies: Array<{ id: ID; unmet: ID[] }>;
  unknownPrerequisiteIds: ID[];
  dependencyCycles: ID[][];
  dependencyBlockedIds: ID[];
  structurallyIncompleteIds: ID[];
};

export class DagTraversalStallError extends Error {
  readonly diagnostics: DagTraversalStallDiagnostics;

  constructor(diagnostics: DagTraversalStallDiagnostics) {
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
      dependencyBlockedIds: diagnostics.dependencyBlockedIds.slice(),
      structurallyIncompleteIds: diagnostics.structurallyIncompleteIds.slice(),
    };
  }
}
