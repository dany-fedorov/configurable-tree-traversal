import { createVertexIdLabeler } from '@core/graph/identity';

/** A structural child cycle discovered by a DAG source, not a milestone SCC. */
export class DagDiscoveryCycleError<ID = unknown> extends Error {
  /** Ordered closed cycle witness. IDs retain caller identity. */
  readonly vertexIds: readonly ID[];

  constructor(vertexIds: readonly ID[]) {
    super(
      `Discovery cycle detected: ${vertexIds
        .map(createVertexIdLabeler())
        .join(' -> ')}`,
    );
    this.name = 'DagDiscoveryCycleError';
    this.vertexIds = Object.freeze(vertexIds.slice());
  }
}
