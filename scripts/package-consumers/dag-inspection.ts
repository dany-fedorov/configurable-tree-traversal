import {
  DagTraversalStallError,
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
  new DagTraversal(source).makeRunner().inspectDag(),
  new AsyncDagTraversal(source).makeRunner().inspectDag(),
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

const typedStall: dag.DagTraversalStallError<ID> =
  new DagTraversalStallError<ID>({
    dependencies: [{ id: 'review', unmet: ['build'] }],
    unknownPrerequisiteIds: [],
    dependencyCycles: [],
    dependencyBlockedIds: ['review'],
    structurallyIncompleteIds: [],
  });
const stalledId: ID = typedStall.diagnostics.dependencies[0]!.id;
const defaultStall: DagTraversalStallError = typedStall;
// @ts-expect-error Default error diagnostics remain unknown.
const unknownId: ID = defaultStall.diagnostics.dependencies[0]!.id;
// @ts-expect-error Typed errors retain the selected ID domain.
const wrongStall: DagTraversalStallError<'other'> = typedStall;
// @ts-expect-error Async runner inspection returns a synchronous snapshot.
const asyncSnapshot: Promise<DagInspection<ID>> = new AsyncDagTraversal(source)
  .makeRunner()
  .inspectDag();
const methodSnapshot = new DagTraversal(source).makeRunner().inspectDag();
// @ts-expect-error Runner method retains the source identity domain.
methodSnapshot.explain({ vertexId: 'other', milestone: 'work' });
void [stalledId, unknownId, wrongStall, asyncSnapshot];

const heterogeneousStall = new DagTraversalStallError({
  dependencies: [{ id: { task: 'root' }, unmet: [undefined, null, NaN] }],
  unknownPrerequisiteIds: [undefined, null, NaN],
  dependencyCycles: [],
  dependencyBlockedIds: [],
  structurallyIncompleteIds: [],
});
const legacyUnknown: unknown =
  heterogeneousStall.diagnostics.dependencies[0]!.id;
// @ts-expect-error Omitting the error type argument preserves the unknown default.
const legacyDomain: { task: string } | null | undefined | number =
  heterogeneousStall.diagnostics.dependencies[0]!.id;
void [legacyUnknown, legacyDomain];
