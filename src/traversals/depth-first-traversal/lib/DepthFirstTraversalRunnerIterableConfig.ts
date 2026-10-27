import { DepthFirstPhase } from './DepthFirstTraversalOrder';
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

export type DepthFirstTraversalRunnerIterableConfig =
  TraversalRunnerIterableConfig<DepthFirstPhase>;
export type DepthFirstTraversalRunnerIterableConfigInput =
  TraversalIterableConfigInput<DepthFirstPhase>;

export const DEPTH_FIRST_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT: DepthFirstTraversalRunnerIterableConfig =
  deepFreeze(makeEffectiveDepthFirstTraversalRunnerIterableConfig());

export function makeEffectiveDepthFirstTraversalRunnerIterableConfig(
  config?: DepthFirstTraversalRunnerIterableConfigInput,
  previous?: DepthFirstTraversalRunnerIterableConfig,
): DepthFirstTraversalRunnerIterableConfig {
  const phases = Object.values(DepthFirstPhase);
  return toLegacyTraversalExecutionConfig(
    normalizeTraversalExecutionOptions(
      phases,
      config,
      previous === undefined
        ? undefined
        : normalizeTraversalExecutionOptions(
            phases,
            executionOptionsFromPhaseGates(previous),
          ),
    ),
  );
}
