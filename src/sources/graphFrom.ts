import {
  validateCollectionSelectors,
  collect,
  materializedSource,
  validateChildren,
} from './materialize';
import type { MaterializedRecord } from './materialize';
import type {
  AsyncCollection,
  AsyncGraphSelectors,
  CollectionSource,
  GraphSelectors,
} from './types';

/** Copy a finite catalog's topology while retaining each item and ID by identity. */
export function graphFrom<Item, ID>(
  items: Iterable<Item>,
  selectors: GraphSelectors<Item, ID>,
): CollectionSource<Item, ID> {
  validateCollectionSelectors(selectors);
  const records = new Map<ID, MaterializedRecord<Item, ID>>();
  for (const item of items) {
    const id = selectors.id(item);
    if (records.has(id)) throw new TypeError('Duplicate collection vertex ID');
    records.set(id, {
      item,
      id,
      children: [...(selectors.children?.(item) ?? [])],
      dependsOn: [...(selectors.dependsOn?.(item) ?? [])],
      dependsOnComplete: [...(selectors.dependsOnComplete?.(item) ?? [])],
    });
  }
  validateChildren(records);
  return materializedSource(records, [...records.keys()]);
}

/** Await finite catalogs/selectors once, returning an ordinary synchronous source. */
export async function graphFromAsync<Item, ID>(
  items: AsyncCollection<Item>,
  selectors: AsyncGraphSelectors<Item, ID>,
): Promise<CollectionSource<Item, ID>> {
  validateCollectionSelectors(selectors);
  const records = new Map<ID, MaterializedRecord<Item, ID>>();
  for await (const item of items) {
    const id = await selectors.id(item);
    if (records.has(id)) throw new TypeError('Duplicate collection vertex ID');
    records.set(id, {
      item,
      id,
      children: await collect(selectors.children?.(item) ?? []),
      dependsOn: await collect(selectors.dependsOn?.(item) ?? []),
      dependsOnComplete: await collect(
        selectors.dependsOnComplete?.(item) ?? [],
      ),
    });
  }
  validateChildren(records);
  return materializedSource(records, [...records.keys()]);
}
