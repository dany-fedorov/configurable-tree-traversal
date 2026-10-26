import type { DagDefinition, DagDefinitionSlot } from './lib/DagDefinition';

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

function slots<ID>(value: unknown): readonly DagDefinitionSlot<ID>[] {
  return Object.freeze(
    array(value).map((item): DagDefinitionSlot<ID> => {
      const slot = record(item);
      switch (own(slot, 'kind')) {
        case 'vertex':
          return Object.freeze({
            kind: 'vertex',
            vertexId: own(slot, 'vertexId') as ID,
          });
        case 'omitted': {
          const identity = own(slot, 'identity');
          return Object.freeze({
            kind: 'omitted',
            identity:
              identity === null
                ? null
                : Object.freeze({
                    vertexId: own(record(identity), 'vertexId') as ID,
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
export function defineDag<Data, ID = unknown>(
  input: DagDefinition<Data, ID>,
): DagDefinition<Data, ID> {
  const declaration = record(input);
  const identities = new Set<ID>();
  const declare = (value: unknown): ID => {
    const id = value as ID;
    if (identities.has(id))
      throw new TypeError('Duplicate DAG identity declaration');
    identities.add(id);
    return id;
  };
  const vertices = Object.freeze(
    array(own(declaration, 'vertices')).map((item) => {
      const vertex = record(item);
      return Object.freeze({
        vertexId: declare(own(vertex, 'vertexId')),
        data: own(vertex, 'data') as Data,
        slots: slots<ID>(own(vertex, 'slots')),
        dependsOnWork: Object.freeze([
          ...new Set(array(own(vertex, 'dependsOnWork')) as ID[]),
        ]),
        dependsOnSubgraphCompletion: Object.freeze([
          ...new Set(array(own(vertex, 'dependsOnSubgraphCompletion')) as ID[]),
        ]),
      });
    }),
  );
  const omittedIds = Object.freeze(
    array(own(declaration, 'omittedIds')).map(declare),
  );
  const entryInput = record(own(declaration, 'entry'));
  let entry: DagDefinition<Data, ID>['entry'];
  switch (own(entryInput, 'kind')) {
    case 'root':
      entry = Object.freeze({
        kind: 'root',
        vertexId: own(entryInput, 'vertexId') as ID,
      });
      break;
    case 'forest':
      entry = Object.freeze({
        kind: 'forest',
        slots: slots<ID>(own(entryInput, 'slots')),
      });
      break;
    case 'empty':
      entry = Object.freeze({ kind: 'empty' });
      break;
    default:
      throw new TypeError('Unknown DAG definition entry kind');
  }
  return Object.freeze({ vertices, omittedIds, entry });
}
