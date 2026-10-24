import { DagTraversalOrder } from './DagTraversalOrder';
import type {
  TraversalRunnerIterableConfig,
  TraversalIterableConfigInput,
} from '@core/TraversalRunnerIterableConfig';
import {
  normalizeTraversalExecutionOptions,
  toLegacyTraversalExecutionConfig,
} from '@core/normalizeTraversalExecutionOptions';
import { deepFreeze } from '@utils/deepFreeze';

export type DagTraversalRunnerIterableConfig =
  TraversalRunnerIterableConfig<DagTraversalOrder>;
export type DagTraversalRunnerIterableConfigInput =
  TraversalIterableConfigInput<DagTraversalOrder>;

export const DAG_TRAVERSAL_RUNNER_ITERABLE_CONFIG_DEFAULT: DagTraversalRunnerIterableConfig =
  deepFreeze(makeEffectiveDagTraversalRunnerIterableConfig());

export function makeEffectiveDagTraversalRunnerIterableConfig(
  config?: DagTraversalRunnerIterableConfigInput,
  previous?: DagTraversalRunnerIterableConfig,
): DagTraversalRunnerIterableConfig {
  const phases = Object.values(DagTraversalOrder);
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
