import { inspectDagMilestones, DagTraversalStallError } from '../src';
import type * as dag from '../src/traversals/dag-traversal';
import * as core from '../src/core';
import type {
  DagMilestoneSnapshot,
  DagMilestoneQueryResult,
  DagMilestoneQueryOptions,
  AsyncDagDiscoverySource,
  DagDiscoverySource,
  TreeSource,
} from '../src';
import { AsyncDagTraversal, DagTraversal, materializeDagSourceFromRecords } from '../src';
import type { DagVertexProgress, DagSummary, VertexTypes } from '../src';
import type {
  DagInspectionState,
  GraphStoreContract,
} from '../src/core/graph/types';

type ID = 'review' | 'work';
const records: Array<{ id: ID; work: ID[] }> = [
  { id: 'review', work: ['work'] },
  { id: 'work', work: [] },
];
const source = materializeDagSourceFromRecords(records, {
  id: (item) => item.id,
  dependsOnWork: (item) => item.work,
});
const sync = new DagTraversal(source).createRunner();
const asyncRunner = new AsyncDagTraversal(source).createRunner();
const summaries: DagSummary<ID>[] = [sync.summary(), asyncRunner.summary()];
const waits: readonly ID[] | undefined =
  summaries[0]!.vertices.get('review')!.unmetWorkPrerequisiteIds;
// Manually constructed records remain source compatible without the new field.
const manual: DagVertexProgress<ID> = {
  vertexId: 'review',
  work: 'pending',
  subgraphComplete: false,
  unmetPrerequisiteIds: ['work'],
};
const wrong: DagVertexProgress<ID> = {
  ...manual,
  // @ts-expect-error Exact W waits preserve the source ID domain.
  unmetWorkPrerequisiteIds: ['other'],
};
// @ts-expect-error Public exact wait arrays are readonly.
manual.unmetWorkPrerequisiteIds?.push('work');

declare const state: DagInspectionState<ID>;
// @ts-expect-error Internal identity collections expose no mutators.
state.identityStates.push({ vertexId: 'work', kind: 'live' });
// @ts-expect-error Internal scheduling records are readonly.
state.schedulingStates[0]!.remainingChildren = 2;
// @ts-expect-error Internal observations preserve the ID domain.
const wrongId: 'other' = state.identityStates[0]!.vertexId;

declare const store: GraphStoreContract<VertexTypes<string, string>, ID>;
const identity: ID = store.inspectIdentityStates()[0]!.vertexId;
void [waits, wrong, wrongId, identity];

const inspections: DagMilestoneSnapshot<ID>[] = [
  inspectDagMilestones(sync),
  inspectDagMilestones(asyncRunner),
  sync.inspectMilestones(),
  asyncRunner.inspectMilestones(),
];
const navigation: DagMilestoneQueryResult<ID> = inspections[0]!.prerequisitesOf(
  { vertexId: 'review', milestone: 'work' },
  { transitive: true },
);
const options: DagMilestoneQueryOptions = { transitive: false };
const milestoneId: ID = navigation.milestones[0]!.vertexId;
const edgeId: ID = navigation.edges[0]!.prerequisite.vertexId;
// @ts-expect-error Navigation retains the declared source ID domain.
inspections[0]!.dependentsOf({ vertexId: 'other', milestone: 'work' }, options);
// @ts-expect-error Milestone kinds are qualified, not arbitrary strings.
inspections[0]!.prerequisitesOf({ vertexId: 'work', milestone: 'ready' });
// @ts-expect-error Public result arrays expose no mutators.
navigation.milestones.push({ vertexId: 'work', milestone: 'work' });
// @ts-expect-error Inspection results preserve exact IDs instead of unknown.
const narrowed: 'other' = milestoneId;
declare const nativeAsyncSource: AsyncDagDiscoverySource<
  VertexTypes<string, string>,
  VertexTypes<string, string>,
  ID
>;
const nativeAsyncInspection: DagMilestoneSnapshot<ID> = inspectDagMilestones(
  new AsyncDagTraversal({ traversableGraph: nativeAsyncSource }).createRunner(),
);
// @ts-expect-error Native async sources also retain their declared ID domain.
nativeAsyncInspection.prerequisitesOf({ vertexId: 'other', milestone: 'work' });
declare const numericSource: DagDiscoverySource<
  VertexTypes<string, string>,
  VertexTypes<string, string>,
  number
