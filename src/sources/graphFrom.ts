import {
  captureCollectionSelectors,
  collect,
  materializedSource,
  validateChildren,
} from './materialize';
import type { MaterializedRecord } from './materialize';
import type {
  SyncOrAsyncIterable,
  AsyncDagRecordSelectors,
  MaterializedDagTraversalInput,
  DagRecordSelectors,
} from './types';

/** Copy a finite catalog's topology while retaining each item and ID by identity. */
export function materializeMultiEntryDagInputFromRecordCatalog<Item, VertexId>(
  items: Iterable<Item>,
  selectors: DagRecordSelectors<Item, VertexId>,
): MaterializedDagTraversalInput<Item, VertexId> {
  const captured = captureCollectionSelectors(
    selectors,
    'selectStructuralChildVertexIds',
  );
  const records = new Map<VertexId, MaterializedRecord<Item, VertexId>>();
  for (const item of items) {
    const id = captured.selectVertexId.call(selectors, item);
    if (records.has(id)) throw new TypeError('Duplicate collection vertex ID');
    records.set(id, {
      item,
      id,
      children: [
        ...(captured.selectStructuralChildVertexIds?.call(selectors, item) ??
          []),
      ],
      workWaitsForWorkOf: [
        ...(captured.selectWorkPrerequisiteVertexIds?.call(selectors, item) ??
          []),
      ],
      workWaitsForSubgraphCompletionOf: [
        ...(captured.selectSubgraphCompletionPrerequisiteVertexIds?.call(
          selectors,
          item,
        ) ?? []),
      ],
    });
  }
  validateChildren(records);
  return materializedSource(records, [...records.keys()]);
}

/** Await finite catalogs/selectors once, returning an input envelope with a synchronous source. */
export async function materializeMultiEntryDagInputFromRecordCatalogAsync<
  Item,
  VertexId,
>(
  items: SyncOrAsyncIterable<Item>,
  selectors: AsyncDagRecordSelectors<Item, VertexId>,
): Promise<MaterializedDagTraversalInput<Item, VertexId>> {
  const captured = captureCollectionSelectors(
    selectors,
    'selectStructuralChildVertexIds',
  );
  const records = new Map<VertexId, MaterializedRecord<Item, VertexId>>();
  for await (const item of items) {
    const id = await captured.selectVertexId.call(selectors, item);
    if (records.has(id)) throw new TypeError('Duplicate collection vertex ID');
    records.set(id, {
      item,
      id,
      children: await collect(
        captured.selectStructuralChildVertexIds?.call(selectors, item) ?? [],
      ),
      workWaitsForWorkOf: await collect(
        captured.selectWorkPrerequisiteVertexIds?.call(selectors, item) ?? [],
      ),
      workWaitsForSubgraphCompletionOf: await collect(
        captured.selectSubgraphCompletionPrerequisiteVertexIds?.call(
          selectors,
          item,
        ) ?? [],
      ),
    });
  }
  validateChildren(records);
  return materializedSource(records, [...records.keys()]);
}
