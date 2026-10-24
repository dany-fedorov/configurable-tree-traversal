import { DepthFirstTraversalOrder } from './DepthFirstTraversalOrder';
import type {
  TraversalRunnerIterableConfig,
  TraversalIterableConfigInput,
} from '@core/TraversalRunnerIterableConfig';
import {
  normalizeTraversalExecutionOptions,
  toLegacyTraversalExecutionConfig,
} from '@core/normalizeTraversalExecutionOptions';
import { deepFreeze } from '@utils/deepFreeze';

export type DepthFirstTraversalRunnerIterableConfig =
  TraversalRunnerIterableConfig<DepthFirstTraversalOrder>;
export type DepthFirstTraversalRunnerIterableConfigInput =
  TraversalIterableConfigInput<DepthFirstTraversalOrder>;

export const DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT: DepthFirstTraversalRunnerIterableConfig =
  deepFreeze(makeEffectiveDepthFirstTraversalRunnerIterableConfig());

export function makeEffectiveDepthFirstTraversalRunnerIterableConfig(
  config?: DepthFirstTraversalRunnerIterableConfigInput,
  previous?: DepthFirstTraversalRunnerIterableConfig,
): DepthFirstTraversalRunnerIterableConfig {
  const phases = Object.values(DepthFirstTraversalOrder);
  return toLegacyTraversalExecutionConfig(
    normalizeTraversalExecutionOptions(
      phases,
      config,
      previous === undefined
        ? undefined
        : normalizeTraversalExecutionOptions(phases, previous),
    ),
  );
}
