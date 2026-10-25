import type {
  DagDependencyEdge,
  DagDependencyMilestone,
} from '@core/errors/DagTraversalStallError';

type MilestoneKind = DagDependencyMilestone['milestone'];
type Adjacency<ID> = Map<ID, Map<MilestoneKind, DagDependencyEdge<ID>[]>>;

/** Index original constraints once; each walk returns fresh owned wrappers. */
export function makeMilestoneQuery<ID>(
  edges: readonly DagDependencyEdge<ID>[],
) {
  const forward: Adjacency<ID> = new Map();
  const reverse: Adjacency<ID> = new Map();
  const append = (
    adjacency: Adjacency<ID>,
    endpoint: DagDependencyMilestone<ID>,
    edge: DagDependencyEdge<ID>,
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
      from: { ...edge.from },
      to: { ...edge.to },
      reason: edge.reason,
    };
    append(forward, copy.from, copy);
    append(reverse, copy.to, copy);
  }
  return (
    target: DagDependencyMilestone<ID>,
    direction: 'prerequisites' | 'dependents',
    transitive: boolean,
    includeEdge: (edge: DagDependencyEdge<ID>) => boolean = () => true,
  ): {
    milestones: DagDependencyMilestone<ID>[];
    edges: DagDependencyEdge<ID>[];
  } => {
    const adjacency = direction === 'prerequisites' ? forward : reverse;
    const seen = new Map<ID, Set<MilestoneKind>>();
    const queue: DagDependencyMilestone<ID>[] = [];
    const visit = (milestone: DagDependencyMilestone<ID>) => {
      let pair = seen.get(milestone.vertexId);
      if (pair === undefined) {
        pair = new Set();
        seen.set(milestone.vertexId, pair);
      }
      if (pair.has(milestone.milestone)) return;
      pair.add(milestone.milestone);
      queue.push(milestone);
    };
    visit({ ...target });
    const result: DagDependencyEdge<ID>[] = [];
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index]!;
      for (const edge of adjacency
        .get(current.vertexId)
        ?.get(current.milestone) ?? []) {
        if (!includeEdge(edge)) continue;
        result.push({
          from: { ...edge.from },
          to: { ...edge.to },
          reason: edge.reason,
        });
        visit(direction === 'prerequisites' ? edge.to : edge.from);
      }
      if (!transitive) break;
    }
    return {
      milestones: queue.slice(1).map((milestone) => ({ ...milestone })),
      edges: result,
    };
  };
}
