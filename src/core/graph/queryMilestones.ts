import type {
  DagMilestoneConstraint,
  DagMilestone,
} from '@core/errors/DagTraversalStallError';

type MilestoneKind = DagMilestone['milestone'];
type Adjacency<VertexId> = Map<
  VertexId,
  Map<MilestoneKind, DagMilestoneConstraint<VertexId>[]>
>;

/** Index original constraints once; each walk returns fresh owned wrappers. */
export function makeMilestoneQuery<VertexId>(
  edges: readonly DagMilestoneConstraint<VertexId>[],
) {
  const forward: Adjacency<VertexId> = new Map();
  const reverse: Adjacency<VertexId> = new Map();
  const append = (
    adjacency: Adjacency<VertexId>,
    endpoint: DagMilestone<VertexId>,
    edge: DagMilestoneConstraint<VertexId>,
  ) => {
    let pair = adjacency.get(endpoint.vertexId);
    if (pair === undefined) {
      pair = new Map();
      adjacency.set(endpoint.vertexId, pair);
    }
    const adjacent = pair.get(endpoint.milestone);
    if (adjacent === undefined) pair.set(endpoint.milestone, [edge]);
    else adjacent.push(edge);
  };
  for (const edge of edges) {
    const copy = {
      waitingMilestone: { ...edge.waitingMilestone },
      prerequisiteMilestone: { ...edge.prerequisiteMilestone },
      reason: edge.reason,
    };
    append(forward, copy.waitingMilestone, copy);
    append(reverse, copy.prerequisiteMilestone, copy);
  }
  return (
    target: DagMilestone<VertexId>,
    direction: 'prerequisites' | 'dependents',
    transitive: boolean,
    includeEdge: (edge: DagMilestoneConstraint<VertexId>) => boolean = () =>
      true,
  ): {
    milestones: DagMilestone<VertexId>[];
    edges: DagMilestoneConstraint<VertexId>[];
  } => {
    const adjacency = direction === 'prerequisites' ? forward : reverse;
    const seen = new Map<VertexId, Set<MilestoneKind>>();
    const queue: DagMilestone<VertexId>[] = [];
    const visit = (milestone: DagMilestone<VertexId>) => {
      let pair = seen.get(milestone.vertexId);
      if (pair === undefined) {
        pair = new Set();
        seen.set(milestone.vertexId, pair);
      }
      if (pair.has(milestone.milestone)) return;
      pair.add(milestone.milestone);
      queue.push(milestone);
    };
    visit({ vertexId: target.vertexId, milestone: target.milestone });
    const result: DagMilestoneConstraint<VertexId>[] = [];
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index]!;
      for (const edge of adjacency
        .get(current.vertexId)
        ?.get(current.milestone) ?? []) {
        if (!includeEdge(edge)) continue;
        result.push({
          waitingMilestone: { ...edge.waitingMilestone },
          prerequisiteMilestone: { ...edge.prerequisiteMilestone },
          reason: edge.reason,
        });
        visit(
          direction === 'prerequisites'
            ? edge.prerequisiteMilestone
            : edge.waitingMilestone,
        );
      }
      if (!transitive) break;
    }
    return {
      milestones: queue.slice(1).map((milestone) => ({ ...milestone })),
      edges: result,
    };
  };
}
