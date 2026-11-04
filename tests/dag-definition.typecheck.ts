import {
  copyAndNormalizeDagDefinition,
  type DagDefinition,
  type DagStructuralDiscoverySlot,
  type DagVertexDeclaration,
  discoverValidateAndCaptureDag,
  validateAndPrepareDagDefinition,
  type DagDefinitionIssue,
  type DagTopologyValidationResult,
  materializeMultiEntryDagInputFromRecordCatalog,
} from '../src';

import { validateAndPrepareDagDefinition as requirePrepareDagDefinition } from '../src/traversals/dag-traversal';

type ID = 'a' | 'b';
type Data = { label: string };
const slot: DagStructuralDiscoverySlot<ID> = {
  kind: 'omitted',
  omittedVertexIdentity: { vertexId: 'b' },
};
const vertex: DagVertexDeclaration<Data, ID> = {
  vertexId: 'a',
  data: { label: 'A' },
  childDiscoverySlots: [slot],
  workWaitsForWorkOf: [],
  workWaitsForSubgraphCompletionOf: [],
};
const definition: DagDefinition<Data, ID> = copyAndNormalizeDagDefinition({
  vertexDeclarations: [vertex],
  omittedVertexIds: ['b'],
  entry: { kind: 'root', vertexId: 'a' },
});
// @ts-expect-error Definition vertices are immutable.
definition.vertexDeclarations.push(vertex);
// @ts-expect-error Definition slot wrappers are immutable.
slot.omittedVertexIdentity = null;
copyAndNormalizeDagDefinition<Data, ID>({
  vertexDeclarations: [],
  // @ts-expect-error Definitions retain their identity domain.
  omittedVertexIds: ['wrong'],
  entry: { kind: 'empty' },
});
const prepared = discoverValidateAndCaptureDag(
  materializeMultiEntryDagInputFromRecordCatalog<Data, ID>([], {
    selectVertexId: () => 'a',
  }),
);
if (prepared.kind === 'valid') {
  const captured: DagDefinition<Data, ID> =
    prepared.validatedTopology.definition;
  const runner =
    prepared.validatedTopology.createIndependentRunnerFromValidatedTopology();
  for (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
    const hints: readonly ID[] = event.vertex.getDetachedChildDiscoveryHints();
    void hints;
  }
  void captured;
}
void definition;

const validated: DagTopologyValidationResult<Data, ID> =
  validateAndPrepareDagDefinition(definition);
if (validated.kind === 'valid') {
  const id: ID = validated.validatedTopology.liveVertexSummaries[0]!.vertexId;
  const data: Data = validated.validatedTopology.liveVertexSummaries[0]!.data;
  // @ts-expect-error Valid results have no issues.
  validated.issues;
  void [id, data];
} else {
  const issues: readonly DagDefinitionIssue<ID>[] = validated.issues;
  // @ts-expect-error Invalid results have no executable DAG.
  validated.validatedTopology;
  for (const issue of issues) {
    if (issue.kind === 'milestoneDependencyStall') {
      const ids: readonly ID[] =
        issue.diagnostics.unresolvedPrerequisiteVertexIds;
      void ids;
    } else if (issue.kind === 'missingStructuralEndpoint') {
      const parent: { vertexId: ID } | null = issue.parent;
      void parent;
    }
  }
}
validateAndPrepareDagDefinition<Data, ID>({
  vertexDeclarations: [],
  omittedVertexIds: [],
  // @ts-expect-error Preparation retains the definition's identity domain.
  entry: { kind: 'root', vertexId: 'wrong' },
});
const subpathPrepare: typeof validateAndPrepareDagDefinition =
  requirePrepareDagDefinition;
void subpathPrepare;
