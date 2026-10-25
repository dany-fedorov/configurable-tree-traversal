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
