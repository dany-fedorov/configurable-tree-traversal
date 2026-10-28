import {
  assertOwnKeys,
  assertOptionalCallbacks,
  captureOptionFields,
} from '@core/assertPublicOptions';
import type { MaybePromise } from '@core/graph/types';
import type { GraphWalkSource } from './GraphWalkSource';

/** Catalog relations identify endpoints; lazy walking links wrap targets. */
export type GraphWalkCatalogLink<Edge, ID> = Readonly<{ to: ID; data: Edge }>;

export interface GraphWalkRecordSelectors<Data, Edge, ID> {
  id(item: Data): ID;
  outgoing(item: Data): Iterable<GraphWalkCatalogLink<Edge, ID>>;
  roots: Iterable<ID>;
}

export interface AsyncGraphWalkRecordSelectors<Data, Edge, ID> {
  id(item: Data): MaybePromise<ID>;
  outgoing(
    item: Data,
  ): MaybePromise<
    | Iterable<GraphWalkCatalogLink<Edge, ID>>
    | AsyncIterable<GraphWalkCatalogLink<Edge, ID>>
  >;
  roots: Iterable<ID> | AsyncIterable<ID>;
}
type CatalogRecord<Data, Edge, ID> = {
  data: Data;
  links: GraphWalkCatalogLink<Edge, ID>[];
};

function materializedSource<Data, Edge, ID>(
  records: Map<ID, CatalogRecord<Data, Edge, ID>>,
  roots: ID[],
): Extract<GraphWalkSource<Data, Edge, ID>, { hydration: 'resolver' }> {
  const lookup = (id: ID): CatalogRecord<Data, Edge, ID> => {
    const record = records.get(id);
    if (record === undefined) throw new TypeError('Unknown walking vertex ID');
    return record;
  };
  for (const id of roots) lookup(id);
  for (const record of records.values())
    for (const link of record.links) lookup(link.to);
  return {
    hydration: 'resolver',
    roots: () => roots.map((vertexId) => ({ vertexId })),
    resolveVertex: (vertexId) => ({
      kind: 'found',
      data: lookup(vertexId).data,
    }),
    outgoing: (vertex) =>
      lookup(vertex.vertexId).links.map((link) => ({
        target: { vertexId: link.to },
        data: link.data,
      })),
  };
}

/** Eagerly copy a finite catalog's topology, retaining caller data and IDs. */
export function materializeWalkSourceFromRecords<Data, Edge, ID>(
  items: Iterable<Data>,
  options: GraphWalkRecordSelectors<Data, Edge, ID>,
): Extract<GraphWalkSource<Data, Edge, ID>, { hydration: 'resolver' }> {
  assertOwnKeys(options, ['id', 'outgoing', 'roots']);
  const captured = captureOptionFields(options, ['id', 'outgoing', 'roots']);
  assertOptionalCallbacks(captured, ['id', 'outgoing']);
  if (
    typeof captured.id !== 'function' ||
    typeof captured.outgoing !== 'function'
  )
    throw new TypeError('Walking selectors require id/outgoing');
  const records = new Map<ID, CatalogRecord<Data, Edge, ID>>();
  for (const item of items) {
    const id = captured.id.call(options, item);
    if (records.has(id)) throw new TypeError('Duplicate walking vertex ID');
    records.set(id, {
      data: item,
      links: Array.from(captured.outgoing.call(options, item), (link) => ({
        to: link.to,
        data: link.data,
      })),
    });
  }
  return materializedSource(records, [...captured.roots]);
}

/** Await finite inputs once and return a reusable synchronous walking source. */
export async function materializeWalkSourceFromRecordsAsync<Data, Edge, ID>(
  items: Iterable<Data> | AsyncIterable<Data>,
  options: AsyncGraphWalkRecordSelectors<Data, Edge, ID>,
): Promise<
  Extract<GraphWalkSource<Data, Edge, ID>, { hydration: 'resolver' }>
> {
  assertOwnKeys(options, ['id', 'outgoing', 'roots']);
  const captured = captureOptionFields(options, ['id', 'outgoing', 'roots']);
  assertOptionalCallbacks(captured, ['id', 'outgoing']);
  if (
    typeof captured.id !== 'function' ||
    typeof captured.outgoing !== 'function'
  )
    throw new TypeError('Walking selectors require id/outgoing');
  const records = new Map<ID, CatalogRecord<Data, Edge, ID>>();
  for await (const item of items) {
    const id = await captured.id.call(options, item);
    if (records.has(id)) throw new TypeError('Duplicate walking vertex ID');
    const links: GraphWalkCatalogLink<Edge, ID>[] = [];
    for await (const link of await captured.outgoing.call(options, item))
      links.push({ to: link.to, data: link.data });
    records.set(id, { data: item, links });
  }
  const roots: ID[] = [];
  for await (const id of captured.roots) roots.push(id);
  return materializedSource(records, roots);
}
