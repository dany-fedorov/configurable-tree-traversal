import {
  BreadthFirstTraversal,
  BreadthFirstTraversalOrder as Order,
  traverseBreadthFirst,
} from '../src/traversals/breadth-first-traversal';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import {
  TraversalVisitorCommandName as Command,
  TraversalVisitorFunctionResolutionStyle as Style,
} from '../src/core/TraversalVisitor';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import type { TraversableTree } from '../src/core/TraversableTree';

type Node = { $d: string; $c: (Node | null)[] };
type TTP = TreeTypeParameters<string, Node | null>;

const node = ($d: string, ...$c: (Node | null)[]): Node => ({ $d, $c });

function setup(
  root: Node | null = node(
    'A',
    node('B', node('D'), node('E')),
    node('C', node('F'), node('G')),
  ),
) {
  const calls: string[] = [];
  const tree: TraversableTree<TTP> = {
    makeRoot: () => {
      calls.push('root');
      return { vertexContent: root };
    },
    makeVertex: (hint) => {
      calls.push(`vertex:${hint?.$d ?? 'null'}`);
      return { vertexContent: hint };
    },
  };
  return {
    calls,
    tree,
    traversal: new BreadthFirstTraversal<TTP>({ traversableTree: tree }),
  };
}

const yieldedValues = (
  runner: ReturnType<
    typeof setup
  >['traversal'] extends BreadthFirstTraversal<TTP>
    ? ReturnType<BreadthFirstTraversal<TTP>['makeRunner']>
    : never,
) => [...runner.getIterable()].map((event) => event.vertex.getData());

