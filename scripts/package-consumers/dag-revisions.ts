import {
  defineDag,
  prepareDagDefinition,
  reviseDag,
  diffDagDefinitions,
  dagTraversal,
  type DagRevisionOperation,
  type DagRevisionResult,
  type DagDefinitionDiff,
  type DagDefinitionChangeAspect,
  type DagDefinitionVertexChange,
} from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
type ID = 'task';
const definition = defineDag<number, ID>({
  vertices: [
    {
      vertexId: 'task',
      data: 1,
      slots: [],
      dependsOn: [],
      dependsOnComplete: [],
    },
  ],
  omittedIds: [],
  entry: { kind: 'root', vertexId: 'task' },
});
const prepared = prepareDagDefinition(definition);
const operation: DagRevisionOperation<number, ID> = {
  kind: 'replaceVertex',
  vertex: { ...definition.vertices[0]!, data: 2 },
};
const subOperation: dag.DagRevisionOperation<number, ID> = operation;
const namespaceOperation: dagTraversal.DagRevisionOperation<number, ID> =
  subOperation;
const sameRevise: typeof reviseDag = dag.reviseDag;
const namespaceRevise: typeof reviseDag = dagTraversal.reviseDag;
const sameDiff: typeof diffDagDefinitions = dag.diffDagDefinitions;
const namespaceDiff: typeof diffDagDefinitions =
  dagTraversal.diffDagDefinitions;
const diff: DagDefinitionDiff<ID> = diffDagDefinitions(
  definition,
  defineDag<string, ID>({
    ...definition,
    vertices: [{ ...definition.vertices[0]!, data: 'new' }],
  }),
);
const subDiff: dag.DagDefinitionDiff<ID> = diff;
const namespaceDiffType: dagTraversal.DagDefinitionDiff<ID> = subDiff;
const aspect: DagDefinitionChangeAspect = 'workDependencies';
const subAspect: dag.DagDefinitionChangeAspect = aspect;
const namespaceAspect: dagTraversal.DagDefinitionChangeAspect = subAspect;
const change: DagDefinitionVertexChange<ID> = {
  vertexId: 'task',
  aspects: [aspect],
};
const subChange: dag.DagDefinitionVertexChange<ID> = change;
const namespaceChange: dagTraversal.DagDefinitionVertexChange<ID> = subChange;
if (prepared.kind === 'valid') {
  const result: DagRevisionResult<number, ID> = reviseDag(prepared.dag, [
    operation,
  ]);
  const subResult: dag.DagRevisionResult<number, ID> = result;
  const namespaceResult: dagTraversal.DagRevisionResult<number, ID> = subResult;
  if (result.kind === 'valid') {
    const id: ID | undefined = result.changes.addedIds[0];
    result.dag.createWorkSession({ completedWork: new Set<ID>(['task']) });
    void id;
  } else {
    result.issues;
    // @ts-expect-error Invalid revisions expose no executable DAG.
    result.dag;
  }
  // @ts-expect-error Operations cannot widen the prepared identity domain.
  reviseDag(prepared.dag, [{ kind: 'removeVertex', vertexId: 'foreign' }]);
  reviseDag(prepared.dag, [
    {
      kind: 'replaceVertex',
      // @ts-expect-error Data replacement cannot widen the prepared data domain.
      vertex: { ...definition.vertices[0]!, data: 'wrong' },
    },
  ]);
  void namespaceResult;
}
// @ts-expect-error Diff arrays are readonly.
diff.addedIds.push('task');
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
