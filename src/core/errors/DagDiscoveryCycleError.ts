import { createVertexIdLabeler } from '@core/graph/identity';

/** A structural child cycle discovered by a DAG source, not a milestone SCC. */
export class DagDiscoveryCycleError<ID = unknown> extends Error {
  /** Ordered closed cycle witness. IDs retain caller identity. */
  readonly cycleWitnessVertexIds: readonly ID[];

  constructor(cycleWitnessVertexIds: readonly ID[]) {
    super(
      `Discovery cycle detected: ${cycleWitnessVertexIds
        .map(createVertexIdLabeler())
        .join(' -> ')}`,
    );
    this.name = 'DagDiscoveryCycleError';
    this.cycleWitnessVertexIds = Object.freeze(cycleWitnessVertexIds.slice());
  }
}
