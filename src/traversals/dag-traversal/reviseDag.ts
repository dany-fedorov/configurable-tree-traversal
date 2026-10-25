import { defineDag } from './defineDag';
import { diffDagDefinitions } from './diffDagDefinitions';
import type { DagDefinition, DagDefinitionVertex } from './lib/DagDefinition';
import type {
  DagRevisionOperation,
  DagRevisionResult,
} from './lib/DagRevision';
import type { PreparedDag } from './lib/PreparedDag';
import { prepareDagDefinition } from './prepareDagDefinition';

// Defer operation inference so only the prepared DAG chooses the data/ID domain.
// This form supports TypeScript 4.7 (before the built-in NoInfer utility).
type RevisionDomain<T> = [T][T extends unknown ? 0 : never];

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError('Expected a DAG revision operation record');
  return value as Record<string, unknown>;
}

function own(value: Record<string, unknown>, key: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(value, key))
    throw new TypeError(`Missing DAG revision operation field: ${key}`);
  return value[key];
}

/**
 * Apply ordered edits to a detached candidate and validate only its final graph.
 * Removal leaves references and descendants intact. Existing sessions stay local
 * to their original definition; accepted completion facts are never migrated.
 */
export function reviseDag<Data, ID = unknown>(
  prepared: PreparedDag<Data, ID>,
  operations: readonly DagRevisionOperation<
    RevisionDomain<Data>,
    RevisionDomain<ID>
  >[],
): DagRevisionResult<Data, ID> {
  if (!Array.isArray(operations))
    throw new TypeError('Expected a DAG revision operation array');
  const before = prepared.definition;
  const vertices = new Map(
    before.vertices.map((vertex) => [vertex.vertexId, vertex]),
  );
  let entry = before.entry;
  let omittedIds = before.omittedIds;
  for (const input of Array.from(operations)) {
    const operation = record(input);
    const kind = own(operation, 'kind');
    switch (kind) {
      case 'addVertex':
      case 'replaceVertex': {
        const vertex = defineDag<Data, ID>({
          vertices: [own(operation, 'vertex') as DagDefinitionVertex<Data, ID>],
          omittedIds: [],
          entry: { kind: 'empty' },
        }).vertices[0]!;
        const exists = vertices.has(vertex.vertexId);
        if ((kind === 'addVertex') === exists)
          throw new TypeError(
            kind === 'addVertex'
              ? 'DAG vertex already exists'
              : 'Unknown DAG vertex',
          );
        vertices.set(vertex.vertexId, vertex);
        break;
      }
      case 'removeVertex': {
        const id = own(operation, 'vertexId') as ID;
        if (!vertices.delete(id)) throw new TypeError('Unknown DAG vertex');
        break;
      }
      case 'replaceEntry':
        entry = defineDag<Data, ID>({
          vertices: [],
          omittedIds: [],
          entry: own(operation, 'entry') as DagDefinition<Data, ID>['entry'],
        }).entry;
        break;
      case 'replaceOmissions':
        omittedIds = defineDag<Data, ID>({
          vertices: [],
          omittedIds: own(operation, 'omittedIds') as readonly ID[],
          entry: { kind: 'empty' },
        }).omittedIds;
        break;
      default:
        throw new TypeError('Unknown DAG revision operation kind');
    }
  }
  const result = prepareDagDefinition({
    vertices: [...vertices.values()],
    omittedIds,
    entry,
  });
  return result.kind === 'invalid'
    ? result
    : {
        kind: 'valid',
        dag: result.dag,
        changes: diffDagDefinitions(before, result.dag.definition),
      };
}
