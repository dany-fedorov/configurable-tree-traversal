import {
  AsyncDagTraversal,
  DagTraversal,
  DagVisitorPhase,
  TraversalVisitorCommandName as Command,
  materializeDagInputFromRecords,
  materializeDagInputFromRecordsAsync,
  materializeDagInputFromRoots,
  materializeDagInputFromRootsAsync,
  prepareDag,
  prepareDagAsync,
  type VertexTypes,
  type DagVisitor,
} from '../src';

type ID = object | undefined;
type Item = { id: ID; label: string; children: Item[] };
type Input = VertexTypes<Item, ID>;
type Output = VertexTypes<string, ID>;

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
        id: (item: Item) => item.id,
        children: (item: Item) => item.children.map((item) => item.id),
      };
      const rootSelectors = {
        id: (item: Item) => item.id,
        children: (item: Item) => item.children,
      };
      const input =
        factory === 'records'
          ? materializeDagInputFromRecords(records, recordSelectors)
          : factory === 'roots'
          ? materializeDagInputFromRoots([root], rootSelectors)
          : factory === 'asyncRecords'
          ? await materializeDagInputFromRecordsAsync(records, {
              ...recordSelectors,
              id: async (item) => item.id,
            })
          : await materializeDagInputFromRootsAsync([root], {
              ...rootSelectors,
              id: async (item) => item.id,
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
        const item = vertex.getData();
        if (typeof item === 'string')
          throw new Error('Expected each discovered input record once');
        visited.push(item);
        return {
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: `artifact:${item.label}` },
            },
          ],
        };
      };
      const options = {
        ...input,
        retainOriginalGraphStructure: true,
        visitors: { [DagVisitorPhase.ON_WORK_READY]: rewrite },
      };
      const runner = asyncRunner
        ? new AsyncDagTraversal<Input, Output, ID>(options).createRunner()
        : new DagTraversal<Input, Output, ID>(options).createRunner();
      await runner.run();
      const graph = runner.getResolvedGraphView();
      expect(graph.getVertexRefs()).toHaveLength(2);
      const rootRef = graph.getVertexRefById(rootId)!;
      const childRef = graph.getVertexRefById(undefined)!;
      expect(rootRef.getValue().getData()).toBe('artifact:root');
      expect(childRef.getValue().getData()).toBe('artifact:child');
      expect(graph.requireVertexId(rootRef)).toBe(rootId);
      expect(graph.requireVertexId(childRef)).toBeUndefined();
      expect(visited).toEqual([root, child]);
      expect(visited[0]).toBe(root);
      expect(visited[1]).toBe(child);
      const original = runner.originalGraphView!;
      expect(original.getVertexRefById(rootId)!.getValue().getData()).toBe(
        root,
      );
      expect(original.getVertexRefById(undefined)!.getValue().getData()).toBe(
        child,
      );
      expect(graph.getChildrenOf(rootRef)).toEqual([childRef]);

      // Reusing the materialized catalog in preparation retains input data and captured slots.
      const prepared = asyncRunner
        ? await prepareDagAsync(input)
        : prepareDag(input);
      if (prepared.kind !== 'valid')
        throw new Error('Expected a valid materialized input');
      const replay = prepared.dag.createRunner().run();
      expect(
        replay
          .getResolvedGraphView()
          .getVertexRefById(rootId)!
          .getValue()
          .getData(),
      ).toBe(root);
      expect(
        replay
          .getResolvedGraphView()
          .getVertexRefById(undefined)!
          .getValue()
          .getData(),
      ).toBe(child);
      expect(
        prepared.dag.definition.vertices.find(
          (vertex) => vertex.vertexId === rootId,
        )!.slots,
      ).toEqual([{ kind: 'vertex', vertexId: undefined }]);
    });
  }
}
