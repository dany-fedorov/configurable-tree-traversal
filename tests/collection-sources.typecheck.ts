import {
  materializeDagSourceFromRecords,
  materializeDagSourceFromRoots,
  materializeDagSourceFromRecordsAsync,
  materializeDagSourceFromRootsAsync,
} from '../src/sources';
import type { MaterializedDagSource } from '../src/sources';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversalOrder } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';

type Item = { id: number; children: Item[]; dependencies: number[] };
const items: Item[] = [];
const source = materializeDagSourceFromRecords(items, {
  id: (item) => item.id,
  dependsOn: (item) => item.dependencies,
  children: (item) => item.children.map((child) => child.id),
});
const typedSource: MaterializedDagSource<Item, number> = source;
const forest: MaterializedDagSource<Item, number> = materializeDagSourceFromRoots(items, {
  id: (item) => item.id,
  children: (item) => item.children,
});
const asyncSource: Promise<MaterializedDagSource<Item, number>> = materializeDagSourceFromRecordsAsync(
  items,
  { id: async (item) => item.id },
);
const asyncForest: Promise<MaterializedDagSource<Item, number>> = materializeDagSourceFromRootsAsync(
  items,
  { id: async (item) => item.id, children: async (item) => item.children },
);
for (const traversal of [
  new DagTraversal(source),
  new AsyncDagTraversal(source),
]) {
  traversal.addVisitorFor(DagTraversalOrder.ON_READY, (vertex, options) => {
    const item: Item = vertex.getData();
    const id: number = options.resolvedGraph.getVertexId(options.vertexRef);
    void [item, id];
  });
  // @ts-expect-error The inferred ID domain is numeric.
  traversal.createRunner().getResolvedGraph().getVertexRefById('wrong');
}
const asyncTraversal = new AsyncDagTraversal({
  ...source,
  visitors: {
    [DagTraversalOrder.ON_READY]: async (vertex, options) => {
      const item: Item = vertex.getData();
      const id: number = options.resolvedGraph.getVertexId(options.vertexRef);
      await Promise.resolve();
      void [item, id];
    },
  },
});
const asyncRunner = asyncTraversal.createRunner();
// @ts-expect-error Undefined must not be added to the inferred numeric ID domain.
asyncRunner.getResolvedGraph().getVertexRefById(undefined);
async function exactAsyncEvents() {
  for await (const event of asyncRunner.getIterable()) {
    const id: number = event.vertexId;
    void id;
  }
}
void exactAsyncEvents;
materializeDagSourceFromRecords(items, {
  id: (item) => item.id,
  // @ts-expect-error Synchronous selectors cannot return promises.
  dependsOn: async (item) => item.dependencies,
});
// @ts-expect-error Graph children are IDs, not records.
materializeDagSourceFromRecords(items, { id: (item) => item.id, children: (item) => item.children });
materializeDagSourceFromRoots(items, {
  id: (item) => item.id,
  // @ts-expect-error Forest children are records, not IDs.
  children: (item) => item.dependencies,
});
// @ts-expect-error IDs and prerequisites must agree.
materializeDagSourceFromRecords(items, { id: (item) => item.id, dependsOn: () => ['bad'] });
materializeDagSourceFromRecordsAsync(items, {
  // @ts-expect-error Async IDs and prerequisites must agree.
  id: async (item) => item.id,
  dependsOn: async () => ['bad'],
});
void [typedSource, forest, asyncSource, asyncForest];

const canonicalSelectors = {
  id: (item: Item) => item.id,
  dependsOn: (item: Item) => item.dependencies,
  dependsOnComplete: (item: Item) => item.dependencies,
};
materializeDagSourceFromRecords(items, canonicalSelectors);
materializeDagSourceFromRoots(items, canonicalSelectors);
materializeDagSourceFromRecordsAsync(items, canonicalSelectors);
materializeDagSourceFromRootsAsync(items, canonicalSelectors);
materializeDagSourceFromRecords(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  dependencies: undefined,
});
materializeDagSourceFromRecords(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  completionDependencies: undefined,
});
materializeDagSourceFromRoots(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  dependencies: undefined,
});
materializeDagSourceFromRoots(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  completionDependencies: undefined,
});
materializeDagSourceFromRecordsAsync(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  dependencies: undefined,
});
materializeDagSourceFromRecordsAsync(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  completionDependencies: undefined,
});
materializeDagSourceFromRootsAsync(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  dependencies: undefined,
});
materializeDagSourceFromRootsAsync(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  completionDependencies: undefined,
});
