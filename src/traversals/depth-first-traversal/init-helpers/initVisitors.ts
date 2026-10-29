import { sortVisitorRecords } from '@core/executeVisitors';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { DepthFirstTreeResolvedOptions } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstTraversalVisitors } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';

export function initVisitors<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
>(
  icfg: DepthFirstTreeResolvedOptions<TTP, RW_TTP>,
): DepthFirstTraversalVisitors<TTP, RW_TTP> {
  return Object.fromEntries(
    Object.entries(icfg.visitors).map(([order, visitors]) => {
      return [order, sortVisitorRecords(visitors)];
    }),
  ) as DepthFirstTraversalVisitors<TTP, RW_TTP>;
}
