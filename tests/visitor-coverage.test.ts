import {
  BreadthFirstTreeVisitPhase,
  BreadthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase,
  DepthFirstTreeTraversalBuilder,
  TraversalRunnerStatus as Status,
  TraversalVisitorCommandName as Command,
  type VisitorCommandCommitTiming,
  type TreeVertexPhaseVisitorCallback,
  type VertexDataAndChildHintTypes,
} from '../src';

type Node = { $vertexData: string; $childDiscoveryHints: Node[] };
type Tree = VertexDataAndChildHintTypes<string, Node>;
type Visitor = TreeVertexPhaseVisitorCallback<
  Tree,
  Tree,
  DepthFirstTreeVisitPhase | BreadthFirstTreeVisitPhase
>;
const root: Node = { $vertexData: 'root', $childDiscoveryHints: [] };
const adapter = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: { vertexContentInput: root },
  }),
  resolveChildVertexFromHint: (hint: Node) => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: { vertexContentInput: hint },
  }),
};

describe.each(['depth-first', 'breadth-first'] as const)(
  '%s visitor group boundaries',
  (strategy) => {
    function makeTraversal() {
      const traversal =
        strategy === 'depth-first'
          ? new DepthFirstTreeTraversalBuilder<Tree>({
              treeDiscoverySource: adapter,
            })
          : new BreadthFirstTreeTraversalBuilder<Tree>({
              treeDiscoverySource: adapter,
            });
      const add = (
        visitor: Visitor,
        visitorCommandCommitTiming: VisitorCommandCommitTiming,
      ) => {
        if (traversal instanceof DepthFirstTreeTraversalBuilder) {
          traversal.registerVisitorCallbackForPhase(
            DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
            visitor,
            {
              visitorCommandCommitTiming,
            },
          );
        } else {
          traversal.registerVisitorCallbackForPhase(
            BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
            visitor,
            {
              visitorCommandCommitTiming,
            },
          );
        }
      };
      return { traversal, add };
    }

    test('rejects an unknown command commit mode during registration', () => {
      const { add } = makeTraversal();
      const calls: string[] = [];
      expect(() =>
        add(() => {
          calls.push('invalid');
        }, 'ASYNC' as VisitorCommandCommitTiming),
      ).toThrow(/unknown visitor command commit mode/i);
      expect(calls).toEqual([]);
    });

    test('a concurrent halt retains deferred commands and the pending sequential chain', () => {
      const { traversal, add } = makeTraversal();
      const calls: unknown[] = [];
      add((vertex) => {
        calls.push(['halt', vertex.getVertexData()]);
        return {
          commands: [
            { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
          ],
        };
      }, 'afterContiguousVisitorBatch');
      add((vertex) => {
        calls.push(['rewrite', vertex.getVertexData()]);
        return {
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: { replacementVertexData: 'rewritten' },
            },
            {
              commandName: Command.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
              commandArguments: { phaseChainState: 'group finished' },
            },
          ],
        };
      }, 'afterContiguousVisitorBatch');
      add((vertex, options) => {
        calls.push([
          'sequential',
          vertex.getVertexData(),
          options.currentVertexPhaseChainState,
        ]);
      }, 'afterEachVisitorCallback');
      const runner = traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal();

      expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
      expect(calls).toEqual([
        ['halt', 'root'],
        ['rewrite', 'root'],
      ]);
      expect(
        runner
          .getLiveResolvedTreeView()
          .getRootVertexHandleOrNull()
          ?.getCurrentVertexView()
          .getVertexData(),
      ).toBe('rewritten');

      runner.runUntilSuspendedOrTerminal();

      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
      expect(calls).toEqual([
        ['halt', 'root'],
        ['rewrite', 'root'],
        ['sequential', 'rewritten', 'group finished'],
      ]);
    });

    test('concurrent deletion completes the group and prevents sequential visits and events', () => {
      const { traversal, add } = makeTraversal();
      const calls: string[] = [];
      add(() => {
        calls.push('delete');
        return {
          commands: [
            {
              commandName:
                Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
            },
          ],
        };
      }, 'afterContiguousVisitorBatch');
      add((vertex) => {
        calls.push(vertex.getVertexData());
      }, 'afterContiguousVisitorBatch');
      add(() => {
        calls.push('must not run');
      }, 'afterEachVisitorCallback');
      const runner = traversal.createIndependentRunnerFromCurrentOptions();

      expect([
        ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
      ]).toEqual([]);
      expect(calls).toEqual(['delete', 'root']);
      expect(
        runner.getLiveResolvedTreeView().getRootVertexHandleOrNull(),
      ).toBeNull();
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    });
  },
);
