import {
  materializeMultiEntryDagInputFromRecordCatalog,
  materializeMultiEntryDagInputFromRecordCatalogAsync,
  materializeDagInputFromRootRecords,
  materializeDagInputFromRootRecordsAsync,
  DagTraversalBuilder,
  DagVisitorPhase,
  AsyncDagTraversalBuilder,
  traverseDag,
  traverseDagAsync,
  discoverValidateAndCaptureDag,
  discoverValidateAndCaptureDagAsync,
  TraversalVisitorCommandName as Command,
  type MaterializedDagTraversalInput,
  type VertexDataAndChildHintTypes,
  type DagDiscoverySource,
  type DagChildResolutionContext,
  MutableResolvedTreeStore,
  type StoredTreeReferenceVertexTypes,
  type TreeDiscoverySource,
} from 'configurable-tree-traversal';

type Item = { id: string };
type Input = VertexDataAndChildHintTypes<Item, string>;
type Output = VertexDataAndChildHintTypes<string, string>;

async function exercise(input: MaterializedDagTraversalInput<Item, string>) {
  const source: DagDiscoverySource<Input, Output, string> =
    input.dagDiscoverySource;
  const direct = new DagTraversalBuilder<Input, Output, string>(input);
  const spread = new DagTraversalBuilder<Input, Output, string>({ ...input });
  const asyncDirect = new AsyncDagTraversalBuilder<Input, Output, string>(
    input,
  );
  const asyncSpread = new AsyncDagTraversalBuilder<Input, Output, string>({
    ...input,
  });
  const helper = traverseDag<Input, Output, string>(input);
  const helperSpread = traverseDag<Input, Output, string>({ ...input });
  const asyncHelper = await traverseDagAsync<Input, Output, string>(input);
  const asyncHelperSpread = await traverseDagAsync<Input, Output, string>({
    ...input,
  });
  for (const traversal of [direct, spread, asyncDirect, asyncSpread]) {
    traversal.registerVisitorForPhase(
      DagVisitorPhase.ON_WORK_READY,
      (vertex, context) => {
        const live: Item | string = vertex.getVertexData();
        const original: Item = context
          .livePreCommandDiscoveredGraphView!.getVertexHandleByIdOrNull('task')!
          .getCurrentVertexView()
          .getVertexData();
        const id: string = context.liveResolvedGraphView.requireVertexId(
          context.vertexHandle,
        );
        // @ts-expect-error Explicit rewrite data includes strings, not only original items.
        const inputOnly: Item = vertex.getVertexData();
        void [live, original, id, inputOnly];
        return {
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: { replacementVertexData: 'artifact' },
            },
          ],
        };
      },
    );
  }
  for (const runner of [helper, helperSpread, asyncHelper, asyncHelperSpread]) {
    const data: Item | string = runner
      .getLiveResolvedGraphView()
      .getVertexHandleByIdOrNull('task')!
      .getCurrentVertexView()
      .getVertexData();
    // @ts-expect-error The materialized source retains its actual string ID domain.
    runner.getLiveResolvedGraphView().getVertexHandleByIdOrNull(12);
    void data;
  }

  // Ordinary inference must remain precise when no rewrite domain is supplied.
  const inferred = new DagTraversalBuilder(input);
  const inferredAsync = new AsyncDagTraversalBuilder({ ...input });
  for (const traversal of [inferred, inferredAsync]) {
    traversal.registerVisitorForPhase(
      DagVisitorPhase.ON_WORK_READY,
      (vertex, context) => {
        const data: Item = vertex.getVertexData();
        const id: string = context.liveResolvedGraphView.requireVertexId(
          context.vertexHandle,
        );
        void [data, id];
      },
    );
    const data: Item = traversal
      .createIndependentRunnerFromCurrentOptions()
      .getLiveResolvedGraphView()
      .getVertexHandleByIdOrNull('task')!
      .getCurrentVertexView()
      .getVertexData();
    traversal
      .createIndependentRunnerFromCurrentOptions()
      .getLiveResolvedGraphView()
      // @ts-expect-error Inferred ID remains string, not unknown.
      .getVertexHandleByIdOrNull(undefined);
    void data;
  }
  const inferredHelperData: Item = traverseDag(input)
    .getLiveResolvedGraphView()
    .getVertexHandleByIdOrNull('task')!
    .getCurrentVertexView()
    .getVertexData();
  const inferredAsyncData: Item = (await traverseDagAsync(input))
    .getLiveResolvedGraphView()
    .getVertexHandleByIdOrNull('task')!
    .getCurrentVertexView()
    .getVertexData();

  for (const prepared of [
    discoverValidateAndCaptureDag(input),
    await discoverValidateAndCaptureDagAsync(input),
  ]) {
    if (prepared.kind === 'valid') {
      const item: Item =
        prepared.validatedTopology.definition.vertexDeclarations[0]!.data;
      const id: string =
        prepared.validatedTopology.definition.vertexDeclarations[0]!.vertexId;
      const replayed: Item = prepared.validatedTopology
        .createIndependentRunnerFromValidatedTopology()
        .getLiveResolvedGraphView()
        .getVertexHandleByIdOrNull('task')!
        .getCurrentVertexView()
        .getVertexData();
      void [item, id, replayed];
    }
  }
  void [source, inferredHelperData, inferredAsyncData];
}

