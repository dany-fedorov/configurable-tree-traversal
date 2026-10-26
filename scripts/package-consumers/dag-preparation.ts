// Packed public contracts; exercise actual calls under both declaration loaders.
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
} from 'configurable-tree-traversal';
type G = VertexTypes<string, string>;
type ID = 'a' | 'b';
const source: DagDiscoverySource<G, G, ID> = {
  resolveRoot: () => ({
    vertexId: 'a',
    vertexContent: { $data: 'a', $childHints: [] },
  }),
  resolveChild: () => ({
    vertexId: 'b',
    vertexContent: { $data: 'b', $childHints: [] },
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

import type { DagDeferredWork as SubpathWork } from 'configurable-tree-traversal/traversals/dag-traversal';
const subpathWork: SubpathWork<ID> = work;
const rootWork: DagDeferredWork<ID> = subpathWork;
// @ts-expect-error Subpath frontier ID domain must remain exact.
const wrongSubpath: SubpathWork<number> = rootWork;
void wrongSubpath;

new DagTraversal<G, G, ID>({
  traversableGraph: source,
  traversableTree: undefined,
}).configure({
  traversableGraph: undefined,
  traversableTree: undefined,
});
new AsyncDagTraversal<G, G, ID>({
  traversableGraph: source,
  traversableTree: undefined,
}).configure({
  traversableGraph: undefined,
  traversableTree: undefined,
});
// @ts-expect-error Undefined placeholders do not supply a required constructor source.
new DagTraversal<G, G, ID>({
  traversableGraph: undefined,
  traversableTree: undefined,
});
