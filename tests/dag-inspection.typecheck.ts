import { inspectDag } from '../src';
import type {
  DagInspection,
  DagMilestoneQueryResult,
  DagMilestoneQueryOptions,
  AsyncTraversableGraph,
  TraversableGraph,
  TraversableTree,
} from '../src';
import { AsyncDagTraversal, DagTraversal, graphFrom } from '../src';
import type { DagVertexProgress, DagSummary, TreeTypeParameters } from '../src';
import type {
  DagInspectionState,
  GraphStoreContract,
} from '../src/core/graph/types';

type ID = 'review' | 'work';
const records: Array<{ id: ID; work: ID[] }> = [
  { id: 'review', work: ['work'] },
  { id: 'work', work: [] },
];
const source = graphFrom(records, {
  id: (item) => item.id,
  dependencies: (item) => item.work,
});
const sync = new DagTraversal(source).makeRunner();
const asyncRunner = new AsyncDagTraversal(source).makeRunner();
const summaries: DagSummary<ID>[] = [sync.summary(), asyncRunner.summary()];
const waits: readonly ID[] | undefined =
  summaries[0]!.vertices.get('review')!.unmetWorkPrerequisiteIds;
// Manually constructed records remain source compatible without the new field.
const manual: DagVertexProgress<ID> = {
  id: 'review',
  work: 'pending',
  subtreeComplete: false,
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

declare const store: GraphStoreContract<TreeTypeParameters<string, string>, ID>;
const identity: ID = store.inspectIdentityStates()[0]!.vertexId;
void [waits, wrong, wrongId, identity];

const inspections: DagInspection<ID>[] = [
  inspectDag(sync),
  inspectDag(asyncRunner),
];
const navigation: DagMilestoneQueryResult<ID> = inspections[0]!.prerequisitesOf(
  { vertexId: 'review', milestone: 'work' },
  { transitive: true },
);
const options: DagMilestoneQueryOptions = { transitive: false };
const milestoneId: ID = navigation.milestones[0]!.vertexId;
const edgeId: ID = navigation.edges[0]!.to.vertexId;
// @ts-expect-error Navigation retains the declared source ID domain.
inspections[0]!.dependentsOf({ vertexId: 'other', milestone: 'work' }, options);
// @ts-expect-error Milestone kinds are qualified, not arbitrary strings.
inspections[0]!.prerequisitesOf({ vertexId: 'work', milestone: 'ready' });
// @ts-expect-error Public result arrays expose no mutators.
navigation.milestones.push({ vertexId: 'work', milestone: 'work' });
// @ts-expect-error Inspection results preserve exact IDs instead of unknown.
const narrowed: 'other' = milestoneId;
declare const nativeAsyncSource: AsyncTraversableGraph<
  TreeTypeParameters<string, string>,
  TreeTypeParameters<string, string>,
  ID
>;
const nativeAsyncInspection: DagInspection<ID> = inspectDag(
  new AsyncDagTraversal({ traversableGraph: nativeAsyncSource }).makeRunner(),
);
// @ts-expect-error Native async sources also retain their declared ID domain.
nativeAsyncInspection.prerequisitesOf({ vertexId: 'other', milestone: 'work' });
declare const numericSource: TraversableGraph<
  TreeTypeParameters<string, string>,
  TreeTypeParameters<string, string>,
  number
>;
// @ts-expect-error A different declared domain cannot substitute for this inspection.
const anotherDomain: DagInspection<ID> = inspectDag(
  new DagTraversal({ traversableGraph: numericSource }).makeRunner(),
);
declare const treeSource: TraversableTree<TreeTypeParameters<string, string>>;
const treeInspection: DagInspection<unknown> = inspectDag(
  new DagTraversal({ traversableTree: treeSource }).makeRunner(),
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
    const work: 'pending' | 'ready' | 'running' | 'deferred' = blocker.work;
    const milestone: 'work' = blocker.target.milestone;
    void [work, milestone];
  }
  if (
    blocker?.kind === 'discoveryOpen' ||
    blocker?.kind === 'completionPending'
  ) {
    const milestone: 'completion' = blocker.target.milestone;
    void milestone;
  }
  if (blocker?.kind === 'constraint') {
    const status: import('../src').DagMilestoneStatus = blocker.toStatus;
    const id: ID = blocker.to.vertexId;
    void [status, id];
  }
  void progress;
}
void declaredExplanation;
