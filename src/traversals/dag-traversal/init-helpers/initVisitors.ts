import { sortVisitorRecords } from '@core/executeVisitors';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type {
  DagTraversalInstanceConfig,
  DagTraversalVisitors,
} from '../lib/DagTraversalInstanceConfig';
import { DagTraversalOrder } from '../lib/DagTraversalOrder';

export function initDagVisitors<
  T extends VertexTypes,
  R extends VertexTypes,
  ID = unknown,
>(
  config: Pick<DagTraversalInstanceConfig<T, R, ID>, 'visitors'>,
): DagTraversalVisitors<T, R, ID> {
  return {
    [DagTraversalOrder.ON_READY]: sortVisitorRecords(
      config.visitors[DagTraversalOrder.ON_READY],
    ),
    [DagTraversalOrder.ON_COMPLETE]: sortVisitorRecords(
      config.visitors[DagTraversalOrder.ON_COMPLETE],
    ),
  };
}
