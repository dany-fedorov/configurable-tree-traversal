import { sortVisitorRecords } from '@core/executeVisitors';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { BreadthFirstTreeResolvedOptions } from '../lib/BreadthFirstTraversalInstanceConfig';
import type { BreadthFirstTreeVisitorRegistrationsByPhase } from '../lib/BreadthFirstTraversalVisitors';

export function initBreadthFirstVisitors<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
>(
  config: Pick<
    BreadthFirstTreeResolvedOptions<InputVertexTypes, RewrittenVertexTypes>,
    'visitors'
  >,
): BreadthFirstTreeVisitorRegistrationsByPhase<
  InputVertexTypes,
  RewrittenVertexTypes
> {
  return Object.fromEntries(
    Object.entries(config.visitors).map(([order, visitors]) => [
      order,
      sortVisitorRecords(visitors),
    ]),
  ) as BreadthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
}
