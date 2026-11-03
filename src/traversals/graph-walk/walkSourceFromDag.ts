import { assertOwnKeys } from '@core/assertPublicOptions';
import { copyAndNormalizeDagDefinition } from '../dag-traversal/defineDag';
import type {
  DagDefinition,
  DagStructuralDiscoverySlot,
} from '../dag-traversal/lib/DagDefinition';
import type {
  GraphWalkOutgoingLink,
  GraphWalkDiscoverySource,
  GraphWalkVertexResolutionTarget,
  GraphWalkVertexResolutionResult,
} from './GraphWalkSource';

export type GraphWalkDagDeclarationRelation =
  | { kind: 'structuralChildSlot'; childSlotIndex: number }
  | { kind: 'workPrerequisite' }
  | { kind: 'subgraphCompletionPrerequisite' };

type DagDeclarationRelationSelection =
  | 'parentToChildSlots'
  | 'dependentToWorkPrerequisites'
  | 'dependentToSubgraphCompletionPrerequisites';

/** Explore explicit declaration relationships without DAG scheduling or validation. */
export function materializeGraphWalkSourceFromDagDeclarationRelations<
  VertexData,
  VertexId,
>(
  definition: DagDefinition<VertexData, VertexId>,
  options: {
    includeDeclarationRelations: readonly [
      DagDeclarationRelationSelection,
      ...DagDeclarationRelationSelection[],
    ];
  },
): Extract<
  GraphWalkDiscoverySource<
    VertexData,
    GraphWalkDagDeclarationRelation,
    VertexId
  >,
  { vertexResolutionMode: 'resolverWithOptionalInlineResolution' }
> {
  assertOwnKeys(options, ['includeDeclarationRelations']);
  const selection = options?.includeDeclarationRelations;
  if (!Array.isArray(selection) || selection.length === 0)
    throw new TypeError('Select at least one DAG relationship');
  const relations = new Set<DagDeclarationRelationSelection>();
  for (const relation of selection) {
    if (
      relation !== 'parentToChildSlots' &&
      relation !== 'dependentToWorkPrerequisites' &&
      relation !== 'dependentToSubgraphCompletionPrerequisites'
    )
      throw new TypeError('Unknown DAG relationship');
    if (relations.has(relation))
      throw new TypeError('Duplicate DAG relationship');
    relations.add(relation);
  }
  // Shape normalization copies topology and checks declared identity consistency.
  // Deliberately avoid preparation: selected relationships may contain cycles.
  const snapshot = copyAndNormalizeDagDefinition(definition);
  const live = new Set(
    snapshot.vertexDeclarations.map((vertex) => vertex.vertexId),
  );
  const omitted = new Set(snapshot.omittedVertexIds);
  const records = new Map<
    VertexId,
    {
      resolution: GraphWalkVertexResolutionResult<VertexData>;
      links: GraphWalkOutgoingLink<
        VertexData,
        GraphWalkDagDeclarationRelation,
        VertexId
      >[];
    }
  >();
  for (const vertex of snapshot.vertexDeclarations)
    records.set(vertex.vertexId, {
      resolution: { kind: 'found', vertexData: vertex.data },
      links: [],
    });
  for (const id of omitted)
    records.set(id, { resolution: { kind: 'omitted' }, links: [] });
  const lookup = (id: VertexId) => {
    const record = records.get(id);
    if (record === undefined) throw new TypeError('Unknown walking vertex ID');
    return record;
  };
  const slotTarget = (
    slot: DagStructuralDiscoverySlot<VertexId>,
  ): GraphWalkVertexResolutionTarget<VertexData, VertexId> | null => {
    if (slot.kind === 'vertex') {
      if (!live.has(slot.vertexId))
        throw new TypeError('Expected a live DAG child identity');
      return { vertexId: slot.vertexId };
    }
    if (slot.omittedVertexIdentity === null) return null;
    if (!omitted.has(slot.omittedVertexIdentity.vertexId))
      throw new TypeError('Expected an omitted DAG child identity');
    return { vertexId: slot.omittedVertexIdentity.vertexId };
  };
  const roots: GraphWalkVertexResolutionTarget<VertexData, VertexId>[] = [];
  if (snapshot.entry.kind === 'root') {
    lookup(snapshot.entry.vertexId);
    roots.push({ vertexId: snapshot.entry.vertexId });
  } else if (snapshot.entry.kind === 'roots') {
    for (const slot of snapshot.entry.entryDiscoverySlots) {
      const target = slotTarget(slot);
      if (target !== null) roots.push(target);
    }
  }
  for (const vertex of snapshot.vertexDeclarations) {
    const links = lookup(vertex.vertexId).links;
    if (relations.has('parentToChildSlots'))
      vertex.childDiscoverySlots.forEach((slot, childSlotIndex) => {
        const target = slotTarget(slot);
        if (target !== null)
          links.push({
            targetToResolveOnAdmission: target,
            edgeData: { kind: 'structuralChildSlot', childSlotIndex },
          });
      });
    if (relations.has('dependentToWorkPrerequisites'))
      for (const vertexId of vertex.workWaitsForWorkOf) {
        lookup(vertexId);
        links.push({
          targetToResolveOnAdmission: { vertexId },
          edgeData: { kind: 'workPrerequisite' },
        });
      }
    if (relations.has('dependentToSubgraphCompletionPrerequisites'))
      for (const vertexId of vertex.workWaitsForSubgraphCompletionOf) {
        lookup(vertexId);
        links.push({
          targetToResolveOnAdmission: { vertexId },
          edgeData: { kind: 'subgraphCompletionPrerequisite' },
        });
      }
  }
  return {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution',
    enumerateRootTargets: () =>
      roots.map((target) => ({ vertexId: target.vertexId })),
    resolveVertexDataById: (vertexId) => ({ ...lookup(vertexId).resolution }),
    enumerateOutgoingLinks: (vertex) =>
      lookup(vertex.vertexId).links.map((link) => ({
        targetToResolveOnAdmission: {
          vertexId: link.targetToResolveOnAdmission.vertexId,
        },
        edgeData: { ...link.edgeData },
      })),
  };
}
