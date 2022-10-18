import { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { TraversalRunnerIterableConfig } from '@core/TraversalRunnerIterableConfig';

export type DepthFirstTraversalRunnerIterableConfig =
  TraversalRunnerIterableConfig<DepthFirstTraversalOrder>;

export type DepthFirstTraversalRunnerIterableConfigInput =
  Partial<DepthFirstTraversalRunnerIterableConfig>;

export const DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT: DepthFirstTraversalRunnerIterableConfig =
  {
    enableVisitorFunctionsFor: null,
    disableVisitorFunctionsFor: null,
    iterateOver: Object.values(DepthFirstTraversalOrder),
  };

export function makeEffectiveDepthFirstTraversalRunnerIterableConfig(
  config?: DepthFirstTraversalRunnerIterableConfigInput,
): DepthFirstTraversalRunnerIterableConfig {
  if (!config) {
    return DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT;
  }
  return {
    ...DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT,
    ...config,
  };
}
