import { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { TraversalRunnerIterableConfig } from '@core/TraversalRunnerIterableConfig';
import { deepFreeze } from '@utils/deepFreeze';

export type DepthFirstTraversalRunnerIterableConfig =
  TraversalRunnerIterableConfig<DepthFirstTraversalOrder>;

export type DepthFirstTraversalRunnerIterableConfigInput =
  Partial<DepthFirstTraversalRunnerIterableConfig>;

export const DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT: DepthFirstTraversalRunnerIterableConfig =
  deepFreeze({
    enableVisitorFunctionsFor: null,
    disableVisitorFunctionsFor: null,
    iterateOver: Object.values(DepthFirstTraversalOrder),
  });

export function makeEffectiveDepthFirstTraversalRunnerIterableConfig(
  config?: DepthFirstTraversalRunnerIterableConfigInput,
): DepthFirstTraversalRunnerIterableConfig {
  const effective = {
    ...DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT,
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
