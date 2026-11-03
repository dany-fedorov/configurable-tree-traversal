import type {
  DagDiscoverySource,
  DagChildResolutionContext,
} from '@core/TraversableGraph';
import type { DagSourceVertexResolution } from '@core/TraversableTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { MaybePromise } from '@core/graph/types';

/** Materialized input envelopes can be spread into ordinary DAG traversal options. */
export type MaterializedDagTraversalInput<Item, VertexId> = {
  dagDiscoverySource: {
    /** Captured catalog lookup accepts any rewritten live-data domain. */
    resolveChildHint: <
      RewrittenVertexTypes extends VertexDataAndChildHintTypes,
    >(
      hint: VertexId,
      context: DagChildResolutionContext<
        VertexDataAndChildHintTypes<Item, VertexId>,
        RewrittenVertexTypes,
        VertexId
      >,
    ) => DagSourceVertexResolution<
      VertexDataAndChildHintTypes<Item, VertexId>,
      VertexId
    >;
  } & DagDiscoverySource<
    // Keep the input specialization last for ordinary TypeScript 4.x inference.
    VertexDataAndChildHintTypes<Item, VertexId>,
    VertexDataAndChildHintTypes<Item, VertexId>,
    VertexId
  >;
  sourceRootIsHiddenEntryHolder: true;
};

export type DagRecordSelectors<Item, VertexId> = {
  selectVertexId(item: Item): VertexId;
  selectStructuralChildVertexIds?(item: Item): Iterable<VertexId>;
  selectWorkPrerequisiteVertexIds?(item: Item): Iterable<VertexId>;
  selectSubgraphCompletionPrerequisiteVertexIds?(
    item: Item,
  ): Iterable<VertexId>;
};

export type DagRootRecordSelectors<Item, VertexId> = Omit<
  DagRecordSelectors<Item, VertexId>,
  'selectStructuralChildVertexIds'
> & {
  selectStructuralChildRecords?(item: Item): Iterable<Item>;
};

export type SyncOrAsyncIterable<Item> = Iterable<Item> | AsyncIterable<Item>;

export type AsyncDagRecordSelectors<Item, VertexId> = {
  selectVertexId(item: Item): MaybePromise<VertexId>;
  selectStructuralChildVertexIds?(
    item: Item,
  ): MaybePromise<SyncOrAsyncIterable<VertexId>>;
  selectWorkPrerequisiteVertexIds?(
    item: Item,
  ): MaybePromise<SyncOrAsyncIterable<VertexId>>;
  selectSubgraphCompletionPrerequisiteVertexIds?(
    item: Item,
  ): MaybePromise<SyncOrAsyncIterable<VertexId>>;
};

export type AsyncDagRootRecordSelectors<Item, VertexId> = Omit<
  AsyncDagRecordSelectors<Item, VertexId>,
  'selectStructuralChildVertexIds'
> & {
  selectStructuralChildRecords?(
    item: Item,
  ): MaybePromise<SyncOrAsyncIterable<Item>>;
};
