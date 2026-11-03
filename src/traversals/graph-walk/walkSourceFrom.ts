import {
  assertOwnKeys,
  assertOptionalCallbacks,
  captureOptionFields,
} from '@core/assertPublicOptions';
import type { MaybePromise } from '@core/graph/types';
import type { GraphWalkDiscoverySource } from './GraphWalkSource';

/** Catalog relations identify endpoints; lazy walking links wrap targets. */
export type GraphWalkCatalogOutgoingLinkToVertexId<EdgeData, VertexId> =
  Readonly<{ toVertexId: VertexId; edgeData: EdgeData }>;

export interface GraphWalkRecordMaterializationOptions<
  VertexData,
  EdgeData,
  VertexId,
> {
  getVertexId(vertexRecord: VertexData): VertexId;
  enumerateOutgoingLinks(
    vertexRecord: VertexData,
  ): Iterable<GraphWalkCatalogOutgoingLinkToVertexId<EdgeData, VertexId>>;
  rootVertexIds: Iterable<VertexId>;
}

export interface AsyncGraphWalkRecordMaterializationOptions<
  VertexData,
  EdgeData,
  VertexId,
> {
  getVertexId(vertexRecord: VertexData): MaybePromise<VertexId>;
  enumerateOutgoingLinks(
    vertexRecord: VertexData,
  ): MaybePromise<
    | Iterable<GraphWalkCatalogOutgoingLinkToVertexId<EdgeData, VertexId>>
    | AsyncIterable<GraphWalkCatalogOutgoingLinkToVertexId<EdgeData, VertexId>>
  >;
  rootVertexIds: Iterable<VertexId> | AsyncIterable<VertexId>;
}
type CatalogRecord<VertexData, EdgeData, VertexId> = {
  vertexData: VertexData;
  links: GraphWalkCatalogOutgoingLinkToVertexId<EdgeData, VertexId>[];
};

function materializedSource<VertexData, EdgeData, VertexId>(
  records: Map<VertexId, CatalogRecord<VertexData, EdgeData, VertexId>>,
  rootVertexIds: VertexId[],
): Extract<
  GraphWalkDiscoverySource<VertexData, EdgeData, VertexId>,
  { vertexResolutionMode: 'resolverWithOptionalInlineResolution' }
> {
  const lookup = (
    getVertexId: VertexId,
  ): CatalogRecord<VertexData, EdgeData, VertexId> => {
    const record = records.get(getVertexId);
    if (record === undefined) throw new TypeError('Unknown walking vertex ID');
    return record;
  };
  for (const getVertexId of rootVertexIds) lookup(getVertexId);
  for (const record of records.values())
    for (const link of record.links) lookup(link.toVertexId);
  return {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution',
    enumerateRootTargets: () => rootVertexIds.map((vertexId) => ({ vertexId })),
    resolveVertexDataById: (vertexId) => ({
      kind: 'found',
      vertexData: lookup(vertexId).vertexData,
    }),
    enumerateOutgoingLinks: (vertex) =>
      lookup(vertex.vertexId).links.map((link) => ({
        targetToResolveOnAdmission: { vertexId: link.toVertexId },
        edgeData: link.edgeData,
      })),
  };
}

/** Eagerly copy a finite catalog's topology, retaining caller edgeData and IDs. */
export function materializeGraphWalkSourceFromVertexRecords<
  VertexData,
  EdgeData,
  VertexId,
>(
  vertexRecords: Iterable<VertexData>,
  options: GraphWalkRecordMaterializationOptions<
    VertexData,
    EdgeData,
    VertexId
  >,
): Extract<
  GraphWalkDiscoverySource<VertexData, EdgeData, VertexId>,
  { vertexResolutionMode: 'resolverWithOptionalInlineResolution' }
> {
  assertOwnKeys(options, [
    'getVertexId',
    'enumerateOutgoingLinks',
    'rootVertexIds',
  ]);
  const captured = captureOptionFields(options, [
    'getVertexId',
    'enumerateOutgoingLinks',
    'rootVertexIds',
  ]);
  assertOptionalCallbacks(captured, ['getVertexId', 'enumerateOutgoingLinks']);
  if (
    typeof captured.getVertexId !== 'function' ||
    typeof captured.enumerateOutgoingLinks !== 'function'
  )
    throw new TypeError(
      'Walking selectors require getVertexId/enumerateOutgoingLinks',
    );
  const records = new Map<
    VertexId,
    CatalogRecord<VertexData, EdgeData, VertexId>
  >();
  for (const vertexRecord of vertexRecords) {
    const getVertexId = captured.getVertexId.call(options, vertexRecord);
    if (records.has(getVertexId))
      throw new TypeError('Duplicate walking vertex ID');
    records.set(getVertexId, {
      vertexData: vertexRecord,
      links: Array.from(
        captured.enumerateOutgoingLinks.call(options, vertexRecord),
        (link) => ({
          toVertexId: link.toVertexId,
          edgeData: link.edgeData,
        }),
      ),
    });
  }
  return materializedSource(records, [...captured.rootVertexIds]);
}

/** Await finite inputs once and return a reusable synchronous walking source. */
export async function materializeSynchronousGraphWalkSourceFromAsyncRecords<
  VertexData,
  EdgeData,
  VertexId,
>(
  vertexRecords: Iterable<VertexData> | AsyncIterable<VertexData>,
  options: AsyncGraphWalkRecordMaterializationOptions<
    VertexData,
    EdgeData,
    VertexId
  >,
): Promise<
  Extract<
    GraphWalkDiscoverySource<VertexData, EdgeData, VertexId>,
    { vertexResolutionMode: 'resolverWithOptionalInlineResolution' }
  >
> {
  assertOwnKeys(options, [
    'getVertexId',
    'enumerateOutgoingLinks',
    'rootVertexIds',
  ]);
  const captured = captureOptionFields(options, [
    'getVertexId',
    'enumerateOutgoingLinks',
    'rootVertexIds',
  ]);
  assertOptionalCallbacks(captured, ['getVertexId', 'enumerateOutgoingLinks']);
  if (
    typeof captured.getVertexId !== 'function' ||
    typeof captured.enumerateOutgoingLinks !== 'function'
  )
    throw new TypeError(
      'Walking selectors require getVertexId/enumerateOutgoingLinks',
    );
  const records = new Map<
    VertexId,
    CatalogRecord<VertexData, EdgeData, VertexId>
  >();
  for await (const vertexRecord of vertexRecords) {
    const getVertexId = await captured.getVertexId.call(options, vertexRecord);
    if (records.has(getVertexId))
      throw new TypeError('Duplicate walking vertex ID');
    const links: GraphWalkCatalogOutgoingLinkToVertexId<EdgeData, VertexId>[] =
      [];
    for await (const link of await captured.enumerateOutgoingLinks.call(
      options,
      vertexRecord,
    ))
      links.push({ toVertexId: link.toVertexId, edgeData: link.edgeData });
    records.set(getVertexId, { vertexData: vertexRecord, links });
  }
  const rootVertexIds: VertexId[] = [];
  for await (const getVertexId of captured.rootVertexIds)
    rootVertexIds.push(getVertexId);
  return materializedSource(records, rootVertexIds);
}
