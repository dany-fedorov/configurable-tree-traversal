import { assertOwnKeys } from '@core/assertPublicOptions';
import { defineDag } from '../dag-traversal/defineDag';
import type {
  DagDefinition,
  DagDefinitionSlot,
} from '../dag-traversal/lib/DagDefinition';
import type {
  GraphWalkLink,
  GraphWalkSource,
  GraphWalkTarget,
  GraphWalkVertexResult,
} from './GraphWalkSource';

export type GraphWalkDagRelation =
  | { kind: 'child'; slotIndex: number }
  | { kind: 'workDependency' }
  | { kind: 'subgraphCompletionDependency' };

type RelationSelection =
  | 'children'
  | 'workDependencies'
  | 'subgraphCompletionDependencies';

/** Explore explicit declaration relationships without DAG scheduling or validation. */
export function materializeWalkSourceFromDagDefinition<Data, ID>(
  definition: DagDefinition<Data, ID>,
  options: { relations: readonly [RelationSelection, ...RelationSelection[]] },
): GraphWalkSource<Data, GraphWalkDagRelation, ID> {
  assertOwnKeys(options, ['relations']);
  const selection = options?.relations;
  if (!Array.isArray(selection) || selection.length === 0)
    throw new TypeError('Select at least one DAG relationship');
  const relations = new Set<RelationSelection>();
  for (const relation of selection) {
    if (
      relation !== 'children' &&
      relation !== 'workDependencies' &&
      relation !== 'subgraphCompletionDependencies'
    )
      throw new TypeError('Unknown DAG relationship');
    if (relations.has(relation))
      throw new TypeError('Duplicate DAG relationship');
    relations.add(relation);
  }
  // Shape normalization copies topology and checks declared identity consistency.
  // Deliberately avoid preparation: selected relationships may contain cycles.
  const snapshot = defineDag(definition);
  const live = new Set(snapshot.vertices.map((vertex) => vertex.vertexId));
  const omitted = new Set(snapshot.omittedIds);
  const records = new Map<
    ID,
    {
      resolution: GraphWalkVertexResult<Data>;
      links: GraphWalkLink<Data, GraphWalkDagRelation, ID>[];
    }
  >();
  for (const vertex of snapshot.vertices)
    records.set(vertex.vertexId, {
      resolution: { kind: 'found', data: vertex.data },
      links: [],
    });
  for (const id of omitted)
    records.set(id, { resolution: { kind: 'omitted' }, links: [] });
  const lookup = (id: ID) => {
    const record = records.get(id);
    if (record === undefined) throw new TypeError('Unknown walking vertex ID');
    return record;
  };
  const slotTarget = (
    slot: DagDefinitionSlot<ID>,
  ): GraphWalkTarget<Data, ID> | null => {
    if (slot.kind === 'vertex') {
      if (!live.has(slot.vertexId))
        throw new TypeError('Expected a live DAG child identity');
      return { vertexId: slot.vertexId };
    }
    if (slot.identity === null) return null;
    if (!omitted.has(slot.identity.vertexId))
      throw new TypeError('Expected an omitted DAG child identity');
    return { vertexId: slot.identity.vertexId };
  };
  const roots: GraphWalkTarget<Data, ID>[] = [];
  if (snapshot.entry.kind === 'root') {
    lookup(snapshot.entry.vertexId);
    roots.push({ vertexId: snapshot.entry.vertexId });
  } else if (snapshot.entry.kind === 'roots') {
    for (const slot of snapshot.entry.slots) {
      const target = slotTarget(slot);
      if (target !== null) roots.push(target);
    }
  }
  for (const vertex of snapshot.vertices) {
    const links = lookup(vertex.vertexId).links;
    if (relations.has('children'))
      vertex.slots.forEach((slot, slotIndex) => {
        const target = slotTarget(slot);
        if (target !== null)
          links.push({ target, data: { kind: 'child', slotIndex } });
      });
    if (relations.has('workDependencies'))
      for (const vertexId of vertex.dependsOnWork) {
        lookup(vertexId);
        links.push({ target: { vertexId }, data: { kind: 'workDependency' } });
      }
    if (relations.has('subgraphCompletionDependencies'))
      for (const vertexId of vertex.dependsOnSubgraphCompletion) {
        lookup(vertexId);
        links.push({
          target: { vertexId },
          data: { kind: 'subgraphCompletionDependency' },
        });
      }
  }
  return {
    roots: () => roots.map((target) => ({ vertexId: target.vertexId })),
    resolveVertex: (vertexId) => ({ ...lookup(vertexId).resolution }),
    outgoing: (vertex) =>
      lookup(vertex.vertexId).links.map((link) => ({
        target: { vertexId: link.target.vertexId },
        data: { ...link.data },
      })),
  };
}
