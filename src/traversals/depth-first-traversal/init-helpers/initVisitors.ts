import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { DepthFirstTraversalInstanceConfig } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstTraversalVisitors } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';

export function initVisitors<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  icfg: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
): DepthFirstTraversalVisitors<TTP, RW_TTP> {
  return Object.fromEntries(
    Object.entries(icfg.visitors).map(([order, visitors]) => {
      return [order, [...visitors]];
    }),
  ) as DepthFirstTraversalVisitors<TTP, RW_TTP>;
}
