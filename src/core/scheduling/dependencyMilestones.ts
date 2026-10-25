import type {
  DagDependencyEdge,
  DagDependencyMilestone,
} from '@core/errors/DagTraversalStallError';
import type { VertexId } from '@core/graph/types';
import { stronglyConnectedComponents } from './stronglyConnectedComponents';

type Declaration = {
  id: VertexId;
  work: readonly VertexId[];
  complete: readonly VertexId[];
  children: readonly VertexId[];
};
type Milestones = {
  work: DagDependencyMilestone;
  completion: DagDependencyMilestone;
};

/** One labelled model of original constraints, independent of accepted work seeds. */
export function dependencyMilestones(declarations: readonly Declaration[]): {
  edges: DagDependencyEdge[];
  cycles: VertexId[][];
} {
  const tokens = new Map<VertexId, Milestones>();
  const positions = new Map<VertexId, number>();
  const milestones = (vertexId: VertexId): Milestones => {
    let pair = tokens.get(vertexId);
    if (pair === undefined) {
      pair = {
        work: { vertexId, milestone: 'work' },
        completion: { vertexId, milestone: 'completion' },
      };
      tokens.set(vertexId, pair);
    }
    return pair;
  };
  for (const [index, { id }] of declarations.entries()) {
    milestones(id);
    positions.set(id, index);
  }
  const ids = Array.from(tokens.keys());
  const edges: DagDependencyEdge[] = [];
  for (const declaration of declarations) {
    const own = milestones(declaration.id);
    for (const id of declaration.work) {
      edges.push({
        from: own.work,
        to: milestones(id).work,
        reason: 'workDependency',
      });
    }
    for (const id of declaration.complete) {
      edges.push({
        from: own.work,
        to: milestones(id).completion,
        reason: 'completionDependency',
      });
    }
    edges.push({ from: own.completion, to: own.work, reason: 'ownWork' });
    for (const id of declaration.children) {
      edges.push({
        from: own.completion,
        to: milestones(id).completion,
        reason: 'structuralChild',
      });
    }
  }
  // Missing endpoints are graph sinks: retain them for diagnostics and SCC analysis.
  const graph = new Map<DagDependencyMilestone, DagDependencyMilestone[]>();
  for (const pair of tokens.values()) {
    graph.set(pair.work, []);
    graph.set(pair.completion, []);
  }
  for (const edge of edges) graph.get(edge.from)!.push(edge.to);
  const projections = new Set<string>();
  const cycles: Array<{ ids: VertexId[]; positions: number[] }> = [];
  for (const component of stronglyConnectedComponents(
    graph,
  ) as DagDependencyMilestone[][]) {
    if (
      component.length === 1 &&
      !graph.get(component[0]!)!.includes(component[0]!)
    )
      continue;
    // Sort positions, not raw IDs: Array.sort treats undefined specially.
    const ordered = Array.from(
      new Set(component.map(({ vertexId }) => positions.get(vertexId)!)),
    ).sort((a, b) => a - b);
    const key = ordered.join(',');
    if (projections.has(key)) continue;
    projections.add(key);
    cycles.push({
      ids: ordered.map((position) => ids[position]),
      positions: ordered,
    });
  }
  cycles.sort((a, b) => a.positions[0]! - b.positions[0]!);
  return { edges, cycles: cycles.map(({ ids }) => ids) };
}

/** Compatibility projection for internal/deep-import cycle consumers. */
export function dependencyMilestoneCycles(
  declarations: readonly Declaration[],
): VertexId[][] {
  return dependencyMilestones(declarations).cycles;
}
