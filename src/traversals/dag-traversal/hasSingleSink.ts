import type { ResolvedGraphSnapshot } from '@core/ResolvedGraph';
import type { VertexTypes } from '@core/TreeTypeParameters';

/** True when exactly one resolved vertex has no structural children.
 * Empty graphs return false and a single leaf returns true; W/C edges are ignored.
 */
export function hasSingleSink<T extends VertexTypes>(
  graph: ResolvedGraphSnapshot<T>,
): boolean {
  let count = 0;
  for (const ref of graph.getVertexRefs()) {
    if ((graph.getChildrenOf(ref)?.length ?? 0) === 0) count++;
    if (count > 1) return false;
  }
  return count === 1;
}
