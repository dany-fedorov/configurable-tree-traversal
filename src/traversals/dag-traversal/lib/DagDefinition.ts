/** Ordered source facts; anonymous omissions carry no public identity. */
export type DagDefinitionSlot<ID> =
  | { readonly kind: 'vertex'; readonly vertexId: ID }
  | {
      readonly kind: 'omitted';
      readonly identity: { readonly vertexId: ID } | null;
    };

export type DagDefinitionVertex<Data, ID> = {
  readonly vertexId: ID;
  readonly data: Data;
  readonly slots: readonly DagDefinitionSlot<ID>[];
  readonly dependsOn: readonly ID[];
  readonly dependsOnComplete: readonly ID[];
};

/** Immutable in-memory topology; opaque caller data and IDs remain shallow. */
export type DagDefinition<Data, ID = unknown> = {
  readonly vertices: readonly DagDefinitionVertex<Data, ID>[];
  readonly omittedIds: readonly ID[];
  readonly entry:
    | { readonly kind: 'root'; readonly vertexId: ID }
    | {
        readonly kind: 'forest';
        readonly slots: readonly DagDefinitionSlot<ID>[];
      }
    | { readonly kind: 'empty' };
};
