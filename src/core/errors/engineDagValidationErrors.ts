import type { DagStructuralDiscoveryCycleError } from './DagDiscoveryCycleError';
import type { DagTraversalStallError } from './DagTraversalStallError';

/** Private per-store provenance: source-thrown lookalikes are never validation. */
export const engineDagValidationErrors = new WeakMap<
  object,
  DagStructuralDiscoveryCycleError | DagTraversalStallError
>();
