import type { DagDiscoverySource } from '@core/TraversableGraph';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { MaybePromise } from '@core/graph/types';

/** Materialized sources can be spread into ordinary DAG traversal options. */
export type MaterializedDagSource<Item, ID> = {
  traversableGraph: DagDiscoverySource<
    VertexTypes<Item, ID>,
    VertexTypes<Item, ID>,
    ID
  >;
  syntheticRoot: true;
};

export type DagRecordSelectors<Item, ID> = {
  id(item: Item): ID;
  children?(item: Item): Iterable<ID>;
  dependsOn?(item: Item): Iterable<ID>;
  dependsOnComplete?(item: Item): Iterable<ID>;
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
  dependsOn?(item: Item): MaybePromise<AsyncCollection<ID>>;
  dependsOnComplete?(item: Item): MaybePromise<AsyncCollection<ID>>;
};

export type AsyncDagRootSelectors<Item, ID> = Omit<
  AsyncDagRecordSelectors<Item, ID>,
  'children'
> & {
  children?(item: Item): MaybePromise<AsyncCollection<Item>>;
};
