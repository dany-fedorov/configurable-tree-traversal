import type { TraversableGraph } from '@core/TraversableGraph';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { MaybePromise } from '@core/graph/types';

/** Materialized sources can be spread into ordinary DAG traversal options. */
export type CollectionSource<Item, ID> = {
  traversableGraph: TraversableGraph<
    TreeTypeParameters<Item, ID>,
    TreeTypeParameters<Item, ID>,
    ID
  >;
  syntheticRoot: true;
};

export type GraphSelectors<Item, ID> = {
  id(item: Item): ID;
  children?(item: Item): Iterable<ID>;
  dependencies?(item: Item): Iterable<ID>;
  completionDependencies?(item: Item): Iterable<ID>;
};

export type ForestSelectors<Item, ID> = Omit<
  GraphSelectors<Item, ID>,
  'children'
> & {
  children?(item: Item): Iterable<Item>;
};

export type AsyncCollection<Item> = Iterable<Item> | AsyncIterable<Item>;

export type AsyncGraphSelectors<Item, ID> = {
  id(item: Item): MaybePromise<ID>;
  children?(item: Item): MaybePromise<AsyncCollection<ID>>;
  dependencies?(item: Item): MaybePromise<AsyncCollection<ID>>;
  completionDependencies?(item: Item): MaybePromise<AsyncCollection<ID>>;
};

export type AsyncForestSelectors<Item, ID> = Omit<
  AsyncGraphSelectors<Item, ID>,
  'children'
> & {
  children?(item: Item): MaybePromise<AsyncCollection<Item>>;
};
