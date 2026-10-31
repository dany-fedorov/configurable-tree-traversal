import { treeResolution } from './source-result-fixtures';
import type { TreeSource } from '../src/core/TraversableTree';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import {
  BreadthFirstPhase as Order,
  BreadthFirstTreeTraversal,
  traverseTreeBreadthFirst,
} from '../src/traversals/breadth-first-traversal';
import { runnerInternals } from './internal-runner-fixtures';

type Node = { $data: string; $childHints: (Node | null)[] };
type TTP = VertexTypes<string, Node | null>;

const node = ($data: string, ...$childHints: (Node | null)[]): Node => ({
  $data,
  $childHints,
});

function setup(
  root: Node | null = node(
    'A',
    node('B', node('D'), node('E')),
    node('C', node('F'), node('G')),
  ),
) {
  const calls: string[] = [];
  const tree: TreeSource<TTP> = {
    resolveRoot: () => {
      calls.push('root');
      return treeResolution(root);
    },
    resolveChild: (hint) => {
      calls.push(`vertex:${hint?.$data ?? 'null'}`);
      return treeResolution(hint);
    },
  };
  return {
    calls,
    tree,
    traversal: new BreadthFirstTreeTraversal<TTP>({ traversableTree: tree }),
  };
}

const yieldedValues = (
  runner: ReturnType<
    typeof setup
  >['traversal'] extends BreadthFirstTreeTraversal<TTP>
    ? ReturnType<BreadthFirstTreeTraversal<TTP>['createRunner']>
    : never,
) => [...runner.iterateEvents()].map((event) => event.vertex.getData());

