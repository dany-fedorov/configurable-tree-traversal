import type { VertexId } from '@core/graph/types';

/** Iterative Kosaraju traversal; graph keys and edges use SameValueZero identity. */
export function stronglyConnectedComponents(
  graph: Map<VertexId, VertexId[]>,
): VertexId[][] {
  const seen = new Set<VertexId>();
  const order: VertexId[] = [];
  const reverse = new Map<VertexId, VertexId[]>();
  for (const id of graph.keys()) reverse.set(id, []);
  for (const [id, edges] of graph) {
    for (const edge of edges) reverse.get(edge)!.push(id);
    if (seen.has(id)) continue;
    seen.add(id);
    const stack = [{ id, index: 0 }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const edges = graph.get(frame.id)!;
      if (frame.index === edges.length) {
        order.push(frame.id);
        stack.pop();
      } else {
        const next = edges[frame.index++]!;
        if (!seen.has(next)) {
          seen.add(next);
          stack.push({ id: next, index: 0 });
        }
      }
    }
  }
  seen.clear();
  const result: VertexId[][] = [];
  for (let index = order.length - 1; index >= 0; index--) {
    const id = order[index]!;
    if (seen.has(id)) continue;
    const component: VertexId[] = [];
    const stack: VertexId[] = [id];
    seen.add(id);
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      for (const next of reverse.get(current)!) {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    result.push(component);
  }
  return result;
}
