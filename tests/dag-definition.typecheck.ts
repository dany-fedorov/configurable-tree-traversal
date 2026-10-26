import {
  defineDag,
  type DagDefinition,
  type DagDefinitionSlot,
  type DagDefinitionVertex,
  prepareDag,
  prepareDagDefinition,
  type DagDefinitionIssue,
  type PrepareDagResult,
  materializeDagSourceFromRecords,
} from '../src';

import { prepareDagDefinition as requirePrepareDagDefinition } from '../src/traversals/dag-traversal';

type ID = 'a' | 'b';
type Data = { label: string };
const slot: DagDefinitionSlot<ID> = {
  kind: 'omitted',
  identity: { vertexId: 'b' },
};
const vertex: DagDefinitionVertex<Data, ID> = {
  vertexId: 'a',
  data: { label: 'A' },
  slots: [slot],
  dependsOn: [],
  dependsOnComplete: [],
};
const definition: DagDefinition<Data, ID> = defineDag({
  vertices: [vertex],
  omittedIds: ['b'],
  entry: { kind: 'root', vertexId: 'a' },
});
// @ts-expect-error Definition vertices are immutable.
definition.vertices.push(vertex);
// @ts-expect-error Definition slot wrappers are immutable.
slot.identity = null;
defineDag<Data, ID>({
  vertices: [],
  // @ts-expect-error Definitions retain their identity domain.
  omittedIds: ['wrong'],
  entry: { kind: 'empty' },
});
const prepared = prepareDag(materializeDagSourceFromRecords<Data, ID>([], { id: () => 'a' }));
if (prepared.kind === 'valid') {
  const captured: DagDefinition<Data, ID> = prepared.dag.definition;
  const runner = prepared.dag.createRunner();
  for (const event of runner.getIterable()) {
    const hints: ID[] = event.vertex.getChildrenHints();
    void hints;
  }
  void captured;
}
void definition;

const validated: PrepareDagResult<Data, ID> =
  prepareDagDefinition(definition);
if (validated.kind === 'valid') {
  const id: ID = validated.dag.vertices[0]!.vertexId;
  const data: Data = validated.dag.vertices[0]!.data;
  // @ts-expect-error Valid results have no issues.
  validated.issues;
  void [id, data];
} else {
  const issues: readonly DagDefinitionIssue<ID>[] = validated.issues;
  // @ts-expect-error Invalid results have no executable DAG.
  validated.dag;
  for (const issue of issues) {
    if (issue.kind === 'milestone') {
      const ids: ID[] = issue.diagnostics.unknownPrerequisiteIds;
      void ids;
    } else if (issue.kind === 'missingStructuralEndpoint') {
      const parent: { vertexId: ID } | null = issue.parent;
      void parent;
    }
  }
}
prepareDagDefinition<Data, ID>({
  vertices: [],
  omittedIds: [],
  // @ts-expect-error Preparation retains the definition's identity domain.
  entry: { kind: 'root', vertexId: 'wrong' },
});
const subpathPrepare: typeof prepareDagDefinition = requirePrepareDagDefinition;
void subpathPrepare;
