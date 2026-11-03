import {
  copyAndNormalizeDagDefinition,
  validateAndPrepareDagDefinition,
  applyDagDefinitionRevisionBatch,
  diffDagDefinitionDeclarationsShallowly,
  dagTraversal,
  type DagRevisionOperation,
  type DagRevisionResult,
  type DagDefinitionDiff,
  type DagDefinitionChangeAspect,
  type DagDefinitionVertexChange,
} from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
type ID = 'task';
const definition = copyAndNormalizeDagDefinition<number, ID>({
  vertexDeclarations: [
    {
      vertexId: 'task',
      data: 1,
      childDiscoverySlots: [],
      workWaitsForWorkOf: [],
      workWaitsForSubgraphCompletionOf: [],
    },
  ],
  omittedVertexIds: [],
  entry: { kind: 'root', vertexId: 'task' },
});
const prepared = validateAndPrepareDagDefinition(definition);
const operation: DagRevisionOperation<number, ID> = {
  kind: 'replaceVertexDeclaration',
  vertexDeclaration: { ...definition.vertexDeclarations[0]!, data: 2 },
};
const subOperation: dag.DagRevisionOperation<number, ID> = operation;
const namespaceOperation: dagTraversal.DagRevisionOperation<number, ID> =
  subOperation;
const sameRevise: typeof applyDagDefinitionRevisionBatch =
  dag.applyDagDefinitionRevisionBatch;
const namespaceRevise: typeof applyDagDefinitionRevisionBatch =
  dagTraversal.applyDagDefinitionRevisionBatch;
const sameDiff: typeof diffDagDefinitionDeclarationsShallowly =
  dag.diffDagDefinitionDeclarationsShallowly;
const namespaceDiff: typeof diffDagDefinitionDeclarationsShallowly =
  dagTraversal.diffDagDefinitionDeclarationsShallowly;
const diff: DagDefinitionDiff<ID> = diffDagDefinitionDeclarationsShallowly(
  definition,
  copyAndNormalizeDagDefinition<string, ID>({
    ...definition,
    vertexDeclarations: [{ ...definition.vertexDeclarations[0]!, data: 'new' }],
  }),
);
const subDiff: dag.DagDefinitionDiff<ID> = diff;
const namespaceDiffType: dagTraversal.DagDefinitionDiff<ID> = subDiff;
const aspect: DagDefinitionChangeAspect = 'workWaitsForWorkOf';
const subAspect: dag.DagDefinitionChangeAspect = aspect;
const namespaceAspect: dagTraversal.DagDefinitionChangeAspect = subAspect;
const change: DagDefinitionVertexChange<ID> = {
  vertexId: 'task',
  changedDeclarationFields: [aspect],
};
const subChange: dag.DagDefinitionVertexChange<ID> = change;
const namespaceChange: dagTraversal.DagDefinitionVertexChange<ID> = subChange;
if (prepared.kind === 'valid') {
  const result: DagRevisionResult<number, ID> = applyDagDefinitionRevisionBatch(
    prepared.validatedTopology,
    [operation],
  );
  const subResult: dag.DagRevisionResult<number, ID> = result;
  const namespaceResult: dagTraversal.DagRevisionResult<number, ID> = subResult;
  if (result.kind === 'valid') {
    const id: ID | undefined = result.changes.addedVertexDeclarationIds[0];
    result.validatedTopology.createExternalWorkSession({
      acceptedCompletedWorkVertexIds: new Set<ID>(['task']),
    });
    void id;
  } else {
    result.issues;
    // @ts-expect-error Invalid revisions expose no executable DAG.
    result.dag;
  }
  applyDagDefinitionRevisionBatch(prepared.validatedTopology, [
    // @ts-expect-error Operations cannot widen the prepared identity domain.
    { kind: 'removeVertexDeclaration', vertexId: 'foreign' },
  ]);
  applyDagDefinitionRevisionBatch(prepared.validatedTopology, [
    {
      kind: 'replaceVertexDeclaration',
      vertexDeclaration: {
        ...definition.vertexDeclarations[0]!,
        // @ts-expect-error Data replacement cannot widen the prepared data domain.
        data: 'wrong',
      },
    },
  ]);
  void namespaceResult;
}
// @ts-expect-error Diff arrays are readonly.
diff.addedVertexDeclarationIds.push('task');
// @ts-expect-error The aspect vocabulary is closed.
const badAspect: DagDefinitionChangeAspect = 'artifacts';
void [
  namespaceOperation,
  sameRevise,
  namespaceRevise,
  sameDiff,
  namespaceDiff,
  namespaceDiffType,
  namespaceAspect,
  namespaceChange,
  badAspect,
];
