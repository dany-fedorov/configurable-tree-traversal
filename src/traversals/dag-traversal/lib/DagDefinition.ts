import type { DagTraversalStallDiagnostics } from '@core/errors/DagTraversalStallError';
import type { PreparedDag } from './PreparedDag';

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
  readonly dependsOnWork: readonly ID[];
  readonly dependsOnSubgraphCompletion: readonly ID[];
};

/** Immutable in-memory topology; opaque caller data and IDs remain shallow. */
export type DagDefinition<Data, ID = unknown> = {
  readonly vertices: readonly DagDefinitionVertex<Data, ID>[];
  readonly omittedIds: readonly ID[];
  readonly entry:
    | { readonly kind: 'root'; readonly vertexId: ID }
    | {
        readonly kind: 'roots';
        readonly slots: readonly DagDefinitionSlot<ID>[];
      }
    | { readonly kind: 'empty' };
};

export type DagDefinitionIssue<ID = unknown> =
  | {
      kind: 'missingStructuralEndpoint';
      parent: { vertexId: ID } | null;
      vertexId: ID;
    }
  | {
      kind: 'invalidEntry';
      reason: 'unknownRoot' | 'anonymousCatalogEntry' | 'emptyWithVertices';
      vertexIds: readonly ID[];
    }
  | { kind: 'invalidOmission'; vertexIds: readonly ID[] }
  | { kind: 'unreachable'; vertexIds: readonly ID[] }
  | { kind: 'structuralCycle'; componentVertexIds: readonly ID[] }
  | { kind: 'discoveryCycle'; cycleWitnessVertexIds: readonly ID[] }
  | {
      kind: 'milestone';
      diagnostics: DagTraversalStallDiagnostics<ID>;
    };

export type PrepareDagResult<Data, ID = unknown> =
  | { kind: 'valid'; dag: PreparedDag<Data, ID> }
  | { kind: 'invalid'; issues: readonly DagDefinitionIssue<ID>[] };
