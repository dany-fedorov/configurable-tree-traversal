import { sortVisitorRecords } from '@core/executeVisitors';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type {
  DagResolvedOptions,
  DagTraversalVisitors,
} from '../lib/DagTraversalInstanceConfig';
import { DagVisitorPhase } from '../lib/DagTraversalOrder';

export function initDagVisitors<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
>(
  config: Pick<
    DagResolvedOptions<SourceVertexTypes, RewrittenVertexTypes, VertexId>,
    'visitors'
  >,
): DagTraversalVisitors<SourceVertexTypes, RewrittenVertexTypes, VertexId> {
  return {
    [DagVisitorPhase.ON_WORK_READY]: sortVisitorRecords(
      config.visitors[DagVisitorPhase.ON_WORK_READY],
    ),
    [DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY]: sortVisitorRecords(
      config.visitors[DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY],
    ),
  };
}
