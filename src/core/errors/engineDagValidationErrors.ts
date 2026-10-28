import type { DagDiscoveryCycleError } from './DagDiscoveryCycleError';
import type { DagTraversalStallError } from './DagTraversalStallError';

/** Private per-store provenance: source-thrown lookalikes are never validation. */
export const engineDagValidationErrors = new WeakMap<
  object,
  DagDiscoveryCycleError | DagTraversalStallError
>();
