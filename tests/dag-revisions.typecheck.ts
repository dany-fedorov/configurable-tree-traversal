import {
  defineDag,
  diffDagDefinitions,
  type DagDefinitionChangeAspect,
  type DagDefinitionDiff,
  type DagDefinitionVertexChange,
} from '../src';
import { diffDagDefinitions as subpathDiff } from '../src/traversals/dag-traversal';

type ID = { task: string } | undefined;
const id: ID = { task: 'review' };
const before = defineDag<number, ID>({
  vertices: [
    { vertexId: id, data: 1, slots: [], dependsOn: [], dependsOnComplete: [] },
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
      dependsOn: [],
      dependsOnComplete: [],
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
