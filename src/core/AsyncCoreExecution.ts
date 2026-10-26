import type { AsyncTraversalExecution } from '@core/TraversalExecution';
import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';

/** Historical execution name. Erasing the phase type permits no explicit phases. */
export interface AsyncCoreExecution<
  Event,
  Phase extends string = never,
  EmittedKind extends string = Phase,
> extends AsyncTraversalExecution<
    Phase,
    Event,
    import('./CoreInspection').CoreInspection,
    EmittedKind
  > {
  // Preserve the extensible historical interface and its fluent return type.
  run: (
    config?: TraversalIterableConfigInput<Phase, EmittedKind>,
  ) => Promise<this>;
}
