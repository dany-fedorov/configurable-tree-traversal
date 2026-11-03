import {
  assertOwnKeys,
  assertOptionalCallbacks,
  captureOptionFields,
} from '@core/assertPublicOptions';
import type { FoundDagSourceVertex } from '@core/TraversableTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { MaybePromise } from '@core/graph/types';
import type {
  SyncOrAsyncIterable,
  MaterializedDagTraversalInput,
} from './types';

export type MaterializedRecord<Item, VertexId> = {
  item: Item;
  id: VertexId;
  children: VertexId[];
  workWaitsForWorkOf: VertexId[];
  workWaitsForSubgraphCompletionOf: VertexId[];
};

export async function collect<Item>(
  items: MaybePromise<SyncOrAsyncIterable<Item>>,
): Promise<Item[]> {
  const result: Item[] = [];
  for await (const item of await items) result.push(item);
  return result;
}

/** Private records never escape: every lookup returns fresh topology arrays. */
export function materializedSource<Item, VertexId>(
  records: Map<VertexId, MaterializedRecord<Item, VertexId>>,
  roots: VertexId[],
): MaterializedDagTraversalInput<Item, VertexId> {
  type SourceVertexTypes = VertexDataAndChildHintTypes<Item, VertexId>;
  const vertexResolved = (
    record: MaterializedRecord<Item, VertexId>,
  ): FoundDagSourceVertex<SourceVertexTypes, VertexId> => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexId: record.id,
      vertexContentInput: {
        $vertexData: record.item,
        $childDiscoveryHints: [...record.children],
      },
      workWaitsForWorkOf: [...record.workWaitsForWorkOf],
      workWaitsForSubgraphCompletionOf: [
        ...record.workWaitsForSubgraphCompletionOf,
      ],
    },
  });
  // The traversal replaces the holder identity and hides its data in public views.
  const holder = Symbol('collection root') as VertexId;
  return {
    sourceRootIsHiddenEntryHolder: true,
    dagDiscoverySource: {
      resolveRootVertex: () =>
        vertexResolved({
          item: undefined as Item,
          id: holder,
          children: roots,
          workWaitsForWorkOf: [],
          workWaitsForSubgraphCompletionOf: [],
        }),
      resolveChildHint: (id: VertexId) => {
        const record = records.get(id);
        if (record === undefined)
          throw new TypeError('Structural child is absent from the collection');
        return vertexResolved(record);
      },
      tryGetVertexIdentityFromHint: (vertexId) => ({ vertexId }),
      resolvePrerequisiteByVertexId: (id) => {
        const record = records.get(id);
        return record === undefined
          ? { kind: 'missing' }
          : vertexResolved(record);
      },
    },
  };
}

export function validateChildren<Item, VertexId>(
  records: Map<VertexId, MaterializedRecord<Item, VertexId>>,
): void {
  for (const record of records.values()) {
    for (const child of record.children) {
      if (!records.has(child))
        throw new TypeError('Structural child is absent from the collection');
    }
  }
}

/** Validate before catalog reads; keep structural lookups and caller receivers. */
export function captureCollectionSelectors<
  ChildSelector extends
    | 'selectStructuralChildVertexIds'
    | 'selectStructuralChildRecords',
  Selectors extends {
    selectVertexId: unknown;
    selectWorkPrerequisiteVertexIds?: unknown;
    selectSubgraphCompletionPrerequisiteVertexIds?: unknown;
  } & Partial<Record<ChildSelector, unknown>>,
>(selectors: Selectors, childSelector: ChildSelector) {
  const keys = [
    'selectVertexId',
    childSelector,
    'selectWorkPrerequisiteVertexIds',
    'selectSubgraphCompletionPrerequisiteVertexIds',
  ] as const;
  assertOwnKeys(selectors, keys);
  for (const key of ['dependencies', 'completionDependencies']) {
    if (key in selectors)
      throw new TypeError(
        'Use selectWorkPrerequisiteVertexIds and selectSubgraphCompletionPrerequisiteVertexIds selectors',
      );
  }
  const captured = captureOptionFields(selectors, keys);
  assertOptionalCallbacks(captured, keys);
  if (typeof captured.selectVertexId !== 'function')
    throw new TypeError('Selectors require selectVertexId');
  return captured;
}
