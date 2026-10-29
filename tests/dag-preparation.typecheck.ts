import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalRunner,
  AsyncDagTraversalRunner,
  DagDeferredWork,
  DagSummary,
  DagEvent,
  VertexTypes,
  DagDiscoverySource,
} from '../src';
type G = VertexTypes<string, string>;
type ID = 'a' | 'b';
const source: DagDiscoverySource<G, G, ID> = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: {
      vertexId: 'a',
      vertexContent: { $data: 'a', $childHints: [] },
    },
  }),
  resolveChild: () => ({
    kind: 'found' as const,
    vertex: {
      vertexId: 'b',
      vertexContent: { $data: 'b', $childHints: [] },
    },
  }),
};
const sync: DagTraversalRunner<G, G, ID> = new DagTraversal<G, G, ID>({
  traversableGraph: source,
})
  .createRunner()
  .prepare();
const asyncRunner = new AsyncDagTraversal<G, G, ID>({
  traversableGraph: source,
}).createRunner();
const prepared: Promise<AsyncDagTraversalRunner<G, G, ID>> =
  asyncRunner.prepare();
const summary: DagSummary<ID> = sync.summary();
const work: DagDeferredWork<ID> = summary.awaitingSettlement[0]!;
const id: ID = work.vertexId;
sync.settle(id, { kind: 'workCompleted' }, work.generation);
// @ts-expect-error Frontier records cannot be changed through the public type.
work.generation = Symbol();
// @ts-expect-error Frontier collections are readonly snapshots.
summary.awaitingSettlement.push(work);
// @ts-expect-error ID domain is preserved at the readiness boundary.
const other: DagDeferredWork<'other'> = work;
const event: DagEvent<G> = sync.iterateEvents().next().value!;
const kind: 'workCompleted' | 'subgraphCompleted' = event.kind;
void [prepared, other, kind];
