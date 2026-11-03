import { copyAndNormalizeDagDefinition } from './defineDag';
import { diffDagDefinitionDeclarationsShallowly } from './diffDagDefinitions';
import type { DagDefinition, DagDefinitionVertex } from './lib/DagDefinition';
import type {
  DagRevisionOperation,
  DagRevisionResult,
} from './lib/DagRevision';
import type { ValidatedReusableDagTopology } from './lib/PreparedDag';
import { validateAndPrepareDagDefinition } from './prepareDagDefinition';

// Defer operation inference so only the prepared DAG chooses the data/ID domain.
// This form supports TypeScript 4.7 (before the built-in NoInfer utility).
type RevisionDomain<SourceVertexTypes> = [
  SourceVertexTypes,
][SourceVertexTypes extends unknown ? 0 : never];

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
export function applyDagDefinitionRevisionBatch<Data, VertexId = unknown>(
  prepared: ValidatedReusableDagTopology<Data, VertexId>,
  operations: readonly DagRevisionOperation<
    RevisionDomain<Data>,
    RevisionDomain<VertexId>
  >[],
): DagRevisionResult<Data, VertexId> {
  if (!Array.isArray(operations))
    throw new TypeError('Expected a DAG revision operation array');
  const before = prepared.definition;
  const vertexDeclarations = new Map(
    before.vertexDeclarations.map((vertex) => [vertex.vertexId, vertex]),
  );
  let entry = before.entry;
  let omittedVertexIds = before.omittedVertexIds;
  for (const input of Array.from(operations)) {
    const operation = record(input);
    const kind = own(operation, 'kind');
    switch (kind) {
      case 'addVertexDeclaration':
      case 'replaceVertexDeclaration': {
        const vertex = copyAndNormalizeDagDefinition<Data, VertexId>({
          vertexDeclarations: [
            own(operation, 'vertexDeclaration') as DagDefinitionVertex<
              Data,
              VertexId
            >,
          ],
          omittedVertexIds: [],
          entry: { kind: 'empty' },
        }).vertexDeclarations[0]!;
        const exists = vertexDeclarations.has(vertex.vertexId);
        if ((kind === 'addVertexDeclaration') === exists)
          throw new TypeError(
            kind === 'addVertexDeclaration'
              ? 'DAG vertex already exists'
              : 'Unknown DAG vertex',
          );
        vertexDeclarations.set(vertex.vertexId, vertex);
        break;
      }
      case 'removeVertexDeclaration': {
        const id = own(operation, 'vertexId') as VertexId;
        if (!vertexDeclarations.delete(id))
          throw new TypeError('Unknown DAG vertex');
        break;
      }
      case 'replaceEntryDeclaration':
        entry = copyAndNormalizeDagDefinition<Data, VertexId>({
          vertexDeclarations: [],
          omittedVertexIds: [],
          entry: own(operation, 'entry') as DagDefinition<
            Data,
            VertexId
          >['entry'],
        }).entry;
        break;
      case 'replaceOmittedVertexIds':
        omittedVertexIds = copyAndNormalizeDagDefinition<Data, VertexId>({
          vertexDeclarations: [],
          omittedVertexIds: own(
            operation,
            'omittedVertexIds',
          ) as readonly VertexId[],
          entry: { kind: 'empty' },
        }).omittedVertexIds;
        break;
      default:
        throw new TypeError('Unknown DAG revision operation kind');
    }
  }
  const result = validateAndPrepareDagDefinition({
    vertexDeclarations: [...vertexDeclarations.values()],
    omittedVertexIds,
    entry,
  });
  return result.kind === 'invalid'
    ? result
    : {
        kind: 'valid',
        validatedTopology: result.validatedTopology,
        changes: diffDagDefinitionDeclarationsShallowly(
          before,
          result.validatedTopology.definition,
        ),
      };
}
