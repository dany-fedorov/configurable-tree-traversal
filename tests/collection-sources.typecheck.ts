import {
  materializeMultiEntryDagInputFromRecordCatalog,
  materializeDagInputFromRootRecords,
  materializeMultiEntryDagInputFromRecordCatalogAsync,
  materializeDagInputFromRootRecordsAsync,
} from '../src/sources';
import type { MaterializedDagTraversalInput } from '../src/sources';
import { DagTraversalBuilder } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversalBuilder } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagVisitorPhase } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';

type Item = { id: number; children: Item[]; dependencies: number[] };
const items: Item[] = [];
const source = materializeMultiEntryDagInputFromRecordCatalog(items, {
  selectVertexId: (item) => item.id,
  selectWorkPrerequisiteVertexIds: (item) => item.dependencies,
  selectStructuralChildVertexIds: (item) =>
    item.children.map((child) => child.id),
});
const typedSource: MaterializedDagTraversalInput<Item, number> = source;
const forest: MaterializedDagTraversalInput<Item, number> =
  materializeDagInputFromRootRecords(items, {
    selectVertexId: (item) => item.id,
    selectStructuralChildRecords: (item) => item.children,
  });
const asyncSource: Promise<MaterializedDagTraversalInput<Item, number>> =
  materializeMultiEntryDagInputFromRecordCatalogAsync(items, {
    selectVertexId: async (item) => item.id,
  });
const asyncForest: Promise<MaterializedDagTraversalInput<Item, number>> =
  materializeDagInputFromRootRecordsAsync(items, {
    selectVertexId: async (item) => item.id,
    selectStructuralChildRecords: async (item) => item.children,
  });
for (const traversal of [
  new DagTraversalBuilder(source),
  new AsyncDagTraversalBuilder(source),
]) {
  traversal.registerVisitorCallbackForPhase(
    DagVisitorPhase.ON_WORK_READY,
    (vertex, options) => {
      const item: Item = vertex.getVertexData();
      const id: number = options.liveResolvedGraphView.requireVertexId(
        options.vertexHandle,
      );
      void [item, id];
    },
  );
  traversal
    .createIndependentRunnerFromCurrentOptions()
    .getLiveResolvedGraphView()
    // @ts-expect-error The inferred ID domain is numeric.
    .getVertexHandleByIdOrNull('wrong');
}
const asyncTraversal = new AsyncDagTraversalBuilder({
  ...source,
  visitors: {
    [DagVisitorPhase.ON_WORK_READY]: async (vertex, options) => {
      const item: Item = vertex.getVertexData();
      const id: number = options.liveResolvedGraphView.requireVertexId(
        options.vertexHandle,
      );
      await Promise.resolve();
      void [item, id];
    },
  },
});
const asyncRunner = asyncTraversal.createIndependentRunnerFromCurrentOptions();
// @ts-expect-error Undefined must not be added to the inferred numeric ID domain.
asyncRunner.getLiveResolvedGraphView().getVertexHandleByIdOrNull(undefined);
async function exactAsyncEvents() {
  for await (const event of asyncRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
    const id: number = event.vertexId;
    void id;
  }
}
void exactAsyncEvents;
materializeMultiEntryDagInputFromRecordCatalog(items, {
  selectVertexId: (item) => item.id,
  // @ts-expect-error Synchronous selectors cannot return promises.
  selectWorkPrerequisiteVertexIds: async (item) => item.dependencies,
});
materializeMultiEntryDagInputFromRecordCatalog(items, {
  selectVertexId: (item) => item.id,
  // @ts-expect-error Graph children are IDs, not records.
  selectStructuralChildVertexIds: (item) => item.children,
});
materializeDagInputFromRootRecords(items, {
  selectVertexId: (item) => item.id,
  // @ts-expect-error Forest children are records, not IDs.
  selectStructuralChildRecords: (item) => item.dependencies,
});
materializeMultiEntryDagInputFromRecordCatalog(items, {
  // @ts-expect-error IDs and prerequisites must agree.
  selectVertexId: (item) => item.id,
  selectWorkPrerequisiteVertexIds: () => ['bad'],
});
materializeMultiEntryDagInputFromRecordCatalogAsync(items, {
  // @ts-expect-error Async IDs and prerequisites must agree.
  selectVertexId: async (item) => item.id,
  selectWorkPrerequisiteVertexIds: async () => ['bad'],
});
void [typedSource, forest, asyncSource, asyncForest];

const canonicalSelectors = {
  selectVertexId: (item: Item) => item.id,
  selectWorkPrerequisiteVertexIds: (item: Item) => item.dependencies,
  selectSubgraphCompletionPrerequisiteVertexIds: (item: Item) =>
    item.dependencies,
};
materializeMultiEntryDagInputFromRecordCatalog(items, canonicalSelectors);
materializeDagInputFromRootRecords(items, canonicalSelectors);
materializeMultiEntryDagInputFromRecordCatalogAsync(items, canonicalSelectors);
materializeDagInputFromRootRecordsAsync(items, canonicalSelectors);
materializeMultiEntryDagInputFromRecordCatalog(items, {
  selectVertexId: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  dependencies: undefined,
});
materializeMultiEntryDagInputFromRecordCatalog(items, {
  selectVertexId: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  completionDependencies: undefined,
});
materializeDagInputFromRootRecords(items, {
  selectVertexId: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  dependencies: undefined,
});
materializeDagInputFromRootRecords(items, {
  selectVertexId: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  completionDependencies: undefined,
});
materializeMultiEntryDagInputFromRecordCatalogAsync(items, {
  selectVertexId: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  dependencies: undefined,
});
materializeMultiEntryDagInputFromRecordCatalogAsync(items, {
  selectVertexId: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  completionDependencies: undefined,
});
materializeDagInputFromRootRecordsAsync(items, {
  selectVertexId: (item) => item.id,
  // @ts-expect-error Retired selector names cannot silently drop prerequisite edges.
  dependencies: undefined,
});
materializeDagInputFromRootRecordsAsync(items, {
  selectVertexId: (item) => item.id,
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
