import {
  BreadthFirstPhase,
  BreadthFirstTreeTraversal,
  DepthFirstPhase,
  DepthFirstTreeTraversal,
  TraversalRunnerStatus as Status,
  TraversalVisitorCommandName as Command,
  type CommandCommitMode,
  type TreeVisitor,
  type VertexTypes,
} from '../src';

type Node = { $data: string; $childHints: Node[] };
type Tree = VertexTypes<string, Node>;
type Visitor = TreeVisitor<DepthFirstPhase | BreadthFirstPhase, Tree, Tree>;
const root: Node = { $data: 'root', $childHints: [] };
const adapter = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: { vertexContent: root },
  }),
  resolveChild: (hint: Node) => ({
    kind: 'found' as const,
    vertex: { vertexContent: hint },
  }),
};

describe.each(['depth-first', 'breadth-first'] as const)(
  '%s visitor group boundaries',
  (strategy) => {
    function makeTraversal() {
      const traversal =
        strategy === 'depth-first'
          ? new DepthFirstTreeTraversal<Tree>({ traversableTree: adapter })
          : new BreadthFirstTreeTraversal<Tree>({ traversableTree: adapter });
      const add = (visitor: Visitor, commandCommitMode: CommandCommitMode) => {
        if (traversal instanceof DepthFirstTreeTraversal) {
          traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, visitor, {
            commandCommitMode,
          });
        } else {
          traversal.addVisitorFor(BreadthFirstPhase.LEVEL_ORDER, visitor, {
            commandCommitMode,
          });
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
        }, 'ASYNC' as CommandCommitMode),
      ).toThrow(/unknown visitor command commit mode/i);
      expect(calls).toEqual([]);
    });

    test('a concurrent halt retains deferred commands and the pending sequential chain', () => {
      const { traversal, add } = makeTraversal();
      const calls: unknown[] = [];
      add((vertex) => {
        calls.push(['halt', vertex.getData()]);
        return { commands: [{ commandName: Command.PAUSE_TRAVERSAL }] };
      }, 'afterGroup');
      add((vertex) => {
        calls.push(['rewrite', vertex.getData()]);
        return {
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'rewritten' },
            },
            {
              commandName: Command.SET_VISITOR_CHAIN_STATE,
              commandArguments: { state: 'group finished' },
            },
          ],
        };
      }, 'afterGroup');
      add((vertex, options) => {
        calls.push(['sequential', vertex.getData(), options.visitorChainState]);
      }, 'afterEachVisitor');
      const runner = traversal.createRunner().run();

      expect(runner.getStatus()).toBe(Status.HALTED);
      expect(calls).toEqual([
        ['halt', 'root'],
        ['rewrite', 'root'],
      ]);
      expect(
        runner.getResolvedTreeStore().getRoot()?.getValue().getData(),
      ).toBe('rewritten');

      runner.run();

      expect(runner.getStatus()).toBe(Status.FINISHED);
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
        return { commands: [{ commandName: Command.DELETE_TREE_SUBTREE }] };
      }, 'afterGroup');
      add((vertex) => {
        calls.push(vertex.getData());
      }, 'afterGroup');
      add(() => {
        calls.push('must not run');
      }, 'afterEachVisitor');
      const runner = traversal.createRunner();

      expect([...runner.iterateEvents()]).toEqual([]);
      expect(calls).toEqual(['delete', 'root']);
      expect(runner.getResolvedTreeStore().getRoot()).toBeNull();
      expect(runner.getStatus()).toBe(Status.FINISHED);
    });
  },
);
