import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  DagTraversal,
  DepthFirstTreeTraversal,
  DepthFirstPhase,
  ObjectTreeSource,
  createObjectMutationBinder,
  rewriteObject,
  traverseTreeDepthFirst,
  TraversalVisitorCommandName as Command,
  type DagDiscoverySource,
  type TreeSource,
  type Vertex,
  type VertexTypes,
  type ObjectTreeVertexTypes,
  type ObjectCurrentVertexTypes,
} from '../src';

test('owned and composed object sources resolve explicitly declared union hints and preserve original records', () => {
  type Input = ObjectTreeVertexTypes<'input' | 'output', number | string>;
  type Output = ObjectTreeVertexTypes<'output', string>;
  type Current = ObjectCurrentVertexTypes<Input, Output>;
  for (const owned of [true, false]) {
    const input = { key: 'input' as const, value: 1 };
    const extra = { key: 'output' as const, value: 'discovered' };
    const hints: Input['VertexHint'][] = [input, extra];
    const seen: Input['VertexHint'][] = [];
    const discovered: Current['VertexData'][] = [];
    const binder = createObjectMutationBinder<Input, Output>();
    const options = {
      getRootPropertyFromInputObject: () => ({
        key: 'input' as const,
        value: 0,
      }),
      getChildrenOfProperty: () => [],
      resolveVertexHook: (hint: Input['VertexHint']) => {
        seen.push(hint);
        return { kind: 'useDefault' as const };
      },
    };
    const visitors = {
      [DepthFirstPhase.PRE_ORDER]: (
        vertex: Vertex<Current>,
        context: Parameters<typeof binder>[1],
      ) => {
        discovered.push(vertex.getData());
        expect(
          context.originalTreeView!.getRoot()!.getValue().getData(),
        ).toEqual({ key: 'input', value: 0 });
        return context.isTreeRoot
          ? {
              commands: [
                binder(vertex, context).makeMutationCommand({
                  rewrite: { value: 'rewritten parent' },
                }),
                {
                  commandName: Command.REWRITE_CHILD_HINTS as const,
                  commandArguments: { newHints: hints },
                },
              ],
            }
          : undefined;
      },
    };
    const runner = owned
      ? rewriteObject<
          number,
          'input' | 'output',
          number | string,
          unknown,
          'output',
          string
        >(0, { ...options, visitors, retainOriginalTreeStructure: true })
          .traversalRunner
      : traverseTreeDepthFirst<Input, Current>({
          traversableTree: new ObjectTreeSource<
            number,
            'input' | 'output',
            number | string,
            'output',
            string
          >(0, options),
          visitors,
          retainOriginalTreeStructure: true,
        });
    expect(seen).toEqual([input, extra]);
    expect(seen[0]).toBe(input);
    expect(seen[1]).toBe(extra);
    const view = runner.getResolvedTreeView();
    expect(view.getRoot()!.getValue().getData()).toEqual({
      key: 'input',
      value: 'rewritten parent',
    });
    const children = view.getChildrenOf(view.getRoot()!)!;
    expect(children[0]!.getValue().getData()).toEqual(input);
    expect(discovered[1]).toBe(input);
    expect(children[1]!.getValue().getData()).toEqual(extra);
    expect(discovered[2]).toBe(extra);
  }
});

