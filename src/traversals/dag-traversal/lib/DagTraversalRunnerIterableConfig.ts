import type { TraversalRunnerIterableConfig } from '@core/TraversalRunnerIterableConfig';
import { deepFreeze } from '@utils/deepFreeze';
import { DagTraversalOrder } from './DagTraversalOrder';

export type DagTraversalRunnerIterableConfig =
  TraversalRunnerIterableConfig<DagTraversalOrder>;

export type DagTraversalRunnerIterableConfigInput =
  Partial<DagTraversalRunnerIterableConfig>;

export const DAG_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT: DagTraversalRunnerIterableConfig =
  deepFreeze({
    enableVisitorFunctionsFor: null,
    disableVisitorFunctionsFor: null,
    iterateOver: Object.values(DagTraversalOrder),
  });

export function makeEffectiveDagTraversalRunnerIterableConfig(
  config?: DagTraversalRunnerIterableConfigInput,
): DagTraversalRunnerIterableConfig {
  const effective = {
    ...DAG_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT,
    ...config,
  };
  return {
    iterateOver: effective.iterateOver.slice(),
    enableVisitorFunctionsFor:
      effective.enableVisitorFunctionsFor?.slice() ?? null,
    disableVisitorFunctionsFor:
      effective.disableVisitorFunctionsFor?.slice() ?? null,
  };
}
