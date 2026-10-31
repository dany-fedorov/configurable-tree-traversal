import {
  DagTraversalStallError,
  DagTraversal,
  AsyncDagTraversal,
  materializeDagInputFromRecords,
  inspectDagMilestones,
  type DagMilestoneSnapshot,
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
const source = materializeDagInputFromRecords(records, {
  id: (v) => v.id,
  dependsOnWork: (v) => v.work,
});
const inspections: DagMilestoneSnapshot<ID>[] = [
  inspectDagMilestones(new DagTraversal(source).createRunner()),
  new DagTraversal(source).createRunner().inspectMilestones(),
  new AsyncDagTraversal(source).createRunner().inspectMilestones(),
  dag.inspectDagMilestones(new AsyncDagTraversal(source).createRunner()),
];
const sameFunction: typeof inspectDagMilestones = cjs.inspectDagMilestones;
const result: dag.DagExplanation<ID> = inspections[0]!.explain({
  vertexId: 'build',
  milestone: 'work',
});
const sameResult: DagExplanation<ID> = result;
if (result.kind === 'live') {
  const blocker: DagBlocker<ID> | undefined = result.blockers[0];
  // @ts-expect-error A captured collection is readonly.
  result.blockers.pop();
  if (blocker?.kind === 'constraint') {
    const status: dag.DagMilestoneStatus = blocker.prerequisiteStatus;
    const sameStatus: DagMilestoneStatus = status;
    const id: ID = blocker.prerequisite.vertexId;
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
    dependencies: [{ vertexId: 'review', unmetPrerequisiteIds: ['build'] }],
    unknownPrerequisiteIds: [],
    dependencyCycleComponents: [],
    dependencyBlockedIds: ['review'],
    structurallyIncompleteIds: [],
  });
const stalledId: ID = typedStall.diagnostics.dependencies[0]!.vertexId;
const defaultStall: DagTraversalStallError = typedStall;
// @ts-expect-error Default error diagnostics remain unknown.
const unknownId: ID = defaultStall.diagnostics.dependencies[0]!.vertexId;
// @ts-expect-error Typed errors retain the selected ID domain.
const wrongStall: DagTraversalStallError<'other'> = typedStall;
// @ts-expect-error Async runner inspection returns a synchronous snapshot.
const asyncSnapshot: Promise<DagMilestoneSnapshot<ID>> = new AsyncDagTraversal(
  source,
)
  .createRunner()
  .inspectMilestones();
const methodSnapshot = new DagTraversal(source)
  .createRunner()
  .inspectMilestones();
// @ts-expect-error Runner method retains the source identity domain.
methodSnapshot.explain({ vertexId: 'other', milestone: 'work' });
void [stalledId, unknownId, wrongStall, asyncSnapshot];

const heterogeneousStall = new DagTraversalStallError({
  dependencies: [
    {
      vertexId: { task: 'root' },
      unmetPrerequisiteIds: [undefined, null, NaN],
    },
  ],
  unknownPrerequisiteIds: [undefined, null, NaN],
  dependencyCycleComponents: [],
  dependencyBlockedIds: [],
  structurallyIncompleteIds: [],
});
const legacyUnknown: unknown =
  heterogeneousStall.diagnostics.dependencies[0]!.vertexId;
// @ts-expect-error Omitting the error type argument preserves the unknown default.
const legacyDomain: { task: string } | null | undefined | number =
  heterogeneousStall.diagnostics.dependencies[0]!.vertexId;
void [legacyUnknown, legacyDomain];
