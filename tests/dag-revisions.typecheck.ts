import {
  copyAndNormalizeDagDefinition,
  diffDagDefinitionDeclarationsShallowly,
  validateAndPrepareDagDefinition,
  applyDagDefinitionRevisionBatch,
  type DagRevisionOperation,
  type DagRevisionResult,
  type DagDefinitionChangeAspect,
  type DagDefinitionDiff,
  type DagDefinitionVertexChange,
} from '../src';
import {
  diffDagDefinitionDeclarationsShallowly as subpathDiff,
  applyDagDefinitionRevisionBatch as subpathRevise,
} from '../src/traversals/dag-traversal';

type ID = { task: string } | undefined;
const id: ID = { task: 'review' };
const before = copyAndNormalizeDagDefinition<number, ID>({
  vertexDeclarations: [
    {
      vertexId: id,
      data: 1,
      childDiscoverySlots: [],
      workWaitsForWorkOf: [],
      workWaitsForSubgraphCompletionOf: [],
    },
  ],
  omittedVertexIds: [],
  entry: { kind: 'root', vertexId: id },
});
const after = copyAndNormalizeDagDefinition<string, ID>({
  vertexDeclarations: [
    {
      vertexId: id,
      data: 'new data type',
      childDiscoverySlots: [],
      workWaitsForWorkOf: [],
      workWaitsForSubgraphCompletionOf: [],
    },
  ],
  omittedVertexIds: [],
  entry: { kind: 'root', vertexId: id },
});
const diff: DagDefinitionDiff<ID> = diffDagDefinitionDeclarationsShallowly(
  before,
  after,
);
const inferredId: ID = diffDagDefinitionDeclarationsShallowly(before, after)
  .changedVertexDeclarations[0]!.vertexId;
const changed: DagDefinitionVertexChange<ID> =
  diff.changedVertexDeclarations[0]!;
const aspect: DagDefinitionChangeAspect = changed.changedDeclarationFields[0]!;
// @ts-expect-error Diff identities retain the caller's domain.
const stringId: string = diffDagDefinitionDeclarationsShallowly(before, after)
  .addedVertexDeclarationIds[0]!;
// @ts-expect-error Owned result arrays are readonly.
diff.addedVertexDeclarationIds.push(id);
// @ts-expect-error Result records are readonly.
diff.vertexDeclarationSequenceChanged = false;
// @ts-expect-error Changed vertex records are readonly.
changed.vertexId = undefined;
// @ts-expect-error Changed aspect lists are readonly.
changed.changedDeclarationFields.push('data');
// @ts-expect-error Aspect names are a closed union.
const invalidAspect: DagDefinitionChangeAspect = 'businessInvalidation';
const subpath: typeof diffDagDefinitionDeclarationsShallowly = subpathDiff;
void [diff, inferredId, aspect, stringId, invalidAspect, subpath];

