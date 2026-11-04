import type { DagTraversalStallDiagnostics } from '@core/errors/DagTraversalStallError';
import type { ValidatedReusableDagTopology } from './PreparedDag';

/** Ordered source facts; anonymous omissions carry no public identity. */
export type DagStructuralDiscoverySlot<VertexId> =
  | { readonly kind: 'vertex'; readonly vertexId: VertexId }
  | {
      readonly kind: 'omitted';
      readonly omittedVertexIdentity: { readonly vertexId: VertexId } | null;
    };

export type DagVertexDeclaration<Data, VertexId> = {
  readonly vertexId: VertexId;
  readonly data: Data;
  readonly childDiscoverySlots: readonly DagStructuralDiscoverySlot<VertexId>[];
  readonly workWaitsForWorkOf: readonly VertexId[];
  readonly workWaitsForSubgraphCompletionOf: readonly VertexId[];
};

/** Immutable in-memory topology; opaque caller data and IDs remain shallow. */
export type DagDefinition<Data, VertexId = unknown> = {
  readonly vertexDeclarations: readonly DagVertexDeclaration<Data, VertexId>[];
  readonly omittedVertexIds: readonly VertexId[];
  readonly entry:
    | { readonly kind: 'root'; readonly vertexId: VertexId }
    | {
        readonly kind: 'roots';
        readonly entryDiscoverySlots: readonly DagStructuralDiscoverySlot<VertexId>[];
      }
    | { readonly kind: 'empty' };
};

export type DagDefinitionIssue<VertexId = unknown> =
  | {
      kind: 'missingStructuralEndpoint';
      parent: { vertexId: VertexId } | null;
      vertexId: VertexId;
    }
  | {
      kind: 'invalidEntry';
      reason:
        | 'unknownRoot'
        | 'entryOmissionMissingIdentity'
        | 'emptyWithVertices';
      vertexIds: readonly VertexId[];
    }
  | { kind: 'omissionIdentityNotDeclared'; vertexIds: readonly VertexId[] }
  | { kind: 'outsideEntryDiscoveryClosure'; vertexIds: readonly VertexId[] }
  | {
      kind: 'structuralChildCycleComponent';
      componentVertexIds: readonly VertexId[];
    }
  | {
      kind: 'discoveredStructuralChildCycleWitness';
      cycleWitnessVertexIds: readonly VertexId[];
    }
  | {
      kind: 'milestoneDependencyStall';
      diagnostics: DagTraversalStallDiagnostics<VertexId>;
    };

export type DagTopologyValidationResult<Data, VertexId = unknown> =
  | {
      kind: 'valid';
      validatedTopology: ValidatedReusableDagTopology<Data, VertexId>;
    }
  | { kind: 'invalid'; issues: readonly DagDefinitionIssue<VertexId>[] };
