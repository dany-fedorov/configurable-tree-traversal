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
