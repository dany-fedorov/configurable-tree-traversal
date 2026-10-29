import {
  materializeDagInputFromRecords,
  materializeDagInputFromRecordsAsync,
  materializeDagInputFromRoots,
  materializeDagInputFromRootsAsync,
  DagTraversal,
  DagVisitorPhase,
  AsyncDagTraversal,
  traverseDag,
  traverseDagAsync,
  prepareDag,
  prepareDagAsync,
  TraversalVisitorCommandName as Command,
  type MaterializedDagInput,
  type VertexTypes,
  type DagDiscoverySource,
  type DagChildResolutionContext,
  ResolvedTreeStore,
  type ResolvedTreeVertexTypes,
  type TreeSource,
} from '../src';

type Item = { id: string };
type Input = VertexTypes<Item, string>;
type Output = VertexTypes<string, string>;

async function exercise(input: MaterializedDagInput<Item, string>) {
  const source: DagDiscoverySource<Input, Output, string> =
    input.traversableGraph;
  const direct = new DagTraversal<Input, Output, string>(input);
  const spread = new DagTraversal<Input, Output, string>({ ...input });
  const asyncDirect = new AsyncDagTraversal<Input, Output, string>(input);
  const asyncSpread = new AsyncDagTraversal<Input, Output, string>({
    ...input,
  });
  const helper = traverseDag<Input, Output, string>(input);
  const helperSpread = traverseDag<Input, Output, string>({ ...input });
  const asyncHelper = await traverseDagAsync<Input, Output, string>(input);
  const asyncHelperSpread = await traverseDagAsync<Input, Output, string>({
    ...input,
  });
  for (const traversal of [direct, spread, asyncDirect, asyncSpread]) {
    traversal.addVisitorFor(
      DagVisitorPhase.ON_WORK_READY,
      (vertex, context) => {
        const live: Item | string = vertex.getData();
        const original: Item = context
          .originalGraphView!.getVertexRefById('task')!
          .getValue()
          .getData();
        const id: string = context.resolvedGraphView.getVertexId(
          context.vertexRef,
        );
        // @ts-expect-error Explicit rewrite data includes strings, not only original items.
        const inputOnly: Item = vertex.getData();
        void [live, original, id, inputOnly];
        return {
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'artifact' },
            },
          ],
        };
      },
    );
  }
  for (const runner of [helper, helperSpread, asyncHelper, asyncHelperSpread]) {
    const data: Item | string = runner
      .getResolvedGraphView()
      .getVertexRefById('task')!
      .getValue()
      .getData();
    // @ts-expect-error The materialized source retains its actual string ID domain.
    runner.getResolvedGraphView().getVertexRefById(12);
    void data;
  }

  // Ordinary inference must remain precise when no rewrite domain is supplied.
  const inferred = new DagTraversal(input);
  const inferredAsync = new AsyncDagTraversal({ ...input });
  for (const traversal of [inferred, inferredAsync]) {
    traversal.addVisitorFor(
      DagVisitorPhase.ON_WORK_READY,
      (vertex, context) => {
        const data: Item = vertex.getData();
        const id: string = context.resolvedGraphView.getVertexId(
          context.vertexRef,
        );
        void [data, id];
      },
    );
    const data: Item = traversal
      .createRunner()
      .getResolvedGraphView()
      .getVertexRefById('task')!
      .getValue()
      .getData();
    // @ts-expect-error Inferred ID remains string, not unknown.
    traversal.createRunner().getResolvedGraphView().getVertexRefById(undefined);
    void data;
  }
  const inferredHelperData: Item = traverseDag(input)
    .getResolvedGraphView()
    .getVertexRefById('task')!
    .getValue()
    .getData();
  const inferredAsyncData: Item = (await traverseDagAsync(input))
    .getResolvedGraphView()
    .getVertexRefById('task')!
    .getValue()
    .getData();

  for (const prepared of [prepareDag(input), await prepareDagAsync(input)]) {
    if (prepared.kind === 'valid') {
      const item: Item = prepared.dag.definition.vertices[0]!.data;
      const id: string = prepared.dag.definition.vertices[0]!.vertexId;
      const replayed: Item = prepared.dag
        .createRunner()
        .getResolvedGraphView()
        .getVertexRefById('task')!
        .getValue()
        .getData();
      void [item, id, replayed];
    }
  }
  void [source, inferredHelperData, inferredAsyncData];
}

async function allFourFactories() {
  const items = [{ id: 'task' }];
  await exercise(
    materializeDagInputFromRecords(items, { id: (item) => item.id }),
  );
  await exercise(
    materializeDagInputFromRoots(items, { id: (item) => item.id }),
  );
  await exercise(
    await materializeDagInputFromRecordsAsync(items, {
      id: async (item) => item.id,
    }),
  );
  await exercise(
    await materializeDagInputFromRootsAsync(items, {
      id: async (item) => item.id,
    }),
  );
}
void allFourFactories;

// Direct source calls retain input results under a disjoint live context.
declare const input: MaterializedDagInput<Item, string>;
declare const context: DagChildResolutionContext<Input, Output, string>;
const resolution = input.traversableGraph.resolveChild('task', context);
if (resolution.kind === 'found') {
  const item: Item = resolution.vertex.vertexContent.$data;
  void item;
}

// This capability belongs to a source that can actually accept every live context.
declare const narrow: DagDiscoverySource<Input, Input, string>;
// @ts-expect-error A user callback requiring input-only live data is still unsafe.
new DagTraversal<Input, Output, string>({ traversableGraph: narrow });

// Analogous resolved-tree sources already expose a context-free child resolver.
const store = new ResolvedTreeStore<Input>();
const treeSource: TreeSource<ResolvedTreeVertexTypes<Input>, Output> = store;
void treeSource;

const falselyContextIndependent: MaterializedDagInput<Item, string> = {
  syntheticRoot: true,
  // @ts-expect-error A narrow user hook cannot acquire materializer capability by relabeling it.
  traversableGraph: narrow,
};
void falselyContextIndependent;

// A different rewrite-hint type never changes the materialized source's ID hints.
type DifferentOutput = VertexTypes<bigint, boolean>;
const independent: DagDiscoverySource<Input, DifferentOutput, string> =
  input.traversableGraph;
const differentTraversal = new DagTraversal<Input, DifferentOutput, string>(
  input,
);
const outputOnlyHints = () => ({
  commands: [
    {
      commandName: Command.REWRITE_CHILD_HINTS as const,
      commandArguments: { newHints: [true] },
    },
  ],
});
differentTraversal.addVisitorFor(
  DagVisitorPhase.ON_WORK_READY,
  // @ts-expect-error Polymorphic live contexts do not widen source-owned ID hints.
  outputOnlyHints,
);
void independent;

const objectId: object = {};
const arbitraryInput = materializeDagInputFromRecords(
  [{ id: objectId }, { id: undefined }],
  { id: (item) => item.id },
);
const arbitraryGraph = new DagTraversal(arbitraryInput)
  .createRunner()
  .getResolvedGraphView();
const arbitraryRef = arbitraryGraph.getVertexRefById(undefined)!;
const arbitraryData: { id: object | undefined } = arbitraryRef
  .getValue()
  .getData();
const arbitraryId: object | undefined =
  arbitraryGraph.getVertexId(arbitraryRef);
// @ts-expect-error Heterogeneous object/undefined identity inference does not admit numbers.
arbitraryGraph.getVertexRefById(1);
void [arbitraryData, arbitraryId];
