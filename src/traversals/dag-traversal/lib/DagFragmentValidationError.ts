import type { DagDefinitionIssue } from './DagDefinition';

/**
 * A fragment definition failed closed DAG validation before port mapping.
 * Issues are shallow: caller IDs retain identity. Port/mapping errors remain
 * ordinary TypeErrors; narrowing an arbitrary catch does not infer its ID type.
 */
export class DagFragmentValidationError<VertexId = unknown> extends TypeError {
  readonly issues: readonly DagDefinitionIssue<VertexId>[];

  constructor(issues: readonly DagDefinitionIssue<VertexId>[]) {
    super('DAG fragments require a closed valid definition');
    this.name = 'DagFragmentValidationError';
    this.issues = issues.slice();
  }
}
