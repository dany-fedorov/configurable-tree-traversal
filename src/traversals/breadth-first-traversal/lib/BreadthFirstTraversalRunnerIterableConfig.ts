import { BreadthFirstPhase } from './BreadthFirstTraversalOrder';
import type {
  TraversalRunnerIterableConfig,
  TraversalIterableConfigInput,
} from '@core/TraversalRunnerIterableConfig';
import {
  normalizeTraversalExecutionOptions,
  executionOptionsFromPhaseGates,
  toLegacyTraversalExecutionConfig,
} from '@core/normalizeTraversalExecutionOptions';
import { deepFreeze } from '@utils/deepFreeze';

export type BreadthFirstTraversalRunnerIterableConfig =
  TraversalRunnerIterableConfig<BreadthFirstPhase>;
export type BreadthFirstTraversalRunnerIterableConfigInput =
  TraversalIterableConfigInput<BreadthFirstPhase>;

export const BREADTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT: BreadthFirstTraversalRunnerIterableConfig =
  deepFreeze(makeEffectiveBreadthFirstTraversalRunnerIterableConfig());

export function makeEffectiveBreadthFirstTraversalRunnerIterableConfig(
  config?: BreadthFirstTraversalRunnerIterableConfigInput,
  previous?: BreadthFirstTraversalRunnerIterableConfig,
): BreadthFirstTraversalRunnerIterableConfig {
  const phases = Object.values(BreadthFirstPhase);
  return toLegacyTraversalExecutionConfig(
    normalizeTraversalExecutionOptions<BreadthFirstPhase>(
      phases,
      config,
      previous === undefined
        ? undefined
        : normalizeTraversalExecutionOptions<BreadthFirstPhase>(
            phases,
            executionOptionsFromPhaseGates(previous),
          ),
    ),
  );
}
