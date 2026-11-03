import { validateDefinition } from '@core/graph/validateDefinition';
import { copyAndNormalizeDagDefinition } from './defineDag';
import type {
  DagDefinition,
  DagTopologyValidationResult,
} from './lib/DagDefinition';
import { definitionSource } from './lib/definitionSource';
import { prepareDagSource } from './lib/prepareDagSource';

/** Validate source facts without visitors and return a reusable executable DAG. */
export function validateAndPrepareDagDefinition<Data, VertexId = unknown>(
  input: DagDefinition<Data, VertexId>,
): DagTopologyValidationResult<Data, VertexId> {
  const definition = copyAndNormalizeDagDefinition(input);
  const issues = validateDefinition(definition);
  if (issues.length > 0) return { kind: 'invalid', issues };
  return prepareDagSource(
    {
      ...definitionSource(definition),
      rootWorkPrerequisitePolicy: 'honor',
      undeclaredWorkPrerequisitePolicy: 'none',
    },
    definition,
  );
}
