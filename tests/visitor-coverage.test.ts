import {
  BreadthFirstTraversal,
  BreadthFirstTraversalOrder,
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
  TraversalRunnerStatus as Status,
  TraversalVisitorCommandName as Command,
  TraversalVisitorFunctionResolutionStyle as Style,
  type TraversalVisitor,
  type TreeTypeParameters,
} from '../src';

type Node = { $d: string; $c: Node[] };
type Tree = TreeTypeParameters<string, Node>;
type Visitor = TraversalVisitor<
  DepthFirstTraversalOrder | BreadthFirstTraversalOrder,
  Tree,
  Tree
>;
const root: Node = { $d: 'root', $c: [] };
const adapter = {
  makeRoot: () => ({ vertexContent: root }),
  makeVertex: (hint: Node) => ({ vertexContent: hint }),
};

describe.each(['depth-first', 'breadth-first'] as const)(
  '%s visitor group boundaries',
  (strategy) => {
    function makeTraversal() {
      const traversal =
        strategy === 'depth-first'
          ? new DepthFirstTraversal<Tree>({ traversableTree: adapter })
          : new BreadthFirstTraversal<Tree>({ traversableTree: adapter });
      const add = (visitor: Visitor, resolutionStyle: Style) => {
        if (traversal instanceof DepthFirstTraversal) {
          traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, visitor, {
            resolutionStyle,
          });
        } else {
          traversal.addVisitorFor(
            BreadthFirstTraversalOrder.LEVEL_ORDER,
            visitor,
            {
              resolutionStyle,
            },
          );
        }
      };
      return { traversal, add };
    }

    test('rejects an unknown visitor style before running callbacks', () => {
      const { traversal, add } = makeTraversal();
      const calls: string[] = [];
      add(() => {
        calls.push('invalid');
      }, 'ASYNC' as Style);
      add(() => {
        calls.push('valid');
      }, Style.SEQUENTIAL);
      const runner = traversal.makeRunner();

      expect(() => runner.run()).toThrow(/unknown visitor resolution style/i);
      expect(calls).toEqual([]);
      expect(runner.getStatus()).toBe(Status.FAILED);
    });

    test('a concurrent halt retains deferred commands and the pending sequential chain', () => {
      const { traversal, add } = makeTraversal();
      const calls: unknown[] = [];
      add((vertex) => {
        calls.push(['halt', vertex.getData()]);
        return { commands: [{ commandName: Command.HALT_TRAVERSAL }] };
      }, Style.CONCURRENT);
      add((vertex) => {
        calls.push(['rewrite', vertex.getData()]);
        return {
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'rewritten' },
            },
            {
              commandName: Command.SET_VERTEX_VISITORS_CHAIN_STATE,
              commandArguments: { vertexVisitorsChainState: 'group finished' },
            },
          ],
        };
      }, Style.CONCURRENT);
      add((vertex, options) => {
        calls.push([
          'sequential',
          vertex.getData(),
          options.vertexVisitorsChainState,
        ]);
      }, Style.SEQUENTIAL);
      const runner = traversal.makeRunner().run();

      expect(runner.getStatus()).toBe(Status.HALTED);
      expect(calls).toEqual([
        ['halt', 'root'],
        ['rewrite', 'root'],
      ]);
      expect(runner.getResolvedTree().getRoot()?.unref().getData()).toBe(
        'rewritten',
      );

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
        return { commands: [{ commandName: Command.DELETE_VERTEX }] };
      }, Style.CONCURRENT);
      add((vertex) => {
        calls.push(vertex.getData());
      }, Style.CONCURRENT);
      add(() => {
        calls.push('must not run');
      }, Style.SEQUENTIAL);
      const runner = traversal.makeRunner();

      expect([...runner.getIterable()]).toEqual([]);
      expect(calls).toEqual(['delete', 'root']);
      expect(runner.getResolvedTree().getRoot()).toBeNull();
      expect(runner.getStatus()).toBe(Status.FINISHED);
    });
  },
);
