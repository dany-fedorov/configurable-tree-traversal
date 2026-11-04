import {
  DagTraversalStallError,
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  materializeMultiEntryDagInputFromRecordCatalog,
  captureDagMilestoneSnapshot,
  type DagMilestoneSnapshot,
  type DagMilestoneExplanation,
  type DagMilestoneBlocker,
  type DagMilestoneStatus,
} from 'configurable-tree-traversal';
import * as cjs from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
type ID = 'build' | 'review';
const records: { id: ID; work: ID[] }[] = [
  { id: 'build', work: [] },
  { id: 'review', work: ['build'] },
];
const source = materializeMultiEntryDagInputFromRecordCatalog(records, {
  selectVertexId: (v) => v.id,
  selectWorkPrerequisiteVertexIds: (v) => v.work,
});
const inspections: DagMilestoneSnapshot<ID>[] = [
  captureDagMilestoneSnapshot(
    new DagTraversalBuilder(source).createIndependentRunnerFromCurrentOptions(),
  ),
  new DagTraversalBuilder(source)
    .createIndependentRunnerFromCurrentOptions()
    .captureMilestoneSnapshot(),
  new AsyncDagTraversalBuilder(source)
    .createIndependentRunnerFromCurrentOptions()
    .captureMilestoneSnapshot(),
  dag.captureDagMilestoneSnapshot(
    new AsyncDagTraversalBuilder(
      source,
    ).createIndependentRunnerFromCurrentOptions(),
  ),
];
const sameFunction: typeof captureDagMilestoneSnapshot =
  cjs.captureDagMilestoneSnapshot;
const result: dag.DagMilestoneExplanation<ID> =
  inspections[0]!.explainMilestone({
    vertexId: 'build',
    milestone: 'workCompletion',
  });
const sameResult: DagMilestoneExplanation<ID> = result;
if (result.kind === 'live') {
  const blocker: DagMilestoneBlocker<ID> | undefined = result.blockers[0];
  // @ts-expect-error A captured collection is readonly.
  result.blockers.pop();
  if (blocker?.kind === 'unmetMilestoneConstraint') {
    const status: dag.DagMilestoneStatus = blocker.prerequisiteStatus;
    const sameStatus: DagMilestoneStatus = status;
    const id: ID = blocker.prerequisiteMilestone.vertexId;
    void [sameStatus, id];
  }
}
inspections[0]!.explainMilestone({
  // @ts-expect-error Identity domains remain exact through packed declarations.
  vertexId: 'other',
  milestone: 'workCompletion',
});
// @ts-expect-error Milestone kinds are qualified.
inspections[0]!.explainMilestone({ vertexId: 'build', milestone: 'ready' });
void [sameFunction, sameResult];

const typedStall: dag.DagTraversalStallError<ID> =
  new DagTraversalStallError<ID>({
    blockedVertexPrerequisiteReports: [
      { vertexId: 'review', unmetPrerequisiteVertexIds: ['build'] },
    ],
    unresolvedPrerequisiteVertexIds: [],
    milestoneCycleVertexIdComponents: [],
    nonCyclePrerequisiteBlockedVertexIds: ['review'],
    incompleteVertexIdsWithoutUnmetPrerequisites: [],
  });
const stalledId: ID =
  typedStall.diagnostics.blockedVertexPrerequisiteReports[0]!.vertexId;
const defaultStall: DagTraversalStallError = typedStall;
// @ts-expect-error Default error diagnostics remain unknown.
const unknownId: ID =
  defaultStall.diagnostics.blockedVertexPrerequisiteReports[0]!.vertexId;
// @ts-expect-error Typed errors retain the selected ID domain.
const wrongStall: DagTraversalStallError<'other'> = typedStall;
// @ts-expect-error Async runner inspection returns a synchronous snapshot.
const asyncSnapshot: Promise<DagMilestoneSnapshot<ID>> =
  new AsyncDagTraversalBuilder(source)
    .createIndependentRunnerFromCurrentOptions()
    .captureMilestoneSnapshot();
const methodSnapshot = new DagTraversalBuilder(source)
  .createIndependentRunnerFromCurrentOptions()
  .captureMilestoneSnapshot();
methodSnapshot.explainMilestone({
  // @ts-expect-error Runner method retains the source identity domain.
  vertexId: 'other',
  milestone: 'workCompletion',
});
void [stalledId, unknownId, wrongStall, asyncSnapshot];

const heterogeneousStall = new DagTraversalStallError({
  blockedVertexPrerequisiteReports: [
    {
      vertexId: { task: 'root' },
      unmetPrerequisiteVertexIds: [undefined, null, NaN],
    },
  ],
  unresolvedPrerequisiteVertexIds: [undefined, null, NaN],
  milestoneCycleVertexIdComponents: [],
  nonCyclePrerequisiteBlockedVertexIds: [],
  incompleteVertexIdsWithoutUnmetPrerequisites: [],
});
const legacyUnknown: unknown =
  heterogeneousStall.diagnostics.blockedVertexPrerequisiteReports[0]!.vertexId;
// @ts-expect-error Omitting the error type argument preserves the unknown default.
const legacyDomain: { task: string } | null | undefined | number =
  heterogeneousStall.diagnostics.blockedVertexPrerequisiteReports[0]!.vertexId;
void [legacyUnknown, legacyDomain];
