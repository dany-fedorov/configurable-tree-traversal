import type {
  DagDefinition,
  DagStructuralDiscoverySlot,
} from './lib/DagDefinition';

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError('Expected a DAG definition record');
  return value as Record<string, unknown>;
}

function own(value: Record<string, unknown>, key: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(value, key))
    throw new TypeError(`Missing DAG definition field: ${key}`);
  return value[key];
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value))
    throw new TypeError('Expected a DAG definition array');
  return Array.from(value);
}

function slots<VertexId>(
  value: unknown,
): readonly DagStructuralDiscoverySlot<VertexId>[] {
  return Object.freeze(
    array(value).map((item): DagStructuralDiscoverySlot<VertexId> => {
      const slot = record(item);
      switch (own(slot, 'kind')) {
        case 'vertex':
          return Object.freeze({
            kind: 'vertex',
            vertexId: own(slot, 'vertexId') as VertexId,
          });
        case 'omitted': {
          const omittedVertexIdentity = own(slot, 'omittedVertexIdentity');
          return Object.freeze({
            kind: 'omitted',
            omittedVertexIdentity:
              omittedVertexIdentity === null
                ? null
                : Object.freeze({
                    vertexId: own(
                      record(omittedVertexIdentity),
                      'vertexId',
                    ) as VertexId,
                  }),
          });
        }
        default:
          throw new TypeError('Unknown DAG definition slot kind');
      }
    }),
  );
}

/** Copy owned topology without executing sources or validating graph semantics. */
export function copyAndNormalizeDagDefinition<Data, VertexId = unknown>(
  input: DagDefinition<Data, VertexId>,
): DagDefinition<Data, VertexId> {
  const declaration = record(input);
  const identities = new Set<VertexId>();
  const declare = (value: unknown): VertexId => {
    const id = value as VertexId;
    if (identities.has(id))
      throw new TypeError('Duplicate DAG identity declaration');
    identities.add(id);
    return id;
  };
  const vertexDeclarations = Object.freeze(
    array(own(declaration, 'vertexDeclarations')).map((item) => {
      const vertex = record(item);
      return Object.freeze({
        vertexId: declare(own(vertex, 'vertexId')),
        data: own(vertex, 'data') as Data,
        childDiscoverySlots: slots<VertexId>(
          own(vertex, 'childDiscoverySlots'),
        ),
        workWaitsForWorkOf: Object.freeze([
          ...new Set(array(own(vertex, 'workWaitsForWorkOf')) as VertexId[]),
        ]),
        workWaitsForSubgraphCompletionOf: Object.freeze([
          ...new Set(
            array(
              own(vertex, 'workWaitsForSubgraphCompletionOf'),
            ) as VertexId[],
          ),
        ]),
      });
    }),
  );
  const omittedVertexIds = Object.freeze(
    array(own(declaration, 'omittedVertexIds')).map(declare),
  );
  const entryInput = record(own(declaration, 'entry'));
  let entry: DagDefinition<Data, VertexId>['entry'];
  switch (own(entryInput, 'kind')) {
    case 'root':
      entry = Object.freeze({
        kind: 'root',
        vertexId: own(entryInput, 'vertexId') as VertexId,
      });
      break;
    case 'roots':
      entry = Object.freeze({
        kind: 'roots',
        entryDiscoverySlots: slots<VertexId>(
          own(entryInput, 'entryDiscoverySlots'),
        ),
      });
      break;
    case 'empty':
      entry = Object.freeze({ kind: 'empty' });
      break;
    default:
      throw new TypeError('Unknown DAG definition entry kind');
  }
  return Object.freeze({ vertexDeclarations, omittedVertexIds, entry });
}
