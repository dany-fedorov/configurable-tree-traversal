import type {
  DagDiscoverySource,
  DagChildResolutionContext,
} from '@core/TraversableGraph';
import type { DagVertexResolution } from '@core/TraversableTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { MaybePromise } from '@core/graph/types';

/** Materialized input envelopes can be spread into ordinary DAG traversal options. */
export type MaterializedDagInput<Item, ID> = {
  traversableGraph: {
    /** Captured catalog lookup accepts any rewritten live-data domain. */
    resolveChild: <R extends VertexTypes>(
      hint: ID,
      options: DagChildResolutionContext<VertexTypes<Item, ID>, R, ID>,
    ) => DagVertexResolution<VertexTypes<Item, ID>, ID>;
  } & DagDiscoverySource<
    // Keep the input specialization last for ordinary TypeScript 4.x inference.
    VertexTypes<Item, ID>,
    VertexTypes<Item, ID>,
    ID
  >;
  syntheticRoot: true;
};

export type DagRecordSelectors<Item, ID> = {
  id(item: Item): ID;
  children?(item: Item): Iterable<ID>;
  dependsOnWork?(item: Item): Iterable<ID>;
  dependsOnSubgraphCompletion?(item: Item): Iterable<ID>;
};

export type DagRootSelectors<Item, ID> = Omit<
  DagRecordSelectors<Item, ID>,
  'children'
> & {
  children?(item: Item): Iterable<Item>;
};

export type AsyncCollection<Item> = Iterable<Item> | AsyncIterable<Item>;

export type AsyncDagRecordSelectors<Item, ID> = {
  id(item: Item): MaybePromise<ID>;
  children?(item: Item): MaybePromise<AsyncCollection<ID>>;
  dependsOnWork?(item: Item): MaybePromise<AsyncCollection<ID>>;
  dependsOnSubgraphCompletion?(item: Item): MaybePromise<AsyncCollection<ID>>;
};

export type AsyncDagRootSelectors<Item, ID> = Omit<
  AsyncDagRecordSelectors<Item, ID>,
  'children'
> & {
  children?(item: Item): MaybePromise<AsyncCollection<Item>>;
};
