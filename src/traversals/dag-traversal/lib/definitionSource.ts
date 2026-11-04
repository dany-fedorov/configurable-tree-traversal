import type { DagDiscoverySource } from '@core/TraversableGraph';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { DagSourceVertexResolution } from '@core/TraversableTree';
import type { VertexHandle } from '@core/CTTRef';
import { internalRef, createVertexHandleFacet } from '@core/observationFacets';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import { copyAndNormalizeDagDefinition } from '../defineDag';
import type {
  DagDefinition,
  DagStructuralDiscoverySlot,
} from './DagDefinition';

/** Capture every discovery slot, including anonymous omissions omitted by replay. */
export function captureDagDefinition<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  VertexId,
>(
  container: ResolvedGraphsContainer<
    SourceVertexTypes,
    SourceVertexTypes,
    VertexId
  >,
  candidates: ReadonlySet<VertexId>,
): DagDefinition<SourceVertexTypes['VertexData'], VertexId> {
  const graph = container.publicResolvedGraph;
  const captureSlots = (
    ref: VertexHandle<SourceVertexTypes>,
  ): DagStructuralDiscoverySlot<VertexId>[] => {
    const slots: DagStructuralDiscoverySlot<VertexId>[] = [];
    for (const slot of container.liveResolvedGraphView.get(internalRef(ref))!
      .slots) {
      if (slot.kind === 'linked')
        slots.push({
          kind: 'vertex',
          vertexId: graph.requireVertexId(
            createVertexHandleFacet(slot.childRef),
          ),
        });
      else if (slot.kind === 'omitted')
        slots.push({
          kind: 'omitted',
          omittedVertexIdentity:
            slot.identity === null
              ? null
              : { vertexId: slot.identity.vertexId as VertexId },
        });
    }
    return slots;
  };
  const root = graph.getDesignatedRootHandleOrNull();
  const holder = container.syntheticRootRef;
  const omittedVertexIds = [...candidates].filter(
    (id) => container.store.getIdState(id)?.kind === 'omitted',
  );
  return copyAndNormalizeDagDefinition({
    vertexDeclarations: graph.getVertexHandles().map((ref) => {
      const vertex = graph.getVertexSnapshotOrNull(ref)!;
      return {
        vertexId: vertex.vertexId,
        data: vertex.vertex.getVertexData(),
        childDiscoverySlots: captureSlots(ref),
        workWaitsForWorkOf: vertex.workWaitsForWorkOf,
        workWaitsForSubgraphCompletionOf:
          vertex.workWaitsForSubgraphCompletionOf ?? [],
      };
    }),
    omittedVertexIds,
    entry: container.syntheticRoot
      ? {
          kind: 'roots',
          entryDiscoverySlots:
            holder === null
              ? []
              : captureSlots(createVertexHandleFacet(holder)),
        }
      : root === null
      ? { kind: 'empty' }
      : { kind: 'root', vertexId: graph.requireVertexId(root) },
  });
}

/** Replays accepted definitions with ID hints; never invents anonymous identities. */
export function definitionSource<Data, VertexId>(
  definition: DagDefinition<Data, VertexId>,
): {
  dagDiscoverySource: DagDiscoverySource<
    VertexDataAndChildHintTypes<Data, VertexId>,
    VertexDataAndChildHintTypes<Data, VertexId>,
    VertexId
  >;
  sourceRootIsHiddenEntryHolder: boolean;
} {
  type Replay = VertexDataAndChildHintTypes<Data, VertexId>;
  const byId = new Map(
    definition.vertexDeclarations.map((vertex) => [vertex.vertexId, vertex]),
  );
  const omitted = new Set(definition.omittedVertexIds);
  const hints = (
    slots: readonly DagStructuralDiscoverySlot<VertexId>[],
  ): VertexId[] => {
    const result: VertexId[] = [];
    for (const slot of slots) {
      if (slot.kind === 'vertex') result.push(slot.vertexId);
      else if (slot.omittedVertexIdentity !== null)
        result.push(slot.omittedVertexIdentity.vertexId);
      // Phase-one replay drops anonymous omissions: they carry no identity and
      // cannot affect readiness. Retain them in the definition without fake hints.
    }
    return result;
  };
  const resolve = (
    id: VertexId,
  ): DagSourceVertexResolution<Replay, VertexId> => {
    if (omitted.has(id))
      return {
        kind: 'vertexIntentionallyOmitted',
        omittedVertexIdentity: { vertexId: id },
        satisfiesWorkAndSubgraphCompletionPrerequisites: true,
      };
    const vertex = byId.get(id)!;
    return {
      kind: 'vertexResolved',
      resolvedVertexInput: {
        vertexId: vertex.vertexId,
        workWaitsForWorkOf: vertex.workWaitsForWorkOf.slice(),
        workWaitsForSubgraphCompletionOf:
          vertex.workWaitsForSubgraphCompletionOf.slice(),
        vertexContentInput: {
          $vertexData: vertex.data,
          $childDiscoveryHints: hints(vertex.childDiscoverySlots),
        },
      },
    };
  };
  const rootHints = (
    slots: readonly DagStructuralDiscoverySlot<VertexId>[],
  ): VertexId[] => {
    const seen = new Set<VertexId>();
    return hints(
      slots.filter((slot) => {
        if (slot.kind === 'omitted') return true;
        if (seen.has(slot.vertexId)) return false;
        seen.add(slot.vertexId);
        return true;
      }),
    );
  };
  const sourceRootIsHiddenEntryHolder =
    definition.entry.kind === 'roots' ||
    (definition.entry.kind === 'empty' && omitted.size > 0);
  return {
    sourceRootIsHiddenEntryHolder,
    dagDiscoverySource: {
      resolveRootVertex: () => {
        const entry = definition.entry;
        // The private holder discovers repeated live identities once; the authored entry
        // retains repeated ordered slots for round trips and walking adapters.
        if (sourceRootIsHiddenEntryHolder)
          return {
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexId: undefined as VertexId,
              vertexContentInput: {
                $vertexData: undefined as Data,
                $childDiscoveryHints:
                  entry.kind === 'roots'
                    ? rootHints(entry.entryDiscoverySlots)
                    : definition.omittedVertexIds.slice(),
              },
            },
          };
        return entry.kind === 'root'
          ? resolve(entry.vertexId)
          : {
              kind: 'vertexIntentionallyOmitted',
              omittedVertexIdentity: null,
              satisfiesWorkAndSubgraphCompletionPrerequisites: true,
            };
      },
      resolveChildVertexFromHint: resolve,
      resolvePrerequisiteByVertexId: (id) =>
        byId.has(id) || omitted.has(id) ? resolve(id) : { kind: 'missing' },
      tryGetVertexIdentityFromHint: (vertexId) => ({ vertexId }),
    },
  };
}
