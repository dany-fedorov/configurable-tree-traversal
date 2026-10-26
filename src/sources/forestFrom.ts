import {
  validateCollectionSelectors,
  collect,
  materializedSource,
} from './materialize';
import type { MaterializedRecord } from './materialize';
import type {
  AsyncCollection,
  AsyncDagRootSelectors,
  MaterializedDagSource,
  DagRootSelectors,
} from './types';

/** Expand finite forests iteratively; repeated references share one vertex. */
export function materializeDagSourceFromRoots<Item, ID>(
  roots: Iterable<Item>,
  selectors: DagRootSelectors<Item, ID>,
): MaterializedDagSource<Item, ID> {
  validateCollectionSelectors(selectors);
  const identities = new Map<Item, ID>();
  const owners = new Map<ID, Item>();
  const queue: Item[] = [];
  const discover = (item: Item): ID => {
    if (identities.has(item)) return identities.get(item)!;
    const id = selectors.id(item);
    if (owners.has(id))
      throw new TypeError('Different forest records share a vertex ID');
    identities.set(item, id);
    owners.set(id, item);
    queue.push(item);
    return id;
  };
  const rootIds = Array.from(roots, discover);
  const records = new Map<ID, MaterializedRecord<Item, ID>>();
  for (let index = 0; index < queue.length; index++) {
    const item = queue[index]!;
    const id = identities.get(item)!;
    records.set(id, {
      item,
      id,
      children: Array.from(selectors.children?.(item) ?? [], discover),
      dependsOnWork: [...(selectors.dependsOnWork?.(item) ?? [])],
      dependsOnSubgraphCompletion: [...(selectors.dependsOnSubgraphCompletion?.(item) ?? [])],
    });
  }
  return materializedSource(records, [...new Set(rootIds)]);
}

/** Async forest discovery retains the same sharing and topology-copying rules. */
export async function materializeDagSourceFromRootsAsync<Item, ID>(
  roots: AsyncCollection<Item>,
  selectors: AsyncDagRootSelectors<Item, ID>,
): Promise<MaterializedDagSource<Item, ID>> {
  validateCollectionSelectors(selectors);
  const identities = new Map<Item, ID>();
  const owners = new Map<ID, Item>();
  const queue: Item[] = [];
  const discover = async (item: Item): Promise<ID> => {
    if (identities.has(item)) return identities.get(item)!;
    const id = await selectors.id(item);
    if (owners.has(id))
      throw new TypeError('Different forest records share a vertex ID');
    identities.set(item, id);
    owners.set(id, item);
    queue.push(item);
    return id;
  };
  const rootIds: ID[] = [];
  for await (const item of roots) rootIds.push(await discover(item));
  const records = new Map<ID, MaterializedRecord<Item, ID>>();
  for (let index = 0; index < queue.length; index++) {
    const item = queue[index]!;
    const id = identities.get(item)!;
    const children: ID[] = [];
    for (const child of await collect(selectors.children?.(item) ?? []))
      children.push(await discover(child));
    records.set(id, {
      item,
      id,
      children,
      dependsOnWork: await collect(selectors.dependsOnWork?.(item) ?? []),
      dependsOnSubgraphCompletion: await collect(
        selectors.dependsOnSubgraphCompletion?.(item) ?? [],
      ),
    });
  }
  return materializedSource(records, [...new Set(rootIds)]);
}
