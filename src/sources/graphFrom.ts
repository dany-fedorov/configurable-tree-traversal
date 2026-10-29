import {
  captureCollectionSelectors,
  collect,
  materializedSource,
  validateChildren,
} from './materialize';
import type { MaterializedRecord } from './materialize';
import type {
  AsyncCollection,
  AsyncDagRecordSelectors,
  MaterializedDagInput,
  DagRecordSelectors,
} from './types';

/** Copy a finite catalog's topology while retaining each item and ID by identity. */
export function materializeDagInputFromRecords<Item, ID>(
  items: Iterable<Item>,
  selectors: DagRecordSelectors<Item, ID>,
): MaterializedDagInput<Item, ID> {
  const captured = captureCollectionSelectors(selectors);
  const records = new Map<ID, MaterializedRecord<Item, ID>>();
  for (const item of items) {
    const id = captured.id.call(selectors, item);
    if (records.has(id)) throw new TypeError('Duplicate collection vertex ID');
    records.set(id, {
      item,
      id,
      children: [...(captured.children?.call(selectors, item) ?? [])],
      dependsOnWork: [...(captured.dependsOnWork?.call(selectors, item) ?? [])],
      dependsOnSubgraphCompletion: [
        ...(captured.dependsOnSubgraphCompletion?.call(selectors, item) ?? []),
      ],
    });
  }
  validateChildren(records);
  return materializedSource(records, [...records.keys()]);
}

/** Await finite catalogs/selectors once, returning an input envelope with a synchronous source. */
export async function materializeDagInputFromRecordsAsync<Item, ID>(
  items: AsyncCollection<Item>,
  selectors: AsyncDagRecordSelectors<Item, ID>,
): Promise<MaterializedDagInput<Item, ID>> {
  const captured = captureCollectionSelectors(selectors);
  const records = new Map<ID, MaterializedRecord<Item, ID>>();
  for await (const item of items) {
    const id = await captured.id.call(selectors, item);
    if (records.has(id)) throw new TypeError('Duplicate collection vertex ID');
    records.set(id, {
      item,
      id,
      children: await collect(captured.children?.call(selectors, item) ?? []),
      dependsOnWork: await collect(
        captured.dependsOnWork?.call(selectors, item) ?? [],
      ),
      dependsOnSubgraphCompletion: await collect(
        captured.dependsOnSubgraphCompletion?.call(selectors, item) ?? [],
      ),
    });
  }
  validateChildren(records);
  return materializedSource(records, [...records.keys()]);
}
