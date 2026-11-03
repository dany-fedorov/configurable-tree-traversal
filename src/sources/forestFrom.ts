import {
  captureCollectionSelectors,
  collect,
  materializedSource,
} from './materialize';
import type { MaterializedRecord } from './materialize';
import type {
  SyncOrAsyncIterable,
  AsyncDagRootRecordSelectors,
  MaterializedDagTraversalInput,
  DagRootRecordSelectors,
} from './types';

/** Expand finite forests iteratively; repeated references share one vertex. */
export function materializeDagInputFromRootRecords<Item, VertexId>(
  roots: Iterable<Item>,
  selectors: DagRootRecordSelectors<Item, VertexId>,
): MaterializedDagTraversalInput<Item, VertexId> {
  const captured = captureCollectionSelectors(
    selectors,
    'selectStructuralChildRecords',
  );
  const identities = new Map<Item, VertexId>();
  const owners = new Map<VertexId, Item>();
  const queue: Item[] = [];
  const discover = (item: Item): VertexId => {
    if (identities.has(item)) return identities.get(item)!;
    const id = captured.selectVertexId.call(selectors, item);
    if (owners.has(id))
      throw new TypeError('Different forest records share a vertex ID');
    identities.set(item, id);
    owners.set(id, item);
    queue.push(item);
    return id;
  };
  const rootIds = Array.from(roots, discover);
  const records = new Map<VertexId, MaterializedRecord<Item, VertexId>>();
  for (let index = 0; index < queue.length; index++) {
    const item = queue[index]!;
    const id = identities.get(item)!;
    records.set(id, {
      item,
      id,
      children: Array.from(
        captured.selectStructuralChildRecords?.call(selectors, item) ?? [],
        discover,
      ),
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
  return materializedSource(records, [...new Set(rootIds)]);
}

/** Async forest discovery retains the same sharing and topology-copying rules. */
export async function materializeDagInputFromRootRecordsAsync<Item, VertexId>(
  roots: SyncOrAsyncIterable<Item>,
  selectors: AsyncDagRootRecordSelectors<Item, VertexId>,
): Promise<MaterializedDagTraversalInput<Item, VertexId>> {
  const captured = captureCollectionSelectors(
    selectors,
    'selectStructuralChildRecords',
  );
  const identities = new Map<Item, VertexId>();
  const owners = new Map<VertexId, Item>();
  const queue: Item[] = [];
  const discover = async (item: Item): Promise<VertexId> => {
    if (identities.has(item)) return identities.get(item)!;
    const id = await captured.selectVertexId.call(selectors, item);
    if (owners.has(id))
      throw new TypeError('Different forest records share a vertex ID');
    identities.set(item, id);
    owners.set(id, item);
    queue.push(item);
    return id;
  };
  const rootIds: VertexId[] = [];
  for await (const item of roots) rootIds.push(await discover(item));
  const records = new Map<VertexId, MaterializedRecord<Item, VertexId>>();
  for (let index = 0; index < queue.length; index++) {
    const item = queue[index]!;
    const id = identities.get(item)!;
    const children: VertexId[] = [];
    for (const child of await collect(
      captured.selectStructuralChildRecords?.call(selectors, item) ?? [],
    ))
      children.push(await discover(child));
    records.set(id, {
      item,
      id,
      children,
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
  return materializedSource(records, [...new Set(rootIds)]);
}
