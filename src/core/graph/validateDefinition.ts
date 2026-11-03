import { stronglyConnectedComponents } from '@core/scheduling/stronglyConnectedComponents';
import type {
  DagDefinition,
  DagDefinitionIssue,
  DagStructuralDiscoverySlot,
} from '../../traversals/dag-traversal/lib/DagDefinition';

/** Check materialized membership and structural topology before source replay. */
export function validateDefinition<Data, VertexId>(
  definition: DagDefinition<Data, VertexId>,
): DagDefinitionIssue<VertexId>[] {
  const issues: DagDefinitionIssue<VertexId>[] = [];
  const byId = new Map(
    definition.vertexDeclarations.map((vertex) => [vertex.vertexId, vertex]),
  );
  const omitted = new Set(definition.omittedVertexIds);
  const invalidOmissions = new Set<VertexId>();
  const graph = new Map<VertexId, VertexId[]>();
  const queue: VertexId[] = [];
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
    if (definition.vertexDeclarations.length > 0)
      issues.push({
        kind: 'invalidEntry',
        reason: 'emptyWithVertices',
        vertexIds: definition.vertexDeclarations.map(
          (vertex) => vertex.vertexId,
        ),
      });
    for (const id of definition.omittedVertexIds) queue.push(id);
  } else if (
    entry.entryDiscoverySlots.some(
      (slot) => slot.kind === 'omitted' && slot.omittedVertexIdentity === null,
    )
  ) {
    issues.push({
      kind: 'invalidEntry',
      reason: 'entryOmissionMissingIdentity',
      vertexIds: [],
    });
  }
  const slotIds = (
    slots: readonly DagStructuralDiscoverySlot<VertexId>[],
  ): VertexId[] => {
    const result: VertexId[] = [];
    for (const slot of slots) {
      if (slot.kind === 'vertex') result.push(slot.vertexId);
      else if (slot.omittedVertexIdentity !== null)
        result.push(slot.omittedVertexIdentity.vertexId);
    }
    return result;
  };
  const checkSlots = (
    slots: readonly DagStructuralDiscoverySlot<VertexId>[],
    parent: { vertexId: VertexId } | null,
  ): VertexId[] => {
    const children: VertexId[] = [];
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
        slot.omittedVertexIdentity !== null &&
        !omitted.has(slot.omittedVertexIdentity.vertexId)
      ) {
        invalidOmissions.add(slot.omittedVertexIdentity.vertexId);
      }
    }
    return children;
  };
  if (entry.kind === 'roots') {
    checkSlots(entry.entryDiscoverySlots, null);
    for (const id of slotIds(entry.entryDiscoverySlots)) queue.push(id);
  }
  for (const vertex of definition.vertexDeclarations)
    graph.set(
      vertex.vertexId,
      checkSlots(vertex.childDiscoverySlots, { vertexId: vertex.vertexId }),
    );
  if (invalidOmissions.size > 0)
    issues.push({
      kind: 'omissionIdentityNotDeclared',
      vertexIds: [...invalidOmissions],
    });

  const reached = new Set<VertexId>();
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index]!;
    if (reached.has(id)) continue;
    reached.add(id);
    const vertex = byId.get(id);
    if (vertex !== undefined) {
      for (const next of slotIds(vertex.childDiscoverySlots)) queue.push(next);
      for (const next of vertex.workWaitsForWorkOf) queue.push(next);
      for (const next of vertex.workWaitsForSubgraphCompletionOf)
        queue.push(next);
    }
  }
  const unreachable = [...byId.keys(), ...omitted].filter(
    (id) => !reached.has(id),
  );
  if (unreachable.length > 0)
    issues.push({
      kind: 'outsideEntryDiscoveryClosure',
      vertexIds: unreachable,
    });

  const components = stronglyConnectedComponents(graph) as VertexId[][];
  const cycleById = new Map<VertexId, VertexId[]>();
  for (const component of components) {
    const id = component[0]!;
    if (component.length > 1 || graph.get(id)!.includes(id)) {
      const vertexIds: VertexId[] = [];
      for (const member of component) cycleById.set(member, vertexIds);
    }
  }
  // Declaration order gives deterministic SCC and member ordering in linear time.
  const emitted = new Set<VertexId[]>();
  for (const id of byId.keys()) {
    const vertexIds = cycleById.get(id);
    if (vertexIds === undefined) continue;
    if (!emitted.has(vertexIds)) {
      issues.push({
        kind: 'structuralChildCycleComponent',
        componentVertexIds: vertexIds,
      });
      emitted.add(vertexIds);
    }
    vertexIds.push(id);
  }
  return issues;
}
