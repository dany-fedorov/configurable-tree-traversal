import {
  defineDag,
  diffDagDefinitions,
  prepareDagDefinition,
  reviseDag,
  type DagRevisionOperation,
  type DagRevisionResult,
  type DagDefinitionChangeAspect,
  type DagDefinitionDiff,
  type DagDefinitionVertexChange,
} from '../src';
import {
  diffDagDefinitions as subpathDiff,
  reviseDag as subpathRevise,
} from '../src/traversals/dag-traversal';

type ID = { task: string } | undefined;
const id: ID = { task: 'review' };
const before = defineDag<number, ID>({
  vertices: [
    {
      vertexId: id,
      data: 1,
      slots: [],
      dependsOnWork: [],
      dependsOnSubgraphCompletion: [],
    },
  ],
  omittedIds: [],
  entry: { kind: 'root', vertexId: id },
});
const after = defineDag<string, ID>({
  vertices: [
    {
      vertexId: id,
      data: 'new data type',
      slots: [],
      dependsOnWork: [],
      dependsOnSubgraphCompletion: [],
    },
  ],
  omittedIds: [],
  entry: { kind: 'root', vertexId: id },
});
const diff: DagDefinitionDiff<ID> = diffDagDefinitions(before, after);
const inferredId: ID = diffDagDefinitions(before, after).changedVertices[0]!
  .vertexId;
const changed: DagDefinitionVertexChange<ID> = diff.changedVertices[0]!;
const aspect: DagDefinitionChangeAspect = changed.aspects[0]!;
// @ts-expect-error Diff identities retain the caller's domain.
const stringId: string = diffDagDefinitions(before, after).addedIds[0]!;
// @ts-expect-error Owned result arrays are readonly.
diff.addedIds.push(id);
// @ts-expect-error Result records are readonly.
diff.vertexOrderChanged = false;
// @ts-expect-error Changed vertex records are readonly.
changed.vertexId = undefined;
// @ts-expect-error Changed aspect lists are readonly.
changed.aspects.push('data');
// @ts-expect-error Aspect names are a closed union.
const invalidAspect: DagDefinitionChangeAspect = 'businessInvalidation';
const subpath: typeof diffDagDefinitions = subpathDiff;
void [diff, inferredId, aspect, stringId, invalidAspect, subpath];

const prepared = prepareDagDefinition(before);
const reviseSubpath: typeof reviseDag = subpathRevise;
const operations: readonly DagRevisionOperation<number, ID>[] = [
  {
    kind: 'replaceVertex',
    vertex: {
      vertexId: id,
      data: 2,
      slots: [],
      dependsOnWork: [undefined],
      dependsOnSubgraphCompletion: [],
    },
  },
  { kind: 'removeVertexDeclaration', vertexId: undefined },
  { kind: 'replaceEntry', entry: { kind: 'root', vertexId: id } },
  { kind: 'replaceOmissions', omittedIds: [] },
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
  const revision: DagRevisionResult<number, ID> = reviseDag(
    prepared.dag,
    operations,
  );
  const emptyRevision = reviseDag(prepared.dag, []);
  reviseDag(prepared.dag, [
    // @ts-expect-error A removal cannot widen the prepared ID domain to string.
    { kind: 'removeVertexDeclaration', vertexId: 'wrong' },
  ]);
  reviseDag(prepared.dag, [
    {
      kind: 'replaceVertex',
      // @ts-expect-error A replacement cannot widen the prepared data domain.
      vertex: { ...before.vertices[0]!, data: 'wrong' },
    },
  ]);
  reviseDag(prepared.dag, [
    {
      kind: 'addVertex',
      // @ts-expect-error An addition cannot widen the prepared ID domain.
      vertex: { ...before.vertices[0]!, vertexId: 'wrong' },
    },
  ]);
  reviseDag(prepared.dag, [
    {
      kind: 'replaceVertex',
      // @ts-expect-error Dependencies cannot widen the ID domain.
      vertex: { ...before.vertices[0]!, dependsOnWork: ['wrong'] },
    },
  ]);
  reviseDag(prepared.dag, [
    {
      kind: 'replaceVertex',
      vertex: {
        ...before.vertices[0]!,
        // @ts-expect-error Structural slots retain the ID domain.
        slots: [{ kind: 'vertex', vertexId: 'wrong' }],
      },
    },
  ]);
  reviseDag(prepared.dag, [
    // @ts-expect-error Entry identities cannot widen the ID domain.
    { kind: 'replaceEntry', entry: { kind: 'root', vertexId: 'wrong' } },
  ]);
  reviseDag(prepared.dag, [
    // @ts-expect-error Omission identities cannot widen the ID domain.
    { kind: 'replaceOmissions', omittedIds: ['wrong'] },
  ]);
  if (revision.kind === 'valid') {
    const revisedID: ID = revision.changes.addedIds[0]!;
    const data: number = revision.dag.definition.vertices[0]!.data;
    // @ts-expect-error Inferred result IDs retain the prepared domain.
    const wrongID: string = revision.changes.removedIds[0]!;
    // @ts-expect-error Fresh empty batches retain the data domain too.
    const wrongData: string =
      emptyRevision.kind === 'valid'
        ? emptyRevision.dag.definition.vertices[0]!.data
        : 0;
    void [revisedID, data, wrongID, wrongData];
  } else {
    const issue = revision.issues[0]!;
    const issueID: ID = issue.kind === 'unreachable' ? issue.vertexIds[0]! : id;
    void issueID;
  }
}
void [reviseSubpath, missingPayload, invalidOperation];

const addition: Extract<
  DagRevisionOperation<number, ID>,
  { kind: 'addVertex' }
> = { kind: 'addVertex', vertex: before.vertices[0]! };
const replacement: Extract<
  DagRevisionOperation<number, ID>,
  { kind: 'replaceVertex' }
> = { kind: 'replaceVertex', vertex: before.vertices[0]! };
void [addition, replacement];