async function allFourFactories() {
  const items = [{ id: 'task' }];
  await exercise(
    materializeMultiEntryDagInputFromRecordCatalog(items, {
      selectVertexId: (item) => item.id,
    }),
  );
  await exercise(
    materializeDagInputFromRootRecords(items, {
      selectVertexId: (item) => item.id,
    }),
  );
  await exercise(
    await materializeMultiEntryDagInputFromRecordCatalogAsync(items, {
      selectVertexId: async (item) => item.id,
    }),
  );
  await exercise(
    await materializeDagInputFromRootRecordsAsync(items, {
      selectVertexId: async (item) => item.id,
    }),
  );
}
void allFourFactories;

// Direct source calls retain input results under a disjoint live context.
declare const input: MaterializedDagTraversalInput<Item, string>;
declare const context: DagChildResolutionContext<Input, Output, string>;
const resolution = input.dagDiscoverySource.resolveChildVertexFromHint('task', context);
if (resolution.kind === 'vertexResolved') {
  const item: Item =
    resolution.resolvedVertexInput.vertexContentInput.$vertexData;
  void item;
}

// This capability belongs to a source that can actually accept every live context.
declare const narrow: DagDiscoverySource<Input, Input, string>;
// @ts-expect-error A user callback requiring input-only live data is still unsafe.
new DagTraversalBuilder<Input, Output, string>({ dagDiscoverySource: narrow });

// Analogous resolved-tree sources already expose a context-free child resolver.
const store = new MutableResolvedTreeStore<Input>();
const treeSource: TreeDiscoverySource<
  StoredTreeReferenceVertexTypes<Input>,
  Output
> = store;
void treeSource;

const falselyContextIndependent: MaterializedDagTraversalInput<Item, string> = {
  sourceRootIsHiddenEntryHolder: true,
  // @ts-expect-error A narrow user hook cannot acquire materializer capability by relabeling it.
  dagDiscoverySource: narrow,
};
void falselyContextIndependent;

// A different rewrite-hint type never changes the materialized source's ID hints.
type DifferentOutput = VertexDataAndChildHintTypes<bigint, boolean>;
const independent: DagDiscoverySource<Input, DifferentOutput, string> =
  input.dagDiscoverySource;
const differentTraversal = new DagTraversalBuilder<
  Input,
  DifferentOutput,
  string
>(input);
const outputOnlyHints = () => ({
  commands: [
    {
      commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS as const,
      commandArguments: { replacementChildHints: [true] },
    },
  ],
});
differentTraversal.registerVisitorForPhase(
  DagVisitorPhase.ON_WORK_READY,
  // @ts-expect-error Polymorphic live contexts do not widen source-owned ID hints.
  outputOnlyHints,
);
void independent;

const objectId: object = {};
const arbitraryInput = materializeMultiEntryDagInputFromRecordCatalog(
  [{ id: objectId }, { id: undefined }],
  { selectVertexId: (item) => item.id },
);
const arbitraryGraph = new DagTraversalBuilder(arbitraryInput)
  .createIndependentRunnerFromCurrentOptions()
  .getLiveResolvedGraphView();
const arbitraryRef = arbitraryGraph.getVertexHandleByIdOrNull(undefined)!;
const arbitraryData: { id: object | undefined } = arbitraryRef
  .getCurrentVertexView()
  .getVertexData();
const arbitraryId: object | undefined =
  arbitraryGraph.requireVertexId(arbitraryRef);
// @ts-expect-error Heterogeneous object/undefined identity inference does not admit numbers.
arbitraryGraph.getVertexHandleByIdOrNull(1);
void [arbitraryData, arbitraryId];
