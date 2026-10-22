import type { VertexId } from '@core/graph/types';
import { stronglyConnectedComponents } from './stronglyConnectedComponents';

type Declaration = {
  id: VertexId;
  work: readonly VertexId[];
  complete: readonly VertexId[];
  children: readonly VertexId[];
};
type Milestone = { id: VertexId };

/** Original wait edges, independent of runtime success and completedWork seeds. */
export function dependencyMilestoneCycles(
  declarations: readonly Declaration[],
): VertexId[][] {
  const tokens = new Map<VertexId, { work: Milestone; complete: Milestone }>();
  const positions = new Map<VertexId, number>();
  for (const [index, { id }] of declarations.entries()) {
    tokens.set(id, { work: { id }, complete: { id } });
    positions.set(id, index);
  }
  const ids = Array.from(tokens.keys());
  const graph = new Map<Milestone, Milestone[]>();
  for (const declaration of declarations) {
    const own = tokens.get(declaration.id)!;
    const work: Milestone[] = [];
    const complete: Milestone[] = [own.work];
    for (const id of declaration.work) {
      const target = tokens.get(id);
      if (target !== undefined) work.push(target.work);
    }
    for (const id of declaration.complete) {
      const target = tokens.get(id);
      if (target !== undefined) work.push(target.complete);
    }
    for (const id of declaration.children)
      complete.push(tokens.get(id)!.complete);
    graph.set(own.work, work);
    graph.set(own.complete, complete);
  }
  const projections = new Set<string>();
  const cycles: Array<{ ids: VertexId[]; positions: number[] }> = [];
  for (const component of stronglyConnectedComponents(graph) as Milestone[][]) {
    if (
      component.length === 1 &&
      !graph.get(component[0]!)!.includes(component[0]!)
    )
      continue;
    // Sort positions, not raw IDs: Array.sort treats undefined specially.
    const ordered = Array.from(
      new Set(component.map(({ id }) => positions.get(id)!)),
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
  return cycles.map(({ ids }) => ids);
}
