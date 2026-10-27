import { DagVisitorPhase } from './DagTraversalOrder';
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

export type DagTraversalRunnerIterableConfig =
  TraversalRunnerIterableConfig<DagVisitorPhase>;
export type DagTraversalRunnerIterableConfigInput =
  TraversalIterableConfigInput<DagVisitorPhase>;

export const DAG_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT: DagTraversalRunnerIterableConfig =
  deepFreeze(makeEffectiveDagTraversalRunnerIterableConfig());

export function makeEffectiveDagTraversalRunnerIterableConfig(
  config?: DagTraversalRunnerIterableConfigInput,
  previous?: DagTraversalRunnerIterableConfig,
): DagTraversalRunnerIterableConfig {
  const phases = Object.values(DagVisitorPhase);
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
