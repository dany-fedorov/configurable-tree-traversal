import type { DagDefinitionIssue } from './DagDefinition';

/**
 * A fragment definition failed closed DAG validation before port mapping.
 * Issues are shallow: caller IDs retain identity. Port/mapping errors remain
 * ordinary TypeErrors; narrowing an arbitrary catch does not infer its ID type.
 */
export class DagFragmentValidationError<ID = unknown> extends TypeError {
  readonly issues: readonly DagDefinitionIssue<ID>[];

  constructor(issues: readonly DagDefinitionIssue<ID>[]) {
    super('DAG fragments require a closed valid definition');
    this.name = 'DagFragmentValidationError';
    this.issues = issues.slice();
  }
}
