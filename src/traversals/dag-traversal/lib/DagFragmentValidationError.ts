import type { DagDefinitionIssue } from './DagDefinition';

/** A fragment definition failed closed DAG validation before port mapping. */
export class DagFragmentValidationError<ID = unknown> extends TypeError {
  readonly issues: readonly DagDefinitionIssue<ID>[];

  constructor(issues: readonly DagDefinitionIssue<ID>[]) {
    super('DAG fragments require a closed valid definition');
    this.name = 'DagFragmentValidationError';
    this.issues = issues.slice();
  }
}
