import type { MaybePromise } from '@core/graph/types';
import type { GraphWalkSource } from './GraphWalkSource';

type CatalogLink<Edge, ID> = { to: ID; data: Edge };
type CatalogRecord<Data, Edge, ID> = {
  data: Data;
  links: CatalogLink<Edge, ID>[];
};

function materializedSource<Data, Edge, ID>(
  records: Map<ID, CatalogRecord<Data, Edge, ID>>,
  roots: ID[],
): GraphWalkSource<Data, Edge, ID> {
  const lookup = (id: ID): CatalogRecord<Data, Edge, ID> => {
    const record = records.get(id);
    if (record === undefined) throw new TypeError('Unknown walking vertex ID');
    return record;
  };
  for (const id of roots) lookup(id);
  for (const record of records.values())
    for (const link of record.links) lookup(link.to);
  return {
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
export function walkSourceFrom<Data, Edge, ID>(
  items: Iterable<Data>,
  options: {
    id(item: Data): ID;
    outgoing(item: Data): Iterable<{ to: ID; data: Edge }>;
    roots: Iterable<ID>;
  },
): GraphWalkSource<Data, Edge, ID> {
  const records = new Map<ID, CatalogRecord<Data, Edge, ID>>();
  for (const item of items) {
    const id = options.id(item);
    if (records.has(id)) throw new TypeError('Duplicate walking vertex ID');
    records.set(id, {
      data: item,
      links: Array.from(options.outgoing(item), (link) => ({
        to: link.to,
        data: link.data,
      })),
    });
  }
  return materializedSource(records, [...options.roots]);
}

/** Await finite inputs once and return a reusable synchronous walking source. */
export async function walkSourceFromAsync<Data, Edge, ID>(
  items: Iterable<Data> | AsyncIterable<Data>,
  options: {
    id(item: Data): MaybePromise<ID>;
    outgoing(
      item: Data,
    ): MaybePromise<
      Iterable<{ to: ID; data: Edge }> | AsyncIterable<{ to: ID; data: Edge }>
    >;
    roots: Iterable<ID> | AsyncIterable<ID>;
  },
): Promise<GraphWalkSource<Data, Edge, ID>> {
  const records = new Map<ID, CatalogRecord<Data, Edge, ID>>();
  for await (const item of items) {
    const id = await options.id(item);
    if (records.has(id)) throw new TypeError('Duplicate walking vertex ID');
    const links: CatalogLink<Edge, ID>[] = [];
    for await (const link of await options.outgoing(item))
      links.push({ to: link.to, data: link.data });
    records.set(id, { data: item, links });
  }
  const roots: ID[] = [];
  for await (const id of options.roots) roots.push(id);
  return materializedSource(records, roots);
}
