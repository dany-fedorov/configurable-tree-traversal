import { BreadthFirstTraversalOrder } from './BreadthFirstTraversalOrder';
import type {
  TraversalRunnerIterableConfig,
  TraversalIterableConfigInput,
} from '@core/TraversalRunnerIterableConfig';
import {
  normalizeTraversalExecutionOptions,
  toLegacyTraversalExecutionConfig,
} from '@core/normalizeTraversalExecutionOptions';
import { deepFreeze } from '@utils/deepFreeze';

export type BreadthFirstTraversalRunnerIterableConfig =
  TraversalRunnerIterableConfig<BreadthFirstTraversalOrder>;
export type BreadthFirstTraversalRunnerIterableConfigInput =
  TraversalIterableConfigInput<BreadthFirstTraversalOrder>;

export const BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT: BreadthFirstTraversalRunnerIterableConfig =
  deepFreeze(makeEffectiveBreadthFirstTraversalRunnerIterableConfig());

export function makeEffectiveBreadthFirstTraversalRunnerIterableConfig(
  config?: BreadthFirstTraversalRunnerIterableConfigInput,
  previous?: BreadthFirstTraversalRunnerIterableConfig,
): BreadthFirstTraversalRunnerIterableConfig {
  const phases = Object.values(BreadthFirstTraversalOrder);
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
