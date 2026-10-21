import type { VertexId } from '@core/graph/types';
import { createVertexIdLabeler } from '@core/graph/identity';

export type DagTraversalStallDiagnostics = {
  dependencies: Array<{ id: VertexId; unmet: VertexId[] }>;
  unknownPrerequisiteIds: VertexId[];
  dependencyCycles: VertexId[][];
  dependencyBlockedIds: VertexId[];
  structurallyIncompleteIds: VertexId[];
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
