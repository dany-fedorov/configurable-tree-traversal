import type { DagDependencyMilestone } from '@core/errors/DagTraversalStallError';
import type { DagDefinition } from './DagDefinition';

/** Closed local topology with string-named live-vertex ports. */
export type DagFragment<
  Data,
  ID = unknown,
  Port extends string = string,
> = Readonly<{
  definition: DagDefinition<Data, ID>;
  ports: Readonly<Record<Port, ID>>;
}>;

export type DagFragmentInstance<
  Data,
  ID = unknown,
  Port extends string = string,
> = DagFragment<Data, ID, Port>;

export type DagCompositionOptions<ID = unknown> = {
  readonly dependencies?: readonly {
    readonly dependent: ID;
    readonly prerequisite: DagDependencyMilestone<ID>;
  }[];
  readonly children?: readonly { readonly parent: ID; readonly child: ID }[];
};

/** @internal Prevent wire/port values widening the inferred identity domain (TS 4.7). */
export type InferredDagId<ID> = [ID][ID extends unknown ? 0 : never];
