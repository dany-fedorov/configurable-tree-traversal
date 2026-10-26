import type {
  DagWaitEdge,
  DagMilestone,
} from '@core/errors/DagTraversalStallError';

type MilestoneKind = DagMilestone['milestone'];
type Adjacency<ID> = Map<ID, Map<MilestoneKind, DagWaitEdge<ID>[]>>;

/** Index original constraints once; each walk returns fresh owned wrappers. */
export function makeMilestoneQuery<ID>(
  edges: readonly DagWaitEdge<ID>[],
) {
  const forward: Adjacency<ID> = new Map();
  const reverse: Adjacency<ID> = new Map();
  const append = (
    adjacency: Adjacency<ID>,
    endpoint: DagMilestone<ID>,
    edge: DagWaitEdge<ID>,
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
      waiter: { ...edge.waiter },
      prerequisite: { ...edge.prerequisite },
      reason: edge.reason,
    };
    append(forward, copy.waiter, copy);
    append(reverse, copy.prerequisite, copy);
  }
  return (
    target: DagMilestone<ID>,
    direction: 'prerequisites' | 'dependents',
    transitive: boolean,
    includeEdge: (edge: DagWaitEdge<ID>) => boolean = () => true,
  ): {
    milestones: DagMilestone<ID>[];
    edges: DagWaitEdge<ID>[];
  } => {
    const adjacency = direction === 'prerequisites' ? forward : reverse;
    const seen = new Map<ID, Set<MilestoneKind>>();
    const queue: DagMilestone<ID>[] = [];
    const visit = (milestone: DagMilestone<ID>) => {
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
    const result: DagWaitEdge<ID>[] = [];
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index]!;
      for (const edge of adjacency
        .get(current.vertexId)
        ?.get(current.milestone) ?? []) {
        if (!includeEdge(edge)) continue;
        result.push({
          waiter: { ...edge.waiter },
          prerequisite: { ...edge.prerequisite },
          reason: edge.reason,
        });
        visit(direction === 'prerequisites' ? edge.prerequisite : edge.waiter);
      }
      if (!transitive) break;
    }
    return {
      milestones: queue.slice(1).map((milestone) => ({ ...milestone })),
      edges: result,
    };
  };
}
