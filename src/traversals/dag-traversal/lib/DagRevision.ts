import type {
  DagDefinition,
  DagDefinitionIssue,
  DagDefinitionVertex,
} from './DagDefinition';
import type { PreparedDag } from './PreparedDag';

/** Full declaration edits, applied in order before final graph validation. */
export type DagRevisionOperation<Data, ID = unknown> =
  | {
      readonly kind: 'addVertex';
      readonly vertex: DagDefinitionVertex<Data, ID>;
    }
  | {
      readonly kind: 'replaceVertex';
      readonly vertex: DagDefinitionVertex<Data, ID>;
    }
  | { readonly kind: 'removeVertex'; readonly vertexId: ID }
  | {
      readonly kind: 'replaceEntry';
      readonly entry: DagDefinition<Data, ID>['entry'];
    }
  | { readonly kind: 'replaceOmissions'; readonly omittedIds: readonly ID[] };

export type DagRevisionResult<Data, ID = unknown> =
  | {
      kind: 'valid';
      dag: PreparedDag<Data, ID>;
      changes: DagDefinitionDiff<ID>;
    }
  | { kind: 'invalid'; issues: readonly DagDefinitionIssue<ID>[] };

/** Declaration aspects, listed in the order used by definition diffs. */
export type DagDefinitionChangeAspect =
  | 'data'
  | 'slots'
  | 'workDependencies'
  | 'completionDependencies';

export type DagDefinitionVertexChange<ID = unknown> = {
  readonly vertexId: ID;
  readonly aspects: readonly DagDefinitionChangeAspect[];
};

/** Shallow declaration changes; the host decides artifact validity. */
export type DagDefinitionDiff<ID = unknown> = {
  readonly addedIds: readonly ID[];
  readonly removedIds: readonly ID[];
  readonly changedVertices: readonly DagDefinitionVertexChange<ID>[];
  /** True whenever the ordered live ID sequence differs, including add/remove. */
  readonly vertexOrderChanged: boolean;
  readonly entryChanged: boolean;
  readonly omissionsChanged: boolean;
};