describe('breadth-first traversal', () => {
  test('visits vertices in hand-checked level order', () => {
    expect(yieldedValues(setup().traversal.createRunner())).toEqual([
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
    const runner = traversal.createRunner();
    expect(calls).toEqual([]);
    const iterator = runner.iterateEvents();
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
    const runner = traversal.createRunner();
    expect([...runner.iterateEvents()]).toEqual([]);
    expect(calls).toEqual(['root']);
    expect(runner.getStatus()).toBe(Status.FINISHED);
    expect(runner.getResolvedTreeView().getRoot()).toBeNull();
  });

  test('sorts a copy of each hint list and skips null results', () => {
    const root = node('root', node('b'), null, node('a'));
    const { traversal } = setup(root);
    traversal.configure({
      transformChildHints: (hints) => hints.reverse(),
    });
    expect(yieldedValues(traversal.createRunner())).toEqual(['root', 'a', 'b']);
    expect(root.$childHints.map((child) => child?.$data ?? null)).toEqual([
      'b',
      null,
      'a',
    ]);
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
    traversal.configure({ transformChildHints: null });
    const runner = traversal.createRunner();
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
                commandName: Command.REWRITE_CHILD_HINTS,
                commandArguments: { newHints: [node('new')] },
              },
            ],
          }
        : undefined,
    );
    expect(yieldedValues(traversal.createRunner())).toEqual(['root', 'new']);
  });

  test.each([
    [Command.SKIP_REMAINING_CHILDREN],
    [Command.DELETE_TREE_SUBTREE],
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
      const runner = traversal.createRunner();
      expect(yieldedValues(runner)).toEqual(
        commandName === Command.DELETE_TREE_SUBTREE
          ? ['root', 'sibling']
          : ['root', 'branch', 'sibling'],
      );
      const rootRef = runner.getResolvedTreeView().getRoot();
      expect(
        rootRef &&
          runner
            .getResolvedTreeView()
            .getChildrenOf(rootRef)
            ?.map((ref) => ref.getValue().getData()),
      ).toEqual(
        commandName === Command.DELETE_TREE_SUBTREE
          ? ['sibling']
          : ['branch', 'sibling'],
      );
    },
  );

  test('deleting the root skips all child resolution and clears the resolved root', () => {
    const { traversal, calls } = setup(node('root', node('hidden')));
    traversal.addVisitorFor(Order.LEVEL_ORDER, () => ({
      commands: [{ commandName: Command.DELETE_TREE_SUBTREE }],
    }));
    const runner = traversal.createRunner();
    expect([...runner.iterateEvents()]).toEqual([]);
    expect(calls).toEqual(['root']);
    expect(runner.getResolvedTreeView().getRoot()).toBeNull();
  });

  test('halts with no yielded orders and resumes the remaining visitor chain', () => {
    const { traversal } = setup(node('root', node('child')));
    const visits: string[] = [];
    traversal.addVisitorFor(Order.LEVEL_ORDER, (vertex) => {
      visits.push(`first:${vertex.getData()}`);
      return vertex.getData() === 'root'
        ? { commands: [{ commandName: Command.PAUSE_TRAVERSAL }] }
        : undefined;
    });
    traversal.addVisitorFor(Order.LEVEL_ORDER, (vertex) => {
      visits.push(`second:${vertex.getData()}`);
    });
    const runner = traversal.createRunner();
    runner.run({ emitEvents: [] });
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
        return { commands: [{ commandName: Command.PAUSE_TRAVERSAL }] };
      });
    }
    const runner = traversal.createRunner();
    for (let index = 0; index < 3; index++) {
      runner.run({ emitEvents: [] });
      expect(runner.getStatus()).toBe(Status.HALTED);
      expect(visits).toEqual(Array.from({ length: index + 1 }, (_, i) => i));
    }
    runner.run({ emitEvents: [] });
    expect(runner.getStatus()).toBe(Status.FINISHED);
    expect(visits).toEqual([0, 1, 2]);
  });

  test('applies new iterable filters after a consumer break', () => {
    const { traversal } = setup(node('root', node('child')));
    const visits: string[] = [];
    traversal.addVisitorFor(Order.LEVEL_ORDER, (vertex) => {
      visits.push(vertex.getData());
    });
    const runner = traversal.createRunner();
    for (const _event of runner.iterateEvents({
      visitorPhases: { exclude: [Order.LEVEL_ORDER] },
    }))
      break;
    expect(runner.getStatus()).toBe(Status.HALTED);
    expect(visits).toEqual([]);
    expect([
      ...runner.iterateEvents({
        emitEvents: [],
        visitorPhases: { include: [Order.LEVEL_ORDER] },
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
      { commandCommitMode: 'afterGroup' as const },
    );
    traversal.addVisitorFor(
      Order.LEVEL_ORDER,
      (vertex) => {
        seen.push(vertex.getData());
      },
      { commandCommitMode: 'afterGroup' as const },
    );
    traversal.addVisitorFor(Order.LEVEL_ORDER, (vertex) => {
      seen.push(vertex.getData());
      return {
        commands: [
          {
            commandName: Command.SET_VISITOR_CHAIN_STATE,
            commandArguments: { state: 42 },
          },
        ],
      };
    });
    traversal.addVisitorFor(Order.LEVEL_ORDER, (_vertex, options) => {
      seen.push(options.visitorChainState);
    });
    traversal.createRunner().run();
    expect(seen).toEqual(['root', 'root', 'changed', 42]);
  });

  test('keeps an original resolved tree after data rewrite and deletion', () => {
    const { traversal } = setup(node('root', node('deleted'), node('kept')));
    let savedLabels: string[] = [];
    traversal.configure({ retainOriginalTreeStructure: true });
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
        return { commands: [{ commandName: Command.DELETE_TREE_SUBTREE }] };
      }
      const saved = options.originalTreeView;
      const savedRoot = saved?.getRoot();
      savedLabels = savedRoot
        ? [savedRoot, ...(saved?.getChildrenOf(savedRoot) ?? [])].map((ref) =>
            ref.getValue().getData(),
          )
        : [];
      return undefined;
    });
    const runner = traversal.createRunner().run();
    expect(savedLabels).toEqual(['root', 'deleted', 'kept']);
    expect(runner.getResolvedTreeView().getRoot()?.getValue().getData()).toBe(
      'changed-root',
    );
  });

  test('throws for simultaneous iterators and propagates callback errors', () => {
    const activeRunner = setup(
      node('root', node('child')),
    ).traversal.createRunner();
    const first = activeRunner.iterateEvents();
    expect(first.next().value?.vertex.getData()).toBe('root');
    const second = activeRunner.iterateEvents();
    expect(() => second.next()).toThrow(/one active iterator/i);
    first.return?.(undefined);

    const { traversal } = setup(node('root'));
    traversal.addVisitorFor(Order.LEVEL_ORDER, () => {
      throw new Error('visitor failed');
    });
    expect(() => traversal.createRunner().run()).toThrow('visitor failed');
  });

  test('the convenience helper accepts a null visitor and completed runners are reusable', () => {
    const { tree } = setup(node('root', node('child')));
    const runner = traverseTreeBreadthFirst({ traversableTree: tree });
    expect(runner.getStatus()).toBe(Status.FINISHED);
    expect(runner.getResolvedTreeView().getRoot()?.getValue().getData()).toBe(
      'root',
    );
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
    const runner = traversal.createRunner().run({ emitEvents: [] });
    expect(count).toBe(20_001);
    expect(runnerInternals(runner).state.queue).toEqual([]);
    expect(runnerInternals(runner).state.queueIndex).toBe(0);
  });
});
