import { stronglyConnectedComponents } from '@core/scheduling/stronglyConnectedComponents';
import type {
  DagDefinition,
  DagDefinitionIssue,
  DagDefinitionSlot,
} from '../../traversals/dag-traversal/lib/DagDefinition';

/** Check materialized membership and structural topology before source replay. */
export function validateDefinition<Data, ID>(
  definition: DagDefinition<Data, ID>,
): DagDefinitionIssue<ID>[] {
  const issues: DagDefinitionIssue<ID>[] = [];
  const byId = new Map(
    definition.vertices.map((vertex) => [vertex.vertexId, vertex]),
  );
  const omitted = new Set(definition.omittedIds);
  const invalidOmissions = new Set<ID>();
  const graph = new Map<ID, ID[]>();
  const queue: ID[] = [];
  const entry = definition.entry;
  if (entry.kind === 'root') {
    if (!byId.has(entry.vertexId))
      issues.push({
        kind: 'invalidEntry',
        reason: 'unknownRoot',
        vertexIds: [entry.vertexId],
      });
    queue.push(entry.vertexId);
  } else if (entry.kind === 'empty') {
    if (definition.vertices.length > 0)
      issues.push({
        kind: 'invalidEntry',
        reason: 'emptyWithVertices',
        vertexIds: definition.vertices.map((vertex) => vertex.vertexId),
      });
    for (const id of definition.omittedIds) queue.push(id);
  } else if (
    entry.slots.some(
      (slot) => slot.kind === 'omitted' && slot.identity === null,
    )
  ) {
    issues.push({
      kind: 'invalidEntry',
      reason: 'anonymousCatalogEntry',
      vertexIds: [],
    });
  }
  const slotIds = (slots: readonly DagDefinitionSlot<ID>[]): ID[] => {
    const result: ID[] = [];
    for (const slot of slots) {
      if (slot.kind === 'vertex') result.push(slot.vertexId);
      else if (slot.identity !== null) result.push(slot.identity.vertexId);
    }
    return result;
  };
  const checkSlots = (
    slots: readonly DagDefinitionSlot<ID>[],
    parent: { vertexId: ID } | null,
  ): ID[] => {
    const children: ID[] = [];
    for (const slot of slots) {
      if (slot.kind === 'vertex') {
        if (byId.has(slot.vertexId)) children.push(slot.vertexId);
        else
          issues.push({
            kind: 'missingStructuralEndpoint',
            parent,
            vertexId: slot.vertexId,
          });
      } else if (
        slot.identity !== null &&
        !omitted.has(slot.identity.vertexId)
      ) {
        invalidOmissions.add(slot.identity.vertexId);
      }
    }
    return children;
  };
  if (entry.kind === 'forest') {
    checkSlots(entry.slots, null);
    for (const id of slotIds(entry.slots)) queue.push(id);
  }
  for (const vertex of definition.vertices)
    graph.set(
      vertex.vertexId,
      checkSlots(vertex.slots, { vertexId: vertex.vertexId }),
    );
  if (invalidOmissions.size > 0)
    issues.push({ kind: 'invalidOmission', vertexIds: [...invalidOmissions] });

  const reached = new Set<ID>();
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index]!;
    if (reached.has(id)) continue;
    reached.add(id);
    const vertex = byId.get(id);
    if (vertex !== undefined) {
      for (const next of slotIds(vertex.slots)) queue.push(next);
      for (const next of vertex.dependsOnWork) queue.push(next);
      for (const next of vertex.dependsOnSubgraphCompletion) queue.push(next);
    }
  }
  const unreachable = [...byId.keys(), ...omitted].filter(
    (id) => !reached.has(id),
  );
  if (unreachable.length > 0)
    issues.push({ kind: 'unreachable', vertexIds: unreachable });

  const components = stronglyConnectedComponents(graph) as ID[][];
  const cycleById = new Map<ID, ID[]>();
  for (const component of components) {
    const id = component[0]!;
    if (component.length > 1 || graph.get(id)!.includes(id)) {
      const vertexIds: ID[] = [];
      for (const member of component) cycleById.set(member, vertexIds);
    }
  }
  // Declaration order gives deterministic SCC and member ordering in linear time.
  const emitted = new Set<ID[]>();
  for (const id of byId.keys()) {
    const vertexIds = cycleById.get(id);
    if (vertexIds === undefined) continue;
    if (!emitted.has(vertexIds)) {
      issues.push({ kind: 'structuralCycle', vertexIds });
      emitted.add(vertexIds);
    }
    vertexIds.push(id);
  }
  return issues;
}
