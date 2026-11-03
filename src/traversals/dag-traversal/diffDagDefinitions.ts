import type {
  DagDefinition,
  DagStructuralDiscoverySlot,
} from './lib/DagDefinition';
import type {
  DagDefinitionChangeAspect,
  DagDefinitionDiff,
  DagDefinitionVertexChange,
} from './lib/DagRevision';

function sameId<VertexId>(before: VertexId, after: VertexId): boolean {
  return before === after || Object.is(before, after);
}

function sameIds<VertexId>(
  before: readonly VertexId[],
  after: readonly VertexId[],
): boolean {
  return (
    before.length === after.length &&
    before.every((id, index) => sameId(id, after[index]!))
  );
}

function sameSlots<VertexId>(
  before: readonly DagStructuralDiscoverySlot<VertexId>[],
  after: readonly DagStructuralDiscoverySlot<VertexId>[],
): boolean {
  return (
    before.length === after.length &&
    before.every((slot, index) => {
      const next = after[index]!;
      if (slot.kind === 'vertex')
        return next.kind === 'vertex' && sameId(slot.vertexId, next.vertexId);
      if (next.kind !== 'omitted') return false;
      return slot.omittedVertexIdentity === null
        ? next.omittedVertexIdentity === null
        : next.omittedVertexIdentity !== null &&
            sameId(
              slot.omittedVertexIdentity.vertexId,
              next.omittedVertexIdentity.vertexId,
            );
    })
  );
}

function sameEntry<VertexId>(
  before: DagDefinition<unknown, VertexId>['entry'],
  after: DagDefinition<unknown, VertexId>['entry'],
): boolean {
  switch (before.kind) {
    case 'empty':
      return after.kind === 'empty';
    case 'root':
      return after.kind === 'root' && sameId(before.vertexId, after.vertexId);
    case 'roots':
      return (
        after.kind === 'roots' &&
        sameSlots(before.entryDiscoverySlots, after.entryDiscoverySlots)
      );
  }
}

/**
 * Compare immutable source declarations using SameValueZero IDs and Object.is
 * data. Ordered slots, dependencies, omissions and live IDs all retain order.
 * Vertex order changes include additions and removals. Changes/removals follow
 * old vertex order; additions follow new order. Results own frozen wrappers.
 *
 * Shared data is opaque: same-reference deep mutation cannot be detected.
 * The host decides whether artifacts and accepted completion facts remain valid.
 */
export function diffDagDefinitionDeclarationsShallowly<
  BeforeData,
  AfterData,
  VertexId = unknown,
>(
  before: DagDefinition<BeforeData, VertexId>,
  after: DagDefinition<AfterData, VertexId>,
): DagDefinitionDiff<VertexId> {
  const oldIds = before.vertexDeclarations.map((vertex) => vertex.vertexId);
  const newIds = after.vertexDeclarations.map((vertex) => vertex.vertexId);
  const oldIdSet = new Set(oldIds);
  const newVertices = new Map(
    after.vertexDeclarations.map((vertex) => [vertex.vertexId, vertex]),
  );
  const addedVertexDeclarationIds = newIds.filter((id) => !oldIdSet.has(id));
  const removedVertexDeclarationIds: VertexId[] = [];
  const changedVertexDeclarations: DagDefinitionVertexChange<VertexId>[] = [];
  for (const vertex of before.vertexDeclarations) {
    const next = newVertices.get(vertex.vertexId);
    if (next === undefined) {
      removedVertexDeclarationIds.push(vertex.vertexId);
      continue;
    }
    const changedDeclarationFields: DagDefinitionChangeAspect[] = [];
    if (!Object.is(vertex.data, next.data))
      changedDeclarationFields.push('data');
    if (!sameSlots(vertex.childDiscoverySlots, next.childDiscoverySlots))
      changedDeclarationFields.push('childDiscoverySlots');
    if (!sameIds(vertex.workWaitsForWorkOf, next.workWaitsForWorkOf))
      changedDeclarationFields.push('workWaitsForWorkOf');
    if (
      !sameIds(
        vertex.workWaitsForSubgraphCompletionOf,
        next.workWaitsForSubgraphCompletionOf,
      )
    )
      changedDeclarationFields.push('workWaitsForSubgraphCompletionOf');
    if (changedDeclarationFields.length > 0)
      changedVertexDeclarations.push(
        Object.freeze({
          vertexId: vertex.vertexId,
          changedDeclarationFields: Object.freeze(changedDeclarationFields),
        }),
      );
  }
  return Object.freeze({
    addedVertexDeclarationIds: Object.freeze(addedVertexDeclarationIds),
    removedVertexDeclarationIds: Object.freeze(removedVertexDeclarationIds),
    changedVertexDeclarations: Object.freeze(changedVertexDeclarations),
    vertexDeclarationSequenceChanged: !sameIds(oldIds, newIds),
    entryChanged: !sameEntry(before.entry, after.entry),
    omittedVertexIdSequenceChanged: !sameIds(
      before.omittedVertexIds,
      after.omittedVertexIds,
    ),
  });
}
