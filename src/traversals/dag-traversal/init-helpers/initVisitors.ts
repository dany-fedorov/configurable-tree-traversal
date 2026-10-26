import { sortVisitorRecords } from '@core/executeVisitors';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type {
  DagResolvedOptions,
  DagTraversalVisitors,
} from '../lib/DagTraversalInstanceConfig';
import { DagVisitorPhase } from '../lib/DagTraversalOrder';

export function initDagVisitors<
  T extends VertexTypes,
  R extends VertexTypes,
  ID = unknown,
>(
  config: Pick<DagResolvedOptions<T, R, ID>, 'visitors'>,
): DagTraversalVisitors<T, R, ID> {
  return {
    [DagVisitorPhase.ON_WORK_READY]: sortVisitorRecords(
      config.visitors[DagVisitorPhase.ON_WORK_READY],
    ),
    [DagVisitorPhase.ON_SUBGRAPH_READY]: sortVisitorRecords(
      config.visitors[DagVisitorPhase.ON_SUBGRAPH_READY],
    ),
  };
}
