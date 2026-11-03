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
} from '../src';
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
