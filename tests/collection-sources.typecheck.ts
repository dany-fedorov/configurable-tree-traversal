import {
  materializeDagInputFromRecords,
  materializeDagInputFromRoots,
  materializeDagInputFromRecordsAsync,
  materializeDagInputFromRootsAsync,
} from '../src/sources';
import type { MaterializedDagInput } from '../src/sources';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagVisitorPhase } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';

type Item = { id: number; children: Item[]; dependencies: number[] };
const items: Item[] = [];
const source = materializeDagInputFromRecords(items, {
  id: (item) => item.id,
  dependsOnWork: (item) => item.dependencies,
  children: (item) => item.children.map((child) => child.id),
});
const typedSource: MaterializedDagInput<Item, number> = source;
const forest: MaterializedDagInput<Item, number> = materializeDagInputFromRoots(
  items,
  {
    id: (item) => item.id,
    children: (item) => item.children,
  },
);
const asyncSource: Promise<MaterializedDagInput<Item, number>> =
  materializeDagInputFromRecordsAsync(items, { id: async (item) => item.id });
const asyncForest: Promise<MaterializedDagInput<Item, number>> =
  materializeDagInputFromRootsAsync(items, {
    id: async (item) => item.id,
    children: async (item) => item.children,
  });
for (const traversal of [
  new DagTraversal(source),
  new AsyncDagTraversal(source),
]) {
  traversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, (vertex, options) => {
    const item: Item = vertex.getData();
    const id: number = options.resolvedGraphView.requireVertexId(
      options.vertexRef,
    );
    void [item, id];
  });
  // @ts-expect-error The inferred ID domain is numeric.
  traversal.createRunner().getResolvedGraphView().getVertexRefById('wrong');
}
const asyncTraversal = new AsyncDagTraversal({
  ...source,
  visitors: {
    [DagVisitorPhase.ON_WORK_READY]: async (vertex, options) => {
      const item: Item = vertex.getData();
      const id: number = options.resolvedGraphView.requireVertexId(
        options.vertexRef,
      );
      await Promise.resolve();
      void [item, id];
    },
  },
});
const asyncRunner = asyncTraversal.createRunner();
// @ts-expect-error Undefined must not be added to the inferred numeric ID domain.
asyncRunner.getResolvedGraphView().getVertexRefById(undefined);
async function exactAsyncEvents() {
  for await (const event of asyncRunner.iterateEvents()) {
    const id: number = event.vertexId;
    void id;
  }
}
void exactAsyncEvents;
materializeDagInputFromRecords(items, {
  id: (item) => item.id,
  // @ts-expect-error Synchronous selectors cannot return promises.
  dependsOnWork: async (item) => item.dependencies,
});
materializeDagInputFromRecords(items, {
  id: (item) => item.id,
  // @ts-expect-error Graph children are IDs, not records.
  children: (item) => item.children,
});
materializeDagInputFromRoots(items, {
  id: (item) => item.id,
  // @ts-expect-error Forest children are records, not IDs.
  children: (item) => item.dependencies,
});
materializeDagInputFromRecords(items, {
  // @ts-expect-error IDs and prerequisites must agree.
  id: (item) => item.id,
  dependsOnWork: () => ['bad'],
});
materializeDagInputFromRecordsAsync(items, {
  // @ts-expect-error Async IDs and prerequisites must agree.
  id: async (item) => item.id,
  dependsOnWork: async () => ['bad'],
});
void [typedSource, forest, asyncSource, asyncForest];

const canonicalSelectors = {
  id: (item: Item) => item.id,
  dependsOnWork: (item: Item) => item.dependencies,
  dependsOnSubgraphCompletion: (item: Item) => item.dependencies,
};
materializeDagInputFromRecords(items, canonicalSelectors);
materializeDagInputFromRoots(items, canonicalSelectors);
materializeDagInputFromRecordsAsync(items, canonicalSelectors);
materializeDagInputFromRootsAsync(items, canonicalSelectors);
materializeDagInputFromRecords(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  dependencies: undefined,
});
materializeDagInputFromRecords(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  completionDependencies: undefined,
});
materializeDagInputFromRoots(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  dependencies: undefined,
});
materializeDagInputFromRoots(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  completionDependencies: undefined,
});
materializeDagInputFromRecordsAsync(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  dependencies: undefined,
});
materializeDagInputFromRecordsAsync(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  completionDependencies: undefined,
});
materializeDagInputFromRootsAsync(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  dependencies: undefined,
});
materializeDagInputFromRootsAsync(items, {
  id: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  completionDependencies: undefined,
});

// @ts-expect-error Materialized DAG envelopes are inputs, not source protocols.
import type { MaterializedDagSource } from '../src/sources';
// @ts-expect-error Retired source-named envelope factory has no alias.
import { materializeDagSourceFromRecords } from '../src';
// @ts-expect-error Retired source-named envelope factory has no alias.
import { materializeDagSourceFromRoots } from '../src/sources';
// @ts-expect-error Retired async source-named factory has no alias.
import { materializeDagSourceFromRecordsAsync } from '../src/sources';
// @ts-expect-error Retired async source-named factory has no alias.
import { materializeDagSourceFromRootsAsync } from '../src/sources';
void [
  materializeDagSourceFromRecords,
  materializeDagSourceFromRoots,
  materializeDagSourceFromRecordsAsync,
  materializeDagSourceFromRootsAsync,
];
export type RemovedEnvelope = MaterializedDagSource<unknown, unknown>;
