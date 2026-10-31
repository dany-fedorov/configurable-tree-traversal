import { validateDefinition } from '@core/graph/validateDefinition';
import { defineDag } from './defineDag';
import type { DagDefinition, PrepareDagResult } from './lib/DagDefinition';
import { definitionSource } from './lib/definitionSource';
import { prepareDagSource } from './lib/prepareDagSource';

/** Validate source facts without visitors and return a reusable executable DAG. */
export function prepareDagDefinition<Data, ID = unknown>(
  input: DagDefinition<Data, ID>,
): PrepareDagResult<Data, ID> {
  const definition = defineDag(input);
  const issues = validateDefinition(definition);
  if (issues.length > 0) return { kind: 'invalid', issues };
  return prepareDagSource(
    {
      ...definitionSource(definition),
      rootWorkDependencies: 'honor',
      dependsOnWorkDefault: 'none',
    },
    definition,
  );
}
