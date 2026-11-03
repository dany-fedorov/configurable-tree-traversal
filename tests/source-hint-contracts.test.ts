import type { VertexView } from '../src';
import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase,
  ObjectPropertyTreeSource,
  createObjectPropertyMutationHelperBinder,
  rewriteObject,
  runTreeDepthFirstUntilSuspendedOrTerminal,
  TraversalVisitorCommandName as Command,
  type DagDiscoverySource,
  type TreeDiscoverySource,
  type VertexDataAndChildHintTypes,
  type ObjectPropertyTreeVertexTypes,
  type LiveObjectPropertyVertexTypes,
} from '../src';

test('owned and composed object sources resolve explicitly declared union hints and preserve original records', () => {
  type Input = ObjectPropertyTreeVertexTypes<
    'input' | 'output',
    number | string
  >;
  type Output = ObjectPropertyTreeVertexTypes<'output', string>;
  type Current = LiveObjectPropertyVertexTypes<Input, Output>;
  for (const owned of [true, false]) {
    const input = { propertyKey: 'input' as const, propertyValue: 1 };
    const extra = {
      propertyKey: 'output' as const,
      propertyValue: 'discovered',
    };
    const hints: Input['ChildHint'][] = [input, extra];
    const seen: Input['ChildHint'][] = [];
    const discovered: Current['VertexData'][] = [];
    const binder = createObjectPropertyMutationHelperBinder<Input, Output>();
    const options = {
      mapInputToRootProperty: () => ({
        propertyKey: 'input' as const,
        propertyValue: 0,
      }),
      enumerateChildPropertyHints: () => [],
      resolveChildPropertyOrUseDefault: (hint: Input['ChildHint']) => {
        seen.push(hint);
        return { kind: 'useDefaultChildPropertyResolution' as const };
      },
    };
    const visitors = {
      [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: (
        vertex: VertexView<Current>,
        context: Parameters<typeof binder>[1],
      ) => {
        discovered.push(vertex.getVertexData());
        expect(
          context
            .preCommandDiscoveredTreeView!.getRootVertexHandleOrNull()!
            .getCurrentVertexView()
            .getVertexData(),
        ).toEqual({ propertyKey: 'input', propertyValue: 0 });
        return context.isTreeRoot
          ? {
              commands: [
                binder(vertex, context).createObjectPropertyMutationCommand({
                  kind: 'patchPropertyKeyOrValue',
                  propertyPatch: { propertyValue: 'rewritten parent' },
                }),
                {
                  commandName:
                    Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS as const,
                  commandArguments: { replacementChildHints: hints },
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
        >(0, {
          ...options,
          visitors,
          retainDiscoveredTreeBeforeVisitorCommands: true,
        }).traversalRunner
      : runTreeDepthFirstUntilSuspendedOrTerminal<Input, Current>({
          treeDiscoverySource: new ObjectPropertyTreeSource<
            number,
            'input' | 'output',
            number | string,
            'output',
            string
          >(0, options),
          visitors,
          retainDiscoveredTreeBeforeVisitorCommands: true,
        });
    expect(seen).toEqual([input, extra]);
    expect(seen[0]).toBe(input);
    expect(seen[1]).toBe(extra);
    const view = runner.getLiveResolvedTreeView();
    expect(
      view.getRootVertexHandleOrNull()!.getCurrentVertexView().getVertexData(),
    ).toEqual({
      propertyKey: 'input',
      propertyValue: 'rewritten parent',
    });
    const children = view.getChildVertexHandlesOrNull(
      view.getRootVertexHandleOrNull()!,
    )!;
    expect(children[0]!.getCurrentVertexView().getVertexData()).toEqual(input);
    expect(discovered[1]).toBe(input);
    expect(children[1]!.getCurrentVertexView().getVertexData()).toEqual(extra);
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
      type T = VertexDataAndChildHintTypes<Data, Hint>;
      type R = VertexDataAndChildHintTypes<{ rewritten: string }, boolean>;
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
      const visit = (vertex: VertexView<T | R>) => {
        const data = vertex.getVertexData();
        observedData.push(data);
        return data === rootData
          ? {
              commands: [
                {
                  commandName: Command.REPLACE_CURRENT_VERTEX_DATA as const,
                  commandArguments: { replacementVertexData: rewritten },
                },
                {
                  commandName:
                    Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS as const,
                  commandArguments: {
                    replacementChildHints: ['lookup', inline] as Hint[],
                  },
                },
              ],
            }
          : undefined;
      };
      const content = (hint: Hint) => {
        observedHints.push(hint);
        return {
          $vertexData: hint === 'lookup' ? lookupData : hint.data,
          $childDiscoveryHints: [],
        };
      };
      const tree: TreeDiscoverySource<T, R> = {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: rootData,
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildVertexFromHint: (hint, context) => {
          currentParents.push(
            context.childDiscoveryContext
              .parentVertexHandle!.getCurrentVertexView()
              .getVertexData(),
          );
          originalParents.push(
            context
              .preCommandDiscoveredTreeView!.getRootVertexHandleOrNull()!
              .getCurrentVertexView()
              .getVertexData(),
          );
          return {
            kind: 'vertexResolved',
            resolvedVertexInput: { vertexContentInput: content(hint) },
          };
        },
      };
      const graph: DagDiscoverySource<T, R, ID> = {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexId: rootId,
            vertexContentInput: {
              $vertexData: rootData,
              $childDiscoveryHints: [],
            },
          },
        }),
        tryGetVertexIdentityFromHint: (hint) => ({
          vertexId: hint === 'lookup' ? undefined : inlineId,
        }),
        resolveChildHint: (hint, context) => {
          currentParents.push(
            context.structuralChildResolution
              .parentVertexHandle!.getCurrentVertexView()
              .getVertexData(),
          );
          originalParents.push(
            context
              .preCommandDiscoveredGraphView!.getVertexHandleByIdOrNull(rootId)!
              .getCurrentVertexView()
              .getVertexData(),
          );
          return {
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexId: hint === 'lookup' ? undefined : inlineId,
              vertexContentInput: content(hint),
            },
          };
        },
      };
      // Actual async resolvers exercise the async protocol, not only sync-source admission.
      const asyncTree = {
        resolveRootVertex: async () => tree.resolveRootVertex(),
        resolveChildVertexFromHint: async (
          ...args: Parameters<typeof tree.resolveChildVertexFromHint>
        ) => tree.resolveChildVertexFromHint(...args),
      };
      const asyncGraph = {
        ...graph,
        resolveRootVertex: async () => graph.resolveRootVertex(),
        resolveChildHint: async (
          ...args: Parameters<typeof graph.resolveChildHint>
        ) => graph.resolveChildHint(...args),
      };
      const treeOptions = {
        treeDiscoverySource: tree,
        retainDiscoveredTreeBeforeVisitorCommands: true,
      };
      const asyncTreeOptions = {
        treeDiscoverySource: asyncTree,
        retainDiscoveredTreeBeforeVisitorCommands: true,
      };
      if (family === 'dfs') {
        const visitors = { BEFORE_CHILD_EXPANSION: visit };
        if (asyncMode)
          await new AsyncDepthFirstTreeTraversalBuilder<T, R>({
            ...asyncTreeOptions,
            visitors,
          })
            .createIndependentRunnerFromCurrentOptions()
            .runUntilSuspendedOrTerminal();
        else
          new DepthFirstTreeTraversalBuilder<T, R>({ ...treeOptions, visitors })
            .createIndependentRunnerFromCurrentOptions()
            .runUntilSuspendedOrTerminal();
      } else if (family === 'bfs') {
        const visitors = { AT_LEVEL_ORDER_VERTEX: visit };
        if (asyncMode)
          await new AsyncBreadthFirstTreeTraversalBuilder<T, R>({
            ...asyncTreeOptions,
            visitors,
          })
            .createIndependentRunnerFromCurrentOptions()
            .runUntilSuspendedOrTerminal();
        else
          new BreadthFirstTreeTraversalBuilder<T, R>({
            ...treeOptions,
            visitors,
          })
            .createIndependentRunnerFromCurrentOptions()
            .runUntilSuspendedOrTerminal();
      } else {
        const visitors = { ON_WORK_READY: visit };
        const options = {
          retainDiscoveredGraphBeforeVisitorCommands: true,
          visitors,
        };
        const runner = asyncMode
          ? new AsyncDagTraversalBuilder<T, R, ID>({
              ...options,
              dagDiscoverySource: asyncGraph,
            }).createIndependentRunnerFromCurrentOptions()
          : new DagTraversalBuilder<T, R, ID>({
              ...options,
              dagDiscoverySource: graph,
            }).createIndependentRunnerFromCurrentOptions();
        await runner.runUntilSuspendedOrTerminal();
        expect(
          runner
            .getLiveResolvedGraphView()
            .getVertexHandleByIdOrNull(undefined)!
            .getCurrentVertexView()
            .getVertexData(),
        ).toBe(lookupData);
        expect(
          runner
            .getLiveResolvedGraphView()
            .getVertexHandleByIdOrNull(inlineId)!
            .getCurrentVertexView()
            .getVertexData(),
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