const prepared = validateAndPrepareDagDefinition(before);
const reviseSubpath: typeof applyDagDefinitionRevisionBatch = subpathRevise;
const operations: readonly DagRevisionOperation<number, ID>[] = [
  {
    kind: 'replaceVertexDeclaration',
    vertexDeclaration: {
      vertexId: id,
      data: 2,
      childDiscoverySlots: [],
      workWaitsForWorkOf: [undefined],
      workWaitsForSubgraphCompletionOf: [],
    },
  },
  { kind: 'removeVertexDeclaration', vertexId: undefined },
  { kind: 'replaceEntryDeclaration', entry: { kind: 'root', vertexId: id } },
  { kind: 'replaceOmittedVertexIds', omittedVertexIds: [] },
];
// @ts-expect-error Operation payloads are required.
const missingPayload: DagRevisionOperation<number, ID> = {
  kind: 'removeVertexDeclaration',
};
const invalidOperation: DagRevisionOperation<number, ID> = {
  // @ts-expect-error Operations are a closed union.
  kind: 'mutateSession',
};
// @ts-expect-error Operations are readonly.
operations[0]!.kind = 'removeVertexDeclaration';
if (prepared.kind === 'valid') {
  const revision: DagRevisionResult<number, ID> =
    applyDagDefinitionRevisionBatch(prepared.validatedTopology, operations);
  const emptyRevision = applyDagDefinitionRevisionBatch(
    prepared.validatedTopology,
    [],
  );
  applyDagDefinitionRevisionBatch(prepared.validatedTopology, [
    // @ts-expect-error A removal cannot widen the prepared ID domain to string.
    { kind: 'removeVertexDeclaration', vertexId: 'wrong' },
  ]);
  applyDagDefinitionRevisionBatch(prepared.validatedTopology, [
    {
      kind: 'replaceVertexDeclaration',
      // @ts-expect-error A replacement cannot widen the prepared data domain.
      vertexDeclaration: { ...before.vertexDeclarations[0]!, data: 'wrong' },
    },
  ]);
  applyDagDefinitionRevisionBatch(prepared.validatedTopology, [
    {
      kind: 'addVertexDeclaration',
      vertexDeclaration: {
        ...before.vertexDeclarations[0]!,
        // @ts-expect-error An addition cannot widen the prepared ID domain.
        vertexId: 'wrong',
      },
    },
  ]);
  applyDagDefinitionRevisionBatch(prepared.validatedTopology, [
    {
      kind: 'replaceVertexDeclaration',
      vertexDeclaration: {
        ...before.vertexDeclarations[0]!,
        // @ts-expect-error Dependencies cannot widen the ID domain.
        workWaitsForWorkOf: ['wrong'],
      },
    },
  ]);
  applyDagDefinitionRevisionBatch(prepared.validatedTopology, [
    {
      kind: 'replaceVertexDeclaration',
      vertexDeclaration: {
        ...before.vertexDeclarations[0]!,
        // @ts-expect-error Structural slots retain the ID domain.
        childDiscoverySlots: [{ kind: 'vertex', vertexId: 'wrong' }],
      },
    },
  ]);
  applyDagDefinitionRevisionBatch(prepared.validatedTopology, [
    {
      kind: 'replaceEntryDeclaration',
      // @ts-expect-error Entry identities cannot widen the ID domain.
      entry: { kind: 'root', vertexId: 'wrong' },
    },
  ]);
  applyDagDefinitionRevisionBatch(prepared.validatedTopology, [
    // @ts-expect-error Omission identities cannot widen the ID domain.
    { kind: 'replaceOmittedVertexIds', omittedVertexIds: ['wrong'] },
  ]);
  if (revision.kind === 'valid') {
    const revisedID: ID = revision.changes.addedVertexDeclarationIds[0]!;
    const data: number =
      revision.validatedTopology.definition.vertexDeclarations[0]!.data;
    // @ts-expect-error Inferred result IDs retain the prepared domain.
    const wrongID: string = revision.changes.removedVertexDeclarationIds[0]!;
    // @ts-expect-error Fresh empty batches retain the data domain too.
    const wrongData: string =
      emptyRevision.kind === 'valid'
        ? emptyRevision.validatedTopology.definition.vertexDeclarations[0]!.data
        : 0;
    void [revisedID, data, wrongID, wrongData];
  } else {
    const issue = revision.issues[0]!;
    const issueID: ID =
      issue.kind === 'outsideEntryDiscoveryClosure' ? issue.vertexIds[0]! : id;
    void issueID;
  }
}
void [reviseSubpath, missingPayload, invalidOperation];

const addition: Extract<
  DagRevisionOperation<number, ID>,
  { kind: 'addVertexDeclaration' }
> = {
  kind: 'addVertexDeclaration',
  vertexDeclaration: before.vertexDeclarations[0]!,
};
const replacement: Extract<
  DagRevisionOperation<number, ID>,
  { kind: 'replaceVertexDeclaration' }
> = {
  kind: 'replaceVertexDeclaration',
  vertexDeclaration: before.vertexDeclarations[0]!,
};
void [addition, replacement];
