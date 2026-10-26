import {
  AsyncDepthFirstTreeTraversal,
  DepthFirstTreeTraversal,
  DepthFirstTraversalOrder as Order,
} from '../src/traversals/depth-first-traversal';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import {
  TraversalVisitorCommandName as Command,
  TraversalVisitorFunctionResolutionStyle as Style,
} from '../src/core/TraversalVisitor';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import type { DepthFirstTraversalInOrderTraversalConfig } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import { ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG } from '../src/traversals/depth-first-traversal/lib/AsyncDepthFirstTraversalInstanceConfig';
import { ObjectTreeSource } from '../src/traversable-tree-implementations/traversable-object-tree';
import type { TestGraph } from './helpers/graph-fixtures';

type Node = { $d: string; $c: (Node | null)[] };
type Tree = VertexTypes<string, Node | null>;
const node = ($d: string, ...$c: (Node | null)[]): Node => ({ $d, $c });

function traversal(
  root: Node | null = node('root', node('A'), node('B')),
  concurrency = Infinity,
) {
  return new AsyncDepthFirstTreeTraversal<Tree>({
    traversableTree: {
      resolveRoot: () => ({ vertexContent: root }),
      resolveChild: async (hint) => ({ vertexContent: hint }),
    },
    concurrency,
  });
}

async function values(
  runner: ReturnType<ReturnType<typeof traversal>['createRunner']>,
  order: Order,
): Promise<string[]> {
  const seen: string[] = [];
  for await (const event of runner.getIterable({ iterateOver: [order] })) {
    seen.push(event.vertex.getData());
  }
  return seen;
}

test('exposes asynchronous depth-first post-order traversal', async () => {
  const traversal = new AsyncDepthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => ({ vertexContent: { $d: 'root', $c: ['A', 'B'] } }),
      resolveChild: async (hint) => ({ vertexContent: { $d: hint, $c: [] } }),
    },
    concurrency: 2,
  });
  const seen: string[] = [];
  for await (const event of traversal.createRunner().getIterable({
    iterateOver: [Order.POST_ORDER],
  })) {
    seen.push(event.vertex.getData());
    expect(event.isTreeRoot).toBe(event.vertex.getData() === 'root');
    expect(event.isTraversalRoot).toBe(event.vertex.getData() === 'root');
  }
  expect(seen).toEqual(['A', 'B', 'root']);
});

const inOrderCases: Array<
  [Partial<DepthFirstTraversalInOrderTraversalConfig>, string[]]
> = [
  [{}, ['a', 'root', 'b', 'root', 'c']],
  [{ visitParentAfterChildren: { ranges: [0, 2] } }, ['a', 'root', 'b', 'c', 'root']],
  [
    {
      visitParentAfterChildren: 99,
      visitParentAfterChildrenAllRangesOutOfBoundsFallback: -1,
    },
    ['a', 'b', 'c', 'root'],
  ],
  [{ visitParentAfterChildren: -2 }, ['a', 'b', 'root', 'c']],
];

test.each(inOrderCases)('preserves in-order range configuration %#', async (config, expected) => {
  const t = traversal(node('root', node('a'), node('b'), node('c'))).configure({
    inOrderTraversalConfig: config,
  });
  await expect(values(t.createRunner(), Order.IN_ORDER)).resolves.toEqual(expected);
});

test('preserves one-child and null-slot in-order options', async () => {
  await expect(
    values(
      traversal(node('root', node('only')))
        .configure({
          inOrderTraversalConfig: { visitUpOneChildParents: false },
        })
        .createRunner(),
      Order.IN_ORDER,
    ),
  ).resolves.toEqual(['only']);
  await expect(
    values(traversal(node('root', null, node('a'))).createRunner(), Order.IN_ORDER),
  ).resolves.toEqual(['root', 'a']);
  await expect(
    values(
      traversal(node('root', null, node('a')))
        .configure({
          inOrderTraversalConfig: {
            considerVisitAfterNullContentVertices: false,
          },
        })
        .createRunner(),
      Order.IN_ORDER,
    ),
  ).resolves.toEqual(['a']);
  await expect(
    values(traversal(node('root', null, null)).createRunner(), Order.IN_ORDER),
  ).resolves.toEqual(['root']);
});

