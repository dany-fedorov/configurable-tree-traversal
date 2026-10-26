import {
  DagTraversal,
  AsyncDagTraversal,
  graphFrom,
  inspectDag,
  type DagInspection,
  type DagExplanation,
  type DagBlocker,
  type DagMilestoneStatus,
} from 'configurable-tree-traversal';
import * as cjs from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
type ID = 'build' | 'review';
const records: { id: ID; work: ID[] }[] = [
  { id: 'build', work: [] },
  { id: 'review', work: ['build'] },
];
const source = graphFrom(records, {
  id: (v) => v.id,
  dependsOn: (v) => v.work,
});
const inspections: DagInspection<ID>[] = [
  inspectDag(new DagTraversal(source).makeRunner()),
  dag.inspectDag(new AsyncDagTraversal(source).makeRunner()),
];
const sameFunction: typeof inspectDag = cjs.inspectDag;
const result: dag.DagExplanation<ID> = inspections[0]!.explain({
  vertexId: 'build',
  milestone: 'work',
});
const sameResult: DagExplanation<ID> = result;
if (result.kind === 'known') {
  const blocker: DagBlocker<ID> | undefined = result.blockers[0];
  // @ts-expect-error A captured collection is readonly.
  result.blockers.pop();
  if (blocker?.kind === 'constraint') {
    const status: dag.DagMilestoneStatus = blocker.toStatus;
    const sameStatus: DagMilestoneStatus = status;
    const id: ID = blocker.to.vertexId;
    void [sameStatus, id];
  }
}
// @ts-expect-error Identity domains remain exact through packed declarations.
inspections[0]!.explain({ vertexId: 'other', milestone: 'work' });
// @ts-expect-error Milestone kinds are qualified.
inspections[0]!.explain({ vertexId: 'build', milestone: 'ready' });
void [sameFunction, sameResult];
