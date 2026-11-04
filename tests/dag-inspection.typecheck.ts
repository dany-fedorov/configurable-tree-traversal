import { captureDagMilestoneSnapshot, DagTraversalStallError } from '../src';
import type * as dag from '../src/traversals/dag-traversal';
import * as core from '../src/core';
import type {
  DagMilestoneSnapshot,
  DagMilestoneQueryResult,
  DagMilestoneQueryOptions,
  AsyncDagDiscoverySource,
  DagDiscoverySource,
  TreeDiscoverySource,
} from '../src';
import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  materializeMultiEntryDagInputFromRecordCatalog,
} from '../src';
import type {
  DagVertexProgress,
  DagProgressSnapshot,
  VertexDataAndChildHintTypes,
} from '../src';
import type {
  DagInspectionState,
  GraphStoreContract,
} from '../src/core/graph/types';

type ID = 'review' | 'work';
const records: Array<{ id: ID; work: ID[] }> = [
  { id: 'review', work: ['work'] },
  { id: 'work', work: [] },
];
const source = materializeMultiEntryDagInputFromRecordCatalog(records, {
  selectVertexId: (item) => item.id,
  selectWorkPrerequisiteVertexIds: (item) => item.work,
});
const sync = new DagTraversalBuilder(
  source,
).createIndependentRunnerFromCurrentOptions();
const asyncRunner = new AsyncDagTraversalBuilder(
  source,
).createIndependentRunnerFromCurrentOptions();
const summaries: DagProgressSnapshot<ID>[] = [
  sync.captureProgressSnapshot(),
  asyncRunner.captureProgressSnapshot(),
];
const waits: readonly ID[] =
  summaries[0]!.progressByVertexId.get('review')!.unmetWorkMilestoneVertexIds;
// Manually constructed progress records include both milestone wait arrays.
const manual: DagVertexProgress<ID> = {
  vertexId: 'review',
  workState: 'waitingForPrerequisiteMilestones',
  subgraphCompletionCommitted: false,
  unmetPrerequisiteVertexIds: ['work'],
  unmetWorkMilestoneVertexIds: ['work'],
  unmetSubgraphCompletionMilestoneVertexIds: [],
};
const wrong: DagVertexProgress<ID> = {
  ...manual,
  // @ts-expect-error Exact W waits preserve the source ID domain.
  unmetWorkMilestoneVertexIds: ['other'],
};
// @ts-expect-error Public exact wait arrays are readonly.
manual.unmetWorkMilestoneVertexIds.push('work');

declare const state: DagInspectionState<ID>;
// @ts-expect-error Internal identity collections expose no mutators.
state.identityStates.push({ vertexId: 'work', kind: 'live' });
// @ts-expect-error Internal scheduling records are readonly.
state.schedulingStates[0]!.remainingChildren = 2;
// @ts-expect-error Internal observations preserve the ID domain.
const wrongId: 'other' = state.identityStates[0]!.vertexId;

declare const store: GraphStoreContract<
  VertexDataAndChildHintTypes<string, string>,
  ID
>;
const omittedVertexIdentity: ID = store.inspectIdentityStates()[0]!.vertexId;
void [waits, wrong, wrongId, omittedVertexIdentity];

const inspections: DagMilestoneSnapshot<ID>[] = [
  captureDagMilestoneSnapshot(sync),
  captureDagMilestoneSnapshot(asyncRunner),
  sync.captureMilestoneSnapshot(),
  asyncRunner.captureMilestoneSnapshot(),
];
const navigation: DagMilestoneQueryResult<ID> =
  inspections[0]!.queryOriginalPrerequisiteMilestonesOf(
    { vertexId: 'review', milestone: 'workCompletion' },
    { includeTransitiveMilestones: true },
  );
const options: DagMilestoneQueryOptions = {
  includeTransitiveMilestones: false,
};
const milestoneId: ID = navigation.reachedMilestones[0]!.vertexId;
const edgeId: ID =
  navigation.originalMilestoneConstraints[0]!.prerequisiteMilestone.vertexId;
inspections[0]!.queryOriginalDependentMilestonesOf(
  // @ts-expect-error Navigation retains the declared source ID domain.
  { vertexId: 'other', milestone: 'workCompletion' },
  options,
);
inspections[0]!.queryOriginalPrerequisiteMilestonesOf({
  vertexId: 'work',
  // @ts-expect-error Milestone kinds are qualified, not arbitrary strings.
  milestone: 'ready',
});
// @ts-expect-error Public result arrays expose no mutators.
navigation.reachedMilestones.push({
  vertexId: 'work',
  milestone: 'workCompletion',
});
// @ts-expect-error Inspection results preserve exact IDs instead of unknown.
const narrowed: 'other' = milestoneId;
declare const nativeAsyncSource: AsyncDagDiscoverySource<
  VertexDataAndChildHintTypes<string, string>,
  VertexDataAndChildHintTypes<string, string>,
  ID
>;
const nativeAsyncInspection: DagMilestoneSnapshot<ID> =
  captureDagMilestoneSnapshot(
    new AsyncDagTraversalBuilder({
      dagDiscoverySource: nativeAsyncSource,
    }).createIndependentRunnerFromCurrentOptions(),
  );
nativeAsyncInspection.queryOriginalPrerequisiteMilestonesOf({
  // @ts-expect-error Native async sources also retain their declared ID domain.
  vertexId: 'other',
  milestone: 'workCompletion',
});
declare const numericSource: DagDiscoverySource<
  VertexDataAndChildHintTypes<string, string>,
  VertexDataAndChildHintTypes<string, string>,
  number