test('resumes repeated mid-chain halts without repeating visitors', async () => {
  const t = traversal(node('root', node('leaf')));
  const visits: string[] = [];
  t.addVisitorFor(Order.PRE_ORDER, (vertex) => {
    visits.push(`halt:${vertex.getData()}`);
    return { commands: [{ commandName: Command.HALT_TRAVERSAL }] };
  });
  t.addVisitorFor(Order.PRE_ORDER, async (vertex) => {
    visits.push(`after:${vertex.getData()}`);
  });
  const runner = t.createRunner();

  await expect(runner.run({ iterateOver: [] })).resolves.toBe(runner);
  expect(runner.getStatus()).toBe(Status.HALTED);
  expect(visits).toEqual(['halt:root']);
  await runner.run({ iterateOver: [] });
  expect(runner.getStatus()).toBe(Status.HALTED);
  expect(visits).toEqual(['halt:root', 'after:root', 'halt:leaf']);
  await runner.run({ iterateOver: [] });
  expect(runner.getStatus()).toBe(Status.FINISHED);
  expect(visits).toEqual([
    'halt:root',
    'after:root',
    'halt:leaf',
    'after:leaf',
  ]);
});

test('uses new iterator filters when resuming after consumer closure', async () => {
  const runner = traversal(node('root', node('leaf'))).createRunner();
  for await (const event of runner.getIterable({ iterateOver: [Order.PRE_ORDER] })) {
    expect(event.vertex.getData()).toBe('root');
    break;
  }
  expect(runner.getStatus()).toBe(Status.HALTED);
  expect(runner.isHalted()).toBe(true);
  await expect(values(runner, Order.POST_ORDER)).resolves.toEqual(['leaf', 'root']);
});

test('supports promised sorting and tree runner graph and vertex queries', async () => {
  const runner = traversal(node('root', node('a'), node('b')))
    .configure({ sortChildrenHints: async (hints) => hints.reverse() })
    .createRunner();
  await expect(values(runner, Order.PRE_ORDER)).resolves.toEqual([
    'root',
    'b',
    'a',
  ]);
  const graph = runner.getResolvedGraph();
  const root = graph.getRoot();
  if (root === null) throw new Error('Expected a root');
  const children = graph.get(root)?.slots;
  if (children?.[0]?.kind !== 'linked') throw new Error('Expected a child');
  expect(runner.isTraversalRootVertex(root)).toBe(true);
  expect(runner.isTreeRootVertex(root)).toBe(true);
  expect(runner.isLeafVertexRef(root)).toBe(false);
  expect(runner.isLeafVertexRef(children[0].childRef)).toBe(true);
});

test('retains saved original tree data through asynchronous mutations', async () => {
  const t = traversal(node('root', node('leaf'))).configure({
    saveNotMutatedResolvedTree: true,
  });
  t.addVisitorFor(Order.PRE_ORDER, async (vertex) => ({
    commands: [
      {
        commandName: Command.REWRITE_VERTEX_DATA,
        commandArguments: { newData: vertex.getData().toUpperCase() },
      },
    ],
  }));
  const runner = await t.createRunner().run();
  expect(runner.getResolvedTree().getRoot()?.unref().getData()).toBe('ROOT');
  const saved = runner.resolvedTreesContainer.notMutatedResolvedTree;
  expect(saved?.getRoot()?.unref().getData()).toBe('root');
  expect(saved?.getChildrenOf(saved.getRoot()!)?.[0]?.unref().getData()).toBe(
    'leaf',
  );
});

test('accepts the existing synchronous object-tree adapter', async () => {
  const runner = new AsyncDepthFirstTreeTraversal({
    traversableTree: new ObjectTreeSource({ a: 1, b: { c: 2 } }),
  }).createRunner();
  const keys: Array<string | number | symbol> = [];
  for await (const event of runner.getIterable({ iterateOver: [Order.PRE_ORDER] })) {
    keys.push(event.vertex.getData().key);
  }
  expect(keys).toEqual([
    '__TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__',
    'a',
    'b',
    'c',
  ]);
});

test('builder visitor operations are stable and runner snapshots are isolated', async () => {
  const ranges: { ranges: Array<[number, number]> } = { ranges: [[0, 0]] };
  const t = traversal(node('root', node('a'), node('b'))).configure({
    inOrderTraversalConfig: { visitParentAfterChildren: ranges },
  });
  const seen: string[] = [];
  t.setVisitorsFor(Order.PRE_ORDER, [
    {
      addedIndex: 10,
      priority: 100,
      resolutionStyle: Style.SEQUENTIAL,
      visitor: async () => {
        seen.push('first');
      },
    },
  ]);
  t.addVisitorFor(Order.PRE_ORDER, async () => {
    seen.push('second');
  });
  expect(t.listVisitorsFor(Order.PRE_ORDER)).toHaveLength(2);
  const runner = t.createRunner();
  ranges.ranges[0]![0] = 1;
  t.addVisitorFor(Order.PRE_ORDER, async () => {
    seen.push('late');
  });
  await runner.run({ iterateOver: [] });
  expect(seen).toEqual([
    'first',
    'second',
    'first',
    'second',
    'first',
    'second',
  ]);
  expect(runner.icfg.inOrderTraversalConfig.visitParentAfterChildren).toEqual({
    ranges: [[0, 0]],
  });
});

