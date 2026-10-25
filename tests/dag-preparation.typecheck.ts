import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalRunner,
  AsyncDagTraversalRunner,
  DagDeferredWork,
  DagSummary,
  DagEvent,
  TreeTypeParameters,
  TraversableGraph,
} from '../src';
type G = TreeTypeParameters<string, string>;
type ID = 'a' | 'b';
const source: TraversableGraph<G, G, ID> = {
  makeRoot: () => ({
    vertexId: 'a',
    vertexContent: { $data: 'a', $childHints: [] },
  }),
  makeVertex: () => ({
    vertexId: 'b',
    vertexContent: { $data: 'b', $childHints: [] },
  }),
};
const sync: DagTraversalRunner<G, G, ID> = new DagTraversal<G, G, ID>({
  traversableGraph: source,
})
  .makeRunner()
  .prepare();
const asyncRunner = new AsyncDagTraversal<G, G, ID>({
  traversableGraph: source,
}).makeRunner();
const prepared: Promise<AsyncDagTraversalRunner<G, G, ID>> =
  asyncRunner.prepare();
const summary: DagSummary<ID> = sync.summary();
const work: DagDeferredWork<ID> = summary.deferredFrontier[0]!;
const id: ID = work.vertexId;
sync.settle(id, { kind: 'workCompleted' }, work.generation);
// @ts-expect-error Frontier records cannot be changed through the public type.
work.generation = Symbol();
// @ts-expect-error Frontier collections are readonly snapshots.
summary.deferredFrontier.push(work);
// @ts-expect-error ID domain is preserved at the readiness boundary.
const other: DagDeferredWork<'other'> = work;
const event: DagEvent<G> = sync.getIterable().next().value!;
const kind: 'workCompleted' | 'subgraphCompleted' = event.kind;
void [prepared, other, kind];
