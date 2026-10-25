import type { DagDefinition, DagDefinitionSlot } from './lib/DagDefinition';
import type {
  DagDefinitionChangeAspect,
  DagDefinitionDiff,
  DagDefinitionVertexChange,
} from './lib/DagRevision';

function sameId<ID>(before: ID, after: ID): boolean {
  return before === after || Object.is(before, after);
}

function sameIds<ID>(before: readonly ID[], after: readonly ID[]): boolean {
  return (
    before.length === after.length &&
    before.every((id, index) => sameId(id, after[index]!))
  );
}

function sameSlots<ID>(
  before: readonly DagDefinitionSlot<ID>[],
  after: readonly DagDefinitionSlot<ID>[],
): boolean {
  return (
    before.length === after.length &&
    before.every((slot, index) => {
      const next = after[index]!;
      if (slot.kind === 'vertex')
        return next.kind === 'vertex' && sameId(slot.vertexId, next.vertexId);
      if (next.kind !== 'omitted') return false;
      return slot.identity === null
        ? next.identity === null
        : next.identity !== null &&
            sameId(slot.identity.vertexId, next.identity.vertexId);
    })
  );
}

function sameEntry<ID>(
  before: DagDefinition<unknown, ID>['entry'],
  after: DagDefinition<unknown, ID>['entry'],
): boolean {
  switch (before.kind) {
    case 'empty':
      return after.kind === 'empty';
    case 'root':
      return after.kind === 'root' && sameId(before.vertexId, after.vertexId);
    case 'forest':
      return after.kind === 'forest' && sameSlots(before.slots, after.slots);
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
export function diffDagDefinitions<BeforeData, AfterData, ID = unknown>(
  before: DagDefinition<BeforeData, ID>,
  after: DagDefinition<AfterData, ID>,
): DagDefinitionDiff<ID> {
  const oldIds = before.vertices.map((vertex) => vertex.vertexId);
  const newIds = after.vertices.map((vertex) => vertex.vertexId);
  const oldIdSet = new Set(oldIds);
  const newVertices = new Map(
    after.vertices.map((vertex) => [vertex.vertexId, vertex]),
  );
  const addedIds = newIds.filter((id) => !oldIdSet.has(id));
  const removedIds: ID[] = [];
  const changedVertices: DagDefinitionVertexChange<ID>[] = [];
  for (const vertex of before.vertices) {
    const next = newVertices.get(vertex.vertexId);
    if (next === undefined) {
      removedIds.push(vertex.vertexId);
      continue;
    }
    const aspects: DagDefinitionChangeAspect[] = [];
    if (!Object.is(vertex.data, next.data)) aspects.push('data');
    if (!sameSlots(vertex.slots, next.slots)) aspects.push('slots');
    if (!sameIds(vertex.dependsOn, next.dependsOn))
      aspects.push('workDependencies');
    if (!sameIds(vertex.dependsOnComplete, next.dependsOnComplete))
      aspects.push('completionDependencies');
    if (aspects.length > 0)
      changedVertices.push(
        Object.freeze({
          vertexId: vertex.vertexId,
          aspects: Object.freeze(aspects),
        }),
      );
  }
  return Object.freeze({
    addedIds: Object.freeze(addedIds),
    removedIds: Object.freeze(removedIds),
    changedVertices: Object.freeze(changedVertices),
    vertexOrderChanged: !sameIds(oldIds, newIds),
    entryChanged: !sameEntry(before.entry, after.entry),
    omissionsChanged: !sameIds(before.omittedIds, after.omittedIds),
  });
}
