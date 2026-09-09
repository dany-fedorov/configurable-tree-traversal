import { DepthFirstTraversal } from '../src/traversals/depth-first-traversal';
import { DepthFirstTraversalOrder as Order } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalOrder';
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
function traversal(
  root: Node | null = node(
    'F',
    node('B', node('A'), node('D', node('C'), node('E'))),
    node('G', null, node('I', node('H'))),
  ),
) {
  const tree: TraversableTree<TTP> = {
    makeRoot: () => ({ vertexContent: root }),
    makeVertex: (hint) => ({ vertexContent: hint }),
  };
  return new DepthFirstTraversal<TTP>({ traversableTree: tree });
}
const values = (
  runner: ReturnType<ReturnType<typeof traversal>['makeRunner']>,
  order: Order,
) =>
  [...runner.getIterable({ iterateOver: [order] })].map((event) =>
    event.vertex.getData(),
  );

describe('depth-first traversal', () => {
  test.each([
    [Order.PRE_ORDER, ['F', 'B', 'A', 'D', 'C', 'E', 'G', 'I', 'H']],
    [Order.IN_ORDER, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']],
    [Order.POST_ORDER, ['A', 'C', 'E', 'D', 'B', 'H', 'I', 'G', 'F']],
  ])('iterates %s without requiring visitor functions', (order, expected) => {
    expect(values(traversal().makeRunner(), order)).toEqual(expected);
  });

  test('finishes an empty tree', () => {
    const runner = traversal(null).makeRunner();
    expect([...runner.getIterable()]).toEqual([]);
    expect(runner.getStatus()).toBe(Status.FINISHED);
    expect(runner.getResolvedTree().getRoot()).toBeNull();
  });

  test('sorts copied hints before resolving children', () => {
    const root = node('root', node('b'), node('a'));
    const t = traversal(root).configure({
      sortChildrenHints: (hints) => hints.reverse(),
    });
    expect(values(t.makeRunner(), Order.PRE_ORDER)).toEqual(['root', 'a', 'b']);
    expect(root.$c.map((child) => child?.$d)).toEqual(['b', 'a']);
  });

  test('completes parents whose last hint resolves to null', () => {
    const t = traversal(
      node('root', node('branch', node('leaf'), null), node('last')),
    );
    const post: string[] = [];
    t.addVisitorFor(Order.POST_ORDER, (v) => {
      post.push(v.getData());
    });
    t.makeRunner().run();
    expect(post).toEqual(['leaf', 'branch', 'last', 'root']);
  });

  test('null hints do not require in-order visitors or count tracking', () => {
    const t = traversal(node('root', null, node('leaf'))).configure({
      inOrderTraversalConfig: { considerVisitAfterNullContentVertices: false },
    });
    expect(values(t.makeRunner(), Order.POST_ORDER)).toEqual(['leaf', 'root']);
  });

  test('disables only the listed visitors', () => {
    const t = traversal(node('root'));
    const visits: Order[] = [];
    for (const order of Object.values(Order))
      t.addVisitorFor(order, (_v, o) => {
        visits.push(o.order);
      });
    t.makeRunner().run({ disableVisitorFunctionsFor: [Order.PRE_ORDER] });
    expect(visits).toEqual([Order.IN_ORDER, Order.POST_ORDER]);
  });

  test('halts even if the halted order is not yielded and resumes remaining visitors', () => {
    const t = traversal(node('root', node('leaf')));
    const visits: string[] = [];
    t.addVisitorFor(Order.PRE_ORDER, (v) => {
      visits.push(`first:${v.getData()}`);
      if (v.getData() === 'root')
        return { commands: [{ commandName: Command.HALT_TRAVERSAL }] };
      return undefined;
    });
    t.addVisitorFor(Order.PRE_ORDER, (v) => {
      visits.push(`second:${v.getData()}`);
    });
    const runner = t.makeRunner();
    runner.run({ iterateOver: [] });
    expect(runner.getStatus()).toBe(Status.HALTED);
    expect(visits).toEqual(['first:root']);
    runner.run();
    expect(visits).toEqual([
      'first:root',
      'second:root',
      'first:leaf',
      'second:leaf',
    ]);
    expect(runner.getStatus()).toBe(Status.FINISHED);
    runner.run();
    expect(visits).toHaveLength(4);
  });

  test('changes iterator filters when resuming after a break', () => {
    const runner = traversal(node('root', node('leaf'))).makeRunner();
    for (const event of runner.getIterable({
      iterateOver: [Order.PRE_ORDER],
    })) {
      expect(event.vertex.getData()).toBe('root');
      break;
    }
    expect(runner.getStatus()).toBe(Status.HALTED);
    expect(values(runner, Order.POST_ORDER)).toEqual(['leaf', 'root']);
  });

  test('prunes a subtree but completes its parent', () => {
    const t = traversal(
      node('root', node('branch', node('hidden')), node('leaf')),
    );
    t.addVisitorFor(Order.PRE_ORDER, (v) =>
      v.getData() === 'branch'
        ? { commands: [{ commandName: Command.DISABLE_SUBTREE_TRAVERSAL }] }
        : undefined,
    );
    expect(values(t.makeRunner(), Order.POST_ORDER)).toEqual([
      'branch',
      'leaf',
      'root',
    ]);
  });

  test('rewrites hints repeatedly without deleting sibling hints', () => {
    const t = traversal(
      node('root', node('branch', node('old')), node('sibling')),
    );
    t.addVisitorFor(Order.PRE_ORDER, (v) =>
      v.getData() === 'branch'
        ? {
            commands: [
              {
                commandName: Command.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
                commandArguments: { newHints: [node('discard')] },
              },
              {
                commandName: Command.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
                commandArguments: { newHints: [node('new')] },
              },
            ],
          }
        : undefined,
    );
    expect(values(t.makeRunner(), Order.PRE_ORDER)).toEqual([
      'root',
      'branch',
      'new',
      'sibling',
    ]);
  });

  test('reports previous vertex and zero-based visit and visitor indices', () => {
    const t = traversal(node('root', node('leaf')));
    const seen: unknown[] = [];
    for (let i = 0; i < 2; i++)
      t.addVisitorFor(Order.PRE_ORDER, (_v, o) => {
        seen.push([
          o.vertexVisitIndex,
          o.curVertexVisitorVisitIndex,
          o.previousVisitedVertexRef?.unref().getData() ?? null,
        ]);
      });
    t.makeRunner().run();
    expect(seen).toEqual([
      [0, 0, null],
      [0, 1, null],
      [1, 0, 'root'],
      [1, 1, 'root'],
    ]);
  });

  test('concurrent visitors see original data; sequential visitors see commands and chain state', () => {
    const t = traversal(node('root'));
    const seen: unknown[] = [];
    t.addVisitorFor(
      Order.PRE_ORDER,
      (v) => {
        seen.push(v.getData());
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
    t.addVisitorFor(
      Order.PRE_ORDER,
      (v) => {
        seen.push(v.getData());
      },
      { resolutionStyle: Style.CONCURRENT },
    );
    t.addVisitorFor(Order.PRE_ORDER, (v) => {
      seen.push(v.getData());
      return {
        commands: [
          {
            commandName: Command.SET_VERTEX_VISITORS_CHAIN_STATE,
            commandArguments: { vertexVisitorsChainState: 42 },
          },
        ],
      };
    });
    t.addVisitorFor(Order.PRE_ORDER, (_v, o) => {
      seen.push(o.vertexVisitorsChainState);
    });
    t.makeRunner().run();
    expect(seen).toEqual(['root', 'root', 'changed', 42]);
  });

  test('configure preserves added visitors and runner visitors are isolated', () => {
    const t = traversal(node('root'));
    const seen: string[] = [];
    t.addVisitorFor(Order.PRE_ORDER, () => {
      seen.push('first');
    });
    t.configure({ sortChildrenHints: null });
    const runner = t.makeRunner();
    t.addVisitorFor(Order.PRE_ORDER, () => {
      seen.push('late');
    });
    runner.run();
    expect(seen).toEqual(['first']);
  });

  test('deleting a vertex removes its subtree and still visits siblings', () => {
    const t = traversal(
      node('root', node('branch', node('hidden')), node('sibling')),
    );
    t.addVisitorFor(Order.PRE_ORDER, (v) =>
      v.getData() === 'branch'
        ? { commands: [{ commandName: Command.DELETE_VERTEX }] }
        : undefined,
    );
    const runner = t.makeRunner().run();
    const tree = runner.getResolvedTree();
    expect(
      tree.getChildrenOf(tree.getRoot()!)?.map((ref) => ref.unref().getData()),
    ).toEqual(['sibling']);
  });

  test('traverses deep trees without recursive call-stack growth', () => {
    let root = node('20000');
    for (let i = 19999; i >= 0; i--) root = node(String(i), root);
    const t = traversal(root);
    let count = 0;
    t.addVisitorFor(Order.POST_ORDER, () => {
      count++;
    });
    t.makeRunner().run({ iterateOver: [] });
    expect(count).toBe(20001);
  });
});

test('passes chain state from concurrent commands to the first sequential visitor', () => {
  const t = traversal(node('root'));
  let seen: unknown;
  t.addVisitorFor(
    Order.PRE_ORDER,
    () => ({
      commands: [
        {
          commandName: Command.SET_VERTEX_VISITORS_CHAIN_STATE,
          commandArguments: { vertexVisitorsChainState: 42 },
        },
      ],
    }),
    { resolutionStyle: Style.CONCURRENT },
  );
  t.addVisitorFor(Order.PRE_ORDER, (_vertex, options) => {
    seen = options.vertexVisitorsChainState;
  });
  t.makeRunner().run();
  expect(seen).toBe(42);
});

test('retains equal-priority registration order after replacing visitor records', () => {
  const t = traversal(node('root'));
  const seen: string[] = [];
  t.setVisitorsFor(Order.PRE_ORDER, [
    {
      addedIndex: 100,
      priority: 100,
      resolutionStyle: Style.SEQUENTIAL,
      visitor: () => {
        seen.push('existing');
      },
    },
  ]);
  t.addVisitorFor(Order.PRE_ORDER, () => {
    seen.push('new');
  });
  t.makeRunner().run();
  expect(seen).toEqual(['existing', 'new']);
});

test('a resolved tree can be traversed again as an adapter', () => {
  const resolvedTree = traversal(node('root', node('a'), node('b')))
    .makeRunner()
    .run()
    .getResolvedTree();
  const again = new DepthFirstTraversal({ traversableTree: resolvedTree });
  const data = [
    ...again.makeRunner().getIterable({ iterateOver: [Order.POST_ORDER] }),
  ].map((event) => event.vertex.getData().unref().getData());
  expect(data).toEqual(['a', 'b', 'root']);
});
