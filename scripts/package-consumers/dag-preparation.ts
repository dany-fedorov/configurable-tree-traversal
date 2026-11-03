// Packed public contracts; exercise actual calls under both declaration loaders.
import {
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  DagTraversalRunner,
  AsyncDagTraversalRunner,
  DagWorkAwaitingSettlement,
  DagProgressSnapshot,
  DagCommittedMilestoneEvent,
  VertexDataAndChildHintTypes,
  DagDiscoverySource,
} from 'configurable-tree-traversal';
type G = VertexDataAndChildHintTypes<string, string>;
type ID = 'a' | 'b';
const source: DagDiscoverySource<G, G, ID> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'a',
      vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
    },
  }),
  resolveChildHint: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'b',
      vertexContentInput: { $vertexData: 'b', $childDiscoveryHints: [] },
    },
  }),
};
const sync: DagTraversalRunner<G, G, ID> = new DagTraversalBuilder<G, G, ID>({
  dagDiscoverySource: source,
})
  .createIndependentRunnerFromCurrentOptions()
  .discoverValidateAndFreezeTopology();
const asyncRunner = new AsyncDagTraversalBuilder<G, G, ID>({
  dagDiscoverySource: source,
}).createIndependentRunnerFromCurrentOptions();
const prepared: Promise<AsyncDagTraversalRunner<G, G, ID>> =
  asyncRunner.discoverValidateAndFreezeTopology();
const captureProgressSnapshot: DagProgressSnapshot<ID> =
  sync.captureProgressSnapshot();
const work: DagWorkAwaitingSettlement<ID> =
  captureProgressSnapshot.workAwaitingSettlement[0]!;
const id: ID = work.vertexId;
sync.settleDeferredWork(id, { kind: 'workCompleted' }, work.settlementToken);
// @ts-expect-error Frontier records cannot be changed through the public type.
work.settlementToken = Symbol();
// @ts-expect-error Frontier collections are readonly snapshots.
captureProgressSnapshot.workAwaitingSettlement.push(work);
// @ts-expect-error ID domain is preserved at the readiness boundary.
const other: DagWorkAwaitingSettlement<'other'> = work;
const event: DagCommittedMilestoneEvent<G> = sync
  .runAndIterateObservationEventsUntilSuspendedOrTerminal()
  .next().value!;
const kind: 'workCompletionCommitted' | 'subgraphCompletionCommitted' =
  event.eventKind;
void [prepared, other, kind];

import type { DagWorkAwaitingSettlement as SubpathWork } from 'configurable-tree-traversal/traversals/dag-traversal';
const subpathWork: SubpathWork<ID> = work;
const rootWork: DagWorkAwaitingSettlement<ID> = subpathWork;
// @ts-expect-error Subpath frontier ID domain must remain exact.
const wrongSubpath: SubpathWork<number> = rootWork;
void wrongSubpath;

new DagTraversalBuilder<G, G, ID>({
  dagDiscoverySource: source,
  treeDiscoverySource: undefined,
}).patchOptionsForFutureRunners({
  dagDiscoverySource: undefined,
  treeDiscoverySource: undefined,
});
new AsyncDagTraversalBuilder<G, G, ID>({
  dagDiscoverySource: source,
  treeDiscoverySource: undefined,
}).patchOptionsForFutureRunners({
  dagDiscoverySource: undefined,
  treeDiscoverySource: undefined,
});
// @ts-expect-error Undefined placeholders do not supply a required constructor source.
new DagTraversalBuilder<G, G, ID>({
  dagDiscoverySource: undefined,
  treeDiscoverySource: undefined,
});
