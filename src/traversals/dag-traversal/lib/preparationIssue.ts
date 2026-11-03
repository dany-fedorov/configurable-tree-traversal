import { DagStructuralDiscoveryCycleError } from '@core/errors/DagDiscoveryCycleError';
import type { DagTraversalStallDiagnostics } from '@core/errors/DagTraversalStallError';
import { engineDagValidationErrors } from '@core/errors/engineDagValidationErrors';
import type { DagDefinitionIssue } from './DagDefinition';

/** Only the preparing runner's own engine failures become structured issues. */
export function preparationIssue<VertexId>(
  store: object,
  error: unknown,
): DagDefinitionIssue<VertexId> | undefined {
  const validation = engineDagValidationErrors.get(store);
  if (validation === undefined || validation !== error) return undefined;
  return validation instanceof DagStructuralDiscoveryCycleError
    ? {
        kind: 'discoveredStructuralChildCycleWitness',
        cycleWitnessVertexIds:
          validation.cycleWitnessVertexIds as readonly VertexId[],
      }
    : {
        kind: 'milestoneDependencyStall',
        diagnostics:
          validation.diagnostics as DagTraversalStallDiagnostics<VertexId>,
      };
}
