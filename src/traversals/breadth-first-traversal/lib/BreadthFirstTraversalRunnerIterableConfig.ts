import type { TraversalRunnerIterableConfig } from '@core/TraversalRunnerIterableConfig';
import { BreadthFirstTraversalOrder } from './BreadthFirstTraversalOrder';
import { deepFreeze } from '@utils/deepFreeze';

export type BreadthFirstTraversalRunnerIterableConfig =
  TraversalRunnerIterableConfig<BreadthFirstTraversalOrder>;

export type BreadthFirstTraversalRunnerIterableConfigInput =
  Partial<BreadthFirstTraversalRunnerIterableConfig>;

export const BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT: BreadthFirstTraversalRunnerIterableConfig =
  deepFreeze({
    enableVisitorFunctionsFor: null,
    disableVisitorFunctionsFor: null,
    iterateOver: Object.values(BreadthFirstTraversalOrder),
  });

export function makeEffectiveBreadthFirstTraversalRunnerIterableConfig(
  config?: BreadthFirstTraversalRunnerIterableConfigInput,
): BreadthFirstTraversalRunnerIterableConfig {
  const effective = {
    ...BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT,
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
