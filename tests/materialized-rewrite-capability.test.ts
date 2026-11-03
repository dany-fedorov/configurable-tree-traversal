import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase,
  TraversalVisitorCommandName as Command,
  materializeMultiEntryDagInputFromRecordCatalog,
  materializeMultiEntryDagInputFromRecordCatalogAsync,
  materializeDagInputFromRootRecords,
  materializeDagInputFromRootRecordsAsync,
  discoverValidateAndCaptureDag,
  discoverValidateAndCaptureDagAsync,
  type VertexDataAndChildHintTypes,
  type DagVisitor,
} from '../src';

type ID = object | undefined;
type Item = { id: ID; label: string; children: Item[] };
type Input = VertexDataAndChildHintTypes<Item, ID>;
type Output = VertexDataAndChildHintTypes<string, ID>;

for (const factory of ['records', 'roots', 'asyncRecords', 'asyncRoots']) {
  for (const asyncRunner of [false, true]) {
    test(`${factory} supports ${
      asyncRunner ? 'async' : 'sync'
    } disjoint rewrites without changing source records, IDs or originals`, async () => {
      const rootId = {};
      const child: Item = { id: undefined, label: 'child', children: [] };
      const root: Item = { id: rootId, label: 'root', children: [child] };
      const records = [root, child];
      const recordSelectors = {
        selectVertexId: (item: Item) => item.id,
        selectStructuralChildVertexIds: (item: Item) =>
          item.children.map((item) => item.id),
      };
      const rootSelectors = {
        selectVertexId: (item: Item) => item.id,
        selectStructuralChildRecords: (item: Item) => item.children,
      };
      const input =
        factory === 'records'
          ? materializeMultiEntryDagInputFromRecordCatalog(
              records,
              recordSelectors,
            )
          : factory === 'roots'
          ? materializeDagInputFromRootRecords([root], rootSelectors)
          : factory === 'asyncRecords'
          ? await materializeMultiEntryDagInputFromRecordCatalogAsync(records, {
              ...recordSelectors,
              selectVertexId: async (item) => item.id,
            })
          : await materializeDagInputFromRootRecordsAsync([root], {
              ...rootSelectors,
              selectVertexId: async (item) => item.id,
            });
      // Mutating caller topology after materialization cannot drop captured discovery.
      root.children.length = 0;
      records.length = 0;
      const visited: Item[] = [];
      const rewrite: DagVisitor<
        Input,
        Output,
        DagVisitorPhase.ON_WORK_READY,
        ID
      > = (vertex) => {
        const item = vertex.getVertexData();
        if (typeof item === 'string')
          throw new Error('Expected each discovered input record once');
        visited.push(item);
        return {
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: {
                replacementVertexData: `artifact:${item.label}`,
              },
            },
          ],
        };
      };
      const options = {
        ...input,
        retainDiscoveredGraphBeforeVisitorCommands: true,
        visitors: { [DagVisitorPhase.ON_WORK_READY]: rewrite },
      };
      const runner = asyncRunner
        ? new AsyncDagTraversalBuilder<Input, Output, ID>(
            options,
          ).createIndependentRunnerFromCurrentOptions()
        : new DagTraversalBuilder<Input, Output, ID>(
            options,
          ).createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      const graph = runner.getLiveResolvedGraphView();
      expect(graph.getVertexHandles()).toHaveLength(2);
      const rootRef = graph.getVertexHandleByIdOrNull(rootId)!;
      const childRef = graph.getVertexHandleByIdOrNull(undefined)!;
      expect(rootRef.getCurrentVertexView().getVertexData()).toBe(
        'artifact:root',
      );
      expect(childRef.getCurrentVertexView().getVertexData()).toBe(
        'artifact:child',
      );
      expect(graph.requireVertexId(rootRef)).toBe(rootId);
      expect(graph.requireVertexId(childRef)).toBeUndefined();
      expect(visited).toEqual([root, child]);
      expect(visited[0]).toBe(root);
      expect(visited[1]).toBe(child);
      const original = runner.preCommandDiscoveredGraphView!;
      expect(
        original
          .getVertexHandleByIdOrNull(rootId)!
          .getCurrentVertexView()
          .getVertexData(),
      ).toBe(root);
      expect(
        original
          .getVertexHandleByIdOrNull(undefined)!
          .getCurrentVertexView()
          .getVertexData(),
      ).toBe(child);
      expect(graph.getStructuralChildHandlesInSlotOrderOrNull(rootRef)).toEqual(
        [childRef],
      );

      // Reusing the materialized catalog in preparation retains input data and captured slots.
      const prepared = asyncRunner
        ? await discoverValidateAndCaptureDagAsync(input)
        : discoverValidateAndCaptureDag(input);
      if (prepared.kind !== 'valid')
        throw new Error('Expected a valid materialized input');
      const replay = prepared.validatedTopology
        .createIndependentRunnerFromValidatedTopology()
        .runUntilSuspendedOrTerminal();
      expect(
        replay
          .getLiveResolvedGraphView()
          .getVertexHandleByIdOrNull(rootId)!
          .getCurrentVertexView()
          .getVertexData(),
      ).toBe(root);
      expect(
        replay
          .getLiveResolvedGraphView()
          .getVertexHandleByIdOrNull(undefined)!
          .getCurrentVertexView()
          .getVertexData(),
      ).toBe(child);
      expect(
        prepared.validatedTopology.definition.vertexDeclarations.find(
          (vertex) => vertex.vertexId === rootId,
        )!.childDiscoverySlots,
      ).toEqual([{ kind: 'vertex', vertexId: undefined }]);
    });
  }
}
