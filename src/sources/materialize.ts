import type { DagVertexFound } from '@core/TraversableTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { MaybePromise } from '@core/graph/types';
import type { AsyncCollection, MaterializedDagSource } from './types';

export type MaterializedRecord<Item, ID> = {
  item: Item;
  id: ID;
  children: ID[];
  dependsOnWork: ID[];
  dependsOnSubgraphCompletion: ID[];
};

export async function collect<Item>(
  items: MaybePromise<AsyncCollection<Item>>,
): Promise<Item[]> {
  const result: Item[] = [];
  for await (const item of await items) result.push(item);
  return result;
}

/** Private records never escape: every lookup returns fresh topology arrays. */
export function materializedSource<Item, ID>(
  records: Map<ID, MaterializedRecord<Item, ID>>,
  roots: ID[],
): MaterializedDagSource<Item, ID> {
  type T = VertexTypes<Item, ID>;
  const found = (
    record: MaterializedRecord<Item, ID>,
  ): DagVertexFound<T, ID> => ({
    kind: 'found',
    vertex: {
      vertexId: record.id,
      vertexContent: { $data: record.item, $childHints: [...record.children] },
      dependsOnWork: [...record.dependsOnWork],
      dependsOnSubgraphCompletion: [...record.dependsOnSubgraphCompletion],
    },
  });
  // The traversal replaces the holder identity and hides its data in public views.
  const holder = Symbol('collection root') as ID;
  return {
    syntheticRoot: true,
    traversableGraph: {
      resolveRoot: () =>
        found({
          item: undefined as Item,
          id: holder,
          children: roots,
          dependsOnWork: [],
          dependsOnSubgraphCompletion: [],
        }),
      resolveChild: (id) => {
        const record = records.get(id);
        if (record === undefined)
          throw new TypeError('Structural child is absent from the collection');
        return found(record);
      },
      getVertexIdFromHint: (vertexId) => ({ vertexId }),
      resolvePrerequisite: (id) => {
        const record = records.get(id);
        return record === undefined ? { kind: 'missing' } : found(record);
      },
    },
  };
}

export function validateChildren<Item, ID>(
  records: Map<ID, MaterializedRecord<Item, ID>>,
): void {
  for (const record of records.values()) {
    for (const child of record.children) {
      if (!records.has(child))
        throw new TypeError('Structural child is absent from the collection');
    }
  }
}

/** Reject retired selector names before reading the catalog or invoking callbacks. */
export function validateCollectionSelectors(selectors: object): void {
  for (const key of ['dependencies', 'completionDependencies']) {
    if (key in selectors)
      throw new TypeError('Use dependsOnWork and dependsOnSubgraphCompletion selectors');
  }
}
