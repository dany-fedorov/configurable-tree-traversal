import { DagDiscoveryCycleError } from '@core/errors/DagDiscoveryCycleError';
import type { DagTraversalStallDiagnostics } from '@core/errors/DagTraversalStallError';
import { engineDagValidationErrors } from '@core/errors/engineDagValidationErrors';
import type { DagDefinitionIssue } from './DagDefinition';

/** Only the preparing runner's own engine failures become structured issues. */
export function preparationIssue<ID>(
  store: object,
  error: unknown,
): DagDefinitionIssue<ID> | undefined {
  const validation = engineDagValidationErrors.get(store);
  if (validation === undefined || validation !== error) return undefined;
  return validation instanceof DagDiscoveryCycleError
    ? {
        kind: 'discoveryCycle',
        cycleWitnessVertexIds:
          validation.cycleWitnessVertexIds as readonly ID[],
      }
    : {
        kind: 'milestone',
        diagnostics: validation.diagnostics as DagTraversalStallDiagnostics<ID>,
      };
}
