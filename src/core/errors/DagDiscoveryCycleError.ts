import { createVertexIdLabeler } from '@core/graph/identity';

/** A structural child cycle discovered by a DAG source, not a milestone SCC. */
export class DagStructuralDiscoveryCycleError<
  VertexId = unknown,
> extends Error {
  /** Ordered closed cycle witness. IDs retain caller identity. */
  readonly cycleWitnessVertexIds: readonly VertexId[];

  constructor(cycleWitnessVertexIds: readonly VertexId[]) {
    super(
      `Discovery cycle detected: ${cycleWitnessVertexIds
        .map(createVertexIdLabeler())
        .join(' -> ')}`,
    );
    this.name = 'DagStructuralDiscoveryCycleError';
    this.cycleWitnessVertexIds = Object.freeze(cycleWitnessVertexIds.slice());
  }
}
