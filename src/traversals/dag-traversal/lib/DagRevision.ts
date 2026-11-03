import type {
  DagDefinition,
  DagDefinitionIssue,
  DagDefinitionVertex,
} from './DagDefinition';
import type { ValidatedReusableDagTopology } from './PreparedDag';

/** Full declaration edits, applied in order before final graph validation. */
export type DagRevisionOperation<Data, VertexId = unknown> =
  | {
      readonly kind: 'addVertexDeclaration';
      readonly vertexDeclaration: DagDefinitionVertex<Data, VertexId>;
    }
  | {
      readonly kind: 'replaceVertexDeclaration';
      readonly vertexDeclaration: DagDefinitionVertex<Data, VertexId>;
    }
  | { readonly kind: 'removeVertexDeclaration'; readonly vertexId: VertexId }
  | {
      readonly kind: 'replaceEntryDeclaration';
      readonly entry: DagDefinition<Data, VertexId>['entry'];
    }
  | {
      readonly kind: 'replaceOmittedVertexIds';
      readonly omittedVertexIds: readonly VertexId[];
    };

export type DagRevisionResult<Data, VertexId = unknown> =
  | {
      kind: 'valid';
      validatedTopology: ValidatedReusableDagTopology<Data, VertexId>;
      changes: DagDefinitionDiff<VertexId>;
    }
  | { kind: 'invalid'; issues: readonly DagDefinitionIssue<VertexId>[] };

/** Declaration aspects, listed in the order used by definition diffs. */
export type DagDefinitionChangeAspect =
  | 'data'
  | 'childDiscoverySlots'
  | 'workWaitsForWorkOf'
  | 'workWaitsForSubgraphCompletionOf';

export type DagDefinitionVertexChange<VertexId = unknown> = {
  readonly vertexId: VertexId;
  readonly changedDeclarationFields: readonly DagDefinitionChangeAspect[];
};

/** Shallow declaration changes; the host decides artifact validity. */
export type DagDefinitionDiff<VertexId = unknown> = {
  readonly addedVertexDeclarationIds: readonly VertexId[];
  readonly removedVertexDeclarationIds: readonly VertexId[];
  readonly changedVertexDeclarations: readonly DagDefinitionVertexChange<VertexId>[];
  /** True whenever the ordered live ID sequence differs, including add/remove. */
  readonly vertexDeclarationSequenceChanged: boolean;
  readonly entryChanged: boolean;
  readonly omittedVertexIdSequenceChanged: boolean;
};
