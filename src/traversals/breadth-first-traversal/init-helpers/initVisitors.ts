import { sortVisitorRecords } from '@core/executeVisitors';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { BreadthFirstTreeResolvedOptions } from '../lib/BreadthFirstTraversalInstanceConfig';
import type { BreadthFirstTraversalVisitors } from '../lib/BreadthFirstTraversalVisitors';

export function initBreadthFirstVisitors<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
>(
  config: Pick<BreadthFirstTreeResolvedOptions<TTP, RW_TTP>, 'visitors'>,
): BreadthFirstTraversalVisitors<TTP, RW_TTP> {
  return Object.fromEntries(
    Object.entries(config.visitors).map(([order, visitors]) => [
      order,
      sortVisitorRecords(visitors),
    ]),
  ) as BreadthFirstTraversalVisitors<TTP, RW_TTP>;
}
