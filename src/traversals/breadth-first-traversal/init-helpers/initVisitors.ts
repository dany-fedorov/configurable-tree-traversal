import { sortVisitorRecords } from '@core/executeVisitors';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { BreadthFirstTraversalInstanceConfig } from '../lib/BreadthFirstTraversalInstanceConfig';
import type { BreadthFirstTraversalVisitors } from '../lib/BreadthFirstTraversalVisitors';

export function initBreadthFirstVisitors<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  config: Pick<BreadthFirstTraversalInstanceConfig<TTP, RW_TTP>, 'visitors'>,
): BreadthFirstTraversalVisitors<TTP, RW_TTP> {
  return Object.fromEntries(
    Object.entries(config.visitors).map(([order, visitors]) => [
      order,
      sortVisitorRecords(visitors),
    ]),
  ) as BreadthFirstTraversalVisitors<TTP, RW_TTP>;
}