test('reuses injected tree storage and state objects', async () => {
  const first = await traversal(node('root', node('child'))).createRunner().run();
  const state = traversal().createRunner().state;
  const root = first.getResolvedTree().getRoot();
  const second = new AsyncDepthFirstTreeTraversal<Tree>({
    traversableTree: {
      resolveRoot: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChild: (hint) => ({ vertexContent: hint }),
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: first.resolvedTreesContainer,
      state,
    },
  }).createRunner();
  expect(second.state.visitorsState).toBe(state.visitorsState);
  expect(second.state.subtreeTraversalDisabledRefs).toBe(
    state.subtreeTraversalDisabledRefs,
  );
  await expect(values(second, Order.PRE_ORDER)).resolves.toEqual(['root', 'child']);
  expect(second.getResolvedTree().getRoot()).toBe(root);
});

test.each([null, undefined])(
  'rethrows an original %p failure on every attempted rerun',
  async (failure) => {
    const runner = new AsyncDepthFirstTreeTraversal<TestGraph>({
      traversableTree: {
        resolveRoot: async () => {
          throw failure;
        },
        resolveChild: () => ({ vertexContent: null }),
      },
    }).createRunner();
    await expect(runner.run()).rejects.toBe(failure);
    expect(runner.getStatus()).toBe(Status.FAILED);
    await expect(runner.run()).rejects.toBe(failure);
    await expect(runner.getIterable().next()).rejects.toBe(failure);
  },
);

test('preserves an original consumer exception and allows resumption', async () => {
  const consumerError = { source: 'consumer' };
  const runner = traversal(node('root', node('leaf'))).createRunner();
  let caught: unknown;
  try {
    for await (const _event of runner.getIterable()) throw consumerError;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBe(consumerError);
  expect(runner.getStatus()).toBe(Status.HALTED);
  await expect(runner.run()).resolves.toBe(runner);
  expect(runner.getStatus()).toBe(Status.FINISHED);
});

test('directly exposes session one-active-iterator and synchronous close control', async () => {
  const runner = traversal().createRunner();
  const first = runner.getIterable();
  const firstEvent = await first.next();
  expect(firstEvent.done).toBe(false);
  const second = runner.getIterable();
  await expect(second.next()).rejects.toThrow('Another active iterator');
  await expect(first.return(undefined)).resolves.toEqual({
    done: true,
    value: undefined,
  });
  expect(runner.getStatus()).toBe(Status.HALTED);
});

test('validates and inspects concurrency without advancing traversal', () => {
  const runner = traversal(undefined, 2).createRunner();
  expect(runner.inspect()).toMatchObject({
    execution: 'async',
    kind: 'depth-first',
    concurrency: 2,
    inFlightCallbackCount: 0,
    bufferedEventCount: 0,
  });
  expect(runner.getStatus()).toBe(Status.INITIAL);
  expect(() => traversal(undefined, 0)).toThrow(TypeError);
  expect(() => traversal(undefined, 1.5)).toThrow(TypeError);
});

test('exports recursively frozen asynchronous defaults', () => {
  expect(Object.isFrozen(ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG)).toBe(
    true,
  );
  expect(
    Object.isFrozen(
      ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.inOrderTraversalConfig,
    ),
  ).toBe(true);
});

test('matches synchronous DFS for timing-independent generated trees', async () => {
  for (let seed = 1; seed <= 12; seed++) {
    let value = seed;
    const random = () => ((value = (value * 48271) % 2147483647) - 1) / 2147483646;
    const make = (depth: number, label: string): Node =>
      node(
        label,
        ...(depth === 0
          ? []
          : Array.from({ length: Math.floor(random() * 4) }, (_, index) =>
              random() < 0.25 ? null : make(depth - 1, `${label}.${index}`),
            )),
      );
    const root = make(4, 'root');
    const tree = {
      resolveRoot: () => ({ vertexContent: root }),
      resolveChild: (hint: Node | null) => ({ vertexContent: hint }),
    };
    const sync = new DepthFirstTreeTraversal<Tree>({ traversableTree: tree });
    const asyncTraversal = new AsyncDepthFirstTreeTraversal<Tree>({
      traversableTree: tree,
      concurrency: 3,
    });
    for (const order of Object.values(Order)) {
      const expected = Array.from(
        sync.createRunner().getIterable({ iterateOver: [order] }),
        (event) => event.vertex.getData(),
      );
      await expect(values(asyncTraversal.createRunner(), order)).resolves.toEqual(
        expected,
      );
    }
  }
});
