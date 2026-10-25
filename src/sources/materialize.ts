import type { FoundVertexResult } from '@core/TraversableTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { MaybePromise } from '@core/graph/types';
import type { AsyncCollection, CollectionSource } from './types';

export type MaterializedRecord<Item, ID> = {
  item: Item;
  id: ID;
  children: ID[];
  dependencies: ID[];
  completionDependencies: ID[];
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
): CollectionSource<Item, ID> {
  type T = TreeTypeParameters<Item, ID>;
  const found = (
    record: MaterializedRecord<Item, ID>,
  ): FoundVertexResult<T, ID> => ({
    kind: 'found',
    vertex: {
      vertexId: record.id,
      vertexContent: { $data: record.item, $childHints: [...record.children] },
      dependsOn: [...record.dependencies],
      dependsOnComplete: [...record.completionDependencies],
    },
  });
  // The traversal replaces the holder identity and hides its data in public views.
  const holder = Symbol('collection root') as ID;
  return {
    syntheticRoot: true,
    traversableGraph: {
      makeRoot: () =>
        found({
          item: undefined as Item,
          id: holder,
          children: roots,
          dependencies: [],
          completionDependencies: [],
        }),
      makeVertex: (id) => {
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