for (const asyncMode of [false, true]) {
  for (const family of ['dfs', 'bfs', 'dag']) {
    test(`${
      asyncMode ? 'async' : 'sync'
    } ${family} keeps union hints, live context, input snapshots and identity distinct`, async () => {
      type Data = { value: number };
      type Hint = 'lookup' | { data: Data };
      type T = VertexTypes<Data, Hint>;
      type R = VertexTypes<{ rewritten: string }, boolean>;
      type ID = object | undefined;
      const rootData = { value: 0 };
      const lookupData = { value: 1 };
      const inline = { data: { value: 2 } };
      const rootId = {};
      const inlineId = {};
      const rewritten = { rewritten: 'parent' };
      const observedHints: Hint[] = [];
      const observedData: (T | R)['VertexData'][] = [];
      const originalParents: Data[] = [];
      const currentParents: (T | R)['VertexData'][] = [];
      const visit = (vertex: Vertex<T | R>) => {
        const data = vertex.getData();
        observedData.push(data);
        return data === rootData
          ? {
              commands: [
                {
                  commandName: Command.REWRITE_VERTEX_DATA as const,
                  commandArguments: { newData: rewritten },
                },
                {
                  commandName: Command.REWRITE_CHILD_HINTS as const,
                  commandArguments: { newHints: ['lookup', inline] as Hint[] },
                },
              ],
            }
          : undefined;
      };
      const content = (hint: Hint) => {
        observedHints.push(hint);
        return {
          $data: hint === 'lookup' ? lookupData : hint.data,
          $childHints: [],
        };
      };
      const tree: TreeSource<T, R> = {
        resolveRoot: () => ({
          kind: 'found',
          vertex: { vertexContent: { $data: rootData, $childHints: [] } },
        }),
        resolveChild: (hint, context) => {
          currentParents.push(
            context.resolutionContext.parentVertexRef.getValue().getData(),
          );
          originalParents.push(
            context.originalTreeView!.getRoot()!.getValue().getData(),
          );
          return { kind: 'found', vertex: { vertexContent: content(hint) } };
        },
      };
      const graph: DagDiscoverySource<T, R, ID> = {
        resolveRoot: () => ({
          kind: 'found',
          vertex: {
            vertexId: rootId,
            vertexContent: { $data: rootData, $childHints: [] },
          },
        }),
        getVertexIdFromHint: (hint) => ({
          vertexId: hint === 'lookup' ? undefined : inlineId,
        }),
        resolveChild: (hint, context) => {
          currentParents.push(
            context.resolutionContext.parentVertexRef.getValue().getData(),
          );
          originalParents.push(
            context
              .originalGraphView!.getVertexRefById(rootId)!
              .getValue()
              .getData(),
          );
          return {
            kind: 'found',
            vertex: {
              vertexId: hint === 'lookup' ? undefined : inlineId,
              vertexContent: content(hint),
            },
          };
        },
      };
      // Actual async resolvers exercise the async protocol, not only sync-source admission.
      const asyncTree = {
        resolveRoot: async () => tree.resolveRoot(),
        resolveChild: async (...args: Parameters<typeof tree.resolveChild>) =>
          tree.resolveChild(...args),
      };
      const asyncGraph = {
        ...graph,
        resolveRoot: async () => graph.resolveRoot(),
        resolveChild: async (...args: Parameters<typeof graph.resolveChild>) =>
          graph.resolveChild(...args),
      };
      const treeOptions = {
        traversableTree: tree,
        retainOriginalTreeStructure: true,
      };
      const asyncTreeOptions = {
        traversableTree: asyncTree,
        retainOriginalTreeStructure: true,
      };
      if (family === 'dfs') {
        const visitors = { PRE_ORDER: visit };
        if (asyncMode)
          await new AsyncDepthFirstTreeTraversal<T, R>({
            ...asyncTreeOptions,
            visitors,
          })
            .createRunner()
            .run();
        else
          new DepthFirstTreeTraversal<T, R>({ ...treeOptions, visitors })
            .createRunner()
            .run();
      } else if (family === 'bfs') {
        const visitors = { LEVEL_ORDER: visit };
        if (asyncMode)
          await new AsyncBreadthFirstTreeTraversal<T, R>({
            ...asyncTreeOptions,
            visitors,
          })
            .createRunner()
            .run();
        else
          new BreadthFirstTreeTraversal<T, R>({ ...treeOptions, visitors })
            .createRunner()
            .run();
      } else {
        const visitors = { ON_WORK_READY: visit };
        const options = { retainOriginalGraphStructure: true, visitors };
        const runner = asyncMode
          ? new AsyncDagTraversal<T, R, ID>({
              ...options,
              traversableGraph: asyncGraph,
            }).createRunner()
          : new DagTraversal<T, R, ID>({
              ...options,
              traversableGraph: graph,
            }).createRunner();
        await runner.run();
        expect(
          runner
            .getResolvedGraph()
            .getVertexRefById(undefined)!
            .getValue()
            .getData(),
        ).toBe(lookupData);
        expect(
          runner
            .getResolvedGraph()
            .getVertexRefById(inlineId)!
            .getValue()
            .getData(),
        ).toBe(inline.data);
      }
      expect(observedHints).toEqual(['lookup', inline]);
      expect(observedHints[1]).toBe(inline);
      expect(observedData).toEqual([rootData, lookupData, inline.data]);
      expect(observedData[1]).toBe(lookupData);
      expect(observedData[2]).toBe(inline.data);
      expect(currentParents).toEqual([rewritten, rewritten]);
      expect(currentParents[0]).toBe(rewritten);
      expect(originalParents).toEqual([rootData, rootData]);
      expect(originalParents[0]).toBe(rootData);
    });
  }
}