>;
// @ts-expect-error A different declared domain cannot substitute for this inspection.
const anotherDomain: DagMilestoneSnapshot<ID> = inspectDagMilestones(
  new DagTraversal({ traversableGraph: numericSource }).createRunner(),
);
declare const treeSource: TreeSource<VertexTypes<string, string>>;
const treeInspection: DagMilestoneSnapshot<unknown> = inspectDagMilestones(
  new DagTraversal({ traversableTree: treeSource }).createRunner(),
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

const explanation = inspections[0]!.explain({
  vertexId: 'review',
  milestone: 'work',
});
const declaredExplanation: import('../src').DagExplanation<ID> = explanation;
// @ts-expect-error Explanations preserve the source identity domain.
inspections[0]!.explain({ vertexId: 'other', milestone: 'work' });
if (explanation.kind === 'known') {
  const progress: DagVertexProgress<ID> | null = explanation.progress;
  const blocker: import('../src').DagBlocker<ID> | undefined =
    explanation.blockers[0];
  // @ts-expect-error Blocker collections are readonly.
  explanation.blockers.pop();
  if (blocker?.kind === 'unfinishedWork') {
    const work: 'pending' | 'ready' | 'visiting' | 'deferred' = blocker.work;
    const milestone: 'work' = blocker.target.milestone;
    void [work, milestone];
  }
  if (
    blocker?.kind === 'discoveryOpen' ||
    blocker?.kind === 'completionPending'
  ) {
    const milestone: 'subgraphCompletion' = blocker.target.milestone;
    void milestone;
  }
  if (blocker?.kind === 'constraint') {
    const status: import('../src').DagMilestoneStatus = blocker.prerequisiteStatus;
    const id: ID = blocker.prerequisite.vertexId;
    void [status, id];
  }
  void progress;
}
void declaredExplanation;

const typedStall: dag.DagTraversalStallError<ID> =
  new core.DagTraversalStallError<ID>({
    dependencies: [{ id: 'review', unmet: ['work'] }],
    unknownPrerequisiteIds: [],
    dependencyCycleComponents: [],
    dependencyBlockedIds: ['review'],
    structurallyIncompleteIds: [],
  });
const stallId: ID = typedStall.diagnostics.dependencies[0]!.id;
const stallWait: ID = typedStall.diagnostics.dependencies[0]!.unmet[0]!;
const stallEdgeId: ID | undefined =
  typedStall.diagnostics.dependencyEdges[0]?.prerequisite.vertexId;
const defaultStall: DagTraversalStallError = typedStall;
// @ts-expect-error Defaults preserve unknown instead of allowing an unchecked ID.
const unknownId: ID = defaultStall.diagnostics.dependencies[0]!.id;
// @ts-expect-error A typed diagnostic cannot silently change ID domains.
const wrongStall: DagTraversalStallError<'other'> = typedStall;
const invalidStall = new DagTraversalStallError<ID>({
  // @ts-expect-error Constructor diagnostics retain the chosen ID domain.
  dependencies: [{ id: 'other', unmet: [] }],
  unknownPrerequisiteIds: [],
  dependencyCycleComponents: [],
  dependencyBlockedIds: [],
  structurallyIncompleteIds: [],
});
// @ts-expect-error Async runner inspection is synchronous.
const asynchronousInspection: Promise<DagMilestoneSnapshot<ID>> =
  asyncRunner.inspectMilestones();
// @ts-expect-error Runner method preserves the declared ID domain.
sync.inspectMilestones().explain({ vertexId: 'other', milestone: 'work' });
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
  dependencies: [{ id: { task: 'root' }, unmet: [undefined, null, NaN] }],
  unknownPrerequisiteIds: [undefined, null, NaN],
  dependencyCycleComponents: [],
  dependencyBlockedIds: [],
  structurallyIncompleteIds: [],
});
const legacyUnknown: unknown =
  heterogeneousStall.diagnostics.dependencies[0]!.id;
// @ts-expect-error Omitting the error type argument preserves the unknown default.
const legacyDomain: { task: string } | null | undefined | number =
  heterogeneousStall.diagnostics.dependencies[0]!.id;
void [legacyUnknown, legacyDomain];
