import { sortVisitorRecords } from '@core/executeVisitors';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type {
  DagTraversalInstanceConfig,
  DagTraversalVisitors,
} from '../lib/DagTraversalInstanceConfig';
import { DagTraversalOrder } from '../lib/DagTraversalOrder';

export function initDagVisitors<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
>(
  config: Pick<DagTraversalInstanceConfig<T, R>, 'visitors'>,
): DagTraversalVisitors<T, R> {
  return {
    [DagTraversalOrder.ON_READY]: sortVisitorRecords(
      config.visitors[DagTraversalOrder.ON_READY],
    ),
    [DagTraversalOrder.ON_COMPLETE]: sortVisitorRecords(
      config.visitors[DagTraversalOrder.ON_COMPLETE],
    ),
  };
}
