import { sortVisitorRecords } from '@core/executeVisitors';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { DepthFirstTreeResolvedOptions } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstTreeVisitorRegistrationsByPhase } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';

export function initVisitors<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
>(
  icfg: DepthFirstTreeResolvedOptions<InputVertexTypes, RewrittenVertexTypes>,
): DepthFirstTreeVisitorRegistrationsByPhase<
  InputVertexTypes,
  RewrittenVertexTypes
> {
  return Object.fromEntries(
    Object.entries(icfg.visitors).map(([order, visitors]) => {
      return [order, sortVisitorRecords(visitors)];
    }),
  ) as DepthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
}
