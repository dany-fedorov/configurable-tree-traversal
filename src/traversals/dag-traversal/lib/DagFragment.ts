import type { DagMilestone } from '@core/errors/DagTraversalStallError';
import type { DagDefinition } from './DagDefinition';

/** Closed local topology with string-named live-vertex ports. */
export type DagFragment<
  Data,
  VertexId = unknown,
  Port extends string = string,
> = Readonly<{
  definition: DagDefinition<Data, VertexId>;
  vertexIdsByPortName: Readonly<Record<Port, VertexId>>;
}>;

export type DagCompositionOptions<VertexId = unknown> = {
  readonly additionalWorkPrerequisites?: readonly {
    readonly dependentWorkVertexId: VertexId;
    readonly prerequisite: DagMilestone<VertexId>;
  }[];
  readonly additionalStructuralChildLinks?: readonly {
    readonly parentVertexId: VertexId;
    readonly childVertexId: VertexId;
  }[];
};

/** @internal Prevent wire/port values widening the inferred identity domain (TS 4.7). */
export type InferredDagId<VertexId> = [VertexId][VertexId extends unknown
  ? 0
  : never];