>;
// @ts-expect-error A different declared domain cannot substitute for this inspection.
const anotherDomain: DagMilestoneSnapshot<ID> = captureDagMilestoneSnapshot(
  new DagTraversalBuilder({
    dagDiscoverySource: numericSource,
  }).createIndependentRunnerFromCurrentOptions(),
);
declare const treeSource: TreeDiscoverySource<
  VertexDataAndChildHintTypes<string, string>
>;
const treeInspection: DagMilestoneSnapshot<unknown> =
  captureDagMilestoneSnapshot(
    new DagTraversalBuilder({
      treeDiscoverySource: treeSource,
    }).createIndependentRunnerFromCurrentOptions(),
  );
void [
  navigation,
  options,
  milestoneId,
  edgeId,
  narrowed,
  anotherDomain,
  treeInspection,
];

const explanation = inspections[0]!.explainMilestone({
  vertexId: 'review',
  milestone: 'workCompletion',
});
const declaredExplanation: import('../src').DagMilestoneExplanation<ID> =
  explanation;
inspections[0]!.explainMilestone({
  // @ts-expect-error Explanations preserve the source identity domain.
  vertexId: 'other',
  milestone: 'workCompletion',
});
if (explanation.kind === 'live') {
  const progress: DagVertexProgress<ID> | null = explanation.progress;
  const blocker: import('../src').DagMilestoneBlocker<ID> | undefined =
    explanation.blockers[0];
  // @ts-expect-error Blocker collections are readonly.
  explanation.blockers.pop();
  if (blocker?.kind === 'workCompletionUncommitted') {
    const work:
      | 'waitingForPrerequisiteMilestones'
      | 'readyForWorkVisitorAdmission'
      | 'workVisitorChainAdmitted'
      | 'workCompletionDeferred' = blocker.workState;
    const milestone: 'workCompletion' = blocker.targetMilestone.milestone;
    void [work, milestone];
  }
  if (
    blocker?.kind === 'childDiscoveryNotClosed' ||
    blocker?.kind === 'subgraphCompletionCommitPending'
  ) {
    const milestone: 'subgraphCompletion' = blocker.targetMilestone.milestone;
    void milestone;
  }
  if (blocker?.kind === 'unmetMilestoneConstraint') {
    const status: import('../src').DagMilestoneStatus =
      blocker.prerequisiteStatus;
    const id: ID = blocker.prerequisiteMilestone.vertexId;
    void [status, id];
  }
  void progress;
}
void declaredExplanation;

const typedStall: dag.DagTraversalStallError<ID> =
  new core.DagTraversalStallError<ID>({
    blockedVertexPrerequisiteReports: [
      { vertexId: 'review', unmetPrerequisiteVertexIds: ['work'] },
    ],
    unresolvedPrerequisiteVertexIds: [],
    milestoneCycleVertexIdComponents: [],
    nonCyclePrerequisiteBlockedVertexIds: ['review'],
    incompleteVertexIdsWithoutUnmetPrerequisites: [],
  });
const stallId: ID =
  typedStall.diagnostics.blockedVertexPrerequisiteReports[0]!.vertexId;
const stallWait: ID =
  typedStall.diagnostics.blockedVertexPrerequisiteReports[0]!
    .unmetPrerequisiteVertexIds[0]!;
const stallEdgeId: ID | undefined =
  typedStall.diagnostics.originalMilestoneConstraints[0]?.prerequisiteMilestone
    .vertexId;
const defaultStall: DagTraversalStallError = typedStall;
// @ts-expect-error Defaults preserve unknown instead of allowing an unchecked ID.
const unknownId: ID =
  defaultStall.diagnostics.blockedVertexPrerequisiteReports[0]!.vertexId;
// @ts-expect-error A typed diagnostic cannot silently change ID domains.
const wrongStall: DagTraversalStallError<'other'> = typedStall;
const invalidStall = new DagTraversalStallError<ID>({
  blockedVertexPrerequisiteReports: [
    // @ts-expect-error Constructor diagnostics retain the chosen ID domain.
    { vertexId: 'other', unmetPrerequisiteVertexIds: [] },
  ],
  unresolvedPrerequisiteVertexIds: [],
  milestoneCycleVertexIdComponents: [],
  nonCyclePrerequisiteBlockedVertexIds: [],
  incompleteVertexIdsWithoutUnmetPrerequisites: [],
});
// @ts-expect-error Async runner inspection is synchronous.
const asynchronousInspection: Promise<DagMilestoneSnapshot<ID>> =
  asyncRunner.captureMilestoneSnapshot();
sync
  .captureMilestoneSnapshot()
  // @ts-expect-error Runner method preserves the declared ID domain.
  .explainMilestone({ vertexId: 'other', milestone: 'workCompletion' });
void [
  stallId,
  stallWait,
  stallEdgeId,
  unknownId,
  wrongStall,
  invalidStall,
  asynchronousInspection,
];

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

// @ts-expect-error Progress outputs always include both W and C wait arrays.
const incompleteProgress: DagVertexProgress<ID> = {
  vertexId: 'review',
  workState: 'waitingForPrerequisiteMilestones',
  subgraphCompletionCommitted: false,
  unmetPrerequisiteVertexIds: [],
};
void incompleteProgress;
