import type { LivePreCommandDiscoveredGraphView } from '@core/ResolvedGraphView';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';

/** True when exactly one resolved vertex has no structural children.
 * Empty graphs return false and a single leaf returns true; W/C edges are ignored.
 */
export function hasExactlyOneResolvedStructuralLeaf<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
>(graph: LivePreCommandDiscoveredGraphView<SourceVertexTypes>): boolean {
  let count = 0;
  for (const ref of graph.getVertexHandles()) {
    if (
      (graph.getStructuralChildHandlesInSlotOrderOrNull(ref)?.length ?? 0) === 0
    )
      count++;
    if (count > 1) return false;
  }
  return count === 1;
}