describe('breadth-first traversal', () => {
  test('visits vertices in hand-checked level order', () => {
    expect(yieldedValues(setup().traversal.makeRunner())).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
    ]);
  });

  test('resolves the root and children lazily', () => {
    const { traversal, calls } = setup();
    const runner = traversal.makeRunner();
    expect(calls).toEqual([]);
    const iterator = runner.getIterable();
    expect(calls).toEqual([]);
    expect(iterator.next().value?.vertex.getData()).toBe('A');
    expect(calls).toEqual(['root']);
    expect(iterator.next().value?.vertex.getData()).toBe('B');
    expect(calls).toEqual(['root', 'vertex:B']);
    iterator.return?.(undefined);
    expect(runner.getStatus()).toBe(Status.HALTED);
  });

  test('finishes an empty tree without resolving children', () => {
    const { traversal, calls } = setup(null);
    const runner = traversal.makeRunner();
    expect([...runner.getIterable()]).toEqual([]);
    expect(calls).toEqual(['root']);
    expect(runner.getStatus()).toBe(Status.FINISHED);
    expect(runner.getResolvedTree().getRoot()).toBeNull();
  });

  test('sorts a copy of each hint list and skips null results', () => {
    const root = node('root', node('b'), null, node('a'));
    const { traversal } = setup(root);
    traversal.configure({
      sortChildrenHints: (hints) => hints.reverse(),
    });
    expect(yieldedValues(traversal.makeRunner())).toEqual(['root', 'a', 'b']);
    expect(root.$c.map((child) => child?.$d ?? null)).toEqual(['b', null, 'a']);
  });

  test('orders visitors by priority and preserves them across configure', () => {
    const { traversal } = setup(node('root'));
    const visits: string[] = [];
    traversal.addVisitorFor(
      Order.LEVEL_ORDER,
      () => {
        visits.push('low');
      },
      { priority: 1 },
    );
    traversal.addVisitorFor(
      Order.LEVEL_ORDER,
      () => {
        visits.push('high-first');
      },
      { priority: 2 },
    );
    traversal.addVisitorFor(
      Order.LEVEL_ORDER,
      () => {
        visits.push('high-second');
      },
      { priority: 2 },
    );
    traversal.configure({ sortChildrenHints: null });
    const runner = traversal.makeRunner();
    traversal.addVisitorFor(Order.LEVEL_ORDER, () => {
      visits.push('late');
    });
    runner.run();
    expect(visits).toEqual(['high-first', 'high-second', 'low']);
  });

  test('rewrites hints before children are scheduled', () => {
    const { traversal } = setup(node('root', node('old'), node('sibling')));
    traversal.addVisitorFor(Order.LEVEL_ORDER, (vertex) =>
      vertex.getData() === 'root'
        ? {
            commands: [
              {
                commandName: Command.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
                commandArguments: { newHints: [node('new')] },
              },
            ],
          }
        : undefined,
    );
    expect(yieldedValues(traversal.makeRunner())).toEqual(['root', 'new']);
  });

  test.each([
    [Command.DISABLE_SUBTREE_TRAVERSAL],
    [Command.DELETE_VERTEX],
  ] as const)(
    '%s suppresses descendants while later siblings continue',
    (commandName) => {
      const { traversal } = setup(
        node('root', node('branch', node('hidden')), node('sibling')),
      );
      traversal.addVisitorFor(Order.LEVEL_ORDER, (vertex) =>
        vertex.getData() === 'branch'
          ? { commands: [{ commandName }] }
          : undefined,
      );
      const runner = traversal.makeRunner();
      expect(yieldedValues(runner)).toEqual(
        commandName === Command.DELETE_VERTEX
          ? ['root', 'sibling']
          : ['root', 'branch', 'sibling'],
      );
      const rootRef = runner.getResolvedTree().getRoot();
      expect(
        rootRef &&
          runner
            .getResolvedTree()
            .getChildrenOf(rootRef)
            ?.map((ref) => ref.unref().getData()),
      ).toEqual(
        commandName === Command.DELETE_VERTEX
          ? ['sibling']
          : ['branch', 'sibling'],
      );
    },
  );

  test('deleting the root skips all child resolution and clears the resolved root', () => {
    const { traversal, calls } = setup(node('root', node('hidden')));
    traversal.addVisitorFor(Order.LEVEL_ORDER, () => ({
      commands: [{ commandName: Command.DELETE_VERTEX }],
    }));
    const runner = traversal.makeRunner();
    expect([...runner.getIterable()]).toEqual([]);
    expect(calls).toEqual(['root']);
    expect(runner.getResolvedTree().getRoot()).toBeNull();
  });

  test('halts with no yielded orders and resumes the remaining visitor chain', () => {
    const { traversal } = setup(node('root', node('child')));
    const visits: string[] = [];
    traversal.addVisitorFor(Order.LEVEL_ORDER, (vertex) => {
      visits.push(`first:${vertex.getData()}`);
      return vertex.getData() === 'root'
        ? { commands: [{ commandName: Command.HALT_TRAVERSAL }] }
        : undefined;
    });
    traversal.addVisitorFor(Order.LEVEL_ORDER, (vertex) => {
      visits.push(`second:${vertex.getData()}`);
    });
    const runner = traversal.makeRunner();
    runner.run({ iterateOver: [] });
    expect(runner.getStatus()).toBe(Status.HALTED);
    expect(visits).toEqual(['first:root']);
    runner.run();
    expect(runner.getStatus()).toBe(Status.FINISHED);
    expect(visits).toEqual([
      'first:root',
      'second:root',
      'first:child',
      'second:child',
    ]);
  });

  test('preserves the pending chain through repeated visitor halts', () => {
    const { traversal } = setup(node('root'));
    const visits: number[] = [];
    for (let index = 0; index < 3; index++) {
      traversal.addVisitorFor(Order.LEVEL_ORDER, () => {
        visits.push(index);
        return { commands: [{ commandName: Command.HALT_TRAVERSAL }] };
      });
    }
    const runner = traversal.makeRunner();
    for (let index = 0; index < 3; index++) {
      runner.run({ iterateOver: [] });
      expect(runner.getStatus()).toBe(Status.HALTED);
      expect(visits).toEqual(Array.from({ length: index + 1 }, (_, i) => i));
    }
    runner.run({ iterateOver: [] });
    expect(runner.getStatus()).toBe(Status.FINISHED);
    expect(visits).toEqual([0, 1, 2]);
  });

  test('applies new iterable filters after a consumer break', () => {
    const { traversal } = setup(node('root', node('child')));
    const visits: string[] = [];
    traversal.addVisitorFor(Order.LEVEL_ORDER, (vertex) => {
      visits.push(vertex.getData());
    });
    const runner = traversal.makeRunner();
    for (const _event of runner.getIterable({
      disableVisitorFunctionsFor: [Order.LEVEL_ORDER],
    }))
      break;
    expect(runner.getStatus()).toBe(Status.HALTED);
    expect(visits).toEqual([]);
    expect([
      ...runner.getIterable({
        iterateOver: [],
        enableVisitorFunctionsFor: [Order.LEVEL_ORDER],
      }),
    ]).toEqual([]);
    expect(visits).toEqual(['child']);
  });

  test('shares concurrent snapshots and sequential chain state semantics', () => {
    const { traversal } = setup(node('root'));
    const seen: unknown[] = [];
    traversal.addVisitorFor(
      Order.LEVEL_ORDER,
      (vertex) => {
        seen.push(vertex.getData());
        return {
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'changed' },
            },
          ],
        };
      },
      { resolutionStyle: Style.CONCURRENT },
    );
    traversal.addVisitorFor(
      Order.LEVEL_ORDER,
      (vertex) => {
        seen.push(vertex.getData());
      },
      { resolutionStyle: Style.CONCURRENT },
    );
    traversal.addVisitorFor(Order.LEVEL_ORDER, (vertex) => {
      seen.push(vertex.getData());
      return {
        commands: [
          {
            commandName: Command.SET_VERTEX_VISITORS_CHAIN_STATE,
            commandArguments: { vertexVisitorsChainState: 42 },
          },
        ],
      };
    });
    traversal.addVisitorFor(Order.LEVEL_ORDER, (_vertex, options) => {
      seen.push(options.vertexVisitorsChainState);
    });
    traversal.makeRunner().run();
    expect(seen).toEqual(['root', 'root', 'changed', 42]);
  });

  test('keeps an original resolved tree after data rewrite and deletion', () => {
    const { traversal } = setup(node('root', node('deleted'), node('kept')));
    let savedLabels: string[] = [];
    traversal.configure({ saveNotMutatedResolvedTree: true });
    traversal.addVisitorFor(Order.LEVEL_ORDER, (vertex, options) => {
      if (vertex.getData() === 'root') {
        return {
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'changed-root' },
            },
          ],
        };
      }
      if (vertex.getData() === 'deleted') {
        return { commands: [{ commandName: Command.DELETE_VERTEX }] };
      }
      const saved = options.notMutatedResolvedTree;
      const savedRoot = saved?.getRoot();
      savedLabels = savedRoot
        ? [savedRoot, ...(saved?.getChildrenOf(savedRoot) ?? [])].map((ref) =>
            ref.unref().getData(),
          )
        : [];
      return undefined;
    });
    const runner = traversal.makeRunner().run();
    expect(savedLabels).toEqual(['root', 'deleted', 'kept']);
    expect(runner.getResolvedTree().getRoot()?.unref().getData()).toBe(
      'changed-root',
    );
  });

  test('throws for simultaneous iterators and propagates callback errors', () => {
    const activeRunner = setup(
      node('root', node('child')),
    ).traversal.makeRunner();
    const first = activeRunner.getIterable();
    expect(first.next().value?.vertex.getData()).toBe('root');
    const second = activeRunner.getIterable();
    expect(() => second.next()).toThrow(/one active iterator/i);
    first.return?.(undefined);

    const { traversal } = setup(node('root'));
    traversal.addVisitorFor(Order.LEVEL_ORDER, () => {
      throw new Error('visitor failed');
    });
    expect(() => traversal.makeRunner().run()).toThrow('visitor failed');
  });

  test('the convenience helper accepts a null visitor and completed runners are reusable', () => {
    const { tree } = setup(node('root', node('child')));
    const runner = traverseBreadthFirst(tree, null);
    expect(runner.getStatus()).toBe(Status.FINISHED);
    expect(runner.getResolvedTree().getRoot()?.unref().getData()).toBe('root');
    runner.run();
    expect(runner.getStatus()).toBe(Status.FINISHED);
  });

  test('handles a wide queue without recursive calls', () => {
    const root = node(
      'root',
      ...Array.from({ length: 20_000 }, (_, i) => node(String(i))),
    );
    const { traversal } = setup(root);
    let count = 0;
    traversal.addVisitorFor(Order.LEVEL_ORDER, () => {
      count++;
    });
    const runner = traversal.makeRunner().run({ iterateOver: [] });
    expect(count).toBe(20_001);
    expect(runner.state.queue).toEqual([]);
    expect(runner.state.queueIndex).toBe(0);
  });
});
