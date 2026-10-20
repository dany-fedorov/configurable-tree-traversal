import type { ResolvedGraphSnapshot } from '@core/ResolvedGraph';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';

export function hasSingleSink<T extends TreeTypeParameters>(
  graph: ResolvedGraphSnapshot<T>,
): boolean {
  let count = 0;
  for (const ref of graph.getVertexRefs()) {
    if ((graph.getChildrenOf(ref)?.length ?? 0) === 0) count++;
    if (count > 1) return false;
  }
  return count === 1;
}
